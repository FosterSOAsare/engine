import type { IconDrawing } from "../types";

// A speech bubble with two lines of text.
export const chat: IconDrawing = ({ g, o, X, Y, P }) => [
  g.path(
    P("M .1 .14 L .9 .14 L .9 .66 L .42 .66 L .24 .86 L .26 .66 L .1 .66 Z"),
    o,
  ),
  g.line(X(0.24), Y(0.32), X(0.76), Y(0.32), o),
  g.line(X(0.24), Y(0.48), X(0.62), Y(0.48), o),
];
