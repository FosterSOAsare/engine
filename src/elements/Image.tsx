import { useId } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { strokeTrack, type HandTrack } from "../animation/hand";
import { LABEL_SIZE } from "../animation/labels";
import { strokeProgress, type Stroke } from "../animation/strokes";
import { ASSETS, type AssetName } from "../assets";
import type { CompiledAsset } from "../assets/compiled";
import { secondsToFrames } from "../layout/formats";
import { scalePath } from "./icons/types";
import { labelFor, Text, textTrack } from "./Text";
import {
  FILL_FADE_SECONDS,
  unitOf,
  useDrawProgress,
  type FrameSize,
  type Timing,
} from "./shared";

// A design from public/assets/, placed on the board. With "draw" the hand
// traces it the way it was made: outlines are drawn by the pen, dark
// brush-stroke shapes are uncovered as the pen passes over them, and the
// colours fade in once the drawing is done.

export type ImageProps = Timing & {
  name: AssetName;
  asset: CompiledAsset | undefined; // loaded before the video plays
  x: number; // centre, percent of the frame
  y: number;
  w: number; // width, percent of the frame's shorter side
  reveal: "draw" | "fade" | "pop";
  label?: string;
  fill?: string; // recolours every fill area
  ink?: string; // recolours every line and brush stroke
  colors?: Record<string, string>; // swaps exact colours
};

// The colour a shape is painted in, after any recolouring.
export const paintOf = (
  shape: { kind: string; color: string },
  { fill, ink, colors }: Pick<ImageProps, "fill" | "ink" | "colors">,
) => {
  const swapped = Object.entries(colors ?? {}).find(
    ([from]) => from.toLowerCase() === shape.color.toLowerCase(),
  );
  if (swapped) return swapped[1];
  if (shape.kind === "fill") return fill ?? shape.color;
  return ink ?? shape.color;
};

// The mask that uncovers a brush stroke is this wide, as a share of the
// design's larger side: wide enough to cover a stroke when its outline is
// traced.
const MASK_WIDTH = 0.04;

// Where the design sits in the frame, in pixels.
export const imageBox = (
  { name, x, y, w }: Pick<ImageProps, "name" | "x" | "y" | "w">,
  frame: FrameSize,
) => {
  const { width, height } = ASSETS[name];
  const pw = w * unitOf(frame);
  const ph = (pw * height) / width;
  return {
    left: (x / 100) * frame.width - pw / 2,
    top: (y / 100) * frame.height - ph / 2,
    width: pw,
    height: ph,
    scale: pw / width,
  };
};

// The pen strokes in drawing order, in design units (for the reveal) and
// in pixels (for the hand).
const penStrokes = (asset: CompiledAsset) =>
  asset.shapes.flatMap((shape, shapeIndex) =>
    shape.kind === "fill"
      ? []
      : (shape.strokes ?? []).map((stroke) => ({ shapeIndex, stroke })),
  );

const toStroke = (
  stroke: { d: string; length: number; start: number[]; end: number[] },
  box: ReturnType<typeof imageBox>,
): Stroke => {
  const X = (u: number) => box.left + u * box.scale;
  const Y = (u: number) => box.top + u * box.scale;
  return {
    d: scalePath(stroke.d, X, Y),
    length: stroke.length * box.scale,
    start: { x: X(stroke.start[0]), y: Y(stroke.start[1]) },
    end: { x: X(stroke.end[0]), y: Y(stroke.end[1]) },
  };
};

export const imageLabel = (props: ImageProps, frame: FrameSize) => {
  const box = imageBox(props, frame);
  const below = box.height / 2 + LABEL_SIZE * 0.7 * unitOf(frame);
  return labelFor({ ...props, y: props.y + (below / frame.height) * 100 });
};

// The hand traces the strokes; fade and pop need no hand.
export const imageTracks = (
  props: ImageProps,
  frame: FrameSize,
): HandTrack[] => {
  const label = imageLabel(props, frame);
  const labelTrack = label ? [textTrack(label, frame)] : [];
  if (props.reveal !== "draw" || !props.asset) return labelTrack;
  const box = imageBox(props, frame);
  const strokes = penStrokes(props.asset).map(({ stroke }) =>
    toStroke(stroke, box),
  );
  if (strokes.length === 0) return labelTrack;
  return [strokeTrack(strokes, props.start, props.draw), ...labelTrack];
};

export const Image: React.FC<ImageProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const id = useId().replace(/:/g, "");
  const t = useDrawProgress(props);
  const { asset } = props;
  if (!asset || frame < secondsToFrames(props.start)) {
    return null;
  }

  const box = imageBox(props, { width, height });
  const label = imageLabel(props, { width, height });
  const done = props.start + props.draw;

  // Colours fade in after the drawing (with "draw") or with everything.
  const fillOpacity =
    props.reveal === "draw"
      ? interpolate(
          frame,
          [secondsToFrames(done), secondsToFrames(done + FILL_FADE_SECONDS)],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      : 1;
  const wholeOpacity = props.reveal === "fade" ? t : 1;
  const scale =
    props.reveal === "pop"
      ? spring({
          frame: frame - secondsToFrames(props.start),
          fps,
          durationInFrames: Math.max(1, secondsToFrames(props.draw)),
          config: { damping: 12 },
        })
      : 1;

  // Pen progress per stroke, grouped by shape.
  const strokes = penStrokes(asset);
  const progress =
    props.reveal === "draw"
      ? strokeProgress(
          strokes.map(({ stroke }) => ({
            d: stroke.d,
            length: stroke.length,
            start: { x: stroke.start[0], y: stroke.start[1] },
            end: { x: stroke.end[0], y: stroke.end[1] },
          })),
          t,
        )
      : strokes.map(() => 1);
  const byShape = new Map<number, { d: string; p: number }[]>();
  strokes.forEach(({ shapeIndex, stroke }, i) => {
    const list = byShape.get(shapeIndex) ?? [];
    list.push({ d: stroke.d, p: progress[i] });
    byShape.set(shapeIndex, list);
  });
  const maskWidth = MASK_WIDTH * Math.max(asset.width, asset.height);

  return (
    <>
      <svg
        viewBox={`0 0 ${asset.width} ${asset.height}`}
        style={{
          position: "absolute",
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          overflow: "visible",
          opacity: wholeOpacity,
          transform: `scale(${scale})`,
        }}
      >
        {asset.shapes.map((shape, i) => {
          const fillRule = shape.fillRule === "evenodd" ? "evenodd" : "nonzero";
          if (shape.kind === "fill") {
            return fillOpacity > 0 ? (
              <path
                key={i}
                d={shape.d}
                fill={paintOf(shape, props)}
                fillRule={fillRule}
                opacity={shape.opacity * fillOpacity}
              />
            ) : null;
          }
          const parts = byShape.get(i) ?? [];
          if (!parts.some((part) => part.p > 0)) return null;

          if (shape.kind === "line") {
            return (
              <g key={i} opacity={shape.opacity}>
                {parts.map((part, k) =>
                  part.p > 0 ? (
                    <path
                      key={k}
                      d={part.d}
                      fill="none"
                      stroke={paintOf(shape, props)}
                      strokeWidth={shape.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={1 - part.p}
                    />
                  ) : null,
                )}
              </g>
            );
          }

          // Ink: uncovered along the pen's path; big solid areas fill in as
          // the shape's last stroke finishes.
          const last = parts[parts.length - 1].p;
          const solid = interpolate(last, [0.7, 1], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const maskId = `${id}-ink-${i}`;
          return (
            <g key={i}>
              <mask id={maskId} maskUnits="userSpaceOnUse">
                {parts.map((part, k) =>
                  part.p > 0 ? (
                    <path
                      key={k}
                      d={part.d}
                      fill="none"
                      stroke="white"
                      strokeWidth={maskWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={1 - part.p}
                    />
                  ) : null,
                )}
                {solid > 0 ? (
                  <rect
                    x={0}
                    y={0}
                    width={asset.width}
                    height={asset.height}
                    fill="white"
                    opacity={solid}
                  />
                ) : null}
              </mask>
              <path
                d={shape.d}
                fill={paintOf(shape, props)}
                fillRule={fillRule}
                opacity={shape.opacity}
                mask={`url(#${maskId})`}
              />
            </g>
          );
        })}
      </svg>
      {label ? <Text {...label} /> : null}
    </>
  );
};
