import { loadFont } from "@remotion/google-fonts/Caveat";
import { writingTrack, type HandTrack } from "../animation/hand";
import { LABEL_SIZE, LABEL_WRITE_SECONDS } from "../animation/labels";
import {
  INK,
  unitOf,
  useDrawProgress,
  useFrameUnits,
  type Colored,
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

export type TextProps = Timing &
  Colored & {
    x: number; // centre (or left edge, see align), percent of the frame
    y: number; // vertical centre
    size: number; // font size, percent of the frame's shorter side
    text: string;
    align?: "center" | "left"; // default centre; lists use left
  };

// Roughly how wide a line of text is, in pixels.
export const textWidth = (text: string, fontSize: number) =>
  text.length * LETTER_WIDTH * fontSize;

// A shape's label: written at (x, y) in the shape's colour once the shape
// is finished.
export const labelFor = ({
  x,
  y,
  label,
  color,
  start,
  draw,
}: Timing &
  Colored & { x: number; y: number; label?: string }): TextProps | null =>
  label
    ? {
        x,
        y,
        size: LABEL_SIZE,
        text: label,
        color,
        start: start + draw,
        draw: LABEL_WRITE_SECONDS,
      }
    : null;

export const textTrack = (
  { x, y, size, text, align = "center", start, draw }: TextProps,
  frame: FrameSize,
): HandTrack => {
  const fontSize = size * unitOf(frame);
  const width = textWidth(text, fontSize);
  const left = (x / 100) * frame.width;
  return writingTrack(
    {
      x: align === "left" ? left : left - width / 2,
      y: (y / 100) * frame.height + 0.15 * fontSize,
    },
    width,
    text.length,
    0.12 * fontSize,
    start,
    draw,
  );
};

export const Text: React.FC<TextProps> = ({
  x,
  y,
  size,
  text,
  color = INK,
  align = "center",
  ...timing
}) => {
  const { unit } = useFrameUnits();
  const written = useDrawProgress(timing) * 100;
  if (written === 0) return null;

  return (
    <div
      className={`absolute -translate-y-1/2 whitespace-nowrap ${
        align === "center" ? "-translate-x-1/2" : ""
      }`}
      style={{
        left: `${x}%`,
        // Left-aligned text starts exactly at x despite the padding below.
        marginLeft: align === "left" ? "-0.25em" : undefined,
        top: `${y}%`,
        fontFamily,
        fontWeight: 700,
        fontSize: size * unit,
        color,
        // Handwriting glyphs reach past their letter box (the tail of a
        // final "d"); padding keeps them inside the reveal's clip.
        padding: "0 0.25em",
        clipPath: `inset(0 ${100 - written}% 0 0)`,
      }}
    >
      {text}
    </div>
  );
};
