import type { IconDrawing } from "../types";

// A circled question mark.
export const question: IconDrawing = ({ g, o, X, Y, S, P }) => [
  g.circle(X(0.5), Y(0.5), S(0.84), o),
  g.path(P("M .36 .38 C .36 .22 .64 .22 .64 .38 C .64 .5 .5 .5 .5 .62"), o),
  g.circle(X(0.5), Y(0.74), S(0.06), o),
];
