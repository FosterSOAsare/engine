import type { Drawable, Options } from "roughjs/bin/core";
import type { RoughGenerator } from "roughjs/bin/generator";

// What every icon drawing gets. An icon is drawn inside a square: X and Y
// turn icon units (0 to 1 across the square, left to right and top to
// bottom) into pixel positions, and S turns them into pixel lengths. P
// does the same for a whole SVG path written in icon units, for curves:
//   g.path(P("M .5 .9 C .2 .6 .1 .4 .3 .2"), o)
// (M, L, C, Q and Z only; every number pair is a point.) Pass `o` to every
// shape so the icon gets its seed, ink, stroke width and fill.
export type Pen = {
  g: RoughGenerator;
  o: Options;
  X: (u: number) => number;
  Y: (u: number) => number;
  S: (u: number) => number;
  P: (d: string) => string;
};

// Scales an SVG path in icon units: numbers alternate x, y.
export const scalePath = (
  d: string,
  X: (u: number) => number,
  Y: (u: number) => number,
) => {
  let index = 0;
  return d.replace(/-?\d*\.?\d+/g, (number) =>
    String((index++ % 2 === 0 ? X : Y)(Number(number))),
  );
};

// Returns the icon's shapes in drawing order: the hand draws them one
// after another, so put the outline first and details after.
export type IconDrawing = (pen: Pen) => Drawable[];
