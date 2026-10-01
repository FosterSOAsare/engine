// Gives every word of a narration line the time it is spoken, using
// whisper's timed words. Whisper's spelling is not trusted ("DNS" can come
// out as "the NS"): the words are matched in order and the narration's own
// spelling is kept. Words whisper missed get times between their
// neighbours.

export type TimedWord = { text: string; start: number; end: number };

// "Google.com," and "google.com" are the same word; so are "don't" and
// "dont". Only letters and digits count.
export const normalize = (word: string) =>
  word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export const narrationWords = (narration: string) =>
  narration.split(/\s+/).filter((word) => normalize(word).length > 0);

// Matches two word lists in order (edit distance): equal words match,
// different words in the same place are substitutions, the rest are
// skipped. Returns, for each narration word, the index of its whisper word
// or -1.
const matchInOrder = (said: string[], heard: string[]) => {
  const n = said.length;
  const m = heard.length;
  // cost[i][j]: cheapest way to align said[i..] with heard[j..].
  const cost = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n; i >= 0; i--) {
    for (let j = m; j >= 0; j--) {
      if (i === n) cost[i][j] = m - j;
      else if (j === m) cost[i][j] = n - i;
      else {
        const same = said[i] === heard[j] ? 0 : 1;
        cost[i][j] = Math.min(
          same + cost[i + 1][j + 1],
          1 + cost[i + 1][j],
          1 + cost[i][j + 1],
        );
      }
    }
  }
  const match = new Array<number>(n).fill(-1);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const same = said[i] === heard[j] ? 0 : 1;
    if (cost[i][j] === same + cost[i + 1][j + 1]) {
      match[i] = j;
      i++;
      j++;
    } else if (cost[i][j] === 1 + cost[i + 1][j]) {
      i++;
    } else {
      j++;
    }
  }
  return match;
};

export const alignWords = (
  narration: string,
  heard: TimedWord[],
  audioLength?: number,
): TimedWord[] => {
  const words = narrationWords(narration);
  if (words.length === 0) return [];
  const match = matchInOrder(
    words.map(normalize),
    heard.map((word) => normalize(word.text)),
  );
  const timed: (TimedWord | null)[] = words.map((text, i) =>
    match[i] >= 0
      ? { text, start: heard[match[i]].start, end: heard[match[i]].end }
      : null,
  );

  // Fill the gaps: missed words share the time between their neighbours.
  const lastEnd = audioLength ?? heard[heard.length - 1]?.end ?? words.length;
  let i = 0;
  while (i < timed.length) {
    if (timed[i]) {
      i++;
      continue;
    }
    let k = i;
    while (k < timed.length && !timed[k]) k++;
    const from = i > 0 ? timed[i - 1]!.end : 0;
    const to = k < timed.length ? timed[k]!.start : Math.max(lastEnd, from);
    const step = (to - from) / (k - i);
    for (let w = i; w < k; w++) {
      timed[w] = {
        text: words[w],
        start: from + step * (w - i),
        end: from + step * (w - i + 1),
      };
    }
    i = k;
  }
  return timed as TimedWord[];
};

// When a word is spoken: "resolver" is its first time in the line,
// "resolver#2" the second. Several words ("phone book") match a run of
// words and give the time of the first. null if the line doesn't say it.
export const findWord = (words: TimedWord[], wanted: string) => {
  const [phrase, nth] = wanted.split("#");
  const target = narrationWords(phrase).map(normalize);
  if (target.length === 0) return null;
  let count = Number(nth ?? 1);
  for (let i = 0; i + target.length <= words.length; i++) {
    const hit = target.every(
      (word, k) => normalize(words[i + k].text) === word,
    );
    if (hit && --count === 0) return words[i];
  }
  return null;
};
