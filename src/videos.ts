import latency from "../videos/latency/scene.json";
import latencyIllustrated from "../videos/latency-illustrated/scene.json";
import normalization from "../videos/normalization/scene.json";
import internetMyths from "../videos/internet-myths/scene.json";
import cookies from "../videos/cookies/scene.json";
import { applyType } from "./videoTypes.mjs";

// Every scene file the Studio shows. Each becomes a composition with the
// same id, rendered with: npm run render -- <id>
// Add a video by adding its folder under videos/ and a line here.
// A scene file's "type" is filled in here (src/videoTypes.mjs).
export const VIDEOS: { id: string; scene: unknown }[] = [
  { id: "cookies", scene: cookies },
  { id: "internet-myths", scene: internetMyths },
  { id: "latency", scene: latency },
  { id: "latency-illustrated", scene: latencyIllustrated },
  { id: "normalization", scene: normalization },
].map((video) => ({ ...video, scene: applyType(video.scene) }));
