// Renders scene videos to out/<id>.mp4.
//   npm run render -- dns          one video
//   npm run render -- dns os       several
//   npm run render -- all          every video in src/videos.ts
//   npm run render -- dns --no-captions  without captions, whatever the
//                                        scene file says
//   npm run render -- dns --compress    also writes a small copy for
//                                       posting, out/dns.small.mp4
//   npm run render -- dns --scale=0.5   other options go on to Remotion
// The ids are the ones in src/videos.ts (also the Studio sidebar names).

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const known = [
  ...readFileSync(
    new URL("../src/videos.ts", import.meta.url),
    "utf8",
  ).matchAll(/id: "([^"]+)"/g),
].map((match) => match[1]);

const args = process.argv.slice(2);
const noCaptions = args.includes("--no-captions");
const compress = args.includes("--compress");
const options = args.filter(
  (arg) =>
    arg.startsWith("-") && arg !== "--no-captions" && arg !== "--compress",
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
    `Usage: npm run render -- <id...> | all\nVideos: ${known.join(", ")}`,
  );
  process.exit(2);
}

const ids = asked.includes("all") ? known : asked;
const unknown = ids.filter((id) => !known.includes(id));
if (unknown.length > 0) {
  console.error(
    `Unknown video: ${unknown.join(", ")}\nVideos: ${known.join(", ")}`,
  );
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
