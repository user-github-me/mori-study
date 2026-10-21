# Mori Study

Create a local study portal and install the Mori Study skill for your AI coding agent. The small launcher has no runtime dependencies; it installs the portal's dependencies inside the directory you choose.

Requires **Node.js 22.16 or newer** and npm. FFmpeg is optional for rendering study videos.

## Install

From a directory outside an existing Mori Study workspace:

```sh
npx mori-study init my-study
```

This creates `my-study`, installs its dependencies, installs project-local skills for Codex and Claude Code, and opens the local portal. The directory must be new or completely empty. Existing files and skills are never overwritten.

You can also use a versioned [official GitHub release](https://github.com/user-github-me/mori-study/releases):

```sh
npx --yes --package=https://github.com/user-github-me/mori-study/releases/download/v0.1.0/mori-study-0.1.0.tgz mori-study init my-study
```

The unrelated registry package named `mori` is not this project; the package and command here are `mori-study`.

## Install from this repository

The repository works without a published package:

```sh
git clone https://github.com/user-github-me/mori-study.git
cd mori-study
npm install
npm run mori-study -- install --agent all
npm run mori-study -- open
```

To build the launcher from a clone and create a separate study directory:

```sh
npm run package:build
node packages/mori/bin/mori.mjs init ../my-study
```

## Choose your setup

```sh
mori-study init my-study --agent codex
mori-study init my-study --agent claude --no-open
mori-study init my-study --no-install --no-open --agent none
mori-study doctor
```

Invoke setup commands through `npx mori-study`, through the same official archive command above, or from a locally installed copy. `--agent` accepts `codex`, `claude`, `all` (default), or `none`. `--no-install` creates the files and selected skills, leaving dependency installation and opening for later. `--no-open` installs normally without starting the portal.

Inside the new project, ask your agent to read `skills/mori-study/SKILL.md`, or use `$mori-study` in Codex / `/mori-study` in Claude Code. Attach a source and ask, for example: “Make concise slides and a quiz from chapter 1.” The agent reads the source, creates cited material, validates it, imports it, and opens your study space.

The launcher forwards `sources`, `inspect`, `requests`, `validate`, `import`, `export`, `open`, and `install` only from a recognized Mori Study project. `mori-study --help` makes no changes. `mori-study doctor` reports Node, project, installed dependencies, and optional FFmpeg status. Inside an existing workspace, use `npm run mori-study -- <command>`.

Mori Study does not require a model API key or run a generation service. Your agent provides its own model access and document-reading capabilities. Courses and sources stay in the local project; progress stays in your browser. The generated portal includes original example material and a real 30-second silent HyperFrames video.

Mori Study code is MIT licensed. Bundled fonts, libraries, and other third-party assets retain their own licenses, included in the generated project's `docs/THIRD_PARTY.md` and `docs/licenses/`.
