import { useMemo } from "react";
import rough from "roughjs";
import { strokeTrack, type HandTrack } from "../animation/hand";
import { LABEL_SIZE } from "../animation/labels";
import { ICONS, type IconName } from "./icons";
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

// Small pictures drawn in the same sketchy style as the shapes, so they
// never clash with them. Each icon is a few simple shapes, drawn in order,
// inside a square of side `size`. The drawings live in ./icons, one file
// per icon.

export type IconProps = Timing &
  Colored & {
    name: IconName;
    x: number; // centre, percent of the frame
    y: number;
    size: number; // side of the icon's square, percent of the shorter side
    seed: number;
    label?: string; // written underneath once the icon is finished
  };

type IconShape = Pick<IconProps, "name" | "x" | "y" | "size" | "seed">;

export const iconStrokes = (
  { name, x, y, size, seed }: IconShape,
  frame: FrameSize,
) => {
  const g = rough.generator();
  const side = size * unitOf(frame);
  const left = (x / 100) * frame.width - side / 2;
  const top = (y / 100) * frame.height - side / 2;
  return toStrokes(
    g,
    ICONS[name]({
      g,
      o: roughStyle(seed),
      X: (u) => left + u * side,
      Y: (u) => top + u * side,
      S: (u) => u * side,
    }),
  );
};

// The label goes under the icon, not on top of it.
const iconLabel = (props: IconProps, frame: FrameSize) => {
  const unit = unitOf(frame);
  const below = (props.size / 2 + LABEL_SIZE * 0.7) * unit;
  return labelFor({ ...props, y: props.y + (below / frame.height) * 100 });
};

export const iconTracks = (props: IconProps, frame: FrameSize): HandTrack[] => {
  const label = iconLabel(props, frame);
  return [
    strokeTrack(iconStrokes(props, frame), props.start, props.draw),
    ...(label ? [textTrack(label, frame)] : []),
  ];
};

export const Icon: React.FC<IconProps> = (props) => {
  const { width, height } = useFrameUnits();
  const t = useDrawProgress(props);
  const { name, x, y, size, seed } = props;

  const strokes = useMemo(
    () => iconStrokes({ name, x, y, size, seed }, { width, height }),
    [name, x, y, size, seed, width, height],
  );
  const label = iconLabel(props, { width, height });

  return (
    <>
      <StrokePaths strokes={strokes} t={t} color={props.color} />
      {label ? <Text {...label} /> : null}
    </>
  );
};
