import type { IconDrawing } from "./types";

// Two stacked rack units, each with a slot.
export const server: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.15), Y(0.08), S(0.7), S(0.36), o),
  g.rectangle(X(0.15), Y(0.56), S(0.7), S(0.36), o),
  g.line(X(0.27), Y(0.26), X(0.42), Y(0.26), o),
  g.line(X(0.27), Y(0.74), X(0.42), Y(0.74), o),
];
