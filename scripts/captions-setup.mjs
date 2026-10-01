// Installs whisper.cpp and a speech model into .tools/whisper (gitignored),
// for npm run captions.
//
//   npm run captions:setup

import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  downloadWhisperModel,
  installWhisperCpp,
} from "@remotion/install-whisper-cpp";

export const WHISPER_VERSION = "1.5.5";
export const WHISPER_MODEL = "base.en";
const folder = fileURLToPath(new URL("../.tools/whisper/", import.meta.url));

// The installer creates the folder itself and refuses an existing empty one.
await installWhisperCpp({ to: folder, version: WHISPER_VERSION });
mkdirSync(folder, { recursive: true });
await downloadWhisperModel({ model: WHISPER_MODEL, folder });
console.log(`Ready: whisper.cpp ${WHISPER_VERSION} with ${WHISPER_MODEL}`);
