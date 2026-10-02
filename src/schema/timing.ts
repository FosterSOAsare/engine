import { LABEL_WRITE_SECONDS } from "../animation/labels";
import { alignWords, findWord, type TimedWord } from "../captions/align";
import type { Scene, SceneElement, Video } from "./scene";

// Decides when every element starts. In file order, each element asks for
// a time:
//   "start": 2.5        that time (seconds into its scene)
//   "at": "resolver"    when the narration says "resolver"
//   neither             when the narration says its label, text or icon
//                       name; otherwise right after the previous element
// and never starts before the previous element is finished: the hand
// draws one thing at a time, so elements queue rather than clash.

const QUEUE_GAP = 0.15; // between drawings that just follow each other
const FIRST_START = 0.3; // a scene's first drawing, if nothing says when
const END_PAUSE = 0.5; // a narrated scene lasts this long past its drawings
const MAX_STRETCH = 3; // a narrated drawing slows to at most 3x its "draw"

// Whisper's timed words per scene id (public/videos/<id>/captions.json).
export type HeardWords = Record<string, { words: TimedWord[] }>;

// How long an element keeps the hand busy: its shape, then its label.
export const busyFor = (element: SceneElement) => {
  const hasLabel = "label" in element && element.label;
  return element.draw + (hasLabel ? LABEL_WRITE_SECONDS : 0);
};

// What an element is called, to find it in the narration.
const namesOf = (element: SceneElement): string[] => {
  const names: string[] = [];
  if ("label" in element && element.label) names.push(element.label);
  if (element.type === "text") names.push(element.text);
  if (element.type === "icon") names.push(element.name.replace(/-/g, " "));
  if (element.type === "list") names.push(element.items[0]);
  if (element.type === "table" && element.title) names.push(element.title);
  if (element.type === "image") {
    // "tech/laptop" is said as "laptop"; numbered designs have no name.
    const last = element.name.split("/").pop() ?? "";
    if (!/^[\d-]*$/.test(last) && !/-\d+$/.test(last)) names.push(last);
  }
  return names;
};

// The narration word that names the element: the whole label first, then
// its words one by one (longest first, short words skipped).
const autoWord = (element: SceneElement, words: TimedWord[]) =>
  wordFor(namesOf(element), words);

const wordFor = (names: string[], words: TimedWord[]) => {
  for (const name of names) {
    const phrase = findWord(words, name);
    if (phrase) return phrase;
    const parts = name
      .split(/\s+/)
      .filter((part) => part.replace(/\W/g, "").length >= 4)
      .sort((a, b) => b.length - a.length);
    for (const part of parts) {
      const word = findWord(words, part);
      if (word) return word;
    }
  }
  return null;
};

// A list's items are written one after another with a pause between them
// ("itemGap"). The writing itself shares the list's "draw" time by length.
// In a narrated video each item also waits until it is said.
const MIN_ITEM_DRAW = 0.3;

export type ItemTime = { start: number; draw: number };

export const listItemTimes = (
  items: string[],
  start: number,
  draw: number,
  gap: number,
  words: TimedWord[] | null,
  names: string[] = items, // what to listen for, per item
): ItemTime[] => {
  const lengths = items.map((item) => Math.max(item.length, 1));
  const total = lengths.reduce((sum, l) => sum + l, 0);
  const writing = Math.max(
    draw - gap * (items.length - 1),
    MIN_ITEM_DRAW * items.length,
  );
  let previousEnd = start;
  return items.map((item, i) => {
    const itemDraw = Math.max((writing * lengths[i]) / total, MIN_ITEM_DRAW);
    let itemStart = i === 0 ? start : previousEnd + gap;
    const said = words ? wordFor([names[i]], words)?.start : undefined;
    if (said !== undefined && said > itemStart) itemStart = said;
    previousEnd = itemStart + itemDraw;
    return { start: itemStart, draw: itemDraw };
  });
};

// A table's rows are written after its grid, at about this many seconds per
// letter, each waiting until its first cell is said.
const TABLE_SECONDS_PER_LETTER = 0.045;

export const tableRowTimes = (
  rows: string[][],
  from: number,
  gap: number,
  words: TimedWord[] | null,
) => {
  const texts = rows.map((row) => row.filter(Boolean).join(" ") || " ");
  const letters = texts.reduce((sum, text) => sum + text.length, 0);
  return listItemTimes(
    texts,
    from,
    letters * TABLE_SECONDS_PER_LETTER + gap * (rows.length - 1),
    gap,
    words,
    rows.map((row) => row.find(Boolean) ?? ""),
  );
};

// "itemTimes": when each list item or table row is written. "gridDraw": how
// long a table's grid takes (its "draw" then covers the whole table).
export type TimedElement = SceneElement & {
  itemTimes?: ItemTime[];
  gridDraw?: number;
};
export type TimedScene = Omit<Scene, "elements"> & {
  elements: TimedElement[];
  words: TimedWord[] | null;
  // When each camera move happens, seconds into the scene (landscape).
  cameraTimes: number[];
};

// A camera move back to "all" with no time of its own comes this long after
// what the previous move looked at is finished.
const CAMERA_LINGER = 1;

export const resolveTiming = (
  video: Video,
  heard: HeardWords | undefined,
  audio: (number | null)[] | undefined,
) => {
  const errors: string[] = [];
  const scenes: TimedScene[] = video.scenes.map((scene, index) => {
    const name = `scene "${scene.id}"`;
    const said = heard?.[scene.id]?.words;
    const words = said
      ? alignWords(scene.narration, said, audio?.[index] ?? undefined)
      : null;

    // 1. When each element wants to start, if anything says.
    const wanted = scene.elements.map((element, i) => {
      if (element.start !== undefined) return element.start;
      if (element.at !== undefined) {
        // Whether the line says the word is known from the text alone;
        // when it is said needs the word timings (npm run captions).
        // Without them the element just follows the previous one.
        const said = findWord(
          words ?? alignWords(scene.narration, []),
          element.at,
        );
        if (!said) {
          errors.push(
            `${name}, element ${i + 1} (${element.type}): the narration never says "${element.at}"`,
          );
        }
        return words ? said?.start : undefined;
      }
      return words ? autoWord(element, words)?.start : undefined;
    });

    // 2. Place them in order. Narrated drawings also slow down to fill the
    // time until the next element's word (sharing it with any elements in
    // between), so the hand keeps drawing while the voice talks instead of
    // finishing early and waiting. "draw" is then the fastest it goes.
    const stretch = video.voiceover && words !== null;
    const narrationEnd = words?.[words.length - 1]?.end ?? 0;
    let previousEnd = 0;
    const elements = scene.elements.map((element, i) => {
      const start =
        wanted[i] !== undefined
          ? Math.max(wanted[i]!, previousEnd)
          : i === 0
            ? FIRST_START
            : previousEnd + QUEUE_GAP;
      let draw = element.draw;
      if (element.type === "list") {
        // Items set their own pace (and pauses); the list lasts until its
        // last item is written.
        const itemTimes = listItemTimes(
          element.items,
          start,
          element.draw,
          element.itemGap,
          words,
        );
        const last = itemTimes[itemTimes.length - 1];
        const placed = {
          ...element,
          start,
          draw: last.start + last.draw - start,
          itemTimes,
        };
        previousEnd = start + placed.draw;
        return placed;
      }
      if (element.type === "table") {
        // The grid, then the rows at their own pace.
        const itemTimes = tableRowTimes(
          element.rows,
          start + element.draw,
          element.rowGap,
          words,
        );
        const last = itemTimes[itemTimes.length - 1];
        const placed = {
          ...element,
          start,
          draw: last.start + last.draw - start,
          gridDraw: element.draw,
          itemTimes,
        };
        previousEnd = start + placed.draw;
        return placed;
      }
      if (stretch) {
        let next = i + 1;
        while (next < wanted.length && wanted[next] === undefined) next++;
        const until = next < wanted.length ? wanted[next]! : narrationEnd;
        const share = (until - start) / (next - i);
        const label = busyFor(element) - element.draw;
        draw = Math.min(
          Math.max(share - QUEUE_GAP - label, element.draw),
          element.draw * MAX_STRETCH,
        );
      }
      const placed = { ...element, start, draw };
      previousEnd = start + busyFor(placed);
      return placed;
    });

    // 3. Camera moves: at their time, their word, or when the first thing
    // they look at starts drawing. A move back to "all" without a time
    // follows the previous move's elements once they are drawn.
    const placedById = (id: string) =>
      elements.find((element) => element.id === id.split(".")[0]);
    let previousFocus: TimedElement | undefined;
    let previousTime = 0;
    const cameraTimes = (scene.camera ?? []).map((move, k) => {
      let time: number | undefined = move.start;
      if (time === undefined && move.at !== undefined) {
        const said = findWord(words ?? alignWords(scene.narration, []), move.at);
        if (!said) {
          errors.push(
            `${name}, camera move ${k + 1}: the narration never says "${move.at}"`,
          );
        }
        time = words ? said?.start : undefined;
      }
      const focused =
        move.focus === "all" ? undefined : placedById(move.focus[0]);
      if (time === undefined) {
        time = focused
          ? (focused.start ?? 0)
          : previousFocus
            ? (previousFocus.start ?? 0) + busyFor(previousFocus) + CAMERA_LINGER
            : previousTime;
      }
      previousFocus = focused;
      previousTime = time;
      return time;
    });

    // A narrated scene stretches to fit its drawings.
    const duration =
      video.voiceover && scene.duration !== undefined
        ? Math.max(scene.duration, previousEnd + END_PAUSE)
        : scene.duration;
    return { ...scene, elements, duration, words, cameraTimes };
  });

  return { video: { ...video, scenes }, errors };
};
