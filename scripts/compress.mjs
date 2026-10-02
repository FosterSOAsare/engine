// Shrinks rendered videos for posting: out/<id>.mp4 -> out/<id>.small.mp4.
//   npm run compress -- https          one video
//   npm run compress -- https dns      several
//   npm run compress -- all            every out/*.mp4
//   npm run compress -- https --quality=24   sharper, bigger (default 28;
//                                            lower is better, 18-32 sensible)
// Also run by npm run render -- <id> --compress.
//
// Uses the ffmpeg that ships with Remotion. Whiteboard frames are mostly
// flat background, which H.264 tuned for animation stores cheaply; the
// narration is speech, so mono AAC at 96 kb/s loses nothing you can hear.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const outDir = fileURLToPath(new URL("../out/", import.meta.url));
const DEFAULT_QUALITY = 28;

const args = process.argv.slice(2);
const qualityArg = args.find((arg) => arg.startsWith("--quality="));
const quality = qualityArg ? Number(qualityArg.split("=")[1]) : DEFAULT_QUALITY;
if (!Number.isInteger(quality) || quality < 0 || quality > 51) {
  console.error("--quality must be a whole number from 0 to 51");
  process.exit(2);
}

const rendered = existsSync(outDir)
  ? readdirSync(outDir)
      .filter((file) => file.endsWith(".mp4") && !file.endsWith(".small.mp4"))
      .map((file) => file.replace(/\.mp4$/, ""))
  : [];
const asked = args.filter((arg) => !arg.startsWith("-"));
if (asked.length === 0) {
  console.error(
    `Usage: npm run compress -- <id...> | all [--quality=${DEFAULT_QUALITY}]\n` +
      `Rendered: ${rendered.join(", ") || "none (npm run render first)"}`,
  );
  process.exit(2);
}
const ids = asked.includes("all") ? rendered : asked;
const missing = ids.filter((id) => !rendered.includes(id));
if (missing.length > 0) {
  console.error(
    `Not rendered yet: ${missing.join(", ")} (npm run render -- ${missing.join(" ")})`,
  );
  process.exit(2);
}

const mb = (file) => (statSync(file).size / 1024 / 1024).toFixed(1);

for (const id of ids) {
  const input = `${outDir}${id}.mp4`;
  const output = `${outDir}${id}.small.mp4`;
  console.log(`\nCompressing ${id} (quality ${quality})`);
  const { status } = spawnSync(
    "npx",
    [
      "remotion", "ffmpeg", "-hide_banner", "-loglevel", "error",
      "-y", "-i", input,
      "-c:v", "libx264", "-preset", "slow", "-tune", "animation",
      "-crf", String(quality), "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "96k", "-ac", "1",
      "-movflags", "+faststart", // starts playing before fully downloaded
      output,
    ],
    { stdio: "inherit", shell: process.platform === "win32" },
  );
  if (status !== 0) process.exit(status ?? 1);
  console.log(`${id}: ${mb(input)} MB -> ${mb(output)} MB  (out/${id}.small.mp4)`);
}
