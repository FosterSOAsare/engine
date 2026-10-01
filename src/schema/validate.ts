import type { z } from "zod";
import { LABEL_WRITE_SECONDS } from "../animation/labels";
import { FPS } from "../layout/formats";
import { videoSchema, type SceneElement, type Video } from "./scene";

// Checks a scene file and describes every problem in plain words, with
// where it is: scene "lookup", element 3 (arrow): points to unknown id
// "resolvr". Pure, so the validate command, the renderer and the tests all
// use the same rules.

export type ValidationResult =
  | { ok: true; video: Video; errors: [] }
  | { ok: false; video?: Video; errors: string[] };

// Elements an arrow can point to: shapes with edges to attach to.
const ARROW_TARGETS = new Set([
  "box",
  "circle",
  "ellipse",
  "diamond",
  "triangle",
  "icon",
]);

// Elements a ring can go around: anything with a visible extent.
const RING_TARGETS = new Set([...ARROW_TARGETS, "text"]);

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
export const busyUntil = (element: SceneElement) => {
  const hasLabel = "label" in element && element.label;
  return element.start + element.draw + (hasLabel ? LABEL_WRITE_SECONDS : 0);
};

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

      if (element.id !== undefined) {
        if (board.has(element.id)) {
          errors.push(`${where}: id "${element.id}" is already used`);
        }
        board.set(element.id, element);
      }

      if (scene.duration !== undefined) {
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
          const target = board.get(id);
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
        const target = board.get(element.target);
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

    // The hand draws one thing at a time.
    const windows = scene.elements
      .map((element, index) => ({
        index,
        type: element.type,
        start: element.start,
        end: busyUntil(element),
      }))
      .sort((a, b) => a.start - b.start);
    for (let i = 1; i < windows.length; i++) {
      const previous = windows[i - 1];
      const current = windows[i];
      if (current.start < previous.end - 1e-9) {
        errors.push(
          `${sceneName}, ${describeElement(current.index, current.type)}: starts at ${current.start} s, while ${describeElement(previous.index, previous.type)} is still being drawn (until ${previous.end} s)`,
        );
      }
    }
  });

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

// Checks a scene file. For a voiceover video, pass the measured narration
// lengths: the returned video then has every scene's duration resolved.
export const validateVideo = (
  input: unknown,
  audio?: AudioLengths,
): ValidationResult => {
  const parsed = videoSchema.safeParse(input);
  if (!parsed.success) {
    const raw = (typeof input === "object" && input ? input : {}) as Raw;
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => describeIssue(issue, raw)),
    };
  }
  const resolved =
    parsed.data.voiceover && audio
      ? withAudio(parsed.data, audio)
      : { video: parsed.data, errors: [] };
  const errors = [...resolved.errors, ...crossCheck(resolved.video)];
  return errors.length === 0
    ? { ok: true, video: resolved.video, errors: [] }
    : { ok: false, video: resolved.video, errors };
};
