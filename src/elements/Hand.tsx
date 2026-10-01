import { Img, staticFile, useCurrentFrame } from "remotion";
import { handPosition, type HandTrack } from "../animation/hand";
import { useFrameUnits } from "./shared";

// public/hand-long.png: public/hand.png (a photo of a hand holding a
// pencil, transparent around it) with the forearm continued 3000 px
// further, so it runs off the frame instead of ending in a cut. The pencil
// points left; the hand is to the right of the tip, reaching above and
// below it.
const HAND_IMAGE = { src: "hand-long.png", width: 2067, height: 3886 };
const HAND_TIP = { x: 86, y: 247 }; // the pixel of the image touching the board
const HAND_SIZE = 126; // image width, percent of the frame's shorter side

// Follows the pen across every element's tracks, and leaves the frame
// between elements that are far apart in time.
export const Hand: React.FC<{ tracks: HandTrack[] }> = ({ tracks }) => {
  const frame = useCurrentFrame();
  const { width, height, unit } = useFrameUnits();
  const scale = (HAND_SIZE * unit) / HAND_IMAGE.width;

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
        width: HAND_IMAGE.width * scale,
        height: HAND_IMAGE.height * scale,
      }}
    />
  );
};
