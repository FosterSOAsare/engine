import type { IconDrawing } from "../types";

// Two open pages.
export const book: IconDrawing = ({ g, o, X, Y, P }) => [
  g.path(
    P(
      "M .5 .2 C .38 .12 .2 .12 .08 .18 L .08 .84 C .2 .78 .38 .78 .5 .86 C .62 .78 .8 .78 .92 .84 L .92 .18 C .8 .12 .62 .12 .5 .2 Z",
    ),
    o,
  ),
  g.line(X(0.5), Y(0.2), X(0.5), Y(0.86), o),
];
