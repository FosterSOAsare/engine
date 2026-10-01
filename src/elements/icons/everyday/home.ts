import type { IconDrawing } from "../types";

export const home: IconDrawing = ({ g, o, X, Y, S }) => [
  g.linearPath(
    [
      [X(0.08), Y(0.48)],
      [X(0.5), Y(0.1)],
      [X(0.92), Y(0.48)],
    ],
    o,
  ),
  g.rectangle(X(0.18), Y(0.42), S(0.64), S(0.5), o),
  g.rectangle(X(0.42), Y(0.64), S(0.16), S(0.28), o),
];
