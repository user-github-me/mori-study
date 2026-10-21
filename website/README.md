# Mori Study introduction website

A separate **Next.js static-export project** for GitHub Pages. It explains Mori Study, shows a real portal screenshot, provides a copyable agent setup prompt, and exposes the workflow as plain text at `llms.txt`.

From the repository root, with Node.js **22.16+**:

```sh
npm run build:site
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist/site
```

The builder prepares local public assets, runs an actual `next build website --webpack` with `output: 'export'`, and stages the result in **`dist/site`**. Deploy that directory; no Node server is needed in production. The existing root dependencies provide Next.js and React.

The maintainable page source is `index.html` and `styles.css`. `app/page.tsx` renders the repository-owned HTML at build time, while `app/layout.tsx` supplies Next metadata, asset paths, and the client script. No user HTML is rendered. `site.js` handles copy buttons, installation tabs, and the interactive study examples.

## Build configuration

| Setting                  | Default                                        | Purpose                                                                       |
| ------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `MORI_REPOSITORY`        | `https://github.com/user-github-me/mori-study` | Repository links, terminal commands, agent instructions                       |
| `MORI_SITE_BASE_PATH`    | empty                                          | `/mori-study` for the GitHub Pages project path; omit for a domain root       |
| `MORI_NPM_PUBLISHED`     | unset                                          | Set to `1` only after `mori-study` is published on npm                        |
| `MORI_RELEASE_PUBLISHED` | unset                                          | Set to `1` only after the release archive is uploaded to GitHub               |
| `MORI_RELEASE_VERSION`   | `0.1.0`                                        | Version of `mori-study-<version>.tgz` under the matching `v<version>` release |

```sh
MORI_SITE_BASE_PATH=/mori-study npm run build:site
```

The default clearly marks package installation as unpublished and offers repository setup. When an archive exists, `MORI_RELEASE_PUBLISHED=1` exposes its direct `npx --package=<release-url> mori-study init my-study` command. npm publication is controlled separately. Configuration values are validated and no credentials are read.

The screenshot comes from `docs/portal.png`. Local DM Sans and Manrope fonts, their OFL licenses, and third-party notices are copied into the exported artifact. Ignore generated `website/public/`, `website/.next/`, `website/out/`, and `dist/site/` in Git.

The page has keyboard-operable tabs, copy fallback text selection, native FAQ disclosures, working flashcard/quiz examples, visible focus states, and reduced-motion support. It includes no analytics or remote font scripts.
