import { z } from 'zod';

/** IDs become filenames. Keep the same rules at every input boundary. */
export const idSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/,
    'Use 1–80 letters, numbers, hyphens, or underscores for IDs.',
  );
const text = (max = 20_000) => z.string().trim().min(1).max(max);
const unique = (values: string[]) => new Set(values).size === values.length;

export const materialKindSchema = z.enum([
  'lesson',
  'slides',
  'quiz',
  'practice',
  'flashcards',
  'video',
]);
export const citationSchema = z.object({
  sourceId: idSchema,
  label: text(300),
  page: z.number().int().positive().optional(),
  section: text(300).optional(),
});
/** Deck exports read local assets only; never fetch user-provided URLs. */
export const slideImageSchema = z.object({
  src: text(2_000).refine((value) => {
    try {
      const decoded = decodeURIComponent(value);
      if (
        !decoded.startsWith('/') ||
        decoded.includes('//') ||
        /[\\\\\u0000-\u001f?#]/.test(decoded)
      )
        return false;
      if (decoded.split('/').some((part) => part === '..' || part === '.')) return false;
      return (
        /^\/api\/sources\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(decoded) ||
        /\.(svg|png|jpe?g|webp|gif)$/i.test(decoded)
      );
    } catch {
      return false;
    }
  }, 'Use a local /illustrations/image.svg (PNG, JPEG, WebP, GIF also supported) or /api/sources/<image-source-id>.'),
  alt: text(2_000),
  caption: text(3_000).optional(),
});
export const slideSchema = z
  .object({
    title: text(300),
    body: z.string().max(30_000),
    bullets: z.array(text(5_000)).max(30).optional(),
    formula: text(3_000).optional(),
    notes: z.string().max(30_000).optional(),
    image: slideImageSchema.optional(),
  })
  .refine(
    (slide) => Boolean(slide.body.trim() || slide.bullets?.length || slide.formula || slide.image),
    {
      message: 'A slide needs a body, bullets, a formula, or an image.',
    },
  );
export const questionSchema = z
  .object({
    id: idSchema,
    prompt: text(10_000),
    options: z.array(text(5_000)).min(2).max(8),
    answer: z.number().int().min(0),
    explanation: text(20_000),
  })
  .superRefine((question, ctx) => {
    if (question.answer >= question.options.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['answer'],
        message: 'answer must be a zero-based index into options.',
      });
    }
    if (!unique(question.options)) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Answer options must be distinct.',
      });
    }
  });
export const cardSchema = z.object({ id: idSchema, front: text(20_000), back: text(30_000) });
export const practiceProblemSchema = z.object({
  id: idSchema,
  prompt: text(20_000),
  hint: text(20_000).optional(),
  solution: text(30_000),
});

const playableUrlSchema = text(2_000).refine((value) => {
  try {
    if (value.startsWith('/') && !value.startsWith('//')) {
      return !decodeURIComponent(value).split(/[/?#]/).includes('..') && !value.includes('\\');
    }
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, 'Use an HTTP(S) video URL or an absolute local path such as /videos/lesson.mp4.');

export const materialSchema = z
  .object({
    id: idSchema,
    kind: materialKindSchema,
    title: text(300),
    description: text(3_000),
    duration: z.number().positive().max(600),
    section: text(300),
    citations: z.array(citationSchema).min(1).max(100),
    content: z.string().max(500_000).optional(),
    slides: z.array(slideSchema).max(200).optional(),
    questions: z.array(questionSchema).max(200).optional(),
    problems: z.array(practiceProblemSchema).max(200).optional(),
    cards: z.array(cardSchema).max(500).optional(),
    videoUrl: playableUrlSchema.optional(),
    transcript: z.string().max(500_000).optional(),
  })
  .superRefine((material, ctx) => {
    const required = {
      lesson: 'content',
      slides: 'slides',
      quiz: 'questions',
      practice: 'problems',
      flashcards: 'cards',
      video: 'videoUrl',
    } as const;
    const key = required[material.kind];
    const value = material[key];
    if (!value || (typeof value === 'string' ? !value.trim() : !value.length)) {
      ctx.addIssue({
        code: 'custom',
        path: [key],
        message: `${material.kind} requires nonempty ${key}.`,
      });
    }
    if (material.kind === 'video' && !material.transcript?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['transcript'],
        message: 'A video needs an accessible transcript.',
      });
    }
    for (const group of ['questions', 'problems', 'cards'] as const) {
      const items = material[group];
      if (items && !unique(items.map((item) => item.id))) {
        ctx.addIssue({
          code: 'custom',
          path: [group],
          message: `${group} IDs must be unique within a material.`,
        });
      }
    }
  });

export const courseSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    title: text(300),
    description: text(5_000),
    subject: text(100),
    color: z.enum(['sage', 'peach', 'lavender', 'blue']),
    icon: z.enum(['calculus', 'biology', 'physics', 'book']),
    sourceIds: z.array(idSchema).min(1).max(100).refine(unique, 'Source IDs must be unique.'),
    chapters: text(300),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    materials: z.array(materialSchema).min(1).max(300),
  })
  .superRefine((course, ctx) => {
    if (!unique(course.materials.map((material) => material.id))) {
      ctx.addIssue({
        code: 'custom',
        path: ['materials'],
        message: 'Material IDs must be unique within a course.',
      });
    }
    course.materials.forEach((material, index) => {
      material.citations.forEach((citation, citationIndex) => {
        if (!course.sourceIds.includes(citation.sourceId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['materials', index, 'citations', citationIndex, 'sourceId'],
            message: 'Citation sourceId must appear in course.sourceIds.',
          });
        }
      });
    });
  });

export const studyRequestInputSchema = z.object({
  title: text(300),
  prompt: text(30_000),
  sourceIds: z.array(idSchema).min(1).max(100).refine(unique, 'Source IDs must be unique.'),
  formats: z.array(materialKindSchema).min(1).max(6).refine(unique, 'Formats must be unique.'),
  scope: z.string().trim().max(1_000).default(''),
  detail: z.enum(['brief', 'balanced', 'detailed']).default('balanced'),
});

export const courseImportSchema = z.union([
  courseSchema.transform((course) => ({ course, requestId: undefined as string | undefined })),
  z.object({ course: courseSchema, requestId: idSchema.optional() }),
]);

export function validationMessage(error: z.ZodError): string {
  return error.issues
    .slice(0, 8)
    .map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
    .join('\n');
}
