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
import { sceneTimes, videoLength, WIPE_SECONDS } from "./animation/timeline";
import { Captions } from "./captions/Captions";
import { Chapter, chapterSpans } from "./Chapter";
import { captionPages } from "./captions/pages";
import type { CompiledAssets } from "./assets/compiled";
import { WATERMARK } from "./brand";
import { Arrow } from "./elements/Arrow";
import { Hand } from "./elements/Hand";
import { Image } from "./elements/Image";
import { Shape } from "./elements/Shape";
import { Text } from "./elements/Text";
import { BOARD, BoardSize } from "./elements/shared";
import {
  AREA,
  boardAt,
  cameraPlacement,
  canvasFor,
  cutCover,
  onScreen,
  viewAt,
} from "./layout/canvas";
import { placeTrack, stagesFor } from "./layout/fit";
import {
  FPS,
  secondsToFrames,
  writtenFormat,
  type FormatName,
} from "./layout/formats";
import { handTracks, type PlannedBoard } from "./layout/plan";
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
  assets?: CompiledAssets; // the designs the video uses (see Root.tsx)
  // The format to show it in, if not the one the scene file is written for
  // (one composition per format, see Root.tsx).
  format?: FormatName;
  // For a cover image: no hand, captions or sound. The composition then
  // ends at the cover moment (see Root.tsx) and its last frame is the cover
  // (npm run cover).
  cover?: boolean;
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
          case "image":
            return <Image key={i} {...drawing.props} />;
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
  assets,
  format,
  cover,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const result = useMemo(
    () => validateVideo(video, audio, heard),
    [video, audio, heard],
  );
  // A landscape video: every scene on one board, seen through a camera
  // (layout/canvas.ts).
  const canvas = useMemo(
    () =>
      result.ok && result.video.format === "landscape"
        ? canvasFor(result.video, assets ?? {})
        : null,
    [result, assets],
  );
  // Any other video: each board laid out for the format shown
  // (layout/fit.ts), and the hand's path placed with it.
  const stages = useMemo(
    () =>
      result.ok && result.video.format !== "landscape"
        ? stagesFor(
            result.video,
            format ?? writtenFormat(result.video.format),
            assets ?? {},
          )
        : [],
    [result, format, assets],
  );
  const tracks = useMemo(
    () =>
      stages.flatMap(({ board, frame, placement }) =>
        handTracks([board], frame).map((track) => placeTrack(track, placement)),
      ),
    [stages],
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

  // Section headings in the corner.
  const chapters = useMemo(
    () =>
      result.video
        ? chapterSpans(
            result.video.scenes,
            sceneTimes(result.video).map((t) => t.start),
            videoLength(result.video),
          )
        : [],
    [result],
  );

  // Designs that couldn't be loaded (not compiled yet, or misnamed).
  const missing = result.ok
    ? [
        ...new Set(
          result.video.scenes.flatMap((scene) =>
            scene.elements.flatMap((element) =>
              element.type === "image" && !assets?.[element.name]
                ? [element.name]
                : [],
            ),
          ),
        ),
      ]
    : [];
  if (!result.ok) return <Errors errors={result.errors} />;
  const narration =
    result.video.voiceover && !cover
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
      : null;
  if (missing.length > 0) {
    return (
      <Errors
        errors={missing.map(
          (name) => `design "${name}" isn't compiled yet; run npm run assets`,
        )}
      />
    );
  }

  if (canvas) {
    // The camera at this moment; boards it can't see aren't drawn.
    const size = { width, height };
    const camera = cameraPlacement(viewAt(canvas, frame / FPS), size);
    return (
      <AbsoluteFill style={{ background: BOARD }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: canvas.width,
            height: canvas.height,
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {canvas.boards.map((board, i) => {
            const area = canvas.areas[i];
            return frame >= secondsToFrames(board.start) &&
              onScreen(area, camera, size) ? (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: area.left,
                  top: area.top,
                  width: area.width,
                  height: area.height,
                }}
              >
                <BoardSize value={AREA}>
                  <BoardView board={board} />
                </BoardSize>
              </div>
            ) : null;
          })}
        </div>
        {!cover ? (
          <>
            <Hand
              tracks={canvas.tracks[boardAt(canvas, frame / FPS)].map((track) =>
                placeTrack(track, camera),
              )}
            />
            <Captions pages={pages} />
          </>
        ) : null}
        {/* The fade between boards covers the board and the hand. */}
        <AbsoluteFill
          style={{ background: BOARD, opacity: cutCover(canvas, frame / FPS) }}
        />
        <Chapter spans={chapters} />
        {result.video.watermark !== false ? (
          <Watermark text={result.video.watermark ?? WATERMARK} />
        ) : null}
        {narration}
      </AbsoluteFill>
    );
  }

  // Only the board on screen right now is drawn.
  const stage = stages.find(
    ({ board }) =>
      frame >= secondsToFrames(board.start) &&
      frame < secondsToFrames(board.end),
  );
  const boardView = stage ? (
    <div
      style={{
        position: "absolute",
        left: stage.placement.x,
        top: stage.placement.y,
        width: stage.frame.width,
        height: stage.frame.height,
        transform: `scale(${stage.placement.scale})`,
        transformOrigin: "0 0",
      }}
    >
      <BoardSize value={stage.frame}>
        <BoardView board={stage.board} />
      </BoardSize>
    </div>
  ) : null;

  return (
    <AbsoluteFill style={{ background: BOARD }}>
      {boardView}
      {!cover ? (
        <>
          <Hand tracks={tracks} />
          <Captions pages={pages} />
        </>
      ) : null}
      <Chapter spans={chapters} />
      {result.video.watermark !== false ? (
        <Watermark text={result.video.watermark ?? WATERMARK} />
      ) : null}
      {narration}
    </AbsoluteFill>
  );
};
