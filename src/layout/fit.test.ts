import { describe, expect, it } from "vitest";
import type { VideoInput } from "../schema/scene";
import { validateVideo } from "../schema/validate";
import { VIDEOS } from "../videos";
import {
  boardBounds,
  fitBoard,
  IDENTITY,
  placePoint,
  stagesFor,
  withLayouts,
} from "./fit";
import { FORMAT_NAMES, FORMATS } from "./formats";

const PORTRAIT = FORMATS.portrait;
const SQUARE = FORMATS.square;
const NO_MARGINS = { top: 0, right: 0, bottom: 0, left: 0 };

// A checked one-scene portrait video: two boxes side by side.
const twoBoxes = (layouts?: VideoInput["scenes"][number]["layouts"]) => {
  const result = validateVideo({
    version: 1,
    title: "Test",
    format: "all",
    scenes: [
      {
        id: "main",
        duration: 5,
        narration: "",
        layouts,
        elements: [
          { type: "box", id: "a", x: 30, y: 40, w: 20, h: 10, start: 0, draw: 1 },
          { type: "box", id: "b", x: 70, y: 40, w: 20, h: 10, start: 1, draw: 1 },
        ],
      },
    ],
  });
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.video;
};

describe("fitBoard", () => {
  it("centres content in the safe area", () => {
    const p = fitBoard(
      { left: 0, top: 0, right: 100, bottom: 100 },
      { width: 1000, height: 1000 },
      { width: 1000, height: 1000 },
      { top: 10, right: 10, bottom: 10, left: 10 },
    );
    // 100 px of content into 800 px would be 8x, but never past the board's
    // own scale (1).
    expect(p.scale).toBe(1);
    expect(placePoint({ x: 50, y: 50 }, p)).toEqual({ x: 500, y: 500 });
  });

  it("shrinks content that doesn't fit, keeping its proportions", () => {
    const p = fitBoard(
      { left: 0, top: 0, right: 1080, bottom: 1920 },
      PORTRAIT,
      SQUARE,
      NO_MARGINS,
    );
    expect(p.scale).toBeCloseTo(1080 / 1920);
    expect(placePoint({ x: 0, y: 0 }, p).y).toBeCloseTo(0);
    expect(placePoint({ x: 1080, y: 1920 }, p).y).toBeCloseTo(1080);
  });
});

describe("boardBounds", () => {
  it("covers every drawing, with a little room", () => {
    const [stage] = stagesFor(twoBoxes(), "portrait");
    const bounds = boardBounds(stage.board, PORTRAIT)!;
    const unit = 10.8;
    // Box a's left edge: 30% of 1080 minus half of 20 units.
    expect(bounds.left).toBeCloseTo(0.3 * 1080 - 10 * unit - 2 * unit);
    expect(bounds.right).toBeCloseTo(0.7 * 1080 + 10 * unit + 2 * unit);
    expect(bounds.top).toBeCloseTo(0.4 * 1920 - 5 * unit - 2 * unit);
  });
});

describe("stagesFor", () => {
  it("leaves the format a file is written for as it is", () => {
    const [stage] = stagesFor(twoBoxes(), "portrait");
    expect(stage.placement).toBe(IDENTITY);
    expect(stage.frame).toBe(PORTRAIT);
  });

  it("fits boards into the safe area of every other format", () => {
    for (const format of FORMAT_NAMES.filter((f) => f !== "portrait")) {
      const target = FORMATS[format];
      const [stage] = stagesFor(twoBoxes(), format);
      expect(stage.frame).toBe(PORTRAIT);
      const bounds = boardBounds(stage.board, PORTRAIT)!;
      const topLeft = placePoint({ x: bounds.left, y: bounds.top }, stage.placement);
      const bottomRight = placePoint(
        { x: bounds.right, y: bounds.bottom },
        stage.placement,
      );
      const { safe } = target;
      expect(topLeft.x).toBeGreaterThanOrEqual((safe.left / 100) * target.width - 1e-6);
      expect(topLeft.y).toBeGreaterThanOrEqual((safe.top / 100) * target.height - 1e-6);
      expect(bottomRight.x).toBeLessThanOrEqual(
        target.width * (1 - safe.right / 100) + 1e-6,
      );
      expect(bottomRight.y).toBeLessThanOrEqual(
        target.height * (1 - safe.bottom / 100) + 1e-6,
      );
    }
  });

  it("lays out a scene with a layout directly in that format", () => {
    const video = twoBoxes({ square: { a: { x: 50, y: 30 }, b: { x: 50, y: 70 } } });
    const [square] = stagesFor(video, "square");
    expect(square.frame).toBe(SQUARE);
    expect(square.placement).toBe(IDENTITY);
    const props = square.board.drawings.map((d) =>
      d.type === "shape" ? [d.props.x, d.props.y] : null,
    );
    expect(props).toEqual([
      [50, 30],
      [50, 70],
    ]);
    // Other formats still fit the written layout.
    expect(stagesFor(video, "feed")[0].frame).toBe(PORTRAIT);
  });

  it("works for every video in src/videos.ts, in every format", () => {
    for (const { id, scene } of VIDEOS) {
      const result = validateVideo(scene);
      if (!result.video) continue; // narrated videos need their audio
      for (const format of FORMAT_NAMES) {
        const stages = stagesFor(result.video, format);
        for (const { placement } of stages) {
          expect(placement.scale, `${id} in ${format}`).toBeGreaterThan(0.2);
        }
      }
    }
  });
});

describe("withLayouts", () => {
  it("moves only the named elements of scenes with a layout", () => {
    const { video, laidOut } = withLayouts(twoBoxes({ landscape: { b: { y: 60 } } }), "landscape");
    expect([...laidOut]).toEqual(["main"]);
    const [a, b] = video.scenes[0].elements;
    expect(a).toMatchObject({ x: 30, y: 40 });
    expect(b).toMatchObject({ x: 70, y: 60 });
  });
});
