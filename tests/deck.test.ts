import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { unzipSync } from 'fflate';
import sharp from 'sharp';
import { GET } from '../src/app/api/courses/[id]/export/route';
import { buildDeckPlan, createCourseDeck, loadDeckImage } from '../src/lib/deck';
import { courseSchema, slideImageSchema } from '../src/lib/schema';
import { saveFileSource, saveTextSource } from '../src/lib/storage';
import type { Course, Material } from '../src/lib/types';

const exec = promisify(execFile);
const sourceId = 'calculus-notes';
const cited = [
  { sourceId, label: 'Original calculus example notes', section: '1.1 Functions', page: 2 },
];
function material(kind: Material['kind'], data: Partial<Material>): Material {
  return {
    id: `deck-${kind}`,
    kind,
    title: `Material ${kind}`,
    description: 'A complete grounded explanation.',
    duration: 4,
    section: 'Chapter 1',
    citations: cited,
    ...data,
  };
}
function example(): Course {
  return {
    schemaVersion: 1,
    id: 'deck-fixture',
    title: 'Every part of the study pack',
    description: 'Practice, remember, and explain the idea.',
    subject: 'Mathematics',
    color: 'sage',
    icon: 'calculus',
    chapters: '1.1',
    sourceIds: [sourceId],
    createdAt: '2026-10-21T12:00:00.000Z',
    updatedAt: '2026-10-21T12:00:00.000Z',
    materials: [
      material('lesson', {
        content:
          '## A useful rule\n\nA function sends each input to one output. Compare $x<y$ and $y>z$ without losing an inequality.\n\n$$f(x)=x^2$$',
      }),
      material('slides', {
        slides: [
          {
            title: 'One input, one output',
            body: 'An original diagram makes the mapping visible.',
            bullets: ['Different inputs may share an output.'],
            formula: String.raw`\frac{f(b)-f(a)}{b-a}`,
            image: {
              src: '/illustrations/function-map.svg',
              alt: 'Negative two and two each map to four.',
              caption: 'Original Mori Study diagram.',
            },
            notes: 'This is the speaker-note sentinel.',
          },
        ],
      }),
      material('quiz', {
        questions: [
          {
            id: 'deck-q',
            prompt: 'What is $f(2)$ when $f(x)=x^2$?',
            options: ['Two', 'Four'],
            answer: 1,
            explanation: 'The quiz answer sentinel: two squared is four.',
          },
        ],
      }),
      material('practice', {
        problems: [
          {
            id: 'deck-p',
            prompt: 'Find the average rate of change.',
            hint: 'Divide the change in output by the change in input.',
            solution: 'The worked solution sentinel.\n\n$$\frac{9-1}{3-1}=4.$$',
          },
        ],
      }),
      material('flashcards', {
        cards: [
          {
            id: 'deck-card',
            front: 'The recall-front sentinel: what is a domain?',
            back: 'The recall-back sentinel: all permitted inputs.',
          },
        ],
      }),
      material('video', {
        videoUrl: '/videos/limits.mp4',
        transcript: 'The transcript sentinel: approaching a point tells us about a limit.',
      }),
    ],
  };
}
function xmlText(xml: string) {
  return [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
    .map((match) => match[1])
    .join(' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}
function slideEntries(bytes: Uint8Array) {
  const archive = unzipSync(bytes);
  const slides = Object.keys(archive)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/)![1]) - Number(b.match(/slide(\d+)/)![1]));
  return {
    archive,
    slides,
    text: slides.map((name) => xmlText(Buffer.from(archive[name]).toString('utf8'))).join('\n'),
  };
}

test('PowerPoint contains every material, correct answers, pictures, equations, notes, and source credits', async () => {
  const deck = await createCourseDeck(example(), { baseUrl: 'http://127.0.0.1:3456' });
  const { archive, slides, text } = slideEntries(deck);
  assert.ok(
    slides.length >= 12,
    'cover, outline, six kinds, answer pages, and credits all exported',
  );
  for (const expected of [
    'A useful rule',
    'quiz answer sentinel',
    'worked solution sentinel',
    'recall-front sentinel',
    'recall-back sentinel',
    'transcript sentinel',
    'Original calculus example notes',
    'Sources & image credits',
  ])
    assert.ok(text.includes(expected), `missing ${expected}`);
  assert.match(text, /B\. Four/);
  const slideXml = slides.map((name) => Buffer.from(archive[name]).toString('utf8')).join('\n');
  assert.match(slideXml, /Negative two and two each map to four/);
  assert.match(slideXml, /Equation: x&lt;y/);
  assert.match(slideXml, /Equation: y&gt;z/);
  assert.ok(
    Object.keys(archive).filter((name) => /^ppt\/media\//.test(name)).length >= 5,
    'diagrams and correctly typeset equations are embedded',
  );
  const notes = Object.entries(archive)
    .filter(([name]) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name))
    .map(([, bytes]) => Buffer.from(bytes).toString('utf8'))
    .join('\n');
  assert.match(notes, /speaker-note sentinel/);
  assert.ok(notes.includes('\\frac{f(b)-f(a)}{b-a}'), 'editable original LaTeX retained in notes');
  const relationships = Object.entries(archive)
    .filter(([name]) => name.endsWith('.rels'))
    .map(([, bytes]) => Buffer.from(bytes).toString('utf8'))
    .join('\n');
  assert.match(relationships, /Target="http:\/\/127\.0\.0\.1:3456\/videos\/limits\.mp4"/);
  assert.doesNotMatch(
    relationships,
    /file:\/\/|\/Users\/|\/home\//,
    'no machine-specific file paths leak into deck relationships',
  );
  assert.match(
    Buffer.from(archive['ppt/presentation.xml']).toString('utf8'),
    /cx="12192000" cy="6858000"/,
    '16:9 widescreen size',
  );
});

test('long lesson text is paginated without losing its end or exceeding slide content bounds', async () => {
  const pack = example();
  const long = `${'This explanation keeps a meaningful paragraph intact while giving the idea enough room. '.repeat(220)} LAST-CONTENT-SENTINEL`;
  pack.materials = [material('lesson', { content: `## Start here\n\n${long}` })];
  const pages = await buildDeckPlan(pack);
  const lessons = pages.filter((page) => page.kind === 'lesson');
  assert.ok(lessons.length > 10);
  for (const page of pages) {
    assert.ok(
      page.lines.reduce((height, line) => height + line.height, 0) <= 4.62 + 0.00001,
      'content stays above footer',
    );
    for (const line of page.lines)
      assert.ok(
        line.pieces.reduce((width, piece) => width + piece.width, 0) + line.indent <=
          (page.image ? 4.15 : 11.65) + 0.001,
        'line stays within its text column',
      );
  }
  const { text } = slideEntries(await createCourseDeck(pack));
  assert.ok(text.includes('LAST-CONTENT-SENTINEL'));
  assert.equal(
    (text.match(/\bmeaningful\b/g) || []).length,
    220,
    'every repeated sentence survives pagination',
  );
});

test('image input rejects URLs, traversal, external SVG references, disguised SVGs, and escaping symlinks', async () => {
  for (const src of [
    'https://example.com/private.png',
    '//example.com/image.svg',
    'data:image/svg+xml,<svg/>',
    'file:///tmp/image.png',
    '/../private.png',
    '/%2e%2e/private.png',
    '/images/%2f%2fhost.png',
    '/image.svg?url=secret',
    '/images\\outside.png',
    '/images/./image.svg',
  ]) {
    assert.equal(slideImageSchema.safeParse({ src, alt: 'Unsafe' }).success, false, src);
  }
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'mori-deck-images-'));
  const previous = process.env.MORI_PROJECT_PATH;
  process.env.MORI_PROJECT_PATH = temporary;
  try {
    await fs.mkdir(path.join(temporary, 'public', 'illustrations'), { recursive: true });
    const valid =
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><style>rect{fill:#587957}</style><defs><clipPath id="clip"><rect width="80" height="60"/></clipPath></defs><rect width="80" height="60" clip-path="url(#clip)"/></svg>';
    await fs.writeFile(path.join(temporary, 'public', 'illustrations', 'good.svg'), valid);
    assert.ok(
      (
        await loadDeckImage({ src: '/illustrations/good.svg', alt: 'Original diagram' })
      ).data.startsWith('image/png;base64,'),
    );
    const malicious =
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><image href="http://127.0.0.1:3000/private" width="80" height="60"/></svg>';
    await fs.writeFile(path.join(temporary, 'public', 'bad.svg'), malicious);
    await fs.writeFile(
      path.join(temporary, 'public', 'renamed.png'),
      `<?xml version="1.0"?>${' '.repeat(2_000)}${malicious}`,
    );
    await fs.writeFile(path.join(temporary, 'private.svg'), valid);
    await fs.symlink(
      path.join(temporary, 'private.svg'),
      path.join(temporary, 'public', 'escaping.svg'),
    );
    await assert.rejects(loadDeckImage({ src: '/bad.svg', alt: 'Unsafe' }), /internal fragments/);
    await assert.rejects(
      loadDeckImage({ src: '/renamed.png', alt: 'Unsafe' }),
      /internal fragments/,
    );
    await assert.rejects(loadDeckImage({ src: '/escaping.svg', alt: 'Unsafe' }), /symlinks/);
    await assert.rejects(loadDeckImage({ src: '/missing.svg', alt: 'Missing' }), /not found/);
  } finally {
    if (previous === undefined) delete process.env.MORI_PROJECT_PATH;
    else process.env.MORI_PROJECT_PATH = previous;
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('private uploaded image sources embed while text sources are rejected', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mori-deck-source-'));
  const previous = process.env.MORI_DATA_DIR;
  process.env.MORI_DATA_DIR = directory;
  try {
    const png = await sharp({
      create: { width: 24, height: 18, channels: 3, background: '#678762' },
    })
      .png()
      .toBuffer();
    const image = await saveFileSource('diagram.png', png);
    assert.ok(
      (await loadDeckImage({ src: `/api/sources/${image.id}`, alt: 'Source diagram' })).width > 0,
    );
    const text = await saveTextSource({ name: 'Notes', text: 'Source text remains text.' });
    await assert.rejects(
      loadDeckImage({ src: `/api/sources/${text.id}`, alt: 'Not an image' }),
      /uploaded image/,
    );
  } finally {
    if (previous === undefined) delete process.env.MORI_DATA_DIR;
    else process.env.MORI_DATA_DIR = previous;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('practice has distinct validated problems and image-only slides are meaningful', () => {
  const pack = example();
  assert.equal(courseSchema.safeParse(pack).success, true);
  const practice = pack.materials.find((material) => material.kind === 'practice')!;
  practice.problems = [];
  assert.equal(courseSchema.safeParse(pack).success, false);
  practice.problems = [{ id: 'p', prompt: 'Try it.', solution: '' }];
  assert.equal(courseSchema.safeParse(pack).success, false);
  practice.problems = [
    { id: 'p', prompt: 'Try it.', solution: 'The reasoning.' },
    { id: 'p', prompt: 'Try it again.', solution: 'More reasoning.' },
  ];
  assert.equal(courseSchema.safeParse(pack).success, false);
  pack.materials = [
    material('slides', {
      slides: [
        {
          title: 'A picture explains the mapping',
          body: '',
          image: { src: '/illustrations/function-map.svg', alt: 'One output for each input.' },
        },
      ],
    }),
  ];
  assert.equal(courseSchema.safeParse(pack).success, true);
});

test('export route returns a real downloadable PowerPoint and rejects unsupported formats and IDs', async () => {
  const response = await GET(
    new Request('http://localhost/api/courses/biology/export?format=pptx'),
    { params: Promise.resolve({ id: 'biology' }) },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-disposition'), 'attachment; filename="biology.pptx"');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.ok(slideEntries(new Uint8Array(await response.arrayBuffer())).slides.length > 5);
  assert.equal(
    (
      await GET(new Request('http://localhost/api/courses/biology/export?format=exe'), {
        params: Promise.resolve({ id: 'biology' }),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await GET(new Request('http://localhost/api/courses/missing/export'), {
        params: Promise.resolve({ id: 'missing' }),
      })
    ).status,
    404,
  );
});

test('CLI binary export requires an output file and preserves an existing export', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'mori-deck-cli-'));
  const output = path.join(temporary, 'study.pptx');
  const args = ['--import', 'tsx', 'scripts/mori.ts', 'export', 'biology', '--format', 'pptx'];
  try {
    await assert.rejects(exec(process.execPath, args), /requires --out/);
    await exec(process.execPath, [...args, '--out', output]);
    const before = await fs.readFile(output);
    assert.ok(slideEntries(before).slides.length > 5);
    await assert.rejects(exec(process.execPath, [...args, '--out', output]), /already exists/);
    assert.deepEqual(await fs.readFile(output), before);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
