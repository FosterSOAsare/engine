import { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { sceneTimes, WIPE_SECONDS } from "./animation/timeline";
import { Captions } from "./captions/Captions";
import { captionPages } from "./captions/pages";
import { WATERMARK } from "./brand";
import { Arrow } from "./elements/Arrow";
import { Hand } from "./elements/Hand";
import { Shape } from "./elements/Shape";
import { Text } from "./elements/Text";
import { BOARD } from "./elements/shared";
import { secondsToFrames } from "./layout/formats";
import { handTracks, planVideo, type PlannedBoard } from "./layout/plan";
import type { HeardWords } from "./schema/timing";
import { validateVideo, type AudioLengths } from "./schema/validate";
import { Watermark } from "./Watermark";

// Draws a whole video from its scene file. The file arrives as plain JSON
// (a composition prop), is checked, and either drawn or, if it has
// problems, listed on screen instead of rendering a broken video.

export type SceneVideoProps = {
  id: string; // the video's id: its narration is in public/videos/<id>/
  video: unknown; // the scene file
  audio?: AudioLengths; // measured narration lengths (see Root.tsx)
  heard?: HeardWords; // whisper's timed words (npm run captions)
  versions?: NarrationVersions; // fingerprints of the narration files
  // Overrides the scene file's "captions" for one render:
  // npm run render -- <id> --no-captions
  captions?: boolean;
};

// npm run voice records a fingerprint of each scene's narration in
// voice.json. Adding it to the audio's address means a regenerated file
// is never mistaken for the old one by the browser's cache.
export type NarrationVersions = Record<string, string>;

// Where a scene's narration is (written by npm run voice).
export const narrationFile = (id: string, sceneId: string, version?: string) =>
  staticFile(`videos/${id}/${sceneId}.wav`) +
  (version ? `?v=${version.slice(0, 12)}` : "");

// Where a video's word timings and narration fingerprints are (written by
// npm run captions and npm run voice).
export const captionsFile = (id: string) =>
  staticFile(`videos/${id}/captions.json`);
export const versionsFile = (id: string) =>
  staticFile(`videos/${id}/voice.json`);

const Errors: React.FC<{ errors: string[] }> = ({ errors }) => (
  <AbsoluteFill style={{ background: BOARD }}>
    <div
      style={{
        padding: 60,
        color: "#b00020",
        fontSize: 40,
        lineHeight: 1.3,
        fontFamily: "sans-serif",
      }}
    >
      <p style={{ fontWeight: 700 }}>
        The scene file has {errors.length} problem(s):
      </p>
      {errors.map((error) => (
        <p key={error} style={{ marginTop: 24 }}>
          {"• "}
          {error}
        </p>
      ))}
    </div>
  </AbsoluteFill>
);

// One board: its drawings, then a wipe across it at the end unless the
// next scene keeps it.
const BoardView: React.FC<{ board: PlannedBoard }> = ({ board }) => {
  const frame = useCurrentFrame();
  const endFrame = secondsToFrames(board.end);
  const wiped = board.wipes
    ? interpolate(
        frame,
        [secondsToFrames(board.end - WIPE_SECONDS), endFrame],
        [0, 100],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;

  return (
    <AbsoluteFill>
      {board.drawings.map((drawing, i) => {
        switch (drawing.type) {
          case "shape":
            return <Shape key={i} {...drawing.props} />;
          case "text":
            return <Text key={i} {...drawing.props} />;
          case "arrow":
            return (
              <AbsoluteFill key={i}>
                <Arrow {...drawing.props} />
                {drawing.label ? <Text {...drawing.label} /> : null}
              </AbsoluteFill>
            );
        }
      })}
      {wiped > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${wiped}%`,
            background: BOARD,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

export const SceneVideo: React.FC<SceneVideoProps> = ({
  id,
  video,
  audio,
  heard,
  versions,
  captions,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const result = useMemo(
    () => validateVideo(video, audio, heard),
    [video, audio, heard],
  );
  const plan = useMemo(
    () => (result.ok ? planVideo(result.video, { width, height }) : []),
    [result, width, height],
  );
  const tracks = useMemo(
    () => handTracks(plan, { width, height }),
    [plan, width, height],
  );
  // Captions for narrated videos, from each scene's timed words.
  const pages = useMemo(() => {
    const show = captions ?? result.video?.captions;
    if (!result.video?.voiceover || !show) return [];
    const times = sceneTimes(result.video);
    return result.video.scenes.flatMap((scene, i) =>
      scene.words ? captionPages(scene.words, times[i].start) : [],
    );
  }, [result, captions]);

  if (!result.ok) return <Errors errors={result.errors} />;

  // Only the board on screen right now is drawn.
  const board = plan.find(
    (b) => frame >= secondsToFrames(b.start) && frame < secondsToFrames(b.end),
  );

  return (
    <AbsoluteFill style={{ background: BOARD }}>
      {board ? <BoardView board={board} /> : null}
      <Hand tracks={tracks} />
      <Captions pages={pages} />
      {result.video.watermark !== false ? (
        <Watermark text={result.video.watermark ?? WATERMARK} />
      ) : null}
      {result.video.voiceover
        ? sceneTimes(result.video).map(({ scene, start, end }) => (
            <Sequence
              key={scene.id}
              from={secondsToFrames(start)}
              durationInFrames={secondsToFrames(end) - secondsToFrames(start)}
              layout="none"
            >
              <Audio src={narrationFile(id, scene.id, versions?.[scene.id])} />
            </Sequence>
          ))
        : null}
    </AbsoluteFill>
  );
};
