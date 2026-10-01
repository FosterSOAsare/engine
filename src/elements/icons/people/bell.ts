import type { IconDrawing } from "../types";

// A notification bell.
export const bell: IconDrawing = ({ g, o, X, Y, S, P }) => [
  g.path(
    P(
      "M .5 .1 Q .22 .12 .22 .46 L .22 .66 L .12 .76 L .88 .76 L .78 .66 L .78 .46 Q .78 .12 .5 .1 Z",
    ),
    o,
  ),
  g.arc(X(0.5), Y(0.78), S(0.2), S(0.24), 0, Math.PI, false, o),
];
