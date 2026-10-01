import check from "../videos/check/scene.json";
import dns from "../videos/dns/scene.json";
import m1Demo from "../videos/m1-demo/scene.json";
import os from "../videos/os/scene.json";

// Every scene file the Studio shows. Each becomes a composition with the
// same id, rendered with: npx remotion render <id> out/<id>.mp4
// Add a video by adding its folder under videos/ and a line here.
export const VIDEOS: { id: string; scene: unknown }[] = [
  { id: "dns", scene: dns },
  { id: "os", scene: os },
  { id: "m1-demo", scene: m1Demo },
  // Exercises every renderer feature: a moved box with its arrow,
  // arrow and circle labels, colours, the wipe and keepPrevious.
  { id: "check", scene: check },
];
