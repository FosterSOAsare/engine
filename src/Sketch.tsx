import { useMemo } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Arrow, arrowTracks, type ArrowProps } from "./elements/Arrow";
import { Box, boxTracks, type BoxProps } from "./elements/Box";
import { Hand } from "./elements/Hand";
import type { Point } from "./elements/shared";

// M1 playground: Browser -> Server, built from the reusable elements.

type BoxSpec = Pick<BoxProps, "x" | "y" | "w" | "h" | "seed">;

// Times in seconds, like the scene file in M2. Elements must not overlap
// (each label takes 0.5 s after its outline): the hand can only draw one
// thing at a time.
const TIMING = {
  browser: { start: 0.3, draw: 1.2 },
  arrow: { start: 2.1, draw: 0.7 },
  server: { start: 3.0, draw: 1.2 },
};
const ARROW_SEED = 3;
const ARROW_GAP = 3; // percent of the shorter side, between arrow and box

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

// Arrow between the facing edges of two boxes (bottom/top when stacked,
// right/left when side by side), with a small gap so it never touches.
// Box sizes are in percent of the shorter side, positions in percent of each
// axis, so convert before adding them up.
const arrowBetween = (
  a: BoxSpec,
  b: BoxSpec,
  width: number,
  height: number,
): { from: Point; to: Point } => {
  const shorter = Math.min(width, height);
  const alongX = (units: number) => (units * shorter) / width;
  const alongY = (units: number) => (units * shorter) / height;
  const sideBySide = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
  return sideBySide
    ? {
        from: { x: a.x + alongX(a.w / 2 + ARROW_GAP), y: a.y },
        to: { x: b.x - alongX(b.w / 2 + ARROW_GAP), y: b.y },
      }
    : {
        from: { x: a.x, y: a.y + alongY(a.h / 2 + ARROW_GAP) },
        to: { x: b.x, y: b.y - alongY(b.h / 2 + ARROW_GAP) },
      };
};

const sceneFor = (width: number, height: number) => {
  const { browser, server } = layoutFor(width, height);
  const boxes: BoxProps[] = [
    { ...browser, ...TIMING.browser, label: "Browser" },
    { ...server, ...TIMING.server, label: "Server" },
  ];
  const arrow: ArrowProps = {
    ...arrowBetween(browser, server, width, height),
    ...TIMING.arrow,
    seed: ARROW_SEED,
  };
  return { boxes, arrow };
};

export const Sketch: React.FC = () => {
  const { width, height } = useVideoConfig();
  const { boxes, arrow } = sceneFor(width, height);

  const tracks = useMemo(() => {
    const frame = { width, height };
    const scene = sceneFor(width, height);
    return [
      ...scene.boxes.flatMap((box) => boxTracks(box, frame)),
      ...arrowTracks(scene.arrow, frame),
    ];
  }, [width, height]);

  return (
    <AbsoluteFill className="bg-[#faf8f3]">
      {boxes.map((box) => (
        <Box key={box.label} {...box} />
      ))}
      <Arrow {...arrow} />
      <Hand tracks={tracks} />
    </AbsoluteFill>
  );
};
