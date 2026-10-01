import type { IconDrawing } from "../types";

export const camera: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.06), Y(0.3), S(0.88), S(0.56), o),
  g.linearPath(
    [
      [X(0.32), Y(0.3)],
      [X(0.38), Y(0.16)],
      [X(0.62), Y(0.16)],
      [X(0.68), Y(0.3)],
    ],
    o,
  ),
  g.circle(X(0.5), Y(0.58), S(0.34), o),
];
