import "./index.css";
import { Composition } from "remotion";
import { SceneVideo, type SceneVideoProps } from "./SceneVideo";
import { TestCard } from "./TestCard";
import { videoLength } from "./animation/timeline";
import { FORMATS, FPS, secondsToFrames } from "./layout/formats";
import { validateVideo } from "./schema/validate";
import { VIDEOS } from "./videos";

// A scene video takes its length and frame shape from its scene file. A
// file too broken to read gets a few seconds in portrait, enough to show
// its problems.
const sceneVideoMetadata = ({ props }: { props: SceneVideoProps }) => {
  const { video } = validateVideo(props.video);
  const { width, height } = FORMATS[video?.format ?? "portrait"];
  return {
    durationInFrames: Math.max(
      1,
      secondsToFrames(video ? videoLength(video) : 5),
    ),
    width,
    height,
  };
};

// Each <Composition> is an entry in the Studio sidebar and can be rendered by
// its id: npm run render -- dns. One per scene file in src/videos.ts, plus
// TestCard, the M0 smoke test.

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {VIDEOS.map(({ id, scene }) => (
        <Composition
          key={id}
          id={id}
          component={SceneVideo}
          defaultProps={{ video: scene }}
          calculateMetadata={sceneVideoMetadata}
          durationInFrames={1}
          fps={FPS}
          width={FORMATS.portrait.width}
          height={FORMATS.portrait.height}
        />
      ))}
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
