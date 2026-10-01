import type { IconDrawing } from "../types";

export const clock: IconDrawing = ({ g, o, X, Y, S }) => [
  g.circle(X(0.5), Y(0.5), S(0.84), o),
  g.line(X(0.5), Y(0.5), X(0.5), Y(0.22), o),
  g.line(X(0.5), Y(0.5), X(0.7), Y(0.6), o),
];
