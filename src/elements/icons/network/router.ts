import type { IconDrawing } from "../types";

// A box with two antennas and status lights.
export const router: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.08), Y(0.5), S(0.84), S(0.3), o),
  g.line(X(0.25), Y(0.5), X(0.18), Y(0.16), o),
  g.line(X(0.75), Y(0.5), X(0.82), Y(0.16), o),
  g.circle(X(0.24), Y(0.65), S(0.06), o),
  g.circle(X(0.38), Y(0.65), S(0.06), o),
  g.circle(X(0.52), Y(0.65), S(0.06), o),
];
