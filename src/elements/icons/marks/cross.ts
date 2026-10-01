import type { IconDrawing } from "../types";

// Wrong, not allowed.
export const cross: IconDrawing = ({ g, o, X, Y }) => [
  g.line(X(0.18), Y(0.18), X(0.82), Y(0.82), o),
  g.line(X(0.82), Y(0.18), X(0.18), Y(0.82), o),
];
