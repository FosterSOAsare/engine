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
    expect(viewAt(canvas, 1, end, FRAME)).toEqual({ cx: 960, cy: 540, zoom: 1 });
    const second = viewAt(canvas, 6, end, FRAME);
    expect(second.cx).toBeCloseTo(canvas.areas[1].left + 960);
    expect(second.zoom).toBe(1);
  });

  it("glides between areas around the change, pulling back a little", () => {
    const middle = viewAt(canvas, 4, end, FRAME);
    expect(middle.cx).toBeCloseTo((960 + canvas.areas[1].left + 960) / 2);
    expect(middle.zoom).toBeLessThan(1);
    expect(viewAt(canvas, 4 - CAMERA_MOVE_SECONDS / 2 - 0.01, end, FRAME).cx).toBe(960);
  });

  it("ends on the whole board, inside the frame", () => {
    const overview = viewAt(canvas, end + OVERVIEW_MOVE_SECONDS, end, FRAME);
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
