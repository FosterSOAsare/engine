import type { IconDrawing } from "../types";

// A cylinder: top ellipse, sides, then the curved lines across it.
export const database: IconDrawing = ({ g, o, X, Y, S }) => [
  g.ellipse(X(0.5), Y(0.16), S(0.7), S(0.2), o), // top
  g.line(X(0.15), Y(0.16), X(0.15), Y(0.84), o),
  g.line(X(0.85), Y(0.16), X(0.85), Y(0.84), o),
  g.arc(X(0.5), Y(0.5), S(0.7), S(0.2), 0, Math.PI, false, o), // middle
  g.arc(X(0.5), Y(0.84), S(0.7), S(0.2), 0, Math.PI, false, o), // bottom
];
