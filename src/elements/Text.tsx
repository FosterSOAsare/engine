import { loadFont } from "@remotion/google-fonts/Caveat";
import { writingTrack, type HandTrack } from "../animation/hand";
import {
  INK,
  unitOf,
  useDrawProgress,
  useFrameUnits,
  type FrameSize,
  type Timing,
} from "./shared";

// Fonts are filled shapes, not strokes, so text cannot use the stroke
// reveal. Instead it is uncovered left to right, like writing.

// Remotion waits for the font before rendering a frame.
const { fontFamily } = loadFont("normal", {
  weights: ["700"],
  subsets: ["latin"],
});

// Average Caveat letter width, as a fraction of the font size. Only used to
// guide the hand, so an estimate is enough.
const LETTER_WIDTH = 0.38;

export type TextProps = Timing & {
  x: number; // centre, percent of the frame
  y: number;
  size: number; // font size, percent of the frame's shorter side
  text: string;
};

export const textTrack = (
  { x, y, size, text, start, draw }: TextProps,
  frame: FrameSize,
): HandTrack => {
  const fontSize = size * unitOf(frame);
  const width = text.length * LETTER_WIDTH * fontSize;
  return writingTrack(
    {
      x: (x / 100) * frame.width - width / 2,
      y: (y / 100) * frame.height + 0.15 * fontSize,
    },
    width,
    text.length,
    0.12 * fontSize,
    start,
    draw,
  );
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
