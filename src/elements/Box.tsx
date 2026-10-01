import { useMemo } from "react";
import rough from "roughjs";
import { strokeTrack, type HandTrack } from "../animation/hand";
import { Text, textTrack, type TextProps } from "./Text";
import {
  roughStyle,
  StrokePaths,
  toStrokes,
  unitOf,
  useDrawProgress,
  useFrameUnits,
  type FrameSize,
  type Timing,
} from "./shared";

const LABEL_SIZE = 9; // percent of the frame's shorter side
const LABEL_WRITE_SECONDS = 0.5;

export type BoxProps = Timing & {
  x: number; // centre, percent of the frame
  y: number;
  w: number; // percent of the frame's shorter side
  h: number;
  seed: number;
  label?: string; // written in once the outline is finished
};

type BoxShape = Pick<BoxProps, "x" | "y" | "w" | "h" | "seed">;

export const boxStrokes = (
  { x, y, w, h, seed }: BoxShape,
  frame: FrameSize,
) => {
  const generator = rough.generator();
  const unit = unitOf(frame);
  const pw = w * unit;
  const ph = h * unit;
  return toStrokes(generator, [
    generator.rectangle(
      (x / 100) * frame.width - pw / 2,
      (y / 100) * frame.height - ph / 2,
      pw,
      ph,
      roughStyle(seed),
    ),
  ]);
};

const labelOf = ({ x, y, label, start, draw }: BoxProps): TextProps | null =>
  label
    ? {
        x,
        y,
        size: LABEL_SIZE,
        text: label,
        start: start + draw,
        draw: LABEL_WRITE_SECONDS,
      }
    : null;

// Outline first, then the label.
export const boxTracks = (props: BoxProps, frame: FrameSize): HandTrack[] => {
  const label = labelOf(props);
  return [
    strokeTrack(boxStrokes(props, frame), props.start, props.draw),
    ...(label ? [textTrack(label, frame)] : []),
  ];
};

export const Box: React.FC<BoxProps> = (props) => {
  const { width, height } = useFrameUnits();
  const t = useDrawProgress(props);
  const { x, y, w, h, seed } = props;

  const strokes = useMemo(
    () => boxStrokes({ x, y, w, h, seed }, { width, height }),
    [x, y, w, h, seed, width, height],
  );
  const label = labelOf(props);

  return (
    <>
      <StrokePaths strokes={strokes} t={t} />
      {label ? <Text {...label} /> : null}
    </>
  );
};
