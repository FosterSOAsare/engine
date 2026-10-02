import { describe, expect, it } from "vitest";
import { chapterSpans } from "../Chapter";
import { AREA } from "../layout/canvas";
import { planVideo } from "../layout/plan";
import { validateVideo } from "../schema/validate";
import { wrapText } from "./Text";

const video = (elements: unknown[]) => ({
  version: 1,
  title: "Test",
  format: "landscape",
  scenes: [{ id: "main", duration: 10, narration: "", elements }],
});

const person = { type: "circle", id: "you", x: 20, y: 60, size: 10, start: 0, draw: 1 };
const bubble = {
  type: "bubble",
  x: 50,
  y: 30,
  w: 30,
  text: "Who were the members of the Beatles?",
  to: "you",
  start: 1,
  draw: 2,
};

describe("wrapText", () => {
  it("breaks at spaces and on new lines", () => {
    expect(wrapText("one two three four", 9)).toEqual(["one two", "three", "four"]);
    expect(wrapText("a\nb c", 10)).toEqual(["a", "b c"]);
    expect(wrapText("unbreakable", 4)).toEqual(["unbreakable"]);
  });
});

describe("bubble", () => {
  it("draws a box, a tail to what it points at, then its text in order", () => {
    const result = validateVideo(video([person, bubble]));
    expect(result.errors).toEqual([]);
    const drawings = planVideo(result.video!, AREA)[0].drawings.slice(1);
    expect(drawings.map((d) => d.type)).toEqual([
      "shape",
      "arrow",
      "arrow",
      ...drawings.slice(3).map(() => "text"),
    ]);
    const words = drawings
      .slice(3)
      .map((d) => (d.type === "text" ? d.props.text : ""))
      .join(" ");
    expect(words).toBe(bubble.text);
    const last = drawings[drawings.length - 1].props;
    expect(last.start + last.draw).toBeCloseTo(3);
  });

  it("points only at things on the board", () => {
    expect(validateVideo(video([{ ...bubble, to: "nobody" }])).errors).toEqual([
      'scene "main", element 1 (bubble): "to" points to unknown id "nobody"',
    ]);
  });
});

describe("chapterSpans", () => {
  it("keeps a chapter until another one, and clears on empty", () => {
    const spans = chapterSpans(
      [{ chapter: "1NF" }, {}, { chapter: "2NF" }, { chapter: "" }],
      [0, 5, 10, 15],
      20,
    );
    expect(spans).toEqual([
      { text: "1NF", start: 0, end: 10 },
      { text: "2NF", start: 10, end: 15 },
    ]);
  });
});
