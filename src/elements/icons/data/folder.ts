import type { IconDrawing } from "../types";

export const folder: IconDrawing = ({ g, o, X, Y }) => [
  g.polygon(
    [
      [X(0.06), Y(0.2)],
      [X(0.38), Y(0.2)],
      [X(0.46), Y(0.3)],
      [X(0.94), Y(0.3)],
      [X(0.94), Y(0.82)],
      [X(0.06), Y(0.82)],
    ],
    o,
  ),
];
