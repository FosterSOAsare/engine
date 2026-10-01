import type { IconDrawing } from "../types";

// Three connected nodes.
export const network: IconDrawing = ({ g, o, X, Y, S }) => [
  g.circle(X(0.5), Y(0.18), S(0.22), o),
  g.circle(X(0.18), Y(0.8), S(0.22), o),
  g.circle(X(0.82), Y(0.8), S(0.22), o),
  g.line(X(0.44), Y(0.28), X(0.24), Y(0.7), o),
  g.line(X(0.56), Y(0.28), X(0.76), Y(0.7), o),
  g.line(X(0.3), Y(0.8), X(0.7), Y(0.8), o),
];
