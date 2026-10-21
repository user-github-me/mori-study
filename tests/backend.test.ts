import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { strToU8, zipSync } from 'fflate';
import { assertLocalWrite } from '../src/app/api/_utils';
import { demoWorkspace } from '../src/lib/demo';
import { extractText } from '../src/lib/extract';
import { courseSchema, idSchema } from '../src/lib/schema';
import {
  atomicCreate,
  createStudyRequest,
  getSourceAsset,
  getStudyRequest,
  getWorkspace,
  importCourse,
  inspectSource,
  recordPath,
  saveFileSource,
  saveTextSource,
  validateCourse,
} from '../src/lib/storage';
import type { Course } from '../src/lib/types';

const now = '2026-10-21T12:00:00.000Z';
function course(sourceId: string, id = 'my-course'): Course {
  return {
    schemaVersion: 1,
    id,
    title: 'Learning limits',
    description: 'A source-grounded summary.',
    subject: 'Mathematics',
    color: 'sage',
    icon: 'calculus',
    sourceIds: [sourceId],
    chapters: '2.1',
    createdAt: now,
    updatedAt: now,
    materials: [
      {
        id: `${id}-lesson`,
        kind: 'lesson',
        title: 'Limits',
        description: 'What a function approaches.',
        duration: 3,
        section: '2.1',
        citations: [{ sourceId, label: 'Class notes', section: '2.1' }],
        content: 'A limit describes the value a function approaches.',
      },
    ],
  };
}

test('schema rejects unsafe IDs, empty format payloads, invalid answers, and unlisted citations', () => {
  for (const id of ['../secret', '/tmp/file', 'a/b', '.', '', 'a\\b', 'a'.repeat(81)])
    assert.equal(idSchema.safeParse(id).success, false);
  const valid = course('source');
  assert.equal(courseSchema.safeParse(valid).success, true);
  const invalidQuiz = structuredClone(valid);
  invalidQuiz.materials[0] = {
    ...invalidQuiz.materials[0],
    kind: 'quiz',
    questions: [
      { id: 'q', prompt: 'Which?', options: ['A', 'B'], answer: 2, explanation: 'Reason.' },
    ],
  };
  assert.equal(courseSchema.safeParse(invalidQuiz).success, false);
  invalidQuiz.materials[0].questions![0].answer = 1;
  assert.equal(courseSchema.safeParse(invalidQuiz).success, true);
  invalidQuiz.materials[0].questions![0].options = ['Same', 'Same'];
  assert.equal(courseSchema.safeParse(invalidQuiz).success, false);
  const wrongKind = structuredClone(valid);
  wrongKind.materials[0].kind = 'slides';
  assert.equal(courseSchema.safeParse(wrongKind).success, false);
  const missingContent = structuredClone(valid);
  missingContent.materials[0].content = '   ';
  assert.equal(courseSchema.safeParse(missingContent).success, false);
  const badCitation = structuredClone(valid);
  badCitation.materials[0].citations[0].sourceId = 'not-listed';
  assert.equal(courseSchema.safeParse(badCitation).success, false);
  const scriptVideo = structuredClone(valid);
  scriptVideo.materials[0] = {
    ...scriptVideo.materials[0],
    kind: 'video',
    videoUrl: 'javascript:alert(1)',
    transcript: 'A limit.',
  };
  assert.equal(courseSchema.safeParse(scriptVideo).success, false);
});

test('all built-in courses have valid source references and unique material IDs', () => {
  const sourceIds = new Set(demoWorkspace.sources.map((source) => source.id));
  const materialIds = new Set<string>();
  for (const example of demoWorkspace.courses) {
    courseSchema.parse(example);
    for (const id of example.sourceIds) assert.ok(sourceIds.has(id));
    for (const material of example.materials) {
      assert.ok(!materialIds.has(material.id), `duplicate material ${material.id}`);
      materialIds.add(material.id);
    }
  }
});

test('write guard accepts local CLI/same-origin requests and rejects cross-site browser writes', () => {
  assert.doesNotThrow(() => assertLocalWrite(new Request('http://127.0.0.1:3000/api/courses')));
  assert.doesNotThrow(() =>
    assertLocalWrite(
      new Request('http://localhost:3000/api/courses', {
        headers: { origin: 'http://localhost:3000' },
      }),
    ),
  );
  const badHeaders: Record<string, string>[] = [
    { origin: 'https://evil.example' },
    { origin: 'null' },
    { 'sec-fetch-site': 'cross-site' },
  ];
  for (const headers of badHeaders) {
    assert.throws(
      () => assertLocalWrite(new Request('http://localhost:3000/api/courses', { headers })),
      /origin|site/,
    );
  }
  assert.throws(() => assertLocalWrite(new Request('http://example.com/api/courses')), /localhost/);
});

test('office extraction keeps text and page/slide context without interpreting external entities', async () => {
  const docx = zipSync({
    'word/document.xml': strToU8(
      '<?xml version="1.0"?><w:document xmlns:w="x"><w:body><w:p><w:r><w:t>Limits &amp; continuity</w:t></w:r></w:p><w:p><w:r><w:t>Second paragraph</w:t></w:r></w:p></w:body></w:document>',
    ),
  });
  assert.equal(await extractText(docx, 'notes.docx'), 'Limits & continuity\nSecond paragraph');
  const pptx = zipSync({
    'ppt/slides/slide2.xml': strToU8('<a:p><a:r><a:t>Continuity</a:t></a:r></a:p>'),
    'ppt/slides/slide1.xml': strToU8('<a:p><a:r><a:t>Limits</a:t></a:r></a:p>'),
  });
  assert.equal(
    await extractText(pptx, 'slides.pptx'),
    '[Slide 1]\nLimits\n\n[Slide 2]\nContinuity',
  );
  assert.equal(await extractText(new Uint8Array([1, 2, 3]), 'picture.png'), undefined);
});

function pdfFixture(text: string) {
  const stream = text ? `BT /F1 12 Tf 30 150 Td (${text}) Tj ET` : '';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let output = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(output));
}

test('PDF extraction labels physical pages and reports scans without pretending OCR succeeded', async () => {
  assert.match(
    (await extractText(pdfFixture('Calculus source text'), 'notes.pdf'))!,
    /\[Page 1\]\nCalculus source text/,
  );
  assert.match(
    (await extractText(pdfFixture(''), 'scan.pdf'))!,
    /no selectable text.*not performed OCR/,
  );
});

test('filesystem storage is durable, source-grounded, and never overwrites existing work', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'mori-backend-'));
  const previous = process.env.MORI_DATA_DIR;
  process.env.MORI_DATA_DIR = temporary;
  try {
    assert.throws(() => recordPath('courses', '../outside'));
    const atomic = path.join(temporary, 'race.txt');
    const contenders = await Promise.allSettled(
      Array.from({ length: 8 }, (_, index) => atomicCreate(atomic, `complete-${index}`)),
    );
    assert.equal(contenders.filter((result) => result.status === 'fulfilled').length, 1);
    assert.match(await fs.readFile(atomic, 'utf8'), /^complete-\d$/);
    assert.equal((await fs.readdir(temporary)).filter((name) => name.endsWith('.tmp')).length, 0);

    const source = await saveFileSource(
      'calculus.md',
      new TextEncoder().encode('# Limits\nA limit describes approach.'),
    );
    const asset = await getSourceAsset(source.id);
    assert.equal(Buffer.from(asset.body).toString(), '# Limits\nA limit describes approach.');
    assert.match((await inspectSource(source.id)).filePath!, /assets\/src-/);
    assert.equal(
      (await getWorkspace()).sources.some((item) => item.id === source.id),
      true,
    );
    const link = await saveTextSource({ url: 'https://example.org/calculus' });
    assert.match(link.text!, /has not fetched/);
    await assert.rejects(saveTextSource({ url: 'file:///etc/passwd' }), /HTTP/);

    const unknown = course('missing-source');
    await assert.rejects(validateCourse(unknown), /Unknown source/);
    const { request, agentPrompt } = await createStudyRequest({
      title: 'Study limits',
      prompt: 'Summarize section 2.1',
      sourceIds: [source.id],
      formats: ['lesson', 'quiz'],
      scope: '2.1',
      detail: 'brief',
    });
    assert.match(agentPrompt, new RegExp(request.id));
    await assert.rejects(
      importCourse(course(source.id), request.id),
      /missing requested formats: quiz/,
    );
    assert.equal((await getStudyRequest(request.id))?.status, 'pending');
    assert.equal(
      (await getWorkspace()).courses.some((item) => item.id === 'my-course'),
      false,
    );

    const generated = course(source.id);
    generated.materials.push({
      id: 'my-course-quiz',
      kind: 'quiz',
      title: 'Check your understanding',
      description: 'One retrieval question.',
      duration: 2,
      section: '2.1',
      citations: [{ sourceId: source.id, label: 'Calculus notes', section: '2.1' }],
      questions: [
        {
          id: 'q1',
          prompt: 'A limit describes…',
          options: ['What a function approaches', 'Always the defined value'],
          answer: 0,
          explanation: 'A nearby approach need not equal the value at the point.',
        },
      ],
    });
    await importCourse(generated, request.id);
    assert.deepEqual(
      (await getWorkspace()).courses.find((item) => item.id === generated.id),
      generated,
    );
    assert.equal((await getStudyRequest(request.id))?.status, 'completed');
    assert.equal((await getStudyRequest(request.id))?.courseId, generated.id);
    const before = await fs.readFile(recordPath('courses', generated.id), 'utf8');
    await assert.rejects(
      importCourse({ ...generated, title: 'Must never replace original' }),
      /already exists/,
    );
    assert.equal(await fs.readFile(recordPath('courses', generated.id), 'utf8'), before);
    await assert.rejects(
      importCourse({ ...generated, id: 'duplicate-materials' }),
      /unique across the workspace/,
    );
    await assert.rejects(
      importCourse(course(source.id, 'another-course'), request.id),
      /already completed/,
    );

    // A fresh read uses disk records, not mutable process state.
    generated.title = 'Changed only in memory';
    assert.equal(
      (await getWorkspace()).courses.find((item) => item.id === 'my-course')?.title,
      'Learning limits',
    );
    await fs.writeFile(path.join(temporary, 'courses', 'damaged.json'), '{invalid');
    await assert.rejects(getWorkspace(), /file is preserved/);
    assert.equal(
      await fs.readFile(path.join(temporary, 'courses', 'damaged.json'), 'utf8'),
      '{invalid',
    );
  } finally {
    if (previous === undefined) delete process.env.MORI_DATA_DIR;
    else process.env.MORI_DATA_DIR = previous;
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
