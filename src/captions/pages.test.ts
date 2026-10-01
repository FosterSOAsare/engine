import { describe, expect, it } from "vitest";
import type { TimedWord } from "./align";
import { captionPages } from "./pages";

// Words spoken back to back, 0.3 s each, unless given times.
const spoken = (text: string, gaps: Record<number, number> = {}) => {
  let at = 0;
  return text.split(" ").map((word, i): TimedWord => {
    at += gaps[i] ?? 0;
    const timed = { text: word, start: at, end: at + 0.3 };
    at += 0.3;
    return timed;
  });
};

const texts = (pages: ReturnType<typeof captionPages>) =>
  pages.map((page) => page.words.map((w) => w.text).join(" "));

describe("captionPages", () => {
  it("shows at most three words at a time", () => {
    expect(texts(captionPages(spoken("one two three four five"), 0))).toEqual([
      "one two three",
      "four five",
    ]);
  });

  it("ends a page after punctuation", () => {
    expect(texts(captionPages(spoken("Hello, my friend. Bye"), 0))).toEqual([
      "Hello,",
      "my friend.",
      "Bye",
    ]);
  });

  it("ends a page before a pause", () => {
    expect(
      texts(captionPages(spoken("wait for it now", { 2: 0.6 }), 0)),
    ).toEqual(["wait for", "it now"]);
  });

  it("keeps long words on fewer-word pages", () => {
    expect(
      texts(captionPages(spoken("internationalization is complicated"), 0)),
    ).toEqual(["internationalization", "is complicated"]);
  });

  it("shifts times to the scene's place in the video", () => {
    const [page] = captionPages(spoken("one"), 10);
    expect(page.start).toBe(10);
    expect(page.words[0].start).toBe(10);
  });

  it("keeps a page up until the next one starts", () => {
    const pages = captionPages(spoken("one two three four"), 0);
    expect(pages[0].end).toBe(pages[1].start);
    expect(pages[1].end).toBeCloseTo(1.2 + 0.4);
  });
});
