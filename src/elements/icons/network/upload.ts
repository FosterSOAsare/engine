import type { IconDrawing } from "../types";

// An arrow up out of a tray.
export const upload: IconDrawing = ({ g, o, X, Y }) => [
  g.line(X(0.5), Y(0.64), X(0.5), Y(0.1), o),
  g.linearPath(
    [
      [X(0.3), Y(0.3)],
      [X(0.5), Y(0.1)],
      [X(0.7), Y(0.3)],
    ],
    o,
  ),
  g.linearPath(
    [
      [X(0.12), Y(0.66)],
      [X(0.12), Y(0.86)],
      [X(0.88), Y(0.86)],
      [X(0.88), Y(0.66)],
    ],
    o,
  ),
];
