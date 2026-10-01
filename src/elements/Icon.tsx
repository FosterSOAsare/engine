import { useMemo } from "react";
import rough from "roughjs";
import type { Drawable, Options } from "roughjs/bin/core";
import type { RoughGenerator } from "roughjs/bin/generator";
import { strokeTrack, type HandTrack } from "../animation/hand";
import { LABEL_SIZE } from "../animation/labels";
import type { IconName } from "../schema/scene";
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
// inside a square of side `size`.

export type IconProps = Timing &
  Colored & {
    name: IconName;
    x: number; // centre, percent of the frame
    y: number;
    size: number; // side of the icon's square, percent of the shorter side
    seed: number;
    label?: string; // written underneath once the icon is finished
  };

// Draws inside the icon's square: X, Y and S turn 0-to-1 icon units into
// pixels (positions and lengths).
type Pen = {
  g: RoughGenerator;
  o: Options;
  X: (u: number) => number;
  Y: (u: number) => number;
  S: (u: number) => number;
};

const ICONS: Record<IconName, (pen: Pen) => Drawable[]> = {
  user: ({ g, o, X, Y, S }) => [
    g.circle(X(0.5), Y(0.28), S(0.34), o), // head
    g.arc(X(0.5), Y(1), S(0.8), S(0.8), Math.PI, 2 * Math.PI, false, o), // shoulders
  ],
  server: ({ g, o, X, Y, S }) => [
    g.rectangle(X(0.15), Y(0.08), S(0.7), S(0.36), o),
    g.rectangle(X(0.15), Y(0.56), S(0.7), S(0.36), o),
    g.line(X(0.27), Y(0.26), X(0.42), Y(0.26), o),
    g.line(X(0.27), Y(0.74), X(0.42), Y(0.74), o),
  ],
  database: ({ g, o, X, Y, S }) => [
    g.ellipse(X(0.5), Y(0.16), S(0.7), S(0.2), o), // top
    g.line(X(0.15), Y(0.16), X(0.15), Y(0.84), o),
    g.line(X(0.85), Y(0.16), X(0.85), Y(0.84), o),
    g.arc(X(0.5), Y(0.5), S(0.7), S(0.2), 0, Math.PI, false, o), // middle
    g.arc(X(0.5), Y(0.84), S(0.7), S(0.2), 0, Math.PI, false, o), // bottom
  ],
  phone: ({ g, o, X, Y, S }) => [
    g.rectangle(X(0.28), Y(0.04), S(0.44), S(0.92), o),
    g.line(X(0.43), Y(0.84), X(0.57), Y(0.84), o), // home button
  ],
  cloud: ({ g, o, X, Y, S }) => [
    g.path(
      `M ${X(0.16)} ${Y(0.72)}` +
        ` A ${S(0.15)} ${S(0.15)} 0 0 1 ${X(0.26)} ${Y(0.44)}` +
        ` A ${S(0.22)} ${S(0.22)} 0 0 1 ${X(0.68)} ${Y(0.38)}` +
        ` A ${S(0.18)} ${S(0.18)} 0 0 1 ${X(0.84)} ${Y(0.72)} Z`,
      o,
    ),
  ],
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
