# Local study videos

Mori Study uses [HyperFrames](https://github.com/heygen-com/hyperframes) to render editable HTML compositions to MP4. The current agent writes the explanation and scenes. The built-in template produces a silent typography video with a transcript; it does not synthesize narration or fetch media.

The Mori Study project includes `scripts/video.mjs` and `examples/limits.video.json`. Read that example, then write a JSON scene spec. Every scene has `title`, `body`, `duration` (seconds), and `citation`; it may also have `eyebrow`, a plain-text `formula`, and up to three `{label, text}` `cards`. Root fields are `title` and `scenes`. Respect the script's text-length bounds; concise text remains readable on a video frame. Allow enough time to read each scene.

```sh
npm run video -- path/to/topic.video.json --out videos/topic
npx --yes hyperframes@0.8.181 check videos/topic
cd videos/topic
npm run preview -- --background
```

The first command writes a deterministic, editable HyperFrames project plus `transcript.txt` and `captions.vtt`. It copies the project's installed GSAP runtime to local assets. Formula strings are plain Unicode text, not LaTeX. No network is used by composition generation.

To render a requested video, run:

```sh
npm run video -- path/to/topic.video.json --out videos/topic \
  --render --output public/videos/topic.mp4
```

The helper runs HyperFrames check, then renders locally. Node.js 22+ and FFmpeg are needed; HyperFrames may download its browser and npm package on first use. The wrapper pins the tested HyperFrames CLI version. A render failure leaves the composition available for inspection and returns a nonzero exit code. Do not represent an HTML project or transcript as a finished video.

Verify the actual MP4 plays. Add a `video` material with `videoUrl: "/videos/topic.mp4"`, a transcript, estimated study minutes, and citations to the same source range. Import the course only when all requested deliverables are complete, or explain the precise remaining gap.

For richer visuals, use installed HyperFrames skills if available: entry point, core composition contract, animation, and any needed media workflow. Otherwise the generator is a self-contained starting point and the official HyperFrames documentation describes customization. One paused, seekable timeline per composition, local assets, and explicit finite timing preserve deterministic rendering. Do not request API credentials for the built-in silent-video workflow. Narration and externally generated media are separate optional additions using tools already available to the user.
