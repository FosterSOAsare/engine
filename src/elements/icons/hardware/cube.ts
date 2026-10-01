import type { IconDrawing } from "../types";

// A box seen from a corner: containers, packages.
export const cube: IconDrawing = ({ g, o, X, Y }) => [
  g.polygon(
    [
      [X(0.5), Y(0.08)],
      [X(0.9), Y(0.28)],
      [X(0.9), Y(0.72)],
      [X(0.5), Y(0.92)],
      [X(0.1), Y(0.72)],
      [X(0.1), Y(0.28)],
    ],
    o,
  ),
  g.linearPath(
    [
      [X(0.1), Y(0.28)],
      [X(0.5), Y(0.48)],
      [X(0.9), Y(0.28)],
    ],
    o,
  ),
  g.line(X(0.5), Y(0.48), X(0.5), Y(0.92), o),
];
