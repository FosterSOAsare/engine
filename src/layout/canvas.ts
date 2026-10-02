import type { HandTrack } from "../animation/hand";
import {
  CAMERA_MOVE_SECONDS,
  OVERVIEW_MOVE_SECONDS,
} from "../animation/timeline";
import type { CompiledAssets } from "../assets/compiled";
import type { FrameSize } from "../elements/shared";
import type { Video } from "../schema/scene";
import { placeTrack, type Placement, type Rect } from "./fit";
import { FORMATS } from "./formats";
import { handTracks, planVideo, type PlannedBoard } from "./plan";

// Landscape videos are drawn on one big board. Each board (a scene, plus
// the scenes that keep it) gets its own screen-sized area in a grid; nothing
// is wiped. The camera shows one area at a time, glides to the next as the
// narration moves on, and at the end zooms out to show everything at once.

// Each area is one screen, drawn in the detailed style: everything at half
// size with a finer pen, so a frame holds much more.
export const DETAIL = 0.5;
export const AREA = {
  width: FORMATS.landscape.width,
  height: FORMATS.landscape.height,
  detail: DETAIL,
};
const GAP = 0.12; // between areas, as a share of an area's height
const OVERVIEW_MARGIN = 0.04; // room around the board in the final overview

export type Area = { left: number; top: number; width: number; height: number };

export type Canvas = {
  boards: PlannedBoard[];
  areas: Area[]; // one per board
  width: number; // the whole board, in pixels
  height: number;
  tracks: HandTrack[]; // the hand's path, in board pixels
};

// Grid cells for every board: a scene's "place" if it has one, otherwise
// the next free cell in reading order. The grid is about as many columns
// as rows, so the overview has the shape of the screen.
export const gridCells = (
  places: ([number, number] | undefined)[],
): [number, number][] => {
  const columns = Math.max(1, Math.ceil(Math.sqrt(places.length)));
  const taken = new Set(
    places.filter((p): p is [number, number] => !!p).map((p) => p.join(",")),
  );
  let next = 0;
  return places.map((place) => {
    if (place) return place;
    for (;;) {
      const cell: [number, number] = [next % columns, Math.floor(next / columns)];
      next++;
      if (!taken.has(cell.join(","))) {
        taken.add(cell.join(","));
        return cell;
      }
    }
  });
};

export const canvasFor = (video: Video, assets: CompiledAssets = {}): Canvas => {
  // Nothing is wiped: every board stays on the big board.
  const boards = planVideo(video, AREA, assets).map((board) => ({
    ...board,
    wipes: false,
  }));
  const places = boards.map(
    (board) => video.scenes.find((s) => s.id === board.sceneIds[0])?.place,
  );
  const gap = GAP * AREA.height;
  const areas = gridCells(places).map(([column, row]) => ({
    left: column * (AREA.width + gap),
    top: row * (AREA.height + gap),
    width: AREA.width,
    height: AREA.height,
  }));
  const tracks = boards.flatMap((board, i) =>
    handTracks([board], AREA).map((track) =>
      placeTrack(track, { x: areas[i].left, y: areas[i].top, scale: 1 }),
    ),
  );
  return {
    boards,
    areas,
    width: Math.max(...areas.map((a) => a.left + a.width)),
    height: Math.max(...areas.map((a) => a.top + a.height)),
    tracks,
  };
};

// What the camera looks at: a point on the board and how far it is zoomed
// (1 = an area fills the screen).
type View = { cx: number; cy: number; zoom: number };

const areaView = (area: Area): View => ({
  cx: area.left + area.width / 2,
  cy: area.top + area.height / 2,
  zoom: 1,
});

const overviewView = (canvas: Canvas, frame: FrameSize): View => {
  const margin = OVERVIEW_MARGIN * Math.max(canvas.width, canvas.height);
  return {
    cx: canvas.width / 2,
    cy: canvas.height / 2,
    zoom: Math.min(
      1,
      frame.width / (canvas.width + 2 * margin),
      frame.height / (canvas.height + 2 * margin),
    ),
  };
};

const ease = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

// Between two views: the centre glides, the zoom changes evenly in steps
// (so zooming out and in feel the same), and a long glide pulls back a
// little in the middle so the board doesn't rush past.
const between = (a: View, b: View, t: number, areaWidth: number): View => {
  const e = ease(t);
  const distance = Math.hypot(b.cx - a.cx, b.cy - a.cy) / areaWidth;
  const pullBack = 1 + 0.35 * Math.min(distance, 2) * Math.sin(Math.PI * e);
  return {
    cx: a.cx + (b.cx - a.cx) * e,
    cy: a.cy + (b.cy - a.cy) * e,
    zoom: Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * e) /
      pullBack,
  };
};

// Where the camera is at `seconds`: on the current board's area, gliding
// to the next one around each change of board, and after the last board
// (at `end`, when the narration is over) zooming out to the whole board.
export const viewAt = (
  canvas: Canvas,
  seconds: number,
  end: number,
  frame: FrameSize,
): View => {
  const { boards, areas } = canvas;
  if (boards.length === 0) return overviewView(canvas, frame);
  const last = boards.length - 1;
  if (seconds >= end) {
    return between(
      areaView(areas[last]),
      overviewView(canvas, frame),
      (seconds - end) / OVERVIEW_MOVE_SECONDS,
      AREA.width,
    );
  }
  for (let i = 0; i < last; i++) {
    const change = boards[i].end;
    const from = change - CAMERA_MOVE_SECONDS / 2;
    if (seconds < from) return areaView(areas[i]);
    if (seconds < from + CAMERA_MOVE_SECONDS) {
      return between(
        areaView(areas[i]),
        areaView(areas[i + 1]),
        (seconds - from) / CAMERA_MOVE_SECONDS,
        AREA.width,
      );
    }
  }
  return areaView(areas[last]);
};

// The view as a placement: frame pixels = board pixels * scale + offset.
export const cameraPlacement = (view: View, frame: FrameSize): Placement => ({
  scale: view.zoom,
  x: frame.width / 2 - view.cx * view.zoom,
  y: frame.height / 2 - view.cy * view.zoom,
});

// Whether an area is on screen with this placement.
export const onScreen = (area: Area, p: Placement, frame: FrameSize) => {
  const r: Rect = {
    left: area.left * p.scale + p.x,
    top: area.top * p.scale + p.y,
    right: (area.left + area.width) * p.scale + p.x,
    bottom: (area.top + area.height) * p.scale + p.y,
  };
  return r.right > 0 && r.bottom > 0 && r.left < frame.width && r.top < frame.height;
};
