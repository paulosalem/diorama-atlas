import { createViewer } from "/src/client/viewer/panorama-viewer.js";
import { curatedScenes } from "/src/client/catalog/scene-catalog.js";
import {
  outdoorScenes,
  outdoorDraftScenes,
} from "/src/client/catalog/outdoor-catalog.js";

export async function start(canvas, manifest) {
  canvas.hidden = true;
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = "/src/client/styles.css";
  document.head.append(style);
  const overrides = document.createElement("style");
  overrides.textContent = `
    .viewer-header, .riad-toolbar, .hotspot-layer, .riad-detail-caption { display: none !important; }
    .viewer, #canvasMount { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; margin: 0 !important; border: 0 !important; border-radius: 0 !important; }
    .engine-status { z-index: 20; }
  `;
  document.head.append(overrides);
  const mount = document.createElement("div");
  document.body.append(mount);
  const viewer = await createViewer(
    mount,
    structuredClone(
      [...curatedScenes, ...outdoorScenes, ...outdoorDraftScenes].find(
        (scene) => scene.id === manifest.study.sceneId,
      ),
    ),
  );
  let paused = false;
  let time = 0;
  const animations = viewer.runtime.animations.slice();
  viewer.runtime.animations.splice(0, animations.length, (delta) => {
    if (!paused) time += delta;
    animations.forEach((animate) => animate(paused ? 0 : delta, time));
  });
  return {
    view(view, key) {
      viewer.selectView(key);
    },
    pause(value) {
      paused = value;
    },
    resize() {
      window.dispatchEvent(new Event("atlas-resize"));
    },
    dispose() {
      viewer.dispose();
      mount.remove();
      style.remove();
      overrides.remove();
    },
    get fps() {
      const frames = viewer.frameDurations;
      return frames.length
        ? (1000 * frames.length) /
            frames.reduce((sum, duration) => sum + duration, 0)
        : 0;
    },
    get inspection() {
      let meshes = 0;
      viewer.runtime.group.traverse((object) => {
        if (object.isMesh) meshes++;
      });
      return { meshes, animations: animations.length, animationTime: time };
    },
  };
}
