# engine

Turns a scene file into a hand-drawn whiteboard explainer video.

You describe a video in one JSON file: what is drawn, where, and when. The engine draws each shape stroke by stroke, as if by hand, with a hand following the pen, and renders the video. Later milestones add a recorded voiceover with word-by-word captions and export for TikTok, Reels, Shorts, LinkedIn and YouTube from that same file.

Built with [Remotion](https://www.remotion.dev), [Rough.js](https://roughjs.com), TypeScript and Zod.

## Status

**M3: voiceover and captions complete.** A whole video comes from one JSON file: boxes, circles, ellipses, diamonds, triangles, text, lists, arrows, lines, rings and about 1,870 icons, with fills, colours and a hand that draws everything in order. Each scene's narration line is read aloud by an offline text-to-speech voice, drawings appear as the words that name them are spoken, and word-by-word captions show what is said. Background music is planned but not built yet. See the [roadmap](#roadmap).

## Requirements

- [Node.js](https://nodejs.org) 22 or later
- [Git](https://git-scm.com)
- [Python](https://www.python.org) 3.9 or later, only for narration (Piper runs on it)

Remotion downloads its own headless Chrome the first time you render, so the first render needs an internet connection and takes a little longer.

## Install

```console
git clone https://github.com/FosterSOAsare/engine.git
cd engine
npm install
```

For narrated videos, also install the voice and the speech recogniser once (about 210 MB, into `.tools/`, which is not committed):

```console
npm run voice:setup
npm run captions:setup
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
npm run render -- dns-square   # another format -> out/dns-square.mp4
npm run render -- dns --all-formats # all four formats, one file each
npm run render -- dns --no-captions # without captions, whatever the scene file says
npm run render -- dns --compress    # also a small copy for posting -> out/dns.small.mp4
npm run render -- dns --scale=0.5   # other options go on to Remotion
```

For a narrated video, generate its narration and word timings first (see [Narration and captions](#narration-and-captions)).

## Formats

Every video renders in four formats. A scene file is written for one of them (its `format`); in Studio each video is a folder with one composition per format.

| Format | Size | Composition | For |
|---|---|---|---|
| `portrait` | 1080×1920 (9:16) | `<id>-portrait` | TikTok, Reels, Shorts |
| `feed` | 1080×1350 (4:5) | `<id>-feed` | LinkedIn and Instagram feed |
| `square` | 1080×1080 (1:1) | `<id>-square` | Feeds |
| `landscape` | 1920×1080 (16:9) | `<id>-landscape` | YouTube, LinkedIn video |

In the format it is written for, a video's composition is just `<id>`. In the others, each board keeps the shape it was written for and is scaled to fit that format's safe area: clear of the captions and, in portrait, of the buttons and description the apps lay over the video. It is never scaled up, so text stays as large as written or smaller.

When a scene doesn't work scaled (a portrait column in a wide frame, say), give it a layout for that format: new positions and sizes for its elements, by id. That scene is then laid out directly in that frame.

```json
"layouts": {
  "landscape": {
    "you":     { "x": 16, "y": 40, "w": 17 },
    "kitchen": { "x": 84, "y": 34, "size": 18 },
    "food":    { "bend": 4 }
  }
}
```

Allowed fields are the element's own position and size fields: `x`, `y`, `w`, `h`, `size`, `bend`, `x1`, `y1`, `x2`, `y2`, `spacing`, `align`. Elements not listed keep their percentages, now of the new frame. Safe areas and caption sizes are in `src/layout/formats.ts`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start Remotion Studio for live preview |
| `npm run render -- <id>` | Render a video to `out/<id>.mp4` (`all` for every video) |
| `npm run compress -- <id>` | Shrink `out/<id>.mp4` to `out/<id>.small.mp4` for posting (`all`, `--quality=28`: lower is sharper and bigger) |
| `npm run render:test` | Render the M0 test composition to `out/test.mp4` |
| `npm run voice -- <id>` | Read every scene's narration aloud into `public/videos/<id>/` |
| `npm run captions -- <id>` | Find when each narration word is spoken (for captions and timing) |
| `npm run voice:setup` / `captions:setup` | Install Piper and the voice / whisper.cpp and its model, once |
| `npm run lint` | Run ESLint and the TypeScript check |
| `npm test` | Run the unit tests (scene file checks, timing, layout, icons) |
| `npx remotion still dns out/frame.png --frame=45` | Render a single frame as an image |

## Making a video

1. Create `videos/<id>/scene.json` (start from one of the existing files).
2. Add it to `src/videos.ts`: an import and one line, `{ id: "<id>", scene: <name> }`.
3. Open it in Studio, adjust the file until it looks right, then render it.

For a narrated video, add `"voiceover": true`, then run `npm run voice -- <id>` and `npm run captions -- <id>` before previewing.

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

**Video.** `version` (1), `title`, `format` (the format it is written for: `"portrait"`, `"feed"`, `"square"` or `"landscape"`; default portrait; see [Formats](#formats)), `fps` (30 only for now), `voiceover` (narrate every scene; default `false`), `voice` (a Piper voice; default `en_US-bryce-medium`), `captions` (word-by-word captions on narrated videos; default `true`), `scenes`.

**Scene.** One idea and one narration line. `id`, `duration` (seconds), `narration`, `pause` (silence after the narration; default 0.5 s), `keepPrevious` (keep the previous scene's drawing instead of wiping the board; default `false`), `elements`, `layouts` (positions for other formats; see [Formats](#formats)). Scenes play one after another; at the end of each, the board is wiped unless the next scene keeps it. In a narrated video `duration` is optional: a scene lasts as long as its narration plus the pause, or its `duration` if that is longer, and stretches if its drawings need more time.

**Every element** has `type` and `draw` (seconds the drawing takes), and optionally `id` (to connect arrows and rings to it), `color` (any CSS colour), `seed` (fixes the sketchy wobble; derived from the id when left out) and a time to start:

- `start`: seconds into its scene;
- `at`: a word of the narration to start on, e.g. `"at": "resolver"` (`"resolver#2"` for the second time it is said, or a phrase like `"phone book"`);
- neither: in a narrated video the element starts when its label, text or icon name is spoken; otherwise it follows the previous element.

The hand draws one thing at a time, so elements queue in file order: one never starts before the previous one is finished. In a narrated video a drawing also slows down, up to 3 times its `draw`, to fill the time until the next element's word, so the hand keeps drawing while the voice talks. A label takes 0.5 s after its shape.

| Type | Fields (defaults in brackets) |
|---|---|
| `box` | `x`, `y`, `w` [50], `h` [22], `label`, `fill`, `fillStyle` |
| `circle` | `x`, `y`, `size` [25] (diameter), `label`, `fill`, `fillStyle` |
| `ellipse` | `x`, `y`, `w` [40], `h` [25], `label`, `fill`, `fillStyle` |
| `diamond` | `x`, `y`, `w` [36], `h` [24], `label`, `fill`, `fillStyle` |
| `triangle` | `x`, `y`, `w` [30], `h` [26], `label`, `fill`, `fillStyle` |
| `icon` | `name`, `x`, `y`, `size` [15], `label` (written underneath), `fill`, `fillStyle` |
| `text` | `text`, `x`, `y`, `size` [8] (font size) |
| `list` | `items` (array of strings), `x`, `y` (left edge and middle of the first line), `size` [7], `bullet` ["•"], `spacing` [1.6], `itemGap` [0.5] (seconds of pause between items; in a narrated video each item also waits until it is said) |
| `arrow` | `from`, `to` (element ids), `head` ["end", or "both", "none"], `bend` (curves the middle sideways), `label` |
| `line` | `x1`, `y1`, `x2`, `y2`, `bend` |
| `ring` | `target` (element id), `padding` [4]. A hand-drawn ellipse around the target; red unless `color` is set |

**Fills.** `fill` is any CSS colour; `fillStyle` is `"solid"` (default), `"hachure"`, `"cross-hatch"`, `"zigzag"` or `"dots"`. The fill fades in after the outline is drawn.

**Icons.** About 1,870: every [Lucide](https://lucide.dev/icons) icon (1,857, under its Lucide name, e.g. `"name": "map-pin"`), plus 16 hand-made ones Lucide lacks (browser, robot, chip, memory, disk, cube, chart, queue, warning, chat, gear, home, cart, money, lightning, question). Icons are drawn with a gentler wobble than big shapes so their details stay readable. The `lucide` video shows a sample; `showcase` and `icons` show the hand-made ones.

## Narration and captions

Narration is text-to-speech, read offline by [Piper](https://github.com/OHF-Voice/piper1-gpl). The default voice, `en_US-bryce-medium`, is public domain. Other voices are listed at [piper-voices](https://huggingface.co/rhasspy/piper-voices); check a voice's `MODEL_CARD` licence before publishing with it, as several are for non-commercial use only. Install extra voices with `npm run voice:setup -- <voice>`.

1. `npm run voice -- <id>` writes one WAV per scene to `public/videos/<id>/`. Only scenes whose line or voice changed are regenerated.
2. `npm run captions -- <id>` runs whisper.cpp on each scene and saves when every word is spoken to `public/videos/<id>/captions.json`. The engine matches those words to the narration lines, so captions are spelled like the script even where whisper mishears ("DNS" as "the NS").

Run both again after changing a narration line. Both outputs are rebuilt from the scene file, so they are not committed.

Captions show one to three words at a time, the word being spoken highlighted, near the bottom in landscape and a little higher in portrait (clear of the buttons TikTok, Reels and Shorts lay over the video).

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
│   ├── audio/           # reading narration lengths
│   └── captions/        # matching words to the script, caption display
├── videos/              # one folder per video: scene.json
├── public/              # hand image; videos/<id>/ narration and word timings (generated)
├── scripts/             # render, voice and captions commands
├── .tools/              # Piper, voices, whisper.cpp (not committed)
└── out/                 # rendered files (not committed)
```

## Scene file changelog

The `version` field lets the engine reject or upgrade old files when the format changes.

- **Version 1** (M2). Videos with `title`, `format`, `fps` and scenes with `duration`, `narration`, `keepPrevious`. Elements: box, circle, ellipse, diamond, triangle, icon, text, list, arrow, line, ring; `fill` and `fillStyle` on closed shapes; arrow `head`.
- **Version 1, M3 additions** (all optional; older files are still valid). Videos: `voiceover`, `voice`, `captions`. Scenes: `pause`; `duration` optional with a voiceover. Elements: `start` optional, `at`; lists: `itemGap`. Elements now queue instead of being rejected when they overlap.
- **Version 1, M4 additions** (optional). Formats `feed` and `square`. Scenes: `layouts`.

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
