import "./index.css";
import { Composition } from "remotion";
import {
  captionsFile,
  narrationFile,
  SceneVideo,
  versionsFile,
  type NarrationVersions,
  type SceneVideoProps,
} from "./SceneVideo";
import { TestCard } from "./TestCard";
import { fetchWavDuration } from "./audio/wav";
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
  versions: NarrationVersions | undefined,
): Promise<AudioLengths> =>
  Promise.all(
    sceneIds.map((sceneId) =>
      fetchWavDuration(narrationFile(id, sceneId, versions?.[sceneId])),
    ),
  );

// A generated JSON file, always fresh (never the browser's cached copy), or
// undefined if it doesn't exist yet.
const loadJson = async <T,>(url: string): Promise<T | undefined> => {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok ? ((await response.json()) as T) : undefined;
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
  const narrated = parsed.success && parsed.data.voiceover;
  const [versions, heard] = narrated
    ? await Promise.all([
        loadJson<NarrationVersions>(versionsFile(props.id)),
        loadJson<HeardWords>(captionsFile(props.id)),
      ])
    : [undefined, undefined];
  const audio = narrated
    ? await measureNarration(
        props.id,
        parsed.data.scenes.map((scene) => scene.id),
        versions,
      )
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
    props: { ...props, audio, heard, versions },
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
