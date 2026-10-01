import type { IconDrawing } from "../types";

// A window with a tab bar and three buttons.
export const browser: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.06), Y(0.12), S(0.88), S(0.76), o),
  g.line(X(0.06), Y(0.3), X(0.94), Y(0.3), o),
  g.circle(X(0.15), Y(0.21), S(0.06), o),
  g.circle(X(0.25), Y(0.21), S(0.06), o),
  g.circle(X(0.35), Y(0.21), S(0.06), o),
];
