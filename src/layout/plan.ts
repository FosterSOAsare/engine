import type { HandTrack } from "../animation/hand";
import { boards as timelineBoards } from "../animation/timeline";
import { LABEL_WRITE_SECONDS } from "../animation/labels";
import { arrowTracks, type ArrowProps } from "../elements/Arrow";
import { boxTracks, type BoxProps } from "../elements/Box";
import { circleTracks, type CircleProps } from "../elements/Circle";
import { textTrack, textWidth, type TextProps } from "../elements/Text";
import type { FrameSize } from "../elements/shared";
import type { SceneElement, Video } from "../schema/scene";
import { connect, type Outline } from "./edges";

// Turns a parsed scene file into what is drawn: element props with
// absolute times (seconds from the start of the video), seeds filled in
// and arrows attached to the shapes they connect.

const ARROW_GAP = 3; // percent of the shorter side, between arrow and shape
const ARROW_LABEL_SIZE = 6; // percent of the shorter side

export type Drawing =
  | { type: "box"; props: BoxProps }
  | { type: "circle"; props: CircleProps }
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

// The outline an arrow attaches to, in pixels.
const outlineOf = (element: SceneElement, frame: FrameSize): Outline | null => {
  if (element.type === "arrow" || element.type === "text") return null;
  const unit = Math.min(frame.width, frame.height) / 100;
  const cx = (element.x / 100) * frame.width;
  const cy = (element.y / 100) * frame.height;
  if (element.type === "box") {
    return {
      kind: "rect",
      cx,
      cy,
      halfW: (element.w * unit) / 2,
      halfH: (element.h * unit) / 2,
    };
  }
  if (element.type === "circle") {
    return { kind: "circle", cx, cy, r: (element.size * unit) / 2 };
  }
  // Icons: their square.
  const half = (element.size * unit) / 2;
  return { kind: "rect", cx, cy, halfW: half, halfH: half };
};

const toPercent = (point: { x: number; y: number }, frame: FrameSize) => ({
  x: (point.x / frame.width) * 100,
  y: (point.y / frame.height) * 100,
});

// An arrow's label sits beside the middle of the arrow: to the right of a
// vertical arrow, above a horizontal one, never on top of the line.
const arrowLabel = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  text: string,
  arrow: { start: number; draw: number; color?: string },
  frame: FrameSize,
): TextProps => {
  const unit = Math.min(frame.width, frame.height) / 100;
  const fontSize = ARROW_LABEL_SIZE * unit;
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const nx = (to.y - from.y) / length;
  const ny = -(to.x - from.x) / length;
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

export const planVideo = (video: Video, frame: FrameSize): PlannedBoard[] => {
  const unit = Math.min(frame.width, frame.height) / 100;

  return timelineBoards(video).map((board) => {
    const drawings: Drawing[] = [];
    // Every shape on this board so far, for arrows to find by id.
    const shapes = new Map<string, SceneElement>();

    for (const { scene, start: sceneStart } of board.scenes) {
      for (const element of scene.elements) {
        if (element.id) shapes.set(element.id, element);
      }

      scene.elements.forEach((element, index) => {
        const common = {
          start: sceneStart + element.start,
          draw: element.draw,
          color: element.color,
          seed: element.seed ?? seedFrom(element.id ?? `${scene.id}#${index}`),
        };

        switch (element.type) {
          case "box": {
            const { x, y, w, h, label } = element;
            drawings.push({
              type: "box",
              props: { ...common, x, y, w, h, label },
            });
            break;
          }
          case "circle": {
            const { x, y, size, label } = element;
            drawings.push({
              type: "circle",
              props: { ...common, x, y, size, label },
            });
            break;
          }
          case "text": {
            const { x, y, size, text } = element;
            const { start, draw, color } = common;
            drawings.push({
              type: "text",
              props: { start, draw, color, x, y, size, text },
            });
            break;
          }
          case "arrow": {
            const fromShape = shapes.get(element.from);
            const toShape = shapes.get(element.to);
            const a = fromShape && outlineOf(fromShape, frame);
            const b = toShape && outlineOf(toShape, frame);
            // The validator rejects these; skip rather than crash.
            if (!a || !b) break;
            const ends = connect(a, b, ARROW_GAP * unit);
            drawings.push({
              type: "arrow",
              props: {
                ...common,
                from: toPercent(ends.from, frame),
                to: toPercent(ends.to, frame),
                bend: element.bend,
              },
              label: element.label
                ? arrowLabel(ends.from, ends.to, element.label, common, frame)
                : null,
            });
            break;
          }
          case "icon":
            // Drawn from step 11; arrows can already attach to it.
            break;
        }
      });
    }

    return {
      start: board.start,
      end: board.end,
      wipes: board.wipes,
      drawings,
    };
  });
};

// Everything the hand draws, in order, across the whole video.
export const handTracks = (
  boards: PlannedBoard[],
  frame: FrameSize,
): HandTrack[] =>
  boards.flatMap((board) =>
    board.drawings.flatMap((drawing) => {
      switch (drawing.type) {
        case "box":
          return boxTracks(drawing.props, frame);
        case "circle":
          return circleTracks(drawing.props, frame);
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
