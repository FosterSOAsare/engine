import type { HandTrack } from "../animation/hand";
import {
  boards as timelineBoards,
  CUT_FADE_SECONDS,
  OVERVIEW_MOVE_SECONDS,
  scenesLength,
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

// Landscape videos are drawn on one big board, made of screens. Each screen
// is split into a grid of cells (the video's "grid", one cell by default),
// and each board (a scene, plus the scenes that keep it) fills the next
// free cell, or several ("span"). A scene is written as usual, in percent
// of its cell, and every cell draws at the same small, detailed size, so a
// screen fills up with content. When a screen is full the video fades,
// cuts to the next screen and fades back in; the camera can zoom in on
// parts of a scene ("camera"), and at the end it zooms out to show every
// screen at once.

export const SCREEN = FORMATS.landscape; // one screen, in pixels
// The size unit on landscape boards: half the usual (the detailed style),
// the same in every cell whatever its size.
export const DETAIL = 0.5;
const UNIT = (Math.min(SCREEN.width, SCREEN.height) / 100) * DETAIL;
// A whole screen as a frame to lay a board out in.
export const AREA: FrameSize = { ...SCREEN, detail: DETAIL };

const SCREEN_GAP = 0.12; // between screens, as a share of a screen's height
// Around a screen's cells: room at the top for the chapter heading and at
// the bottom for the captions, as shares of the screen's width and height.
const MARGIN = { side: 0.02, top: 0.065, bottom: 0.1 };
const GUTTER = 0.015; // between cells, as a share of the screen's width
const OVERVIEW_MARGIN = 0.04; // room around the board in the final overview
const FOCUS_MOVE_SECONDS = 0.8; // zooming in on something, or back out
const JUMP_SECONDS = 1e-6; // to the next screen: at once, behind the fade
const FOCUS_ZOOM = 2.5; // the most the camera zooms in, unless a move says
const FOCUS_ROOM = 1.35; // what it zooms to fills 1/1.35 of the screen

export type Area = {
  left: number;
  top: number;
  width: number;
  height: number;
};

// What the camera looks at: a point on the board and how far it is zoomed
// (1 = a screen fills the frame).
export type View = { cx: number; cy: number; zoom: number };

// The camera goes to `to`, starting at `at` (seconds) and taking `duration`.
type Move = { at: number; duration: number; to: View };

export type Canvas = {
  boards: PlannedBoard[];
  areas: Area[]; // where each board is drawn (its cells), in board pixels
  frames: FrameSize[]; // each board's cells as a frame to lay it out in
  screens: Area[];
  screenOf: number[]; // each board's screen
  width: number; // the whole board, in pixels
  height: number;
  tracks: HandTrack[][]; // the hand's path per screen, in board pixels
  moves: Move[]; // the camera, in time order
};

type Cell = [number, number];

// Grid cells for every screen: a "place" if it has one, otherwise the next
// free cell in reading order. The grid is about as many columns as rows, so
// the overview has the shape of the screen.
export const gridCells = (places: (Cell | undefined)[]): Cell[] => {
  const columns = Math.max(1, Math.ceil(Math.sqrt(places.length)));
  const taken = new Set(
    places.filter((p): p is Cell => !!p).map((p) => p.join(",")),
  );
  let next = 0;
  return places.map((place) => {
    if (place) return place;
    for (;;) {
      const cell: Cell = [next % columns, Math.floor(next / columns)];
      next++;
      if (!taken.has(cell.join(","))) {
        taken.add(cell.join(","));
        return cell;
      }
    }
  });
};

export type CellRequest = {
  span?: Cell;
  slot?: Cell;
  newScreen?: boolean;
};

export type CellChoice = { screen: number; cell: Cell; span: Cell };

// Which screen and cell each board goes in. Boards fill a screen's cells in
// reading order (a "slot" picks one); a board that doesn't fit, or asks for
// a new screen, starts the next screen.
export const assignCells = (
  requests: CellRequest[],
  grid: Cell,
): CellChoice[] => {
  const [columns, rows] = grid;
  const screens: Set<string>[] = [];
  const fits = (taken: Set<string>, [c, r]: Cell, [w, h]: Cell) => {
    if (c + w > columns || r + h > rows) return false;
    for (let x = c; x < c + w; x++) {
      for (let y = r; y < r + h; y++) if (taken.has(`${x},${y}`)) return false;
    }
    return true;
  };
  const firstFit = (taken: Set<string>, span: Cell): Cell | null => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        if (fits(taken, [c, r], span)) return [c, r];
      }
    }
    return null;
  };
  return requests.map((request) => {
    const span: Cell = [
      Math.min(request.span?.[0] ?? 1, columns),
      Math.min(request.span?.[1] ?? 1, rows),
    ];
    let screen = screens.length - 1;
    if (screen < 0 || (request.newScreen && screens[screen].size > 0)) {
      screens.push(new Set());
      screen = screens.length - 1;
    }
    const pick = (taken: Set<string>) =>
      request.slot
        ? fits(taken, request.slot, span)
          ? request.slot
          : null
        : firstFit(taken, span);
    let cell = pick(screens[screen]);
    if (!cell) {
      screens.push(new Set());
      screen = screens.length - 1;
      cell = pick(screens[screen]) ?? [0, 0];
    }
    for (let x = cell[0]; x < cell[0] + span[0]; x++) {
      for (let y = cell[1]; y < cell[1] + span[1]; y++) {
        screens[screen].add(`${x},${y}`);
      }
    }
    return { screen, cell, span };
  });
};

// Where cells are inside a screen, in pixels from the screen's corner.
const cellArea = ([columns, rows]: Cell, [c, r]: Cell, [w, h]: Cell) => {
  const side = MARGIN.side * SCREEN.width;
  const top = MARGIN.top * SCREEN.height;
  const bottom = MARGIN.bottom * SCREEN.height;
  const gutter = GUTTER * SCREEN.width;
  const cellWidth =
    (SCREEN.width - 2 * side - (columns - 1) * gutter) / columns;
  const cellHeight =
    (SCREEN.height - top - bottom - (rows - 1) * gutter) / rows;
  return {
    left: side + c * (cellWidth + gutter),
    top: top + r * (cellHeight + gutter),
    width: w * cellWidth + (w - 1) * gutter,
    height: h * cellHeight + (h - 1) * gutter,
  };
};

// A cell as a frame to lay a board out in: positions in percent of the
// cell, sizes in the same unit everywhere.
const cellFrame = ({ width, height }: Area): FrameSize => ({
  width,
  height,
  detail: (UNIT * 100) / Math.min(width, height),
});

const areaView = (area: Area): View => ({
  cx: area.left + area.width / 2,
  cy: area.top + area.height / 2,
  zoom:
    (SCREEN.width / area.width + SCREEN.height / area.height) / 2 > 1.01
      ? Math.min(SCREEN.width / area.width, SCREEN.height / area.height)
      : 1,
});

// The smallest rectangle around some outlines, in a board's pixels.
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

// Close enough on a rectangle (in a board's pixels, the board at `area`)
// that it fills most of the screen, but no closer than `most`.
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
        SCREEN.width / (width * FOCUS_ROOM),
        SCREEN.height / (height * FOCUS_ROOM),
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
      SCREEN.width / (size.width + 2 * margin),
      SCREEN.height / (size.height + 2 * margin),
    ),
  };
};

type CanvasScene = Video["scenes"][number] &
  Partial<Pick<TimedScene, "cameraTimes">>;

export const canvasFor = (
  video: Video,
  assets: CompiledAssets = {},
): Canvas => {
  // Which cells each board gets, from its first scene.
  const grid: Cell = video.grid ?? [1, 1];
  const firstScenes = timelineBoards(video).map(
    ({ scenes }) => scenes[0].scene,
  );
  const choices = assignCells(firstScenes, grid);
  const screenCount = Math.max(0, ...choices.map((c) => c.screen + 1));
  // A screen's place on the big board: from its first scene's "place".
  const places = Array.from(
    { length: screenCount },
    (_, s) => firstScenes[choices.findIndex((c) => c.screen === s)]?.place,
  );
  const gap = SCREEN_GAP * SCREEN.height;
  const screens = gridCells(places).map(([column, row]) => ({
    left: column * (SCREEN.width + gap),
    top: row * (SCREEN.height + gap),
    width: SCREEN.width,
    height: SCREEN.height,
  }));
  const areas = choices.map(({ screen, cell, span }) => {
    const inside = cellArea(grid, cell, span);
    return {
      ...inside,
      left: screens[screen].left + inside.left,
      top: screens[screen].top + inside.top,
    };
  });
  const frames = areas.map(cellFrame);
  const screenOf = choices.map((c) => c.screen);

  // Nothing is wiped: every board stays on the big board.
  const boards = planVideo(video, (i) => frames[i], assets).map((board) => ({
    ...board,
    wipes: false,
  }));
  const tracks = screens.map((_, s) =>
    boards.flatMap((board, i) =>
      screenOf[i] === s
        ? handTracks([board], frames[i]).map((track) =>
            placeTrack(track, { x: areas[i].left, y: areas[i].top, scale: 1 }),
          )
        : [],
    ),
  );
  const size = {
    width: Math.max(...screens.map((a) => a.left + a.width)),
    height: Math.max(...screens.map((a) => a.top + a.height)),
  };

  // The camera: each scene's own moves, a jump to the next screen when a
  // board starts on another one (hidden by the fade), and the overview once
  // the narration is over.
  const times = sceneTimes(video);
  const moves: Move[] = [];
  boards.forEach((board, i) => {
    const screen = screens[screenOf[i]];
    for (const id of board.sceneIds) {
      const index = video.scenes.findIndex((scene) => scene.id === id);
      const scene = video.scenes[index] as CanvasScene;
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
            : areaView(screen),
        });
      });
    }
    if (i < boards.length - 1 && screenOf[i + 1] !== screenOf[i]) {
      moves.push({
        at: board.end,
        duration: JUMP_SECONDS,
        to: areaView(screens[screenOf[i + 1]]),
      });
    }
  });
  moves.push({
    at: scenesLength(video),
    duration: OVERVIEW_MOVE_SECONDS,
    to: overviewView(size),
  });
  moves.sort((a, b) => a.at - b.at);

  return { boards, areas, frames, screens, screenOf, ...size, tracks, moves };
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
  const distance = Math.hypot(b.cx - a.cx, b.cy - a.cy) / SCREEN.width;
  const pullBack = 1 + 0.35 * Math.min(distance, 2) * Math.sin(Math.PI * e);
  return {
    cx: a.cx + (b.cx - a.cx) * e,
    cy: a.cy + (b.cy - a.cy) * e,
    zoom:
      Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * e) /
      pullBack,
  };
};

// Where the camera is at `seconds`: it starts on the first screen and makes
// each move in turn; a move that starts before the last one is finished
// takes over from wherever the camera is.
export const viewAt = (canvas: Canvas, seconds: number): View => {
  let view =
    canvas.screens.length > 0
      ? areaView(canvas.screens[0])
      : overviewView(canvas);
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

// The changes of screen, in seconds: where a board ends and the next one is
// on another screen.
const screenChanges = (canvas: Canvas) =>
  canvas.boards
    .slice(0, -1)
    .filter((_, i) => canvas.screenOf[i + 1] !== canvas.screenOf[i])
    .map((board) => board.end);

// How much the empty board covers the frame at `seconds` (0 to 1): it fades
// in just before each change of screen and out just after.
export const cutCover = (canvas: Canvas, seconds: number) =>
  Math.max(
    0,
    ...screenChanges(canvas).map(
      (end) => 1 - Math.abs(seconds - end) / CUT_FADE_SECONDS,
    ),
  );

// The screen being drawn on at `seconds`: the hand only follows that
// screen's strokes, so it leaves before a cut and comes back after it,
// instead of travelling across.
export const screenAt = (canvas: Canvas, seconds: number) => {
  const index = canvas.boards.findIndex((board) => seconds < board.end);
  return canvas.screenOf[index === -1 ? canvas.boards.length - 1 : index] ?? 0;
};
