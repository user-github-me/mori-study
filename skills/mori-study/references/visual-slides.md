# Visual study decks and PowerPoint

Use this guide when the learner asks for pictures, a visually explained topic, slides, or a PowerPoint file. Mori Study stores semantic content and local image references; the current agent chooses the visuals and checks their accuracy.

## Start with the teaching point

Start from the learner's goal and requested source range. Always prioritize one dominant, useful picture per teaching slide: a source figure, graph, process diagram, annotated example, or meaningful comparison. The visual should carry the explanation. Keep one main idea, a short title, and only essential labels or a brief takeaway on the slide; place reasoning, qualifications, and worked steps in `notes`. Use `body: ""` when an image, formula, or bullets are enough. When the user asks for a brief chapter summary, preserve that depth instead of reproducing every source page.

Choose a text or equation treatment only when it teaches the concept more clearly or no accurate useful picture is available. Do not pad the deck with decoration, unsupported stock imagery, or dense bullet lists. A diagram must explain the source-supported idea, not merely make the page look visual.

Use the source's vocabulary, assumptions, notation, and units. Show prerequisites before applications. When the learner asks for several formats, place quiz questions and practice problems after the relevant explanation, keeping answers separate so they can try first. The whole-pack PowerPoint exporter follows the material order, so author an intentional study sequence. It formats the content supplied by the agent; it does not invent pictures or rewrite a text-heavy lesson as a visual deck. Create a `slides` material with chosen visuals when that is the requested deliverable.

## Choose and prepare images

Prefer these options in the order that best serves the topic:

- **A useful source figure.** Inspect it in context, crop only what the lesson needs, preserve meaningful labels, and record the page/slide and figure credit. Do not crop away a qualification that changes its meaning. A reference photograph must depict what the caption claims.
- **A newly drawn diagram.** For plots, geometry, circuits, timelines, and labeled processes, use code or vector drawing with checked values and labels. Derive a graph from the verified formula; mark axes, units, domains, and omitted points correctly. Label conceptual drawings as schematic when proportions or distances are not meaningful.
- **An illustration from an available image tool.** Optional, for concepts that benefit from it. Use the user's existing tools; do not assume an image-generation API exists or request a new key for ordinary slide creation. Inspect the generated result. Typeset equations and precise labels separately instead of relying on an image model to spell or plot them correctly.

Retain required credits and use assets appropriate for the learner's requested use. Distinguish a newly drawn or generated explanatory image from a source figure. Do not invent experimental observations, biological structures, chart values, or textbook figures to make a slide look complete.

The exporter accepts local public SVG, PNG, JPEG, WebP, and GIF images, or an uploaded image source URL. It does not fetch remote URLs. Download an authorized reference asset locally and inspect it before linking it in a slide. Use static images; an animated GIF is not a dependable PowerPoint animation.

For personal source images or generated private diagrams, save a PNG/JPEG and register it through the source CLI:

```sh
npm run mori-study -- sources add path/to/my-figure.png
```

Use the returned `/api/sources/<id>` URL in `image.src`. Add the uploaded image's ID to the course's `sourceIds`, while retaining the original document citation that supports the explanation. This keeps private files in `data/`, outside version control. Reserve `public/illustrations/` for intentionally shareable original assets. Do not accidentally include the learner's figures in a repository commit or release package.

## Store meaning, not a screenshot of a slide

Use the `Slide.image` object in [course-format.md](course-format.md). `alt` describes what the image teaches, not just what it resembles. `caption` can contain the creator/source credit and a short explanation. Put detailed discussion and credit information in speaker notes, and keep the enclosing material's source citations accurate.

Keep text, bullets, and formulas in their own slide fields. This lets the portal and PowerPoint exporter lay them out cleanly and keeps deck text editable. Do not flatten a whole slide into one image just to obtain a polished appearance.

## Export the complete study pack

Use **PowerPoint deck (.pptx)** in the pack's export menu, or export directly through the CLI:

```sh
npm run mori-study -- export <course-id> --format pptx --out study-pack.pptx
```

PowerPoint export requires `--out`; choose a new file path because the CLI refuses to overwrite an existing file. The API is `GET /api/courses/<course-id>/export?format=pptx` on the local portal. This exports lessons, slides, quizzes with answers/explanations, practice problems with separate worked solutions, flashcards, video references/transcripts, and a source appendix in the pack's learning order.

Ordinary text and presentation shapes remain editable. Pictures and SVG illustrations are embedded images. Both inline and display math render locally through MathJax as images for reliable appearance; original Markdown and LaTeX remain in speaker notes. Image alt text is retained, captions are visible, and source references appear in notes and the appendix. Export needs no browser, but visual inspection needs a presentation viewer. The deck links videos instead of embedding MP4 files; a local video link works while that local portal is running. Explain these boundaries when the learner asks for fully editable diagrams, native equation objects, or a self-contained multimedia file.

Use self-contained SVG drawings with internal styles, definitions, and markers; external references and scripts are rejected. Split unusually large equations into readable steps and divide packs that exceed the exporter's page limit rather than shrinking the result into illegibility.

Validate the course first, ensure every image exists, export, and inspect the resulting deck. Check text fit, image legibility, aspect ratio, math, picture credits, and quiz answers. Use a slide preview or a presentation application when available; inspecting the ZIP structure alone cannot verify the visual result. Confirm all material kinds requested are represented, the file opens, and the learner receives the actual `.pptx`. Report a missing renderer or preview capability plainly instead of claiming a visual check happened.
