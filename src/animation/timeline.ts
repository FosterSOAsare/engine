import { FPS } from "../layout/formats";
import type { Scene, Video } from "../schema/scene";

// When each scene plays, in seconds from the start of the video. Scenes
// follow each other; element times in the file are relative to their scene,
// so moving a scene never means editing its elements.

// Erasing the board at the end of a scene takes this long. It happens
// inside the scene's own duration, so it never changes the video length.
export const WIPE_SECONDS = 0.4;

export type TimedScene = {
  scene: Scene;
  index: number;
  start: number; // seconds from the start of the video
  end: number;
};

// A board is what stays on screen between two wipes: one scene, plus any
// following scenes with keepPrevious.
export type Board = {
  scenes: TimedScene[];
  start: number;
  end: number;
  wipes: boolean; // erased at its end (false for the last board)
};

export const sceneTimes = (video: Video): TimedScene[] => {
  let at = 0;
  return video.scenes.map((scene, index) => {
    const start = at;
    at += scene.duration ?? 0;
    return { scene, index, start, end: at };
  });
};

// The scenes, one after another.
export const scenesLength = (video: Video) =>
  video.scenes.reduce((sum, scene) => sum + (scene.duration ?? 0), 0);

// A landscape video ends on its whole board: after the last scene the
// camera zooms out (layout/canvas.ts) and holds the overview.
export const OVERVIEW_MOVE_SECONDS = 1.5;
// Between boards the camera glides for this long, centred on the change.
export const CAMERA_MOVE_SECONDS = 1;
export const OVERVIEW_HOLD_SECONDS = 2.5;

// The whole video, in seconds.
export const videoLength = (video: Video) =>
  scenesLength(video) +
  (video.format === "landscape"
    ? OVERVIEW_MOVE_SECONDS + OVERVIEW_HOLD_SECONDS
    : 0);

export const boards = (video: Video): Board[] => {
  const result: Board[] = [];
  for (const timed of sceneTimes(video)) {
    const current = result[result.length - 1];
    if (current && timed.scene.keepPrevious) {
      current.scenes.push(timed);
      current.end = timed.end;
    } else {
      result.push({
        scenes: [timed],
        start: timed.start,
        end: timed.end,
        wipes: false,
      });
    }
  }
  result.forEach((board, i) => {
    board.wipes = i < result.length - 1;
  });
  return result;
};

// The moment shown on cover images, in seconds: the video's "cover" (a
// scene id or seconds). By default the end of the first scene, or for a
// landscape video the overview of its whole board. A scene's end is just
// before its board is wiped, with everything drawn.
export const coverTime = (video: Video): number => {
  const length = videoLength(video);
  const lastFrame = Math.max(0, length - 1 / FPS);
  if (typeof video.cover === "number") return Math.min(video.cover, lastFrame);
  if (video.cover === undefined && video.format === "landscape") {
    return lastFrame;
  }
  const times = sceneTimes(video);
  const index = Math.max(
    0,
    times.findIndex(({ scene }) => scene.id === (video.cover ?? video.scenes[0].id)),
  );
  const next = video.scenes[index + 1];
  const wiped =
    next !== undefined && !next.keepPrevious && video.format !== "landscape";
  // Before the wipe, or in a landscape video before the camera moves on.
  const leaves =
    video.format === "landscape" && next !== undefined && !next.keepPrevious
      ? CAMERA_MOVE_SECONDS / 2
      : 0;
  return Math.max(
    0,
    Math.min(
      lastFrame,
      times[index].end - (wiped ? WIPE_SECONDS : 0) - leaves - 2 / FPS,
    ),
  );
};
