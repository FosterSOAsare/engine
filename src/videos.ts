import api from "../videos/api/scene.json";
import check from "../videos/check/scene.json";
import designs from "../videos/designs/scene.json";
import dns from "../videos/dns/scene.json";
import https from "../videos/https/scene.json";
import icons from "../videos/icons/scene.json";
import lucide from "../videos/lucide/scene.json";
import latency from "../videos/latency/scene.json";
import m1Demo from "../videos/m1-demo/scene.json";
import os from "../videos/os/scene.json";
import passwords from "../videos/passwords/scene.json";
import showcase from "../videos/showcase/scene.json";

// Every scene file the Studio shows. Each becomes a composition with the
// same id, rendered with: npx remotion render <id> out/<id>.mp4
// Add a video by adding its folder under videos/ and a line here.
export const VIDEOS: { id: string; scene: unknown }[] = [
  { id: "api", scene: api },
  { id: "https", scene: https },
  { id: "passwords", scene: passwords },
  { id: "latency", scene: latency },
  { id: "dns", scene: dns },
  { id: "os", scene: os },
  // Every element type and every icon, by category.
  { id: "showcase", scene: showcase },
  { id: "m1-demo", scene: m1Demo },
  // A sample of 50 Lucide icons with their names.
  // Every design in public/assets/, drawn and named.
  { id: "designs", scene: designs },
  { id: "lucide", scene: lucide },
  // Every hand-made icon with its name.
  { id: "icons", scene: icons },
  // Exercises every renderer feature: a moved box with its arrow,
  // arrow and circle labels, colours, the wipe and keepPrevious.
  { id: "check", scene: check },
];
