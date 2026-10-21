#!/usr/bin/env node
import { constants, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const packageDirectory = fileURLToPath(new URL('..', import.meta.url));
const templateDirectory = path.join(packageDirectory, 'template');
const forwarded = new Set([
  'sources',
  'inspect',
  'requests',
  'validate',
  'import',
  'export',
  'open',
  'install',
]);
const help = `mori-study — a study space for you and your AI agent

Usage:
  mori-study init <directory> [--no-install] [--no-open] [--agent codex|claude|all|none]
  mori-study doctor
  mori-study <sources|inspect|requests|validate|import|export|open|install> [arguments]

init creates a local portal, installs npm dependencies and both agent skills,
then opens the portal. The destination must be new or completely empty.
--no-install leaves dependency installation and opening for later.
--no-open keeps the portal closed. --agent defaults to all.
Other commands must run from a Mori Study project directory.

Requires Node.js 22.16+ and npm. FFmpeg is optional for rendering study videos.
Run mori-study with no arguments or --help to display this message without changes.
`;

export function supportsNode(version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  return major > 22 || (major === 22 && minor >= 16);
}

async function exists(filename) {
  try {
    await fs.access(filename);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function regularFile(filename) {
  try {
    return (await fs.lstat(filename)).isFile();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function isMoriProject(directory) {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(directory, 'package.json'), 'utf8'));
    if (
      pkg.name !== 'mori-study' ||
      pkg.private !== true ||
      (pkg.scripts?.['mori-study'] || pkg.scripts?.mori) !== 'tsx scripts/mori.ts'
    )
      return false;
    for (const filename of [
      'scripts/mori.ts',
      'src/lib/types.ts',
      'src/lib/storage.ts',
      'skills/mori-study/SKILL.md',
    ]) {
      if (!(await regularFile(path.join(directory, filename)))) return false;
    }
    return true;
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return false;
    throw error;
  }
}

function run(command, args, { cwd = process.cwd(), env = process.env, quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: quiet ? 'ignore' : 'inherit',
      shell: false,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) =>
      code === 0
        ? resolve()
        : reject(new Error(`${path.basename(command)} exited with ${signal || code}.`)),
    );
  });
}

/** @returns {Promise<{command: string, prefix: string[]}>} */
export async function npmCommand() {
  // Calling npm's JS entry directly also handles Windows paths without a shell.
  const candidates = [
    process.env.npm_execpath && path.join(path.dirname(process.env.npm_execpath), 'npm-cli.js'),
    path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    path.join(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
  ].filter((candidate) => typeof candidate === 'string');
  for (const candidate of candidates)
    if (await regularFile(candidate)) return { command: process.execPath, prefix: [candidate] };
  if (process.platform !== 'win32') return { command: 'npm', prefix: [] };
  throw new Error('npm was not found. Install npm with Node.js, then run this command using npx.');
}

async function runNpm(args, directory) {
  const npm = await npmCommand();
  const environment = { ...process.env, MORI_PROJECT_PATH: directory };
  // npm 12's exec passes a one-command script allowlist to the launched bin.
  // Project installs reject that flag; retain the user's other npm policies.
  delete environment.npm_config_allow_scripts;
  delete environment.NPM_CONFIG_ALLOW_SCRIPTS;
  await run(npm.command, [...npm.prefix, ...args], {
    cwd: directory,
    env: environment,
  });
}

async function copyExclusive(source, destination) {
  const stat = await fs.lstat(source);
  if (stat.isSymbolicLink()) throw new Error(`Refusing a symlink in the template: ${source}`);
  if (stat.isDirectory()) {
    await fs.mkdir(destination, { recursive: true });
    const destStat = await fs.lstat(destination);
    if (!destStat.isDirectory() || destStat.isSymbolicLink())
      throw new Error(`Not a regular directory: ${destination}`);
    for (const name of await fs.readdir(source)) {
      // npm does not preserve .gitignore in tarballs; ship its portable name.
      const outputName = source === templateDirectory && name === 'gitignore' ? '.gitignore' : name;
      await copyExclusive(path.join(source, name), path.join(destination, outputName));
    }
  } else if (stat.isFile()) {
    await fs.copyFile(source, destination, constants.COPYFILE_EXCL);
  } else throw new Error(`Unsupported template entry: ${source}`);
}

function parseInit(args) {
  const options = { directory: undefined, install: true, open: true, agent: 'all' };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--no-install') options.install = false;
    else if (arg === '--no-open') options.open = false;
    else if (arg === '--agent') {
      options.agent = args[++index];
      if (!['codex', 'claude', 'all', 'none'].includes(options.agent))
        throw new Error('--agent must be codex, claude, all, or none.');
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else if (options.directory) throw new Error('Choose exactly one destination directory.');
    else options.directory = arg;
  }
  if (!options.directory)
    throw new Error(
      'Usage: mori-study init <directory> [--no-install] [--no-open] [--agent codex|claude|all|none]',
    );
  return options;
}

async function installAgentSkills(directory, agent) {
  const agents = agent === 'all' ? ['codex', 'claude'] : agent === 'none' ? [] : [agent];
  for (const name of agents) {
    const destination = path.join(
      directory,
      name === 'codex' ? '.agents' : '.claude',
      'skills',
      'mori-study',
    );
    if (await exists(destination))
      throw new Error(`An existing skill was preserved at ${destination}.`);
    await copyExclusive(path.join(directory, 'skills/mori-study'), destination);
    const pointer = `# Mori Study project\n\nThis skill belongs to the local project at:\n\n\`\`\`text\n${directory}\n\`\`\`\n\nRun Mori Study commands from that directory. If it moves, locate this checkout before using it.\n`;
    await fs.writeFile(path.join(destination, 'MORI_PROJECT.md'), pointer, { flag: 'wx' });
    console.log(`Installed ${name} skill: ${destination}`);
  }
}

async function init(args) {
  const options = parseInit(args);
  const destination = path.resolve(options.directory);
  if (!(await regularFile(path.join(templateDirectory, 'package.json'))))
    throw new Error(
      'The bundled template is missing. From the source repository, run npm run package:build first.',
    );
  try {
    const stat = await fs.lstat(destination);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (await fs.readdir(destination)).length) {
      throw new Error(
        `Destination must be a new or completely empty directory. Existing files were preserved: ${destination}`,
      );
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  await fs.mkdir(destination, { recursive: true });
  const lock = path.join(destination, '.mori-init.lock');
  await fs.writeFile(lock, String(process.pid), { flag: 'wx' });
  try {
    // Every file uses exclusive creation, including when another process races us.
    await copyExclusive(templateDirectory, destination);
    console.log(`Created Mori Study: ${destination}`);
    await installAgentSkills(destination, options.agent);
    if (options.install) await runNpm(['install'], destination);
    else
      console.log(
        'Dependency installation skipped. Install dependencies before opening the portal.',
      );
    if (options.open && options.install)
      await runNpm(['run', 'mori-study', '--', 'open'], destination);
    else
      console.log(
        `From the project directory above:${options.install ? '' : '\nInstall: npm install'}\nOpen: npm run mori-study -- open`,
      );
  } catch (error) {
    throw new Error(
      `${error.message}\nThe created project remains at ${destination}; no existing files were overwritten.`,
      { cause: error },
    );
  } finally {
    await fs.unlink(lock).catch(() => {});
  }
}

async function doctor() {
  const nodeOK = supportsNode();
  console.log(
    `${nodeOK ? 'OK' : 'FAIL'} Node.js ${process.versions.node}; requires 22.16 or newer.`,
  );
  const projectOK = await isMoriProject(process.cwd());
  console.log(
    projectOK
      ? `OK Mori Study project: ${process.cwd()}`
      : 'INFO Current directory is not a Mori Study project. Run mori-study init <directory>, or cd into an existing project.',
  );
  if (projectOK) {
    const installed =
      (await regularFile(path.join(process.cwd(), 'node_modules/tsx/dist/cli.mjs'))) &&
      (await regularFile(path.join(process.cwd(), 'node_modules/next/dist/bin/next')));
    console.log(
      installed
        ? 'OK Portal and CLI dependencies are installed.'
        : 'INFO Dependencies are missing. Run npm install in this project.',
    );
  }
  try {
    await run('ffmpeg', ['-version'], { quiet: true });
    console.log('OK FFmpeg is available for optional video rendering.');
  } catch {
    console.log('INFO FFmpeg is not available; only optional video rendering needs it.');
  }
  if (!nodeOK) process.exitCode = 1;
}

export async function main(args = process.argv.slice(2)) {
  if (!args.length || args.includes('--help') || args.includes('-h') || args[0] === 'help') {
    console.log(help);
    return;
  }
  const [command, ...rest] = args;
  if (command === 'doctor') {
    await doctor();
    return;
  }
  if (!supportsNode())
    throw new Error(`Node.js 22.16 or newer is required (current: ${process.versions.node}).`);
  if (command === 'init') {
    await init(rest);
    return;
  }
  if (!forwarded.has(command))
    throw new Error(`Unknown command: ${command}. Run mori-study --help.`);
  if (!(await isMoriProject(process.cwd())))
    throw new Error(
      'Run this command from a Mori Study project directory. No project scripts were executed.',
    );
  const tsx = path.join(process.cwd(), 'node_modules/tsx/dist/cli.mjs');
  if (!(await regularFile(tsx)))
    throw new Error('Mori Study dependencies are missing. Run npm install in this project.');
  await run(
    process.execPath,
    [tsx, path.join(process.cwd(), 'scripts/mori.ts'), command, ...rest],
    {
      env: { ...process.env, MORI_PROJECT_PATH: process.cwd() },
    },
  );
}

let entryPath;
try {
  if (process.argv[1]) entryPath = realpathSync(path.resolve(process.argv[1]));
} catch {
  /* imported by a virtual entry point */
}
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  main().catch((error) => {
    console.error(`Mori Study: ${error.message}`);
    process.exitCode = 1;
  });
}
