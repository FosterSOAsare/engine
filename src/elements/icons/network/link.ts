import type { IconDrawing } from "../types";

// Two chain links.
export const link: IconDrawing = ({ g, o, X, Y, S }) => [
  g.ellipse(X(0.34), Y(0.5), S(0.46), S(0.26), o),
  g.ellipse(X(0.66), Y(0.5), S(0.46), S(0.26), o),
];
