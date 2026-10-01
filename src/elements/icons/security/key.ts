import type { IconDrawing } from "../types";

export const key: IconDrawing = ({ g, o, X, Y, S }) => [
  g.circle(X(0.28), Y(0.5), S(0.32), o),
  g.line(X(0.44), Y(0.5), X(0.92), Y(0.5), o),
  g.line(X(0.78), Y(0.5), X(0.78), Y(0.64), o),
  g.line(X(0.9), Y(0.5), X(0.9), Y(0.62), o),
];
