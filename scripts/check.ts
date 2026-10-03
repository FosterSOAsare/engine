// Checks a video's layout and pace:
//   - overlaps: texts or pictures that run into each other
//   - quiet stretches: the voice keeps talking but nothing new appears for
//     more than a few seconds (needs npm run voice and npm run captions)
//   npm run check -- internet-myths

import { existsSync, readFileSync } from "node:fs";
import { wavDuration } from "../src/audio/wav";
import { AREA } from "../src/layout/canvas";
import { FORMATS } from "../src/layout/formats";
import { overlaps } from "../src/layout/overlaps";
import { planVideo } from "../src/layout/plan";
import { QUIET_LIMIT, quietStretches } from "../src/schema/gaps";
import { styleOf } from "../src/schema/scene";
import type { HeardWords } from "../src/schema/timing";
import { validateVideo } from "../src/schema/validate";
import { VIDEOS } from "../src/videos";

const id = process.argv[2];
const entry = VIDEOS.find((v) => v.id === id);
if (!entry) {
  console.error(
    `Usage: npm run check -- <id>\nVideos: ${VIDEOS.map((v) => v.id).join(", ")}`,
  );
  process.exit(2);
}
const scene = entry.scene as { scenes: { id: string }[]; style?: string };
const dir = `public/videos/${id}`;
const audio = scene.scenes.map((s) => {
  const file = `${dir}/${s.id}.wav`;
  return existsSync(file)
    ? wavDuration(new Uint8Array(readFileSync(file)).buffer)
    : null;
});
const captions = `${dir}/captions.json`;
const heard = existsSync(captions)
  ? (JSON.parse(readFileSync(captions, "utf8")) as HeardWords)
  : undefined;
const result = validateVideo(entry.scene, audio, heard);
if (!result.video) {
  console.error(result.errors.join("\n"));
  process.exit(1);
}
const video = result.video;

// Overlaps, on the frame the scenes are written in.
const frame = video.format === "landscape" ? AREA : FORMATS.portrait;
const found = overlaps(planVideo(video, frame), frame);
if (found.length === 0) {
  console.log(`${id}: nothing overlaps`);
} else {
  console.log(`${id}: ${found.length} overlap(s)\n`);
  for (const o of found) {
    console.log(
      `  ${o.scene.padEnd(12)} ${o.a}  <->  ${o.b}  (${Math.round(o.overlap * 100)}%)`,
    );
  }
}

// Quiet stretches, once the narration has word timings.
console.log("");
if (!heard || !result.ok) {
  console.log(
    `quiet stretches: not checked (run npm run voice -- ${id} and npm run captions -- ${id})`,
  );
} else {
  const quiet = quietStretches(video.scenes, styleOf(video));
  if (quiet.length === 0) {
    console.log(`${id}: no quiet stretches over ${QUIET_LIMIT} s`);
  } else {
    console.log(
      `${id}: ${quiet.length} quiet stretch(es) over ${QUIET_LIMIT} s\n`,
    );
    for (const q of quiet) {
      console.log(
        `  ${q.scene.padEnd(12)} ${q.from.toFixed(1)}-${q.to.toFixed(1)} s (${(q.to - q.from).toFixed(1)} s): "${q.said}"`,
      );
    }
  }
}
