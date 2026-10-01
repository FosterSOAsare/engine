import type { IconDrawing } from "../types";

// Axes and three rising bars.
export const chart: IconDrawing = ({ g, o, X, Y, S }) => [
  g.linearPath(
    [
      [X(0.1), Y(0.08)],
      [X(0.1), Y(0.9)],
      [X(0.92), Y(0.9)],
    ],
    o,
  ),
  g.rectangle(X(0.2), Y(0.56), S(0.14), S(0.34), o),
  g.rectangle(X(0.42), Y(0.36), S(0.14), S(0.54), o),
  g.rectangle(X(0.64), Y(0.18), S(0.14), S(0.72), o),
];
