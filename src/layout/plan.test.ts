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
  it("writes a list one line after another, with a pause between", () => {
    const drawings = plan([
      { type: "list", x: 10, y: 30, items: ["ab", "abcd"], start: 1, draw: 3 },
    ]);
    expect(drawings).toHaveLength(2);
    const [first, second] = drawings.map((d) => d.props as TextProps);
    expect(first).toMatchObject({ text: "• ab", align: "left", start: 1 });
    // 3 s minus one 0.5 s pause = 2.5 s of writing, shared by length (2:4).
    expect(first.draw).toBeCloseTo(2.5 / 3);
    expect(second.start).toBeCloseTo(1 + 2.5 / 3 + 0.5);
    expect(second.draw).toBeCloseTo(5 / 3);
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

  it("puts a curved arrow's label on the side away from the bulge", () => {
    const labelY = (bend?: number) => {
      const drawings = plan([
        { type: "box", id: "a", x: 20, y: 50, w: 10, h: 10, start: 0, draw: 1 },
        { type: "box", id: "b", x: 80, y: 50, w: 10, h: 10, start: 2, draw: 1 },
        {
          type: "arrow",
          from: "a",
          to: "b",
          label: "hi",
          bend,
          start: 4,
          draw: 1,
        },
      ]);
      const arrow = drawings[2] as { label: TextProps | null };
      return arrow.label!.y;
    };
    // Straight, left to right: above the line. Bent up (positive): below.
    expect(labelY()).toBeLessThan(50);
    expect(labelY(6)).toBeGreaterThan(50);
    expect(labelY(-6)).toBeLessThan(50);
  });
});
