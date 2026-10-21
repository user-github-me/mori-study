#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { parseArgs } from 'node:util';

const MAX_ARCHIVE = 64 * 1024 * 1024;
const MAX_EXPANDED = 256 * 1024 * 1024;
const utf8 = new TextDecoder('utf-8', { fatal: true });
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function releaseIdentity(repository, tag) {
  if (
    typeof repository !== 'string' ||
    !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?\/[a-zA-Z0-9_.-]{1,100}$/.test(repository)
  ) {
    throw new Error('Repository must be a GitHub owner/repository name.');
  }
  const [owner, repo] = repository.split('/');
  if (repo === '.' || repo === '..') throw new Error('Repository name is invalid.');
  const versionPattern =
    /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  const match = typeof tag === 'string' && tag.length <= 128 ? tag.match(versionPattern) : null;
  if (!match || match[4]?.split('.').some((part) => /^0\d+$/.test(part))) {
    throw new Error('Tag must be a semantic version prefixed with v, such as v0.1.0.');
  }
  return { name: `@${owner.toLowerCase()}/mori-study`, version: tag.slice(1), repository };
}

function directoryArgument(value, label) {
  if (typeof value !== 'string' || !value || /[\u0000-\u001f\u007f]/.test(value))
    throw new Error(`${label} must be a directory path without control characters.`);
  return path.resolve(value);
}

async function readRegular(filename, maximum) {
  const stat = await fs.lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error(`Expected a regular release file: ${path.basename(filename)}`);
  if (stat.size > maximum) throw new Error(`Release file is too large: ${path.basename(filename)}`);
  const bytes = await fs.readFile(filename);
  if (bytes.length > maximum) throw new Error('Release file changed while reading.');
  return bytes;
}

function field(bytes) {
  const end = bytes.indexOf(0);
  return utf8.decode(end < 0 ? bytes : bytes.subarray(0, end));
}

function octal(bytes, label) {
  const value = field(bytes).trim();
  if (value && !/^[0-7]+$/.test(value)) throw new Error(`Unsupported TAR ${label}.`);
  const number = value ? Number.parseInt(value, 8) : 0;
  if (!Number.isSafeInteger(number)) throw new Error(`Invalid TAR ${label}.`);
  return number;
}

function paxAttributes(bytes) {
  const attributes = {};
  let offset = 0;
  while (offset < bytes.length) {
    const space = bytes.indexOf(32, offset);
    if (space < 0) throw new Error('Invalid TAR extended header.');
    const count = bytes.subarray(offset, space).toString('ascii');
    if (!/^[1-9]\d*$/.test(count)) throw new Error('Invalid TAR extended header length.');
    const end = offset + Number(count);
    if (
      !Number.isSafeInteger(end) ||
      end > bytes.length ||
      end <= space + 1 ||
      bytes[end - 1] !== 10
    )
      throw new Error('Invalid TAR extended header length.');
    const record = utf8.decode(bytes.subarray(space + 1, end - 1));
    const equals = record.indexOf('=');
    if (equals < 1) throw new Error('Invalid TAR extended header attribute.');
    const key = record.slice(0, equals);
    if (key === 'path' || key === 'size' || key === 'linkpath')
      attributes[key] = record.slice(equals + 1);
    offset = end;
  }
  return attributes;
}

function safeEntryName(value, directory) {
  if (!value || /[\\\u0000-\u001f\u007f:]/.test(value))
    throw new Error('Archive contains an unsafe path.');
  const name = directory && value.endsWith('/') ? value.slice(0, -1) : value;
  const parts = name.split('/');
  if (
    parts[0] !== 'package' ||
    parts.some(
      (part) =>
        !part ||
        part === '.' ||
        part === '..' ||
        /[. ]$/.test(part) ||
        /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
    ) ||
    (!directory && parts.length === 1)
  ) {
    throw new Error('All archive entries must stay inside package/.');
  }
  return name;
}

/** Read only regular files/directories; never materialize links or special files. */
function tarEntries(bytes) {
  const entries = new Map();
  let offset = 0,
    pending = {},
    ended = false;
  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    offset += 512;
    if (header.every((byte) => byte === 0)) {
      if (!bytes.subarray(offset).every((byte) => byte === 0))
        throw new Error('Archive contains data after its end marker.');
      ended = true;
      break;
    }
    const expected = octal(header.subarray(148, 156), 'checksum');
    let sum = 0;
    for (let index = 0; index < 512; index++)
      sum += index >= 148 && index < 156 ? 32 : header[index];
    if (sum !== expected) throw new Error('Archive header checksum is invalid.');
    const type = String.fromCharCode(header[156] || 48);
    let size = octal(header.subarray(124, 136), 'file size');
    if (pending.size !== undefined && !['x', 'g', 'L'].includes(type)) {
      if (!/^\d+$/.test(pending.size)) throw new Error('Invalid extended TAR file size.');
      size = Number(pending.size);
    }
    if (
      !Number.isSafeInteger(size) ||
      size < 0 ||
      size > MAX_EXPANDED ||
      offset + Math.ceil(size / 512) * 512 > bytes.length
    )
      throw new Error('Archive has an invalid or truncated file.');
    const body = bytes.subarray(offset, offset + size);
    offset += Math.ceil(size / 512) * 512;
    if (type === 'x') {
      pending = { ...pending, ...paxAttributes(body) };
      continue;
    }
    if (type === 'g') {
      if (Object.keys(paxAttributes(body)).length)
        throw new Error('Global TAR path or size overrides are not supported.');
      continue;
    }
    if (type === 'L') {
      pending.path = field(body).replace(/\n$/, '');
      continue;
    }
    if (!['0', '5'].includes(type) || field(header.subarray(157, 257)) || pending.linkpath)
      throw new Error('Archive links and special files are not permitted.');
    const prefix = field(header.subarray(345, 500));
    const rawName =
      pending.path || `${prefix ? `${prefix}/` : ''}${field(header.subarray(0, 100))}`;
    const name = safeEntryName(rawName, type === '5');
    pending = {};
    if (entries.has(name)) throw new Error(`Archive contains a duplicate entry: ${name}`);
    if (type === '5' && size) throw new Error('Archive directory contains unexpected data.');
    entries.set(name, {
      name,
      directory: type === '5',
      body,
      mode: octal(header.subarray(100, 108), 'mode') & 0o777,
    });
    if (entries.size > 20_000) throw new Error('Archive contains too many entries.');
  }
  if (!ended || Object.keys(pending).length) throw new Error('Archive is truncated.');
  for (const entry of entries.values()) {
    let parent = path.posix.dirname(entry.name);
    while (parent !== '.') {
      if (entries.has(parent) && !entries.get(parent).directory)
        throw new Error('Archive uses a file as a parent directory.');
      parent = path.posix.dirname(parent);
    }
  }
  return entries;
}

export async function prepareGithubPackage({ source, output, repository, tag }) {
  const identity = releaseIdentity(repository, tag);
  const sourceDirectory = directoryArgument(source, 'Source');
  const outputDirectory = directoryArgument(output, 'Output');
  const filename = `mori-study-${identity.version}.tgz`;
  const checksums = (
    await readRegular(path.join(sourceDirectory, 'SHA256SUMS.txt'), 1024 * 1024)
  ).toString('utf8');
  const matches = checksums
    .split(/\r?\n/)
    .map((line) => line.match(/^([a-fA-F0-9]{64})[ \t]+\*?(.+)$/))
    .filter((match) => match?.[2] === filename);
  if (matches.length !== 1)
    throw new Error(`SHA256SUMS.txt must contain exactly one checksum for ${filename}.`);
  const compressed = await readRegular(path.join(sourceDirectory, filename), MAX_ARCHIVE);
  if (createHash('sha256').update(compressed).digest('hex') !== matches[0][1].toLowerCase())
    throw new Error('Release archive SHA256 checksum does not match.');
  let expanded;
  try {
    expanded = gunzipSync(compressed, { maxOutputLength: MAX_EXPANDED });
  } catch {
    throw new Error('Release archive is not a valid gzip file or exceeds the extraction limit.');
  }
  const entries = tarEntries(expanded);
  const outer = entries.get('package/package.json');
  if (!outer || outer.directory)
    throw new Error('Release archive is missing package/package.json.');
  let manifest;
  try {
    manifest = JSON.parse(utf8.decode(outer.body));
  } catch {
    throw new Error('Release package.json is not valid JSON.');
  }
  if (!object(manifest) || !['mori-study', identity.name].includes(manifest.name))
    throw new Error('Release package name must be mori-study or the expected GitHub scope.');
  if (manifest.version !== identity.version)
    throw new Error('Release package version does not match the tag.');
  manifest.name = identity.name;
  manifest.repository = {
    ...(object(manifest.repository) ? manifest.repository : {}),
    type: 'git',
    url: `https://github.com/${identity.repository}.git`,
  };
  manifest.publishConfig = {
    ...(object(manifest.publishConfig) ? manifest.publishConfig : {}),
    registry: 'https://npm.pkg.github.com',
  };
  outer.body = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);

  // Exclusive creation preserves every existing output, including symlinks.
  try {
    await fs.mkdir(outputDirectory, { mode: 0o700 });
  } catch (error) {
    if (error.code === 'EEXIST')
      throw new Error(
        'Output already exists; choose a new directory. Existing files were preserved.',
      );
    throw error;
  }
  for (const entry of entries.values()) {
    const destination = path.join(outputDirectory, ...entry.name.split('/'));
    if (entry.directory) await fs.mkdir(destination, { recursive: true, mode: 0o755 });
    else {
      await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o755 });
      await fs.writeFile(destination, entry.body, { flag: 'wx', mode: entry.mode || 0o644 });
    }
  }
  return {
    name: identity.name,
    version: identity.version,
    directory: path.join(outputDirectory, 'package'),
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      source: { type: 'string' },
      output: { type: 'string' },
      repository: { type: 'string' },
      tag: { type: 'string' },
    },
    strict: true,
    allowPositionals: false,
  });
  if (!values.source || !values.output || !values.repository || !values.tag)
    throw new Error(
      'Usage: node scripts/github-package.mjs --source <release-dir> --output <new-dir> --repository owner/repo --tag v0.1.0',
    );
  const result = await prepareGithubPackage(values);
  process.stdout.write(
    `name=${result.name}\nversion=${result.version}\ndirectory=${result.directory}\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`GitHub package: ${error.message}`);
    process.exitCode = 1;
  });
}
