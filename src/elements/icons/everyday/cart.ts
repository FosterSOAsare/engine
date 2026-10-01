import type { IconDrawing } from "../types";

// A shopping cart.
export const cart: IconDrawing = ({ g, o, X, Y, S }) => [
  g.linearPath(
    [
      [X(0.06), Y(0.16)],
      [X(0.2), Y(0.16)],
      [X(0.3), Y(0.64)],
      [X(0.82), Y(0.64)],
      [X(0.9), Y(0.3)],
      [X(0.24), Y(0.3)],
    ],
    o,
  ),
  g.circle(X(0.36), Y(0.8), S(0.12), o),
  g.circle(X(0.74), Y(0.8), S(0.12), o),
];
