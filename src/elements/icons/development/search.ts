import type { IconDrawing } from "../types";

// A magnifying glass.
export const search: IconDrawing = ({ g, o, X, Y, S }) => [
  g.circle(X(0.42), Y(0.42), S(0.56), o),
  g.line(X(0.62), Y(0.62), X(0.9), Y(0.9), o),
];
