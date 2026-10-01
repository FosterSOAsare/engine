import { describe, expect, it } from "vitest";
import { videoSchema, type VideoInput } from "../schema/scene";
import { boards, sceneTimes, videoLength } from "./timeline";

const video = (scenes: { duration: number; keepPrevious?: boolean }[]) =>
  videoSchema.parse({
    version: 1,
    title: "Test",
    scenes: scenes.map((scene, i) => ({
      id: `s${i + 1}`,
      narration: "",
      elements: [],
      ...scene,
    })),
  } satisfies VideoInput);

describe("timeline", () => {
  const three = video([{ duration: 8 }, { duration: 5 }, { duration: 7 }]);

  it("plays scenes one after another", () => {
    expect(sceneTimes(three).map(({ start, end }) => [start, end])).toEqual([
      [0, 8],
      [8, 13],
      [13, 20],
    ]);
  });

  it("adds up the total length", () => {
    expect(videoLength(three)).toBe(20);
  });

  it("starts a new board for every scene by default", () => {
    const result = boards(three);
    expect(result.map(({ start, end }) => [start, end])).toEqual([
      [0, 8],
      [8, 13],
      [13, 20],
    ]);
    expect(result.map((board) => board.wipes)).toEqual([true, true, false]);
  });

  it("keeps the board for keepPrevious scenes", () => {
    const result = boards(
      video([
        { duration: 4 },
        { duration: 3, keepPrevious: true },
        { duration: 5 },
      ]),
    );
    expect(result.map(({ start, end }) => [start, end])).toEqual([
      [0, 7],
      [7, 12],
    ]);
    expect(result[0].scenes.map((timed) => timed.scene.id)).toEqual([
      "s1",
      "s2",
    ]);
  });
});
