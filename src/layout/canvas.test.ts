import { describe, expect, it } from "vitest";
import {
  CAMERA_MOVE_SECONDS,
  coverTime,
  OVERVIEW_HOLD_SECONDS,
  OVERVIEW_MOVE_SECONDS,
  scenesLength,
  videoLength,
} from "../animation/timeline";
import { videoSchema, type VideoInput } from "../schema/scene";
import { validateVideo } from "../schema/validate";
import { AREA, cameraPlacement, canvasFor, gridCells, onScreen, viewAt } from "./canvas";

const FRAME = AREA;

// A landscape video with one box per scene.
const landscape = (
  scenes: { duration: number; keepPrevious?: boolean; place?: [number, number] }[],
) =>
  videoSchema.parse({
    version: 1,
    title: "Test",
    format: "landscape",
    scenes: scenes.map((scene, i) => ({
      id: `s${i + 1}`,
      narration: "",
      elements: [{ type: "box", x: 50, y: 50, start: 0, draw: 1 }],
      ...scene,
    })),
  } satisfies VideoInput);

describe("gridCells", () => {
  it("fills a grid about as wide as it is tall, in reading order", () => {
    expect(gridCells(Array(6).fill(undefined))).toEqual([
      [0, 0], [1, 0], [2, 0],
      [0, 1], [1, 1], [2, 1],
    ]);
    expect(gridCells([undefined])).toEqual([[0, 0]]);
  });

  it("keeps placed scenes where they are and fills around them", () => {
    expect(gridCells([undefined, [0, 0], undefined])).toEqual([
      [1, 0],
      [0, 0],
      [0, 1],
    ]);
  });
});

describe("canvasFor", () => {
  it("gives every board its own screen-sized area and never wipes", () => {
    const canvas = canvasFor(landscape([{ duration: 3 }, { duration: 3 }, { duration: 3, keepPrevious: true }]));
    expect(canvas.boards).toHaveLength(2); // the third scene keeps the second's board
    expect(canvas.boards.every((b) => !b.wipes)).toBe(true);
    expect(canvas.areas[0]).toMatchObject({ left: 0, top: 0, width: 1920, height: 1080 });
    expect(canvas.areas[1].left).toBeGreaterThan(1920);
    expect(canvas.width).toBe(canvas.areas[1].left + 1920);
  });

  it("puts the hand's path on each board's area", () => {
    const canvas = canvasFor(landscape([{ duration: 3 }, { duration: 3 }]));
    const [first, second] = canvas.tracks;
    expect(second.from.x - first.from.x).toBeCloseTo(canvas.areas[1].left, -1);
  });
});

describe("viewAt", () => {
  const video = landscape([{ duration: 4 }, { duration: 4 }]);
  const canvas = canvasFor(video);
  const end = scenesLength(video);

  it("shows each board's area while it is drawn", () => {
    expect(viewAt(canvas, 1)).toEqual({ cx: 960, cy: 540, zoom: 1 });
    const second = viewAt(canvas, 6);
    expect(second.cx).toBeCloseTo(canvas.areas[1].left + 960);
    expect(second.zoom).toBe(1);
  });

  it("glides between areas around the change, pulling back a little", () => {
    const middle = viewAt(canvas, 4);
    expect(middle.cx).toBeCloseTo((960 + canvas.areas[1].left + 960) / 2);
    expect(middle.zoom).toBeLessThan(1);
    expect(viewAt(canvas, 4 - CAMERA_MOVE_SECONDS / 2 - 0.01).cx).toBe(960);
  });

  it("ends on the whole board, inside the frame", () => {
    const overview = viewAt(canvas, end + OVERVIEW_MOVE_SECONDS);
    const p = cameraPlacement(overview, FRAME);
    expect(p.x).toBeGreaterThan(0);
    expect(canvas.width * p.scale + p.x).toBeLessThan(FRAME.width);
    expect(canvas.areas.every((area) => onScreen(area, p, FRAME))).toBe(true);
  });
});

describe("landscape timing", () => {
  it("adds the overview to the length and uses it as the cover", () => {
    const video = landscape([{ duration: 4 }, { duration: 4 }]);
    const extra = OVERVIEW_MOVE_SECONDS + OVERVIEW_HOLD_SECONDS;
    expect(videoLength(video)).toBeCloseTo(8 + extra);
    expect(coverTime(video)).toBeCloseTo(8 + extra - 1 / 30);
    // A named scene: before the camera moves on.
    expect(coverTime({ ...video, cover: "s1" })).toBeCloseTo(
      4 - CAMERA_MOVE_SECONDS / 2 - 2 / 30,
    );
  });
});

describe("camera focus", () => {
  const withCamera = (camera: unknown) =>
    validateVideo({
      version: 1,
      title: "Test",
      format: "landscape",
      scenes: [
        {
          id: "main",
          duration: 10,
          narration: "",
          camera,
          elements: [
            { type: "box", id: "a", x: 20, y: 30, w: 20, h: 10, start: 0, draw: 1 },
            {
              type: "table",
              id: "t",
              x: 60,
              y: 60,
              rows: [["A", "B"], ["1", "2"]],
              start: 2,
              draw: 1,
            },
          ],
        },
      ],
    });

  it("zooms in on what it names, then back out to the scene", () => {
    const result = withCamera([
      { focus: ["t.1"] },
      { focus: "all", start: 6 },
    ]);
    expect(result.errors).toEqual([]);
    const canvas = canvasFor(result.video!);
    expect(viewAt(canvas, 1).zoom).toBe(1);
    // Starts when the table starts (2 s) and takes 0.8 s.
    const close = viewAt(canvas, 3);
    expect(close.zoom).toBeGreaterThan(1.5);
    const row = canvas.boards[0].outlines.get("t.1")!;
    expect(close.cx).toBeCloseTo(row.cx);
    expect(close.cy).toBeCloseTo(row.cy);
    expect(viewAt(canvas, 7)).toEqual({ cx: 960, cy: 540, zoom: 1 });
  });

  it("never zooms past its limit", () => {
    const result = withCamera([{ focus: ["t.1.0"], zoom: 1.5 }]);
    expect(viewAt(canvasFor(result.video!), 5).zoom).toBe(1.5);
  });

  it("is checked: known ids, landscape only", () => {
    expect(withCamera([{ focus: ["nope"] }]).errors).toEqual([
      'scene "main", camera move 1: "focus" names unknown id "nope"',
    ]);
    expect(withCamera([{ focus: ["a"], at: "banana" }]).errors).toEqual([
      'scene "main", camera move 1: the narration never says "banana"',
    ]);
  });
});
