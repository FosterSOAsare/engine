import type { IconDrawing } from "../types";

// A window with a prompt.
export const terminal: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.06), Y(0.14), S(0.88), S(0.72), o),
  g.linearPath(
    [
      [X(0.2), Y(0.38)],
      [X(0.34), Y(0.5)],
      [X(0.2), Y(0.62)],
    ],
    o,
  ),
  g.line(X(0.42), Y(0.64), X(0.62), Y(0.64), o),
];
