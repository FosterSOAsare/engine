import { useMemo } from "react";
import rough from "roughjs";
import { Text } from "./Text";
import {
  roughStyle,
  StrokePaths,
  toStrokes,
  useDrawProgress,
  useFrameUnits,
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

export const Box: React.FC<BoxProps> = ({
  x,
  y,
  w,
  h,
  seed,
  label,
  ...timing
}) => {
  const { width, height, unit } = useFrameUnits();
  const t = useDrawProgress(timing);

  const strokes = useMemo(() => {
    const generator = rough.generator();
    const pw = w * unit;
    const ph = h * unit;
    return toStrokes(generator, [
      generator.rectangle(
        (x / 100) * width - pw / 2,
        (y / 100) * height - ph / 2,
        pw,
        ph,
        roughStyle(seed),
      ),
    ]);
  }, [x, y, w, h, seed, width, height, unit]);

  return (
    <>
      <StrokePaths strokes={strokes} t={t} />
      {label ? (
        <Text
          x={x}
          y={y}
          size={LABEL_SIZE}
          text={label}
          start={timing.start + timing.draw}
          draw={LABEL_WRITE_SECONDS}
        />
      ) : null}
    </>
  );
};
