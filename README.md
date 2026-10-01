# engine

Turns a scene file into a hand-drawn whiteboard explainer video.

You describe a video in one JSON file: what is drawn, where, and when. The engine draws each shape stroke by stroke, as if by hand, syncs it to a recorded voiceover with word-by-word captions, and renders it for TikTok, Reels, Shorts, LinkedIn and YouTube from that single file.

Built with [Remotion](https://www.remotion.dev), [Rough.js](https://roughjs.com), TypeScript and Zod.

## Status

**M1: drawing animation complete.** Boxes, arrows, circles and handwritten labels are drawn stroke by stroke, with a hand following the pen. The scene is still written in code; the scene file comes in M2. See the [roadmap](#roadmap).

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

This starts Remotion Studio and opens it in your browser, usually at http://localhost:3000 (the terminal prints the exact address). Pick a composition in the sidebar (`M1Demo` is the drawing demo) and press Space to play. Changes to the code show up in the preview as soon as you save.

## Render the demo video

```console
npm run render:m1
```

The video is written to `out/m1-demo.mp4`: 6 seconds, 1080×1920, 30 fps. A Browser box, an arrow and a Server box are drawn by hand, one after another.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start Remotion Studio for live preview |
| `npm run render:m1` | Render the M1 drawing demo to `out/m1-demo.mp4` |
| `npm run render:test` | Render the M0 test composition to `out/test.mp4` |
| `npm run lint` | Run ESLint and the TypeScript check |
| `npm test` | Run the unit tests (stroke timing and hand movement) |
| `npx remotion still TestCard out/frame.png --frame=45` | Render a single frame as an image |

## Project structure

```
engine/
├── src/
│   ├── index.ts        # entry point
│   ├── Root.tsx        # registers each composition (video)
│   ├── TestCard.tsx    # M0 test composition
│   ├── Sketch.tsx      # M1 demo scene: Browser -> Server
│   ├── schema/         # scene file structure and validation       (M2)
│   ├── elements/       # Box, Arrow, Circle, Text, Hand
│   ├── animation/      # stroke timing and hand movement, with tests
│   ├── captions/       # caption display                           (M3)
│   └── layout/         # format sizes and safe areas
│       └── formats.ts
├── public/             # hand image (hero.png)
├── videos/             # one folder per video: scenes, audio, captions
├── scripts/            # validate, transcribe, render-all, plan
└── out/                # rendered files (not committed)
```

Folders marked with a milestone are empty until that milestone.

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
