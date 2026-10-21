# Contributing to Mori Study

Mori Study keeps content creation in the user's existing AI agent and study in a local portal. Changes should preserve that simple workflow.

## Local setup

Use Node.js 22 or newer, run `npm install`, then `npm run dev`. The original demo course makes it possible to work on the interface without private source documents or credentials.

Before submitting a change, run checks appropriate to it:

```sh
npm run typecheck
npm test
npm run build
npm run test:browser
```

Browser tests may require `npx playwright install chromium` once. Keep tests focused on behavior: an answer being scored correctly, a course surviving import, a malformed file being rejected, or a learner completing a study session.

## Where changes belong

- `src/app/` and `src/components/`: portal screens and interactions.
- `src/lib/types.ts` and `src/lib/schema.ts`: shared course contract. Keep types, validation, skill examples, and exports aligned.
- `scripts/mori.ts`: agent-facing CLI.
- `skills/mori-study/`: portable agent instructions. Keep them concise and self-contained; do not assume a particular model provider.
- `scripts/video.mjs`: deterministic HyperFrames scene generator.

## Content and experience

Use original or suitably licensed sample material. Cite real source locations and check worked examples. A course schema can verify structure, but it cannot establish whether an explanation is true.

Preserve keyboard navigation, visible focus, reduced-motion preferences, readable contrast, and accessible transcripts. Avoid adding provider credentials or mandatory cloud services to the core workflow. Uploads and user progress must not be committed.

Explain the concrete problem and resulting behavior in a pull request. Include a screenshot for a visual change and the checks you actually ran. For new capabilities, include a small example that another contributor can reproduce without an account.

Contributions to Mori Study are made under the repository's MIT license; third-party assets must retain their required notices.
