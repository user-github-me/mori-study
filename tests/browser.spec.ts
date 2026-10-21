import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { expect, test, type Download, type Page } from '@playwright/test';
import { demoWorkspace } from '../src/lib/demo';
import type { Course, Material, Progress, Source, StudyRequest, Workspace } from '../src/lib/types';

const calculus = demoWorkspace.courses.find((course) => course.id === 'calculus')!;
const lesson = calculus.materials.find((material) => material.kind === 'lesson')!;
const slides = calculus.materials.find((material) => material.kind === 'slides')!;
const flashcards = calculus.materials.find((material) => material.kind === 'flashcards')!;
const quizzes = calculus.materials.filter((material) => material.kind === 'quiz');
const escapeRegex = (value: string) =>
  value
    .split('')
    .map((char) =>
      (String.fromCharCode(92) + '.*+?^$()[]{}|').includes(char)
        ? String.fromCharCode(92) + char
        : char,
    )
    .join('');

async function openCourse(page: Page, course = calculus) {
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: /My study sets/ })
    .click();
  await page.getByRole('button', { name: `Open ${course.title}`, exact: true }).click();
  await expect(
    page.getByRole('heading', { name: course.title, exact: true, level: 1 }),
  ).toBeVisible();
}

async function openMaterial(page: Page, material: Material) {
  await page
    .locator('.materials-list')
    .getByRole('button', { name: new RegExp(escapeRegex(material.title)) })
    .click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: material.title, exact: true }),
  ).toBeVisible();
}

async function savedProgress(page: Page): Promise<Progress> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('mori-progress-v1') || '{}'));
}

async function downloadText(download: Download) {
  const filename = await download.path();
  expect(filename).not.toBeNull();
  return fs.readFile(filename!, 'utf8');
}

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport + 1);
}

let pageErrors: string[];
test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/workspace');
  await expect(page.getByRole('button', { name: 'New study set', exact: true })).toBeVisible();
});
test.afterEach(() => {
  expect(pageErrors, 'No uncaught browser errors').toEqual([]);
});

test('lesson completion survives a reload and appears in course progress', async ({ page }) => {
  await openCourse(page);
  await openMaterial(page, lesson);
  await expect(page.getByRole('dialog').locator('.lesson-body .katex').first()).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Mark complete', exact: true })
    .click();
  await expect.poll(async () => (await savedProgress(page)).completed).toContain(lesson.id);
  await expect.poll(async () => (await savedProgress(page)).studyMinutes).toBe(lesson.duration);
  await page.reload();
  await openCourse(page);
  const row = page
    .locator('.materials-list')
    .getByRole('button', { name: new RegExp(escapeRegex(lesson.title)) });
  await expect(row.locator('.complete-check')).toBeVisible();
  await openMaterial(page, lesson);
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Mark complete', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Keep learning', exact: true }),
  ).toBeVisible();
});

test('slides navigate with buttons and keyboard, and finish at the final slide', async ({
  page,
}) => {
  await openCourse(page);
  await openMaterial(page, slides);
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: slides.slides![0].title, exact: true }),
  ).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(
    dialog.getByRole('heading', { name: slides.slides![1].title, exact: true }),
  ).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(
    dialog.getByRole('heading', { name: slides.slides![2].title, exact: true }),
  ).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(
    dialog.getByRole('heading', { name: slides.slides![1].title, exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole('button', { name: `Go to slide ${slides.slides!.length}`, exact: true })
    .click();
  await expect(dialog.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Mark complete', exact: true }).click();
  await expect.poll(async () => (await savedProgress(page)).completed).toContain(slides.id);
});

test('complete every calculus quiz and persist real scores, including an incorrect answer', async ({
  page,
}) => {
  await openCourse(page);
  for (const quiz of quizzes) {
    await openMaterial(page, quiz);
    const dialog = page.getByRole('dialog');
    const questions = quiz.questions!;
    for (const [index, question] of questions.entries()) {
      await expect(
        dialog.getByText(`Question ${index + 1} of ${questions.length}`, { exact: true }),
      ).toBeVisible();
      await expect(
        dialog.getByRole('button', { name: 'Check answer', exact: true }),
      ).toBeDisabled();
      const answer =
        index === 0 ? (question.answer + 1) % question.options.length : question.answer;
      await dialog.locator('.answer-options').getByRole('button').nth(answer).click();
      await dialog.getByRole('button', { name: 'Check answer', exact: true }).click();
      await expect(dialog.locator('.answer-explanation')).toBeVisible();
      await expect(dialog.locator('.answer-option.correct')).toHaveCount(1);
      if (index === 0) await expect(dialog.locator('.answer-option.incorrect')).toHaveCount(1);
      await dialog
        .getByRole('button', {
          name: index === questions.length - 1 ? 'See results' : 'Next question',
          exact: true,
        })
        .click();
    }
    const score = questions.length - 1;
    await expect(dialog.locator('.result-panel')).toContainText(`${score} of ${questions.length}`);
    await expect
      .poll(async () => (await savedProgress(page)).quizScores[quiz.id])
      .toEqual({ score, total: questions.length });
    await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  }
  await page.reload();
  for (const quiz of quizzes) {
    expect((await savedProgress(page)).completed).toContain(quiz.id);
    expect((await savedProgress(page)).quizScores[quiz.id]).toEqual({
      score: quiz.questions!.length - 1,
      total: quiz.questions!.length,
    });
  }
});

test('flashcards repeat an uncertain card and persist all understood cards', async ({ page }) => {
  await openCourse(page);
  await openMaterial(page, flashcards);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Reveal answer', exact: true }).click();
  await dialog.getByRole('button', { name: 'Study again', exact: true }).click();
  expect((await savedProgress(page)).completed).not.toContain(flashcards.id);
  for (let index = 0; index < flashcards.cards!.length; index++) {
    await dialog.getByRole('button', { name: 'Reveal answer', exact: true }).click();
    await dialog.getByRole('button', { name: 'Got it', exact: true }).click();
  }
  await expect(dialog.locator('.result-panel')).toContainText(
    `all ${flashcards.cards!.length} flashcards`,
  );
  await expect
    .poll(async () => (await savedProgress(page)).reviewedCards[flashcards.id]?.length)
    .toBe(flashcards.cards!.length);
  await expect.poll(async () => (await savedProgress(page)).completed).toContain(flashcards.id);
  await page.reload();
  expect((await savedProgress(page)).reviewedCards[flashcards.id]).toHaveLength(
    flashcards.cards!.length,
  );
});

test('a study request with an empty optional prompt creates a genuine agent handoff', async ({
  page,
  request,
}) => {
  const title = `Browser request ${randomUUID().slice(0, 8)}`;
  const source = demoWorkspace.sources.find((item) => calculus.sourceIds.includes(item.id))!;
  await page.getByRole('button', { name: 'New study set', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Give your study set a name').fill(title);
  await dialog.getByRole('button', { name: source.name, exact: true }).click();
  await dialog.getByLabel(/Focus on/).fill('Chapters 1–2.3');
  await expect(dialog.getByLabel('Anything your agent should know?')).toHaveValue('');
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/requests') && response.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Create study request', exact: false }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const result: { request: StudyRequest; agentPrompt: string } = await response.json();
  expect(result.request.status).toBe('pending');
  expect(result.request.prompt.length).toBeGreaterThan(0);
  expect(result.request.sourceIds).toEqual([source.id]);
  expect(result.agentPrompt).toContain(result.request.id);
  await expect(dialog.locator('.handoff-code')).toContainText(result.request.id);
  await expect(dialog).toContainText('does not generate in the background');
  await dialog.getByRole('button', { name: 'Back to my study space', exact: true }).click();
  await expect(page.locator('.pending-request').filter({ hasText: title })).toBeVisible();
  const persisted = await request.get(`/api/requests/${result.request.id}`);
  expect((await persisted.json()).request.status).toBe('pending');
});

test('upload notes and a real file, import a source-grounded course, and download its JSON', async ({
  page,
  request,
}) => {
  const token = randomUUID().slice(0, 8);
  const noteTitle = `Function notes ${token}`;
  const fileTitle = `practice-${token}.md`;
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Sources', exact: true })
    .click();
  await page.getByRole('button', { name: 'Add sources', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Note title').fill(noteTitle);
  await dialog
    .getByLabel('Note content')
    .fill('A function maps every allowed input to exactly one output.');
  const noteResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/sources') && response.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Add notes', exact: true }).click();
  const note: Source = (await (await noteResponse).json()).sources[0];
  await expect(page.getByRole('link', { name: new RegExp(escapeRegex(noteTitle)) })).toBeVisible();
  await page.getByRole('button', { name: 'Add sources', exact: true }).click();
  dialog = page.getByRole('dialog');
  const fileResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/sources') && response.request().method() === 'POST',
  );
  await dialog.locator('input[type="file"]').setInputFiles({
    name: fileTitle,
    mimeType: 'text/markdown',
    buffer: Buffer.from('# A worked example\nFor f(x) = x², f(3) = 9.'),
  });
  const source: Source = (await (await fileResponse).json()).sources[0];
  await expect(page.getByRole('link', { name: new RegExp(escapeRegex(fileTitle)) })).toBeVisible();
  expect(await (await request.get(source.url)).text()).toContain('f(3) = 9');

  const now = new Date().toISOString();
  const id = `browser-course-${token}`;
  const course: Course = {
    schemaVersion: 1,
    id,
    title: `Functions from my sources ${token}`,
    description: 'A browser test study pack built from the two uploaded sources.',
    subject: 'Mathematics',
    color: 'sage',
    icon: 'calculus',
    chapters: 'Functions',
    sourceIds: [note.id, source.id],
    createdAt: now,
    updatedAt: now,
    materials: [
      {
        id: `${id}-lesson`,
        kind: 'lesson',
        title: 'One input, one output',
        description: 'The definition and a small example.',
        section: 'Functions',
        duration: 2,
        citations: [
          { sourceId: note.id, label: noteTitle },
          { sourceId: source.id, label: fileTitle },
        ],
        content:
          'A function maps every allowed input to exactly one output.\n\nFor $f(x)=x^2$, $f(3)=9$.',
      },
    ],
  };
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: /My study sets/ })
    .click();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import study pack', exact: true }).click();
  const importResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/courses') && response.request().method() === 'POST',
  );
  await (
    await chooserPromise
  ).setFiles({
    name: `${id}.json`,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(course)),
  });
  expect((await importResponse).status()).toBe(201);
  await expect(
    page.getByRole('button', { name: `Open ${course.title}`, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: `Open ${course.title}`, exact: true }).click();
  await openMaterial(page, course.materials[0]);
  await expect(page.getByRole('dialog').locator('.source-citations')).toContainText(noteTitle);
  await page.getByRole('dialog').getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Export study set', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Mori Study pack/ })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`${id}.json`);
  expect(JSON.parse(await downloadText(download))).toEqual(course);
  await page.reload();
  const workspace: Workspace = await (await request.get('/api/workspace')).json();
  expect(workspace.courses.some((item) => item.id === id)).toBe(true);
});

test('Markdown export and print contain readable quiz answers without raw details tags', async ({
  page,
}) => {
  await openCourse(page);
  await page.getByRole('button', { name: 'Export study set', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Markdown notes/ })
    .click();
  const markdown = await downloadText(await downloadPromise);
  expect(markdown).not.toMatch(/<\/?(?:details|summary)\b/i);
  expect(markdown).toContain(quizzes[0].questions![0].explanation);
  await page.getByRole('dialog').getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  const print = page.locator('.print-course');
  await expect(print).toBeVisible();
  await expect(print).toContainText('Answer');
  await expect(print).not.toContainText('<details>');
  await expect(print).not.toContainText('<summary>');
  await expect(print.locator('details, summary')).toHaveCount(0);
  await expect(print).toContainText(quizzes[0].questions![0].explanation.replace(/\$+/g, ''));
});

test('mobile navigation, course and study dialog fit within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Sources', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Add sources', exact: true })).toBeVisible();
  await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar-open/);
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await openCourse(page);
  await expectNoHorizontalOverflow(page);
  await openMaterial(page, slides);
  await expectNoHorizontalOverflow(page);
  const box = await page.getByRole('dialog').boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(391);
  await page.getByRole('dialog').getByRole('button', { name: 'Next', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: slides.slides![1].title, exact: true }),
  ).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'My progress', exact: true })
    .click();
  await expect(page.locator('.stats-grid')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

async function openReader(page: Page) {
  await page.goto(`/?course=${calculus.id}`);
  await expect(page.locator('.embedded-viewer')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

async function chooseReaderMaterial(page: Page, material: Material) {
  await page
    .getByRole('navigation', { name: 'Lesson contents' })
    .getByRole('button', { name: new RegExp(escapeRegex(material.title)) })
    .click();
  await expect(
    page.locator('.embedded-viewer').getByRole('heading', { name: material.title, exact: true }),
  ).toBeVisible();
}

test('the personal reader opens directly into a lesson with a clear next step', async ({
  page,
}) => {
  await openReader(page);
  const reader = page.locator('.embedded-viewer');
  await expect(reader.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible();
  await expect(reader.locator('.session-save-status')).toHaveText('Saved on this device');
  await reader.getByRole('button', { name: 'Next lesson', exact: true }).click();
  await expect(reader.getByRole('heading', { name: slides.title, exact: true })).toBeVisible();
  expect((await savedProgress(page)).completed).not.toContain(lesson.id);
  await expect(reader.getByRole('button', { name: 'Check this topic', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Study navigation' })
    .getByRole('button', { name: 'Practice', exact: true })
    .click();
  await expect(page.locator('.reader-practice-list')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the reader restores the exact slide and flipped flashcard after reloading', async ({
  page,
}) => {
  await openReader(page);
  await chooseReaderMaterial(page, slides);
  let reader = page.locator('.embedded-viewer');
  await reader.getByRole('button', { name: 'Go to slide 3', exact: true }).click();
  await expect(
    reader.getByRole('heading', { name: slides.slides![2].title, exact: true }),
  ).toBeVisible();
  await page.reload();
  reader = page.locator('.embedded-viewer');
  await expect(reader.getByRole('heading', { name: slides.title, exact: true })).toBeVisible();
  await expect(reader.getByRole('button', { name: 'Go to slide 3', exact: true })).toHaveAttribute(
    'aria-current',
    'step',
  );
  await chooseReaderMaterial(page, flashcards);
  await reader.getByRole('button', { name: 'Reveal answer', exact: true }).click();
  await reader.getByRole('button', { name: 'Got it', exact: true }).click();
  await reader.getByRole('button', { name: 'Reveal answer', exact: true }).click();
  await expect(reader.getByRole('button', { name: 'Show question', exact: true })).toBeVisible();
  await page.reload();
  await expect(reader.getByRole('heading', { name: flashcards.title, exact: true })).toBeVisible();
  await expect(reader.getByRole('button', { name: 'Show question', exact: true })).toBeVisible();
  await expect(reader.locator('.question-status')).toContainText(
    `1 of ${flashcards.cards!.length} understood`,
  );
  await expect(reader.locator('.flashcard')).toContainText(
    flashcards.cards![1].back.replace(/\$+/g, ''),
  );
});

test('quiz drafts, checked answers and results resume, while a retake starts cleanly', async ({
  page,
}) => {
  await openReader(page);
  const quiz = quizzes[0];
  const questions = quiz.questions!;
  await chooseReaderMaterial(page, quiz);
  const reader = page.locator('.embedded-viewer');
  await reader.locator('.answer-options').getByRole('button').nth(questions[0].answer).click();
  await page.reload();
  await expect(
    reader.locator('.answer-options').getByRole('button').nth(questions[0].answer),
  ).toHaveAttribute('aria-pressed', 'true');
  await reader.getByRole('button', { name: 'Check answer', exact: true }).click();
  await reader.getByRole('button', { name: 'Next question', exact: true }).click();
  const wrong = (questions[1].answer + 1) % questions[1].options.length;
  await reader.locator('.answer-options').getByRole('button').nth(wrong).click();
  await reader.getByRole('button', { name: 'Check answer', exact: true }).click();
  await page.reload();
  await expect(
    reader.getByText(`Question 2 of ${questions.length}`, { exact: true }),
  ).toBeVisible();
  await expect(reader.locator('.answer-option.incorrect')).toHaveCount(1);
  await expect(reader.locator('.answer-explanation')).toBeVisible();
  await reader.getByRole('button', { name: 'Next question', exact: true }).click();
  for (let index = 2; index < questions.length; index++) {
    await reader
      .locator('.answer-options')
      .getByRole('button')
      .nth(questions[index].answer)
      .click();
    await reader.getByRole('button', { name: 'Check answer', exact: true }).click();
    await reader
      .getByRole('button', {
        name: index === questions.length - 1 ? 'See results' : 'Next question',
        exact: true,
      })
      .click();
  }
  await expect(reader.locator('.result-panel')).toContainText(
    `${questions.length - 1} of ${questions.length}`,
  );
  await reader.getByRole('button', { name: 'Review lesson', exact: true }).click();
  await expect(reader.getByRole('heading', { name: slides.title, exact: true })).toBeVisible();
  await chooseReaderMaterial(page, quiz);
  await expect(reader.locator('.result-panel')).toContainText(
    `${questions.length - 1} of ${questions.length}`,
  );
  await reader.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.reload();
  await expect(
    reader.getByText(`Question 1 of ${questions.length}`, { exact: true }),
  ).toBeVisible();
  await expect(reader.getByRole('button', { name: 'Check answer', exact: true })).toBeDisabled();
  await expect(reader.locator('.result-panel')).toHaveCount(0);
  await page.evaluate(
    (id) =>
      localStorage.setItem(
        `mori-study-session:${id}`,
        JSON.stringify({
          version: 1,
          kind: 'quiz',
          question: 9999,
          choice: -1,
          checked: true,
          score: 9999,
          finished: true,
        }),
      ),
    quiz.id,
  );
  await page.reload();
  await expect(
    reader.getByText(`Question 1 of ${questions.length}`, { exact: true }),
  ).toBeVisible();
  await expect(reader.getByRole('button', { name: 'Check answer', exact: true })).toBeDisabled();
});

test('the mobile reader switches topics without opening dialogs or overflowing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openReader(page);
  await expectNoHorizontalOverflow(page);
  await page.getByLabel('Jump to a lesson').selectOption(slides.id);
  const reader = page.locator('.embedded-viewer');
  await expect(reader.getByRole('heading', { name: slides.title, exact: true })).toBeVisible();
  await reader.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(
    reader.getByRole('heading', { name: slides.slides![1].title, exact: true }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page
    .getByRole('navigation', { name: 'Study navigation' })
    .getByRole('button', { name: 'My progress', exact: true })
    .click();
  await expect(page.locator('.reader-continue')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('exports the complete study pack as a real PowerPoint deck with pictures', async ({
  page,
}) => {
  test.setTimeout(90000);
  await openReader(page);
  await page.getByRole('button', { name: 'Download study pack', exact: true }).click();
  const downloadable = page.waitForEvent('download');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /PowerPoint deck/ })
    .click();
  const download = await downloadable;
  expect(download.suggestedFilename()).toBe('calculus.pptx');
  const contents = unzipSync(new Uint8Array(await fs.readFile((await download.path())!)));
  expect(contents['ppt/presentation.xml']).toBeTruthy();
  const slideFiles = Object.keys(contents).filter((name) =>
    /^ppt\/slides\/slide[0-9]+\.xml$/.test(name),
  );
  expect(slideFiles.length).toBeGreaterThan(calculus.materials.length);
  expect(Object.keys(contents).some((name) => name.startsWith('ppt/media/'))).toBe(true);
  const text = slideFiles.map((name) => new TextDecoder().decode(contents[name])).join(' ');
  expect(text).toContain('Functions');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
});

test('written practice keeps scratchwork and completes only after explicit self-checks', async ({
  page,
}) => {
  const practice = calculus.materials.find((material) => material.kind === 'practice')!;
  expect(practice).toBeTruthy();
  await page.goto('/?course=calculus');
  await page
    .getByRole('navigation', { name: 'Lesson contents' })
    .getByRole('button', { name: new RegExp(escapeRegex(practice.title)) })
    .click();
  const player = page.getByRole('region', { name: 'Worked practice problems' });
  await player
    .getByRole('textbox')
    .fill('I will compare the change in output with the change in input.');
  await player.getByRole('button', { name: 'Show a hint', exact: true }).click();
  await player.getByRole('button', { name: 'Show worked solution', exact: true }).click();
  expect((await savedProgress(page)).completed).not.toContain(practice.id);
  await page.reload();
  await expect(player.getByRole('textbox')).toHaveValue(
    'I will compare the change in output with the change in input.',
  );
  await expect(player.getByRole('region', { name: 'Worked solution' })).toBeVisible();
  await player.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(player.getByRole('region', { name: 'Worked solution' })).toHaveCount(0);
  expect((await savedProgress(page)).completed).not.toContain(practice.id);
  for (let index = 0; index < practice.problems!.length; index++) {
    if (index > 0)
      await player.getByRole('button', { name: `Problem ${index + 1}`, exact: true }).click();
    await player.getByRole('button', { name: 'Show worked solution', exact: true }).click();
    await expect(player.locator('.practice-solution .katex').first()).toBeVisible();
    await player.getByRole('button', { name: 'I understand this', exact: true }).click();
  }
  await expect.poll(async () => (await savedProgress(page)).completed).toContain(practice.id);
  expect((await savedProgress(page)).quizScores[practice.id]).toBeUndefined();
  await page.reload();
  await expect(player).toContainText(
    `You marked all ${practice.problems!.length} problems as understood.`,
  );
});
