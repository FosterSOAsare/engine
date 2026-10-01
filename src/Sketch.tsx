import { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import rough from "roughjs";
import type { Drawable, Options } from "roughjs/bin/core";
import {
  measureStrokes,
  splitStrokes,
  strokeProgress,
  type Stroke,
} from "./animation/strokes";
import { secondsToFrames } from "./layout/formats";

// M1 playground: Rough.js shapes and the stroke-reveal animation are built
// here step by step before they become reusable elements.

const INK = "#222222";
const STROKE_WIDTH = 5;
const ROUGH_STYLE: Options = {
  stroke: INK,
  strokeWidth: STROKE_WIDTH,
  roughness: 1.2,
};
const LABEL_WRITE_SECONDS = 0.5;

type Point = { x: number; y: number };

// A box, described the way the scene file will: centre in percent of the
// frame, size in percent of the frame's shorter side (so it never stretches).
type BoxSpec = { x: number; y: number; w: number; h: number; seed: number };

// Times in seconds, like the scene file in M2.
const TIMING = {
  browser: { start: 0.3, draw: 1.2 },
  arrow: { start: 1.9, draw: 0.7 },
  server: { start: 2.9, draw: 1.2 },
};
const ARROW_SEED = 3;

// Portrait stacks the boxes; landscape puts them side by side. A first taste
// of the named layouts planned for M4.
const layoutFor = (width: number, height: number) => {
  const size = { w: 50, h: 22 };
  return width > height
    ? {
        browser: { x: 27, y: 50, ...size, seed: 1 },
        server: { x: 73, y: 50, ...size, seed: 2 },
      }
    : {
        browser: { x: 50, y: 30, ...size, seed: 1 },
        server: { x: 50, y: 70, ...size, seed: 2 },
      };
};

type SketchElement = {
  id: string;
  strokes: Stroke[];
  start: number; // seconds
  draw: number; // seconds
  label?: { text: string; spec: BoxSpec };
};

export const Sketch: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Shapes depend only on the frame size, so build and measure them once.
  const elements = useMemo((): SketchElement[] => {
    const { browser, server } = layoutFor(width, height);
    const generator = rough.generator();
    const unit = Math.min(width, height) / 100;

    const toPixels = (box: BoxSpec) => {
      const w = box.w * unit;
      const h = box.h * unit;
      return {
        left: (box.x / 100) * width - w / 2,
        top: (box.y / 100) * height - h / 2,
        w,
        h,
      };
    };

    const toStrokes = (drawables: Drawable[]) =>
      measureStrokes(
        drawables
          .flatMap((drawable) => generator.toPaths(drawable))
          .flatMap((path) => splitStrokes(path.d)),
      );

    const box = (spec: BoxSpec) => {
      const { left, top, w, h } = toPixels(spec);
      return [
        generator.rectangle(left, top, w, h, { ...ROUGH_STYLE, seed: spec.seed }),
      ];
    };

    // Arrow between the facing edges of two boxes (bottom/top when stacked,
    // right/left when side by side), with a small gap so it never touches.
    // The shaft is drawn first, then the two sides of the head.
    const arrow = (from: BoxSpec, to: BoxSpec, seed: number) => {
      const a = toPixels(from);
      const b = toPixels(to);
      const gap = 3 * unit;
      const sideBySide = Math.abs(to.x - from.x) > Math.abs(to.y - from.y);
      const start: Point = sideBySide
        ? { x: a.left + a.w + gap, y: a.top + a.h / 2 }
        : { x: a.left + a.w / 2, y: a.top + a.h + gap };
      const end: Point = sideBySide
        ? { x: b.left - gap, y: b.top + b.h / 2 }
        : { x: b.left + b.w / 2, y: b.top - gap };

      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLength = 6 * unit;
      const headPoint = (side: number): Point => ({
        x: end.x - headLength * Math.cos(angle + side * (Math.PI / 6)),
        y: end.y - headLength * Math.sin(angle + side * (Math.PI / 6)),
      });
      const left = headPoint(1);
      const right = headPoint(-1);
      const options = { ...ROUGH_STYLE, seed };

      return [
        generator.line(start.x, start.y, end.x, end.y, options),
        generator.line(left.x, left.y, end.x, end.y, options),
        generator.line(right.x, right.y, end.x, end.y, options),
      ];
    };

    return [
      {
        id: "browser",
        strokes: toStrokes(box(browser)),
        ...TIMING.browser,
        label: { text: "Browser", spec: browser },
      },
      {
        id: "arrow",
        strokes: toStrokes(arrow(browser, server, ARROW_SEED)),
        ...TIMING.arrow,
      },
      {
        id: "server",
        strokes: toStrokes(box(server)),
        ...TIMING.server,
        label: { text: "Server", spec: server },
      },
    ];
  }, [width, height]);

  const fontSize = Math.min(width, height) * 0.06;

  return (
    <AbsoluteFill className="bg-[#faf8f3]">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {elements.map((element) => {
          const t = interpolate(
            frame,
            [
              secondsToFrames(element.start),
              secondsToFrames(element.start + element.draw),
            ],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          const progress = strokeProgress(element.strokes, t);

          return element.strokes.map((stroke, i) =>
            // Skip strokes that have not started: a round line cap would
            // otherwise leave a dot where the stroke will begin.
            progress[i] === 0 ? null : (
              <path
                key={`${element.id}-${i}`}
                d={stroke.d}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - progress[i]}
                fill="none"
                stroke={INK}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ),
          );
        })}
      </svg>

      {/* Labels are written left to right once their outline is finished.
          Plain font for now; step 12 switches to a handwriting font. */}
      {elements.map((element) => {
        if (!element.label) return null;
        const writeStart = secondsToFrames(element.start + element.draw);
        const written = interpolate(
          frame,
          [writeStart, writeStart + secondsToFrames(LABEL_WRITE_SECONDS)],
          [0, 100],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const { spec, text } = element.label;
        return (
          <div
            key={element.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 font-sans font-bold text-neutral-800"
            style={{
              left: `${spec.x}%`,
              top: `${spec.y}%`,
              fontSize,
              clipPath: `inset(0 ${100 - written}% 0 0)`,
            }}
          >
            {text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
