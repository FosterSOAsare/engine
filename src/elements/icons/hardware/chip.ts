import type { IconDrawing } from "../types";

// A processor: body, core and pins on every side.
export const chip: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.22), Y(0.22), S(0.56), S(0.56), o),
  g.rectangle(X(0.36), Y(0.36), S(0.28), S(0.28), o),
  g.line(X(0.35), Y(0.08), X(0.35), Y(0.22), o),
  g.line(X(0.5), Y(0.08), X(0.5), Y(0.22), o),
  g.line(X(0.65), Y(0.08), X(0.65), Y(0.22), o),
  g.line(X(0.35), Y(0.78), X(0.35), Y(0.92), o),
  g.line(X(0.5), Y(0.78), X(0.5), Y(0.92), o),
  g.line(X(0.65), Y(0.78), X(0.65), Y(0.92), o),
  g.line(X(0.08), Y(0.35), X(0.22), Y(0.35), o),
  g.line(X(0.08), Y(0.5), X(0.22), Y(0.5), o),
  g.line(X(0.08), Y(0.65), X(0.22), Y(0.65), o),
  g.line(X(0.78), Y(0.35), X(0.92), Y(0.35), o),
  g.line(X(0.78), Y(0.5), X(0.92), Y(0.5), o),
  g.line(X(0.78), Y(0.65), X(0.92), Y(0.65), o),
];
