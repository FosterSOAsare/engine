import { describe, expect, it } from "vitest";
import { shapeSketch } from "../Shape";
import { ICON_NAMES } from "./index";
import { scalePath } from "./types";

describe("scalePath", () => {
  it("scales every x and y of a path in icon units", () => {
    expect(
      scalePath(
        "M .5 .25 L 1 0 C .1 .2 .3 .4 .5 .6 Z",
        (u) => u * 10,
        (u) => u * 100,
      ),
    ).toBe("M 5 25 L 10 0 C 1 20 3 40 5 60 Z");
  });
});

describe("icons", () => {
  it.each(ICON_NAMES)("draws %s", (icon) => {
    const sketch = shapeSketch(
      {
        kind: "icon",
        icon,
        x: 50,
        y: 50,
        w: 20,
        h: 20,
        seed: 1,
        fill: "#eee",
        start: 0,
        draw: 1,
      },
      { width: 1080, height: 1920 },
    );
    expect(sketch.strokes.length).toBeGreaterThan(0);
    for (const stroke of sketch.strokes) {
      expect(Number.isFinite(stroke.length)).toBe(true);
    }
  });
});
