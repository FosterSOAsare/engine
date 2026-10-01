import { z } from "zod";
import { ICON_NAMES } from "../elements/icons";

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

const box = z.strictObject({
  type: z.literal("box"),
  ...common,
  x: percent, // centre
  y: percent,
  w: positive.default(50),
  h: positive.default(22),
  label: z.string().optional(),
});

const circle = z.strictObject({
  type: z.literal("circle"),
  ...common,
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

const arrow = z.strictObject({
  type: z.literal("arrow"),
  ...common,
  from: z.string().min(1), // id of the element the arrow starts at
  to: z.string().min(1), // id of the element it points to
  bend: z.number().optional(), // sideways bend of the middle
  label: z.string().optional(),
});

const icon = z.strictObject({
  type: z.literal("icon"),
  ...common,
  name: z.enum(ICON_NAMES),
  x: percent,
  y: percent,
  size: positive.default(15),
  label: z.string().optional(),
});

export const elementSchema = z.discriminatedUnion("type", [
  box,
  circle,
  text,
  arrow,
  icon,
]);

export const sceneSchema = z.strictObject({
  id: z.string().min(1),
  // Optional because M3 sets the length from the audio; until then the
  // validator requires it.
  duration: positive.optional(),
  narration: z.string(), // the one sentence this scene illustrates
  // Keep the previous scene's drawing instead of wiping the board.
  keepPrevious: z.boolean().default(false),
  elements: z.array(elementSchema),
});

export const videoSchema = z.strictObject({
  version: z.literal(1),
  title: z.string().min(1),
  fps: z.number().int().positive().default(30),
  scenes: z.array(sceneSchema).min(1),
});

// What a scene file may contain (defaults still optional)...
export type VideoInput = z.input<typeof videoSchema>;
// ...and what the engine works with after parsing (defaults filled in).
export type Video = z.output<typeof videoSchema>;
export type Scene = z.output<typeof sceneSchema>;
export type SceneElement = z.output<typeof elementSchema>;
