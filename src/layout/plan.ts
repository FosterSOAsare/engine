import type { HandTrack } from "../animation/hand";
import { LABEL_WRITE_SECONDS } from "../animation/labels";
import { boards as timelineBoards } from "../animation/timeline";
import { arrowTracks, type ArrowProps } from "../elements/Arrow";
import { shapeTracks, type ShapeProps } from "../elements/Shape";
import { textTrack, textWidth, type TextProps } from "../elements/Text";
import type { FrameSize } from "../elements/shared";
import type { SceneElement, Video } from "../schema/scene";
import { listItemTimes, type TimedElement } from "../schema/timing";
import { connect, type Outline } from "./edges";

// Turns a parsed scene file into what is drawn: element props with
// absolute times (seconds from the start of the video), seeds filled in,
// arrows attached to the shapes they connect, lists split into lines and
// rings sized around their targets.

const ARROW_GAP = 3; // percent of the shorter side, between arrow and shape
const ARROW_LABEL_SIZE = 6; // percent of the shorter side
const RING_COLOR = "#c0392b"; // rings point things out, so red by default

export type Drawing =
  | { type: "shape"; props: ShapeProps }
  | { type: "text"; props: TextProps }
  | { type: "arrow"; props: ArrowProps; label: TextProps | null };

export type PlannedBoard = {
  start: number; // seconds
  end: number;
  wipes: boolean; // erased at its end
  drawings: Drawing[];
};

// A stable seed from a string, so an element without a seed still looks
// the same on every render.
export const seedFrom = (text: string) => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 1_000_000;
};

const unitOf = (frame: FrameSize) => Math.min(frame.width, frame.height) / 100;

const toPercent = (point: { x: number; y: number }, frame: FrameSize) => ({
  x: (point.x / frame.width) * 100,
  y: (point.y / frame.height) * 100,
});

// The outline of an element, in pixels: what arrows attach to and rings go
// around. null for elements without one (arrows, lines, lists, rings).
const outlineOf = (element: SceneElement, frame: FrameSize): Outline | null => {
  const unit = unitOf(frame);
  if (!("x" in element) || element.type === "list") return null;
  const cx = (element.x / 100) * frame.width;
  const cy = (element.y / 100) * frame.height;

  switch (element.type) {
    case "text": {
      const fontSize = element.size * unit;
      return {
        kind: "rect",
        cx,
        cy,
        halfW: textWidth(element.text, fontSize) / 2,
        halfH: fontSize * 0.6,
      };
    }
    case "circle":
    case "icon": {
      const half = (element.size * unit) / 2;
      return element.type === "circle"
        ? { kind: "ellipse", cx, cy, halfW: half, halfH: half }
        : { kind: "rect", cx, cy, halfW: half, halfH: half };
    }
    default: {
      const halfW = (element.w * unit) / 2;
      const halfH = (element.h * unit) / 2;
      switch (element.type) {
        case "box":
          return { kind: "rect", cx, cy, halfW, halfH };
        case "ellipse":
          return { kind: "ellipse", cx, cy, halfW, halfH };
        case "diamond":
          return { kind: "diamond", cx, cy, halfW, halfH };
        case "triangle":
          return {
            kind: "polygon",
            cx,
            cy,
            corners: [
              { x: 0, y: -halfH },
              { x: halfW, y: halfH },
              { x: -halfW, y: halfH },
            ],
          };
      }
    }
  }
};

// Half the width and height of an ellipse that goes around an outline.
const ringAround = (outline: Outline, padding: number) => {
  if (outline.kind === "polygon") {
    const xs = outline.corners.map((c) => Math.abs(c.x));
    const ys = outline.corners.map((c) => Math.abs(c.y));
    return {
      halfW: Math.max(...xs) * 1.2 + padding,
      halfH: Math.max(...ys) * 1.2 + padding,
    };
  }
  // An ellipse through a rectangle's corners is √2 times its half-sizes.
  const grow = outline.kind === "rect" ? Math.SQRT2 : 1;
  return {
    halfW: outline.halfW * grow + padding,
    halfH: outline.halfH * grow + padding,
  };
};

// An arrow's label sits beside the middle of the arrow: to the right of a
// vertical arrow, above a horizontal one, never on top of the line. A
// curved arrow bulges towards that same side (a positive bend), so its
// label moves to the other side, inside the curve.
const arrowLabel = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  text: string,
  arrow: { start: number; draw: number; color?: string; bend?: number },
  frame: FrameSize,
): TextProps => {
  const unit = unitOf(frame);
  const fontSize = ARROW_LABEL_SIZE * unit;
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const side = (arrow.bend ?? 0) > 0 ? -1 : 1;
  const nx = (side * (to.y - from.y)) / length;
  const ny = (side * -(to.x - from.x)) / length;
  const distance =
    Math.abs(nx) * (textWidth(text, fontSize) / 2) +
    Math.abs(ny) * (fontSize / 2) +
    2 * unit;
  return {
    ...toPercent(
      {
        x: (from.x + to.x) / 2 + nx * distance,
        y: (from.y + to.y) / 2 + ny * distance,
      },
      frame,
    ),
    size: ARROW_LABEL_SIZE,
    text,
    color: arrow.color,
    start: arrow.start + arrow.draw,
    draw: LABEL_WRITE_SECONDS,
  };
};

// One element of the scene file as drawings (a list gives one per line).
const drawingsOf = (
  element: SceneElement,
  common: { start: number; draw: number; color?: string; seed: number },
  outlines: Map<string, Outline>,
  frame: FrameSize,
): Drawing[] => {
  const unit = unitOf(frame);
  const { start, draw, color } = common;

  switch (element.type) {
    case "box":
    case "ellipse":
    case "diamond":
    case "triangle": {
      const { type, x, y, w, h, label, fill, fillStyle } = element;
      return [
        {
          type: "shape",
          props: { ...common, kind: type, x, y, w, h, label, fill, fillStyle },
        },
      ];
    }
    case "circle":
    case "icon": {
      const { x, y, size, label, fill, fillStyle } = element;
      return [
        {
          type: "shape",
          props: {
            ...common,
            kind: element.type,
            icon: element.type === "icon" ? element.name : undefined,
            x,
            y,
            w: size,
            h: size,
            label,
            fill,
            fillStyle,
          },
        },
      ];
    }
    case "text": {
      const { x, y, size, text, align } = element;
      return [
        {
          type: "text",
          props: { start, draw, color, x, y, size, text, align },
        },
      ];
    }
    case "list": {
      // One line per item, at the times the timing step worked out (with a
      // pause between items, and in narrated videos when each is said).
      const { x, y, size, items, bullet, spacing, itemGap } = element;
      // Item times are relative to the scene; this is where it starts.
      const sceneOffset = start - (element.start ?? 0);
      const times =
        (element as TimedElement).itemTimes ??
        listItemTimes(items, element.start ?? 0, draw, itemGap, null);
      const lineHeight = ((size * spacing * unit) / frame.height) * 100;
      return items.map((item, i) => {
        const props: TextProps = {
          start: times[i].start + sceneOffset,
          draw: times[i].draw,
          color,
          x,
          y: y + i * lineHeight,
          size,
          text: bullet ? `${bullet} ${item}` : item,
          align: "left",
        };
        return { type: "text", props };
      });
    }
    case "arrow":
    case "line": {
      let from: { x: number; y: number };
      let to: { x: number; y: number };
      if (element.type === "line") {
        from = {
          x: (element.x1 / 100) * frame.width,
          y: (element.y1 / 100) * frame.height,
        };
        to = {
          x: (element.x2 / 100) * frame.width,
          y: (element.y2 / 100) * frame.height,
        };
      } else {
        const a = outlines.get(element.from);
        const b = outlines.get(element.to);
        // The validator rejects these; skip rather than crash.
        if (!a || !b) return [];
        ({ from, to } = connect(a, b, ARROW_GAP * unit));
      }
      const label = element.type === "arrow" ? element.label : undefined;
      return [
        {
          type: "arrow",
          props: {
            ...common,
            from: toPercent(from, frame),
            to: toPercent(to, frame),
            bend: element.bend,
            head: element.type === "arrow" ? element.head : "none",
          },
          label: label
            ? arrowLabel(
                from,
                to,
                label,
                { ...common, bend: element.bend },
                frame,
              )
            : null,
        },
      ];
    }
    case "ring": {
      const target = outlines.get(element.target);
      if (!target) return [];
      const { halfW, halfH } = ringAround(target, element.padding * unit);
      return [
        {
          type: "shape",
          props: {
            ...common,
            color: color ?? RING_COLOR,
            kind: "ellipse",
            ...toPercent({ x: target.cx, y: target.cy }, frame),
            w: (2 * halfW) / unit,
            h: (2 * halfH) / unit,
          },
        },
      ];
    }
  }
};

export const planVideo = (video: Video, frame: FrameSize): PlannedBoard[] =>
  timelineBoards(video).map((board) => {
    const drawings: Drawing[] = [];
    // Outlines of everything on this board so far, by id, for arrows and
    // rings. Filled in per scene before drawing, since an arrow may point
    // to a shape drawn after it.
    const outlines = new Map<string, Outline>();

    for (const { scene, start: sceneStart } of board.scenes) {
      for (const element of scene.elements) {
        const outline = element.id ? outlineOf(element, frame) : null;
        if (element.id && outline) outlines.set(element.id, outline);
      }

      scene.elements.forEach((element, index) => {
        const common = {
          start: sceneStart + (element.start ?? 0),
          draw: element.draw,
          color: element.color,
          seed: element.seed ?? seedFrom(element.id ?? `${scene.id}#${index}`),
        };
        drawings.push(...drawingsOf(element, common, outlines, frame));
      });
    }

    return {
      start: board.start,
      end: board.end,
      wipes: board.wipes,
      drawings,
    };
  });

// Everything the hand draws, in order, across the whole video.
export const handTracks = (
  boards: PlannedBoard[],
  frame: FrameSize,
): HandTrack[] =>
  boards.flatMap((board) =>
    board.drawings.flatMap((drawing) => {
      switch (drawing.type) {
        case "shape":
          return shapeTracks(drawing.props, frame);
        case "text":
          return [textTrack(drawing.props, frame)];
        case "arrow":
          return [
            ...arrowTracks(drawing.props, frame),
            ...(drawing.label ? [textTrack(drawing.label, frame)] : []),
          ];
      }
    }),
  );
