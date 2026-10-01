import type { IconDrawing } from "../types";

// Settings: a wheel with eight teeth.
export const gear: IconDrawing = ({ g, o, X, Y, S }) => [
  g.circle(X(0.5), Y(0.5), S(0.56), o),
  g.circle(X(0.5), Y(0.5), S(0.2), o),
  g.line(
    X(0.5 + 0.28 * Math.cos((0 * Math.PI) / 4)),
    Y(0.5 + 0.28 * Math.sin((0 * Math.PI) / 4)),
    X(0.5 + 0.44 * Math.cos((0 * Math.PI) / 4)),
    Y(0.5 + 0.44 * Math.sin((0 * Math.PI) / 4)),
    o,
  ),
  g.line(
    X(0.5 + 0.28 * Math.cos((1 * Math.PI) / 4)),
    Y(0.5 + 0.28 * Math.sin((1 * Math.PI) / 4)),
    X(0.5 + 0.44 * Math.cos((1 * Math.PI) / 4)),
    Y(0.5 + 0.44 * Math.sin((1 * Math.PI) / 4)),
    o,
  ),
  g.line(
    X(0.5 + 0.28 * Math.cos((2 * Math.PI) / 4)),
    Y(0.5 + 0.28 * Math.sin((2 * Math.PI) / 4)),
    X(0.5 + 0.44 * Math.cos((2 * Math.PI) / 4)),
    Y(0.5 + 0.44 * Math.sin((2 * Math.PI) / 4)),
    o,
  ),
  g.line(
    X(0.5 + 0.28 * Math.cos((3 * Math.PI) / 4)),
    Y(0.5 + 0.28 * Math.sin((3 * Math.PI) / 4)),
    X(0.5 + 0.44 * Math.cos((3 * Math.PI) / 4)),
    Y(0.5 + 0.44 * Math.sin((3 * Math.PI) / 4)),
    o,
  ),
  g.line(
    X(0.5 + 0.28 * Math.cos((4 * Math.PI) / 4)),
    Y(0.5 + 0.28 * Math.sin((4 * Math.PI) / 4)),
    X(0.5 + 0.44 * Math.cos((4 * Math.PI) / 4)),
    Y(0.5 + 0.44 * Math.sin((4 * Math.PI) / 4)),
    o,
  ),
  g.line(
    X(0.5 + 0.28 * Math.cos((5 * Math.PI) / 4)),
    Y(0.5 + 0.28 * Math.sin((5 * Math.PI) / 4)),
    X(0.5 + 0.44 * Math.cos((5 * Math.PI) / 4)),
    Y(0.5 + 0.44 * Math.sin((5 * Math.PI) / 4)),
    o,
  ),
  g.line(
    X(0.5 + 0.28 * Math.cos((6 * Math.PI) / 4)),
    Y(0.5 + 0.28 * Math.sin((6 * Math.PI) / 4)),
    X(0.5 + 0.44 * Math.cos((6 * Math.PI) / 4)),
    Y(0.5 + 0.44 * Math.sin((6 * Math.PI) / 4)),
    o,
  ),
  g.line(
    X(0.5 + 0.28 * Math.cos((7 * Math.PI) / 4)),
    Y(0.5 + 0.28 * Math.sin((7 * Math.PI) / 4)),
    X(0.5 + 0.44 * Math.cos((7 * Math.PI) / 4)),
    Y(0.5 + 0.44 * Math.sin((7 * Math.PI) / 4)),
    o,
  ),
];
