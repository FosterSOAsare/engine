import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { RoughGenerator } from "roughjs/bin/generator";
import type { Drawable, Options } from "roughjs/bin/core";
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
export const STROKE_WIDTH = 5;

export const roughStyle = (seed: number): Options => ({
  stroke: INK,
  strokeWidth: STROKE_WIDTH,
  roughness: 1.2,
  seed,
});

export type Point = { x: number; y: number };

export type Timing = {
  start: number; // seconds, when drawing begins
  draw: number; // seconds, how long drawing takes
};

// The frame size, and `unit`: 1% of the shorter side in pixels.
export const useFrameUnits = () => {
  const { width, height } = useVideoConfig();
  return { width, height, unit: Math.min(width, height) / 100 };
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

export const toStrokes = (
  generator: RoughGenerator,
  drawables: Drawable[],
): Stroke[] =>
  measureStrokes(
    drawables
      .flatMap((drawable) => generator.toPaths(drawable))
      .flatMap((path) => splitStrokes(path.d)),
  );

// Draws the strokes one after another as `t` goes from 0 to 1.
export const StrokePaths: React.FC<{ strokes: Stroke[]; t: number }> = ({
  strokes,
  t,
}) => {
  const { width, height } = useVideoConfig();
  const progress = strokeProgress(strokes, t);

  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {strokes.map((stroke, i) =>
          // Skip strokes that have not started: a round line cap would
          // otherwise leave a dot where the stroke will begin.
          progress[i] === 0 ? null : (
            <path
              key={i}
              d={stroke.d}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - progress[i]}
              fill="none"
              stroke={INK}
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
