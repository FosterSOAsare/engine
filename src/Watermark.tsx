import { loadFont } from "@remotion/google-fonts/Montserrat";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { INK } from "./elements/shared";

// A small handle in the bottom-right corner of every frame: visible, but
// quiet enough not to compete with the drawing.

const { fontFamily } = loadFont("normal", {
  weights: ["700"],
  subsets: ["latin"],
});

const MARGIN = 1.5; // percent of the frame's shorter side, from both edges

export const Watermark: React.FC<{ text: string }> = ({ text }) => {
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 100;
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "flex-end",
        padding: MARGIN * unit,
      }}
    >
      <div
        style={{
          fontFamily,
          fontWeight: 700,
          fontSize: 2.6 * unit,
          color: INK,
          opacity: 0.55,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
