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

const ease = Easing.inOut(Easing.quad);

// How much of each stroke is drawn (0 to 1) at a given moment.
// `t` is the element's progress from 0 to 1. Strokes are drawn one after
// another; each gets a share of the time proportional to its length, so the
// pen moves at a constant speed. Each stroke eases in and out like a hand.
export const strokeProgress = (strokes: Stroke[], t: number): number[] => {
  const total = strokes.reduce((sum, s) => sum + s.length, 0);
  if (total === 0) return strokes.map(() => (t > 0 ? 1 : 0));

  let start = 0;
  return strokes.map((stroke) => {
    const share = stroke.length / total;
    const local = (t - start) / share;
    start += share;
    if (local <= 0) return 0;
    if (local >= 1) return 1;
    return ease(local);
  });
};
