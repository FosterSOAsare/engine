import latency from "../videos/latency/scene.json";
import normalization from "../videos/normalization/scene.json";

// Every scene file the Studio shows. Each becomes a composition with the
// same id, rendered with: npm run render -- <id>
// Add a video by adding its folder under videos/ and a line here.
export const VIDEOS: { id: string; scene: unknown }[] = [
  { id: "latency", scene: latency },
  { id: "normalization", scene: normalization },
];
