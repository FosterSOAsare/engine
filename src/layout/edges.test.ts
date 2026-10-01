import { describe, expect, it } from "vitest";
import { connect, type Outline } from "./edges";

const rect = (cx: number, cy: number, halfW: number, halfH: number) =>
  ({ kind: "rect", cx, cy, halfW, halfH }) satisfies Outline;

const close = (point: { x: number; y: number }, x: number, y: number) => {
  expect(point.x).toBeCloseTo(x);
  expect(point.y).toBeCloseTo(y);
};

describe("connect", () => {
  it("joins stacked boxes bottom to top", () => {
    const { from, to } = connect(
      rect(540, 576, 270, 119),
      rect(540, 1344, 270, 119),
      32,
    );
    close(from, 540, 576 + 119 + 32);
    close(to, 540, 1344 - 119 - 32);
  });

  it("joins side-by-side boxes right to left", () => {
    const { from, to } = connect(
      rect(500, 540, 270, 119),
      rect(1400, 540, 270, 119),
      30,
    );
    close(from, 800, 540);
    close(to, 1100, 540);
  });

  it("leaves a box through its side or its top, whichever comes first", () => {
    // A wide, flat box: a steep diagonal leaves through the bottom edge.
    const { from } = connect(rect(0, 0, 200, 50), rect(100, 1000, 10, 10), 0);
    close(from, 5, 50);
  });

  it("leaves a circle at its radius", () => {
    const { from, to } = connect(
      { kind: "ellipse", cx: 0, cy: 0, halfW: 100, halfH: 100 },
      { kind: "ellipse", cx: 300, cy: 400, halfW: 50, halfH: 50 },
      10,
    );
    // The centres are 500 apart along (0.6, 0.8).
    close(from, 0.6 * 110, 0.8 * 110);
    close(to, 300 - 0.6 * 60, 400 - 0.8 * 60);
  });

  it("leaves a diamond through its slanted edge", () => {
    // Along the diagonal of a 100 x 100 diamond the edge is at (50, 50).
    const { from } = connect(
      { kind: "diamond", cx: 0, cy: 0, halfW: 100, halfH: 100 },
      rect(1000, 1000, 10, 10),
      0,
    );
    close(from, 50, 50);
  });

  it("leaves a polygon through the side it crosses", () => {
    // A triangle pointing up; straight down from the centre hits the base.
    const triangle = {
      kind: "polygon" as const,
      cx: 0,
      cy: 0,
      corners: [
        { x: 0, y: -100 },
        { x: 100, y: 50 },
        { x: -100, y: 50 },
      ],
    };
    close(connect(triangle, rect(0, 1000, 10, 10), 0).from, 0, 50);
    // Straight right, it hits the right side halfway down at y = 0.
    close(connect(triangle, rect(1000, 0, 10, 10), 0).from, 100 * (2 / 3), 0);
  });
});
