import type { IconDrawing } from "../types";

// A page with a folded corner and lines of text.
export const file: IconDrawing = ({ g, o, X, Y }) => [
  g.polygon(
    [
      [X(0.22), Y(0.06)],
      [X(0.62), Y(0.06)],
      [X(0.8), Y(0.24)],
      [X(0.8), Y(0.94)],
      [X(0.22), Y(0.94)],
    ],
    o,
  ),
  g.linearPath(
    [
      [X(0.62), Y(0.06)],
      [X(0.62), Y(0.24)],
      [X(0.8), Y(0.24)],
    ],
    o,
  ),
  g.line(X(0.32), Y(0.42), X(0.7), Y(0.42), o),
  g.line(X(0.32), Y(0.56), X(0.7), Y(0.56), o),
  g.line(X(0.32), Y(0.7), X(0.56), Y(0.7), o),
];
