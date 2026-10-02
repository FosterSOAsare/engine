import { describe, expect, it } from "vitest";
import { AREA, DETAIL } from "../layout/canvas";
import { planVideo } from "../layout/plan";
import { validateVideo } from "../schema/validate";
import { tableLayout, tablePart } from "./Table";

const ROWS = [
  ["Player_ID", "Item", "Quantity"],
  ["jdog21", "amulets", "2"],
  ["trev73", "shields", "3"],
];

const table = (extra: Record<string, unknown> = {}) => ({
  type: "table" as const,
  id: "inv",
  x: 50,
  y: 50,
  w: 80,
  rows: ROWS,
  size: 4,
  draw: 1.5,
  start: 0,
  ...extra,
});

const video = (elements: unknown[], format = "landscape") => ({
  version: 1,
  title: "Test",
  format,
  scenes: [{ id: "main", duration: 20, narration: "", elements }],
});

describe("tableLayout", () => {
  it("centres the grid and sizes columns by their longest text", () => {
    const layout = tableLayout({ ...table(), title: undefined }, AREA);
    const unit = 10.8 * DETAIL;
    expect(layout.width).toBeCloseTo(80 * unit);
    expect(layout.left + layout.width / 2).toBeCloseTo(960);
    expect(layout.top + layout.height / 2).toBeCloseTo(540);
    // "Player_ID" (9 letters) is wider than "Quantity" (8) and "Item" (7).
    expect(layout.columnWidths[0]).toBeGreaterThan(layout.columnWidths[2]);
    expect(layout.columnWidths.reduce((a, b) => a + b)).toBeCloseTo(layout.width);
  });

  it("puts the title above the grid", () => {
    const layout = tableLayout({ ...table(), title: "Player_Inventory" }, AREA);
    expect(layout.title!.y).toBeLessThan(layout.top);
  });

  it("finds rows and cells", () => {
    const layout = tableLayout(table(), AREA);
    expect(tablePart(layout, ROWS, [1])).toMatchObject({ left: layout.left, width: layout.width });
    expect(tablePart(layout, ROWS, [2, 1])!.left).toBeCloseTo(layout.columnLefts[1]);
    expect(tablePart(layout, ROWS, [3])).toBeNull();
    expect(tablePart(layout, ROWS, [0, 3])).toBeNull();
  });
});

describe("table in a video", () => {
  it("writes the rows after the grid, in order", () => {
    const result = validateVideo(video([table()]));
    expect(result.errors).toEqual([]);
    const [board] = planVideo(result.video!, AREA);
    const cells = board.drawings.filter(
      (d) => d.type === "text" && ROWS.flat().includes(d.props.text),
    );
    expect(cells).toHaveLength(9);
    const starts = cells.map((d) => d.props.start);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    expect(starts[0]).toBeGreaterThanOrEqual(1.5 - 1e-9);
  });

  it("lets rings and arrows point at rows and cells", () => {
    const ring = { type: "ring", target: "inv.1.2", draw: 0.5 };
    const row = { type: "ring", target: "inv.2", draw: 0.5 };
    expect(validateVideo(video([table(), ring, row])).errors).toEqual([]);
    const result = validateVideo(video([table(), ring]));
    expect(planVideo(result.video!, AREA)[0].outlines.has("inv.1.2")).toBe(true);
    expect(validateVideo(video([table(), { ...ring, target: "inv.5" }])).errors).toEqual([
      'scene "main", element 2 (ring): "target" points to unknown id "inv.5"',
    ]);
  });

  it("is only for landscape videos", () => {
    expect(validateVideo(video([table()], "all")).errors).toEqual([
      'scene "main", element 1 (table): tables are for landscape videos (detailed boards)',
    ]);
  });
});
