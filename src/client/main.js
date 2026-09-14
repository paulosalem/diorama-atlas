import { loadScenes } from "./catalog/scene-catalog.js";
import { createAtlasAudio } from "./environments/shared/atlas-audio.js";
import { createSoundscapePanel } from "./viewer/soundscape-panel.js";

const app = document.getElementById("app");
const audio = createAtlasAudio();
const soundPanel = createSoundscapePanel(audio);
let scenes;
let active = null;
let pending = null;
let rendering = false;

function showError(error) {
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

async function render() {
  pending = new URL(location.href);
  if (rendering) return;
  rendering = true;
  try {
    while (pending) {
      const url = pending;
      pending = null;
      audio.leaveEnvironment();
      active?.dispose();
      active = null;
      audio.setDucked(false);
      app.innerHTML =
        '<div class="initial-loading" role="status">Opening the world<span></span></div>';
      try {
        const id = url.searchParams.get("scene");
        if (id) {
          const definition = scenes.find((scene) => scene.id === id);
          if (!definition) throw new Error("This place could not be found.");
          const { createViewer } = await import("./viewer/panorama-viewer.js");
          active = await createViewer(app, definition, {
            audio,
            onNavigate: navigate,
          });
          if (!pending)
            audio.attachEnvironment(active.runtime, definition.title);
        } else {
          const { createWorld } = await import("./world/world-globe.js");
          document.title = "Diorama Atlas — a world of small places";
          active = await createWorld(app, scenes);
          if (!pending) audio.attachEnvironment(null);
        }
        if (!pending) soundPanel.mount(app);
      } catch (error) {
        active?.dispose();
        active = null;
        audio.attachEnvironment(null);
        showError(error);
      }
    }
  } finally {
    rendering = false;
  }
}

function navigate(path) {
  const url = new URL(path, location.href);
  if (url.href !== location.href) history.pushState(null, "", url);
  void render();
}

try {
  scenes = await loadScenes();
  await render();
} catch (error) {
  showError(error);
}

app.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (
    !scenes ||
    !link ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey ||
    link.target ||
    link.hasAttribute("download")
  )
    return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || url.pathname !== "/") return;
  event.preventDefault();
  navigate(url.href);
});
window.addEventListener("popstate", () => {
  if (scenes) void render();
});
window.addEventListener("pagehide", () => {
  active?.dispose();
  audio.dispose();
  soundPanel.dispose();
});

export function getAtlasAudio() {
  return audio;
}

// History restores the saved globe orientation while rebuilding disposed GPU resources.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});
