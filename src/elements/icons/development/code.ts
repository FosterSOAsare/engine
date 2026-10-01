import type { IconDrawing } from "../types";

// Angle brackets around a slash.
export const code: IconDrawing = ({ g, o, X, Y }) => [
  g.linearPath(
    [
      [X(0.3), Y(0.28)],
      [X(0.1), Y(0.5)],
      [X(0.3), Y(0.72)],
    ],
    o,
  ),
  g.linearPath(
    [
      [X(0.7), Y(0.28)],
      [X(0.9), Y(0.5)],
      [X(0.7), Y(0.72)],
    ],
    o,
  ),
  g.line(X(0.58), Y(0.2), X(0.42), Y(0.8), o),
];
