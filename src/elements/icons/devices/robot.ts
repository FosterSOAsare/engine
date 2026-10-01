import type { IconDrawing } from "../types";

// Head, eyes, mouth and antenna.
export const robot: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.18), Y(0.28), S(0.64), S(0.56), o),
  g.circle(X(0.38), Y(0.5), S(0.12), o),
  g.circle(X(0.62), Y(0.5), S(0.12), o),
  g.line(X(0.38), Y(0.7), X(0.62), Y(0.7), o),
  g.line(X(0.5), Y(0.28), X(0.5), Y(0.12), o),
  g.circle(X(0.5), Y(0.09), S(0.07), o),
];
