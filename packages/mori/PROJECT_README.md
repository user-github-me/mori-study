# Your Mori Study workspace

This directory contains your local study portal, the Mori Study agent skill, and original example material. Your AI agent reads your sources and creates the learning material; the portal stores it and helps you study.

## Open your study space

```sh
npm install
npm run mori-study -- open
```

If the installer already installed dependencies, skip `npm install`. The portal normally opens at `http://127.0.0.1:3000`. Set `MORI_PORT` to select another port. To keep the server in your terminal, run `npm run dev`.

## Ask your agent

Open this directory in Codex or Claude Code and use `$mori-study` or `/mori-study`. Any agent with filesystem and shell access can read [skills/mori-study/SKILL.md](skills/mori-study/SKILL.md) directly.

> Use these chapter 1 notes to make concise slides and a three-question quiz. Import them into my Mori Study portal.

The agent registers and reads your selected source, creates a cited course, validates and imports it, and opens the portal. A saved study request is a brief for your agent, not an automatic background generation job. Image and scanned-document reading depends on your agent's capabilities.

If you skipped agent installation, run:

```sh
npm run mori-study -- install --agent all
```

Use `--agent codex` or `--agent claude` for just one agent. Existing skill installations are preserved.

## Study and export

Read lessons, present slides, take quizzes, review flashcards, and watch the included silent study video. Export JSON, Markdown, flashcard CSV, or print a course to PDF. Browser progress can be backed up and restored from the portal. Exports of courses do not include original documents or video binaries.

```sh
npm run mori-study -- sources
npm run mori-study -- requests
npm run mori-study -- validate course.json
npm run mori-study -- import course.json
npm run mori-study -- export COURSE_ID --format markdown --out course.md
```

Sources and courses live in `data/` by default; use `MORI_DATA_DIR` to choose another location. Keep a backup of this directory and browser progress. Mori Study is a personal local workspace without accounts; it binds to loopback by default.

For optional video generation, see [docs/VIDEOS.md](docs/VIDEOS.md). It uses HyperFrames and requires FFmpeg to render. No model API key is required by the portal; your agent uses its existing model access.

Mori Study is [MIT licensed](LICENSE). See [third-party notices](docs/THIRD_PARTY.md) for bundled fonts and dependencies. Project source and releases: [github.com/user-github-me/mori-study](https://github.com/user-github-me/mori-study).
