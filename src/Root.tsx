import "./index.css";
import { Composition } from "remotion";
import { TestCard } from "./TestCard";
import { FORMATS, FPS, secondsToFrames } from "./layout/formats";

// Each <Composition> is an entry in the Studio sidebar and can be rendered by
// its id, e.g. npx remotion render TestCard out/test.mp4

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TestCard"
        component={TestCard}
        durationInFrames={secondsToFrames(5)}
        fps={FPS}
        width={FORMATS.portrait.width}
        height={FORMATS.portrait.height}
      />
    </>
  );
};
