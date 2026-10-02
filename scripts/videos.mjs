// The videos in src/videos.ts and their compositions, for the scripts.
// A video renders as <id> in the format its scene file is written for and
// as <id>-<format> in the others (see src/Root.tsx).

import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const videosFile = read("../src/videos.ts");
const imports = Object.fromEntries(
  [...videosFile.matchAll(/import (\w+) from "\.\.\/(videos\/[^"]+)"/g)].map(
    ([, name, path]) => [name, path],
  ),
);

// Every video, with the format its scene file is written for.
export const videos = [
  ...videosFile.matchAll(/id: "([^"]+)", scene: (\w+)/g),
].map(([, id, name]) => ({
  id,
  written: JSON.parse(read(`../${imports[name]}`)).format ?? "portrait",
}));

export const formats = [
  ...read("../src/layout/formats.ts").matchAll(/^ {2}(\w+): \{\r?\n {4}width/gm),
].map(([, name]) => name);

// A video's compositions in the other formats.
export const variants = ({ id, written }) =>
  formats.filter((format) => format !== written).map((f) => `${id}-${f}`);

// Every composition id.
export const known = videos.flatMap((video) => [video.id, ...variants(video)]);

// The ids asked for on the command line: "all" for every video, and with
// allFormats each video in every format.
export const expand = (asked, allFormats) => {
  const ids = asked.includes("all") ? videos.map((video) => video.id) : asked;
  return allFormats
    ? ids.flatMap((id) => {
        const video = videos.find((v) => v.id === id);
        return video ? [id, ...variants(video)] : [id];
      })
    : ids;
};

export const help =
  `Videos: ${videos.map((video) => video.id).join(", ")}\n` +
  `Other formats: <id>-<format>, formats ${formats.join(", ")}`;

// The format a composition id renders in, or null for an unknown id.
export const formatOf = (compositionId) => {
  const video = videos.find((v) => v.id === compositionId);
  if (video) return video.written;
  const format = formats.find((f) => compositionId.endsWith(`-${f}`));
  return format && known.includes(compositionId) ? format : null;
};
