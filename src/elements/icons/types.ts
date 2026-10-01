import type { Drawable, Options } from "roughjs/bin/core";
import type { RoughGenerator } from "roughjs/bin/generator";

// What every icon drawing gets. An icon is drawn inside a square: X and Y
// turn icon units (0 to 1 across the square, left to right and top to
// bottom) into pixel positions, and S turns them into pixel lengths. Pass
// `o` to every shape so the icon gets its seed, ink and stroke width.
export type Pen = {
  g: RoughGenerator;
  o: Options;
  X: (u: number) => number;
  Y: (u: number) => number;
  S: (u: number) => number;
};

// Returns the icon's shapes in drawing order: the hand draws them one
// after another, so put the outline first and details after.
export type IconDrawing = (pen: Pen) => Drawable[];
