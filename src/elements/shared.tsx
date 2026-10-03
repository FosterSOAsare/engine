import { createContext, useContext } from "react";
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

// The pen on a board: its thickness in pixels and Rough.js's wobble.
// Landscape boards (which set a detail) draw with a steadier hand, so
// tables and long lines stay neat.
export const penOf = ({ detail }: FrameSize) => ({
  width: STROKE_WIDTH * (detail ?? 1),
  roughness: detail !== undefined ? 0.7 : 1.2,
});

export const roughStyle = (seed: number, frame: FrameSize): Options => ({
  stroke: INK,
  strokeWidth: penOf(frame).width,
  roughness: penOf(frame).roughness,
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

export const shapeStyle = (
  seed: number,
  frame: FrameSize,
  filled: Filled = {},
): Options => ({
  ...roughStyle(seed, frame),
  ...(filled.fill
    ? {
        fill: filled.fill,
        fillStyle: filled.fillStyle ?? "solid",
        fillWeight: penOf(frame).width * 0.5,
        hachureGap: penOf(frame).width * 2.5,
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
// "detail" below 1 makes everything on the board smaller (sizes, labels,
// the pen) so more fits: landscape videos use 0.5 (layout/canvas.ts).
export type FrameSize = { width: number; height: number; detail?: number };

// The size unit: 1% of the frame's shorter side, in pixels, times the
// board's detail.
export const unitOf = ({ width, height, detail = 1 }: FrameSize) =>
  (Math.min(width, height) / 100) * detail;

// The board elements are laid out on. Usually the whole frame; when a
// video is shown in another format, its boards keep the shape they were
// written for and are scaled into place (see layout/fit.ts).
const BoardSizeContext = createContext<FrameSize | null>(null);
export const BoardSize = BoardSizeContext.Provider;

export const useBoardSize = (): FrameSize => {
  const { width, height } = useVideoConfig();
  return useContext(BoardSizeContext) ?? { width, height };
};

export const useFrameUnits = () => {
  const { width, height, detail = 1 } = useBoardSize();
  return { width, height, detail, unit: unitOf({ width, height, detail }) };
};

// The element's progress from 0 (not started) to 1 (finished).
// A "pop" video has no drawing: everything is complete the moment it
// starts (and pops in, see PopIn in SceneVideo.tsx).
const PopStyleContext = createContext(false);
export const PopStyle = PopStyleContext.Provider;
export const usePopStyle = () => useContext(PopStyleContext);

export const useDrawProgress = ({ start, draw }: Timing) => {
  const frame = useCurrentFrame();
  const pop = useContext(PopStyleContext);
  const from = secondsToFrames(start);
  if (pop) return frame >= from ? 1 : 0;
  // Something drawn in no time (a table's header fill) is just there.
  if (secondsToFrames(start + draw) <= from) return frame >= from ? 1 : 0;
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

// The fill, fading in over FILL_FADE_SECONDS from `from` (seconds). In a
// "pop" video it is simply there from `from`, with its outline.
export const FillPaths: React.FC<{
  fills: FillPath[];
  fill: string;
  from: number;
}> = ({ fills, fill, from }) => {
  const frame = useCurrentFrame();
  const board = useBoardSize();
  const { width, height } = board;
  const pop = usePopStyle();
  const opacity = pop
    ? frame >= secondsToFrames(from)
      ? 1
      : 0
    : interpolate(
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
              strokeWidth={penOf(board).width * 0.5}
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
  const board = useBoardSize();
  const { width, height } = board;
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
              strokeWidth={penOf(board).width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ),
        )}
      </svg>
    </AbsoluteFill>
  );
};
