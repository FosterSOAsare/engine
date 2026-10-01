import type { IconDrawing } from "../types";

// Body, head, six legs and antennas.
export const bug: IconDrawing = ({ g, o, X, Y, S }) => [
  g.ellipse(X(0.5), Y(0.6), S(0.44), S(0.6), o),
  g.circle(X(0.5), Y(0.24), S(0.22), o),
  g.line(X(0.5), Y(0.32), X(0.5), Y(0.88), o),
  g.line(X(0.29), Y(0.46), X(0.1), Y(0.38), o),
  g.line(X(0.28), Y(0.6), X(0.08), Y(0.6), o),
  g.line(X(0.29), Y(0.76), X(0.1), Y(0.84), o),
  g.line(X(0.71), Y(0.46), X(0.9), Y(0.38), o),
  g.line(X(0.72), Y(0.6), X(0.92), Y(0.6), o),
  g.line(X(0.71), Y(0.76), X(0.9), Y(0.84), o),
  g.line(X(0.44), Y(0.14), X(0.36), Y(0.04), o),
  g.line(X(0.56), Y(0.14), X(0.64), Y(0.04), o),
];
