// Cover images (thumbnails) for posting: out/<id>.cover.jpg.
//   npm run cover -- api            the video in every format
//   npm run cover -- api-square     one format
//   npm run cover -- all            every video, every format
// The moment shown is the scene file's "cover" (a scene id or seconds),
// by default the end of the first scene: fully drawn, without the hand or
// captions.

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { expand, help, known, videos } from "./videos.mjs";

const asked = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
if (asked.length === 0) {
  console.error(`Usage: npm run cover -- <id...> | all\n${help}`);
  process.exit(2);
}
// A plain video id means every format; <id>-<format> just that one.
const ids = asked.flatMap((id) =>
  id === "all" || videos.some((video) => video.id === id)
    ? expand([id], true)
    : [id],
);
const unknown = ids.filter((id) => !known.includes(id));
if (unknown.length > 0) {
  console.error(`Unknown video: ${unknown.join(", ")}\n${help}`);
  process.exit(2);
}

const assets = spawnSync("node", ["scripts/assets.mjs"], { stdio: "inherit" });
if (assets.status !== 0) process.exit(assets.status ?? 1);

mkdirSync(new URL("../out/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../out/.cover-props.json", import.meta.url),
  JSON.stringify({ cover: true }),
);

for (const id of ids) {
  console.log(`Cover ${id} -> out/${id}.cover.jpg`);
  const { status } = spawnSync(
    "npx",
    [
      "remotion", "still", id, `out/${id}.cover.jpg`,
      "--props=out/.cover-props.json", "--frame=-1", "--image-format=jpeg", "--jpeg-quality=90",
      "--log=error",
    ],
    { stdio: "inherit", shell: process.platform === "win32" },
  );
  if (status !== 0) process.exit(status ?? 1);
}
