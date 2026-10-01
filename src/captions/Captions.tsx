import { loadFont } from "@remotion/google-fonts/Montserrat";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { INK } from "../elements/shared";
import type { CaptionPage } from "./pages";

// Word-by-word captions: one short page at a time in the lower part of the
// frame, the word being spoken highlighted. A clean bold font on a soft
// panel, so they read as captions, not as part of the drawing, and stay
// readable over it.

const { fontFamily } = loadFont("normal", {
  weights: ["800"],
  subsets: ["latin"],
});

const HIGHLIGHT = "#1e6fd9";
const POP_FRAMES = 4; // a new page grows into place over this many frames

export const Captions: React.FC<{ pages: CaptionPage[] }> = ({ pages }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const now = frame / fps;
  const page = pages.find((p) => now >= p.start && now < p.end);
  if (!page) return null;

  // Portrait captions sit higher, clear of the buttons and description
  // TikTok, Reels and Shorts lay over the bottom of the video; landscape
  // ones close to the bottom edge.
  const portrait = height > width;
  const unit = Math.min(width, height) / 100;
  const fontSize = (portrait ? 6.4 : 4.4) * unit;
  const fromBottom = portrait ? 10 : 1.5; // percent of the height

  const pageFrame = frame - Math.round(page.start * fps);
  const scale = interpolate(pageFrame, [0, POP_FRAMES], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The highlighted word is the last one that has started, so it stays lit
  // in the short silences between words.
  let current = 0;
  page.words.forEach((word, i) => {
    if (word.start <= now) current = i;
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: `${fromBottom}%`,
      }}
    >
      <div
        style={{
          fontFamily,
          fontWeight: 800,
          fontSize,
          lineHeight: 1.2,
          color: INK,
          background: "rgba(255, 255, 255, 0.92)",
          borderRadius: fontSize * 0.35,
          padding: `${fontSize * 0.2}px ${fontSize * 0.5}px`,
          boxShadow: "0 6px 24px rgba(0, 0, 0, 0.12)",
          transform: `scale(${scale})`,
          whiteSpace: "nowrap",
        }}
      >
        {page.words.map((word, i) => (
          <span key={i} style={{ color: i === current ? HIGHLIGHT : INK }}>
            {i > 0 ? " " : ""}
            {word.text}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
