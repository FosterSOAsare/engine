import type { IconDrawing } from "../types";

// Screen above a wider base.
export const laptop: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.18), Y(0.18), S(0.64), S(0.46), o),
  g.polygon(
    [
      [X(0.1), Y(0.68)],
      [X(0.9), Y(0.68)],
      [X(0.98), Y(0.82)],
      [X(0.02), Y(0.82)],
    ],
    o,
  ),
];
