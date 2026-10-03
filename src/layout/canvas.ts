import type { HandTrack } from "../animation/hand";
import {
  CUT_FADE_SECONDS,
  sceneTimes,
} from "../animation/timeline";
import type { CompiledAssets } from "../assets/compiled";
import type { FrameSize } from "../elements/shared";
import type { Video } from "../schema/scene";
import type { TimedScene } from "../schema/timing";
import type { Outline } from "./edges";
import { placeTrack, type Placement, type Rect } from "./fit";
import { FORMATS } from "./formats";
import { handTracks, planVideo, type PlannedBoard } from "./plan";

// Landscape videos are drawn on one big board. Each board (a scene, plus
// the scenes that keep it) gets its own screen-sized area in a grid; nothing
// is wiped. The camera shows one area at a time and zooms in on what a
// scene's "camera" names. Between boards the screen fades out, the camera
// jumps to the next area and it fades back in (nothing slides past). The
// video ends on the last area; the rest of the board is never shown.

// Each area is one screen, drawn at full size: the same text, picture and
// pen sizes as any other video.
export const DETAIL = 1;
export const AREA = {
  width: FORMATS.landscape.width,
  height: FORMATS.landscape.height,
  detail: DETAIL,
};
const GAP = 0.12; // between areas, as a share of an area's height
const OVERVIEW_MARGIN = 0.04; // room around the board when it has no areas
const FOCUS_MOVE_SECONDS = 0.8; // zooming in on something, or back out
const JUMP_SECONDS = 1e-6; // to the next board: at once
const FOCUS_ZOOM = 2.5; // the most the camera zooms in, unless a move says
const FOCUS_ROOM = 1.35; // what it zooms to fills 1/1.35 of the screen

export type Area = { left: number; top: number; width: number; height: number };

// What the camera looks at: a point on the board and how far it is zoomed
// (1 = an area fills the screen).
export type View = { cx: number; cy: number; zoom: number };

// The camera goes to `to`, starting at `at` (seconds) and taking `duration`.
type Move = { at: number; duration: number; to: View };

export type Canvas = {
  boards: PlannedBoard[];
  areas: Area[]; // one per board
  width: number; // the whole board, in pixels
  height: number;
  tracks: HandTrack[][]; // the hand's path per board, in board pixels
  moves: Move[]; // the camera, in time order
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
      const cell: [number, number] = [
        next % columns,
        Math.floor(next / columns),
      ];
      next++;
      if (!taken.has(cell.join(","))) {
        taken.add(cell.join(","));
        return cell;
      }
    }
  });
};

const areaView = (area: Area): View => ({
  cx: area.left + area.width / 2,
  cy: area.top + area.height / 2,
  zoom: 1,
});

// The smallest rectangle around some outlines, in an area's pixels.
const around = (outlines: Outline[]): Rect | null => {
  if (outlines.length === 0) return null;
  const rects = outlines.map((o) => {
    if (o.kind === "polygon") {
      const xs = o.corners.map((c) => o.cx + c.x);
      const ys = o.corners.map((c) => o.cy + c.y);
      return {
        left: Math.min(...xs),
        right: Math.max(...xs),
        top: Math.min(...ys),
        bottom: Math.max(...ys),
      };
    }
    return {
      left: o.cx - o.halfW,
      right: o.cx + o.halfW,
      top: o.cy - o.halfH,
      bottom: o.cy + o.halfH,
    };
  });
  return {
    left: Math.min(...rects.map((r) => r.left)),
    right: Math.max(...rects.map((r) => r.right)),
    top: Math.min(...rects.map((r) => r.top)),
    bottom: Math.max(...rects.map((r) => r.bottom)),
  };
};

// Close enough on a rectangle (in an area's pixels) that it fills most of
// the screen, but no closer than `most`.
const focusView = (rect: Rect, area: Area, most: number): View => {
  const width = Math.max(1, rect.right - rect.left);
  const height = Math.max(1, rect.bottom - rect.top);
  return {
    cx: area.left + (rect.left + rect.right) / 2,
    cy: area.top + (rect.top + rect.bottom) / 2,
    zoom: Math.max(
      0.4,
      Math.min(
        most,
        AREA.width / (width * FOCUS_ROOM),
        AREA.height / (height * FOCUS_ROOM),
      ),
    ),
  };
};

const overviewView = (size: { width: number; height: number }): View => {
  const margin = OVERVIEW_MARGIN * Math.max(size.width, size.height);
  return {
    cx: size.width / 2,
    cy: size.height / 2,
    zoom: Math.min(
      1,
      AREA.width / (size.width + 2 * margin),
      AREA.height / (size.height + 2 * margin),
    ),
  };
};

export const canvasFor = (
  video: Video,
  assets: CompiledAssets = {},
): Canvas => {
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
  const tracks = boards.map((board, i) =>
    handTracks([board], AREA).map((track) =>
      placeTrack(track, { x: areas[i].left, y: areas[i].top, scale: 1 }),
    ),
  );
  const size = {
    width: Math.max(...areas.map((a) => a.left + a.width)),
    height: Math.max(...areas.map((a) => a.top + a.height)),
  };

  // The camera: each scene's own moves, and a jump to the next board at
  // each change of board (hidden by the fade).
  const times = sceneTimes(video);
  const moves: Move[] = [];
  boards.forEach((board, i) => {
    for (const id of board.sceneIds) {
      const index = video.scenes.findIndex((scene) => scene.id === id);
      const scene = video.scenes[index] as Video["scenes"][number] &
        Partial<Pick<TimedScene, "cameraTimes">>;
      (scene.camera ?? []).forEach((move, k) => {
        const at =
          times[index].start + (scene.cameraTimes?.[k] ?? move.start ?? 0);
        const rect =
          move.focus === "all"
            ? null
            : around(move.focus.flatMap((id) => board.outlines.get(id) ?? []));
        moves.push({
          at,
          duration: FOCUS_MOVE_SECONDS,
          to: rect
            ? focusView(rect, areas[i], move.zoom ?? FOCUS_ZOOM)
            : areaView(areas[i]),
        });
      });
    }
    if (i < boards.length - 1) {
      moves.push({
        at: board.end,
        duration: JUMP_SECONDS,
        to: areaView(areas[i + 1]),
      });
    }
  });
  moves.sort((a, b) => a.at - b.at);

  return { boards, areas, ...size, tracks, moves };
};

const ease = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

// Between two views: the centre glides, the zoom changes evenly in steps
// (so zooming out and in feel the same), and a long glide pulls back a
// little in the middle so the board doesn't rush past.
const between = (a: View, b: View, t: number): View => {
  const e = ease(t);
  const distance = Math.hypot(b.cx - a.cx, b.cy - a.cy) / AREA.width;
  const pullBack = 1 + 0.35 * Math.min(distance, 2) * Math.sin(Math.PI * e);
  return {
    cx: a.cx + (b.cx - a.cx) * e,
    cy: a.cy + (b.cy - a.cy) * e,
    zoom:
      Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * e) /
      pullBack,
  };
};

// Where the camera is at `seconds`: it starts on the first area and makes
// each move in turn; a move that starts before the last one is finished
// takes over from wherever the camera is.
export const viewAt = (canvas: Canvas, seconds: number): View => {
  let view =
    canvas.areas.length > 0 ? areaView(canvas.areas[0]) : overviewView(canvas);
  for (let i = 0; i < canvas.moves.length; i++) {
    const move = canvas.moves[i];
    if (seconds < move.at) break;
    const next = canvas.moves[i + 1];
    // Where this move has got to when the next one begins (or now).
    const until = Math.min(
      seconds,
      next && next.at < seconds ? next.at : seconds,
    );
    const t = (until - move.at) / move.duration;
    view = t >= 1 ? move.to : between(view, move.to, t);
  }
  return view;
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
  return (
    r.right > 0 && r.bottom > 0 && r.left < frame.width && r.top < frame.height
  );
};

// How much the empty board covers the screen at `seconds` (0 to 1): it
// fades in just before each change of board and out just after.
export const cutCover = (canvas: Canvas, seconds: number) =>
  Math.max(
    0,
    ...canvas.boards
      .slice(0, -1)
      .map((board) => 1 - Math.abs(seconds - board.end) / CUT_FADE_SECONDS),
  );

// The board being drawn at `seconds`: the hand only follows this board's
// strokes, so it leaves at the end of a board and comes back on the next
// instead of travelling across the cut.
export const boardAt = (canvas: Canvas, seconds: number) => {
  const index = canvas.boards.findIndex((board) => seconds < board.end);
  return index === -1 ? canvas.boards.length - 1 : index;
};
