import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { buildTemplate, packageDirectory } from '../scripts/package.mjs';
import { supportsNode, npmCommand } from '../packages/mori/bin/mori.mjs';

let temporary: string;
let launcher: string;
let packedFiles: string[];

function run(args: string[], cwd = temporary, environment: Record<string, string> = {}) {
  return spawnSync(process.execPath, [launcher, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 20_000,
    env: { ...process.env, MORI_NO_OPEN: '1', ...environment },
  });
}

before(async () => {
  temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'mori-package-test-'));
  await buildTemplate();
  const npm = await npmCommand();
  // Exercise the real archive, rather than invoking the source launcher.
  const pack = spawnSync(
    npm.command,
    [...npm.prefix, 'pack', '--json', '--ignore-scripts', '--pack-destination', temporary],
    {
      cwd: packageDirectory,
      encoding: 'utf8',
      timeout: 30_000,
    },
  );
  assert.equal(pack.status, 0, pack.stderr || pack.stdout);
  const packed = JSON.parse(pack.stdout);
  const result = Array.isArray(packed)
    ? packed[0]
    : (Object.values(packed)[0] as { filename: string; files: { path: string }[] });
  packedFiles = result.files.map((file: { path: string }) => file.path);
  const unpack = spawnSync(
    'tar',
    ['-xzf', path.join(temporary, result.filename), '-C', temporary],
    { encoding: 'utf8' },
  );
  assert.equal(unpack.status, 0, unpack.stderr);
  launcher = path.join(temporary, 'package/bin/mori.mjs');
});

after(async () => {
  if (temporary) await fs.rm(temporary, { recursive: true, force: true });
});

test('published archive contains the usable portal and only deliberate public assets', async () => {
  for (const filename of [
    'bin/mori.mjs',
    'LICENSE',
    'template/LICENSE',
    'template/package.json',
    'template/package-lock.json',
    'template/src/app/page.tsx',
    'template/src/lib/schema.ts',
    'template/scripts/mori.ts',
    'template/scripts/video.mjs',
    'template/skills/mori-study/SKILL.md',
    'template/public/videos/limits.mp4',
    'template/public/fonts/dm-sans.ttf',
    'template/docs/THIRD_PARTY.md',
    'template/docs/licenses/HYPERFRAMES-LICENSE.txt',
  ])
    assert.ok(packedFiles.includes(filename), `Missing packed file ${filename}`);

  const forbidden =
    /(^|\/)(?:data|node_modules|\.next|\.mori|\.git|\.agents|\.claude|test-results|playwright-report|\.env(?:\..*)?)(?:\/|$)|\.tsbuildinfo$|\.tgz$/;
  assert.deepEqual(
    packedFiles.filter((file) => forbidden.test(file)),
    [],
  );
  assert.deepEqual(
    packedFiles.filter((file) => file.startsWith('template/public/videos/')),
    ['template/public/videos/limits.mp4'],
  );
  assert.deepEqual(
    packedFiles.filter((file) => file.startsWith('template/public/sources/')).sort(),
    [
      'template/public/sources/biology-notes.md',
      'template/public/sources/calculus-notes.md',
      'template/public/sources/physics-notes.md',
    ],
  );
  const wrapper = JSON.parse(
    await fs.readFile(path.join(temporary, 'package/package.json'), 'utf8'),
  );
  assert.equal(wrapper.private, undefined);
  assert.equal(wrapper.bin['mori-study'], 'bin/mori.mjs');
  assert.equal(wrapper.dependencies, undefined);
});

test('packed launcher initializes an empty directory with both skills and no dependency download', async () => {
  const destination = path.join(temporary, 'new study space');
  const result = run(['init', destination, '--no-install', '--no-open']);
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(await fs.readFile(path.join(destination, 'package.json'), 'utf8'));
  assert.equal(manifest.private, true);
  assert.equal(manifest.scripts['mori-study'], 'tsx scripts/mori.ts');
  assert.equal(manifest.scripts.prepack, undefined);
  assert.equal(manifest.scripts['package:build'], undefined);
  for (const agent of ['.agents', '.claude']) {
    assert.ok(
      (
        await fs.readFile(path.join(destination, agent, 'skills/mori-study/SKILL.md'), 'utf8')
      ).includes('name: mori-study'),
    );
    assert.ok(
      (
        await fs.readFile(
          path.join(destination, agent, 'skills/mori-study/MORI_PROJECT.md'),
          'utf8',
        )
      ).includes(destination),
    );
  }
  await assert.rejects(fs.access(path.join(destination, 'node_modules')));
  await assert.rejects(fs.access(path.join(destination, '.mori-init.lock')));
  assert.ok((await fs.readFile(path.join(destination, '.gitignore'), 'utf8')).includes('data/'));
  const generatedNextEnv = await fs.readFile(path.join(destination, 'next-env.d.ts'), 'utf8');
  assert.ok(!generatedNextEnv.includes('.mori'));
  const forwarded = run(['sources'], destination);
  assert.equal(forwarded.status, 1);
  assert.match(forwarded.stderr, /dependencies are missing/);
});

test('init never overwrites a nonempty directory, regular file, or symlink', async () => {
  const destination = path.join(temporary, 'keep-my-work');
  await fs.mkdir(destination);
  await fs.writeFile(path.join(destination, 'notes.md'), 'Original private notes.');
  const result = run(['init', destination, '--no-install', '--no-open']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Existing files were preserved/);
  assert.deepEqual(await fs.readdir(destination), ['notes.md']);
  assert.equal(
    await fs.readFile(path.join(destination, 'notes.md'), 'utf8'),
    'Original private notes.',
  );

  const regular = path.join(temporary, 'existing.txt');
  await fs.writeFile(regular, 'keep');
  assert.equal(run(['init', regular, '--no-install', '--no-open']).status, 1);
  assert.equal(await fs.readFile(regular, 'utf8'), 'keep');
  if (process.platform !== 'win32') {
    const empty = path.join(temporary, 'empty-target');
    await fs.mkdir(empty);
    const link = path.join(temporary, 'linked-destination');
    await fs.symlink(empty, link);
    assert.equal(run(['init', link, '--no-install', '--no-open']).status, 1);
    assert.deepEqual(await fs.readdir(empty), []);
  }
});

test('help and invalid options have no side effects; arbitrary projects are not executed', async () => {
  const destination = path.join(temporary, 'help-must-not-create');
  assert.equal(run(['init', destination, '--help']).status, 0);
  await assert.rejects(fs.access(destination));
  assert.equal(run([]).status, 0);
  assert.equal(run(['init', destination, '--agent', 'invalid']).status, 1);
  await assert.rejects(fs.access(destination));
  const arbitrary = path.join(temporary, 'arbitrary-app');
  await fs.mkdir(arbitrary);
  await fs.writeFile(
    path.join(arbitrary, 'package.json'),
    JSON.stringify({ name: 'mori-study', private: true, scripts: { mori: 'node malicious.js' } }),
  );
  await fs.writeFile(
    path.join(arbitrary, 'malicious.js'),
    "require('node:fs').writeFileSync('executed', 'bad');",
  );
  const result = run(['sources'], arbitrary);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No project scripts were executed/);
  await assert.rejects(fs.access(path.join(arbitrary, 'executed')));
});

test('agent selection supports none and one agent; doctor works before install', async () => {
  for (const selection of ['none', 'codex', 'claude']) {
    const destination = path.join(temporary, `agent-${selection}`);
    const result = run(['init', destination, '--agent', selection, '--no-install', '--no-open']);
    assert.equal(result.status, 0, result.stderr);
    for (const [agent, directory] of [
      ['codex', '.agents'],
      ['claude', '.claude'],
    ]) {
      if (selection === agent)
        await fs.access(path.join(destination, directory, 'skills/mori-study/SKILL.md'));
      else await assert.rejects(fs.access(path.join(destination, directory)));
    }
    const check = run(['doctor'], destination);
    assert.equal(check.status, 0, check.stderr);
    assert.match(check.stdout, /OK Mori Study project/);
    assert.match(check.stdout, /Dependencies are missing/);
  }
  assert.equal(supportsNode('22.15.9'), false);
  assert.equal(supportsNode('22.16.0'), true);
  assert.equal(supportsNode('24.0.0'), true);
  assert.equal(supportsNode('20.19.0'), false);
});

test('default init installs then opens from its project and handles npm exec lifecycle flags', async () => {
  const fakeNpm = path.join(temporary, 'npm-cli.js');
  await fs.writeFile(
    fakeNpm,
    `const fs = require('node:fs');
fs.appendFileSync('npm-invocations.jsonl', JSON.stringify({ args: process.argv.slice(2), project: process.env.MORI_PROJECT_PATH, allowScripts: process.env.npm_config_allow_scripts, ignoreScripts: process.env.npm_config_ignore_scripts }) + '\\n');
`,
  );
  const destination = path.join(temporary, 'default-init');
  const result = run(['init', destination, '--agent', 'none'], temporary, {
    npm_execpath: fakeNpm,
    npm_config_allow_scripts: 'mori-study',
    npm_config_ignore_scripts: 'true',
  });
  assert.equal(result.status, 0, result.stderr);
  const invocations = (await fs.readFile(path.join(destination, 'npm-invocations.jsonl'), 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.deepEqual(
    invocations.map((call) => call.args),
    [['install'], ['run', 'mori-study', '--', 'open']],
  );
  for (const call of invocations) {
    assert.equal(call.project, destination);
    assert.equal(call.allowScripts, undefined);
    assert.equal(call.ignoreScripts, 'true');
  }
});
