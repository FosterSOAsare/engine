import type { IconDrawing } from "../types";

// A page with rings and six days.
export const calendar: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.1), Y(0.16), S(0.8), S(0.74), o),
  g.line(X(0.1), Y(0.34), X(0.9), Y(0.34), o),
  g.line(X(0.3), Y(0.08), X(0.3), Y(0.24), o),
  g.line(X(0.7), Y(0.08), X(0.7), Y(0.24), o),
  g.circle(X(0.3), Y(0.52), S(0.07), o),
  g.circle(X(0.5), Y(0.52), S(0.07), o),
  g.circle(X(0.7), Y(0.52), S(0.07), o),
  g.circle(X(0.3), Y(0.72), S(0.07), o),
  g.circle(X(0.5), Y(0.72), S(0.07), o),
  g.circle(X(0.7), Y(0.72), S(0.07), o),
];
