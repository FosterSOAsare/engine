import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { secondsToFrames } from "./layout/formats";

const TITLE = "Asare Foster";
const SUBTITLE = "Senior Software Engineer | Full Stack Developer";
const MARKER_BLUE = "#2563eb";

// Two slightly different strokes, like a marker underline drawn twice.
// The second one starts a little later, the way Rough.js doubles its lines.
const UNDERLINE_STROKES = [
  { d: "M 10 22 Q 200 8, 400 18 T 790 12", delay: 0 },
  { d: "M 24 30 Q 220 18, 410 26 T 770 22", delay: 6 },
];

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

// M0 test composition: proves our own code previews and renders.
// 0.0s title letters pop up one by one
// 0.9s underline is drawn left to right
// 1.6s subtitle slides in
// end  everything fades out
export const TestCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const underlineStart = secondsToFrames(0.9);
  const underlineDraw = secondsToFrames(0.7);
  const subtitleStart = secondsToFrames(1.6);

  const fadeOut = interpolate(
    frame,
    [durationInFrames - secondsToFrames(0.5), durationInFrames],
    [1, 0],
    clamp,
  );

  const subtitle = spring({
    frame: frame - subtitleStart,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      className="items-center justify-center bg-[#faf8f3]"
      style={{ opacity: fadeOut }}
    >
      <div className="flex flex-col items-center">
        <h1 className="flex font-sans text-[96px] font-bold text-neutral-800">
          {TITLE.split("").map((char, i) => {
            const pop = spring({
              frame: frame - i * 2,
              fps,
              config: { damping: 12, stiffness: 180 },
            });
            return (
              <span
                key={i}
                className="inline-block"
                style={{
                  opacity: interpolate(pop, [0, 0.3], [0, 1], clamp),
                  transform: `translateY(${interpolate(pop, [0, 1], [60, 0])}px) scale(${interpolate(pop, [0, 1], [0.6, 1])})`,
                }}
              >
                {/* A plain space collapses inside a flex row; keep it visible. */}
                {char === " " ? " " : char}
              </span>
            );
          })}
        </h1>

        <svg width={800} height={40} viewBox="0 0 800 40" className="-mt-2">
          {UNDERLINE_STROKES.map(({ d, delay }) => {
            // pathLength={1} lets us reveal the stroke with a 0..1 dash offset.
            const drawn = interpolate(
              frame,
              [underlineStart + delay, underlineStart + delay + underlineDraw],
              [0, 1],
              { ...clamp, easing: Easing.inOut(Easing.cubic) },
            );
            return (
              <path
                key={d}
                d={d}
                pathLength={1}
                fill="none"
                stroke={MARKER_BLUE}
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={1}
                strokeDashoffset={1 - drawn}
              />
            );
          })}
        </svg>

        <p
          className="mt-8 font-sans text-[44px] text-neutral-500"
          style={{
            opacity: subtitle,
            transform: `translateY(${interpolate(subtitle, [0, 1], [30, 0])}px)`,
          }}
        >
          {SUBTITLE}
        </p>
      </div>
    </AbsoluteFill>
  );
};
