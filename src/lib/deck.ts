import fs from 'node:fs/promises';
import path from 'node:path';
import PptxGenJS from 'pptxgenjs';
import sharp from 'sharp';
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import 'mathjax-full/js/input/tex/ams/AmsConfiguration.js';
import 'mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js';
import { courseSchema, slideImageSchema } from './schema';
import { getSource, getSourceAsset, MoriError, projectRoot } from './storage';
import type { Citation, Course, Slide } from './types';

const WIDTH = 13.333333,
  HEIGHT = 7.5;
const BODY_TOP = 2.03,
  BODY_BOTTOM = 6.65;
const FULL_WIDTH = 11.65,
  PICTURE_TEXT_WIDTH = 4.15;
const FONT = 'Arial',
  INK = '293D33',
  MUTED = '6C776D',
  PAPER = 'FAFAF5';
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const palettes = {
  sage: { accent: '5D795B', light: 'E6ECDD' },
  peach: { accent: 'A8674D', light: 'F4E5D9' },
  lavender: { accent: '7A6B9C', light: 'EDE7F3' },
  blue: { accent: '577E93', light: 'E3EDF0' },
};

type Raster = { data: string; width: number; height: number };
type Equation = Raster & { ascent: number; descent: number; latex: string };
type Piece =
  | { text: string; width: number }
  | { math: Equation; width: number; height: number; ascent: number; descent: number };
export type DeckLine = {
  pieces: Piece[];
  height: number;
  baseline: number;
  fontSize: number;
  role: 'text' | 'heading' | 'bullet' | 'formula';
  indent: number;
  bulletStart?: boolean;
};
export type DeckPage = {
  kind:
    | 'cover'
    | 'outline'
    | 'lesson'
    | 'slides'
    | 'question'
    | 'answer'
    | 'exercise'
    | 'solution'
    | 'card'
    | 'video'
    | 'sources';
  title: string;
  kicker: string;
  lines: DeckLine[];
  citations: Citation[];
  notes: string;
  materialId?: string;
  image?: Slide['image'];
  imageData?: Raster;
  hyperlink?: string;
  continuation?: boolean;
};

function isInside(root: string, filename: string) {
  const relative = path.relative(root, filename);
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

/** Keep SVGs self-contained. In particular, never let a renderer resolve a URI. */
function checkSvg(bytes: Buffer) {
  const svg = bytes.toString('utf8');
  if (
    !/<svg[\s>]/i.test(svg) ||
    /<!DOCTYPE|<!ENTITY|<\s*(?:script|foreignObject|iframe|object|embed)\b|\son\w+\s*=|\bxml:base\s*=|@import/i.test(
      svg,
    )
  ) {
    throw new MoriError(
      'SVG images must be self-contained drawings without scripts, HTML, or external entities.',
      422,
    );
  }
  // Internal fragment references are needed by markers, clip paths, and glyphs.
  for (const match of svg.matchAll(
    /(?:\b(?:xlink:)?href\s*=\s*["']([^"']*)["']|\burl\s*\(\s*["']?([^\s)"']+))/gi,
  )) {
    const target = match[1] ?? match[2];
    if (!target.startsWith('#') || /[&\\]/.test(target))
      throw new MoriError('SVG images may reference only internal fragments, such as #arrow.', 422);
  }
  // CSS escapes/entities could disguise an external URL; neither is needed for a diagram.
  if (/\\|&#|&[a-z][a-z0-9]+;/i.test(svg.replace(/&(amp|lt|gt|quot|apos);/g, ''))) {
    throw new MoriError('SVG images must use literal, self-contained styles and references.', 422);
  }
}

export async function loadDeckImage(image: NonNullable<Slide['image']>): Promise<Raster> {
  slideImageSchema.parse(image);
  const src = decodeURIComponent(image.src);
  let bytes: Buffer;
  let svg = false;
  const sourceMatch = src.match(/^\/api\/sources\/([a-zA-Z0-9_-]+)$/);
  if (sourceMatch) {
    const asset = await getSourceAsset(sourceMatch[1]);
    if (asset.source.type !== 'image' || typeof asset.body === 'string')
      throw new MoriError('A slide image source must be an uploaded image.', 422);
    bytes = Buffer.from(asset.body);
    svg = asset.mime.includes('svg');
  } else {
    const publicPath = path.join(projectRoot(), 'public');
    // These paths belong to the runtime workspace, not Next's build dependencies.
    const filename = path.resolve(/* turbopackIgnore: true */ publicPath, `.${src}`);
    if (!isInside(publicPath, filename))
      throw new MoriError('Image path must stay inside public.', 422);
    let canonicalRoot: string, canonicalFile: string;
    try {
      [canonicalRoot, canonicalFile] = await Promise.all([
        fs.realpath(publicPath),
        fs.realpath(filename),
      ]);
    } catch {
      throw new MoriError(`Slide image was not found: ${image.src}`, 422);
    }
    if (!isInside(canonicalRoot, canonicalFile))
      throw new MoriError('Image symlinks must stay inside public.', 422);
    const stat = await fs.stat(canonicalFile);
    if (!stat.isFile() || stat.size > MAX_IMAGE_BYTES)
      throw new MoriError('Slide images must be regular files smaller than 25 MB.', 422);
    bytes = await fs.readFile(canonicalFile);
    svg = /\.svg$/i.test(src);
  }
  if (bytes.length > MAX_IMAGE_BYTES)
    throw new MoriError('Slide images must be smaller than 25 MB.', 422);
  // An SVG renamed .png must still pass the SVG checks before any renderer sees it.
  const rasterMagic =
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    /^GIF8[79]a/.test(bytes.subarray(0, 6).toString('ascii')) ||
    (bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP');
  if (svg || !rasterMagic) {
    checkSvg(bytes);
    svg = true;
  }
  try {
    const { data, info } = await sharp(bytes, { density: 180, limitInputPixels: 36_000_000 })
      .rotate()
      .resize({ width: 2_400, height: 1_800, fit: 'inside', withoutEnlargement: !svg })
      .png()
      .toBuffer({ resolveWithObject: true });
    return {
      data: `image/png;base64,${data.toString('base64')}`,
      width: info.width,
      height: info.height,
    };
  } catch {
    throw new MoriError(
      `Could not render slide image: ${image.src}. Use a valid SVG, PNG, JPEG, WebP, or GIF.`,
      422,
    );
  }
}

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

function mathRenderer() {
  // A separate TeX state per export prevents one course's macros leaking into another.
  const tex = new TeX({
    packages: ['base', 'ams', 'newcommand'],
    maxBuffer: 20_000,
    maxMacros: 1_000,
  });
  const document = mathjax.document('', {
    InputJax: tex,
    OutputJax: new SVG({ fontCache: 'none' }),
  });
  const cache = new Map<string, Promise<Equation>>();
  return (latex: string) => {
    if (!cache.has(latex))
      cache.set(
        latex,
        (async () => {
          try {
            tex.reset();
            const node = document.convert(latex, { display: true });
            const element = adaptor.tags(node, 'svg')[0];
            let svg = adaptor.outerHTML(element);
            if (/data-mml-node="merror"/.test(svg)) throw new Error('Invalid TeX');
            const box: number[] = String(adaptor.getAttribute(element, 'viewBox'))
              .split(/\s+/)
              .map(Number);
            if (
              box.length !== 4 ||
              box.some((number) => !Number.isFinite(number)) ||
              box[2] <= 0 ||
              box[3] <= 0
            )
              throw new Error('Empty equation');
            const [x, y, width, height] = box;
            void x;
            // Render at a fixed high resolution. Placement uses the original em measurements.
            const rasterWidth = Math.min(3_200, Math.max(80, Math.ceil(width * 0.14)));
            const rasterHeight = Math.max(24, Math.ceil((rasterWidth * height) / width));
            if (rasterHeight > 3_200) throw new Error('Equation too tall');
            svg = svg
              .replace(/\bwidth="[^"]*"/, `width="${rasterWidth}px"`)
              .replace(/\bheight="[^"]*"/, `height="${rasterHeight}px"`)
              .replace(/currentColor/g, `#${INK}`);
            const png = await sharp(Buffer.from(svg), { limitInputPixels: 12_000_000 })
              .png()
              .toBuffer();
            return {
              data: `image/png;base64,${png.toString('base64')}`,
              width: width / 1_000,
              height: height / 1_000,
              ascent: Math.max(0, -y / 1_000),
              descent: Math.max(0, (y + height) / 1_000),
              latex,
            };
          } catch {
            throw new MoriError(
              'A formula could not be typeset for PowerPoint. Check its LaTeX and split very large equations into smaller steps.',
              422,
            );
          }
        })(),
      );
    return cache.get(latex)!;
  };
}

function stripMarkup(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// Standard sans-serif advances, in thousandths of an em. Accurate advances keep
// embedded inline equations next to the editable words that surround them.
const asciiAdvances = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
  611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
  222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

/** Wrapping happens before writing a shape; a small margin covers font substitution. */
function textWidth(value: string, fontSize: number) {
  let em = 0;
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (code >= 32 && code <= 126) em += asciiAdvances[code - 32] / 1_000;
    else if (/\s/.test(char)) em += 0.278;
    else if (/[‘’“”]/.test(char)) em += 0.34;
    else if (char === '—') em += 1;
    else if (code > 0x2fff) em += 1;
    else em += 0.6;
  }
  return ((em * fontSize) / 72) * 1.025;
}

type MathRender = ReturnType<typeof mathRenderer>;

async function flowText(
  value: string,
  width: number,
  render: MathRender,
  role: DeckLine['role'] = 'text',
  fontSize = 20,
): Promise<DeckLine[]> {
  const indent = role === 'bullet' ? 0.22 : 0;
  const available = width - indent;
  const measureSize = fontSize * (role === 'heading' ? 1.065 : 1);
  const tokens: Piece[] = [];
  for (const part of value.split(/(\$[^$\n]+\$)/g)) {
    if (!part) continue;
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const math = await render(part.slice(1, -1));
      const scale = Math.min(fontSize / 72, (available - 0.04) / math.width);
      if (scale * 72 < 13)
        throw new MoriError(
          'An inline equation is too wide for a slide. Move it to a separate display equation and split it into steps.',
          422,
        );
      tokens.push({
        math,
        width: math.width * scale + 0.04,
        height: math.height * scale,
        ascent: math.ascent * scale,
        descent: math.descent * scale,
      });
    } else {
      for (const word of stripMarkup(part).split(/(\s+)/).filter(Boolean)) {
        if (textWidth(word, measureSize) <= available)
          tokens.push({
            text: word.replace(/\s+/g, ' '),
            width: textWidth(word.replace(/\s+/g, ' '), measureSize),
          });
        else {
          let chunk = '';
          for (const char of word) {
            if (textWidth(chunk + char, measureSize) > available && chunk) {
              tokens.push({ text: chunk, width: textWidth(chunk, measureSize) });
              chunk = '';
            }
            chunk += char;
          }
          if (chunk) tokens.push({ text: chunk, width: textWidth(chunk, measureSize) });
        }
      }
    }
  }
  const result: DeckLine[] = [];
  let pieces: Piece[] = [],
    used = 0;
  function finish() {
    while (
      pieces.length &&
      'text' in pieces[pieces.length - 1] &&
      !(pieces[pieces.length - 1] as { text: string }).text.trim()
    )
      pieces.pop();
    if (!pieces.length) return;
    const baseline = Math.max(
      (fontSize / 72) * 0.92,
      ...pieces.map((piece) => ('math' in piece ? piece.ascent + 0.03 : 0)),
    );
    const descent = Math.max(
      (fontSize / 72) * 0.28,
      ...pieces.map((piece) => ('math' in piece ? piece.descent + 0.03 : 0)),
    );
    const merged: Piece[] = [];
    for (const piece of pieces) {
      const last = merged[merged.length - 1];
      if ('text' in piece && last && 'text' in last) {
        last.text += piece.text;
        last.width += piece.width;
      } else merged.push({ ...piece });
    }
    result.push({
      pieces: merged,
      height: baseline + descent + 0.065,
      baseline,
      fontSize,
      role,
      indent,
      bulletStart: role === 'bullet' && result.length === 0,
    });
    pieces = [];
    used = 0;
  }
  for (const token of tokens) {
    if (used + token.width > available && pieces.length) finish();
    if (!pieces.length && 'text' in token && !token.text.trim()) continue;
    pieces.push(token);
    used += token.width;
  }
  finish();
  if (result.length) result[result.length - 1].height += role === 'heading' ? 0.13 : 0.12;
  return result;
}

async function markdownLines(
  markdown: string,
  width: number,
  render: MathRender,
): Promise<DeckLine[]> {
  const lines: DeckLine[] = [];
  // Display math is kept intact; paragraphs and list items remain editable text.
  for (const part of markdown.replace(/\r\n/g, '\n').split(/(\$\$[\s\S]*?\$\$)/g)) {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const math = await render(part.slice(2, -2).trim());
      const scale = Math.min(32 / 72, width / math.width, 1.25 / math.height);
      if (scale * 72 < 13)
        throw new MoriError(
          'A display equation is too large for a readable slide. Split it into smaller equations.',
          422,
        );
      lines.push({
        pieces: [
          {
            math,
            width: math.width * scale,
            height: math.height * scale,
            ascent: math.ascent * scale,
            descent: math.descent * scale,
          },
        ],
        height: Math.max(0.8, math.height * scale + 0.3),
        baseline: math.ascent * scale + 0.1,
        fontSize: 32,
        role: 'formula',
        indent: 0,
      });
      continue;
    }
    for (const paragraph of part.split(/\n\s*\n/)) {
      const trimmed = paragraph.trim();
      if (!trimmed || /^[-*_]{3,}$/.test(trimmed)) continue;
      const items = /^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|\||>)/m.test(trimmed)
        ? trimmed.split('\n')
        : [trimmed.replace(/\n/g, ' ')];
      for (const item of items) {
        if (/^\s*\|?[\s:|\-]+\|\s*$/.test(item)) continue;
        const heading = /^#{1,6}\s+/.test(item);
        const bullet = /^\s*(?:[-*+]\s|\d+[.)]\s)/.test(item);
        const value = item
          .replace(/^#{1,6}\s+/, '')
          .replace(/^>\s?/, '')
          .replace(/^\s*[-*+]\s+/, '')
          .replace(/^\s*\||\|\s*$/g, '')
          .replace(/\s*\|\s*/g, '    ·    ');
        lines.push(
          ...(await flowText(
            value,
            width,
            render,
            heading ? 'heading' : bullet ? 'bullet' : 'text',
            heading ? 22 : 20,
          )),
        );
      }
    }
  }
  return lines;
}

function citationText(citation: Citation) {
  return `${citation.label} (${citation.sourceId})${citation.page ? ` · p. ${citation.page}` : ''}${citation.section ? ` · ${citation.section}` : ''}`;
}

/** Build pages first, so long explanations are never left to PowerPoint's unreliable auto-fit. */
export async function buildDeckPlan(input: Course): Promise<DeckPage[]> {
  const course = courseSchema.parse(input);
  const render = mathRenderer();
  const pages: DeckPage[] = [];
  const imageCache = new Map<string, Promise<Raster>>();
  const imageFor = (image: NonNullable<Slide['image']>) => {
    if (!imageCache.has(image.src)) imageCache.set(image.src, loadDeckImage(image));
    return imageCache.get(image.src)!;
  };
  async function append(base: Omit<DeckPage, 'lines'>, markdown: string) {
    const width = base.image ? PICTURE_TEXT_WIDTH : FULL_WIDTH;
    const lines = await markdownLines(markdown, width, render);
    let current: DeckLine[] = [],
      used = 0,
      part = 0;
    function flush() {
      if (pages.length >= 2_000)
        throw new MoriError(
          'This study pack exceeds 2,000 export slides. Export smaller chapter packs.',
          422,
        );
      pages.push({ ...base, continuation: part > 0, lines: current });
      current = [];
      used = 0;
      part++;
    }
    for (const [index, line] of lines.entries()) {
      if (line.height > BODY_BOTTOM - BODY_TOP)
        throw new MoriError(
          'A formula is too tall for the deck. Split it into smaller steps.',
          422,
        );
      if (line.role === 'heading' && lines[index - 1]?.role !== 'heading' && current.length) {
        let required = line.height;
        let next = index + 1;
        while (lines[next]?.role === 'heading') {
          required += lines[next].height;
          next++;
        }
        required += lines[next]?.height || 0;
        if (used + required > BODY_BOTTOM - BODY_TOP) flush();
      }
      if (used + line.height > BODY_BOTTOM - BODY_TOP && current.length) flush();
      current.push(line);
      used += line.height;
    }
    if (current.length || !part) flush();
  }
  pages.push({
    kind: 'cover',
    title: course.title,
    kicker: course.subject,
    lines: [],
    citations: [],
    notes: `${course.description}\nScope: ${course.chapters}\nGenerated from local Mori Study materials. No model or remote image service is called during export.`,
  });
  await append(
    {
      kind: 'outline',
      title: 'Your study path',
      kicker: course.chapters,
      notes: course.description,
      citations: [],
    },
    `${course.description}\n\n${course.materials.map((material, i) => `${i + 1}. ${material.title} — ${material.kind}`).join('\n')}`,
  );
  for (const material of course.materials) {
    const base = {
      materialId: material.id,
      title: material.title,
      kicker: `${material.section}  /  ${material.kind}`,
      citations: material.citations,
      notes: `${material.title}\n${material.description}\n\n${material.citations.map(citationText).join('\n')}`,
    };
    if (material.kind === 'lesson') {
      await append(
        { ...base, kind: 'lesson', notes: `${base.notes}\n\n${material.content}` },
        material.content!,
      );
    } else if (material.kind === 'slides') {
      for (const [index, slide] of material.slides!.entries()) {
        const imageData = slide.image ? await imageFor(slide.image) : undefined;
        const captionInline = slide.image?.caption && isShortCaption(slide.image.caption);
        const markdown = [
          slide.body,
          ...(slide.bullets?.map((bullet) => `- ${bullet}`) || []),
          slide.formula ? `$$${slide.formula}$$` : '',
        ]
          .filter(Boolean)
          .join('\n\n');
        await append(
          {
            ...base,
            kind: 'slides',
            title: slide.title,
            kicker: `${material.section}  /  slide ${index + 1}`,
            image: slide.image,
            imageData,
            notes: `${base.notes}\n\n${markdown}\n\nSpeaker notes: ${slide.notes || ''}\n${slide.image ? `Image: ${slide.image.alt}\n${slide.image.src}\n${slide.image.caption || ''}` : ''}`,
          },
          markdown,
        );
        if (slide.image?.caption && !captionInline)
          await append(
            { ...base, kind: 'slides', title: `${slide.title} · image context` },
            slide.image.caption,
          );
        // Speaker notes remain editable in the deck's Notes pane, just as in source slides.
      }
    } else if (material.kind === 'quiz') {
      for (const [index, question] of material.questions!.entries()) {
        const prompt = `${question.prompt}\n\n${question.options.map((option, i) => `${String.fromCharCode(65 + i)}. ${option}`).join('\n\n')}`;
        await append(
          {
            ...base,
            kind: 'question',
            title: `Question ${index + 1}`,
            kicker: material.title,
            notes: `${base.notes}\n\n${prompt}`,
          },
          prompt,
        );
        const answer = `## ${String.fromCharCode(65 + question.answer)}. ${question.options[question.answer]}\n\n${question.explanation}`;
        await append(
          {
            ...base,
            kind: 'answer',
            title: `Question ${index + 1} · the explanation`,
            kicker: material.title,
            notes: `${base.notes}\n\n${answer}`,
          },
          answer,
        );
      }
    } else if (material.kind === 'practice') {
      for (const [index, problem] of material.problems!.entries()) {
        const prompt = `${problem.prompt}${problem.hint ? `\n\n### A hint\n\n${problem.hint}` : ''}`;
        await append(
          {
            ...base,
            kind: 'exercise',
            title: `Practice ${index + 1}`,
            kicker: material.title,
            notes: `${base.notes}\n\n${prompt}`,
          },
          prompt,
        );
        await append(
          {
            ...base,
            kind: 'solution',
            title: `Practice ${index + 1} · worked solution`,
            kicker: material.title,
            notes: `${base.notes}\n\n${problem.solution}`,
          },
          problem.solution,
        );
      }
    } else if (material.kind === 'flashcards') {
      for (const [index, card] of material.cards!.entries()) {
        await append(
          {
            ...base,
            kind: 'card',
            title: `Recall ${index + 1} · give it a moment`,
            kicker: material.title,
            notes: `${base.notes}\n\n${card.front}`,
          },
          card.front,
        );
        await append(
          {
            ...base,
            kind: 'card',
            title: `Recall ${index + 1} · turn it over`,
            kicker: material.title,
            notes: `${base.notes}\n\n${card.back}`,
          },
          card.back,
        );
      }
    } else if (material.kind === 'video') {
      await append(
        {
          ...base,
          kind: 'video',
          hyperlink: material.videoUrl,
          notes: `${base.notes}\nVideo: ${material.videoUrl}\n\n${material.transcript}`,
        },
        `${material.description}\n\nVideo: ${material.videoUrl}\n\n## Transcript\n\n${material.transcript}`,
      );
    }
  }
  const sources = await Promise.all(course.sourceIds.map((id) => getSource(id)));
  const credits = course.sourceIds
    .map((id, index) => {
      const source = sources[index];
      const references = new Set(
        course.materials.flatMap((material) =>
          material.citations.filter((citation) => citation.sourceId === id).map(citationText),
        ),
      );
      return `## ${source?.name || id}\n\nSource ID: ${id}${source ? `\n\n${source.url}` : ''}\n\n${[...references].join('\n\n')}`;
    })
    .join('\n\n');
  const visuals = course.materials.flatMap(
    (material) =>
      material.slides
        ?.filter((slide) => slide.image)
        .map(
          (slide) =>
            `${slide.image!.alt}\n\n${slide.image!.src}${slide.image!.caption ? `\n\n${slide.image!.caption}` : ''}`,
        ) || [],
  );
  await append(
    {
      kind: 'sources',
      title: 'Sources & image credits',
      kicker: 'Keep the connection to your material',
      citations: [],
      notes: credits,
    },
    `${credits}${visuals.length ? `\n\n## Illustrations\n\n${visuals.join('\n\n')}` : ''}`,
  );
  if (pages.length > 2_000)
    throw new MoriError(
      'This study pack exceeds 2,000 export slides. Export smaller chapter packs.',
      422,
    );
  return pages;
}

function short(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function isShortCaption(value: string) {
  return value.length <= 160 && textWidth(value, 10.5) <= 6.8 * 1.8;
}

function fittedSize(value: string, width: number, height: number, preferred: number) {
  let size = preferred;
  while (
    size > 12 &&
    ((Math.ceil(textWidth(value, size * 1.14) / width) * size) / 72) * 1.24 > height
  )
    size--;
  return size;
}

function shortenedToWidth(value: string, width: number, size: number, charSpacing = 0) {
  let result = value;
  while (
    result.length &&
    textWidth(result, size * 1.065) + (result.length * charSpacing) / 72 > width
  )
    result = result.slice(0, -1);
  return result.length === value.length ? value : `${result.slice(0, -1)}…`;
}

function addText(
  slide: PptxGenJS.Slide,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  options: PptxGenJS.TextPropsOptions = {},
) {
  slide.addText(text, {
    x,
    y,
    w,
    h,
    fontFace: FONT,
    fontSize: 20,
    color: INK,
    margin: 0,
    breakLine: false,
    valign: 'top',
    ...options,
  });
}

function drawLines(slide: PptxGenJS.Slide, page: DeckPage, color: string) {
  const width = page.image ? PICTURE_TEXT_WIDTH : FULL_WIDTH;
  let y = BODY_TOP;
  for (const line of page.lines) {
    const totalWidth = line.pieces.reduce((sum, piece) => sum + piece.width, 0);
    let x =
      0.84 + line.indent + (line.role === 'formula' ? Math.max(0, (width - totalWidth) / 2) : 0);
    if (line.bulletStart)
      addText(slide, '•', 0.82, y + line.baseline - (line.fontSize / 72) * 0.92, 0.2, 0.35, {
        color,
        fontSize: 18,
      });
    for (const piece of line.pieces) {
      if ('math' in piece) {
        const top =
          line.role === 'formula'
            ? y + (line.height - piece.height) / 2
            : y + line.baseline - piece.ascent;
        slide.addImage({
          data: piece.math.data,
          x,
          y: top,
          w: piece.width - (line.role === 'formula' ? 0 : 0.04),
          h: piece.height,
          altText: `Equation: ${piece.math.latex}`,
        });
      } else {
        addText(
          slide,
          piece.text,
          x,
          y + line.baseline - (line.fontSize / 72) * 0.92,
          piece.width + 0.04,
          (line.fontSize / 72) * 1.38,
          {
            fontSize: line.fontSize,
            bold: line.role === 'heading',
            color: line.role === 'heading' ? color : INK,
            lineSpacingMultiple: 1,
            wrap: false,
          },
        );
      }
      x += piece.width;
    }
    y += line.height;
  }
}

export async function createCourseDeck(
  course: Course,
  options: { baseUrl?: string } = {},
): Promise<Buffer> {
  const pages = await buildDeckPlan(course);
  const port = Number(process.env.MORI_PORT) || 3000;
  const baseUrl = new URL(options.baseUrl || `http://127.0.0.1:${port}`);
  if (!['http:', 'https:'].includes(baseUrl.protocol))
    throw new MoriError('Video links need an HTTP(S) portal URL.', 422);
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Mori Study';
  pptx.subject = `${course.subject} · ${course.chapters}`;
  pptx.title = course.title;
  pptx.company = 'Mori Study';
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };
  const palette = palettes[course.color];
  for (const [index, page] of pages.entries()) {
    const slide = pptx.addSlide();
    slide.background = { color: PAPER };
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: WIDTH,
      h: 0.12,
      fill: { color: palette.accent },
      line: { transparency: 100 },
    });
    if (page.kind === 'cover') {
      slide.addShape(pptx.ShapeType.rect, {
        x: 8.2,
        y: 0.12,
        w: 5.14,
        h: HEIGHT - 0.12,
        fill: { color: palette.light },
        line: { transparency: 100 },
      });
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 9.05,
        y: 1.65,
        w: 3.15,
        h: 3.15,
        fill: { color: PAPER },
        line: { transparency: 100 },
      });
      slide.addShape(pptx.ShapeType.arc, {
        x: 9.63,
        y: 2.24,
        w: 1.96,
        h: 1.96,
        rotate: 22,
        line: { color: palette.accent, width: 5 },
      });
      addText(slide, 'MORI STUDY', 0.86, 0.79, 7, 0.4, {
        fontSize: 13,
        bold: true,
        color: palette.accent,
        charSpacing: 2.8,
      });
      const titleSize = fittedSize(course.title, 6.9, 2.65, 38);
      addText(slide, course.title, 0.84, 1.9, 6.9, 2.65, {
        fontSize: titleSize,
        bold: true,
        lineSpacingMultiple: 1.05,
      });
      addText(slide, short(course.description, 220), 0.86, 4.63, 6.6, 1.13, {
        fontSize: fittedSize(short(course.description, 220), 6.6, 1.13, 18),
        color: MUTED,
        lineSpacingMultiple: 1.1,
      });
      addText(slide, `${course.subject}  ·  ${course.chapters}`, 0.86, 6.44, 10.8, 0.42, {
        fontSize: 13,
        color: palette.accent,
      });
      addText(slide, `${course.materials.length}\nlearning materials`, 9.03, 5.38, 3.18, 0.9, {
        fontSize: 21,
        color: palette.accent,
        align: 'center',
      });
    } else {
      const kickerWidth = page.hyperlink ? 9.4 : 11.65;
      addText(
        slide,
        shortenedToWidth(page.kicker.toUpperCase(), kickerWidth, 11, 1.2),
        0.86,
        0.51,
        kickerWidth,
        0.35,
        {
          fontSize: 11,
          bold: true,
          color: palette.accent,
          charSpacing: 1.2,
        },
      );
      const heading = `${page.title}${page.continuation ? ' · continued' : ''}`;
      const headingSize = fittedSize(heading, 11.68, 0.99, 31);
      addText(slide, heading, 0.84, 0.98, 11.68, 0.99, {
        fontSize: headingSize,
        bold: true,
        lineSpacingMultiple: 1,
      });
      if (page.image && page.imageData) {
        const image = page.imageData;
        const box = { x: 5.3, y: 1.97, w: 7.2, h: 4.76 };
        slide.addShape(pptx.ShapeType.roundRect, {
          ...box,
          rectRadius: 0.16,
          fill: { color: palette.light },
          line: { transparency: 100 },
        });
        const scale = Math.min(
          box.w / image.width,
          (box.h - (page.image.caption ? 0.45 : 0.05)) / image.height,
        );
        const w = image.width * scale,
          h = image.height * scale;
        slide.addImage({
          data: image.data,
          x: box.x + (box.w - w) / 2,
          y: box.y + 0.03 + (box.h - 0.48 - h) / 2,
          w,
          h,
          altText: page.image.alt,
        });
        if (page.image.caption && isShortCaption(page.image.caption))
          addText(slide, page.image.caption, box.x + 0.2, box.y + box.h - 0.43, box.w - 0.4, 0.38, {
            fontSize: 10.5,
            color: MUTED,
            align: 'center',
          });
      }
      drawLines(slide, page, palette.accent);
    }
    slide.addShape(pptx.ShapeType.line, {
      x: 0.84,
      y: 6.98,
      w: 11.66,
      h: 0,
      line: { color: 'DCDFD5', width: 0.7 },
    });
    const foot = page.citations.length
      ? `Source: ${page.citations.map(citationText).join('  ·  ')}`
      : 'Mori Study  ·  Bring the idea with you';
    addText(slide, shortenedToWidth(foot, 10.6, 8), 0.86, 7.09, 10.6, 0.21, {
      fontSize: 8,
      color: MUTED,
    });
    addText(slide, `${index + 1} / ${pages.length}`, 11.65, 7.08, 0.82, 0.24, {
      fontSize: 9,
      color: MUTED,
      align: 'right',
    });
    if (page.hyperlink) {
      // Local video links point back to the workspace; no media or absolute machine paths are embedded.
      addText(slide, 'Watch video ↗', 10.69, 0.49, 1.8, 0.32, {
        fontSize: 11,
        color: palette.accent,
        align: 'right',
        hyperlink: { url: new URL(page.hyperlink, baseUrl).href },
      });
    }
    slide.addNotes(
      `${page.notes}\n\n${page.citations.map(citationText).join('\n')}\n\nImages and equations are embedded PNGs; prose is editable. Original LaTeX is retained above. Video files are linked separately; links to local videos work while the Mori Study portal is running.`,
    );
  }
  return Buffer.from(
    (await pptx.write({ outputType: 'nodebuffer', compression: true })) as Uint8Array,
  );
}
