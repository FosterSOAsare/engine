import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HAND_FONT } from "./elements/Text";
import type { Scene } from "./schema/scene";

// The section the video is in, small in the top-right corner of the screen
// (not on the board, so the camera never moves it). A scene's "chapter"
// lasts until a later scene sets another; "" clears it.

const FADE_SECONDS = 0.4;

export type ChapterSpan = { text: string; start: number; end: number };

// Each chapter and when it is on screen, from scene start times.
export const chapterSpans = (
  scenes: Pick<Scene, "chapter">[],
  starts: number[],
  end: number,
): ChapterSpan[] => {
  const spans: ChapterSpan[] = [];
  scenes.forEach((scene, i) => {
    if (scene.chapter === undefined) return;
    const last = spans[spans.length - 1];
    if (last) last.end = starts[i];
    spans.push({ text: scene.chapter, start: starts[i], end });
  });
  return spans.filter((span) => span.text !== "");
};

export const Chapter: React.FC<{ spans: ChapterSpan[] }> = ({ spans }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const now = frame / fps;
  const span = spans.find((s) => now >= s.start && now < s.end);
  if (!span) return null;
  const opacity = interpolate(
    now,
    [span.start, span.start + FADE_SECONDS],
    [0, 1],
    {
      extrapolateRight: "clamp",
    },
  );
  const unit = Math.min(width, height) / 100;
  return (
    <AbsoluteFill
      style={{
        alignItems: "flex-end",
        padding: `${2.5 * unit}px ${3 * unit}px`,
      }}
    >
      <div
        style={{
          fontFamily: HAND_FONT,
          fontWeight: 700,
          fontSize: 3.2 * unit,
          color: "#6b6b6b",
          opacity,
          whiteSpace: "nowrap",
        }}
      >
        {span.text}
      </div>
    </AbsoluteFill>
  );
};
