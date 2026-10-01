// Where an arrow between two shapes starts and ends: on each shape's edge,
// along the line between their centres, a small gap away so it never
// touches. All values in pixels.

export type Point = { x: number; y: number };

export type Outline =
  | { kind: "rect"; cx: number; cy: number; halfW: number; halfH: number }
  | { kind: "ellipse"; cx: number; cy: number; halfW: number; halfH: number }
  | { kind: "diamond"; cx: number; cy: number; halfW: number; halfH: number }
  // Corners relative to the centre (cx, cy), in order around the shape.
  | { kind: "polygon"; cx: number; cy: number; corners: Point[] };

const centre = (shape: Outline): Point => ({ x: shape.cx, y: shape.cy });

// How far a ray from the centre in direction (ux, uy) goes before it
// crosses one of the polygon's sides.
const polygonReach = (corners: Point[], ux: number, uy: number) => {
  let reach = Infinity;
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % corners.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const denominator = ux * ey - uy * ex;
    if (Math.abs(denominator) < 1e-12) return; // parallel to this side
    const t = (a.x * ey - a.y * ex) / denominator; // along the ray
    const s = (a.x * uy - a.y * ux) / denominator; // along the side
    if (t > 0 && s >= 0 && s <= 1) reach = Math.min(reach, t);
  });
  return reach === Infinity ? 0 : reach;
};

// How far from the centre the shape's edge is, in direction (ux, uy).
const reachOf = (shape: Outline, ux: number, uy: number) => {
  if (shape.kind === "polygon") return polygonReach(shape.corners, ux, uy);
  const ax = Math.abs(ux) / shape.halfW;
  const ay = Math.abs(uy) / shape.halfH;
  switch (shape.kind) {
    case "rect":
      return 1 / Math.max(ax, ay);
    case "ellipse":
      return 1 / Math.hypot(ax, ay);
    case "diamond":
      return 1 / (ax + ay);
  }
};

// The point where a ray from the shape's centre towards `toward` leaves
// the shape, plus `gap`.
export const edgePoint = (shape: Outline, toward: Point, gap: number) => {
  const dx = toward.x - shape.cx;
  const dy = toward.y - shape.cy;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const reach = reachOf(shape, ux, uy);
  return {
    x: shape.cx + ux * (reach + gap),
    y: shape.cy + uy * (reach + gap),
  };
};

export const connect = (from: Outline, to: Outline, gap: number) => ({
  from: edgePoint(from, centre(to), gap),
  to: edgePoint(to, centre(from), gap),
});
