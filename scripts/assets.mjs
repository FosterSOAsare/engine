// Turns every SVG design in public/assets/ into something the engine can
// draw with the hand, and registers it by name.
//
//   npm run assets      (also runs before npm run dev, npm test and renders)
//
// For each public/assets/<name>.svg it writes public/compiled-assets/<name>.json
// (generated, not committed): the design's shapes with all group transforms
// applied, in drawing order, each sorted into
//   line  outlined shapes: the pen draws the outline itself
//   ink   dark filled shapes (brush strokes): revealed as the pen traces them
//   fill  everything else: fades in once the drawing is done
// and measures every pen stroke for the hand's timing. It also writes the
// list of names to src/assets/index.ts, so scene files are checked against
// the designs that exist.

import { getLength, getPointAtLength } from "@remotion/paths";
import { XMLParser } from "fast-xml-parser";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import svgpath from "svgpath";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceDir = join(root, "public/assets");
const outDir = join(root, "public/compiled-assets");
const registryFile = join(root, "src/assets/index.ts");

const DARK = 0.3; // fills darker than this (0 black, 1 white) count as ink
const MIN_STROKE = 0.5; // pen strokes shorter than this (viewBox units) are skipped

// ------------------------------------------------------------- reading SVG

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  preserveOrder: true,
});

const findSvgFiles = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return findSvgFiles(path);
    return entry.toLowerCase().endsWith(".svg") ? [path] : [];
  });

const NAMED = { black: "#000000", white: "#ffffff", none: "none" };

const parseStyle = (style = "") =>
  Object.fromEntries(
    style
      .split(";")
      .map((part) => part.split(":").map((s) => s.trim()))
      .filter(([key, value]) => key && value),
  );

// Paint and opacity, inherited from the parent unless set here.
const inherit = (parent, attrs) => {
  const style = parseStyle(attrs.style);
  const pick = (name) => style[name] ?? attrs[name];
  const opacity = Number(pick("opacity") ?? 1) * parent.opacity;
  return {
    fill: pick("fill") ?? parent.fill,
    stroke: pick("stroke") ?? parent.stroke,
    strokeWidth: Number(pick("stroke-width") ?? parent.strokeWidth),
    fillRule: pick("fill-rule") ?? parent.fillRule,
    fillOpacity: Number(pick("fill-opacity") ?? 1) * parent.fillOpacity,
    opacity,
    transform: [parent.transform, attrs.transform].filter(Boolean).join(" "),
  };
};

const num = (value, fallback = 0) =>
  value === undefined ? fallback : Number.parseFloat(value);

// Every drawable element as path data, in its own coordinates.
const toPathData = (tag, a) => {
  switch (tag) {
    case "path":
      return a.d ?? null;
    case "rect": {
      const x = num(a.x);
      const y = num(a.y);
      const w = num(a.width);
      const h = num(a.height);
      const rx = Math.min(num(a.rx, num(a.ry)), w / 2);
      const ry = Math.min(num(a.ry, rx), h / 2);
      if (rx <= 0 || ry <= 0) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return (
        `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}` +
        `V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}` +
        `H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}` +
        `V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`
      );
    }
    case "circle":
    case "ellipse": {
      const cx = num(a.cx);
      const cy = num(a.cy);
      const rx = tag === "circle" ? num(a.r) : num(a.rx);
      const ry = tag === "circle" ? num(a.r) : num(a.ry);
      return (
        `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}` +
        `A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`
      );
    }
    case "line":
      return `M${num(a.x1)} ${num(a.y1)}L${num(a.x2)} ${num(a.y2)}`;
    case "polyline":
    case "polygon": {
      const n = (a.points ?? "").trim().split(/[\s,]+/).map(Number);
      const pairs = [];
      for (let i = 0; i + 1 < n.length; i += 2) pairs.push(`${n[i]} ${n[i + 1]}`);
      if (pairs.length === 0) return null;
      return `M${pairs.join("L")}${tag === "polygon" ? "Z" : ""}`;
    }
    default:
      return null;
  }
};

// Brightness of a #rgb / #rrggbb colour, 0 (black) to 1 (white).
const brightness = (colour) => {
  let hex = (NAMED[colour] ?? colour ?? "#000000").replace("#", "");
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Absolute coordinates, every number part of an x,y pair (M L C Q Z only),
// so the engine can scale it with plain arithmetic.
const normalise = (d, transform, dx, dy) => {
  let path = svgpath(d);
  if (transform) path = path.transform(transform);
  return path
    .abs()
    .unarc()
    .unshort()
    .iterate((segment, _i, x, y) => {
      if (segment[0] === "H") return [["L", segment[1], y]];
      if (segment[0] === "V") return [["L", x, segment[1]]];
      return [segment];
    })
    .translate(dx, dy)
    .round(2)
    .toString();
};

const round = (n) => Math.round(n * 100) / 100;

// The pen strokes of a path: one per subpath, measured.
const strokesOf = (d) =>
  d
    .split(/(?=M)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const length = getLength(part);
      if (!Number.isFinite(length) || length < MIN_STROKE) return null;
      const a = getPointAtLength(part, 0);
      const b = getPointAtLength(part, length);
      return {
        d: part,
        length: round(length),
        start: [round(a.x), round(a.y)],
        end: [round(b.x), round(b.y)],
      };
    })
    .filter(Boolean);

const SKIPPED = new Set(["defs", "mask", "clipPath", "title", "desc", "use", "style"]);

const compile = (file) => {
  const tree = parser.parse(readFileSync(file, "utf8"));
  const svgNode = tree.find((node) => node.svg);
  const attrs = svgNode[":@"] ?? {};
  const [minX, minY, width, height] = attrs.viewBox
    ? attrs.viewBox.split(/[\s,]+/).map(Number)
    : [0, 0, num(attrs.width), num(attrs.height)];

  const shapes = [];
  const walk = (nodes, paint) => {
    for (const node of nodes) {
      const tag = Object.keys(node).find((key) => key !== ":@");
      if (!tag || tag.startsWith("#") || tag.startsWith("?") || SKIPPED.has(tag)) {
        continue;
      }
      const own = inherit(paint, node[":@"] ?? {});
      if (tag === "g" || tag === "svg") {
        walk(node[tag], own);
        continue;
      }
      const raw = toPathData(tag, node[":@"] ?? {});
      if (!raw) continue;
      const d = normalise(raw, own.transform, -minX, -minY);
      const opacity = round(own.opacity * own.fillOpacity);
      const filled = own.fill && own.fill !== "none";
      const stroked = own.stroke && own.stroke !== "none" && own.strokeWidth > 0;

      if (filled) {
        const dark = brightness(own.fill) < DARK;
        // A dark fill that also has an outline is drawn by its outline.
        if (dark && !stroked) {
          shapes.push({
            kind: "ink",
            d,
            color: NAMED[own.fill] ?? own.fill,
            fillRule: own.fillRule,
            opacity,
            strokes: strokesOf(d),
          });
        } else {
          shapes.push({ kind: "fill", d, color: NAMED[own.fill] ?? own.fill, fillRule: own.fillRule, opacity });
        }
      }
      if (stroked) {
        shapes.push({
          kind: "line",
          d,
          color: NAMED[own.stroke] ?? own.stroke,
          width: own.strokeWidth,
          opacity: round(own.opacity),
          strokes: strokesOf(d),
        });
      }
    }
  };
  walk(svgNode.svg, {
    fill: "#000000",
    stroke: "none",
    strokeWidth: 1,
    fillRule: "nonzero",
    fillOpacity: 1,
    opacity: 1,
    transform: "",
  });
  return { width, height, shapes };
};

// --------------------------------------------------------------------- run

const files = findSvgFiles(sourceDir).sort();
rmSync(outDir, { recursive: true, force: true });
const registry = {};
let strokeCount = 0;

for (const file of files) {
  const name = relative(sourceDir, file).replace(/\\/g, "/").replace(/\.svg$/i, "");
  const compiled = compile(file);
  const target = join(outDir, `${name}.json`);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, JSON.stringify(compiled));
  registry[name] = { width: round(compiled.width), height: round(compiled.height) };
  strokeCount += compiled.shapes.reduce((n, s) => n + (s.strokes?.length ?? 0), 0);
}

const entries = Object.entries(registry)
  .map(([name, size]) => `  ${JSON.stringify(name)}: { width: ${size.width}, height: ${size.height} },`)
  .join("\n");
const registryText = `// Every design in public/assets/, by name. Generated by scripts/assets.mjs
// (npm run assets); do not edit.
export const ASSETS = {
${entries}
} as const;

export type AssetName = keyof typeof ASSETS;

export const ASSET_NAMES = Object.keys(ASSETS) as [AssetName, ...AssetName[]];
`;
mkdirSync(join(registryFile, ".."), { recursive: true });
const previous = existsSync(registryFile) ? readFileSync(registryFile, "utf8") : "";
if (previous !== registryText) writeFileSync(registryFile, registryText);

console.log(`assets: ${files.length} designs, ${strokeCount} pen strokes`);
