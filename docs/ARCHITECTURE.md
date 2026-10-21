# Architecture

```text
Learner's request + sources in the agent conversation
          │
          ▼
Existing AI agent + skills/mori-study
          │ understands intent, scope, and requested formats
          │ reads sources and creates material with its own model
          │ writes a cited Course JSON and prepares useful visuals
          ▼
Mori Study CLI / local API ── validates ── local data directory
          │
          ▼
Next.js study portal ── progress in browser local storage
```

## Boundaries

The agent first understands the learner's intended outcome, chapter range, depth, and requested formats. It then performs source interpretation, reasoning, and content generation using its own model. Mori Study provides extraction helpers, a stable content schema, validation, storage, export, and the study interface. No generation queue or model-provider proxy runs inside the app. The portal need not be open while the agent registers sources, creates, validates, or imports material.

A portal study request is an optional entry point. It records selected source IDs, one or more requested formats, scope, prompt, and detail level, then gives the learner a prompt for their agent. Importing a validated course with the request ID marks a matching request completed. Direct agent conversations import a course without creating a queued request.

## Course contract

[`Course`](../src/lib/types.ts) is a versioned object (`schemaVersion: 1`) containing metadata, source IDs, and an ordered list of materials. Each material has a unique ID, kind, estimated study minutes, section, citations, and kind-specific content.

Supported kinds are `lesson`, `slides`, `quiz`, `practice`, `flashcards`, and `video`. A course may use one kind or several. A `practice` material requires a nonempty `problems` array of `{ id, prompt, hint?, solution }` with unique problem IDs. Its worked solutions support self-study; the portal does not grade open-ended reasoning with a model.

[`schema.ts`](../src/lib/schema.ts) validates IDs, bounds, required content, quiz answer indexes, and citation references. Store-level checks also verify referenced sources, globally unique material IDs, and existing local video files. A request-linked import must cover every requested source and format. A valid JSON file is structurally acceptable; the generating agent must still verify claims and chapter coverage.

Use the CLI to import courses rather than editing stored records directly. JSON exports preserve the course object and image references; Markdown exports are readable study documents. Neither bundles source files, slide-image binaries, video files, or browser progress.

## Visual slides and PowerPoint export

A slide may contain `image: { src, alt, caption? }`. The skill prioritizes a dominant useful visual, minimal visible text, and detailed notes; `body` may be empty when an image, formula, or bullets carry the point. The source is a local public image path or `/api/sources/<id>` for an uploaded image. The image must already exist; the exporter does not fetch remote URLs. The agent owns figure selection, accurate diagrams, image preparation, alt text, and source credits. Personal image assets should live in the ignored source storage; reusable original illustrations can live under `public/illustrations/`.

`GET /api/courses/<id>/export?format=pptx` creates a PowerPoint presentation for the complete course. The CLI equivalent is `npm run mori-study -- export <id> --format pptx --out study-pack.pptx`; a new output path is required. Lessons become paginated text slides; authored slides retain their content and local images; quizzes include question and answer/explanation slides; practice includes exercises and separate worked solutions; flashcards include prompts and answers; video materials contribute their transcript and link. Source references appear in speaker notes and an appendix. Export arranges the supplied material; the agent must author visual slides when those are requested.

The exporter uses editable presentation text and shapes and embeds image assets with alt text. SVG drawings and both inline and display equations become image elements; formulas render locally through MathJax and Sharp, with original Markdown/LaTeX retained in notes. Videos remain separate media files. Layout and binary validation belong in exporter checks; factual correctness and whether the visuals explain the requested source range remain the generating agent's responsibility.

## Local storage

The default root is `data/`; `MORI_DATA_DIR` can select another directory. The CLI's installed skill pointer can locate its original project through `MORI_PROJECT.md`.

```text
data/
  sources/<id>.json
  assets/<id>.<extension>
  courses/<id>.json
  requests/<id>.json
```

Source metadata and extracted text remain local. Source files are kept for viewing and agent interpretation. Text extraction is bounded and may be incomplete; inspected results identify limitations. Images and unsupported document text require the agent's own tools.

The portal stores completed material IDs, quiz scores, reviewed flashcards, activity, and study minutes in local storage. Progress belongs to a browser origin, so opening a different hostname or port creates a separate browser progress store.

## Agent interface

`npm run mori-study -- help` lists the available commands. The primary path is `sources` → `inspect` → `validate` → `import` → `open`. `requests` discovers learner briefs; `export` serializes a course. `install` copies the skill into the selected agent's discoverable directory and writes a project pointer.

The local API exposes workspace, source, study request, and course operations. File uploads use multipart data. The CLI uses shared storage and validation so it can import a course even when the Next.js server is stopped.

## Video boundary

`scripts/video.mjs` accepts a bounded scene spec and creates an editable HyperFrames project. Root and scene timelines are paused and finite; fonts use the system sans-serif stack, GSAP is copied locally, and text is HTML-escaped. With `--render`, the helper invokes the pinned HyperFrames CLI using argument arrays rather than a shell command assembled from input.

Rendered files belong under `public/videos/` when the portal should serve them. The corresponding course material contains `videoUrl` and a transcript. Course imports do not render videos automatically.

## Deployment scope

This first version is a personal local workspace, without authentication, tenancy, or cloud sync. `dev` and `start` bind to `127.0.0.1` by default. A public hosted edition would need a separate access-control and storage design.
