import { useMemo } from "react";
import rough from "roughjs";
import type { Drawable } from "roughjs/bin/core";
import { strokeTrack, type HandTrack } from "../animation/hand";
import { LABEL_SIZE } from "../animation/labels";
import { ICONS, type IconName } from "./icons";
import { scalePath } from "./icons/types";
import { labelFor, Text, textTrack } from "./Text";
import {
  FillPaths,
  shapeStyle,
  StrokePaths,
  toSketch,
  unitOf,
  useDrawProgress,
  useFrameUnits,
  type Colored,
  type Filled,
  type FrameSize,
  type Timing,
} from "./shared";

// Every closed shape works the same way: the hand draws the outline, the
// fill (if any) fades in, then the label is written. Only the outline
// differs, so they share this one element.

const ICON_ROUGHNESS = 0.5;

export type ShapeKind =
  | "box"
  | "circle"
  | "ellipse"
  | "diamond"
  | "triangle"
  | "icon";

export type ShapeProps = Timing &
  Colored &
  Filled & {
    kind: ShapeKind;
    x: number; // centre, percent of the frame
    y: number;
    w: number; // width and height, percent of the frame's shorter side
    h: number;
    seed: number;
    icon?: IconName; // for kind "icon"
    label?: string;
    // false: only the fill, fading in at start + draw, with no outline for
    // the hand to draw (a table's header background).
    outline?: boolean;
  };

type Outline = Pick<ShapeProps, "kind" | "x" | "y" | "w" | "h" | "icon">;

// The outline as Rough.js drawings, in pixels.
const outline = (
  { kind, x, y, w, h, icon }: Outline,
  g: ReturnType<typeof rough.generator>,
  o: ReturnType<typeof shapeStyle>,
  frame: FrameSize,
): Drawable[] => {
  const unit = unitOf(frame);
  const cx = (x / 100) * frame.width;
  const cy = (y / 100) * frame.height;
  const pw = w * unit;
  const ph = h * unit;
  const left = cx - pw / 2;
  const top = cy - ph / 2;

  switch (kind) {
    case "box":
      return [g.rectangle(left, top, pw, ph, o)];
    case "circle":
    case "ellipse":
      return [g.ellipse(cx, cy, pw, ph, o)];
    case "diamond":
      return [
        g.polygon(
          [
            [cx, top],
            [left + pw, cy],
            [cx, top + ph],
            [left, cy],
          ],
          o,
        ),
      ];
    case "triangle":
      return [
        g.polygon(
          [
            [cx, top],
            [left + pw, top + ph],
            [left, top + ph],
          ],
          o,
        ),
      ];
    case "icon": {
      const X = (u: number) => left + u * pw;
      const Y = (u: number) => top + u * ph;
      return ICONS[icon ?? "user"]({
        g,
        o,
        X,
        Y,
        S: (u) => u * pw,
        P: (d) => scalePath(d, X, Y),
      });
    }
  }
};

export const shapeSketch = (props: ShapeProps, frame: FrameSize) => {
  const g = rough.generator();
  const style = shapeStyle(props.seed, frame, props);
  // Icons are small and detailed: the wobble that makes a big box look
  // hand-drawn distorts them, so they get a gentler one.
  if (props.kind === "icon") style.roughness = ICON_ROUGHNESS;
  return toSketch(g, outline(props, g, style, frame));
};

// Where the label goes: in the middle, except under an icon and low in a
// triangle (where it has room).
export const shapeLabel = (props: ShapeProps, frame: FrameSize) => {
  const unit = unitOf(frame);
  const toPercentY = (pixels: number) => (pixels / frame.height) * 100;
  const y =
    props.kind === "icon"
      ? props.y + toPercentY((props.h / 2 + LABEL_SIZE * 0.7) * unit)
      : props.kind === "triangle"
        ? props.y + toPercentY((props.h / 6) * unit)
        : props.y;
  return labelFor({ ...props, y });
};

// Outline first, then the label (the fill needs no hand).
export const shapeTracks = (
  props: ShapeProps,
  frame: FrameSize,
): HandTrack[] => {
  const label = shapeLabel(props, frame);
  return [
    ...(props.outline === false
      ? []
      : [strokeTrack(shapeSketch(props, frame).strokes, props.start, props.draw)]),
    ...(label ? [textTrack(label, frame)] : []),
  ];
};

export const Shape: React.FC<ShapeProps> = (props) => {
  const { width, height, detail } = useFrameUnits();
  const t = useDrawProgress(props);
  const { kind, x, y, w, h, icon, seed, fill, fillStyle } = props;

  const sketch = useMemo(
    () =>
      shapeSketch(
        { kind, x, y, w, h, icon, seed, fill, fillStyle, start: 0, draw: 0 },
        { width, height, detail },
      ),
    [kind, x, y, w, h, icon, seed, fill, fillStyle, width, height, detail],
  );
  const label = shapeLabel(props, { width, height, detail });

  return (
    <>
      {fill ? (
        <FillPaths
          fills={sketch.fills}
          fill={fill}
          from={props.start + props.draw}
        />
      ) : null}
      {props.outline === false ? null : (
        <StrokePaths strokes={sketch.strokes} t={t} color={props.color} />
      )}
      {label ? <Text {...label} /> : null}
    </>
  );
};
