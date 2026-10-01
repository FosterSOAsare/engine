import type { IconDrawing } from "../types";

// Three items waiting in line.
export const queue: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.06), Y(0.34), S(0.24), S(0.32), o),
  g.rectangle(X(0.38), Y(0.34), S(0.24), S(0.32), o),
  g.rectangle(X(0.7), Y(0.34), S(0.24), S(0.32), o),
];
