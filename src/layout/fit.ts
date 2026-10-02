import type { HandTrack } from "../animation/hand";
import { imageBox, imageLabel } from "../elements/Image";
import { shapeLabel } from "../elements/Shape";
import { textWidth, type TextProps } from "../elements/Text";
import { unitOf, type FrameSize } from "../elements/shared";
import type { CompiledAssets } from "../assets/compiled";
import type { Scene, Video } from "../schema/scene";
import { FORMATS, type FormatName, type Margins } from "./formats";
import { planVideo, type Drawing, type PlannedBoard } from "./plan";

// Showing a video in a format it wasn't written for. Positions in a scene
// file are percent of the frame, so a portrait layout dropped into a square
// frame would squash and overlap. Instead each board keeps the shape it was
// written for, its drawings are measured, and the board is scaled and
// centred so they fill the target format's safe area.

export type Rect = { left: number; top: number; right: number; bottom: number };

// Board pixels to frame pixels: frame = board * scale + offset.
export type Placement = { x: number; y: number; scale: number };

export const IDENTITY: Placement = { x: 0, y: 0, scale: 1 };

// Room left around the drawings, percent of the board's shorter side.
const PADDING = 2;

const textRect = (
  { x, y, size, text, align = "center" }: TextProps,
  frame: FrameSize,
): Rect => {
  const fontSize = size * unitOf(frame);
  const width = textWidth(text, fontSize);
  const left = (x / 100) * frame.width - (align === "left" ? 0 : width / 2);
  const cy = (y / 100) * frame.height;
  return {
    left,
    right: left + width,
    top: cy - fontSize * 0.6,
    bottom: cy + fontSize * 0.6,
  };
};

const centred = (
  x: number,
  y: number,
  halfW: number,
  halfH: number,
  frame: FrameSize,
): Rect => {
  const cx = (x / 100) * frame.width;
  const cy = (y / 100) * frame.height;
  return { left: cx - halfW, right: cx + halfW, top: cy - halfH, bottom: cy + halfH };
};

const union = (rects: Rect[]): Rect | null =>
  rects.length === 0
    ? null
    : {
        left: Math.min(...rects.map((r) => r.left)),
        top: Math.min(...rects.map((r) => r.top)),
        right: Math.max(...rects.map((r) => r.right)),
        bottom: Math.max(...rects.map((r) => r.bottom)),
      };

// Roughly where a drawing puts ink, in board pixels.
export const drawingRects = (drawing: Drawing, frame: FrameSize): Rect[] => {
  const unit = unitOf(frame);
  switch (drawing.type) {
    case "text":
      return [textRect(drawing.props, frame)];
    case "shape": {
      const { x, y, w, h } = drawing.props;
      const label = shapeLabel(drawing.props, frame);
      return [
        centred(x, y, (w * unit) / 2, (h * unit) / 2, frame),
        ...(label ? [textRect(label, frame)] : []),
      ];
    }
    case "image": {
      const box = imageBox(drawing.props, frame);
      const label = imageLabel(drawing.props, frame);
      return [
        {
          left: box.left,
          top: box.top,
          right: box.left + box.width,
          bottom: box.top + box.height,
        },
        ...(label ? [textRect(label, frame)] : []),
      ];
    }
    case "arrow": {
      const { from, to, bend = 0 } = drawing.props;
      const a = { x: (from.x / 100) * frame.width, y: (from.y / 100) * frame.height };
      const b = { x: (to.x / 100) * frame.width, y: (to.y / 100) * frame.height };
      const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      // The curve passes halfway to its control point.
      const mid = {
        x: (a.x + b.x) / 2 + (((b.y - a.y) / length) * bend * unit) / 2,
        y: (a.y + b.y) / 2 - (((b.x - a.x) / length) * bend * unit) / 2,
      };
      const points = [a, b, mid];
      return [
        {
          left: Math.min(...points.map((p) => p.x)),
          top: Math.min(...points.map((p) => p.y)),
          right: Math.max(...points.map((p) => p.x)),
          bottom: Math.max(...points.map((p) => p.y)),
        },
        ...(drawing.label ? [textRect(drawing.label, frame)] : []),
      ];
    }
  }
};

// Everything drawn on a board, with a little room around it.
export const boardBounds = (
  board: PlannedBoard,
  frame: FrameSize,
): Rect | null => {
  const rect = union(board.drawings.flatMap((d) => drawingRects(d, frame)));
  if (!rect) return null;
  const pad = PADDING * unitOf(frame);
  return {
    left: rect.left - pad,
    top: rect.top - pad,
    right: rect.right + pad,
    bottom: rect.bottom + pad,
  };
};

// Scales a board so `bounds` fills the target's safe area, centred. Never
// larger than the board would be drawn in its own format (scaled by the
// shorter side), so text never grows past the size it was written at.
export const fitBoard = (
  bounds: Rect | null,
  board: FrameSize,
  target: FrameSize,
  safe: Margins,
): Placement => {
  const area = {
    left: (safe.left / 100) * target.width,
    top: (safe.top / 100) * target.height,
    right: target.width - (safe.right / 100) * target.width,
    bottom: target.height - (safe.bottom / 100) * target.height,
  };
  const content = bounds ?? { left: 0, top: 0, right: board.width, bottom: board.height };
  const width = Math.max(1, content.right - content.left);
  const height = Math.max(1, content.bottom - content.top);
  const scale = Math.min(
    (area.right - area.left) / width,
    (area.bottom - area.top) / height,
    unitOf(target) / unitOf(board),
  );
  return {
    scale,
    x: (area.left + area.right) / 2 - ((content.left + content.right) / 2) * scale,
    y: (area.top + area.bottom) / 2 - ((content.top + content.bottom) / 2) * scale,
  };
};

export const placePoint = (
  { x, y }: { x: number; y: number },
  p: Placement,
) => ({ x: x * p.scale + p.x, y: y * p.scale + p.y });

// The hand moves over the placed board, so its path is placed too.
export const placeTrack = (track: HandTrack, p: Placement): HandTrack =>
  p === IDENTITY
    ? track
    : {
        ...track,
        from: placePoint(track.from, p),
        to: placePoint(track.to, p),
        at: (t) => placePoint(track.at(t), p),
      };

// A video with one format's layouts applied: elements moved as the scenes'
// "layouts" say, and the ids of the scenes that have a layout for it.
// Those scenes' boards are laid out directly in that format's frame.
export const withLayouts = <V extends { scenes: Scene[] }>(
  video: V,
  format: FormatName,
): { video: V; laidOut: Set<string> } => {
  const laidOut = new Set<string>();
  const scenes = video.scenes.map((scene) => {
    const moves = scene.layouts?.[format];
    if (!moves) return scene;
    laidOut.add(scene.id);
    return {
      ...scene,
      elements: scene.elements.map((element) =>
        element.id && moves[element.id]
          ? { ...element, ...moves[element.id] }
          : element,
      ),
    };
  });
  return { video: { ...video, scenes }, laidOut };
};

// A board ready to show: what it draws, the frame it is laid out in, and
// where that frame goes in the video.
export type Stage = {
  board: PlannedBoard;
  frame: FrameSize;
  placement: Placement;
};

// Every board of a video, shown in `target`. In the format the file is
// written for, boards fill the frame as written. In another format, a
// board whose scenes have a layout for it is laid out directly in that
// frame; any other board keeps its shape and is scaled to fit.
export const stagesFor = (
  video: Video,
  target: FormatName,
  assets: CompiledAssets = {},
): Stage[] => {
  const written = FORMATS[video.format];
  const plan = planVideo(video, written, assets);
  if (target === video.format) {
    return plan.map((board) => ({ board, frame: written, placement: IDENTITY }));
  }
  const frame = FORMATS[target];
  const { video: moved, laidOut } = withLayouts(video, target);
  const direct = laidOut.size > 0 ? planVideo(moved, frame, assets) : [];
  return plan.map((board, i) =>
    board.sceneIds.some((id) => laidOut.has(id))
      ? { board: direct[i], frame, placement: IDENTITY }
      : {
          board,
          frame: written,
          placement: fitBoard(boardBounds(board, written), written, frame, frame.safe),
        },
  );
};
