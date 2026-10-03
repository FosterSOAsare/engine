import type { HandTrack } from "../animation/hand";
import { LABEL_WRITE_SECONDS } from "../animation/labels";
import { boards as timelineBoards } from "../animation/timeline";
import type { CompiledAssets } from "../assets/compiled";
import { arrowTracks, type ArrowProps } from "../elements/Arrow";
import { imageBox, imageTracks, type ImageProps } from "../elements/Image";
import { shapeTracks, type ShapeProps } from "../elements/Shape";
import { CELL_PADDING, tableLayout, tablePart } from "../elements/Table";
import {
  LETTERS_PER_SIZE,
  textTrack,
  textWidth,
  wrapText,
  type TextProps,
} from "../elements/Text";
import { unitOf, type FrameSize } from "../elements/shared";
import {
  popsIn,
  styleOf,
  type SceneElement,
  type Video,
} from "../schema/scene";
import {
  listItemTimes,
  tableRowTimes,
  type TimedElement,
} from "../schema/timing";
import { connect, type Outline } from "./edges";

// Turns a parsed scene file into what is drawn: element props with
// absolute times (seconds from the start of the video), seeds filled in,
// arrows attached to the shapes they connect, lists split into lines and
// rings sized around their targets.

const ARROW_GAP = 3; // percent of the shorter side, between arrow and shape
const ARROW_LABEL_SIZE = 6; // percent of the shorter side
const RING_COLOR = "#c0392b"; // rings point things out, so red by default

export type Drawing = (
  | { type: "shape"; props: ShapeProps }
  | { type: "text"; props: TextProps }
  | { type: "arrow"; props: ArrowProps; label: TextProps | null }
  | { type: "image"; props: ImageProps }
) & {
  // The scene-file element it was drawn from (for the layout check).
  source?: { scene: string; index: number; element: SceneElement };
  // Pops into place, complete, instead of being drawn by the hand.
  pops?: boolean;
};

export type PlannedBoard = {
  sceneIds: string[]; // the scenes drawn on it
  // Every element with an id (and every table row and cell), in pixels:
  // where the camera looks when it focuses on them.
  outlines: Map<string, Outline>;
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
    case "bubble": {
      const { halfW, halfH } = bubbleSize(element, frame);
      return { kind: "rect", cx, cy, halfW, halfH };
    }
    case "table": {
      const layout = tableLayout(element, frame);
      return {
        kind: "rect",
        cx: layout.left + layout.width / 2,
        cy: layout.top + layout.height / 2,
        halfW: layout.width / 2,
        halfH: layout.height / 2,
      };
    }
    case "image": {
      const box = imageBox(element, frame);
      return {
        kind: "rect",
        cx,
        cy,
        halfW: box.width / 2,
        halfH: box.height / 2,
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
  assets: CompiledAssets,
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
    case "image": {
      const { name, x, y, w, reveal, label, fill, ink, colors } = element;
      const { start, draw } = common;
      return [
        {
          type: "image",
          props: {
            start,
            draw,
            name,
            asset: assets[name],
            x,
            y,
            w,
            reveal,
            label,
            fill,
            ink,
            colors,
          },
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
    case "table":
      return tableDrawings(element, common, frame);
    case "bubble":
      return bubbleDrawings(element, common, outlines, frame);
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

type Box = { left: number; top: number; width: number; height: number };

type BubbleElement = Extract<SceneElement, { type: "bubble" }>;

// A bubble's text, wrapped to its width, and its half-size in pixels.
const BUBBLE_PADDING = 0.7; // inside the box, in font sizes
const BUBBLE_LINE = 1.35; // line height, in font sizes
const bubbleSize = (element: BubbleElement, frame: FrameSize) => {
  const unit = unitOf(frame);
  const fontSize = element.size * unit;
  const halfW = (element.w * unit) / 2;
  const inner = 2 * halfW - 2 * BUBBLE_PADDING * fontSize;
  const lines = wrapText(
    element.text,
    Math.max(4, Math.floor((inner / fontSize) * LETTERS_PER_SIZE)),
  );
  const halfH =
    (lines.length * BUBBLE_LINE * fontSize + 2 * BUBBLE_PADDING * fontSize) / 2;
  return { halfW, halfH, lines, fontSize };
};

// The box, then the tail (two strokes from the box's edge to near what it
// points at), then the lines of text.
const BUBBLE_BOX_SHARE = 0.35;
const BUBBLE_TAIL_SHARE = 0.15;
const bubbleDrawings = (
  element: BubbleElement,
  common: { start: number; draw: number; color?: string; seed: number },
  outlines: Map<string, Outline>,
  frame: FrameSize,
): Drawing[] => {
  const unit = unitOf(frame);
  const { halfW, halfH, lines, fontSize } = bubbleSize(element, frame);
  const cx = (element.x / 100) * frame.width;
  const cy = (element.y / 100) * frame.height;
  const px = (x: number) => (x / frame.width) * 100;
  const py = (y: number) => (y / frame.height) * 100;
  const drawings: Drawing[] = [];
  let at = common.start;

  const boxDraw = common.draw * BUBBLE_BOX_SHARE;
  drawings.push({
    type: "shape",
    props: {
      kind: "box",
      x: element.x,
      y: element.y,
      w: (2 * halfW) / unit,
      h: (2 * halfH) / unit,
      color: common.color,
      start: at,
      draw: boxDraw,
      seed: common.seed,
    },
  });
  at += boxDraw;

  const target = element.to ? outlines.get(element.to) : undefined;
  const tailDraw = target ? common.draw * BUBBLE_TAIL_SHARE : 0;
  if (target) {
    const self: Outline = { kind: "rect", cx, cy, halfW, halfH };
    const { from: base, to: tip } = connect(self, target, ARROW_GAP * unit);
    const length = Math.hypot(tip.x - base.x, tip.y - base.y) || 1;
    // The tail's two sides leave the box a little apart.
    const spread = Math.min(1.2 * fontSize, halfW * 0.4);
    const nx = (-(tip.y - base.y) / length) * spread;
    const ny = ((tip.x - base.x) / length) * spread;
    const sides = [
      { from: { x: base.x + nx, y: base.y + ny }, to: tip },
      { from: tip, to: { x: base.x - nx, y: base.y - ny } },
    ];
    sides.forEach((side, i) => {
      drawings.push({
        type: "arrow",
        props: {
          from: { x: px(side.from.x), y: py(side.from.y) },
          to: { x: px(side.to.x), y: py(side.to.y) },
          head: "none",
          color: common.color,
          start: at + (tailDraw / 2) * i,
          draw: tailDraw / 2,
          seed: common.seed + i + 1,
        },
        label: null,
      });
    });
    at += tailDraw;
  }

  // The text, line by line, sharing what's left by length.
  const writing = common.start + common.draw - at;
  const letters = lines.reduce((sum, line) => sum + line.length, 0) || 1;
  const top = cy - ((lines.length - 1) * BUBBLE_LINE * fontSize) / 2;
  lines.forEach((line, i) => {
    const draw = writing * (line.length / letters);
    drawings.push({
      type: "text",
      props: {
        start: at,
        draw,
        color: common.color,
        x: element.x,
        y: py(top + i * BUBBLE_LINE * fontSize),
        size: element.size,
        text: line,
      },
    });
    at += draw;
  });
  return drawings;
};

const rectOutline = (r: Box): Outline => ({
  kind: "rect",
  cx: r.left + r.width / 2,
  cy: r.top + r.height / 2,
  halfW: r.width / 2,
  halfH: r.height / 2,
});

type TableElement = Extract<SceneElement, { type: "table" }>;

// A table's rows and cells, by "<id>.<row>" and "<id>.<row>.<column>".
const tableOutlines = (
  element: TableElement,
  id: string,
  frame: FrameSize,
): [string, Outline][] => {
  const layout = tableLayout(element, frame);
  return element.rows.flatMap((_, r) => [
    [`${id}.${r}`, rectOutline(tablePart(layout, element.rows, [r])!)],
    ...layout.columnWidths.map((_w, c): [string, Outline] => [
      `${id}.${r}.${c}`,
      rectOutline(tablePart(layout, element.rows, [r, c])!),
    ]),
  ]);
};

// A table as drawings: the title, the grid (a box, then the lines between
// rows and columns, sharing the time by length), the header's fill, then
// each row's cells left to right at the row's time.
const TITLE_SHARE = 0.25; // of the grid's draw time, for the title
const BOX_SHARE = 0.4; // of what's left, for the outer box

const tableDrawings = (
  element: TableElement,
  common: { start: number; draw: number; color?: string; seed: number },
  frame: FrameSize,
): Drawing[] => {
  const unit = unitOf(frame);
  const layout = tableLayout(element, frame);
  const timed = element as TimedElement;
  const gridDraw = timed.gridDraw ?? element.draw;
  // Row times are relative to the scene; this is where the table starts.
  const sceneOffset = common.start - (element.start ?? 0);
  const rowTimes = timed.itemTimes
    ? timed.itemTimes.map((t) => ({
        start: t.start + sceneOffset,
        draw: t.draw,
      }))
    : tableRowTimes(
        element.rows,
        common.start + gridDraw,
        element.rowGap,
        null,
      );
  const px = (x: number) => (x / frame.width) * 100;
  const py = (y: number) => (y / frame.height) * 100;
  const drawings: Drawing[] = [];
  const gridEnd = common.start + gridDraw;
  let at = common.start;

  if (layout.title && element.title) {
    const draw = gridDraw * TITLE_SHARE;
    drawings.push({
      type: "text",
      props: {
        start: at,
        draw,
        color: common.color,
        x: px(layout.left + layout.width / 2),
        y: py(layout.title.y),
        size: layout.title.fontSize / unit,
        text: element.title,
      },
    });
    at += draw;
  }

  // The header's fill goes first, so it sits under the lines and text.
  if (element.header && element.rows.length > 1) {
    drawings.push({
      type: "shape",
      props: {
        kind: "box",
        outline: false,
        x: px(layout.left + layout.width / 2),
        y: py(layout.top + layout.rowHeight / 2),
        w: layout.width / unit,
        h: layout.rowHeight / unit,
        fill: element.headerFill,
        start: gridEnd,
        draw: 0,
        seed: common.seed,
      },
    });
  }

  const lines = [
    ...element.rows.slice(1).map((_, i) => {
      const y = layout.top + (i + 1) * layout.rowHeight;
      return {
        from: { x: layout.left, y },
        to: { x: layout.left + layout.width, y },
      };
    }),
    ...layout.columnLefts.slice(1).map((x) => ({
      from: { x, y: layout.top },
      to: { x, y: layout.top + layout.height },
    })),
  ];
  const boxDraw = (gridEnd - at) * (lines.length > 0 ? BOX_SHARE : 1);
  drawings.push({
    type: "shape",
    props: {
      kind: "box",
      x: px(layout.left + layout.width / 2),
      y: py(layout.top + layout.height / 2),
      w: layout.width / unit,
      h: layout.height / unit,
      color: common.color,
      start: at,
      draw: boxDraw,
      seed: common.seed,
    },
  });
  at += boxDraw;
  const linesTime = gridEnd - at;
  const lengths = lines.map((l) =>
    Math.hypot(l.to.x - l.from.x, l.to.y - l.from.y),
  );
  const totalLength = lengths.reduce((sum, l) => sum + l, 0) || 1;
  lines.forEach((line, i) => {
    const draw = linesTime * (lengths[i] / totalLength);
    drawings.push({
      type: "arrow",
      props: {
        from: { x: px(line.from.x), y: py(line.from.y) },
        to: { x: px(line.to.x), y: py(line.to.y) },
        head: "none",
        color: common.color,
        start: at,
        draw,
        seed: common.seed + i + 1,
      },
      label: null,
    });
    at += draw;
  });

  // The cells, left to right, sharing their row's time by length.
  const padding = CELL_PADDING * layout.fontSize;
  element.rows.forEach((row, r) => {
    const time = rowTimes[r];
    const letters = row.reduce((sum, cell) => sum + cell.length, 0) || 1;
    let cellStart = time.start;
    row.forEach((cell, c) => {
      if (!cell || c >= layout.columnLefts.length) return;
      const draw = time.draw * (cell.length / letters);
      drawings.push({
        type: "text",
        props: {
          start: cellStart,
          draw,
          color: common.color,
          x: px(layout.columnLefts[c] + padding),
          y: py(layout.top + (r + 0.5) * layout.rowHeight),
          size: element.size,
          text: cell,
          align: "left",
        },
      });
      cellStart += draw;
    });
  });
  return drawings;
};

export const planVideo = (
  video: Video,
  frame: FrameSize,
  assets: CompiledAssets = {},
): PlannedBoard[] =>
  timelineBoards(video).map((board) => {
    const style = styleOf(video);
    const drawings: Drawing[] = [];
    // Outlines of everything on this board so far, by id, for arrows and
    // rings. Filled in per scene before drawing, since an arrow may point
    // to a shape drawn after it.
    const outlines = new Map<string, Outline>();

    for (const { scene, start: sceneStart } of board.scenes) {
      for (const element of scene.elements) {
        const outline = element.id ? outlineOf(element, frame) : null;
        if (element.id && outline) outlines.set(element.id, outline);
        if (element.id && element.type === "table") {
          for (const [id, part] of tableOutlines(element, element.id, frame)) {
            outlines.set(id, part);
          }
        }
      }

      scene.elements.forEach((element, index) => {
        const common = {
          start: sceneStart + (element.start ?? 0),
          draw: element.draw,
          color: element.color,
          seed: element.seed ?? seedFrom(element.id ?? `${scene.id}#${index}`),
        };
        drawings.push(
          ...drawingsOf(element, common, outlines, frame, assets).map(
            (drawing) => ({
              ...drawing,
              source: { scene: scene.id, index, element },
              pops: popsIn(style, element),
            }),
          ),
        );
      });
    }

    return {
      sceneIds: board.scenes.map(({ scene }) => scene.id),
      outlines,
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
      // The hand doesn't draw what pops in.
      if (drawing.pops) return [];
      switch (drawing.type) {
        case "shape":
          return shapeTracks(drawing.props, frame);
        case "text":
          return [textTrack(drawing.props, frame)];
        case "image":
          return imageTracks(drawing.props, frame);
        case "arrow":
          return [
            ...arrowTracks(drawing.props, frame),
            ...(drawing.label ? [textTrack(drawing.label, frame)] : []),
          ];
      }
    }),
  );
