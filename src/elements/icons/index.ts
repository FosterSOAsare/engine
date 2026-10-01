import { battery } from "./devices/battery";
import { browser } from "./devices/browser";
import { camera } from "./devices/camera";
import { keyboard } from "./devices/keyboard";
import { laptop } from "./devices/laptop";
import { monitor } from "./devices/monitor";
import { phone } from "./devices/phone";
import { robot } from "./devices/robot";
import { tablet } from "./devices/tablet";
import { chip } from "./hardware/chip";
import { cube } from "./hardware/cube";
import { disk } from "./hardware/disk";
import { memory } from "./hardware/memory";
import { server } from "./hardware/server";
import { book } from "./data/book";
import { chart } from "./data/chart";
import { database } from "./data/database";
import { file } from "./data/file";
import { folder } from "./data/folder";
import { queue } from "./data/queue";
import { cloud } from "./network/cloud";
import { download } from "./network/download";
import { globe } from "./network/globe";
import { link } from "./network/link";
import { network } from "./network/network";
import { router } from "./network/router";
import { upload } from "./network/upload";
import { wifi } from "./network/wifi";
import { key } from "./security/key";
import { lock } from "./security/lock";
import { shield } from "./security/shield";
import { warning } from "./security/warning";
import { bell } from "./people/bell";
import { chat } from "./people/chat";
import { mail } from "./people/mail";
import { user } from "./people/user";
import { users } from "./people/users";
import { bug } from "./development/bug";
import { code } from "./development/code";
import { gear } from "./development/gear";
import { search } from "./development/search";
import { terminal } from "./development/terminal";
import { calendar } from "./everyday/calendar";
import { cart } from "./everyday/cart";
import { clock } from "./everyday/clock";
import { home } from "./everyday/home";
import { lightbulb } from "./everyday/lightbulb";
import { lightning } from "./everyday/lightning";
import { money } from "./everyday/money";
import { pin } from "./everyday/pin";
import { trash } from "./everyday/trash";
import { check } from "./marks/check";
import { cross } from "./marks/cross";
import { heart } from "./marks/heart";
import { info } from "./marks/info";
import { question } from "./marks/question";
import { star } from "./marks/star";
import type { IconDrawing } from "./types";

// Every icon a scene file can use, by name ("type": "icon", "name": ...).
// To add one: create <name>.ts in the folder for its group (see types.ts
// for the helpers) and add it here, under the same group. The scene file
// schema takes its list of names from this object, so nothing else needs
// to change.
export const ICONS = {
  // devices
  phone,
  laptop,
  monitor,
  tablet,
  keyboard,
  browser,
  camera,
  robot,
  battery,
  // hardware
  server,
  chip,
  memory,
  disk,
  cube,
  // files and data
  database,
  folder,
  file,
  book,
  chart,
  queue,
  // networking
  cloud,
  globe,
  wifi,
  router,
  network,
  link,
  download,
  upload,
  // security
  lock,
  key,
  shield,
  warning,
  // people and communication
  user,
  users,
  mail,
  chat,
  bell,
  // development
  code,
  terminal,
  bug,
  gear,
  search,
  // everyday
  home,
  clock,
  calendar,
  cart,
  money,
  lightbulb,
  pin,
  trash,
  lightning,
  // marks
  check,
  cross,
  star,
  heart,
  info,
  question,
} satisfies Record<string, IconDrawing>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as [IconName, ...IconName[]];
