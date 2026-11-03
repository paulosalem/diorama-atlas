import { start } from "../rendering/babylon.js";
import { douroMiniature } from "../catalog/scene-versions.js";
import { miniatureContent } from "../localization/miniature-content.js";
import { getLocale, subscribeLocale, t } from "../localization/locale.js";
import { sitePath } from "../site.js";
import { createRecordedSoundscape } from "../environments/shared/recorded-soundscape.js";
import { getSoundscapeProfile } from "../environments/shared/soundscape-profiles.js";
import { createBrowserNarration } from "./browser-narration.js";
import { mountSceneVersions } from "./scene-versions.js";
import { addAboutButton } from "./about-atlas.js";
import { addOutdoorReferences } from "./outdoor-references.js";

export async function createMiniatureViewer(
  app,
  definition,
  { audio, onNavigate, version, signal, onDispose },
) {
  const events = new AbortController();
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const soundscape = createRecordedSoundscape(
    getSoundscapeProfile(definition.id),
  );
  let native,
    manifest,
    selected = "whole",
    disposed = false,
    snapshot;
  let paused = preference.matches,
    elapsed = 0,
    last = performance.now(),
    raf;
  const frameDurations = [];
  app.innerHTML = `
    <section class="viewer is-outdoor is-miniature" id="viewer" aria-busy="true">
      <header class="viewer-header">
        <div><p id="sceneRegion"></p><h1 id="sceneTitle"></h1></div>
        <div class="viewer-header-actions"><button id="resetViewButton" disabled></button></div>
      </header>
      <div class="canvas-mount">
        <div class="miniature-stage">
          <div class="miniature-renderer">
            <canvas id="miniatureCanvas" tabindex="0"></canvas>
            <div class="miniature-controls">
              <button id="wholeMiniature" disabled></button>
              <button id="miniatureZoomOut" disabled>−</button>
              <button id="miniatureZoomIn" disabled>+</button>
              <p id="miniatureGesture"></p>
            </div>
          </div>
          <aside class="miniature-story">
            <h2 id="miniatureStoryTitle"></h2>
            <details id="miniatureStory"><summary></summary><p id="miniatureStoryText"></p></details>
            <button id="miniatureListen" disabled></button>
            <small id="miniatureVoiceNote"></small>
            <p id="miniatureNotice" role="status"></p>
          </aside>
        </div>
        <div class="scene-loading" id="riadLoading" role="status"></div>
      </div>
      <div class="riad-toolbar" inert>
        <nav class="riad-viewpoints" id="miniatureViews"></nav>
        <div class="riad-actions"><button id="miniatureMotion"></button><button id="riadExpand"></button></div>
      </div>
      <span class="sr-only" id="riadViewLabel" aria-live="polite"></span>
    </section>`;
  const viewer = app.querySelector("#viewer");
  const find = (id) => viewer.querySelector(`#${id}`);
  const canvas = find("miniatureCanvas");
  const disposeVersions = mountSceneVersions(viewer, definition, version);
  addAboutButton(viewer.querySelector(".viewer-header-actions"));
  addOutdoorReferences(viewer, definition);
  find("miniatureStory").open = !matchMedia("(max-width: 700px)").matches;
  const narrator = createBrowserNarration({
    onChange(state) {
      audio?.setDucked(["preparing", "speaking"].includes(state));
      render();
    },
  });
  function copy() {
    return miniatureContent(getLocale(), selected);
  }
  function render() {
    if (disposed) return;
    const text = copy();
    document.title = `${t(definition.title)} · ${t(version.label)} · Diorama Atlas`;
    find("sceneTitle").textContent = t(definition.title);
    find("sceneRegion").textContent = t(definition.region);
    find("resetViewButton").textContent = text.reset;
    find("wholeMiniature").textContent = text.home;
    find("miniatureZoomIn").setAttribute("aria-label", text.zoomIn);
    find("miniatureZoomOut").setAttribute("aria-label", text.zoomOut);
    find("miniatureStoryTitle").textContent = text.heading;
    find("miniatureStoryText").textContent = text.body;
    find("miniatureStory").querySelector("summary").textContent = text.read;
    find("miniatureGesture").textContent = manifest?.views[selected].orbit
      ? text.orbitHint
      : text.eyeHint;
    canvas.setAttribute(
      "aria-label",
      `${t(definition.title)}. ${find("miniatureGesture").textContent}`,
    );
    const speaking = ["preparing", "speaking"].includes(narrator.state);
    find("miniatureListen").textContent = speaking ? text.stop : text.listen;
    find("miniatureListen").setAttribute("aria-pressed", String(speaking));
    find("miniatureVoiceNote").textContent = text.voiceNote;
    find("miniatureNotice").textContent =
      narrator.state === "unavailable" ? text.voiceUnavailable : "";
    find("miniatureMotion").textContent = preference.matches
      ? text.reduced
      : paused
        ? text.resume
        : text.pause;
    find("miniatureMotion").disabled = preference.matches;
    find("miniatureMotion").setAttribute("aria-pressed", String(paused));
    find("riadExpand").textContent = t("Back to world");
    find("riadLoading").textContent = text.loading;
    find("miniatureViews").setAttribute(
      "aria-label",
      t("{title} viewpoints", { title: t(definition.title) }),
    );
    for (const button of find("miniatureViews").children) {
      button.textContent = text.views[button.dataset.view];
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.view === selected),
      );
    }
  }
  function selectView(key = "whole") {
    if (!manifest || !Object.hasOwn(manifest.views, key))
      throw new Error(`Unknown miniature viewpoint: ${key}`);
    narrator.stop();
    selected = key;
    native.view(manifest.views[key]);
    native.reducedMotion(preference.matches);
    const url = new URL(location.href);
    url.searchParams.set("view", key);
    history.replaceState(null, "", url);
    find("riadViewLabel").textContent = copy().views[key];
    render();
  }
  const unsubscribeLocale = subscribeLocale(() => {
    narrator.stop();
    render();
  });
  const unsubscribeAudio = audio?.subscribe(() => {
    if (!audio.inspection.ownsPlayback) narrator.stop();
  });
  const observer = new ResizeObserver(() => native?.resize());
  observer.observe(canvas);
  function inspection() {
    return {
      ...native?.inspection,
      selected,
      paused,
      elapsed,
      disposed,
      audio: soundscape.inspection,
      narration: narrator.state,
    };
  }
  function dispose() {
    if (disposed) return;
    snapshot = inspection();
    disposed = true;
    cancelAnimationFrame(raf);
    events.abort();
    observer.disconnect();
    unsubscribeLocale();
    unsubscribeAudio?.();
    disposeVersions();
    narrator.dispose();
    soundscape.dispose();
    native?.dispose();
    snapshot = {
      ...snapshot,
      disposed: true,
      audio: soundscape.inspection,
      narration: narrator.state,
    };
    onDispose?.();
  }
  const controller = {
    get runtime() {
      return native;
    },
    get narration() {
      return narrator;
    },
    get manifest() {
      return manifest;
    },
    get inspection() {
      return disposed ? snapshot : inspection();
    },
    get elapsed() {
      return elapsed;
    },
    get frameDurations() {
      return [...frameDurations];
    },
    selectView,
    dispose,
  };
  function listen(element, type, callback) {
    element.addEventListener(type, callback, { signal: events.signal });
  }
  listen(find("miniatureListen"), "click", () => {
    if (["preparing", "speaking"].includes(narrator.state)) narrator.stop();
    else {
      audio?.beginNarration();
      narrator.play(`${copy().heading}. ${copy().body}`, getLocale());
    }
  });
  listen(find("wholeMiniature"), "click", () => selectView());
  listen(find("resetViewButton"), "click", () => native.reset());
  listen(find("miniatureZoomIn"), "click", () => native.zoom(-1));
  listen(find("miniatureZoomOut"), "click", () => native.zoom(1));
  listen(find("riadExpand"), "click", () => onNavigate(sitePath("/")));
  listen(find("miniatureMotion"), "click", () => {
    paused = !paused;
    native.pause(paused);
    render();
  });
  listen(preference, "change", () => {
    paused = preference.matches;
    native?.pause(paused || document.hidden);
    native?.reducedMotion(paused);
    render();
  });
  listen(document, "visibilitychange", () => {
    last = performance.now();
    native?.pause(paused || document.hidden);
  });
  listen(canvas, "keydown", (event) => {
    if (!native || !["Home", "+", "=", "-", "_"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") selectView();
    else native.zoom(["+", "="].includes(event.key) ? -1 : 1);
  });
  listen(viewer, "keydown", (event) => {
    if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
      event.preventDefault();
      onNavigate(sitePath("/"));
    }
  });
  signal?.addEventListener("abort", dispose, {
    once: true,
    signal: events.signal,
  });
  render();
  try {
    signal?.throwIfAborted();
    const study = {
      ...douroMiniature,
      assetRoot: sitePath(douroMiniature.assetRoot),
    };
    const response = await fetch(`${study.assetRoot}scene.json`, {
      signal: events.signal,
    });
    if (!response.ok)
      throw new Error(
        "The miniature assets could not be loaded. Please reload or return to the world.",
      );
    manifest = await response.json();
    manifest.study = study;
    native = await start(canvas, manifest);
    if (disposed) {
      native.dispose();
      throw new DOMException("Navigation changed.", "AbortError");
    }
    native.soundscape = soundscape;
    native.views = manifest.views;
    for (const key of Object.keys(manifest.views)) {
      const button = document.createElement("button");
      button.dataset.view = key;
      listen(button, "click", () => selectView(key));
      find("miniatureViews").append(button);
    }
    selectView(new URLSearchParams(location.search).get("view") ?? "whole");
    native.pause(paused || document.hidden);
    native.resize();
    native.render(0);
    await native.ready(events.signal);
    native.render(0);
    for (const id of [
      "wholeMiniature",
      "resetViewButton",
      "miniatureZoomIn",
      "miniatureZoomOut",
      "miniatureListen",
    ])
      find(id).disabled = false;
    viewer.querySelector(".riad-toolbar").inert = false;
    viewer.setAttribute("aria-busy", "false");
    find("riadLoading").hidden = true;
    render();
    const listenerCamera = {
      matrixWorld: { elements: [] },
      updateMatrixWorld() {
        this.matrixWorld.elements = native.cameraMatrix;
      },
    };
    last = performance.now();
    function frame(now) {
      if (disposed) return;
      const delta = Math.min((now - last) / 1000, 0.1);
      if (!document.hidden) {
        frameDurations.push(now - last);
        if (frameDurations.length > 120) frameDurations.shift();
        if (!paused) elapsed += delta;
        native.render(elapsed);
        audio?.update(listenerCamera);
      }
      last = now;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return controller;
  } catch (error) {
    dispose();
    throw error;
  }
}
