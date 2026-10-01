import type { IconDrawing } from "../types";

export const tablet: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.2), Y(0.06), S(0.6), S(0.88), o),
  g.circle(X(0.5), Y(0.86), S(0.06), o),
];
