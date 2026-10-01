import { describe, expect, it } from "vitest";
import { handPosition, type HandTrack } from "./hand";

// A track that moves the tip from `from` to `to` in a straight line.
const track = (
  startFrame: number,
  endFrame: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
): HandTrack => ({
  startFrame,
  endFrame,
  from,
  to,
  at: (t) => ({
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  }),
});

const offscreen = { x: 2000, y: 3000 };
const a = track(30, 60, { x: 0, y: 0 }, { x: 100, y: 0 });
const near = track(70, 100, { x: 100, y: 100 }, { x: 0, y: 100 }); // 10 frames later
const far = track(200, 230, { x: 500, y: 500 }, { x: 600, y: 500 }); // 100 frames after `near`

describe("handPosition", () => {
  it("follows the track being drawn", () => {
    expect(handPosition([a], 45, offscreen)).toEqual({ x: 50, y: 0 });
  });

  it("waits off screen until shortly before the first track", () => {
    expect(handPosition([a], 0, offscreen)).toEqual(offscreen);
  });

  it("arrives at the first track's start exactly when it begins", () => {
    expect(handPosition([a], 30, offscreen)).toEqual({ x: 0, y: 0 });
  });

  it("travels straight to a track that starts soon after", () => {
    const point = handPosition([a, near], 65, offscreen);
    expect(point).toEqual({ x: 100, y: 50 });
  });

  it("leaves the frame when the next track is far away in time", () => {
    expect(handPosition([near, far], 150, offscreen)).toEqual(offscreen);
  });

  it("leaves the frame after the last track", () => {
    expect(handPosition([a], 200, offscreen)).toEqual(offscreen);
  });
});
