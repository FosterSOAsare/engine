import { z } from "zod";
import { ASSET_NAMES } from "../assets";
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
  // When drawing begins, in seconds into the scene. Or "at": a word of the
  // narration ("resolver", "resolver#2" for its second time) to start on.
  // With neither, a narrated element starts when its label or text is
  // said, or right after the previous element.
  start: seconds.optional(),
  at: z.string().min(1).optional(),
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
  // "left": x is where the text starts instead of its centre.
  align: z.enum(["center", "left"]).default("center"),
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
  itemGap: z.number().min(0).default(0.5), // seconds of pause between items
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

// A design from public/assets/ (npm run assets), by name, e.g.
// "peeps/standing/12" or "tech/laptop". Its height follows its shape.
const image = z.strictObject({
  type: z.literal("image"),
  ...common,
  name: z.enum(ASSET_NAMES),
  x: percent, // centre
  y: percent,
  w: positive.default(25), // width, percent of the shorter side
  // "draw": the hand traces its lines, then its colours fade in;
  // "fade": it fades in; "pop": it grows into place.
  reveal: z.enum(["draw", "fade", "pop"]).default("draw"),
  label: z.string().optional(), // written underneath
  // Recolouring: "fill" for every coloured area, "ink" for every line, or
  // "colors" to swap exact colours ({ "#ffffff": "#ffd8a8" }); "colors"
  // wins where both apply.
  fill: z.string().min(1).optional(),
  ink: z.string().min(1).optional(),
  colors: z.record(z.string(), z.string().min(1)).optional(),
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
  image,
]);

// New positions and sizes for an element in one format (see "layouts").
export const LAYOUT_FIELDS = [
  "x",
  "y",
  "w",
  "h",
  "size",
  "bend",
  "x1",
  "y1",
  "x2",
  "y2",
  "spacing",
] as const;
export const layoutSchema = z.strictObject({
  x: z.number().optional(),
  y: z.number().optional(),
  w: positive.optional(),
  h: positive.optional(),
  size: positive.optional(),
  bend: z.number().optional(),
  x1: z.number().optional(),
  y1: z.number().optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
  spacing: positive.optional(),
  align: z.enum(["center", "left"]).optional(),
});

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
  // The scene laid out again for other formats: per format, new positions
  // for elements by id, e.g. a row in landscape instead of a column. In
  // those formats the scene is laid out directly in that frame; elsewhere
  // it is scaled to fit (layout/fit.ts).
  layouts: z
    .partialRecord(z.enum(FORMAT_NAMES), z.record(z.string(), layoutSchema))
    .optional(),
});

export const videoSchema = z.strictObject({
  version: z.literal(1),
  title: z.string().min(1),
  // The frame shape the file is written for: "portrait" (9:16), "feed"
  // (4:5), "square" (1:1) or "landscape" (16:9). Every video can still be
  // rendered in all of them.
  format: z.enum(FORMAT_NAMES).default("portrait"),
  // Narrate every scene's line with text-to-speech (npm run voice -- <id>).
  // Each scene then lasts as long as its audio plus its pause.
  voiceover: z.boolean().default(false),
  voice: z.string().min(1).optional(), // a Piper voice; default bryce
  // Word-by-word captions of the narration (npm run captions).
  captions: z.boolean().default(true),
  // The handle in the bottom-right corner: the default from src/brand.ts,
  // other text, or false for none.
  watermark: z.union([z.string().min(1), z.literal(false)]).optional(),
  // The moment used for cover images (npm run cover): a scene id (the end
  // of that scene, fully drawn) or seconds from the start. Default: the end
  // of the first scene.
  cover: z.union([z.string().min(1), z.number().min(0)]).optional(),
  fps: z.number().int().positive().default(30),
  scenes: z.array(sceneSchema).min(1),
});

// What a scene file may contain (defaults still optional)...
export type VideoInput = z.input<typeof videoSchema>;
// ...and what the engine works with after parsing (defaults filled in).
export type Video = z.output<typeof videoSchema>;
export type Scene = z.output<typeof sceneSchema>;
export type SceneElement = z.output<typeof elementSchema>;
