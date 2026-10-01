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
  type Point,
  type Timing,
} from "./shared";

const HEAD_LENGTH = 6; // percent of the frame's shorter side
const HEAD_ANGLE = Math.PI / 6; // 30 degrees either side of the shaft

export type ArrowProps = Timing &
  Colored & {
    from: Point; // percent of the frame
    to: Point; // the tip
    // Pushes the middle of the shaft sideways (percent of the shorter side,
    // positive bends to the left of the direction of travel). A slight bend
    // looks more hand-drawn than a ruler-straight line.
    bend?: number;
    // Which ends get a head: "end" (default), "both", or "none" for a
    // plain line.
    head?: ArrowHead;
    seed: number;
  };

export type ArrowHead = "end" | "both" | "none";

type ArrowShape = Pick<ArrowProps, "from" | "to" | "bend" | "head" | "seed">;

// The shaft is drawn first, then the two sides of each head. Strokes are
// timed by length, so the short heads take a small part of the draw time.
export const arrowStrokes = (
  { from, to, bend = 0, head = "end", seed }: ArrowShape,
  frame: FrameSize,
) => {
  const generator = rough.generator();
  const options = roughStyle(seed);
  const unit = unitOf(frame);
  const start = {
    x: (from.x / 100) * frame.width,
    y: (from.y / 100) * frame.height,
  };
  const end = { x: (to.x / 100) * frame.width, y: (to.y / 100) * frame.height };

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const mid = {
    x: (start.x + end.x) / 2 + (dy / length) * bend * unit,
    y: (start.y + end.y) / 2 - (dx / length) * bend * unit,
  };

  const shaft =
    bend === 0
      ? generator.line(start.x, start.y, end.x, end.y, options)
      : generator.curve(
          [
            [start.x, start.y],
            [mid.x, mid.y],
            [end.x, end.y],
          ],
          options,
        );

  // A head follows the direction the shaft arrives in. For a curve that
  // is roughly the direction from the bent midpoint to the tip.
  const headAt = (tip: { x: number; y: number }) => {
    const angle = Math.atan2(tip.y - mid.y, tip.x - mid.x);
    return [1, -1].map((side) =>
      generator.line(
        tip.x - HEAD_LENGTH * unit * Math.cos(angle + side * HEAD_ANGLE),
        tip.y - HEAD_LENGTH * unit * Math.sin(angle + side * HEAD_ANGLE),
        tip.x,
        tip.y,
        options,
      ),
    );
  };

  return toStrokes(generator, [
    shaft,
    ...(head !== "none" ? headAt(end) : []),
    ...(head === "both" ? headAt(start) : []),
  ]);
};

export const arrowTracks = (
  props: ArrowProps,
  frame: FrameSize,
): HandTrack[] => [
  strokeTrack(arrowStrokes(props, frame), props.start, props.draw),
];

export const Arrow: React.FC<ArrowProps> = ({
  from,
  to,
  bend,
  head,
  seed,
  color,
  ...timing
}) => {
  const { width, height } = useFrameUnits();
  const t = useDrawProgress(timing);

  // Depend on the coordinates, not the objects, which are new each render.
  const { x: fromX, y: fromY } = from;
  const { x: toX, y: toY } = to;
  const strokes = useMemo(
    () =>
      arrowStrokes(
        {
          from: { x: fromX, y: fromY },
          to: { x: toX, y: toY },
          bend,
          head,
          seed,
        },
        { width, height },
      ),
    [fromX, fromY, toX, toY, bend, head, seed, width, height],
  );

  return <StrokePaths strokes={strokes} t={t} color={color} />;
};
