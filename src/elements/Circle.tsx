import { useMemo } from "react";
import rough from "roughjs";
import { strokeTrack, type HandTrack } from "../animation/hand";
import {
  roughStyle,
  StrokePaths,
  toStrokes,
  unitOf,
  useDrawProgress,
  useFrameUnits,
  type Colored,
  type FrameSize,
  type Timing,
} from "./shared";

export type CircleProps = Timing &
  Colored & {
    x: number; // centre, percent of the frame
    y: number;
    size: number; // diameter, percent of the frame's shorter side
    seed: number;
  };

type CircleShape = Pick<CircleProps, "x" | "y" | "size" | "seed">;

// Rough.js draws a circle as one long stroke that overlaps its start a
// little, so it reads as drawn in one motion.
export const circleStrokes = (
  { x, y, size, seed }: CircleShape,
  frame: FrameSize,
) => {
  const generator = rough.generator();
  return toStrokes(generator, [
    generator.circle(
      (x / 100) * frame.width,
      (y / 100) * frame.height,
      size * unitOf(frame),
      roughStyle(seed),
    ),
  ]);
};

export const circleTracks = (
  props: CircleProps,
  frame: FrameSize,
): HandTrack[] => [
  strokeTrack(circleStrokes(props, frame), props.start, props.draw),
];

export const Circle: React.FC<CircleProps> = ({
  x,
  y,
  size,
  seed,
  color,
  ...timing
}) => {
  const { width, height } = useFrameUnits();
  const t = useDrawProgress(timing);

  const strokes = useMemo(
    () => circleStrokes({ x, y, size, seed }, { width, height }),
    [x, y, size, seed, width, height],
  );

  return <StrokePaths strokes={strokes} t={t} color={color} />;
};
