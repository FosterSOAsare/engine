// Finds the illustrations a video needs online and saves them as designs.
//   npm run images -- latency
//
// videos/<id>/images.json lists them, by the name the scene file uses:
//   { "phone": "phone", "globe": "globe", "pin": "fluent-emoji-flat:round-pushpin" }
// A value is a search ("phone") or an exact Iconify icon ("set:name").
// Each is searched on Iconify (api.iconify.design) in colourful sets whose
// licences allow use in videos, best first: outlined colour icons the hand
// can trace, then flat colour. The SVG is saved to
// public/assets/<id>/<name>.svg (scene files use "name": "<id>/<name>"),
// and its source and licence are written to public/assets/<id>/CREDITS.md.
// Existing files are kept; delete one to fetch it again.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const API = "https://api.iconify.design";

// Searched in this order. Licences: CC-BY-4.0 needs a credit (written to
// CREDITS.md, to copy into the video description); MIT and Apache-2.0 only
// need their notice kept.
const SETS = [
  "streamline-color", // outlined colour, CC-BY-4.0
  "streamline-flex-color", // outlined colour, CC-BY-4.0
  "fluent-emoji-flat", // flat colour objects, MIT
  "noto", // flat colour emoji, Apache-2.0
  "fluent-color", // flat colour UI, MIT
  "flat-color-icons", // flat colour, MIT
  "icon-park", // outlined two-colour, Apache-2.0
];

const id = process.argv[2];
if (!id) {
  console.error("Usage: npm run images -- <video id>");
  process.exit(2);
}
const listFile = new URL(`../videos/${id}/images.json`, import.meta.url);
if (!existsSync(listFile)) {
  console.error(`videos/${id}/images.json is missing: list the images there.`);
  process.exit(2);
}
const wanted = JSON.parse(readFileSync(listFile, "utf8"));
const outDir = new URL(`../public/assets/${id}/`, import.meta.url);
mkdirSync(outDir, { recursive: true });

const getJson = async (path) => {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
};

// "-flat" variants of the Streamline sets have no outlines; prefer the
// outlined ones.
const rank = (icon) => {
  const [prefix, name] = icon.split(":");
  return SETS.indexOf(prefix) * 2 + (name.endsWith("-flat") ? 1 : 0);
};

const find = async (query) => {
  if (query.includes(":")) return query;
  const result = await getJson(
    `/search?query=${encodeURIComponent(query)}&limit=64&prefixes=${SETS.join(",")}`,
  );
  const icons = result.icons.filter((icon) => SETS.includes(icon.split(":")[0]));
  icons.sort((a, b) => rank(a) - rank(b));
  return icons[0] ?? null;
};

const licences = new Map();
const licenceOf = async (prefix) => {
  if (!licences.has(prefix)) {
    const info = await getJson(`/collection?prefix=${prefix}&info=true`);
    licences.set(prefix, info.info ?? {});
  }
  return licences.get(prefix);
};

const credits = [];
let failed = 0;
for (const [name, query] of Object.entries(wanted)) {
  const file = new URL(`${name}.svg`, outDir);
  const icon = await find(query);
  if (!icon) {
    console.log(`  ${name}: nothing found for "${query}"`);
    failed++;
    continue;
  }
  const [prefix, iconName] = icon.split(":");
  const info = await licenceOf(prefix);
  if (!existsSync(file)) {
    const response = await fetch(`${API}/${prefix}/${iconName}.svg`);
    if (!response.ok) {
      console.log(`  ${name}: download failed (${response.status})`);
      failed++;
      continue;
    }
    writeFileSync(file, await response.text());
    console.log(`  ${name}: ${icon} (${info.license?.spdx ?? "?"})`);
  } else {
    console.log(`  ${name}: kept (${icon})`);
  }
  credits.push({ name, icon, info });
}

const lines = [
  `# Image credits: ${id}`,
  "",
  "Fetched from Iconify (https://iconify.design) by npm run images.",
  "",
  "| Design | Icon | Set | Author | Licence |",
  "|---|---|---|---|---|",
  ...credits.map(
    ({ name, icon, info }) =>
      `| ${id}/${name} | ${icon} | ${info.name ?? icon.split(":")[0]} | ${info.author?.name ?? ""} | ${info.license?.spdx ?? ""} |`,
  ),
  "",
];
const attribution = [
  ...new Set(
    credits
      .filter(({ info }) => /^CC-BY/.test(info.license?.spdx ?? ""))
      .map(
        ({ info }) =>
          `${info.name} by ${info.author?.name ?? "unknown"}, ${info.license.spdx} (${info.license.url ?? ""})`,
      ),
  ),
];
if (attribution.length > 0) {
  lines.push("For the video description:", "", ...attribution.map((a) => `- Icons: ${a}`), "");
}
writeFileSync(new URL("CREDITS.md", outDir), lines.join("\n"));

// Register the new designs.
const assets = spawnSync("node", ["scripts/assets.mjs"], { stdio: "inherit" });
if (failed > 0) console.log(`${failed} image(s) not found; change their search words.`);
process.exit(assets.status ?? 0);
