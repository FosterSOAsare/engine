import type { z } from "zod";
import { FPS, writtenFormat } from "../layout/formats";
import {
  elementSchema,
  videoSchema,
  type SceneElement,
  type Video,
} from "./scene";
import {
  busyFor,
  resolveTiming,
  type HeardWords,
  type TimedScene,
} from "./timing";

// Checks a scene file and describes every problem in plain words, with
// where it is: scene "lookup", element 3 (arrow): points to unknown id
// "resolvr". Pure, so the validate command, the renderer and the tests all
// use the same rules.

// A checked video: every element has its start time, and narrated scenes
// carry the time of each word.
export type TimedVideo = Omit<Video, "scenes"> & { scenes: TimedScene[] };

export type ValidationResult =
  | { ok: true; video: TimedVideo; errors: [] }
  | { ok: false; video?: TimedVideo; errors: string[] };

// Elements an arrow can point to: shapes with edges to attach to.
const ARROW_TARGETS = new Set([
  "box",
  "circle",
  "ellipse",
  "diamond",
  "triangle",
  "icon",
  "image",
  "table",
]);

// What an id points to on the board: an element, or a table's row
// ("<id>.<row>") or cell ("<id>.<row>.<column>"), which count as the table.
export const targetOf = (
  board: Map<string, SceneElement>,
  id: string,
): SceneElement | undefined => {
  const direct = board.get(id);
  if (direct) return direct;
  const [base, ...parts] = id.split(".");
  const table = board.get(base);
  if (table?.type !== "table" || parts.length < 1 || parts.length > 2) {
    return undefined;
  }
  const [row, column] = parts.map(Number);
  const columns = Math.max(...table.rows.map((r) => r.length));
  const fits = (n: number, max: number) =>
    Number.isInteger(n) && n >= 0 && n < max;
  if (!fits(row, table.rows.length)) return undefined;
  if (parts.length === 2 && !fits(column, columns)) return undefined;
  return table;
};

// Element types only landscape videos have: they need the detailed board.
const LANDSCAPE_ONLY = new Set(["table"]);

// The fields each element type has, for checking "layouts".
const FIELDS: Record<string, Set<string>> = Object.fromEntries(
  elementSchema.options.map((option) => [
    option.shape.type.value,
    new Set(Object.keys(option.shape)),
  ]),
);

// Elements a ring can go around: anything with a visible extent.
const RING_TARGETS = new Set([...ARROW_TARGETS, "text", "bubble"]);

type RawScene = { id?: unknown; elements?: { type?: unknown }[] };
type Raw = { scenes?: RawScene[] };

const describeElement = (index: number, type?: unknown) =>
  `element ${index + 1}${typeof type === "string" ? ` (${type})` : ""}`;

const describeScene = (index: number, id?: unknown) =>
  typeof id === "string" && id.length > 0
    ? `scene "${id}"`
    : `scene ${index + 1}`;

// Turns a Zod path such as ["scenes", 0, "elements", 2, "x"] into
// 'scene "lookup", element 3 (box), field "x"', using the raw file for
// names because parsing failed.
const describePath = (path: PropertyKey[], raw: Raw) => {
  const parts: string[] = [];
  let scene: RawScene | undefined;
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    const next = path[i + 1];
    if (key === "scenes" && typeof next === "number") {
      scene = raw.scenes?.[next];
      parts.push(describeScene(next, scene?.id));
      i++;
    } else if (key === "elements" && typeof next === "number") {
      parts.push(describeElement(next, scene?.elements?.[next]?.type));
      i++;
    } else {
      parts.push(`field "${String(key)}"`);
    }
  }
  return parts.length > 0 ? parts.join(", ") : "file";
};

const describeIssue = (issue: z.core.$ZodIssue, raw: Raw) => {
  const where = describePath(issue.path, raw);
  if (issue.code === "unrecognized_keys") {
    const keys = issue.keys.map((key) => `"${key}"`).join(", ");
    return `${where}: unknown field ${keys}`;
  }
  return `${where}: ${issue.message}`;
};

// When an element keeps the hand busy until: its shape, then its label.
export const busyUntil = (element: SceneElement) =>
  (element.start ?? 0) + busyFor(element);

// Rules the schema alone cannot express.
const crossCheck = (video: Video): string[] => {
  const errors: string[] = [];
  // Elements still on the board from earlier scenes (keepPrevious).
  let board = new Map<string, SceneElement>();

  // Element and hand timing are computed at the engine's frame rate.
  if (video.fps !== FPS) {
    errors.push(`file: fps ${video.fps} is not supported yet; use ${FPS}`);
  }

  video.scenes.forEach((scene, sceneIndex) => {
    const sceneName = describeScene(sceneIndex, scene.id);
    if (!scene.keepPrevious) board = new Map();

    // With a voiceover the audio sets the length (see withAudio); its
    // absence is reported there.
    if (scene.duration === undefined && !video.voiceover) {
      errors.push(`${sceneName}: needs a "duration" (in seconds)`);
    }

    scene.elements.forEach((element, index) => {
      const where = `${sceneName}, ${describeElement(index, element.type)}`;

      if (LANDSCAPE_ONLY.has(element.type) && video.format !== "landscape") {
        errors.push(
          `${where}: ${element.type}s are for landscape videos (detailed boards)`,
        );
      }

      if (element.id !== undefined) {
        if (board.has(element.id)) {
          errors.push(`${where}: id "${element.id}" is already used`);
        }
        board.set(element.id, element);
      }

      // A narrated scene stretches to fit instead (see timing.ts).
      if (scene.duration !== undefined && !video.voiceover) {
        const end = busyUntil(element);
        if (end > scene.duration + 1e-9) {
          errors.push(
            `${where}: ends at ${end} s, after the scene's ${scene.duration} s`,
          );
        }
      }
    });

    // Arrows and rings, once every id in the scene is known.
    scene.elements.forEach((element, index) => {
      const where = `${sceneName}, ${describeElement(index, element.type)}`;
      if (element.type === "arrow") {
        for (const end of ["from", "to"] as const) {
          const id = element[end];
          const target = targetOf(board, id);
          if (!target) {
            errors.push(`${where}: "${end}" points to unknown id "${id}"`);
          } else if (!ARROW_TARGETS.has(target.type)) {
            errors.push(
              `${where}: "${end}" points to a ${target.type}; arrows connect shapes and icons`,
            );
          }
        }
      }
      if (element.type === "ring") {
        const target = targetOf(board, element.target);
        if (!target) {
          errors.push(
            `${where}: "target" points to unknown id "${element.target}"`,
          );
        } else if (!RING_TARGETS.has(target.type)) {
          errors.push(
            `${where}: can't ring a ${target.type}; rings go around shapes, icons and text`,
          );
        }
      }
    });

    // Bubbles point at something on the board.
    scene.elements.forEach((element, index) => {
      if (element.type !== "bubble" || element.to === undefined) return;
      const where = `${sceneName}, ${describeElement(index, element.type)}`;
      const target = targetOf(board, element.to);
      if (!target) {
        errors.push(`${where}: "to" points to unknown id "${element.to}"`);
      } else if (!RING_TARGETS.has(target.type)) {
        errors.push(
          `${where}: "to" points to a ${target.type}; bubbles point at shapes, icons, designs and text`,
        );
      }
    });

    // The camera looks at things on this board.
    (scene.camera ?? []).forEach((move, k) => {
      const at = `${sceneName}, camera move ${k + 1}`;
      if (video.format !== "landscape") {
        errors.push(
          `${at}: the camera is for landscape videos (one big board)`,
        );
        return;
      }
      if (move.focus === "all") return;
      for (const id of move.focus) {
        if (!targetOf(board, id)) {
          errors.push(`${at}: "focus" names unknown id "${id}"`);
        }
      }
    });

    if (scene.place && video.format !== "landscape") {
      errors.push(
        `${sceneName}: "place" is for landscape videos, which put every scene on one board`,
      );
    }

    // Layouts for other formats move this scene's own elements, by id.
    for (const [format, moves] of Object.entries(scene.layouts ?? {})) {
      const at = `${sceneName}, layouts.${format}`;
      if (video.format === "landscape") {
        errors.push(`${at}: landscape videos are made only in landscape`);
        continue;
      }
      if (format === writtenFormat(video.format)) {
        errors.push(
          `${at}: the file is written in ${format}; change the elements themselves`,
        );
        continue;
      }
      for (const [id, move] of Object.entries(moves ?? {})) {
        const element = scene.elements.find((e) => e.id === id);
        if (!element) {
          errors.push(`${at}: no element with id "${id}" in this scene`);
          continue;
        }
        for (const field of Object.keys(move)) {
          if (!FIELDS[element.type]?.has(field)) {
            errors.push(`${at}.${id}: a ${element.type} has no "${field}"`);
          }
        }
      }
    }
  });

  if (
    typeof video.cover === "string" &&
    !video.scenes.some((scene) => scene.id === video.cover)
  ) {
    errors.push(`file: "cover" names no scene "${video.cover}"`);
  }

  return errors;
};

// Each scene's narration length in seconds, in scene order; null where the
// audio file is missing. Measured by the composition before rendering.
export type AudioLengths = (number | null)[];

// A voiceover video's scenes last as long as their narration plus the
// pause, or their "duration" if that is longer.
const withAudio = (video: Video, audio: AudioLengths) => {
  const errors: string[] = [];
  const scenes = video.scenes.map((scene, index) => {
    const seconds = audio[index];
    if (seconds === null || seconds === undefined) {
      errors.push(
        `${describeScene(index, scene.id)}: no narration audio yet; run npm run voice`,
      );
      return scene;
    }
    return {
      ...scene,
      duration: Math.max(scene.duration ?? 0, seconds + scene.pause),
    };
  });
  return { video: { ...video, scenes }, errors };
};

// Checks a scene file and works out its timing. For a voiceover video,
// pass the measured narration lengths and whisper's words: scene lengths
// then follow the audio and drawings follow the words.
export const validateVideo = (
  input: unknown,
  audio?: AudioLengths,
  heard?: HeardWords,
): ValidationResult => {
  const parsed = videoSchema.safeParse(input);
  if (!parsed.success) {
    const raw = (typeof input === "object" && input ? input : {}) as Raw;
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => describeIssue(issue, raw)),
    };
  }
  const voiced =
    parsed.data.voiceover && audio
      ? withAudio(parsed.data, audio)
      : { video: parsed.data, errors: [] };
  const timed = resolveTiming(voiced.video, heard, audio);
  const errors = [
    ...voiced.errors,
    ...timed.errors,
    ...crossCheck(timed.video),
  ];
  return errors.length === 0
    ? { ok: true, video: timed.video, errors: [] }
    : { ok: false, video: timed.video, errors };
};
