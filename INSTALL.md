# Install Mori Study with your AI agent

This page is for an agent given the repository URL: https://github.com/user-github-me/mori-study. Set up the existing Mori Study project; do not rebuild a study portal from scratch.

## Fast path

1. Check for Node.js **22.16 or newer**, npm, and Git. If a required tool is missing, explain the specific dependency and use the environment’s normal installation method. No model API key is needed.
2. Reuse this checkout if it is already present. Otherwise clone into a new directory; preserve any existing directory with the same name:

   ```sh
   git clone https://github.com/user-github-me/mori-study.git
   cd mori-study
   npm install
   ```

3. Install the skill for the agent you are running. Use `codex` or `claude`, or `all` for both:

   ```sh
   npm run mori-study -- install --agent all
   ```

   Existing skills are preserved. If Mori Study is already installed for this checkout, use that copy. For another agent, read [skills/mori-study/SKILL.md](skills/mori-study/SKILL.md) directly.

4. Read [the Mori Study skill](skills/mori-study/SKILL.md). If the learner has supplied sources and a request, first understand the intended lesson, visual slides, quiz, practice, flashcards, video, or combination, along with the source range and depth. Inspect only selected sources and create the requested material using your own model. Register attached files with `npm run mori-study -- sources add <file>`, then validate and import the resulting course. Prioritize useful pictures and minimal text in slides, with explanations in notes. No portal form or queued request is required.

5. Start and open the portal, then verify the finished pack appears:

   ```sh
   npm run mori-study -- open
   ```

   This starts a local server on `http://127.0.0.1:3000`, or reuses the same running workspace. It will not take over a port belonging to a different app. Set `MORI_PORT` if necessary. Use `MORI_NO_OPEN=1` in environments without a browser.

   If the learner has not supplied sources yet, open the included examples and let them provide their first request. If they asked for a file, export and inspect it before reporting it ready.

The agent understands the goal and creates the lessons, visual slides, quizzes, worked practice, flashcards, and videos. Mori Study validates, stores, serves, and exports the result; saving a request does not start a hidden generation service. Images and scanned documents need the current agent’s visual reading tools.

## Install a release instead

Once v0.1.0 is available in GitHub Releases:

```sh
npx --yes --package=https://github.com/user-github-me/mori-study/releases/download/v0.1.0/mori-study-0.1.0.tgz mori-study init my-study
```

This creates the workspace, installs its dependencies and skills, and opens the portal. Use `--no-install --no-open` to prepare files only, or `--agent codex|claude|all|none` to choose a skill target.

Use `npx mori-study init my-study` from outside an existing Mori Study workspace for the published npm installer. The exact GitHub release URL and Git clone flow above are also available. Inside an existing workspace, run `npm run mori-study -- <command>`. The unscoped name `mori` is an unrelated project; our package and CLI are `mori-study`.

## Moving a workspace

Stop its running server before moving the folder, then run `npm run mori-study -- open` from the new location. Data paths default to the current project and do not depend on the folder name. An installed skill’s `MORI_PROJECT.md` is the one location marker that needs updating after a move; preserve the skill and update that file to point at the new checkout. If you explicitly configured `MORI_DATA_DIR`, keep that setting consistent.
