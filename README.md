# engine

Turns a scene file into a hand-drawn whiteboard explainer video.

You describe a video in one JSON file: what is drawn, where, and when. The engine draws each shape stroke by stroke, as if by hand, with a hand following the pen, and renders the video. Later milestones add a recorded voiceover with word-by-word captions and export for TikTok, Reels, Shorts, LinkedIn and YouTube from that same file.

Built with [Remotion](https://www.remotion.dev), [Rough.js](https://roughjs.com), TypeScript and Zod.

## Status

**M2: scene file and timeline complete.** A whole silent video comes from one JSON file: boxes, circles, ellipses, diamonds, triangles, text, lists, arrows, lines, rings and 57 icons, with fills, colours and a hand that draws everything in order. Change the file and the video changes; no code is touched to make a new video. See the [roadmap](#roadmap).

## Requirements

- [Node.js](https://nodejs.org) 22 or later
- [Git](https://git-scm.com)

Remotion downloads its own headless Chrome the first time you render, so the first render needs an internet connection and takes a little longer.

## Install

```console
git clone https://github.com/FosterSOAsare/engine.git
cd engine
npm install
```

## Preview

```console
npm run dev
```

This starts Remotion Studio and opens it in your browser, usually at http://localhost:3000 (the terminal prints the exact address). Every scene file appears in the sidebar under its id (`dns`, `os`, `showcase`, ...). Pick one and press Space to play. Edits to a scene file show up as soon as you save.

## Render

```console
npm run render -- dns          # one video   -> out/dns.mp4
npm run render -- dns os       # several
npm run render -- all          # every video
npm run render -- dns --scale=0.5   # extra options go on to Remotion
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start Remotion Studio for live preview |
| `npm run render -- <id>` | Render a video to `out/<id>.mp4` (`all` for every video) |
| `npm run render:test` | Render the M0 test composition to `out/test.mp4` |
| `npm run lint` | Run ESLint and the TypeScript check |
| `npm test` | Run the unit tests (scene file checks, timing, layout, icons) |
| `npx remotion still dns out/frame.png --frame=45` | Render a single frame as an image |

## Making a video

1. Create `videos/<id>/scene.json` (start from one of the existing files).
2. Add it to `src/videos.ts`: an import and one line, `{ id: "<id>", scene: <name> }`.
3. Open it in Studio, adjust the file until it looks right, then render it.

If the file has a problem, the Studio shows a list of what is wrong and where (for example `scene "lookup", element 3 (arrow): "to" points to unknown id "resolvr"`) instead of a broken video. `npm test` checks every video in `src/videos.ts` too.

## The scene file

```json
{
  "version": 1,
  "title": "How DNS works",
  "format": "portrait",
  "scenes": [
    {
      "id": "ask",
      "duration": 7,
      "narration": "Your browser asks a DNS resolver for the address.",
      "elements": [
        { "type": "box", "id": "browser", "label": "Browser", "x": 50, "y": 15, "start": 0.3, "draw": 1 },
        { "type": "arrow", "from": "browser", "to": "resolver", "label": "IP of google.com?", "start": 2, "draw": 0.8 },
        { "type": "box", "id": "resolver", "label": "Resolver", "x": 50, "y": 42, "start": 3.5, "draw": 1 }
      ]
    }
  ]
}
```

**Units.** Positions (`x`, `y`) are percent of the frame, 0 to 100, measured to the element's centre. Sizes (`w`, `h`, `size`) are percent of the frame's shorter side, so shapes keep their proportions in every format. Times are seconds.

**Video.** `version` (1), `title`, `format` (`"portrait"` 1080×1920 or `"landscape"` 1920×1080; default portrait), `fps` (30 only for now), `scenes`.

**Scene.** One idea and one narration line. `id`, `duration` (seconds), `narration`, `keepPrevious` (keep the previous scene's drawing instead of wiping the board; default `false`), `elements`. Scenes play one after another; at the end of each, the board is wiped unless the next scene keeps it.

**Every element** has `type`, `start` and `draw` (seconds, relative to its scene), and optionally `id` (to connect arrows and rings to it), `color` (any CSS colour) and `seed` (fixes the sketchy wobble; derived from the id when left out). Elements in a scene are drawn one at a time, so they must not overlap in time. A label takes 0.5 s after its shape.

| Type | Fields (defaults in brackets) |
|---|---|
| `box` | `x`, `y`, `w` [50], `h` [22], `label`, `fill`, `fillStyle` |
| `circle` | `x`, `y`, `size` [25] (diameter), `label`, `fill`, `fillStyle` |
| `ellipse` | `x`, `y`, `w` [40], `h` [25], `label`, `fill`, `fillStyle` |
| `diamond` | `x`, `y`, `w` [36], `h` [24], `label`, `fill`, `fillStyle` |
| `triangle` | `x`, `y`, `w` [30], `h` [26], `label`, `fill`, `fillStyle` |
| `icon` | `name`, `x`, `y`, `size` [15], `label` (written underneath), `fill`, `fillStyle` |
| `text` | `text`, `x`, `y`, `size` [8] (font size) |
| `list` | `items` (array of strings), `x`, `y` (left edge and middle of the first line), `size` [7], `bullet` ["•"], `spacing` [1.6] |
| `arrow` | `from`, `to` (element ids), `head` ["end", or "both", "none"], `bend` (curves the middle sideways), `label` |
| `line` | `x1`, `y1`, `x2`, `y2`, `bend` |
| `ring` | `target` (element id), `padding` [4]. A hand-drawn ellipse around the target; red unless `color` is set |

**Fills.** `fill` is any CSS colour; `fillStyle` is `"solid"` (default), `"hachure"`, `"cross-hatch"`, `"zigzag"` or `"dots"`. The fill fades in after the outline is drawn.

**Icons.** About 1,870: every [Lucide](https://lucide.dev/icons) icon (1,857, under its Lucide name, e.g. `"name": "map-pin"`), plus 16 hand-made ones Lucide lacks (browser, robot, chip, memory, disk, cube, chart, queue, warning, chat, gear, home, cart, money, lightning, question). Icons are drawn with a gentler wobble than big shapes so their details stay readable. The `lucide` video shows a sample; `showcase` and `icons` show the hand-made ones.

## Adding an icon

**From Lucide.** The Lucide icons are generated by `../icon-tools` (outside the engine) from the official `lucide-static` package; never edit `src/elements/icons/lucide/` by hand. To pick up a new Lucide release:

```console
cd ../icon-tools
npm install lucide-static@latest
npm run sync      # fetch that release's categories
npm run convert   # rewrite src/elements/icons/lucide/
```

Lucide is ISC-licensed; its licence is kept in `src/elements/icons/lucide/LICENSE`.

**By hand**, for anything Lucide doesn't have:

1. Create `src/elements/icons/<group>/<name>.ts`. Icons are drawn inside a square with helpers that take 0-to-1 units (see `src/elements/icons/types.ts`):

   ```ts
   import type { IconDrawing } from "../types";

   export const lock: IconDrawing = ({ g, o, X, Y, S }) => [
     g.rectangle(X(0.2), Y(0.45), S(0.6), S(0.45), o), // body
     g.arc(X(0.5), Y(0.45), S(0.4), S(0.5), Math.PI, 2 * Math.PI, false, o), // shackle
   ];
   ```

   Shapes are drawn in the order listed, and the hand follows that order.

2. Add it to `HAND_MADE` in `src/elements/icons/index.ts` under its group. Scene files can use `"name": "<name>"` straight away. If Lucide has the same name, Lucide's drawing wins.

## Project structure

```
engine/
├── src/
│   ├── index.ts         # entry point
│   ├── Root.tsx         # one composition per scene file, plus TestCard
│   ├── videos.ts        # the list of scene files
│   ├── SceneVideo.tsx   # draws a video from its scene file
│   ├── TestCard.tsx     # M0 test composition
│   ├── schema/          # scene file structure (Zod) and checks
│   ├── layout/          # formats, plan (file -> drawings), arrow edges
│   ├── elements/        # Shape, Arrow, Text, Hand; icons/ (lucide/ is generated)
│   ├── animation/       # stroke timing, hand movement, scene timeline
│   └── captions/        # caption display                           (M3)
├── videos/              # one folder per video: scene.json (audio, captions in M3)
├── public/              # hand image (hero.png)
├── scripts/             # render.mjs
└── out/                 # rendered files (not committed)
```

## Scene file changelog

The `version` field lets the engine reject or upgrade old files when the format changes.

- **Version 1** (M2). Videos with `title`, `format`, `fps` and scenes with `duration`, `narration`, `keepPrevious`. Elements: box, circle, ellipse, diamond, triangle, icon, text, list, arrow, line, ring; `fill` and `fillStyle` on closed shapes; arrow `head`.

## Roadmap

| Milestone | Result |
|---|---|
| **M0** Setup | A project that renders a test video |
| **M1** Drawing animation | Shapes that look hand-drawn, with a hand following the pen |
| **M2** Scene file and timeline | A full silent video built from one JSON file |
| **M3** Voiceover and captions | Narration with word-by-word captions, drawings timed to the words |
| **M4** Multi-format export | One command renders 9:16, 4:5, 1:1 and 16:9 |
| **M5** AI scene planner | A rough plan turned into a scene file by AI, then reviewed |
| **M6** Automation and templates | A rough plan becomes a published video in under 30 minutes |

## License

Remotion is free for individuals and small teams; some companies need a company license. See the [Remotion license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
