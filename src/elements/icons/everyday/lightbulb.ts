import type { IconDrawing } from "../types";

// An idea.
export const lightbulb: IconDrawing = ({ g, o, X, Y, P }) => [
  g.path(
    P(
      "M .36 .66 C .36 .54 .2 .48 .2 .32 C .2 .14 .34 .06 .5 .06 C .66 .06 .8 .14 .8 .32 C .8 .48 .64 .54 .64 .66 Z",
    ),
    o,
  ),
  g.line(X(0.38), Y(0.76), X(0.62), Y(0.76), o),
  g.line(X(0.4), Y(0.86), X(0.6), Y(0.86), o),
];
