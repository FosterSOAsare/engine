import { cloud } from "./cloud";
import { database } from "./database";
import { phone } from "./phone";
import { server } from "./server";
import type { IconDrawing } from "./types";
import { user } from "./user";

// Every icon a scene file can use, by name ("type": "icon", "name": ...).
// To add one: create <name>.ts next to this file (see types.ts for the
// helpers) and add it here. The scene file schema takes its list of names
// from this object, so nothing else needs to change.
export const ICONS = {
  user,
  server,
  database,
  phone,
  cloud,
} satisfies Record<string, IconDrawing>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as [IconName, ...IconName[]];
