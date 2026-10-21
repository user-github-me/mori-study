# Agent workflow

Start with the learner's message and attached sources. Identify the intended outcome, source range, and one or more formats before generating. The current agent uses its own model to create the content, while Mori Study supplies validation, storage, export, and the reader. The learner does not need to visit the portal first.

Run these commands from the Mori Study project directory:

```sh
npm run mori-study -- help
npm run mori-study -- sources
npm run mori-study -- inspect <source-id>
npm run mori-study -- validate <course.json>
npm run mori-study -- import <course.json>
npm run mori-study -- open
```

`sources` lists what is available. `inspect` returns source metadata and extracted text or the path to a file that needs the agent's own inspection tools. An image source needs a vision-capable agent. A scanned PDF needs OCR or page-image inspection; do not invent extracted text.

An existing portal brief is an optional entry point. Run `npm run mori-study -- requests` to find it, then `npm run mori-study -- requests <request-id>` to read its full scope. Add `--request <request-id>` to `import` when fulfilling that brief. No worker generates pending requests in the background; create their material using the current agent.

`open` starts the portal if necessary and opens its local address. To keep the server in a terminal yourself, use `npm run dev`, then open `http://127.0.0.1:3000`. Do not start a second server if Mori Study is already running. Check the URL returned by the CLI.

## Register an attached source

When a source is attached in the agent's conversation rather than uploaded through the portal, first use the agent's normal attachment access to get its local file path. Register it without needing a running server:

```sh
npm run mori-study -- sources add '/absolute/path/to/notes.pdf'
npm run mori-study -- sources add --text 'Your pasted notes' --name 'Class notes'
npm run mori-study -- sources add --url 'https://example.org/reading' --name 'Reading link'
```

Use the returned source ID in the course. Quote file paths safely. Do not substitute a source filename for its ID. A saved link is a reference, not a promise that its content was fetched: read it using the agent's available tools before making claims. The portal also accepts pasted notes and uploads through the Sources screen.

Read source inspection limits in the CLI output. Machine-readable PDFs, DOCX, and PPTX text can be extracted, with page/slide markers where applicable. Images, scanned PDFs, diagrams, and formatting need the agent's visual inspection tools. Source selection is explicit: do not read unrelated files on disk.

## Export

```sh
npm run mori-study -- export <course-id> --format json --out course.json
npm run mori-study -- export <course-id> --format markdown --out course.md
npm run mori-study -- export <course-id> --format pptx --out study-pack.pptx
```

Use `--out` for files; the npm runner may print its own banners around stdout. PowerPoint export requires `--out` and includes the complete pack, with local slide images embedded. See [visual-slides.md](visual-slides.md) for image preparation and deck inspection. Keep original documents, MP4 files, and browser progress backups separately.

## Installation

```sh
npm run mori-study -- install --agent codex
npm run mori-study -- install --agent claude
npm run mori-study -- install --agent all --global
```

Project-local installations go into `.agents/skills/mori-study` and `.claude/skills/mori-study`. Global installations use the matching directories under the user's home directory. The copied `MORI_PROJECT.md` records which checkout owns the portal. A globally installed skill still needs that local checkout. For any other file-based agent, load `skills/mori-study/SKILL.md` and its referenced files using the agent's supported instruction mechanism.
