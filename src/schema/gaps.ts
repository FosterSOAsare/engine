import { popsIn, type VideoStyle } from "./scene";
import { busyFor, type TimedScene } from "./timing";

// Quiet stretches: the voice keeps talking but nothing new appears on
// screen. Long ones lose viewers; fill them with a built-in icon, a short
// handwritten note, an arrow, a ring or a camera move.

export const QUIET_LIMIT = 4.5; // seconds

export type QuietStretch = {
  scene: string;
  from: number; // seconds into the scene
  to: number;
  said: string; // the words spoken meanwhile
};

// When something new starts on screen, and how long it keeps moving.
const activity = (scene: TimedScene, style: VideoStyle) =>
  [
    ...scene.elements.flatMap((element) => {
      const pop = popsIn(style, element);
      return element.itemTimes
        ? element.itemTimes.map((t) => ({
            start: t.start,
            end: t.start + (pop ? 0 : t.draw),
          }))
        : [
            {
              start: element.start ?? 0,
              end: (element.start ?? 0) + (pop ? 0 : busyFor(element)),
            },
          ];
    }),
    ...scene.cameraTimes.map((t) => ({ start: t, end: t })),
  ].sort((a, b) => a.start - b.start);

export const quietStretches = (
  scenes: TimedScene[],
  style: VideoStyle = "handwritten",
  limit = QUIET_LIMIT,
): QuietStretch[] =>
  scenes.flatMap((scene) => {
    const words = scene.words ?? [];
    if (words.length === 0) return [];
    const speechEnd = words[words.length - 1].end;
    const stretches: QuietStretch[] = [];
    let busyUntil = 0;
    for (const { start, end } of [
      ...activity(scene, style),
      { start: speechEnd, end: speechEnd },
    ]) {
      const to = Math.min(start, speechEnd);
      if (to - busyUntil > limit) {
        stretches.push({
          scene: scene.id,
          from: busyUntil,
          to,
          said: words
            .filter((w) => w.start >= busyUntil && w.start < to)
            .map((w) => w.text)
            .join(" "),
        });
      }
      busyUntil = Math.max(busyUntil, end);
    }
    return stretches;
  });
