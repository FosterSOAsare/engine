// Reads each scene's narration line aloud with Piper (offline text-to-speech)
// and writes one audio file per scene:
//   public/videos/<id>/<scene>.wav
//
//   npm run voice -- dns               one video
//   npm run voice -- dns os            several
//   npm run voice -- all               every video with "voiceover": true
//   npm run voice -- dns --force       regenerate even unchanged scenes
//
// A scene is only regenerated when its narration or the voice changed
// (recorded in public/videos/<id>/voice.json). The voice is the video's
// "voice" field, or DEFAULT_VOICE. Run `npm run voice:setup` once first.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const DEFAULT_VOICE = "en_US-bryce-medium";
const root = new URL("../", import.meta.url);
const python = new URL(".tools/piper/Scripts/python.exe", root);
const voices = new URL(".tools/voices/", root);

if (!existsSync(python)) {
  console.error("Piper is not installed. Run: npm run voice:setup");
  process.exit(2);
}

const known = [
  ...readFileSync(new URL("src/videos.ts", root), "utf8").matchAll(
    /id: "([^"]+)"/g,
  ),
].map((match) => match[1]);
const readScene = (id) =>
  JSON.parse(readFileSync(new URL(`videos/${id}/scene.json`, root), "utf8"));

const args = process.argv.slice(2);
const force = args.includes("--force");
const asked = args.filter((arg) => !arg.startsWith("-"));
if (asked.length === 0) {
  console.error(`Usage: npm run voice -- <id...> | all [--force]`);
  process.exit(2);
}
const ids = asked.includes("all")
  ? known.filter((id) => readScene(id).voiceover)
  : asked;
for (const id of ids) {
  if (!known.includes(id)) {
    console.error(`Unknown video: ${id}\nVideos: ${known.join(", ")}`);
    process.exit(2);
  }
}

for (const id of ids) {
  const video = readScene(id);
  const voice = video.voice ?? DEFAULT_VOICE;
  if (!existsSync(new URL(`${voice}.onnx`, voices))) {
    console.error(
      `Voice ${voice} is not downloaded. Run: npm run voice:setup -- ${voice}`,
    );
    process.exit(2);
  }
  const outDir = new URL(`public/videos/${id}/`, root);
  mkdirSync(outDir, { recursive: true });
  const manifestFile = new URL("voice.json", outDir);
  const manifest = existsSync(manifestFile)
    ? JSON.parse(readFileSync(manifestFile, "utf8"))
    : {};

  console.log(`\n${id} (voice ${voice})`);
  for (const scene of video.scenes) {
    const text = scene.narration.trim();
    const wav = new URL(`${scene.id}.wav`, outDir);
    const hash = createHash("sha1").update(`${voice}\n${text}`).digest("hex");
    if (!force && manifest[scene.id] === hash && existsSync(wav)) {
      console.log(`  ${scene.id}: unchanged`);
      continue;
    }
    if (!text) {
      console.log(`  ${scene.id}: no narration, skipped`);
      continue;
    }
    const result = spawnSync(
      fileURLToPath(python),
      [
        "-m",
        "piper",
        "--data-dir",
        fileURLToPath(voices),
        "-m",
        voice,
        "-f",
        fileURLToPath(wav),
        "--",
        text,
      ],
      { encoding: "utf8" },
    );
    if (result.status !== 0) {
      console.error(`  ${scene.id}: Piper failed\n${result.stderr}`);
      process.exit(1);
    }
    manifest[scene.id] = hash;
    console.log(`  ${scene.id}: written`);
  }
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
}
