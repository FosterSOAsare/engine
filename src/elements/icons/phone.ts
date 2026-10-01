import type { IconDrawing } from "./types";

export const phone: IconDrawing = ({ g, o, X, Y, S }) => [
  g.rectangle(X(0.28), Y(0.04), S(0.44), S(0.92), o),
  g.line(X(0.43), Y(0.84), X(0.57), Y(0.84), o), // home button
];
