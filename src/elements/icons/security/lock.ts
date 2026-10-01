import type { IconDrawing } from "../types";

// A padlock: shackle, body, keyhole.
export const lock: IconDrawing = ({ g, o, X, Y, S }) => [
  g.arc(X(0.5), Y(0.42), S(0.4), S(0.5), Math.PI, 2 * Math.PI, false, o),
  g.rectangle(X(0.22), Y(0.42), S(0.56), S(0.46), o),
  g.circle(X(0.5), Y(0.6), S(0.09), o),
  g.line(X(0.5), Y(0.64), X(0.5), Y(0.76), o),
];
