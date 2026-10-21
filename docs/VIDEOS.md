# Study videos with HyperFrames

The built-in generator converts a source-grounded scene spec into a 1280 × 720 HyperFrames project. It uses short text reveals, formula panels, and up to three cards per scene. It produces **silent video**; the on-screen text and a transcript carry the explanation.

Start from [examples/limits.video.json](../examples/limits.video.json). The required top-level fields are `title` and `scenes`. Each scene requires `title`, `body`, `citation`, and `duration` in seconds, with optional `eyebrow`, `formula`, and `cards` (`label` and `text`). Formula strings use plain Unicode text. The portal's lesson/slide math support is separate from this video template.

```sh
npm run video -- examples/limits.video.json --out videos/limits
```

The output contains `index.html`, one HTML sub-composition per scene, local GSAP assets, `video.json`, `transcript.txt`, `captions.vtt`, and pinned npm scripts. The helper rewrites those generated files when run again; use a separate output directory to preserve manual edits. The generated HTML does not fetch fonts, media, or scripts from a CDN.

## Preview and render

```sh
cd videos/limits
npm run check
npm run preview
```

The HyperFrames preview opens an editable timeline. Inspect formula text, reading time, and source references. The scene generator validates text lengths and timing; the HyperFrames checker validates the actual rendered layout.

From the Mori Study root, render the final MP4:

```sh
npm run video -- examples/limits.video.json --out videos/limits \
  --render --output public/videos/limits.mp4
```

The generator invokes HyperFrames **0.8.181**, first `check`, then `render --quality delivery --fps 30`. Node.js 22+ and FFmpeg are required. The first CLI use may download packages and its browser. No model key or hosted rendering account is needed for this local path. A failed check or encode returns a nonzero exit code and leaves the composition for diagnosis.

The example source contains three ten-second scenes: approaching a limit, agreement between one-sided limits, and a removable hole. The transcript lives beside the HTML project. The generated WebVTT provides scene-level text; for narrated videos, create speech-timed captions through the user's chosen audio tooling instead.

## Add the video to a course

Use a material with `kind: "video"`, a `videoUrl` such as `/videos/limits.mp4`, an accessible transcript, estimated study minutes, and the source citations used to write the scenes. Play the actual file before importing. The browser cannot play an HTML composition as an MP4.

Mori Study's course export does not bundle video binaries. Keep or distribute the MP4 separately when sharing an exported course.

## Extend the template

The template is intentionally small. Richer diagrams, motion, voiceover, and music can be authored in the generated project using [HyperFrames](https://github.com/heygen-com/hyperframes). Read its current composition contract when adding media or alternative runtimes. Keep one paused timeline per composition, explicit finite timing, unique element IDs, local assets, and an accurate transcript. Verify on-demand additions with the relevant tool instead of presenting a placeholder as generated media.
