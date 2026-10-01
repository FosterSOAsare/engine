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
import { Arrow } from "./elements/Arrow";
import { Hand } from "./elements/Hand";
import { Shape } from "./elements/Shape";
import { Text } from "./elements/Text";
import { BOARD } from "./elements/shared";
import { secondsToFrames } from "./layout/formats";
import { handTracks, planVideo, type PlannedBoard } from "./layout/plan";
import { validateVideo, type AudioLengths } from "./schema/validate";

// Draws a whole video from its scene file. The file arrives as plain JSON
// (a composition prop), is checked, and either drawn or, if it has
// problems, listed on screen instead of rendering a broken video.

export type SceneVideoProps = {
  id: string; // the video's id: its narration is in public/videos/<id>/
  video: unknown; // the scene file
  audio?: AudioLengths; // measured narration lengths (see Root.tsx)
};

// Where a scene's narration is (written by npm run voice).
export const narrationFile = (id: string, sceneId: string) =>
  staticFile(`videos/${id}/${sceneId}.wav`);

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

export const SceneVideo: React.FC<SceneVideoProps> = ({ id, video, audio }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const result = useMemo(() => validateVideo(video, audio), [video, audio]);
  const plan = useMemo(
    () => (result.ok ? planVideo(result.video, { width, height }) : []),
    [result, width, height],
  );
  const tracks = useMemo(
    () => handTracks(plan, { width, height }),
    [plan, width, height],
  );

  if (!result.ok) return <Errors errors={result.errors} />;

  // Only the board on screen right now is drawn.
  const board = plan.find(
    (b) => frame >= secondsToFrames(b.start) && frame < secondsToFrames(b.end),
  );

  return (
    <AbsoluteFill style={{ background: BOARD }}>
      {board ? <BoardView board={board} /> : null}
      <Hand tracks={tracks} />
      {result.video.voiceover
        ? sceneTimes(result.video).map(({ scene, start, end }) => (
            <Sequence
              key={scene.id}
              from={secondsToFrames(start)}
              durationInFrames={secondsToFrames(end) - secondsToFrames(start)}
              layout="none"
            >
              <Audio src={narrationFile(id, scene.id)} />
            </Sequence>
          ))
        : null}
    </AbsoluteFill>
  );
};
