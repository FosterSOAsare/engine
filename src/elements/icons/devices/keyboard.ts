import type { IconDrawing } from "../types";

// A case, two rows of keys and a space bar.
export const keyboard: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.04), Y(0.26), S(0.92), S(0.48), o),
  g.rectangle(X(0.12), Y(0.34), S(0.1), S(0.1), o),
  g.rectangle(X(0.285), Y(0.34), S(0.1), S(0.1), o),
  g.rectangle(X(0.45), Y(0.34), S(0.1), S(0.1), o),
  g.rectangle(X(0.615), Y(0.34), S(0.1), S(0.1), o),
  g.rectangle(X(0.78), Y(0.34), S(0.1), S(0.1), o),
  g.rectangle(X(0.12), Y(0.48), S(0.1), S(0.1), o),
  g.rectangle(X(0.285), Y(0.48), S(0.1), S(0.1), o),
  g.rectangle(X(0.45), Y(0.48), S(0.1), S(0.1), o),
  g.rectangle(X(0.615), Y(0.48), S(0.1), S(0.1), o),
  g.rectangle(X(0.78), Y(0.48), S(0.1), S(0.1), o),
  g.line(X(0.3), Y(0.66), X(0.7), Y(0.66), o),
];
