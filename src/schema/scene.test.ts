import { describe, expect, it } from "vitest";
import m1Demo from "../../videos/m1-demo/scene.json";
import { videoSchema, type VideoInput } from "./scene";

// The draft from the development plan.
const draft: VideoInput = {
  version: 1,
  title: "How DNS works",
  fps: 30,
  scenes: [
    {
      id: "lookup",
      duration: 8,
      narration: "Your browser asks a DNS resolver for the IP address.",
      keepPrevious: false,
      elements: [
        {
          type: "box",
          id: "browser",
          label: "Browser",
          x: 20,
          y: 50,
          start: 0,
          draw: 1,
        },
        {
          type: "box",
          id: "resolver",
          label: "DNS Resolver",
          x: 80,
          y: 50,
          start: 1.5,
          draw: 1,
        },
        {
          type: "arrow",
          from: "browser",
          to: "resolver",
          label: "IP of google.com?",
          start: 3,
          draw: 1,
        },
      ],
    },
  ],
};

describe("videoSchema", () => {
  it("accepts the draft from the development plan", () => {
    expect(videoSchema.safeParse(draft).success).toBe(true);
  });

  it("accepts the M1 demo scene file", () => {
    expect(videoSchema.safeParse(m1Demo).success).toBe(true);
  });

  it("fills in defaults", () => {
    const video = videoSchema.parse({
      version: 1,
      title: "Defaults",
      scenes: [
        {
          id: "a",
          narration: "",
          elements: [{ type: "box", x: 50, y: 50, start: 0, draw: 1 }],
        },
      ],
    });
    expect(video.fps).toBe(30);
    expect(video.format).toBe("all");
    expect(video.scenes[0].keepPrevious).toBe(false);
    expect(video.scenes[0].elements[0]).toMatchObject({ w: 50, h: 22 });
  });

  it("rejects a misspelled field", () => {
    const typo = structuredClone(draft) as unknown as {
      scenes: { elements: Record<string, unknown>[] }[];
    };
    typo.scenes[0].elements[0].lable = "Browser";
    expect(videoSchema.safeParse(typo).success).toBe(false);
  });

  it("rejects an unknown element type", () => {
    const bad = structuredClone(draft) as unknown as {
      scenes: { elements: Record<string, unknown>[] }[];
    };
    bad.scenes[0].elements[0].type = "hexagon";
    expect(videoSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects positions outside the frame", () => {
    const bad = structuredClone(draft);
    (bad.scenes[0].elements[0] as { x: number }).x = 120;
    expect(videoSchema.safeParse(bad).success).toBe(false);
  });

  it("catches typos at compile time too", () => {
    const element: VideoInput["scenes"][number]["elements"][number] = {
      type: "box",
      x: 50,
      y: 50,
      start: 0,
      draw: 1,
      // @ts-expect-error: "lable" is not a box field
      lable: "Browser",
    };
    expect(element).toBeDefined();
  });
});
