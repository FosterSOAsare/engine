import { describe, expect, it } from "vitest";
import { videoSchema, type VideoInput } from "../schema/scene";
import type { TextProps } from "../elements/Text";
import { planVideo } from "./plan";

const frame = { width: 1080, height: 1920 };

const plan = (elements: VideoInput["scenes"][number]["elements"]) =>
  planVideo(
    videoSchema.parse({
      version: 1,
      title: "Test",
      scenes: [{ id: "s", duration: 20, narration: "", elements }],
    }),
    frame,
  )[0].drawings;

describe("planVideo", () => {
  it("writes a list one line after another, left-aligned", () => {
    const drawings = plan([
      { type: "list", x: 10, y: 30, items: ["ab", "abcd"], start: 1, draw: 3 },
    ]);
    expect(drawings).toHaveLength(2);
    const [first, second] = drawings.map((d) => d.props as TextProps);
    expect(first).toMatchObject({ text: "• ab", align: "left", start: 1 });
    // Time is shared by length: "• ab" is 4 characters, "• abcd" 6.
    expect(first.draw).toBeCloseTo(1.2);
    expect(second).toMatchObject({ text: "• abcd", start: 2.2 });
    expect(second.y).toBeGreaterThan(first.y);
  });

  it("draws a line as an arrow without heads", () => {
    const [drawing] = plan([
      { type: "line", x1: 10, y1: 50, x2: 90, y2: 50, start: 0, draw: 1 },
    ]);
    expect(drawing).toMatchObject({
      type: "arrow",
      props: { from: { x: 10, y: 50 }, to: { x: 90, y: 50 }, head: "none" },
    });
  });

  it("rings a box with an ellipse through its corners, plus padding", () => {
    const drawings = plan([
      { type: "box", id: "b", x: 50, y: 50, w: 40, h: 20, start: 0, draw: 1 },
      { type: "ring", target: "b", padding: 0, start: 2, draw: 1 },
    ]);
    expect(drawings[1]).toMatchObject({
      type: "shape",
      props: { kind: "ellipse", x: 50, y: 50, color: "#c0392b" },
    });
    const ring = drawings[1].props as { w: number; h: number };
    expect(ring.w).toBeCloseTo(40 * Math.SQRT2);
    expect(ring.h).toBeCloseTo(20 * Math.SQRT2);
  });
});
