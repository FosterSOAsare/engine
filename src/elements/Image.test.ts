import { describe, expect, it } from "vitest";
import { paintOf } from "./Image";

describe("paintOf", () => {
  const ink = { kind: "ink", color: "#000000" };
  const fill = { kind: "fill", color: "#FFFFFF" };

  it("keeps the design's colours by default", () => {
    expect(paintOf(ink, {})).toBe("#000000");
    expect(paintOf(fill, {})).toBe("#FFFFFF");
  });

  it("recolours fills and lines separately", () => {
    const options = { fill: "#ffd8a8", ink: "#1e3a8a" };
    expect(paintOf(fill, options)).toBe("#ffd8a8");
    expect(paintOf(ink, options)).toBe("#1e3a8a");
    expect(paintOf({ kind: "line", color: "#22242a" }, options)).toBe(
      "#1e3a8a",
    );
  });

  it("swaps exact colours first, ignoring case", () => {
    expect(
      paintOf(fill, { fill: "#ffd8a8", colors: { "#ffffff": "#c0ffee" } }),
    ).toBe("#c0ffee");
  });
});
