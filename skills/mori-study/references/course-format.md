# Course format

Read `src/lib/types.ts` and `src/lib/schema.ts` in the Mori Study project when available; they define the current TypeScript contract and validation. `npm run mori-study -- validate course.json` is the final structural check.

Write one UTF-8 JSON object (not a fenced code block or JavaScript export):

```json
{
  "schemaVersion": 1,
  "id": "calculus-ch1-revision1",
  "title": "A first look at limits",
  "description": "A brief study guide to section 1.3.",
  "subject": "Mathematics",
  "color": "sage",
  "icon": "calculus",
  "sourceIds": ["calculus-notes"],
  "chapters": "1.3",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "materials": [
    {
      "id": "calculus-ch1-revision1-lesson",
      "kind": "lesson",
      "title": "Approaching a value",
      "description": "What a limit tells us.",
      "duration": 3,
      "section": "1.3",
      "citations": [
        {
          "sourceId": "calculus-notes",
          "label": "Original calculus example notes",
          "section": "1.3 Limits and continuity"
        }
      ],
      "content": "A limit describes the value a function approaches. For $f(x)=x^2$, as $x$ approaches $2$, the output approaches $4$."
    }
  ]
}
```

This example refers to the bundled original example source. For a real request, use the actual registered IDs and inspected source, the current timestamps, and a fresh course ID.

## Fields

- `schemaVersion`: `1`.
- `id`: a stable lowercase slug. Material IDs must be unique across the entire workspace because progress refers to them. Prefix them with the new course ID, and give revisions fresh course and material IDs.
- `color`: `sage`, `peach`, `lavender`, or `blue`.
- `icon`: `calculus`, `biology`, `physics`, or `book`.
- `sourceIds`: the registered source IDs used by the course.
- `chapters`: a readable range, not a promise of automatic chapter detection.
- `materials`: an ordered learning sequence. When several formats are requested, place the relevant lesson/slides before quizzes or practice. Include only formats requested by the user; a course may contain just one kind.
- Each material requires `id`, `kind`, `title`, `description`, `duration` (estimated minutes), `section`, and `citations`.
- A citation requires `sourceId` and `label`; include `page` (positive physical PDF page number) and/or `section` when known. The citation's source must be in the course's `sourceIds`.

## Content by kind

| `kind`       | Required content                                                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `lesson`     | `content`: Markdown string; JSON math backslashes must be escaped, e.g. `"$\\lim$"`                                                       |
| `slides`     | `slides`: array of `{title, body, bullets?, formula?, notes?, image?}`                                                                    |
| `quiz`       | `questions`: array of `{id, prompt, options, answer, explanation}`; `answer` is a zero-based integer within `options`                     |
| `practice`   | `problems`: nonempty array of `{id, prompt, hint?, solution}`; IDs are unique within the material, with at most 200 problems              |
| `flashcards` | `cards`: array of `{id, front, back}`                                                                                                     |
| `video`      | `videoUrl`: a relative URL to an actual file in `public/videos/`, such as `/videos/limits.mp4`; `transcript`: accessible full explanation |

Slide `formula` contains LaTeX without dollar delimiters. Use Markdown and math delimiters in lessons, practice prompts, hints, and solutions. Do not put raw HTML, event handlers, or remote scripts in study content. A queued study request may select any unique combination of the six supported kinds; it does not require all six.

## Practice problems

Use `practice` for open-ended exercises with worked solutions, and `quiz` for multiple-choice questions. This complete material can follow the lesson in the example course when both formats are requested:

```json
{
  "id": "calculus-ch1-revision1-practice",
  "kind": "practice",
  "title": "A limit and a missing value",
  "description": "Try the source's removable-hole example, then compare your reasoning with the worked solution.",
  "duration": 4,
  "section": "1.3",
  "citations": [
    {
      "sourceId": "calculus-notes",
      "label": "Original calculus example notes",
      "section": "1.3 Limits and continuity"
    }
  ],
  "problems": [
    {
      "id": "calculus-ch1-revision1-hole-problem",
      "prompt": "For $f(x)=\\frac{x^2-4}{x-2}$, find $\\lim_{x\\to2}f(x)$. Is $f(2)$ defined? Explain the difference.",
      "hint": "Factor the numerator, and keep track of where cancellation is valid.",
      "solution": "1. Factor $x^2-4=(x-2)(x+2)$.\n2. For $x\\ne2$, cancel $x-2$ to obtain $f(x)=x+2$.\n3. As $x$ approaches $2$, $x+2$ approaches $4$, so the limit is $4$.\n4. The original expression still has a zero denominator at $x=2$, so $f(2)$ is undefined. A limit describes nearby behavior and need not equal a function value at the point."
    }
  ]
}
```

Require a complete, checked `solution` for every problem. A hint should help the learner choose a next step without revealing the answer immediately. Keep answers in `solution`, not in the prompt. The portal supports self-study; do not promise automatic grading of open-ended reasoning.

## Slide images

Prioritize a dominant, useful image and minimal text when authoring slides. `image` is optional in the schema, with required `src` and `alt` strings and an optional `caption`. `body` is required but may be an empty string when the slide has an image, formula, or bullets:

```json
{
  "title": "The limit can survive a hole",
  "body": "",
  "formula": "\\frac{x^2 - 4}{x - 2} = x + 2, \\quad x \\ne 2",
  "notes": "Near x = 2, the output approaches 4 even though the original expression is undefined at 2. Compare the nearby values on the line with its open circle. Cancellation is valid only for x not equal to 2. This illustration is newly drawn from the source's example.",
  "image": {
    "src": "/illustrations/calculus-limit-hole.svg",
    "alt": "The line y = x + 2 with an open circle at (2, 4), showing the omitted point.",
    "caption": "Original explanatory diagram based on the cited section; axes shown to scale."
  }
}
```

This is an authoring example: create and inspect the named file before using its path. Add the enclosing material's citations to the actual inspected source.

Use an existing local public image path, such as `/illustrations/topic.png`, or `/api/sources/<source-id>` for an uploaded image. Remote HTTP(S), `data:`, and `file:` image URLs are not accepted. For private figures, register a PNG/JPEG through `npm run mori-study -- sources add <file>` and use its returned source URL so the image remains in the ignored data directory. Keep intentionally shareable original diagrams under `public/illustrations/`. See [visual-slides.md](visual-slides.md) for visual selection and export checks.

Describe the instructional meaning in `alt`; use `caption` for figure context, a source/creator credit, or a schematic qualification. Preserve more detailed credits and source locations in `notes` and the material's `citations`. Do not use filenames as alt text or claim an invented illustration was extracted from the source.

Quiz answers and practice solutions are included in export files. These are personal study materials, not secure graded exams. Exported JSON preserves the course and image references; it does not bundle original source files, slide-image binaries, or video files. The PowerPoint exporter embeds supported local slide images, while videos remain separate files referenced by the deck.
