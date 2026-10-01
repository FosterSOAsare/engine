import type { IconDrawing } from "../types";

// A triangle with an exclamation mark.
export const warning: IconDrawing = ({ g, o, X, Y, S }) => [
  g.polygon(
    [
      [X(0.5), Y(0.1)],
      [X(0.92), Y(0.86)],
      [X(0.08), Y(0.86)],
    ],
    o,
  ),
  g.line(X(0.5), Y(0.36), X(0.5), Y(0.62), o),
  g.circle(X(0.5), Y(0.74), S(0.06), o),
];
