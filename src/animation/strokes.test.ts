import { Easing } from "remotion";
import { describe, expect, it } from "vitest";
import {
  measureStrokes,
  penPoint,
  penPosition,
  splitStrokes,
  strokeProgress,
  type Stroke,
} from "./strokes";

// A stroke of a given length that starts where the previous one ended, so
// there is no pen lift between strokes.
const origin = { x: 0, y: 0 };
const stroke = (length: number): Stroke => ({
  d: "",
  length,
  start: origin,
  end: origin,
});
const linear = Easing.linear;

describe("splitStrokes", () => {
  it("starts a new stroke at every move-to", () => {
    expect(splitStrokes("M0 0 L10 0 M10 0 L10 10 ")).toEqual([
      "M0 0 L10 0",
      "M10 0 L10 10",
    ]);
  });
});

describe("strokeProgress", () => {
  const strokes = [stroke(100), stroke(300)];

  it("draws nothing before the start", () => {
    expect(strokeProgress(strokes, 0)).toEqual([0, 0]);
  });

  it("draws everything after the end", () => {
    expect(strokeProgress(strokes, 1)).toEqual([1, 1]);
  });

  it("finishes one stroke before starting the next", () => {
    expect(strokeProgress(strokes, 0.125, linear)).toEqual([0.5, 0]);
    expect(strokeProgress(strokes, 0.25, linear)).toEqual([1, 0]);
  });

  it("moves the pen at a constant speed across strokes", () => {
    // The first quarter of the time draws the first 100 px, the remaining
    // three quarters the 300 px stroke, so halfway through it is at 150 px.
    expect(strokeProgress(strokes, 0.625, linear)).toEqual([1, 0.5]);
  });

  it("eases each stroke in and out", () => {
    const [first] = strokeProgress(strokes, 0.05);
    expect(first).toBeLessThan(0.2);
  });
});

describe("penPosition", () => {
  const strokes = [stroke(100), stroke(300)];

  it("is null while the element is not being drawn", () => {
    expect(penPosition(strokes, 0)).toBeNull();
    expect(penPosition(strokes, 1)).toBeNull();
  });

  it("follows the stroke being drawn", () => {
    expect(penPosition(strokes, 0.125, linear)).toEqual({
      state: "drawing",
      stroke: 0,
      progress: 0.5,
    });
    expect(penPosition(strokes, 0.625, linear)).toEqual({
      state: "drawing",
      stroke: 1,
      progress: 0.5,
    });
  });

  it("agrees with strokeProgress", () => {
    for (const t of [0.1, 0.3, 0.5, 0.9]) {
      const pen = penPosition(strokes, t);
      expect(pen).not.toBeNull();
      expect(strokeProgress(strokes, t)[pen!.stroke]).toBeCloseTo(
        pen!.progress,
      );
    }
  });
});

describe("pen lifts", () => {
  // Two 100 px strokes, 30 px apart. The lift moves 3x faster than drawing,
  // so it counts as 10 px: total 210, the lift runs from 100/210 to 110/210.
  const strokes = measureStrokes(["M0 0 L100 0", "M100 30 L0 30"]);

  it("leaves time to move between strokes", () => {
    expect(strokeProgress(strokes, 105 / 210, linear)).toEqual([1, 0]);
    expect(penPosition(strokes, 105 / 210, linear)).toEqual({
      state: "lifted",
      stroke: 1,
      progress: expect.closeTo(0.5),
    });
  });

  it("puts the pen tip on the line while drawing", () => {
    const point = penPoint(strokes, 50 / 210, linear)!;
    expect(point.x).toBeCloseTo(50);
    expect(point.y).toBeCloseTo(0);
  });

  it("moves the pen tip straight to the next stroke while lifted", () => {
    const point = penPoint(strokes, 105 / 210, linear)!;
    expect(point.x).toBeCloseTo(100);
    expect(point.y).toBeCloseTo(15);
  });
});

describe("unmeasurable strokes", () => {
  it("counts a stroke whose length is NaN as a point", () => {
    // A degenerate curve: every point the same.
    const [dot] = measureStrokes(["M5 5 C5 5 5 5 5 5"]);
    expect(Number.isFinite(dot.length)).toBe(true);
  });

  it("never shows a shape before it starts", () => {
    const strokes = [
      ...measureStrokes(["M0 0 L100 0"]),
      {
        // Where the line ends, so no pen travel is involved.
        d: "",
        length: Number.NaN,
        start: { x: 100, y: 0 },
        end: { x: 100, y: 0 },
      },
    ];
    expect(strokeProgress(strokes, 0)).toEqual([0, 0]);
    // The measurable stroke still draws normally.
    expect(strokeProgress(strokes, 0.5, Easing.linear)[0]).toBeCloseTo(0.5);
  });
});
