#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const HYPERFRAMES_VERSION = '0.8.181';
const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

function text(value, name, limit, optional = false) {
  if (optional && value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim() || [...value].length > limit)
    throw new Error(`${name} must be nonempty text up to ${limit} characters.`);
  return value.trim();
}

export function validateVideo(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Video spec must be a JSON object.');
  const title = text(input.title, 'title', 80);
  if (!Array.isArray(input.scenes) || input.scenes.length < 1 || input.scenes.length > 12)
    throw new Error('Use between 1 and 12 scenes.');
  return {
    title,
    scenes: input.scenes.map((scene, index) => {
      const name = `scenes[${index}]`;
      if (!scene || typeof scene !== 'object') throw new Error(`${name} must be an object.`);
      if (
        typeof scene.duration !== 'number' ||
        !Number.isFinite(scene.duration) ||
        scene.duration < 6 ||
        scene.duration > 45
      )
        throw new Error(`${name}.duration must be 6–45 seconds.`);
      if (scene.cards !== undefined && (!Array.isArray(scene.cards) || scene.cards.length > 3))
        throw new Error(`${name}.cards must contain at most 3 cards.`);
      return {
        title: text(scene.title, `${name}.title`, 68),
        eyebrow: text(scene.eyebrow, `${name}.eyebrow`, 45, true),
        body: text(scene.body, `${name}.body`, 200),
        formula: text(scene.formula, `${name}.formula`, 58, true),
        citation: text(scene.citation, `${name}.citation`, 125),
        duration: Math.round(scene.duration * 1000) / 1000,
        cards: (scene.cards || []).map((card, i) => ({
          label: text(card?.label, `${name}.cards[${i}].label`, 25),
          text: text(card?.text, `${name}.cards[${i}].text`, 85),
        })),
      };
    }),
  };
}

const styles = `
* { box-sizing: border-box; }
#root { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; background: #f8f7f2; color: #263b31; font-family: system-ui, sans-serif; }
.scene { position: absolute; inset: 0; padding: 106px 72px 78px; }
.eyebrow { margin: 0 0 15px; font-size: 16px; font-weight: 650; text-transform: uppercase; letter-spacing: 2px; color: #516b5c; }
h1 { margin: 0; max-width: 1136px; font-size: 48px; font-weight: 600; line-height: 1.14; letter-spacing: -1.4px; }
.body { margin: 22px 0 0; max-width: 1100px; font-size: 24px; line-height: 1.4; color: #445b4e; }
.formula { height: 102px; display: flex; align-items: center; justify-content: center; margin-top: 26px; border: 1px solid #cbdace; border-radius: 18px; background: #e6eee5; font-size: 38px; letter-spacing: -0.6px; }
.cards { margin-top: 22px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.card { border: 1px solid #dfE4da; border-radius: 15px; padding: 20px 22px; background: #ffffff; }
.card-label { margin: 0 0 10px; font-size: 17px; font-weight: 650; color: #375c47; }
.card-text { margin: 0; font-size: 20px; line-height: 1.35; color: #43554a; }
.citation { position: absolute; left: 72px; right: 72px; bottom: 28px; margin: 0; font-size: 14px; color: #566b5d; }
`;

function sceneHTML(scene, index) {
  const id = `scene-${index + 1}`;
  const cards = scene.cards
    .map(
      (card, i) =>
        `<div id="${id}-card-${i}" class="card"><p class="card-label">${escape(card.label)}</p><p class="card-text">${escape(card.text)}</p></div>`,
    )
    .join('\n');
  // Card entrances adapt HyperFrames' grid-card-assemble component: short slide,
  // explicit endpoint states, reading hold. See docs/THIRD_PARTY.md.
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escape(scene.title)}</title></head><body>
<template><div id="root" data-composition-id="${id}" data-duration="${scene.duration}" data-width="1280" data-height="720">
<style>${styles}</style>
<section class="scene clip" data-start="0" data-duration="${scene.duration}" data-track-index="0" id="${id}-content">
<div id="${id}-heading"><p class="eyebrow">${escape(scene.eyebrow || `IDEA ${index + 1}`)}</p><h1>${escape(scene.title)}</h1><p class="body">${escape(scene.body)}</p></div>
${scene.formula ? `<div class="formula" id="${id}-formula" style="font-size:${scene.formula.length > 45 ? 30 : 38}px">${escape(scene.formula)}</div>` : ''}
<div class="cards" style="grid-template-columns:repeat(${Math.max(1, scene.cards.length)},minmax(0,1fr))">${cards}</div>
<p class="citation">${escape(scene.citation)}</p>
</section>
<script>
const tl = gsap.timeline({ paused: true });
tl.fromTo('#${id}-heading', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, 0);
${scene.formula ? `tl.fromTo('#${id}-formula', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' }, 0.7);` : ''}
${scene.cards.map((_, i) => `tl.fromTo('#${id}-card-${i}', { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' }, ${1.3 + i * 0.65});`).join('\n')}
window.__timelines['${id}'] = tl;
</script></div></template></body></html>`;
}

function timestamp(seconds) {
  const total = Math.round(seconds * 1000);
  return `${String(Math.floor(total / 3600000)).padStart(2, '0')}:${String(Math.floor(total / 60000) % 60).padStart(2, '0')}:${String(Math.floor(total / 1000) % 60).padStart(2, '0')}.${String(total % 1000).padStart(3, '0')}`;
}

export async function createVideo(input, outputDirectory) {
  const spec = validateVideo(input);
  const out = resolve(outputDirectory);
  try {
    const existing = JSON.parse(await readFile(join(out, 'package.json'), 'utf8'));
    if (existing.name !== 'mori-video')
      throw new Error(
        'Choose a dedicated output directory; this directory belongs to another project.',
      );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(join(out, 'compositions'), { recursive: true });
  await mkdir(join(out, 'assets'), { recursive: true });
  const gsapRuntime = require.resolve('gsap/dist/gsap.min.js');
  await copyFile(gsapRuntime, join(out, 'assets/gsap.min.js'));
  await writeFile(
    join(out, 'assets/GSAP-NOTICE.txt'),
    'GSAP 3.14.2\nCopyright 2025, GreenSock. All rights reserved.\nSubject to https://gsap.com/standard-license\nThe original license header is preserved in gsap.min.js.\n',
  );
  await copyFile(
    fileURLToPath(new URL('../docs/licenses/HYPERFRAMES-LICENSE.txt', import.meta.url)),
    join(out, 'assets/HYPERFRAMES-LICENSE.txt'),
  );
  await writeFile(
    join(out, 'assets/HYPERFRAMES-NOTICE.txt'),
    'Card entrance timing adapted from HyperFrames grid-card-assemble.\nCopyright 2026 HeyGen, Inc. Licensed under Apache-2.0.\nhttps://github.com/heygen-com/hyperframes\nMori modifications: scene layout, content input, and reveal schedule.\n',
  );
  let cursor = 0;
  let hosts = '';
  let transcript = `${spec.title}\n\nSilent study video. On-screen explanation:\n\n`;
  let vtt = 'WEBVTT\n\n';
  for (const [i, scene] of spec.scenes.entries()) {
    const id = `scene-${i + 1}`;
    await writeFile(join(out, 'compositions', `${id}.html`), sceneHTML(scene, i));
    hosts += `<div id="${id}-host" class="scene-host" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${cursor}" data-duration="${scene.duration}" data-track-index="1" data-width="1280" data-height="720"></div>\n`;
    const explanation = [
      scene.title,
      scene.body,
      scene.formula,
      ...scene.cards.map((card) => `${card.label}: ${card.text}`),
    ]
      .filter(Boolean)
      .join('\n');
    transcript += `${timestamp(cursor)} — ${timestamp(cursor + scene.duration)}\n${explanation}\nSource: ${scene.citation}\n\n`;
    vtt += `${i + 1}\n${timestamp(cursor)} --> ${timestamp(cursor + scene.duration)}\n${explanation.replaceAll('-->', '→').replaceAll('<', '‹')}\n\n`;
    cursor = Math.round((cursor + scene.duration) * 1000) / 1000;
  }
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1280, height=720"><title>${escape(spec.title)}</title>
<script src="assets/gsap.min.js"></script>
<style>
*{box-sizing:border-box}body{margin:0;background:#f8f7f2;color:#263b31;font-family:system-ui,sans-serif}#root{position:relative;width:100%;height:100%;overflow:hidden}.scene-host{position:absolute;inset:0}.brand{position:absolute;top:32px;left:72px;z-index:20;font-size:22px;font-weight:650;letter-spacing:-1px}.label{position:absolute;top:39px;right:72px;z-index:20;font-size:14px;color:#516b5c}.track{position:absolute;top:0;left:0;right:0;height:4px;background:#e1e8dd;z-index:20}.progress{height:4px;width:100%;background:#54775c;transform-origin:left center}
</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="${cursor}" data-width="1280" data-height="720">
${hosts}<div class="brand">mori.</div><div class="label">${escape(spec.title)} · silent explainer</div><div class="track"><div class="progress" id="progress"></div></div>
</div><script>
const tl = gsap.timeline({ paused: true });
tl.fromTo('#progress', { scaleX: 0 }, { scaleX: 1, duration: ${cursor}, ease: 'none' }, 0);
window.__timelines['main'] = tl;
</script></body></html>`;
  await writeFile(join(out, 'index.html'), html);
  await writeFile(join(out, 'transcript.txt'), transcript);
  await writeFile(join(out, 'captions.vtt'), vtt);
  await writeFile(join(out, 'video.json'), `${JSON.stringify(spec, null, 2)}\n`);
  await writeFile(
    join(out, 'hyperframes.json'),
    `${JSON.stringify({ version: 1, entry: 'index.html' }, null, 2)}\n`,
  );
  await writeFile(
    join(out, 'package.json'),
    `${JSON.stringify({ name: 'mori-video', private: true, scripts: { check: `npx --yes hyperframes@${HYPERFRAMES_VERSION} check`, preview: `npx --yes hyperframes@${HYPERFRAMES_VERSION} preview`, render: `npx --yes hyperframes@${HYPERFRAMES_VERSION} render --quality delivery` } }, null, 2)}\n`,
  );
  return { directory: out, duration: cursor, transcript };
}

function runHyperframes(args, cwd) {
  return new Promise((resolvePromise, reject) => {
    const process = spawn(
      processPlatformNpx(),
      ['--yes', `hyperframes@${HYPERFRAMES_VERSION}`, ...args],
      { cwd, stdio: 'inherit', shell: false },
    );
    process.on('error', reject);
    process.on('exit', (code, signal) =>
      code === 0
        ? resolvePromise()
        : reject(
            new Error(
              `HyperFrames ${args[0]} failed (${signal || code}). The editable composition remains at ${cwd}.`,
            ),
          ),
    );
  });
}

function processPlatformNpx() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log(
      'Usage: npm run video -- <scene-spec.json> --out <project-directory> [--render --output <video.mp4>]\nCreates a silent, local HyperFrames composition with a transcript. Rendering requires FFmpeg and may download the pinned HyperFrames CLI/browser.',
    );
    return;
  }
  const input = args.shift();
  const options = {};
  while (args.length) {
    const flag = args.shift();
    if (flag === '--render') options.render = true;
    else if ((flag === '--out' || flag === '--output') && args[0] && !args[0].startsWith('--'))
      options[flag.slice(2)] = args.shift();
    else throw new Error(`Unknown or incomplete option: ${flag}`);
  }
  if (!options.out) throw new Error('--out <project-directory> is required.');
  if (options.output && !options.render) throw new Error('--output needs --render.');
  if (options.render && !options.output) throw new Error('--render needs --output <video.mp4>.');
  if (options.output && !options.output.toLowerCase().endsWith('.mp4'))
    throw new Error('The output must have an .mp4 extension.');
  const spec = JSON.parse(await readFile(resolve(input), 'utf8'));
  const result = await createVideo(spec, options.out);
  console.log(`Created ${result.duration}s silent composition: ${result.directory}`);
  if (!options.render) return;
  const output = resolve(options.output);
  await mkdir(dirname(output), { recursive: true });
  await runHyperframes(['check'], result.directory);
  await runHyperframes(
    ['render', '--quality', 'delivery', '--fps', '30', '--output', output],
    result.directory,
  );
  console.log(`Rendered video: ${output}`);
}

if (
  process.argv[1] &&
  realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1]))
) {
  main().catch((error) => {
    console.error(`Mori video: ${error.message}`);
    process.exitCode = 1;
  });
}
