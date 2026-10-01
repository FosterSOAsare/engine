import type { IconDrawing } from "../types";

// Two of three bars charged.
export const battery: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.06), Y(0.3), S(0.78), S(0.4), o),
  g.rectangle(X(0.84), Y(0.42), S(0.08), S(0.16), o),
  g.rectangle(X(0.14), Y(0.38), S(0.16), S(0.24), o),
  g.rectangle(X(0.34), Y(0.38), S(0.16), S(0.24), o),
];
