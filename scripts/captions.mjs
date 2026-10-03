// Finds when each word of a video's narration is spoken, with whisper.cpp,
// and saves the words with their times to public/videos/<id>/captions.json.
// The engine matches them to the scene file's narration lines, so the
// captions are spelled like the script, whatever whisper heard.
//
//   npm run captions -- latency          one video
//   npm run captions -- latency dns      several
//   npm run captions -- all              every video with "voiceover": true
//   npm run captions -- latency --force  redo even unchanged scenes
//
// Run npm run captions:setup once, and npm run voice first.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { toCaptions, transcribe } from "@remotion/install-whisper-cpp";
import { applyType } from "../src/videoTypes.mjs";

const WHISPER_VERSION = "1.5.5";
const WHISPER_MODEL = "base.en";
const root = new URL("../", import.meta.url);
const path = (relative) => fileURLToPath(new URL(relative, root));
const whisperPath = path(".tools/whisper/");

if (!existsSync(path(`.tools/whisper/ggml-${WHISPER_MODEL}.bin`))) {
  console.error("whisper.cpp is not installed. Run: npm run captions:setup");
  process.exit(2);
}

const known = [
  ...readFileSync(path("src/videos.ts"), "utf8").matchAll(/id: "([^"]+)"/g),
].map((match) => match[1]);
// With its type's settings and closing scenes (src/videoTypes.mjs).
const readScene = (id) =>
  applyType(JSON.parse(readFileSync(path(`videos/${id}/scene.json`), "utf8")));

const args = process.argv.slice(2);
const force = args.includes("--force");
const asked = args.filter((arg) => !arg.startsWith("-"));
if (asked.length === 0) {
  console.error("Usage: npm run captions -- <id...> | all [--force]");
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

const temp = path(".tools/whisper/tmp/");
mkdirSync(temp, { recursive: true });

for (const id of ids) {
  const video = readScene(id);
  const file = path(`public/videos/${id}/captions.json`);
  const saved = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const result = {};
  console.log(`\n${id}`);

  for (const scene of video.scenes) {
    const wav = path(`public/videos/${id}/${scene.id}.wav`);
    if (!existsSync(wav)) {
      console.error(`  ${scene.id}: no narration audio; run npm run voice -- ${id}`);
      process.exit(1);
    }
    const hash = createHash("sha1").update(readFileSync(wav)).digest("hex");
    if (!force && saved[scene.id]?.hash === hash) {
      result[scene.id] = saved[scene.id];
      console.log(`  ${scene.id}: unchanged`);
      continue;
    }

    // whisper.cpp needs 16 kHz mono WAV; Remotion ships ffmpeg.
    const input = `${temp}${id}-${scene.id}.wav`;
    const ffmpeg = spawnSync(
      "npx",
      ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-ar", "16000", "-ac", "1", input],
      { stdio: "inherit", shell: process.platform === "win32", cwd: path(".") },
    );
    if (ffmpeg.status !== 0) process.exit(ffmpeg.status ?? 1);

    const output = await transcribe({
      inputPath: input,
      whisperPath,
      whisperCppVersion: WHISPER_VERSION,
      model: WHISPER_MODEL,
      tokenLevelTimestamps: true,
      splitOnWord: true,
      printOutput: false,
    });
    const { captions } = toCaptions({ whisperCppOutput: output });
    rmSync(input, { force: true });

    result[scene.id] = {
      hash,
      words: captions
        .map((caption) => ({
          text: caption.text.trim(),
          start: caption.startMs / 1000,
          end: caption.endMs / 1000,
        }))
        .filter((word) => word.text.length > 0),
    };
    console.log(
      `  ${scene.id}: ${result[scene.id].words.map((w) => w.text).join(" ")}`,
    );
  }
  writeFileSync(file, JSON.stringify(result, null, 2) + "\n");
}
