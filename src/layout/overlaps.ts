import type { FrameSize } from "../elements/shared";
import type { SceneElement } from "../schema/scene";
import { drawingRects, type Rect } from "./fit";
import type { Drawing, PlannedBoard } from "./plan";

// Texts and pictures that run into each other. Each element's footprint
// (its text, picture or shape, and its label) is compared with every other
// element's on the same board. Arrows' lines and rings are left out: they
// are meant to touch or go around things; an arrow's label still counts.

export type Overlap = {
  scene: string; // where the later of the two is
  a: string; // the two elements, described
  b: string;
  overlap: number; // how much, as a share of the smaller one (0 to 1)
};

// Footprints smaller than this share of the smaller one don't count: text
// widths are estimates, and things may touch.
const TOLERANCE = 0.08;

export const describe = (element: SceneElement) => {
  switch (element.type) {
    case "text":
      return `text "${element.text}"`;
    case "image":
      return `image ${element.name}${element.label ? ` ("${element.label}")` : ""}`;
    case "list":
      return `list "${element.items[0]}..."`;
    case "table":
      return `table${element.title ? ` "${element.title}"` : ""}`;
    case "bubble":
      return `bubble "${element.text}"`;
    case "icon":
      return `icon ${element.name}${element.label ? ` ("${element.label}")` : ""}`;
    case "arrow":
      return `arrow label "${element.label}"`;
    default:
      return (
        element.type +
        ("label" in element && element.label ? ` "${element.label}"` : "")
      );
  }
};

const footprint = (drawing: Drawing, frame: FrameSize): Rect[] => {
  if (drawing.type === "arrow") {
    // Only the label: the line is meant to touch what it connects.
    return drawing.label
      ? drawingRects({ type: "text", props: drawing.label }, frame)
      : [];
  }
  if (drawing.type === "shape" && drawing.props.outline === false) return [];
  return drawingRects(drawing, frame);
};

const area = (r: Rect) =>
  Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);

const shared = (a: Rect, b: Rect) =>
  area({
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  });

export const overlaps = (
  boards: PlannedBoard[],
  frame: FrameSize | ((board: number) => FrameSize),
): Overlap[] =>
  boards.flatMap((board, b) => {
    const size = typeof frame === "function" ? frame(b) : frame;
    // Every element's footprint pieces, by element.
    const byElement = new Map<
      string,
      { scene: string; order: number; element: SceneElement; rects: Rect[] }
    >();
    board.drawings.forEach((drawing, order) => {
      const source = drawing.source;
      if (!source || source.element.type === "ring") return;
      if (source.element.type === "line") return;
      const key = `${source.scene}#${source.index}`;
      const entry = byElement.get(key) ?? {
        scene: source.scene,
        order,
        element: source.element,
        rects: [],
      };
      entry.rects.push(...footprint(drawing, size));
      byElement.set(key, entry);
    });
    const entries = [...byElement.values()].filter((e) => e.rects.length > 0);
    const found: Overlap[] = [];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        let worst = 0;
        for (const r of entries[i].rects) {
          for (const s of entries[j].rects) {
            const smaller = Math.min(area(r), area(s)) || 1;
            worst = Math.max(worst, shared(r, s) / smaller);
          }
        }
        if (worst > TOLERANCE) {
          const later =
            entries[i].order > entries[j].order ? entries[i] : entries[j];
          found.push({
            scene: later.scene,
            a: describe(entries[i].element),
            b: describe(entries[j].element),
            overlap: worst,
          });
        }
      }
    }
    return found;
  });
