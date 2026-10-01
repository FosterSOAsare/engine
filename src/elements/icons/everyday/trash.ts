import type { IconDrawing } from "../types";

// A bin: lid, handle, body.
export const trash: IconDrawing = ({ g, o, X, Y }) => [
  g.line(X(0.12), Y(0.22), X(0.88), Y(0.22), o),
  g.linearPath(
    [
      [X(0.38), Y(0.22)],
      [X(0.4), Y(0.1)],
      [X(0.6), Y(0.1)],
      [X(0.62), Y(0.22)],
    ],
    o,
  ),
  g.polygon(
    [
      [X(0.2), Y(0.22)],
      [X(0.8), Y(0.22)],
      [X(0.74), Y(0.92)],
      [X(0.26), Y(0.92)],
    ],
    o,
  ),
  g.line(X(0.4), Y(0.36), X(0.42), Y(0.8), o),
  g.line(X(0.6), Y(0.36), X(0.58), Y(0.8), o),
];
