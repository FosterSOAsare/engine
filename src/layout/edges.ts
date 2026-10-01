// Where an arrow between two shapes starts and ends: on each shape's edge,
// along the line between their centres, a small gap away so it never
// touches. All values in pixels.

export type Point = { x: number; y: number };

export type Outline =
  | { kind: "rect"; cx: number; cy: number; halfW: number; halfH: number }
  | { kind: "circle"; cx: number; cy: number; r: number };

const centre = (shape: Outline): Point => ({ x: shape.cx, y: shape.cy });

// The point where a ray from the shape's centre towards `toward` leaves
// the shape, plus `gap`.
export const edgePoint = (shape: Outline, toward: Point, gap: number) => {
  const dx = toward.x - shape.cx;
  const dy = toward.y - shape.cy;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const reach =
    shape.kind === "circle"
      ? shape.r
      : Math.min(
          ux === 0 ? Infinity : shape.halfW / Math.abs(ux),
          uy === 0 ? Infinity : shape.halfH / Math.abs(uy),
        );
  return {
    x: shape.cx + ux * (reach + gap),
    y: shape.cy + uy * (reach + gap),
  };
};

export const connect = (from: Outline, to: Outline, gap: number) => ({
  from: edgePoint(from, centre(to), gap),
  to: edgePoint(to, centre(from), gap),
});
