import type { IconDrawing } from "../types";

// Two people: a group, a team.
export const users: IconDrawing = ({ g, o, X, Y, S }) => [
  g.circle(X(0.66), Y(0.24), S(0.26), o),
  g.arc(X(0.66), Y(0.8), S(0.56), S(0.56), Math.PI, 2 * Math.PI, false, o),
  g.circle(X(0.38), Y(0.34), S(0.3), o),
  g.arc(X(0.38), Y(0.96), S(0.66), S(0.66), Math.PI, 2 * Math.PI, false, o),
];
