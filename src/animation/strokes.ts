import { getLength } from "@remotion/paths";
import { Easing } from "remotion";

// Rough.js returns one path holding several strokes. Each "M" (move-to)
// starts a new stroke, so splitting there lets us draw them one at a time.
export const splitStrokes = (d: string): string[] =>
  d
    .split(/(?=M)/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

export type Stroke = { d: string; length: number };

export const measureStrokes = (ds: string[]): Stroke[] =>
  ds.map((d) => ({ d, length: getLength(d) }));

// People slow down when starting and finishing a line.
export const HAND_EASING = Easing.inOut(Easing.quad);

type Ease = (x: number) => number;

// Strokes are drawn one after another; each gets a share of the element's
// time proportional to its length, so the pen moves at a constant speed.
// Returns each stroke's window as fractions (0 to 1) of the element's time.
const strokeWindows = (strokes: Stroke[]) => {
  const total = strokes.reduce((sum, s) => sum + s.length, 0);
  let start = 0;
  return strokes.map((stroke) => {
    const share = total === 0 ? 0 : stroke.length / total;
    const window = { start, share };
    start += share;
    return window;
  });
};

// How much of each stroke is drawn (0 to 1) at a given moment.
// `t` is the element's progress from 0 to 1. Each stroke eases in and out
// like a hand.
export const strokeProgress = (
  strokes: Stroke[],
  t: number,
  ease: Ease = HAND_EASING,
): number[] =>
  strokeWindows(strokes).map(({ start, share }) => {
    if (share === 0) return t > start ? 1 : 0;
    const local = (t - start) / share;
    if (local <= 0) return 0;
    if (local >= 1) return 1;
    return ease(local);
  });

// Where the pen is: which stroke it is drawing and how far along it (0 to 1,
// eased the same way as strokeProgress). null while the element is not
// being drawn, i.e. before it starts and once it is finished.
export type Pen = { stroke: number; progress: number };

export const penPosition = (
  strokes: Stroke[],
  t: number,
  ease: Ease = HAND_EASING,
): Pen | null => {
  if (t <= 0 || t >= 1) return null;
  const windows = strokeWindows(strokes);
  const index = windows.findIndex(
    ({ start, share }) => share > 0 && t >= start && t < start + share,
  );
  if (index === -1) return null;
  const { start, share } = windows[index];
  return { stroke: index, progress: ease((t - start) / share) };
};
