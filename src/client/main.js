import { loadScenes } from "./catalog/scene-catalog.js";
const app = document.getElementById("app");
try {
  const scenes = await loadScenes();
  const id = new URLSearchParams(location.search).get("scene");
  if (id) {
    const definition = scenes.find((s) => s.id === id);
    if (!definition) throw new Error("This place could not be found.");
    const { createViewer } = await import("./viewer/panorama-viewer.js");
    await createViewer(app, definition);
  } else {
    const { createWorld } = await import("./world/world-globe.js");
    await createWorld(app, scenes);
  }
} catch (error) {
  console.error(error);
  app.replaceChildren();
  const panel = document.createElement("div");
  panel.className = "initial-loading";
  const message = document.createElement("p");
  message.textContent =
    error.message || "This view could not be loaded. Please try again.";
  const retry = document.createElement("a");
  retry.href = "/";
  retry.textContent = "Return to the world";
  panel.append(message, retry);
  app.append(panel);
}

// History restores the saved globe orientation while rebuilding disposed GPU resources.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});
