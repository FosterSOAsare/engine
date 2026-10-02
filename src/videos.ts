import latency from "../videos/latency/scene.json";
import latencyIllustrated from "../videos/latency-illustrated/scene.json";
import normalization from "../videos/normalization/scene.json";

// Every scene file the Studio shows. Each becomes a composition with the
// same id, rendered with: npm run render -- <id>
// Add a video by adding its folder under videos/ and a line here.
export const VIDEOS: { id: string; scene: unknown }[] = [
  { id: "latency", scene: latency },
  { id: "latency-illustrated", scene: latencyIllustrated },
  { id: "normalization", scene: normalization },
];
