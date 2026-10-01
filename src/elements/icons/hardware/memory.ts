import type { IconDrawing } from "../types";

// A RAM stick with three chips.
export const memory: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.04), Y(0.3), S(0.92), S(0.34), o),
  g.rectangle(X(0.12), Y(0.38), S(0.18), S(0.18), o),
  g.rectangle(X(0.41), Y(0.38), S(0.18), S(0.18), o),
  g.rectangle(X(0.7), Y(0.38), S(0.18), S(0.18), o),
  g.line(X(0.1), Y(0.74), X(0.9), Y(0.74), o),
];
