import { Img, staticFile, useCurrentFrame } from "remotion";
import { handPosition, type HandTrack } from "../animation/hand";
import { useFrameUnits } from "./shared";

// public/hero.png: a photo of a hand holding a pencil, transparent around
// it and cropped tight. The pencil points left; the hand is to the right of
// the tip, and the forearm leaves the image at its bottom edge.
const HAND_IMAGE = { src: "hero.png", height: 299 };
const HAND_TIP = { x: 3, y: 86 }; // the pixel of the image touching the board
// Size the hand by its pencil (tip to eraser end), not by the image, so
// empty space around the photo does not change how big the hand looks.
const PENCIL_LENGTH = 245; // pixels in the image
const HAND_SIZE = 45; // pencil length, percent of the frame's shorter side

// Follows the pen across every element's tracks, and leaves the frame
// between elements that are far apart in time.
export const Hand: React.FC<{ tracks: HandTrack[] }> = ({ tracks }) => {
  const frame = useCurrentFrame();
  const { width, height, unit } = useFrameUnits();
  const scale = (HAND_SIZE * unit) / PENCIL_LENGTH;

  // Below the frame, where the forearm comes from: the image reaches this
  // far above the tip, so the tip must be at least that far below the edge.
  const offscreen = { x: width * 0.75, y: height + HAND_TIP.y * scale + 10 };
  const tip = handPosition(tracks, frame, offscreen);

  return (
    <Img
      src={staticFile(HAND_IMAGE.src)}
      style={{
        position: "absolute",
        left: tip.x - HAND_TIP.x * scale,
        top: tip.y - HAND_TIP.y * scale,
        // Size by height and let the width follow, so the photo keeps its
        // proportions. Tailwind caps images at max-width: 100%, which
        // squeezed the hand in portrait, where it is wider than the frame.
        height: HAND_IMAGE.height * scale,
        width: "auto",
        maxWidth: "none",
      }}
    />
  );
};
