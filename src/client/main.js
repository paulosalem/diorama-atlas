import { loadScenes } from "./catalog/scene-catalog.js";
import { siteBase, sitePath } from "./site.js";
import { createAtlasAudio } from "./environments/shared/atlas-audio.js";
import { createSoundscapePanel } from "./viewer/soundscape-panel.js";
import { createLanguageControl } from "./viewer/language-control.js";
import { createFullscreenControl } from "./viewer/fullscreen-control.js";
import { disposeAbout } from "./viewer/about-atlas.js";
import {
  subscribeLocale,
  t,
  translateElement,
  translateUI,
} from "./localization/locale.js";

const app = document.getElementById("app");
const audio = createAtlasAudio();
const soundPanel = createSoundscapePanel(audio);
const languageControl = createLanguageControl();
const fullscreenControl = createFullscreenControl();
const unsubscribeLocale = subscribeLocale(() => {
  translateUI(document);
  if (!new URL(location.href).searchParams.has("scene"))
    document.title = t("Diorama Atlas — a world of small places");
});
const initialLoading = app.querySelector(".initial-loading");
if (initialLoading?.firstChild)
  initialLoading.firstChild.textContent = t("Opening the world");
let scenes;
let active = null;
let pending = null;
let rendering = false;
let preparation;

function showError(error) {
  console.error(error);
  app.replaceChildren();
  const panel = document.createElement("div");
  panel.className = "initial-loading";
  const message = document.createElement("p");
  translateElement(
    message,
    error.message || "This view could not be loaded. Please try again.",
  );
  const retry = document.createElement("a");
  retry.href = sitePath("/");
  translateElement(retry, "Return to the world");
  panel.append(message, retry);
  app.append(panel);
  languageControl.mount(app);
  fullscreenControl.mount(app);
}

async function render() {
  pending = new URL(location.href);
  if (rendering) {
    preparation?.abort();
    return;
  }
  rendering = true;
  try {
    while (pending) {
      const url = pending;
      pending = null;
      preparation = new AbortController();
      const focusVersion = Boolean(
        document.activeElement?.closest(".scene-versions"),
      );
      audio.leaveEnvironment();
      active?.dispose();
      active = null;
      audio.setDucked(false);
      app.innerHTML =
        '<div class="initial-loading" role="status"><div data-i18n="Opening the world"></div><span></span></div>';
      translateUI(app);
      languageControl.mount(app);
      fullscreenControl.mount(app);
      try {
        const id = url.searchParams.get("scene");
        if (id) {
          const definition = scenes.find((scene) => scene.id === id);
          if (!definition) throw new Error("This place could not be found.");
          const { createViewer } = await import("./viewer/panorama-viewer.js");
          active = await createViewer(app, definition, {
            audio,
            onNavigate: navigate,
            version: url.searchParams.get("version"),
            signal: preparation.signal,
          });
          if (!pending)
            audio.attachEnvironment(active.runtime, definition.title);
        } else {
          const { createWorld } = await import("./world/world-globe.js");
          document.title = t("Diorama Atlas — a world of small places");
          active = await createWorld(app, scenes, { onNavigate: navigate });
          if (!pending) audio.attachEnvironment(null);
        }
        if (!pending) {
          soundPanel.mount(app);
          languageControl.mount(app);
          fullscreenControl.mount(app);
          translateUI(app);
          if (focusVersion)
            app.querySelector('.scene-versions [aria-current="true"]')?.focus();
        }
      } catch (error) {
        active?.dispose();
        active = null;
        audio.attachEnvironment(null);
        if (!pending) showError(error);
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
  scenes = await loadScenes({
    includeDrafts: new URLSearchParams(location.search).get("draft") === "1",
  });
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
  if (url.origin !== location.origin || url.pathname !== siteBase) return;
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
  languageControl.dispose();
  fullscreenControl.dispose();
  unsubscribeLocale();
  disposeAbout();
});

export function getAtlasAudio() {
  return audio;
}

// History restores the saved globe orientation while rebuilding disposed GPU resources.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});
