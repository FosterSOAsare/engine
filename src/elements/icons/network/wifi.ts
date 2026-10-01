import type { IconDrawing } from "../types";

// Three arcs over a dot.
export const wifi: IconDrawing = ({ g, o, X, Y, S }) => [
  g.arc(
    X(0.5),
    Y(0.84),
    S(0.96),
    S(0.96),
    1.25 * Math.PI,
    1.75 * Math.PI,
    false,
    o,
  ),
  g.arc(
    X(0.5),
    Y(0.84),
    S(0.64),
    S(0.64),
    1.25 * Math.PI,
    1.75 * Math.PI,
    false,
    o,
  ),
  g.arc(
    X(0.5),
    Y(0.84),
    S(0.32),
    S(0.32),
    1.25 * Math.PI,
    1.75 * Math.PI,
    false,
    o,
  ),
  g.circle(X(0.5), Y(0.82), S(0.08), o),
];
