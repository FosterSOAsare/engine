// Installs Piper (offline text-to-speech) and voices into .tools/, which
// is gitignored. Needs Python 3.9 or later on the PATH.
//
//   npm run voice:setup                     Piper and the default voice
//   npm run voice:setup -- en_GB-cori-high  extra voices by name
//
// Voices: https://huggingface.co/rhasspy/piper-voices. Check a voice's
// MODEL_CARD licence before publishing with it: several are licensed for
// non-commercial use only. The default (bryce) is public domain.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEFAULT_VOICE = "en_US-bryce-medium";
const root = new URL("../", import.meta.url);
const path = (relative) => fileURLToPath(new URL(relative, root));
const python = path(".tools/piper/Scripts/python.exe");

const run = (command, args) => {
  const { status } = spawnSync(command, args, { stdio: "inherit" });
  if (status !== 0) process.exit(status ?? 1);
};

if (!existsSync(python)) {
  console.log(
    "Creating .tools/piper (Python environment) and installing Piper",
  );
  run("python", ["-m", "venv", path(".tools/piper")]);
  run(python, ["-m", "pip", "install", "--quiet", "piper-tts"]);
}

const wanted = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
const voices = wanted.length > 0 ? wanted : [DEFAULT_VOICE];
mkdirSync(path(".tools/voices"), { recursive: true });
run(python, [
  "-m",
  "piper.download_voices",
  "--data-dir",
  path(".tools/voices"),
  ...voices,
]);
console.log(`Ready: ${voices.join(", ")}`);
