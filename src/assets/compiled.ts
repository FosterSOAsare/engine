// The shape of a compiled design: public/compiled-assets/<name>.json,
// written by scripts/assets.mjs. Coordinates are in the design's own
// units (0 to width, 0 to height), absolute, every number in an x,y pair.

export type CompiledStroke = {
  d: string;
  length: number;
  start: [number, number];
  end: [number, number];
};

export type CompiledShape = {
  // line: an outline the pen draws; ink: a dark filled shape revealed as
  // the pen traces it; fill: colour that fades in after the drawing.
  kind: "line" | "ink" | "fill";
  d: string;
  color: string;
  opacity: number;
  fillRule?: string;
  width?: number; // line thickness
  strokes?: CompiledStroke[]; // pen strokes, for line and ink
};

export type CompiledAsset = {
  width: number;
  height: number;
  shapes: CompiledShape[];
};

// Designs a video uses, by name, loaded before it plays (see Root.tsx).
export type CompiledAssets = Record<string, CompiledAsset>;
