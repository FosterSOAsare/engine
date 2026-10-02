import { describe, expect, it } from "vitest";
import normalization from "../../videos/normalization/scene.json";
import { VIDEOS } from "../videos";
import type { VideoInput } from "./scene";
import { validateVideo } from "./validate";

type Element = VideoInput["scenes"][number]["elements"][number];

// A one-scene video with the given elements; null leaves out the duration.
const video = (elements: Element[], duration: number | null = 10) => ({
  version: 1 as const,
  title: "Test",
  scenes: [
    { id: "main", duration: duration ?? undefined, narration: "", elements },
  ],
});

const box = (id: string, start: number): Element => ({
  type: "box",
  id,
  x: 50,
  y: 50,
  start,
  draw: 1,
});

const arrow = (from: string, to: string, start: number): Element => ({
  type: "arrow",
  from,
  to,
  start,
  draw: 1,
});

const errorsOf = (input: unknown) => validateVideo(input).errors;

describe("validateVideo", () => {
  it("accepts the normalization video", () => {
    expect(validateVideo(normalization).ok).toBe(true);
  });

  it.each(VIDEOS)("accepts the $id video", ({ scene }) => {
    expect(validateVideo(scene).errors).toEqual([]);
  });

  it("names the scene, element and field of a schema error", () => {
    const input = video([box("a", 0)]);
    (input.scenes[0].elements[0] as Record<string, unknown>).lable = "x";
    expect(errorsOf(input)).toEqual([
      'scene "main", element 1 (box): unknown field "lable"',
    ]);
  });

  it("only supports the engine's frame rate", () => {
    expect(errorsOf({ ...video([box("a", 0)]), fps: 60 })).toEqual([
      "file: fps 60 is not supported yet; use 30",
    ]);
  });

  it("requires a scene duration", () => {
    expect(errorsOf(video([box("a", 0)], null))).toEqual([
      'scene "main": needs a "duration" (in seconds)',
    ]);
  });

  it("rejects duplicate ids", () => {
    expect(errorsOf(video([box("a", 0), box("a", 2)]))).toEqual([
      'scene "main", element 2 (box): id "a" is already used',
    ]);
  });

  it("rejects arrows to unknown ids", () => {
    expect(errorsOf(video([box("a", 0), arrow("a", "b", 2)]))).toEqual([
      'scene "main", element 2 (arrow): "to" points to unknown id "b"',
    ]);
  });

  it("lets an arrow point to a box drawn after it", () => {
    expect(
      errorsOf(video([box("a", 0), arrow("a", "b", 2), box("b", 3)])),
    ).toEqual([]);
  });

  it("only connects arrows to shapes", () => {
    const label: Element = {
      type: "text",
      id: "t",
      x: 50,
      y: 50,
      text: "Hi",
      start: 2,
      draw: 1,
    };
    expect(errorsOf(video([box("a", 0), label, arrow("a", "t", 4)]))).toEqual([
      'scene "main", element 3 (arrow): "to" points to a text; arrows connect shapes and icons',
    ]);
  });

  it("rejects elements that end after the scene", () => {
    expect(errorsOf(video([box("a", 9.5)]))).toEqual([
      'scene "main", element 1 (box): ends at 10.5 s, after the scene\'s 10 s',
    ]);
  });

  it("counts the label's writing time", () => {
    const labelled: Element = {
      type: "box",
      x: 50,
      y: 50,
      start: 8.8,
      draw: 1,
      label: "A",
    };
    // 8.8 + 1 s outline + 0.5 s label = 10.3 s
    expect(errorsOf(video([labelled]))).toHaveLength(1);
  });

  it("queues an element asked to start while another is drawn", () => {
    const result = validateVideo(video([box("a", 0), box("b", 0.5)]));
    expect(result.errors).toEqual([]);
    expect(result.video?.scenes[0].elements[1].start).toBe(1);
  });

  it("keeps ids from earlier scenes with keepPrevious", () => {
    const input = {
      version: 1 as const,
      title: "Test",
      scenes: [
        { id: "one", duration: 5, narration: "", elements: [box("a", 0)] },
        {
          id: "two",
          duration: 5,
          narration: "",
          keepPrevious: true,
          elements: [box("b", 0), arrow("a", "b", 2)],
        },
      ],
    };
    expect(errorsOf(input)).toEqual([]);

    // Without keepPrevious, the board is wiped and "a" is gone.
    input.scenes[1].keepPrevious = false;
    expect(errorsOf(input)).toEqual([
      'scene "two", element 2 (arrow): "from" points to unknown id "a"',
    ]);
  });

  it("checks what a ring goes around", () => {
    const ring = (target: string): Element => ({
      type: "ring",
      target,
      start: 4,
      draw: 1,
    });
    expect(errorsOf(video([box("a", 0), ring("a")]))).toEqual([]);
    expect(errorsOf(video([box("a", 0), ring("b")]))).toEqual([
      'scene "main", element 2 (ring): "target" points to unknown id "b"',
    ]);
    const line: Element = {
      type: "line",
      id: "l",
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
      start: 2,
      draw: 1,
    };
    expect(errorsOf(video([box("a", 0), line, ring("l")]))).toEqual([
      'scene "main", element 3 (ring): can\'t ring a line; rings go around shapes, icons and text',
    ]);
  });

  describe("voiceover", () => {
    const narrated = (duration?: number) => ({
      version: 1 as const,
      title: "Test",
      voiceover: true,
      scenes: [
        { id: "a", duration, narration: "Hi.", elements: [box("x", 0)] },
      ],
    });

    it("needs no duration", () => {
      expect(errorsOf(narrated())).toEqual([]);
    });

    it("lasts as long as the narration plus the pause", () => {
      const result = validateVideo(narrated(), [3.2]);
      expect(result.video?.scenes[0].duration).toBeCloseTo(3.7);
    });

    it("keeps a longer duration", () => {
      const result = validateVideo(narrated(6), [3.2]);
      expect(result.video?.scenes[0].duration).toBe(6);
    });

    it("reports missing narration audio", () => {
      expect(validateVideo(narrated(), [null]).errors).toEqual([
        'scene "a": no narration audio yet; run npm run voice',
      ]);
    });
  });
});

describe("layouts", () => {
  const withLayouts = (layouts: unknown, format = "all") => ({
    version: 1 as const,
    title: "Test",
    format,
    scenes: [
      {
        id: "main",
        duration: 10,
        narration: "",
        layouts,
        elements: [box("a", 0), arrow("a", "a", 1)],
      },
    ],
  });

  it("accepts new positions for the scene's own elements", () => {
    expect(errorsOf(withLayouts({ landscape: { a: { x: 20, y: 50, w: 30 } } }))).toEqual([]);
  });

  it("reports unknown ids, wrong fields and the file's own format", () => {
    expect(errorsOf(withLayouts({ landscape: { nope: { x: 1 } } }))).toEqual([
      'scene "main", layouts.landscape: no element with id "nope" in this scene',
    ]);
    expect(errorsOf(withLayouts({ square: { a: { size: 5 } } }))).toEqual([
      'scene "main", layouts.square.a: a box has no "size"',
    ]);
    expect(errorsOf(withLayouts({ portrait: { a: { x: 5 } } }))).toEqual([
      'scene "main", layouts.portrait: the file is written in portrait; change the elements themselves',
    ]);
    expect(
      errorsOf(withLayouts({ square: { a: { x: 5 } } }, "landscape")),
    ).toEqual([
      'scene "main", layouts.square: landscape videos are made only in landscape',
    ]);
  });

  it("rejects unknown formats and fields", () => {
    expect(errorsOf(withLayouts({ tall: { a: { x: 5 } } }))).not.toEqual([]);
    expect(errorsOf(withLayouts({ square: { a: { colour: "red" } } }))).not.toEqual([]);
  });
});

describe("cover", () => {
  it("must name a scene of the video", () => {
    expect(errorsOf({ ...video([box("a", 0)]), cover: "main" })).toEqual([]);
    expect(errorsOf({ ...video([box("a", 0)]), cover: 3 })).toEqual([]);
    expect(errorsOf({ ...video([box("a", 0)]), cover: "nope" })).toEqual([
      'file: "cover" names no scene "nope"',
    ]);
  });
});

describe("place", () => {
  it("is only for landscape videos", () => {
    const placed = (format: string) => ({
      ...video([box("a", 0)]),
      format,
      scenes: [{ ...video([box("a", 0)]).scenes[0], place: [1, 0] }],
    });
    expect(errorsOf(placed("landscape"))).toEqual([]);
    expect(errorsOf(placed("all"))).toEqual([
      'scene "main": "place" is for landscape videos, which put every scene on one board',
    ]);
  });
});
