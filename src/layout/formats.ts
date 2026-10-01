// Output formats. Every composition takes its size from here, so M4 can add
// the other formats (4:5, 1:1, 16:9) in one place.

export const FPS = 30;

export const FORMATS = {
  portrait: { width: 1080, height: 1920 }, // 9:16: TikTok, Reels, Shorts
  landscape: { width: 1920, height: 1080 }, // 16:9: YouTube, LinkedIn
} as const;

export type FormatName = keyof typeof FORMATS;

// Scene files use seconds; Remotion works in frames.
export const secondsToFrames = (seconds: number) => Math.round(seconds * FPS);
