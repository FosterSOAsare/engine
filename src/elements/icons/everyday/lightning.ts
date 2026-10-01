import type { IconDrawing } from "../types";

// Power, speed.
export const lightning: IconDrawing = ({ g, o, X, Y }) => [
  g.polygon(
    [
      [X(0.58), Y(0.04)],
      [X(0.2), Y(0.56)],
      [X(0.46), Y(0.56)],
      [X(0.38), Y(0.96)],
      [X(0.8), Y(0.42)],
      [X(0.54), Y(0.42)],
      [X(0.66), Y(0.04)],
    ],
    o,
  ),
];
