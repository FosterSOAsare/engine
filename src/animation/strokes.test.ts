import { Easing } from "remotion";
import { describe, expect, it } from "vitest";
import {
  penPosition,
  splitStrokes,
  strokeProgress,
  type Stroke,
} from "./strokes";

const stroke = (length: number): Stroke => ({ d: "", length });
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
      stroke: 0,
      progress: 0.5,
    });
    expect(penPosition(strokes, 0.625, linear)).toEqual({
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
