import type { IconDrawing } from "../types";

// A map pin.
export const pin: IconDrawing = ({ g, o, X, Y, S, P }) => [
  g.path(
    P(
      "M .5 .94 C .3 .66 .18 .5 .18 .36 C .18 .16 .34 .06 .5 .06 C .66 .06 .82 .16 .82 .36 C .82 .5 .7 .66 .5 .94 Z",
    ),
    o,
  ),
  g.circle(X(0.5), Y(0.36), S(0.2), o),
];
