import { z } from "zod";
import { ICON_NAMES } from "../elements/icons";
import { FORMAT_NAMES } from "../layout/formats";

// The scene file: one JSON file describes a whole video. Positions are in
// percent of the frame (0 to 100), sizes in percent of the frame's shorter
// side, times in seconds. Unknown fields are rejected, so a typo such as
// "lable" is an error instead of being silently ignored.

const percent = z.number().min(0).max(100);
const positive = z.number().positive();
const seconds = z.number().min(0);

// Fields every element has. Times are relative to the element's scene.
const common = {
  // Needed when an arrow points to the element; also gives a stable seed.
  id: z.string().min(1).optional(),
  start: seconds, // when drawing begins
  draw: positive, // how long drawing takes
  color: z.string().min(1).optional(), // any CSS colour; default ink
  // Fixes the sketchy wobble. Derived from the id when missing.
  seed: z.number().int().optional(),
};

// Closed shapes can be filled: any CSS colour, solid by default or with a
// sketchy pattern. The fill fades in after the outline is drawn.
export const FILL_STYLES = [
  "solid",
  "hachure",
  "cross-hatch",
  "zigzag",
  "dots",
] as const;
export type FillStyle = (typeof FILL_STYLES)[number];

const filled = {
  fill: z.string().min(1).optional(),
  fillStyle: z.enum(FILL_STYLES).optional(),
};

// Shapes with a width and height (percent of the shorter side), a centre,
// an optional label in the middle, and an optional fill.
const sized = (w: number, h: number) => ({
  ...common,
  ...filled,
  x: percent, // centre
  y: percent,
  w: positive.default(w),
  h: positive.default(h),
  label: z.string().optional(),
});

const box = z.strictObject({ type: z.literal("box"), ...sized(50, 22) });

const ellipse = z.strictObject({
  type: z.literal("ellipse"),
  ...sized(40, 25),
});

// A rhombus, like a decision in a flowchart.
const diamond = z.strictObject({
  type: z.literal("diamond"),
  ...sized(36, 24),
});

const triangle = z.strictObject({
  type: z.literal("triangle"),
  ...sized(30, 26),
});

const circle = z.strictObject({
  type: z.literal("circle"),
  ...common,
  ...filled,
  x: percent,
  y: percent,
  size: positive.default(25), // diameter
  label: z.string().optional(),
});

const text = z.strictObject({
  type: z.literal("text"),
  ...common,
  x: percent,
  y: percent,
  size: positive.default(8), // font size
  text: z.string().min(1),
});

// Bullet points, written one line after another. x and y are where the
// first line starts (its left edge and middle).
const list = z.strictObject({
  type: z.literal("list"),
  ...common,
  x: percent,
  y: percent,
  size: positive.default(7), // font size
  items: z.array(z.string().min(1)).min(1),
  bullet: z.string().default("•"), // put "" for no bullet
  spacing: positive.default(1.6), // distance between lines, in font sizes
});

const arrow = z.strictObject({
  type: z.literal("arrow"),
  ...common,
  from: z.string().min(1), // id of the element the arrow starts at
  to: z.string().min(1), // id of the element it points to
  bend: z.number().optional(), // sideways bend of the middle
  head: z.enum(["end", "both", "none"]).default("end"),
  label: z.string().optional(),
});

// A free line between two points (percent of the frame): dividers,
// underlines. Use an arrow with "head": "none" to connect two elements.
const line = z.strictObject({
  type: z.literal("line"),
  ...common,
  x1: percent,
  y1: percent,
  x2: percent,
  y2: percent,
  bend: z.number().optional(),
});

// A hand-drawn ring around another element, to point at it.
const ring = z.strictObject({
  type: z.literal("ring"),
  ...common,
  target: z.string().min(1), // id of the element to circle
  padding: z.number().min(0).default(4), // percent of the shorter side
});

const icon = z.strictObject({
  type: z.literal("icon"),
  ...common,
  ...filled,
  name: z.enum(ICON_NAMES),
  x: percent,
  y: percent,
  size: positive.default(15), // side of the icon's square
  label: z.string().optional(), // written underneath
});

export const elementSchema = z.discriminatedUnion("type", [
  box,
  circle,
  ellipse,
  diamond,
  triangle,
  text,
  list,
  arrow,
  line,
  ring,
  icon,
]);

export const sceneSchema = z.strictObject({
  id: z.string().min(1),
  // Seconds. Optional in a video with a voiceover: the scene then lasts as
  // long as its narration plus "pause" (or "duration", if that is longer).
  duration: positive.optional(),
  // Silence after the narration before the next scene, in seconds.
  pause: z.number().min(0).default(0.5),
  narration: z.string(), // the one sentence this scene illustrates
  // Keep the previous scene's drawing instead of wiping the board.
  keepPrevious: z.boolean().default(false),
  elements: z.array(elementSchema),
});

export const videoSchema = z.strictObject({
  version: z.literal(1),
  title: z.string().min(1),
  // Frame shape: "portrait" (9:16) or "landscape" (16:9).
  format: z.enum(FORMAT_NAMES).default("portrait"),
  // Narrate every scene's line with text-to-speech (npm run voice -- <id>).
  // Each scene then lasts as long as its audio plus its pause.
  voiceover: z.boolean().default(false),
  voice: z.string().min(1).optional(), // a Piper voice; default bryce
  fps: z.number().int().positive().default(30),
  scenes: z.array(sceneSchema).min(1),
});

// What a scene file may contain (defaults still optional)...
export type VideoInput = z.input<typeof videoSchema>;
// ...and what the engine works with after parsing (defaults filled in).
export type Video = z.output<typeof videoSchema>;
export type Scene = z.output<typeof sceneSchema>;
export type SceneElement = z.output<typeof elementSchema>;
