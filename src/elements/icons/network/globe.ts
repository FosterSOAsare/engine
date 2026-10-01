import type { IconDrawing } from "../types";

// A sphere with its meridian and three latitudes.
export const globe: IconDrawing = ({ g, o, X, Y, S }) => [
  g.circle(X(0.5), Y(0.5), S(0.84), o),
  g.ellipse(X(0.5), Y(0.5), S(0.36), S(0.84), o),
  g.line(X(0.08), Y(0.5), X(0.92), Y(0.5), o),
  g.line(X(0.13), Y(0.3), X(0.87), Y(0.3), o),
  g.line(X(0.13), Y(0.7), X(0.87), Y(0.7), o),
];
