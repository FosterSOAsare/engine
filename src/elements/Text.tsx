import { loadFont } from "@remotion/google-fonts/Caveat";
import { INK, useDrawProgress, useFrameUnits, type Timing } from "./shared";

// Fonts are filled shapes, not strokes, so text cannot use the stroke
// reveal. Instead it is uncovered left to right, like writing.

// Remotion waits for the font before rendering a frame.
const { fontFamily } = loadFont("normal", {
  weights: ["700"],
  subsets: ["latin"],
});

type TextProps = Timing & {
  x: number; // centre, percent of the frame
  y: number;
  size: number; // font size, percent of the frame's shorter side
  text: string;
};

export const Text: React.FC<TextProps> = ({ x, y, size, text, ...timing }) => {
  const { unit } = useFrameUnits();
  const written = useDrawProgress(timing) * 100;
  if (written === 0) return null;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        fontFamily,
        fontWeight: 700,
        fontSize: size * unit,
        color: INK,
        clipPath: `inset(0 ${100 - written}% 0 0)`,
      }}
    >
      {text}
    </div>
  );
};
