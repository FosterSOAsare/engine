import type { IconDrawing } from "../types";

// A hard drive with its light.
export const disk: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.08), Y(0.28), S(0.84), S(0.44), o),
  g.line(X(0.2), Y(0.5), X(0.52), Y(0.5), o),
  g.circle(X(0.76), Y(0.5), S(0.08), o),
];
