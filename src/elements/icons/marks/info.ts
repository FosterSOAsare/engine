import type { IconDrawing } from "../types";

// A circled i.
export const info: IconDrawing = ({ g, o, X, Y, S }) => [
  g.circle(X(0.5), Y(0.5), S(0.84), o),
  g.circle(X(0.5), Y(0.3), S(0.07), o),
  g.line(X(0.5), Y(0.44), X(0.5), Y(0.74), o),
];
