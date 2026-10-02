// Output formats. Every composition takes its size from here.
//
// A video is written for one format (its "format" in the scene file) and
// can be rendered in all of them: see layout/fit.ts.

export const FPS = 30;

// Margins in percent of the frame's width (left, right) and height (top,
// bottom).
export type Margins = { top: number; right: number; bottom: number; left: number };

export type Format = {
  width: number;
  height: number;
  ratio: string; // for people: "9:16"
  // Where drawings fitted from another format may go: clear of the
  // captions and of the buttons and text each platform lays over the video.
  safe: Margins;
  // Caption size (percent of the shorter side) and distance from the
  // bottom (percent of the height).
  captions: { size: number; fromBottom: number };
};

export const FORMATS = {
  // TikTok, Reels and Shorts: buttons down the right, the description and
  // captions over the bottom.
  portrait: {
    width: 1080,
    height: 1920,
    ratio: "9:16",
    safe: { top: 6, right: 12, bottom: 22, left: 5 },
    captions: { size: 6.4, fromBottom: 10 },
  },
  // LinkedIn and Instagram feed.
  feed: {
    width: 1080,
    height: 1350,
    ratio: "4:5",
    safe: { top: 4, right: 4, bottom: 14, left: 4 },
    captions: { size: 5.2, fromBottom: 3 },
  },
  square: {
    width: 1080,
    height: 1080,
    ratio: "1:1",
    safe: { top: 4, right: 4, bottom: 15, left: 4 },
    captions: { size: 5, fromBottom: 3 },
  },
  // YouTube and LinkedIn video.
  landscape: {
    width: 1920,
    height: 1080,
    ratio: "16:9",
    safe: { top: 4, right: 4, bottom: 12, left: 4 },
    captions: { size: 4.4, fromBottom: 1.5 },
  },
} as const satisfies Record<string, Format>;

export type FormatName = keyof typeof FORMATS;

export const FORMAT_NAMES = Object.keys(FORMATS) as [
  FormatName,
  ...FormatName[],
];

// The format with this frame size (portrait if none matches).
export const formatOfSize = (width: number, height: number): Format =>
  Object.values(FORMATS).find(
    (format) => format.width === width && format.height === height,
  ) ?? FORMATS.portrait;

// Scene files use seconds; Remotion works in frames.
export const secondsToFrames = (seconds: number) => Math.round(seconds * FPS);
