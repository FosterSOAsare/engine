import { useMemo } from "react";
import rough from "roughjs";
import {
  roughStyle,
  StrokePaths,
  toStrokes,
  useDrawProgress,
  useFrameUnits,
  type Timing,
} from "./shared";

export type CircleProps = Timing & {
  x: number; // centre, percent of the frame
  y: number;
  size: number; // diameter, percent of the frame's shorter side
  seed: number;
};

// Rough.js draws a circle as one long stroke that overlaps its start a
// little, then a second pass, so it reads as drawn in one motion.
export const Circle: React.FC<CircleProps> = ({
  x,
  y,
  size,
  seed,
  ...timing
}) => {
  const { width, height, unit } = useFrameUnits();
  const t = useDrawProgress(timing);

  const strokes = useMemo(() => {
    const generator = rough.generator();
    return toStrokes(generator, [
      generator.circle(
        (x / 100) * width,
        (y / 100) * height,
        size * unit,
        roughStyle(seed),
      ),
    ]);
  }, [x, y, size, seed, width, height, unit]);

  return <StrokePaths strokes={strokes} t={t} />;
};
