import { describe, expect, it } from "vitest";
import { videoSchema, type VideoInput } from "./scene";
import { resolveTiming, type HeardWords } from "./timing";

type Element = VideoInput["scenes"][number]["elements"][number];

// "The browser asks the resolver for the address."
const NARRATION = "The browser asks the resolver for the address.";
const HEARD: HeardWords = {
  s: {
    words: [
      ["The", 0, 0.2],
      ["browser", 0.2, 0.8],
      ["asks", 0.8, 1.2],
      ["the", 1.2, 1.3],
      ["resolver", 1.3, 2.0],
      ["for", 2.0, 2.2],
      ["the", 2.2, 2.3],
      ["address.", 2.3, 3.0],
    ].map(([text, start, end]) => ({
      text: text as string,
      start: start as number,
      end: end as number,
    })),
  },
};

const timed = (elements: Element[], heard: HeardWords | undefined = HEARD) => {
  const video = videoSchema.parse({
    version: 1,
    title: "Test",
    voiceover: true,
    scenes: [{ id: "s", duration: 4, narration: NARRATION, elements }],
  });
  return resolveTiming(video, heard, [3]);
};

const box = (extra: Partial<Element>): Element =>
  ({ type: "box", x: 50, y: 50, draw: 0.5, ...extra }) as Element;

describe("resolveTiming", () => {
  it("starts an element on the word given in at", () => {
    const { video, errors } = timed([box({ at: "resolver" })]);
    expect(errors).toEqual([]);
    expect(video.scenes[0].elements[0].start).toBe(1.3);
  });

  it("starts an element when its label is said", () => {
    const { video } = timed([box({ label: "Resolver" })]);
    expect(video.scenes[0].elements[0].start).toBe(1.3);
  });

  it("finds an icon by its name", () => {
    const { video } = timed([
      {
        type: "icon",
        name: "monitor",
        label: "browser",
        x: 50,
        y: 50,
        draw: 0.5,
      },
    ]);
    expect(video.scenes[0].elements[0].start).toBe(0.2);
  });

  it("queues an element that is not named in the narration", () => {
    const { video } = timed([box({ at: "browser" }), box({})]);
    const [first, second] = video.scenes[0].elements;
    // Both share the time from "browser" (0.2) to the end (3.0).
    expect(second.start).toBeCloseTo(first.start! + first.draw + 0.15);
  });

  it("slows a drawing to fill the time until the next word", () => {
    const { video } = timed([
      box({ at: "browser", draw: 0.5 }),
      box({ at: "resolver", draw: 0.5 }),
    ]);
    const [first, second] = video.scenes[0].elements;
    // From "browser" (0.2) to "resolver" (1.3), less a short gap.
    expect(first.draw).toBeCloseTo(0.95);
    expect(second.start).toBe(1.3);
  });

  it("slows a drawing to at most three times its draw", () => {
    const { video } = timed([box({ at: "browser", draw: 0.2 })]);
    expect(video.scenes[0].elements[0].draw).toBeCloseTo(0.6);
  });

  it("never starts before the previous element is finished", () => {
    const { video } = timed([
      box({ start: 0, draw: 2 }),
      box({ at: "browser" }),
    ]);
    expect(video.scenes[0].elements[1].start).toBe(2);
  });

  it("keeps an explicit start", () => {
    const { video } = timed([box({ start: 2.5, label: "Resolver" })]);
    expect(video.scenes[0].elements[0].start).toBe(2.5);
  });

  it("stretches a narrated scene to fit its drawings", () => {
    const { video } = timed([box({ start: 3.8, draw: 1 })]);
    expect(video.scenes[0].duration).toBeCloseTo(5.3);
  });

  it("reports a word the narration never says", () => {
    expect(timed([box({ at: "router" })]).errors).toEqual([
      'scene "s", element 1 (box): the narration never says "router"',
    ]);
  });

  it("asks for captions when at is used without them", () => {
    expect(timed([box({ at: "resolver" })], {}).errors).toEqual([
      'scene "s", element 1 (box): "at" needs captions; run npm run captions',
    ]);
  });
});
