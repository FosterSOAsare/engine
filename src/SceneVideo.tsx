import { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { WIPE_SECONDS } from "./animation/timeline";
import { Arrow } from "./elements/Arrow";
import { Box } from "./elements/Box";
import { Circle } from "./elements/Circle";
import { Hand } from "./elements/Hand";
import { Icon } from "./elements/Icon";
import { Text } from "./elements/Text";
import { BOARD } from "./elements/shared";
import { secondsToFrames } from "./layout/formats";
import { handTracks, planVideo, type PlannedBoard } from "./layout/plan";
import { validateVideo } from "./schema/validate";

// Draws a whole video from its scene file. The file arrives as plain JSON
// (a composition prop), is checked, and either drawn or, if it has
// problems, listed on screen instead of rendering a broken video.

export type SceneVideoProps = { video: unknown };

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
          case "box":
            return <Box key={i} {...drawing.props} />;
          case "circle":
            return <Circle key={i} {...drawing.props} />;
          case "text":
            return <Text key={i} {...drawing.props} />;
          case "icon":
            return <Icon key={i} {...drawing.props} />;
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

export const SceneVideo: React.FC<SceneVideoProps> = ({ video }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const result = useMemo(() => validateVideo(video), [video]);
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
    </AbsoluteFill>
  );
};
