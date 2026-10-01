import type { IconDrawing } from "../types";

// A coin with a dollar sign.
export const money: IconDrawing = ({ g, o, X, Y, S, P }) => [
  g.circle(X(0.5), Y(0.5), S(0.86), o),
  g.path(
    P(
      "M .64 .32 C .6 .24 .36 .22 .36 .38 C .36 .52 .64 .48 .64 .62 C .64 .78 .4 .76 .34 .68",
    ),
    o,
  ),
  g.line(X(0.5), Y(0.18), X(0.5), Y(0.82), o),
];
