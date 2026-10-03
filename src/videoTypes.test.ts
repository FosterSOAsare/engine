import { describe, expect, it } from "vitest";
import { videoSchema } from "./schema/scene";
import { validateVideo } from "./schema/validate";
import { applyType } from "./videoTypes.mjs";

const explainer = (extra: Record<string, unknown> = {}) => ({
  version: 1,
  title: "Test",
  type: "explainer",
  scenes: [
    {
      id: "intro",
      narration: "Hello.",
      elements: [{ type: "box", x: 50, y: 50, draw: 1 }],
    },
  ],
  ...extra,
});

describe("applyType", () => {
  it("fills in an explainer's settings and ends it on the follow outro", () => {
    const video = videoSchema.parse(applyType(explainer()));
    expect(video).toMatchObject({
      format: "landscape",
      style: "pop",
      voiceover: true,
      captions: true,
      speed: 1.15,
    });
    expect(video.scenes.map((s) => s.id)).toEqual(["intro", "follow"]);
    expect(validateVideo(applyType(explainer())).errors).toEqual([]);
  });

  it("lets the scene file's own fields and scenes win", () => {
    const own = { id: "follow", narration: "Bye.", elements: [] };
    const video = videoSchema.parse(
      applyType(
        explainer({
          speed: 1,
          scenes: [...explainer().scenes, own],
        }),
      ),
    );
    expect(video.speed).toBe(1);
    expect(video.scenes.map((s) => s.narration)).toEqual(["Hello.", "Bye."]);
  });

  it("ends every video on the shared outro, typed or not", () => {
    const plain = { ...explainer(), type: undefined };
    const video = videoSchema.parse(applyType(plain));
    expect(video.scenes.map((s) => s.id)).toEqual(["intro", "follow"]);
    expect(video.speed).toBe(1); // no type, no type settings
  });

  it("rejects unknown types", () => {
    expect(videoSchema.safeParse(explainer({ type: "nope" })).success).toBe(
      false,
    );
  });
});
