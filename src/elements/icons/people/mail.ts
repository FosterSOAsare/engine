import type { IconDrawing } from "../types";

// An envelope.
export const mail: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.06), Y(0.2), S(0.88), S(0.6), o),
  g.linearPath(
    [
      [X(0.06), Y(0.2)],
      [X(0.5), Y(0.56)],
      [X(0.94), Y(0.2)],
    ],
    o,
  ),
];
