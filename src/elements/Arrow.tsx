import { useMemo } from "react";
import rough from "roughjs";
import {
  roughStyle,
  StrokePaths,
  toStrokes,
  useDrawProgress,
  useFrameUnits,
  type Point,
  type Timing,
} from "./shared";

const HEAD_LENGTH = 6; // percent of the frame's shorter side
const HEAD_ANGLE = Math.PI / 6; // 30 degrees either side of the shaft

export type ArrowProps = Timing & {
  from: Point; // percent of the frame
  to: Point; // the tip
  // Pushes the middle of the shaft sideways (percent of the shorter side,
  // positive bends to the left of the direction of travel). A slight bend
  // looks more hand-drawn than a ruler-straight line.
  bend?: number;
  seed: number;
};

// The shaft is drawn first, then the two sides of the head. Strokes are
// timed by length, so the short head takes a small part of the draw time.
export const Arrow: React.FC<ArrowProps> = ({
  from,
  to,
  bend = 0,
  seed,
  ...timing
}) => {
  const { width, height, unit } = useFrameUnits();
  const t = useDrawProgress(timing);

  const strokes = useMemo(() => {
    const generator = rough.generator();
    const options = roughStyle(seed);
    const start = { x: (from.x / 100) * width, y: (from.y / 100) * height };
    const end = { x: (to.x / 100) * width, y: (to.y / 100) * height };

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

    // The head follows the direction the shaft arrives in. For a curve that
    // is roughly the direction from the bent midpoint to the tip.
    const angle = Math.atan2(end.y - mid.y, end.x - mid.x);
    const headPoint = (side: number) => ({
      x: end.x - HEAD_LENGTH * unit * Math.cos(angle + side * HEAD_ANGLE),
      y: end.y - HEAD_LENGTH * unit * Math.sin(angle + side * HEAD_ANGLE),
    });
    const left = headPoint(1);
    const right = headPoint(-1);

    return toStrokes(generator, [
      shaft,
      generator.line(left.x, left.y, end.x, end.y, options),
      generator.line(right.x, right.y, end.x, end.y, options),
    ]);
  }, [from.x, from.y, to.x, to.y, bend, seed, width, height, unit]);

  return <StrokePaths strokes={strokes} t={t} />;
};
