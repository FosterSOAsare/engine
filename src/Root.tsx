import "./index.css";
import { Composition } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import {
  captionsFile,
  narrationFile,
  SceneVideo,
  type SceneVideoProps,
} from "./SceneVideo";
import { TestCard } from "./TestCard";
import { videoLength } from "./animation/timeline";
import { FORMATS, FPS, secondsToFrames } from "./layout/formats";
import { videoSchema } from "./schema/scene";
import type { HeardWords } from "./schema/timing";
import { validateVideo, type AudioLengths } from "./schema/validate";
import { VIDEOS } from "./videos";

// The length of each scene's narration file, or null where there is none.
const measureNarration = async (
  id: string,
  sceneIds: string[],
): Promise<AudioLengths> =>
  Promise.all(
    sceneIds.map((sceneId) =>
      getAudioDurationInSeconds(narrationFile(id, sceneId)).catch(() => null),
    ),
  );

// Whisper's word timings for a video, or undefined before npm run captions.
const loadHeardWords = async (id: string): Promise<HeardWords | undefined> => {
  try {
    const response = await fetch(captionsFile(id));
    return response.ok ? ((await response.json()) as HeardWords) : undefined;
  } catch {
    return undefined;
  }
};

// A scene video takes its length and frame shape from its scene file, and
// for a voiceover video from its narration: the audio is measured here and
// handed to the video. A file too broken to read gets a few seconds in
// portrait, enough to show its problems.
const sceneVideoMetadata = async ({ props }: { props: SceneVideoProps }) => {
  const parsed = videoSchema.safeParse(props.video);
  const audio =
    parsed.success && parsed.data.voiceover
      ? await measureNarration(
          props.id,
          parsed.data.scenes.map((scene) => scene.id),
        )
      : undefined;
  const heard =
    parsed.success && parsed.data.voiceover
      ? await loadHeardWords(props.id)
      : undefined;
  const { video } = validateVideo(props.video, audio, heard);
  const { width, height } = FORMATS[video?.format ?? "portrait"];
  return {
    durationInFrames: Math.max(
      1,
      secondsToFrames(video ? videoLength(video) : 5),
    ),
    width,
    height,
    props: { ...props, audio, heard },
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
          defaultProps={{ id, video: scene }}
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
