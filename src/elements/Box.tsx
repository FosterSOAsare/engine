import type { HandTrack } from "../animation/hand";
import { Shape, shapeTracks } from "./Shape";
import type { Colored, Filled, FrameSize, Timing } from "./shared";

// A box: the Shape element with kind "box". Kept as its own component for
// code that places boxes directly (the M1 Sketch scene).

export type BoxProps = Timing &
  Colored &
  Filled & {
    x: number; // centre, percent of the frame
    y: number;
    w: number; // percent of the frame's shorter side
    h: number;
    seed: number;
    label?: string; // written in once the outline is finished
  };

export const boxTracks = (props: BoxProps, frame: FrameSize): HandTrack[] =>
  shapeTracks({ ...props, kind: "box" }, frame);

export const Box: React.FC<BoxProps> = (props) => (
  <Shape {...props} kind="box" />
);
