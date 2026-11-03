import { exportScene } from "/src/client/rendering/export-scene.js";
import { getStudy } from "./scenes.js";

window.exportStudy = () =>
  exportScene(
    getStudy(new URLSearchParams(location.search).get("scene") ?? undefined),
  );
