# Releasing Mori Study

The repository ships three things: the local study portal, a lightweight `mori-study` installer package, and a static introduction website. The portal runs on the learner's computer; GitHub Pages hosts only the introduction site.

## Build and inspect a package

```sh
npm ci
npm test
npm run build
npm run test:browser
node scripts/package.mjs pack
```

The tarball is written to `packages/mori/`. Its template is assembled from an explicit list of source files and original demo assets. Workspace data, generated personal study content, credentials, caches, and installed dependencies are excluded.

Before a release, update `packages/mori/package.json` and the root version together, review the packed file list, and try the installer from its actual tarball in a new directory.

For a release that changes PowerPoint export, generate a whole-pack `.pptx` from the installed template, including lessons, visual slides, quiz answers, practice problems and worked solutions, flashcards, and a video reference. Verify that the file opens and inspect representative slides when a preview tool is available. Check that original demo illustrations ship, required image/rendering dependencies install from the tarball, and private source figures or generated personal decks are excluded. Do not publish a claim that all diagram and equation elements are editable: embedded pictures and rendered formulas remain image elements.

## GitHub releases

```sh
git tag v0.1.0
git push origin v0.1.0
```

The Release workflow checks that the tag matches the npm package version, runs the application checks, packs the installer, and publishes a GitHub release with the tarball and SHA-256 checksums. It can also be dispatched manually for an existing version tag. A release asset is available independently of the npm registry.

## npm publishing

The public package and CLI are named **`mori-study`**. npm registry availability was checked during initial setup; a name is not reserved until publication succeeds.

The first npm publication needs a maintainer's npm account with rights to the package name. Log in with npm's normal interactive flow, then publish the inspected tarball:

```sh
npm login
npm publish packages/mori/mori-study-0.1.0.tgz --access public
```

For subsequent releases, configure an npm **trusted publisher** for this repository and `.github/workflows/release.yml`. Set the GitHub Actions repository variable `MORI_NPM_PUBLISH=true` to enable the OIDC publishing job. No long-lived npm token needs to be committed or stored here.

After the GitHub release and its installer tarball exist, set `MORI_RELEASE_PUBLISHED=1` in repository variables and rerun the Introduction website workflow. After `npm view mori-study version` confirms successful npm publication, also set `MORI_NPM_PUBLISHED=1`. The website only advertises install channels that have been made available.

## Introduction website

Enable GitHub Pages with **GitHub Actions** as the build source. Pushes to `main` that change website inputs deploy the static site. Manual deployment is also available through the Introduction website workflow.

```sh
npm run build:site
python3 -m http.server 4173 --directory dist/site
```

The builder creates a Next.js static export and stages it in `dist/site`. It uses `MORI_REPOSITORY` to set repository links. GitHub Actions supplies its current repository automatically; locally the default is `https://github.com/user-github-me/mori-study`. For a project Pages URL, build with `MORI_SITE_BASE_PATH=/mori-study`; use an empty base path for a custom domain or the local preview above. The Pages workflow sets this path for its repository.
