#!/usr/bin/env node
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'website');
const publicDirectory = join(source, 'public');
const output = join(root, 'dist', 'site');
const repository = (process.env.MORI_REPOSITORY || 'https://github.com/user-github-me/mori-study')
  .replace(/\/+$/, '')
  .replace(/\.git$/, '');
if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))
  throw new Error(
    'MORI_REPOSITORY must be an HTTPS github.com owner/repository URL without credentials or query strings.',
  );
const repositoryName = new URL(repository).pathname.split('/').at(-1);
const published = process.env.MORI_NPM_PUBLISHED === '1';
const releasePublished = process.env.MORI_RELEASE_PUBLISHED === '1';
const releaseVersion = process.env.MORI_RELEASE_VERSION || '0.1.0';
if (!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(releaseVersion))
  throw new Error('MORI_RELEASE_VERSION must be a semantic version without a v prefix.');
const basePath = process.env.MORI_SITE_BASE_PATH || '';
if (basePath && !/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(basePath))
  throw new Error(
    'MORI_SITE_BASE_PATH must be a URL path such as /mori-study, with no trailing slash.',
  );
const releaseCommand = `npx --yes --package=${repository}/releases/download/v${releaseVersion}/mori-study-${releaseVersion}.tgz mori-study init my-study`;
const replacements = {
  __MORI_REPOSITORY__: repository,
  __MORI_REPOSITORY_NAME__: repositoryName,
  __MORI_NPM_PUBLISHED__: String(published),
  __MORI_PACKAGE_STATUS__: published
    ? 'The mori-study npm package is published. Start a new workspace with: npx mori-study init my-study'
    : 'The npm package is not published yet. Use the repository setup above. Do not try an unverified registry package.',
  __MORI_RELEASE_STATUS__: releasePublished
    ? `A GitHub release package is available. To create a new workspace from its published archive:\n${releaseCommand}`
    : 'The GitHub release installer is not published yet. Repository installation is available.',
};

// Check required local inputs before preparing generated static assets.
for (const file of [
  'docs/portal.png',
  'public/fonts/dm-sans.ttf',
  'public/fonts/dm-sans-semibold.ttf',
  'public/fonts/manrope-bold.ttf',
  'docs/licenses/DM-SANS-OFL.txt',
  'docs/licenses/MANROPE-OFL.txt',
])
  await readFile(join(root, file));
await mkdir(join(publicDirectory, 'assets', 'licenses'), { recursive: true });
for (const file of ['styles.css', 'site.js', 'llms.txt', 'favicon.svg']) {
  let contents = await readFile(join(source, file), 'utf8');
  for (const [placeholder, value] of Object.entries(replacements))
    contents = contents.replaceAll(placeholder, value);
  if (/__MORI_[A-Z_]+__/.test(contents))
    throw new Error(`Unresolved configuration placeholder in ${file}.`);
  await writeFile(join(publicDirectory, file), contents);
}
await cp(join(root, 'docs', 'portal.png'), join(publicDirectory, 'assets', 'portal.png'));
await cp(
  join(root, 'public', 'videos', 'limits.mp4'),
  join(publicDirectory, 'assets', 'limits.mp4'),
);
await cp(
  join(root, 'examples', 'limits-video', 'transcript.txt'),
  join(publicDirectory, 'assets', 'limits-transcript.txt'),
);
for (const font of ['dm-sans.ttf', 'dm-sans-semibold.ttf', 'manrope-bold.ttf'])
  await cp(join(root, 'public', 'fonts', font), join(publicDirectory, 'assets', font));
for (const license of await readdir(join(root, 'docs', 'licenses')))
  await cp(
    join(root, 'docs', 'licenses', license),
    join(publicDirectory, 'assets', 'licenses', license),
  );
await cp(join(root, 'docs', 'THIRD_PARTY.md'), join(publicDirectory, 'assets', 'THIRD_PARTY.md'));

await new Promise((resolvePromise, reject) => {
  const child = spawn(
    process.execPath,
    [join(root, 'node_modules/next/dist/bin/next'), 'build', source, '--webpack'],
    {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        MORI_REPOSITORY: repository,
        MORI_RELEASE_VERSION: releaseVersion,
        MORI_SITE_SOURCE: source,
        MORI_SITE_BASE_PATH: basePath,
        NEXT_TELEMETRY_DISABLED: '1',
      },
    },
  );
  child.once('error', reject);
  child.once('exit', (code, signal) =>
    code === 0
      ? resolvePromise()
      : reject(new Error(`Next.js site export failed (${signal || code}).`)),
  );
});
// Preserve the previous deployable artifact until the full Next export succeeds.
await rm(output, { recursive: true, force: true });
await mkdir(dirname(output), { recursive: true });
await cp(join(source, 'out'), output, { recursive: true });
await writeFile(join(output, '.nojekyll'), '');
console.log(
  `Mori Study introduction built with Next.js at ${output}\nRepository: ${repository}\nBase path: ${basePath || '/'}\nNpm package: ${published ? 'published' : 'not published'} · GitHub release: ${releasePublished ? releaseVersion : 'not published'}\nDeploy dist/site to GitHub Pages or another static host.`,
);
