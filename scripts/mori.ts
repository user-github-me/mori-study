#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { courseImportSchema, validationMessage } from '../src/lib/schema';
import {
  agentPrompt,
  atomicCreate,
  courseMarkdown,
  dataDirectory,
  getCourse,
  getStudyRequest,
  getWorkspace,
  importCourse,
  inspectSource,
  MoriError,
  projectRoot,
  saveFileSource,
  saveTextSource,
  validateCourse,
  workspaceId,
} from '../src/lib/storage';

process.env.MORI_PROJECT_PATH ||= fileURLToPath(new URL('..', import.meta.url));

const help = `Mori — a local study space for your AI agent

Usage: npm run mori-study -- <command>

  sources                              List available sources as JSON
  sources add <file> [more files]       Register and extract local source files
  sources add --url <url> [--name name] Register a link (not fetched)
  sources add --text <text> [--name n]  Register notes
  inspect <source-id>                   Read source text and original file path
  requests [request-id]                 List requests, or read an agent handoff
  validate <course.json>                Validate content and source references
  import <course.json> [--request id]   Add a course; never overwrite existing IDs
  export <course-id> [--format json|markdown|pptx] [--out <file>]
  open                                 Start/open the local portal
  install [--agent codex|claude|all] [--global]
  help

Files: PDF, DOCX, PPTX, TXT, Markdown, CSV, PNG, JPG, WebP, GIF (25 MB each).
Images and scanned PDFs need the agent's vision tools; Mori does not perform OCR.
Data: MORI_DATA_DIR, or <project>/data. Portal: http://127.0.0.1:3000.
Set MORI_PORT to choose another port; MORI_NO_OPEN=1 starts without a browser.
Use npm --silent run mori-study -- export ... for clean stdout when redirecting.
PowerPoint export requires --out <file.pptx>; existing files are never replaced.
`;

function print(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
function required(value: string | undefined, usage: string) {
  if (!value) throw new MoriError(`Usage: npm run mori-study -- ${usage}`);
  return value;
}
async function readInput(filename: string) {
  const target = path.resolve(filename);
  const stat = await fs.stat(target);
  if (stat.size > 20 * 1024 * 1024) throw new MoriError('Course JSON must be 20 MB or smaller.');
  try {
    return JSON.parse(await fs.readFile(target, 'utf8')) as unknown;
  } catch {
    throw new MoriError(`${filename} does not contain valid JSON.`);
  }
}

async function installSkill(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      agent: { type: 'string', default: 'all' },
      global: { type: 'boolean', default: false },
    },
  });
  if (positionals.length || !['codex', 'claude', 'all'].includes(values.agent || ''))
    throw new MoriError('Usage: install --agent codex|claude|all [--global]');
  const agents = values.agent === 'all' ? ['codex', 'claude'] : [values.agent!];
  const source = path.join(projectRoot(), 'skills', 'mori-study');
  await fs.access(path.join(source, 'SKILL.md'));
  const base = values.global ? os.homedir() : projectRoot();
  const destinations = agents.map((agent) => ({
    agent,
    destination: path.join(base, agent === 'codex' ? '.agents' : '.claude', 'skills', 'mori-study'),
  }));
  for (const { destination } of destinations) {
    try {
      await fs.access(destination);
      throw new MoriError(
        `A skill already exists at ${destination}. It was preserved. Choose another scope or move that copy before installing.`,
      );
    } catch (error) {
      if (error instanceof MoriError) throw error;
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
        throw error;
    }
  }
  for (const { agent, destination } of destinations) {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.cp(source, destination, { recursive: true, errorOnExist: true, force: false });
    await atomicCreate(
      path.join(destination, 'MORI_PROJECT.md'),
      `# Mori project\n\nThis skill belongs to the local project at:\n\n\`\`\`text\n${projectRoot()}\n\`\`\`\n\nRun Mori commands from that directory. If it has moved, ask the user for its new location. Do not search for credentials.\n`,
    );
    console.log(`Installed ${agent} skill: ${destination}`);
  }
  console.log(
    'Restart your agent session if necessary, then invoke the mori-study skill with your sources and study request.',
  );
}

async function probePortal(url: string): Promise<'mori' | 'other' | 'offline'> {
  try {
    const response = await fetch(`${url}/api/workspace`, { signal: AbortSignal.timeout(1_500) });
    if (!response.ok) return 'other';
    const body = await response.json();
    return response.headers.get('X-Mori-Workspace') === workspaceId() &&
      Array.isArray(body.courses) &&
      Array.isArray(body.sources) &&
      Array.isArray(body.requests)
      ? 'mori'
      : 'other';
  } catch {
    return 'offline';
  }
}

async function openPortal() {
  const port = Number(process.env.MORI_PORT || 3000);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new MoriError('MORI_PORT must be a port number from 1024 to 65535.');
  const url = `http://127.0.0.1:${port}`;
  const state = await probePortal(url);
  if (state === 'other')
    throw new MoriError(
      `Another application or Mori workspace is using ${url}. Choose a different port with MORI_PORT.`,
    );
  if (state === 'offline') {
    const next = path.join(projectRoot(), 'node_modules', 'next', 'dist', 'bin', 'next');
    try {
      await fs.access(next);
    } catch {
      throw new MoriError('Install project dependencies with npm install first.');
    }
    await fs.mkdir(dataDirectory(), { recursive: true, mode: 0o700 });
    const logPath = path.join(dataDirectory(), 'mori-server.log');
    const log = await fs.open(logPath, 'a', 0o600);
    const child = spawn(
      process.execPath,
      [next, 'dev', '--hostname', '127.0.0.1', '--port', String(port)],
      {
        cwd: projectRoot(),
        env: process.env,
        detached: true,
        stdio: ['ignore', log.fd, log.fd],
      },
    );
    let spawnError: Error | undefined;
    child.on('error', (error) => {
      spawnError = error;
    });
    child.unref();
    await log.close();
    const deadline = Date.now() + 55_000;
    let ready = false;
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if ((await probePortal(url)) === 'mori') {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready)
      throw new MoriError(
        `The portal has not started yet. Check ${logPath}, or run npm run dev manually.`,
      );
  }
  console.log(`Mori is ready at ${url}`);
  if (process.env.MORI_NO_OPEN === '1') return;
  const command =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  await new Promise<void>((resolve) => {
    const child = spawn(command, args, { stdio: 'ignore' });
    child.once('error', () => {
      console.log(`Open ${url} in your browser.`);
      resolve();
    });
    child.once('exit', (code) => {
      if (code) console.log(`Open ${url} in your browser.`);
      resolve();
    });
  });
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);
  if (['help', '--help', '-h'].includes(command)) {
    process.stdout.write(help);
    return;
  }
  if (command === 'sources') {
    if (!args.length) {
      print((await getWorkspace()).sources);
      return;
    }
    if (args[0] !== 'add') throw new MoriError('Usage: sources [add <file> [more files]]');
    const { values, positionals } = parseArgs({
      args: args.slice(1),
      allowPositionals: true,
      options: { url: { type: 'string' }, text: { type: 'string' }, name: { type: 'string' } },
    });
    if (values.url || values.text) {
      if (positionals.length)
        throw new MoriError('Add either file paths or a URL/text source in one command.');
      print({ sources: [await saveTextSource(values)] });
      return;
    }
    if (!positionals.length) throw new MoriError('Choose at least one file, --url, or --text.');
    const sources = [];
    for (const filename of positionals) {
      const stat = await fs.stat(filename);
      if (stat.size > 25 * 1024 * 1024) throw new MoriError(`${filename} exceeds the 25 MB limit.`);
      sources.push(
        await saveFileSource(path.basename(filename), new Uint8Array(await fs.readFile(filename))),
      );
    }
    print({ sources });
    return;
  }
  if (command === 'inspect') {
    print(await inspectSource(required(args[0], 'inspect <source-id>')));
    return;
  }
  if (command === 'requests') {
    if (!args.length) {
      print((await getWorkspace()).requests);
      return;
    }
    const request = await getStudyRequest(args[0]);
    if (!request) throw new MoriError('Request not found.');
    print({ request, agentPrompt: agentPrompt(request) });
    return;
  }
  if (command === 'validate') {
    const input = courseImportSchema.parse(
      await readInput(required(args[0], 'validate <course.json>')),
    );
    const course = await validateCourse(input.course);
    console.log(
      `Valid: ${course.title} (${course.materials.length} materials, ${course.sourceIds.length} sources).`,
    );
    return;
  }
  if (command === 'import') {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: { request: { type: 'string' } },
    });
    const course = await importCourse(
      await readInput(required(positionals[0], 'import <course.json> [--request id]')),
      values.request,
    );
    console.log(`Imported ${course.id}: ${course.title} (${course.materials.length} materials).`);
    return;
  }
  if (command === 'export') {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: { format: { type: 'string', default: 'json' }, out: { type: 'string' } },
    });
    if (!['json', 'markdown', 'pptx'].includes(values.format || ''))
      throw new MoriError('Export format must be json, markdown, or pptx.');
    if (values.format === 'pptx' && !values.out)
      throw new MoriError('PowerPoint export requires --out <file.pptx>.');
    const course = await getCourse(
      required(positionals[0], 'export <course-id> [--format json|markdown|pptx] [--out <file>]'),
    );
    if (!course) throw new MoriError('Course not found.');
    const content =
      values.format === 'pptx'
        ? await (await import('../src/lib/deck')).createCourseDeck(course)
        : values.format === 'markdown'
          ? courseMarkdown(course)
          : `${JSON.stringify(course, null, 2)}\n`;
    if (values.out) {
      await atomicCreate(path.resolve(values.out), content);
      console.log(`Exported to ${path.resolve(values.out)}`);
    } else process.stdout.write(content);
    return;
  }
  if (command === 'open') {
    await openPortal();
    return;
  }
  if (command === 'install') {
    await installSkill(args);
    return;
  }
  throw new MoriError(`Unknown command: ${command}. Run npm run mori-study -- help.`);
}

main().catch((error) => {
  console.error(
    error instanceof z.ZodError
      ? validationMessage(error)
      : error instanceof Error
        ? error.message
        : String(error),
  );
  process.exitCode = 1;
});
