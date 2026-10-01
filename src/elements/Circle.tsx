import { useMemo } from "react";
import rough from "roughjs";
import { strokeTrack, type HandTrack } from "../animation/hand";
import { labelFor, Text, textTrack } from "./Text";
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
    label?: string; // written in once the outline is finished
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

// Outline first, then the label.
export const circleTracks = (
  props: CircleProps,
  frame: FrameSize,
): HandTrack[] => {
  const label = labelFor(props);
  return [
    strokeTrack(circleStrokes(props, frame), props.start, props.draw),
    ...(label ? [textTrack(label, frame)] : []),
  ];
};

export const Circle: React.FC<CircleProps> = (props) => {
  const { width, height } = useFrameUnits();
  const t = useDrawProgress(props);
  const { x, y, size, seed } = props;

  const strokes = useMemo(
    () => circleStrokes({ x, y, size, seed }, { width, height }),
    [x, y, size, seed, width, height],
  );
  const label = labelFor(props);

  return (
    <>
      <StrokePaths strokes={strokes} t={t} color={props.color} />
      {label ? <Text {...label} /> : null}
    </>
  );
};
