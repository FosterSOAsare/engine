import type { IconDrawing } from "../types";

// A shield with a tick: protection, security.
export const shield: IconDrawing = ({ g, o, X, Y, P }) => [
  g.path(
    P(
      "M .5 .06 L .86 .2 L .86 .48 Q .86 .8 .5 .94 Q .14 .8 .14 .48 L .14 .2 Z",
    ),
    o,
  ),
  g.linearPath(
    [
      [X(0.34), Y(0.5)],
      [X(0.46), Y(0.62)],
      [X(0.68), Y(0.38)],
    ],
    o,
  ),
];
