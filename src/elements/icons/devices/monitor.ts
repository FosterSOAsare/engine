import type { IconDrawing } from "../types";

// A desktop screen on a stand.
export const monitor: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.08), Y(0.12), S(0.84), S(0.56), o),
  g.line(X(0.5), Y(0.68), X(0.5), Y(0.84), o),
  g.line(X(0.3), Y(0.86), X(0.7), Y(0.86), o),
];
