import * as THREE from "three";
import { getLocale, subscribeLocale, t } from "../localization/locale.js";
import { createNarrationTriggers } from "./narration-triggers.js";

let library;
async function loadNarrationLibrary() {
  if (!library) {
    library = fetch("/public/narration/manifest.json")
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Narration manifest: HTTP ${response.status}`);
        const manifest = await response.json();
        if (manifest.version !== 1 || !Array.isArray(manifest.assets))
          throw new Error("Invalid narration manifest.");
        for (const asset of manifest.assets) {
          if (
            !["en-US", "pt-BR"].includes(asset.locale) ||
            !/^\/public\/narration\/[a-zA-Z0-9-]+\.mp3$/.test(asset.file) ||
            typeof asset.text !== "string" ||
            !asset.text.trim() ||
            typeof asset.title !== "string"
          )
            throw new Error(`Invalid narration asset: ${asset.id}`);
        }
        return manifest.assets;
      })
      .catch((error) => {
        library = null;
        throw error;
      });
  }
  return library;
}

export function createSceneNarration({
  viewer,
  sceneId,
  views,
  camera,
  audio,
  atlasAudio,
  stopNarration,
  initialView,
}) {
  const panel = document.createElement("section");
  panel.className = "scene-narration";
  panel.setAttribute("aria-labelledby", "narrationTitle");
  panel.innerHTML = `<header><div><p class="narration-eyebrow"></p><h2 id="narrationTitle"></h2></div><button class="narration-minimize" aria-expanded="true">−</button></header><p class="narration-text"></p><div class="narration-controls"><button id="narrationPlay"></button><span class="narration-time"></span><label><input id="narrationAutomatic" type="checkbox"><span></span></label></div><p class="narration-status" role="status"></p><small class="narration-disclosure"></small>`;
  viewer.querySelector(".canvas-mount").append(panel);
  const find = (selector) => panel.querySelector(selector);
  const playButton = find("#narrationPlay");
  const events = new AbortController();
  const direction = new THREE.Vector3();
  const triggers = createNarrationTriggers(views);
  let disposed = false;
  let assets = [];
  let currentKey =
    initialView && views[initialView] ? initialView : Object.keys(views)[0];
  let locale = getLocale();
  let state = "loading";
  let track = null;
  let request = 0;
  let minimized = false;
  let pausedByUser = false;
  let enabled = atlasAudio.snapshot.narrationEnabled;
  triggers.select(currentKey);

  const ownsMedia = () => track && audio.getAttribute("src") === track.file;
  function render() {
    if (disposed) return;
    panel.lang = locale;
    panel.dataset.state = state;
    find(".narration-eyebrow").textContent = t("A sense of place");
    find("#narrationTitle").textContent = track?.title ?? t("Place narration");
    const transcript = find(".narration-text");
    if (transcript.textContent !== (track?.text ?? ""))
      transcript.textContent = track?.text ?? "";
    playButton.disabled = state === "loading";
    playButton.textContent = t(
      state === "playing"
        ? "Pause"
        : state === "ended"
          ? "Replay"
          : state === "error"
            ? "Retry"
            : "Play",
    );
    playButton.setAttribute(
      "aria-label",
      t(state === "playing" ? "Pause narration" : "Play narration"),
    );
    find("#narrationAutomatic").checked = atlasAudio.snapshot.narrationEnabled;
    find(".narration-controls label span").textContent = t("Auto");
    find("#narrationAutomatic").setAttribute(
      "aria-label",
      t("Narrate on entry and at views"),
    );
    find(".narration-controls label").title = t(
      "Narrate on entry and at views",
    );
    find(".narration-disclosure").textContent = t("AI-generated voice");
    find(".narration-minimize").setAttribute(
      "aria-label",
      t(minimized ? "Expand narration" : "Minimize narration"),
    );
    find(".narration-status").textContent = t(
      atlasAudio.snapshot.preferenceError ||
        (state === "loading"
          ? "Preparing narration…"
          : state === "blocked"
            ? "Select Play to allow narration in this browser."
            : state === "error"
              ? "Narration could not be loaded. Select Retry."
              : !atlasAudio.snapshot.narrationEnabled
                ? "Play once to enable narration for future visits and views."
                : ""),
    );
    const seconds = ownsMedia() ? Math.floor(audio.currentTime) : 0;
    find(".narration-time").textContent =
      `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }
  function stop() {
    request++;
    if (ownsMedia()) stopNarration();
    if (state !== "loading" && state !== "error") state = "paused";
    render();
  }
  async function play(automatic = false) {
    if (disposed || !track || document.hidden) return;
    if (
      automatic &&
      (!atlasAudio.snapshot.narrationEnabled ||
        (!atlasAudio.inspection.ownsPlayback && !document.hasFocus()))
    )
      return;
    if (!automatic) atlasAudio.setNarrationEnabled(true);
    pausedByUser = false;
    const attempt = ++request;
    const resume = ownsMedia() && state === "paused";
    if (!resume) {
      stopNarration();
      audio.src = track.file;
      audio.currentTime = 0;
    }
    state = "loading";
    render();
    try {
      await audio.play();
      if (disposed || attempt !== request) return;
      state = "playing";
    } catch (error) {
      if (disposed || attempt !== request) return;
      atlasAudio.setDucked(false);
      if (error.name === "AbortError") {
        state = "paused";
      } else if (error.name === "NotAllowedError") {
        state = "blocked";
      } else {
        console.error("Could not play the prerecorded narration.", error);
        state = "error";
      }
    }
    render();
  }
  function select(key, { automatic = true } = {}) {
    currentKey = views[key] ? key : Object.keys(views)[0];
    triggers.select(currentKey);
    request++;
    if (ownsMedia()) stopNarration();
    track =
      assets.find(
        (asset) =>
          asset.locale === locale &&
          (asset.view ?? Object.keys(views)[0]) === currentKey,
      ) ?? null;
    if (!track) {
      state = assets.length ? "error" : "loading";
      if (assets.length)
        console.error(`Missing narration: ${sceneId}/${currentKey}/${locale}`);
      render();
      return;
    }
    state = "ready";
    pausedByUser = false;
    render();
    if (automatic && atlasAudio.snapshot.narrationEnabled) void play(true);
  }
  async function load() {
    state = "loading";
    render();
    try {
      assets = (await loadNarrationLibrary()).filter(
        (asset) => asset.scene === sceneId,
      );
      if (disposed) return;
      if (!assets.length)
        throw new Error(`Missing scene narration: ${sceneId}`);
      select(currentKey);
    } catch (error) {
      if (disposed) return;
      console.error("Could not load scene narration.", error);
      state = "error";
      render();
    }
  }
  playButton.onclick = () => {
    if (state === "playing") {
      pausedByUser = true;
      audio.pause();
    } else if (state === "error" && !track) {
      void load();
    } else {
      void play();
    }
  };
  find("#narrationAutomatic").onchange = (event) => {
    atlasAudio.setNarrationEnabled(event.target.checked);
    if (event.target.checked) void play();
    else stop();
  };
  find(".narration-minimize").onclick = () => {
    minimized = !minimized;
    panel.classList.toggle("is-minimized", minimized);
    find(".narration-minimize").textContent = minimized ? "+" : "−";
    find(".narration-minimize").setAttribute(
      "aria-expanded",
      String(!minimized),
    );
    render();
  };
  for (const event of ["play", "pause", "ended", "timeupdate", "error"])
    audio.addEventListener(
      event,
      () => {
        if (disposed) return;
        if (!ownsMedia()) {
          if (state === "playing" || state === "loading")
            state = track ? "ready" : state;
        } else if (event === "play") state = "playing";
        else if (event === "pause") state = audio.ended ? "ended" : "paused";
        else if (event === "ended") state = "ended";
        else if (event === "error") state = "error";
        render();
      },
      { signal: events.signal },
    );
  const unsubscribeAudio = atlasAudio.subscribe(() => {
    const next = atlasAudio.snapshot.narrationEnabled;
    if (enabled && !next) stop();
    enabled = next;
    render();
  });
  const unsubscribeLocale = subscribeLocale(() => {
    const playing = state === "playing";
    const paused = pausedByUser;
    stop();
    locale = getLocale();
    select(currentKey, { automatic: playing });
    pausedByUser = paused;
  });
  void load();
  return {
    select,
    update(now) {
      if (
        disposed ||
        !assets.length ||
        document.hidden ||
        pausedByUser ||
        document.querySelector("dialog[open]")
      )
        return;
      camera.getWorldDirection(direction);
      const key = triggers.update(
        camera.position.toArray(),
        direction.toArray(),
        now,
      );
      if (key) select(key);
    },
    get snapshot() {
      return { view: currentKey, locale, state, asset: track?.id, minimized };
    },
    dispose() {
      if (disposed) return;
      stop();
      disposed = true;
      state = "disposed";
      events.abort();
      unsubscribeAudio();
      unsubscribeLocale();
      panel.remove();
    },
  };
}
