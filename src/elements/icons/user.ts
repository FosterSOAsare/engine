import type { IconDrawing } from "./types";

export const user: IconDrawing = ({ g, o, X, Y, S }) => [
  g.circle(X(0.5), Y(0.28), S(0.34), o), // head
  g.arc(X(0.5), Y(1), S(0.8), S(0.8), Math.PI, 2 * Math.PI, false, o), // shoulders
];
