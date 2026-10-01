import type { IconDrawing } from "./types";

// Three bumps along the top and a flat base, as one stroke.
export const cloud: IconDrawing = ({ g, o, X, Y, S }) => [
  g.path(
    `M ${X(0.16)} ${Y(0.72)}` +
      ` A ${S(0.15)} ${S(0.15)} 0 0 1 ${X(0.26)} ${Y(0.44)}` +
      ` A ${S(0.22)} ${S(0.22)} 0 0 1 ${X(0.68)} ${Y(0.38)}` +
      ` A ${S(0.18)} ${S(0.18)} 0 0 1 ${X(0.84)} ${Y(0.72)} Z`,
    o,
  ),
];
