import "./index.css";
import { Composition } from "remotion";
import { SceneVideo, type SceneVideoProps } from "./SceneVideo";
import { Sketch } from "./Sketch";
import { TestCard } from "./TestCard";
import { videoLength } from "./animation/timeline";
import { FORMATS, FPS, secondsToFrames } from "./layout/formats";
import { validateVideo } from "./schema/validate";
import { VIDEOS } from "./videos";

// A scene video lasts as long as its scene file says. A file too broken to
// read gets a few seconds, enough to show its problems.
const sceneVideoLength = ({ props }: { props: SceneVideoProps }) => {
  const { video } = validateVideo(props.video);
  return {
    durationInFrames: Math.max(
      1,
      secondsToFrames(video ? videoLength(video) : 5),
    ),
  };
};

// Each <Composition> is an entry in the Studio sidebar and can be rendered by
// its id, e.g. npx remotion render TestCard out/test.mp4

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {VIDEOS.map(({ id, scene }) => (
        <Composition
          key={id}
          id={id}
          component={SceneVideo}
          defaultProps={{ video: scene }}
          calculateMetadata={sceneVideoLength}
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
      <Composition
        id="Sketch"
        component={Sketch}
        durationInFrames={secondsToFrames(10)}
        fps={FPS}
        width={FORMATS.portrait.width}
        height={FORMATS.portrait.height}
      />
      {/* M1 test clip: the Sketch scene, cut to end a second after the hand
          leaves. Render with npm run render:m1 */}
      <Composition
        id="M1Demo"
        component={Sketch}
        durationInFrames={secondsToFrames(6)}
        fps={FPS}
        width={FORMATS.portrait.width}
        height={FORMATS.portrait.height}
      />
      <Composition
        id="Sketch-Landscape"
        component={Sketch}
        durationInFrames={secondsToFrames(10)}
        fps={FPS}
        width={FORMATS.landscape.width}
        height={FORMATS.landscape.height}
      />
    </>
  );
};
