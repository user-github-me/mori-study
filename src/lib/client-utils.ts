import type { Course, Material, Progress } from './types';

export const emptyProgress: Progress = {
  completed: [],
  quizScores: {},
  reviewedCards: {},
  activity: {},
  studyMinutes: 0,
};
export function parseProgress(value: unknown): Progress {
  const record = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === 'object' && !Array.isArray(v);
  const strings = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((id) => typeof id === 'string');
  if (
    !record(value) ||
    !strings(value.completed) ||
    !record(value.quizScores) ||
    !record(value.reviewedCards) ||
    !record(value.activity) ||
    typeof value.studyMinutes !== 'number' ||
    !Number.isFinite(value.studyMinutes) ||
    value.studyMinutes < 0 ||
    (value.lastMaterialId !== undefined && typeof value.lastMaterialId !== 'string')
  )
    throw new Error('This is not a valid Mori progress backup.');
  for (const q of Object.values(value.quizScores))
    if (
      !record(q) ||
      typeof q.score !== 'number' ||
      typeof q.total !== 'number' ||
      !Number.isInteger(q.score) ||
      !Number.isInteger(q.total) ||
      q.total <= 0 ||
      q.score < 0 ||
      q.score > q.total
    )
      throw new Error('This backup contains an invalid quiz score.');
  if (
    !Object.values(value.reviewedCards).every(strings) ||
    !Object.values(value.activity).every(
      (v) => typeof v === 'number' && Number.isInteger(v) && v >= 0,
    )
  )
    throw new Error('This backup contains invalid learning progress.');
  return {
    completed: [...new Set(value.completed)],
    quizScores: value.quizScores as Progress['quizScores'],
    reviewedCards: Object.fromEntries(
      Object.entries(value.reviewedCards).map(([id, cards]) => [
        id,
        [...new Set(cards as string[])],
      ]),
    ),
    activity: value.activity as Progress['activity'],
    studyMinutes: value.studyMinutes,
    ...(value.lastMaterialId ? { lastMaterialId: value.lastMaterialId as string } : {}),
  };
}
export const kindLabels = {
  lesson: 'Lesson',
  slides: 'Slides',
  quiz: 'Quiz',
  practice: 'Practice',
  flashcards: 'Flashcards',
  video: 'Video',
};
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function percent(course: Course, progress: Progress) {
  return Math.round(
    (course.materials.filter((m) => progress.completed.includes(m.id)).length /
      Math.max(1, course.materials.length)) *
      100,
  );
}
export function download(filename: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function materialMarkdown(material: Material) {
  const parts = [`## ${material.title}`, material.description];
  if (material.content) parts.push(material.content);
  material.slides?.forEach((s, i) =>
    parts.push(
      `### ${i + 1}. ${s.title}\n\n${s.body}\n\n${s.bullets?.map((b) => `- ${b}`).join('\n') || ''}\n\n${s.formula ? `$$\n${s.formula}\n$$` : ''}${s.image ? `\n\n![${s.image.alt}](${s.image.src})${s.image.caption ? `\n\n${s.image.caption}` : ''}` : ''}${s.notes ? `\n\nSpeaker notes: ${s.notes}` : ''}`,
    ),
  );
  material.questions?.forEach((q, i) =>
    parts.push(
      `### Question ${i + 1}\n\n${q.prompt}\n\n${q.options.map((o, j) => `${j + 1}. ${o}`).join('\n')}\n\n**Answer: ${q.answer + 1}. ${q.options[q.answer]}**\n\n${q.explanation}`,
    ),
  );
  material.problems?.forEach((p, i) =>
    parts.push(
      `### Practice ${i + 1}\n\n${p.prompt}${p.hint ? `\n\n**Hint:** ${p.hint}` : ''}\n\n**Worked solution**\n\n${p.solution}`,
    ),
  );
  material.cards?.forEach((c) => parts.push(`**${c.front}**\n\n${c.back}`));
  if (material.transcript) parts.push(`### Transcript\n\n${material.transcript}`);
  if (material.videoUrl) parts.push(`Video: ${material.videoUrl}`);
  if (material.citations.length)
    parts.push(
      '### Sources\n\n' +
        material.citations
          .map(
            (c) =>
              `- ${c.label}${c.section ? `, ${c.section}` : ''}${c.page ? `, p. ${c.page}` : ''}`,
          )
          .join('\n'),
    );
  return parts.join('\n\n');
}
export function courseMarkdown(course: Course) {
  return `# ${course.title}\n\n${course.description}\n\n${course.materials.map(materialMarkdown).join('\n\n---\n\n')}`;
}
export function exportCards(course: Course) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = course.materials.flatMap((m) =>
    (m.cards || []).map((c) => [c.front, c.back].map(quote).join(',')),
  );
  download(`${course.id}-flashcards.csv`, 'Front,Back\r\n' + rows.join('\r\n'), 'text/csv');
}
export async function jsonRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      typeof result.error === 'string' ? result.error : 'Something went wrong. Please try again.',
    );
  return result as T;
}

export async function downloadSlideDeck(courseId: string) {
  const response = await fetch(`/api/courses/${encodeURIComponent(courseId)}/export?format=pptx`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'The slide deck could not be exported. Please try again.');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `${courseId}.pptx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
