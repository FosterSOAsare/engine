import { describe, expect, it } from "vitest";
import {
  alignWords,
  findWord,
  narrationWords,
  type TimedWord,
} from "./align";

const heard = (...words: [string, number, number][]): TimedWord[] =>
  words.map(([text, start, end]) => ({ text, start, end }));

describe("alignWords", () => {
  it("keeps the narration's spelling with whisper's times", () => {
    const words = alignWords(
      "That's DNS, the internet's phone book.",
      heard(
        ["That's", 0, 0.3],
        ["the", 0.3, 0.5], // whisper heard "the NS" for "DNS"
        ["NS,", 0.5, 0.9],
        ["the", 0.9, 1],
        ["Internet's", 1, 1.5],
        ["phone", 1.5, 1.8],
        ["book.", 1.8, 2.2],
      ),
    );
    expect(words.map((w) => w.text)).toEqual([
      "That's",
      "DNS,",
      "the",
      "internet's",
      "phone",
      "book.",
    ]);
    expect(words[3]).toMatchObject({ start: 1, end: 1.5 });
    expect(words[5]).toMatchObject({ start: 1.8, end: 2.2 });
  });

  it("gives missed words the time between their neighbours", () => {
    const words = alignWords(
      "one two three four",
      heard(["one", 0, 1], ["four", 3, 4]),
    );
    expect(words[1]).toMatchObject({ text: "two", start: 1, end: 2 });
    expect(words[2]).toMatchObject({ text: "three", start: 2, end: 3 });
  });

  it("ignores punctuation and case when matching", () => {
    const words = alignWords(
      "You type google.com, but",
      heard(
        ["You", 0, 0.3],
        ["type", 0.3, 0.7],
        ["Google.com,", 0.7, 2.1],
        ["but", 2.1, 2.4],
      ),
    );
    expect(words[2]).toMatchObject({ text: "google.com,", start: 0.7 });
  });
});

describe("findWord", () => {
  const words = alignWords(
    "The resolver asks, and the resolver answers in a phone book.",
    heard(
      ["The", 0, 0.2],
      ["resolver", 0.2, 0.8],
      ["asks,", 0.8, 1.2],
      ["and", 1.2, 1.4],
      ["the", 1.4, 1.5],
      ["resolver", 1.5, 2.1],
      ["answers", 2.1, 2.6],
      ["in", 2.6, 2.7],
      ["a", 2.7, 2.8],
      ["phone", 2.8, 3.1],
      ["book.", 3.1, 3.5],
    ),
  );

  it("finds the first time a word is said", () => {
    expect(findWord(words, "resolver")?.start).toBe(0.2);
  });

  it("finds a later time with #n", () => {
    expect(findWord(words, "resolver#2")?.start).toBe(1.5);
  });

  it("finds a phrase by its first word", () => {
    expect(findWord(words, "phone book")?.start).toBe(2.8);
  });

  it("ignores case and punctuation", () => {
    expect(findWord(words, "Book")?.start).toBe(3.1);
  });

  it("returns null for words that aren't said", () => {
    expect(findWord(words, "router")).toBeNull();
  });
});

describe("[pause]", () => {
  it("is not a word", () => {
    expect(narrationWords("one, [pause] two")).toEqual(["one,", "two"]);
  });
});
