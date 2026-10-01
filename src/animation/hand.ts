import { FPS, secondsToFrames } from "../layout/formats";
import { HAND_EASING, penPoint, type Point, type Stroke } from "./strokes";

// The hand follows whatever is being drawn. Each element hands over one or
// more tracks: a time window and the pen tip's position inside it.
export type HandTrack = {
  startFrame: number;
  endFrame: number;
  from: Point; // where the pen touches down
  to: Point; // where it lifts off at the end
  at: (t: number) => Point; // pen tip at progress t (0 to 1)
};

// Track frames are rounded exactly like the element's own drawing (see
// useDrawProgress), so the tip sits on the end of the line on every frame.
const frames = (start: number, draw: number) => ({
  startFrame: secondsToFrames(start),
  endFrame: secondsToFrames(start + draw),
});

export const strokeTrack = (
  strokes: Stroke[],
  start: number,
  draw: number,
): HandTrack => {
  const from = strokes[0]?.start ?? { x: 0, y: 0 };
  const to = strokes[strokes.length - 1]?.end ?? from;
  return {
    ...frames(start, draw),
    from,
    to,
    at: (t) => penPoint(strokes, t) ?? (t <= 0 ? from : to),
  };
};

// Writing a line of text: the tip moves left to right across it at a steady
// speed (like the reveal), bobbing up and down once per letter.
export const writingTrack = (
  left: Point,
  width: number,
  letters: number,
  bob: number,
  start: number,
  draw: number,
): HandTrack => ({
  ...frames(start, draw),
  from: left,
  to: { x: left.x + width, y: left.y },
  at: (t) => ({
    x: left.x + width * t,
    y: left.y + bob * Math.sin(t * letters * 2 * Math.PI),
  }),
});

// When the next element starts within this time, the hand moves straight
// to it; otherwise it leaves the frame and comes back just before.
const MAX_TRAVEL_FRAMES = secondsToFrames(1);
const EXIT_FRAMES = Math.round(0.4 * FPS);
const ENTER_FRAMES = Math.round(0.4 * FPS);

const lerp = (a: Point, b: Point, t: number): Point => {
  const e = HAND_EASING(Math.min(1, Math.max(0, t)));
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
};

// Where the pen tip is at `frame`. `offscreen` is a resting point out of
// view (the hand image hangs down and right from the tip).
export const handPosition = (
  tracks: HandTrack[],
  frame: number,
  offscreen: Point,
): Point => {
  const sorted = [...tracks].sort((a, b) => a.startFrame - b.startFrame);

  // Drawing: if tracks overlap, the one that started last has the pen.
  const active = sorted.filter(
    (track) => frame >= track.startFrame && frame < track.endFrame,
  );
  const current = active[active.length - 1];
  if (current) {
    const t =
      (frame - current.startFrame) / (current.endFrame - current.startFrame);
    return current.at(t);
  }

  const previous = sorted.filter((track) => track.endFrame <= frame).pop();
  const next = sorted.find((track) => track.startFrame > frame);

  if (previous && next) {
    const gap = next.startFrame - previous.endFrame;
    if (gap <= MAX_TRAVEL_FRAMES) {
      return lerp(previous.to, next.from, (frame - previous.endFrame) / gap);
    }
  }
  if (next && frame >= next.startFrame - ENTER_FRAMES) {
    const enterStart = next.startFrame - ENTER_FRAMES;
    return lerp(offscreen, next.from, (frame - enterStart) / ENTER_FRAMES);
  }
  if (previous && frame < previous.endFrame + EXIT_FRAMES) {
    return lerp(
      previous.to,
      offscreen,
      (frame - previous.endFrame) / EXIT_FRAMES,
    );
  }
  return offscreen;
};
