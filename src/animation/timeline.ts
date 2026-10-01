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

export const videoLength = (video: Video) =>
  video.scenes.reduce((sum, scene) => sum + (scene.duration ?? 0), 0);

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
