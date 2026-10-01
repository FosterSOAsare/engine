import type { IconDrawing } from "../types";

// A tick: done, correct.
export const check: IconDrawing = ({ g, o, X, Y }) => [
  g.linearPath(
    [
      [X(0.14), Y(0.52)],
      [X(0.4), Y(0.78)],
      [X(0.88), Y(0.22)],
    ],
    o,
  ),
];
