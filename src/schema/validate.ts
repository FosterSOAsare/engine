import type { z } from "zod";
import { LABEL_WRITE_SECONDS } from "../animation/labels";
import { videoSchema, type SceneElement, type Video } from "./scene";

// Checks a scene file and describes every problem in plain words, with
// where it is: scene "lookup", element 3 (arrow): points to unknown id
// "resolvr". Pure, so the validate command, the renderer and the tests all
// use the same rules.

export type ValidationResult =
  | { ok: true; video: Video; errors: [] }
  | { ok: false; video?: Video; errors: string[] };

// Elements an arrow can point to: shapes with edges to attach to.
const ARROW_TARGETS = new Set(["box", "circle", "icon"]);

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

  video.scenes.forEach((scene, sceneIndex) => {
    const sceneName = describeScene(sceneIndex, scene.id);
    if (!scene.keepPrevious) board = new Map();

    if (scene.duration === undefined) {
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

    // Arrows, once every id in the scene is known.
    scene.elements.forEach((element, index) => {
      if (element.type !== "arrow") return;
      const where = `${sceneName}, ${describeElement(index, element.type)}`;
      for (const end of ["from", "to"] as const) {
        const id = element[end];
        const target = board.get(id);
        if (!target) {
          errors.push(`${where}: "${end}" points to unknown id "${id}"`);
        } else if (!ARROW_TARGETS.has(target.type)) {
          errors.push(
            `${where}: "${end}" points to a ${target.type}; arrows connect boxes, circles and icons`,
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

export const validateVideo = (input: unknown): ValidationResult => {
  const parsed = videoSchema.safeParse(input);
  if (!parsed.success) {
    const raw = (typeof input === "object" && input ? input : {}) as Raw;
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => describeIssue(issue, raw)),
    };
  }
  const errors = crossCheck(parsed.data);
  return errors.length === 0
    ? { ok: true, video: parsed.data, errors: [] }
    : { ok: false, video: parsed.data, errors };
};
