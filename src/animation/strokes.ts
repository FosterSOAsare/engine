import { getLength, getPointAtLength } from "@remotion/paths";
import { Easing } from "remotion";

export type Point = { x: number; y: number };

// Rough.js returns one path holding several strokes. Each "M" (move-to)
// starts a new stroke, so splitting there lets us draw them one at a time.
export const splitStrokes = (d: string): string[] =>
  d
    .split(/(?=M)/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

export type Stroke = { d: string; length: number; start: Point; end: Point };

// getPointAtLength returns null for an empty path.
const pointAt = (d: string, length: number): Point =>
  getPointAtLength(d, length) ?? { x: 0, y: 0 };

export const measureStrokes = (ds: string[]): Stroke[] =>
  ds.map((d) => {
    const length = getLength(d);
    return {
      d,
      length,
      start: pointAt(d, 0),
      end: pointAt(d, length),
    };
  });

// People slow down when starting and finishing a line.
export const HAND_EASING = Easing.inOut(Easing.quad);

// Between strokes the pen is lifted and moved to the next stroke's start.
// It moves faster in the air than when drawing.
const PEN_UP_SPEEDUP = 3;

type Ease = (x: number) => number;

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

// Strokes are drawn one after another, the pen moving at a constant speed:
// each stroke gets a share of the element's time proportional to its
// length, and each pen lift a share proportional to the distance it travels.
// Returns these windows as fractions (0 to 1) of the element's time.
const strokeWindows = (strokes: Stroke[]) => {
  const lifts = strokes.map((stroke, i) =>
    i === 0 ? 0 : distance(strokes[i - 1].end, stroke.start) / PEN_UP_SPEEDUP,
  );
  const total =
    strokes.reduce((sum, s) => sum + s.length, 0) +
    lifts.reduce((sum, l) => sum + l, 0);
  let at = 0;
  return strokes.map((stroke, i) => {
    const liftStart = at;
    const lift = total === 0 ? 0 : lifts[i] / total;
    at += lift;
    const start = at;
    const share = total === 0 ? 0 : stroke.length / total;
    at += share;
    return { liftStart, lift, start, share };
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

// Where the pen is: drawing stroke `stroke` (progress 0 to 1 along it,
// eased the same way as strokeProgress), or lifted and moving to the start
// of stroke `stroke` (progress 0 to 1 of the move). null while the element
// is not being drawn, i.e. before it starts and once it is finished.
export type Pen = {
  state: "drawing" | "lifted";
  stroke: number;
  progress: number;
};

export const penPosition = (
  strokes: Stroke[],
  t: number,
  ease: Ease = HAND_EASING,
): Pen | null => {
  if (t <= 0 || t >= 1) return null;
  const windows = strokeWindows(strokes);
  for (let i = 0; i < windows.length; i++) {
    const { liftStart, lift, start, share } = windows[i];
    if (lift > 0 && t >= liftStart && t < start) {
      return {
        state: "lifted",
        stroke: i,
        progress: ease((t - liftStart) / lift),
      };
    }
    if (share > 0 && t >= start && t < start + share) {
      return { state: "drawing", stroke: i, progress: ease((t - start) / share) };
    }
  }
  return null;
};

// The point on the board under the pen tip, or null when not drawing.
export const penPoint = (
  strokes: Stroke[],
  t: number,
  ease: Ease = HAND_EASING,
): Point | null => {
  const pen = penPosition(strokes, t, ease);
  if (!pen) return null;
  const stroke = strokes[pen.stroke];
  if (pen.state === "drawing") {
    return pointAt(stroke.d, pen.progress * stroke.length);
  }
  const from = strokes[pen.stroke - 1].end;
  return {
    x: from.x + (stroke.start.x - from.x) * pen.progress,
    y: from.y + (stroke.start.y - from.y) * pen.progress,
  };
};
