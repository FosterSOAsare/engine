// Renders scene videos to out/<id>.mp4.
//   npm run render -- dns          one video
//   npm run render -- dns os       several
//   npm run render -- all          every video in src/videos.ts
//   npm run render -- dns-square   in another format (portrait, feed,
//                                  square, landscape): out/dns-square.mp4
//   npm run render -- dns --all-formats  every format, one file each
//   npm run render -- dns --no-captions  without captions, whatever the
//                                        scene file says
//   npm run render -- dns --compress    also writes a small copy for
//                                       posting, out/dns.small.mp4
//   npm run render -- dns --scale=0.5   other options go on to Remotion
// The ids are the ones in src/videos.ts (also the Studio sidebar names).
// Each video renders as plain <id> in the format its scene file is written
// for, and as <id>-<format> in the others (see src/Root.tsx).

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

// Every video, with the format its scene file is written for.
const videosFile = read("../src/videos.ts");
const imports = Object.fromEntries(
  [...videosFile.matchAll(/import (\w+) from "\.\.\/(videos\/[^"]+)"/g)].map(
    ([, name, path]) => [name, path],
  ),
);
const videos = [...videosFile.matchAll(/id: "([^"]+)", scene: (\w+)/g)].map(
  ([, id, name]) => ({
    id,
    written: JSON.parse(read(`../${imports[name]}`)).format ?? "portrait",
  }),
);
const formats = [
  ...read("../src/layout/formats.ts").matchAll(/^ {2}(\w+): \{\r?\n {4}width/gm),
].map(([, name]) => name);

const variants = ({ id, written }) =>
  formats.filter((format) => format !== written).map((f) => `${id}-${f}`);
const known = videos.flatMap((video) => [video.id, ...variants(video)]);
const help =
  `Videos: ${videos.map((video) => video.id).join(", ")}\n` +
  `Other formats: <id>-<format>, formats ${formats.join(", ")}`;

const args = process.argv.slice(2);
const noCaptions = args.includes("--no-captions");
const compress = args.includes("--compress");
const allFormats = args.includes("--all-formats");
const options = args.filter(
  (arg) =>
    arg.startsWith("-") &&
    !["--no-captions", "--compress", "--all-formats"].includes(arg),
);
if (noCaptions) {
  // Props go to Remotion as a file: no quoting trouble on any shell.
  mkdirSync(new URL("../out/", import.meta.url), { recursive: true });
  const file = new URL("../out/.render-props.json", import.meta.url);
  writeFileSync(file, JSON.stringify({ captions: false }));
  options.push("--props=out/.render-props.json");
}
const asked = args.filter((arg) => !arg.startsWith("-"));
if (asked.length === 0) {
  console.error(
    `Usage: npm run render -- <id...> | all [--all-formats]\n${help}`,
  );
  process.exit(2);
}

let ids = asked.includes("all") ? videos.map((video) => video.id) : asked;
if (allFormats) {
  ids = ids.flatMap((id) => {
    const video = videos.find((v) => v.id === id);
    return video ? [id, ...variants(video)] : [id];
  });
}
const unknown = ids.filter((id) => !known.includes(id));
if (unknown.length > 0) {
  console.error(`Unknown video: ${unknown.join(", ")}\n${help}`);
  process.exit(2);
}

// Designs must be compiled before rendering (public/compiled-assets).
const assets = spawnSync("node", ["scripts/assets.mjs"], { stdio: "inherit" });
if (assets.status !== 0) process.exit(assets.status ?? 1);

for (const id of ids) {
  console.log(`\nRendering ${id} -> out/${id}.mp4`);
  const { status } = spawnSync(
    "npx",
    ["remotion", "render", id, `out/${id}.mp4`, ...options],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
    },
  );
  if (status !== 0) process.exit(status ?? 1);
}

if (compress) {
  const { status } = spawnSync("node", ["scripts/compress.mjs", ...ids], {
    stdio: "inherit",
  });
  if (status !== 0) process.exit(status ?? 1);
}
