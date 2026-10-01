import type { TimedWord } from "./align";

// Splits a scene's spoken words into caption pages of one to three words:
// short enough to read at a glance on a phone. A page ends after
// punctuation, before a pause in the speech, or when it gets too long.

const MAX_WORDS = 3;
const MAX_CHARACTERS = 18;
const PAUSE = 0.35; // seconds of silence that end a page
const LINGER = 0.4; // a scene's last page stays this long after its word

export type CaptionPage = {
  start: number; // seconds from the start of the video
  end: number;
  words: TimedWord[]; // times also from the start of the video
};

const endsSentencePart = (word: string) => /[.,!?;:]["')\]]*$/.test(word);

export const captionPages = (
  words: TimedWord[],
  offset: number, // when the scene starts in the video
): CaptionPage[] => {
  const pages: TimedWord[][] = [];
  let page: TimedWord[] = [];
  words.forEach((word, i) => {
    const shifted = {
      text: word.text,
      start: word.start + offset,
      end: word.end + offset,
    };
    const characters = [...page, shifted].map((w) => w.text).join(" ").length;
    if (
      page.length > 0 &&
      (page.length === MAX_WORDS || characters > MAX_CHARACTERS)
    ) {
      pages.push(page);
      page = [];
    }
    page.push(shifted);
    const next = words[i + 1];
    const pauseFollows = next !== undefined && next.start - word.end > PAUSE;
    if (endsSentencePart(word.text) || pauseFollows) {
      pages.push(page);
      page = [];
    }
  });
  if (page.length > 0) pages.push(page);

  // A page shows from its first word until the next page starts (no gaps
  // flickering between pages of one sentence), the last one a little
  // longer.
  return pages.map((page, i) => {
    const next = pages[i + 1];
    const last = page[page.length - 1];
    return {
      start: page[0].start,
      end: next ? next[0].start : last.end + LINGER,
      words: page,
    };
  });
};
