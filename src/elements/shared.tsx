import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { RoughGenerator } from "roughjs/bin/generator";
import type { Drawable, Options } from "roughjs/bin/core";
import type { FillStyle } from "../schema/scene";
import {
  measureStrokes,
  splitStrokes,
  strokeProgress,
  type Stroke,
} from "../animation/strokes";
import { secondsToFrames } from "../layout/formats";

// Shared by every element. Positions are in percent of the frame (0 to 100);
// sizes are in percent of the frame's shorter side, so shapes keep their
// proportions in every format. Times are in seconds, like the scene file.

export const INK = "#222222";
export const BOARD = "#faf8f3"; // the whiteboard background
export const STROKE_WIDTH = 8;

export const roughStyle = (seed: number): Options => ({
  stroke: INK,
  strokeWidth: STROKE_WIDTH,
  roughness: 1.2,
  // One pass per line, like a single stroke of a marker (Rough.js draws
  // every line twice by default).
  disableMultiStroke: true,
  seed,
});

// A closed shape's inside: any CSS colour, painted solid or with one of
// Rough.js's sketchy patterns. It fades in once the outline is finished
// (a hachure fill is dozens of short lines, too slow to draw one by one).
export type Filled = {
  fill?: string;
  fillStyle?: FillStyle; // defaults to "solid"
};

export const FILL_FADE_SECONDS = 0.4;

export const shapeStyle = (seed: number, filled: Filled = {}): Options => ({
  ...roughStyle(seed),
  ...(filled.fill
    ? {
        fill: filled.fill,
        fillStyle: filled.fillStyle ?? "solid",
        fillWeight: STROKE_WIDTH * 0.5,
        hachureGap: STROKE_WIDTH * 2.5,
      }
    : {}),
});

export type { Point } from "../animation/strokes";

// Every element takes an optional colour for its strokes (any CSS colour).
export type Colored = {
  color?: string; // defaults to INK
};

export type Timing = {
  start: number; // seconds, when drawing begins
  draw: number; // seconds, how long drawing takes
};

// Elements build their strokes from the frame size alone, so the same
// builders serve the element itself and the hand that follows it.
export type FrameSize = { width: number; height: number };

// 1% of the frame's shorter side, in pixels.
export const unitOf = ({ width, height }: FrameSize) =>
  Math.min(width, height) / 100;

export const useFrameUnits = () => {
  const { width, height } = useVideoConfig();
  return { width, height, unit: unitOf({ width, height }) };
};

// The element's progress from 0 (not started) to 1 (finished).
export const useDrawProgress = ({ start, draw }: Timing) => {
  const frame = useCurrentFrame();
  return interpolate(
    frame,
    [secondsToFrames(start), secondsToFrames(start + draw)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
};

// A drawing split into what the hand draws (the outline, stroke by
// stroke) and what fades in afterwards (the fill).
export type FillPath = { d: string; solid: boolean };
export type Sketch = { strokes: Stroke[]; fills: FillPath[] };

export const toSketch = (
  generator: RoughGenerator,
  drawables: Drawable[],
): Sketch => {
  const sets = drawables.flatMap((drawable) => drawable.sets);
  return {
    strokes: measureStrokes(
      sets
        .filter((set) => set.type === "path")
        .flatMap((set) => splitStrokes(generator.opsToPath(set))),
    ),
    fills: sets
      .filter((set) => set.type !== "path")
      .map((set) => ({
        d: generator.opsToPath(set),
        solid: set.type === "fillPath",
      })),
  };
};

export const toStrokes = (
  generator: RoughGenerator,
  drawables: Drawable[],
): Stroke[] => toSketch(generator, drawables).strokes;

// The fill, fading in over FILL_FADE_SECONDS from `from` (seconds).
export const FillPaths: React.FC<{
  fills: FillPath[];
  fill: string;
  from: number;
}> = ({ fills, fill, from }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [secondsToFrames(from), secondsToFrames(from + FILL_FADE_SECONDS)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  if (opacity === 0 || fills.length === 0) return null;

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {fills.map((path, i) =>
          path.solid ? (
            <path key={i} d={path.d} fill={fill} stroke="none" />
          ) : (
            <path
              key={i}
              d={path.d}
              fill="none"
              stroke={fill}
              strokeWidth={STROKE_WIDTH * 0.5}
              strokeLinecap="round"
            />
          ),
        )}
      </svg>
    </AbsoluteFill>
  );
};

// Draws the strokes one after another as `t` goes from 0 to 1.
export const StrokePaths: React.FC<{
  strokes: Stroke[];
  t: number;
  color?: string;
}> = ({ strokes, t, color = INK }) => {
  const { width, height } = useVideoConfig();
  const progress = strokeProgress(strokes, t);

  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {strokes.map((stroke, i) =>
          // Skip strokes that have not started: a round line cap would
          // otherwise leave a dot where the stroke will begin.
          !(progress[i] > 0) ? null : (
            <path
              key={i}
              d={stroke.d}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - progress[i]}
              fill="none"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ),
        )}
      </svg>
    </AbsoluteFill>
  );
};
