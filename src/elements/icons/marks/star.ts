import type { IconDrawing } from "../types";

// A five-pointed star.
export const star: IconDrawing = ({ g, o, X, Y }) => [
  g.polygon(
    Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 === 0 ? 0.46 : 0.19;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      return [X(0.5 + r * Math.cos(a)), Y(0.52 + r * Math.sin(a))] as [
        number,
        number,
      ];
    }),
    o,
  ),
];
