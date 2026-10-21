import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { prepareGithubPackage } from '../scripts/github-package.mjs';

const exec = promisify(execFile);
const outer = {
  name: 'mori-study',
  version: '0.1.0',
  bin: { 'mori-study': 'bin/mori.mjs' },
  repository: {
    type: 'git',
    url: 'https://github.com/example/original.git',
    directory: 'packages/mori',
  },
  publishConfig: { access: 'public' },
  scripts: { prepack: 'exit 91' },
};
const nested = '{"name":"mori-study","version":"0.1.0","private":true}\n';

async function fixture(directory: string, manifest = outer) {
  const input = path.join(directory, 'input');
  const source = path.join(directory, 'release');
  await fs.mkdir(path.join(input, 'package', 'bin'), { recursive: true });
  await fs.mkdir(path.join(input, 'package', 'template'), { recursive: true });
  await fs.mkdir(source);
  await fs.writeFile(path.join(input, 'package', 'package.json'), JSON.stringify(manifest));
  await fs.writeFile(path.join(input, 'package', 'template', 'package.json'), nested);
  await fs.writeFile(
    path.join(input, 'package', 'bin', 'mori.mjs'),
    '#!/usr/bin/env node\nconsole.log("Mori Study");\n',
    { mode: 0o755 },
  );
  await exec('tar', ['-czf', path.join(source, 'mori-study-0.1.0.tgz'), '-C', input, 'package'], {
    env: { ...process.env, COPYFILE_DISABLE: '1' },
  });
  await checksum(source);
  return source;
}

async function checksum(source: string) {
  const digest = createHash('sha256')
    .update(await fs.readFile(path.join(source, 'mori-study-0.1.0.tgz')))
    .digest('hex');
  await fs.writeFile(path.join(source, 'SHA256SUMS.txt'), `${digest}  mori-study-0.1.0.tgz\n`);
}

function args(source: string, output: string) {
  return { source, output, repository: 'User-Github-Me/mori-study', tag: 'v0.1.0' };
}

test('release mirror preserves every payload file, nested manifest, executable, and lifecycle script', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'mori-github-package-'));
  try {
    const source = await fixture(temporary);
    const result = await prepareGithubPackage(args(source, path.join(temporary, 'mirror')));
    const manifest = JSON.parse(
      await fs.readFile(path.join(result.directory, 'package.json'), 'utf8'),
    );
    assert.equal(result.name, '@user-github-me/mori-study');
    assert.equal(result.version, '0.1.0');
    assert.equal(manifest.repository.url, 'https://github.com/User-Github-Me/mori-study.git');
    assert.equal(manifest.repository.directory, 'packages/mori');
    assert.equal(manifest.publishConfig.registry, 'https://npm.pkg.github.com');
    assert.deepEqual(manifest.bin, outer.bin);
    assert.deepEqual(manifest.scripts, outer.scripts, 'prepack is retained but never executed');
    assert.equal(
      await fs.readFile(path.join(result.directory, 'template', 'package.json'), 'utf8'),
      nested,
    );
    assert.deepEqual(
      await fs.readFile(path.join(result.directory, 'bin', 'mori.mjs')),
      await fs.readFile(path.join(temporary, 'input', 'package', 'bin', 'mori.mjs')),
    );
    assert.ok((await fs.stat(path.join(result.directory, 'bin', 'mori.mjs'))).mode & 0o100);
    assert.equal(
      JSON.parse(
        await fs.readFile(path.join(temporary, 'input', 'package', 'package.json'), 'utf8'),
      ).name,
      'mori-study',
    );
    await assert.rejects(
      prepareGithubPackage(args(source, path.join(temporary, 'mirror'))),
      /already exists/,
    );
    assert.equal(
      await fs.readFile(path.join(result.directory, 'template', 'package.json'), 'utf8'),
      nested,
    );
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('bad checksums, mismatched versions, and malformed repository/tag inputs fail before creating output', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'mori-github-package-invalid-'));
  try {
    const source = await fixture(temporary, { ...outer, version: '0.2.0' });
    const output = path.join(temporary, 'mirror');
    await assert.rejects(prepareGithubPackage(args(source, output)), /version does not match/);
    await fs.writeFile(
      path.join(source, 'SHA256SUMS.txt'),
      `${'0'.repeat(64)}  mori-study-0.1.0.tgz\n`,
    );
    await assert.rejects(prepareGithubPackage(args(source, output)), /SHA256 checksum/);
    for (const repository of ['../outside', 'owner/repo/extra', 'owner/..', 'owner/repo\nname=bad'])
      await assert.rejects(
        prepareGithubPackage({ ...args(source, output), repository }),
        /Repository/,
      );
    for (const tag of ['0.1.0', 'v01.1.0', 'v0.1.0;touch nope', 'v1.0.0-01', 'v1.0.0\nversion=bad'])
      await assert.rejects(prepareGithubPackage({ ...args(source, output), tag }), /Tag/);
    await assert.rejects(fs.access(output), /ENOENT/);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

function unsafeTar(name: string, type = '0', target = '') {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100);
  header.write('0000644\0', 100);
  header.write('00000000000\0', 124);
  header.fill(32, 148, 156);
  header.write(type, 156);
  header.write(target, 157, 100);
  const sum = header.reduce((total, byte) => total + byte, 0);
  header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
  return gzipSync(Buffer.concat([header, Buffer.alloc(1024)]));
}

test('archive traversal and both symbolic/hard links are rejected without writing outside output', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'mori-github-package-paths-'));
  try {
    const source = path.join(temporary, 'release');
    await fs.mkdir(source);
    for (const [name, type, target] of [
      ['../escape', '0', ''],
      ['package/../../escape', '0', ''],
      ['package/.. /escape', '0', ''],
      ['package/NUL', '0', ''],
      ['/tmp/escape', '0', ''],
      ['other/file', '0', ''],
      ['package/link', '2', '../../escape'],
      ['package/link', '1', '/tmp/escape'],
    ]) {
      await fs.writeFile(path.join(source, 'mori-study-0.1.0.tgz'), unsafeTar(name, type, target));
      await checksum(source);
      await assert.rejects(
        prepareGithubPackage(args(source, path.join(temporary, 'mirror'))),
        /inside package|links/,
      );
      await assert.rejects(fs.access(path.join(temporary, 'mirror')), /ENOENT/);
    }
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('CLI emits only safe workflow outputs for the verified extracted package', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'mori-github-package-cli-'));
  try {
    const source = await fixture(temporary);
    const output = path.join(temporary, 'mirror');
    const result = await exec(process.execPath, [
      'scripts/github-package.mjs',
      '--source',
      source,
      '--output',
      output,
      '--repository',
      'user-github-me/mori-study',
      '--tag',
      'v0.1.0',
    ]);
    assert.equal(result.stderr, '');
    assert.equal(
      result.stdout,
      `name=@user-github-me/mori-study\nversion=0.1.0\ndirectory=${path.join(output, 'package')}\n`,
    );
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
