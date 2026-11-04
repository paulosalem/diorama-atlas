import { createMiniatureRenderer } from "../rendering/miniature-renderer.js";
import { getMiniatureStudy } from "../catalog/scene-versions.js";
import { sceneMiniatureContent } from "../localization/miniature-content.js";
import { getLocale, subscribeLocale, t } from "../localization/locale.js";
import { sitePath } from "../site.js";
import { createRecordedNarration } from "./recorded-narration.js";
import {
  findNarrationRecording,
  loadNarrationLibrary,
} from "./narration-library.js";
import { mountSceneVersions } from "./scene-versions.js";
import { addAboutButton } from "./about-atlas.js";
import { addOutdoorReferences } from "./outdoor-references.js";

export async function createMiniatureViewer(
  app,
  definition,
  { audio, onNavigate, version, signal, onDispose },
) {
  signal?.throwIfAborted();
  const study = getMiniatureStudy(definition);
  const events = new AbortController();
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let native,
    views,
    recordings = [],
    narration = [],
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
              <button id="miniatureShell" aria-expanded="false" disabled hidden></button>
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
  const narrator = createRecordedNarration({
    onChange(state) {
      audio?.setDucked(["loading", "playing"].includes(state));
      render();
    },
  });
  function copy() {
    return sceneMiniatureContent(
      getLocale(),
      selected,
      definition,
      views,
      narration,
    );
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
    const open = native?.inspection.shell?.open ?? false;
    find("miniatureShell").textContent = open
      ? text.closeShell
      : text.openShell;
    find("miniatureShell").setAttribute("aria-expanded", String(open));
    find("miniatureStoryTitle").textContent = text.heading;
    find("miniatureStoryText").textContent = text.body;
    find("miniatureStory").querySelector("summary").textContent = text.read;
    find("miniatureGesture").textContent = views?.[selected].orbit
      ? text.orbitHint
      : text.eyeHint;
    canvas.setAttribute(
      "aria-label",
      `${t(definition.title)}. ${find("miniatureGesture").textContent}`,
    );
    const speaking = ["loading", "playing"].includes(narrator.state);
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
    if (!views || !Object.hasOwn(views, key))
      throw new Error(`Unknown miniature viewpoint: ${key}`);
    narrator.stop();
    selected = key;
    if (key !== "whole" && native.runtime.shell)
      native.setOpen(true, preference.matches);
    native.view(views[key]);
    native.reducedMotion(preference.matches);
    const url = new URL(location.href);
    url.searchParams.set("view", key);
    if (native.inspection.shell?.open) url.searchParams.set("open", "1");
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
      audio: native?.runtime.soundscape?.inspection,
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
    native?.dispose();
    snapshot = {
      ...snapshot,
      disposed: true,
      audio: native?.runtime.soundscape?.inspection,
      narration: narrator.state,
    };
    onDispose?.();
  }
  const controller = {
    get runtime() {
      return native?.runtime;
    },
    get narration() {
      return narrator;
    },
    get renderer() {
      return native?.renderer;
    },
    get scene() {
      return native?.scene;
    },
    get camera() {
      return native?.camera;
    },
    probe: (...args) => native.probe(...args),
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
    if (["loading", "playing"].includes(narrator.state)) narrator.stop();
    else {
      audio?.beginNarration();
      void narrator.play(
        findNarrationRecording(recordings, getLocale(), copy().body),
      );
    }
  });
  listen(find("wholeMiniature"), "click", () => selectView());
  listen(find("resetViewButton"), "click", () => native.reset());
  listen(find("miniatureZoomIn"), "click", () => native.zoom(-1));
  listen(find("miniatureZoomOut"), "click", () => native.zoom(1));
  listen(find("miniatureShell"), "click", () => {
    const open = !native.inspection.shell.open;
    if (!open && selected !== "whole") selectView("whole");
    narrator.stop();
    native.setOpen(open, preference.matches);
    const url = new URL(location.href);
    if (open) url.searchParams.set("open", "1");
    else url.searchParams.delete("open");
    history.replaceState(null, "", url);
    render();
  });
  listen(find("riadExpand"), "click", () => onNavigate(sitePath("/")));
  listen(find("miniatureMotion"), "click", () => {
    paused = !paused;
    render();
  });
  listen(preference, "change", () => {
    paused = preference.matches;
    native?.reducedMotion(paused);
    if (native?.runtime.shell && preference.matches)
      native.setOpen(native.inspection.shell.open, true);
    render();
  });
  listen(document, "visibilitychange", () => {
    last = performance.now();
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
    native = await createMiniatureRenderer(canvas, definition, study, {
      signal: events.signal,
    });
    recordings = await loadNarrationLibrary();
    narration = recordings.filter((asset) => asset.scene === definition.id);
    if (disposed) {
      native.dispose();
      throw new DOMException("Navigation changed.", "AbortError");
    }
    if (!native.runtime.soundscape)
      throw new Error(
        "The miniature is missing its authored local soundscape.",
      );
    views = native.runtime.views;
    if (native.runtime.shell) {
      find("miniatureShell").hidden = false;
      find("miniatureShell").disabled = false;
      if (new URLSearchParams(location.search).get("open") === "1")
        native.setOpen(true, true);
    }
    for (const key of Object.keys(views)) {
      const button = document.createElement("button");
      button.dataset.view = key;
      listen(button, "click", () => selectView(key));
      find("miniatureViews").append(button);
    }
    selectView(new URLSearchParams(location.search).get("view") ?? "whole");
    native.resize();
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
    last = performance.now();
    function frame(now) {
      if (disposed) return;
      const delta = Math.min((now - last) / 1000, 0.1);
      if (!document.hidden) {
        frameDurations.push(now - last);
        if (frameDurations.length > 120) frameDurations.shift();
        if (!paused) elapsed += delta;
        native.render(elapsed);
        audio?.update(native.camera);
      }
      last = now;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return controller;
  } catch (error) {
    dispose();
    if (error.name === "AbortError") throw error;
    throw new Error(
      "The miniature could not be prepared. Please reload or return to the world.",
      { cause: error },
    );
  }
}
