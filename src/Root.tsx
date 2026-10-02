import "./index.css";
import { Composition, Folder, staticFile } from "remotion";
import {
  captionsFile,
  narrationFile,
  SceneVideo,
  versionsFile,
  type NarrationVersions,
  type SceneVideoProps,
} from "./SceneVideo";
import { TestCard } from "./TestCard";
import type { CompiledAsset, CompiledAssets } from "./assets/compiled";
import { fetchWavDuration } from "./audio/wav";
import { coverTime, videoLength } from "./animation/timeline";
import {
  FORMATS,
  formatsFor,
  writtenFormat,
  type VideoFormat,
  FPS,
  secondsToFrames,
  type FormatName,
} from "./layout/formats";
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

// The compiled designs a video uses (npm run assets), by name.
const loadAssets = async (names: string[]): Promise<CompiledAssets> => {
  const loaded = await Promise.all(
    names.map(
      async (name) =>
        [
          name,
          await loadJson<CompiledAsset>(
            staticFile(`compiled-assets/${name}.json`),
          ),
        ] as const,
    ),
  );
  return Object.fromEntries(
    loaded.filter(
      (entry): entry is readonly [string, CompiledAsset] =>
        entry[1] !== undefined,
    ),
  );
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
  const imageNames = parsed.success
    ? [
        ...new Set(
          parsed.data.scenes.flatMap((scene) =>
            scene.elements.flatMap((element) =>
              element.type === "image" ? [element.name] : [],
            ),
          ),
        ),
      ]
    : [];
  const assets = await loadAssets(imageNames);
  const { width, height } =
    FORMATS[props.format ?? writtenFormat(video?.format ?? "all")];
  return {
    // For a cover the video stops at the cover moment: its last frame is
    // the cover (npm run cover renders it).
    durationInFrames:
      props.cover && video
        ? secondsToFrames(coverTime(video)) + 1
        : Math.max(1, secondsToFrames(video ? videoLength(video) : 5)),
    width,
    height,
    props: { ...props, audio, heard, versions, assets },
  };
};

// A scene file's kind of video ("all" unless it says).
const videoFormatOf = (scene: unknown): VideoFormat => {
  const parsed = videoSchema.safeParse(scene);
  return parsed.success ? parsed.data.format : "all";
};

// The composition id of a video in a format: the plain id in the format
// it is written for, "<id>-<format>" in the others (npm run render -- dns,
// npm run render -- dns-square).
export const compositionId = (
  id: string,
  format: FormatName,
  written: FormatName,
) => (format === written ? id : `${id}-${format}`);

// Each <Composition> is an entry in the Studio sidebar and can be rendered by
// its id. Every video in src/videos.ts gets a folder with one composition per
// format it is made in (all four, or landscape only), the one it is written
// in first. Plus TestCard, the M0 smoke test.

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {VIDEOS.map(({ id, scene }) => {
        const formats = formatsFor(videoFormatOf(scene));
        const written = formats[0];
        return (
          <Folder key={id} name={id}>
            {formats.map((format) => (
              <Composition
                key={format}
                id={compositionId(id, format, written)}
                component={SceneVideo}
                defaultProps={{ id, video: scene, format }}
                calculateMetadata={sceneVideoMetadata}
                durationInFrames={1}
                fps={FPS}
                width={FORMATS[format].width}
                height={FORMATS[format].height}
              />
            ))}
          </Folder>
        );
      })}
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
