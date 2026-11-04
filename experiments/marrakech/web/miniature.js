import { start } from "./rendering/babylon.js";
import { miniatureStudy } from "./scenes.js";
import { miniatureContent } from "/src/client/localization/miniature-content.js";
import {
  getLocale,
  setLocale,
  subscribeLocale,
  getLocaleError,
  t,
} from "/src/client/localization/locale.js";
import { createRecordedSoundscape } from "/src/client/environments/shared/recorded-soundscape.js";
import { getSoundscapeProfile } from "/src/client/environments/shared/soundscape-profiles.js";
import { createRecordedNarration } from "/src/client/viewer/recorded-narration.js";
import {
  findNarrationRecording,
  loadNarrationLibrary,
} from "/src/client/viewer/narration-library.js";

const find = (id) => document.getElementById(id);
const canvas = find("miniature");
const events = new AbortController();
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const compact = matchMedia("(max-width: 660px)");
const soundscape = createRecordedSoundscape(
  getSoundscapeProfile(miniatureStudy.sceneId),
);
let runtime,
  manifest,
  recordings = [],
  selected = "whole",
  disposed = false,
  ready = false;
let paused = preference.matches,
  elapsed = 0,
  last = performance.now(),
  raf,
  fps = 0,
  frames = 0,
  seconds = 0;
const narration = createRecordedNarration({
  onChange(state) {
    soundscape.setDucked(["playing", "loading"].includes(state));
    render();
  },
});
function copy() {
  return miniatureContent(getLocale(), selected);
}
function render() {
  if (disposed) return;
  const text = copy();
  document.title = text.title;
  find("title").textContent = text.title;
  find("subtitle").textContent = text.subtitle;
  find("languageLabel").textContent = text.language;
  find("language").value = getLocale();
  for (const id of ["home", "reset", "zoomIn", "zoomOut"]) {
    find(id).setAttribute("aria-label", text[id]);
    find(id).title = text[id];
    if (!id.startsWith("zoom")) find(id).textContent = text[id];
  }
  find("storyTitle").textContent = text.heading;
  find("storyText").textContent = text.body;
  find("readLabel").textContent = text.read;
  find("interpretation").textContent = text.note;
  find("voiceNote").textContent = text.voiceNote;
  find("gesture").textContent = manifest?.views[selected].orbit
    ? text.orbitHint
    : text.eyeHint;
  canvas.setAttribute(
    "aria-label",
    `${text.title}. ${find("gesture").textContent}`,
  );
  const playing = ["playing", "loading"].includes(narration.state);
  find("narration").textContent = playing ? text.stop : text.listen;
  find("narration").setAttribute("aria-pressed", String(playing));
  const sound = soundscape.status;
  find("sound").textContent =
    sound.state === "loading"
      ? text.soundLoading
      : soundscape.active
        ? text.soundOff
        : text.soundOn;
  find("sound").disabled = !ready || sound.state === "loading";
  find("sound").setAttribute("aria-pressed", String(soundscape.active));
  find("motion").textContent = preference.matches
    ? text.reduced
    : paused
      ? text.resume
      : text.pause;
  find("motion").disabled = !ready || preference.matches;
  find("motion").setAttribute("aria-pressed", String(paused));
  find("notice").textContent = getLocaleError()
    ? t(getLocaleError())
    : narration.state === "unavailable"
      ? text.voiceUnavailable
      : sound.error || sound.notice;
  for (const button of find("viewpoints").children) {
    button.textContent = text.views[button.dataset.view];
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.view === selected),
    );
  }
  find("comparison").textContent = text.compare;
  find("atlas").textContent = text.atlas;
  find("credits").textContent = text.credits;
  find("reload").textContent = text.reload;
  if (!find("loading").classList.contains("error"))
    find("loadingText").textContent = text.loading;
}
const unsubscribeLocale = subscribeLocale(() => {
  narration.stop();
  render();
});
const unsubscribeSound = soundscape.subscribe(render);
function select(key) {
  if (!Object.hasOwn(manifest.views, key))
    throw new Error(`Unknown miniature viewpoint: ${key}`);
  narration.stop();
  selected = key;
  runtime.view(manifest.views[key]);
  runtime.reducedMotion(preference.matches);
  const url = new URL(location.href);
  url.searchParams.set("view", key);
  history.replaceState(null, "", url);
  render();
}
function dispose() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(raf);
  events.abort();
  resizeObserver.disconnect();
  unsubscribeLocale();
  unsubscribeSound();
  narration.dispose();
  soundscape.dispose();
  runtime?.dispose();
}
function fail(error) {
  console.error("The miniature could not be prepared:", error);
  dispose();
  find("loading").hidden = false;
  find("loading").classList.add("error");
  find("loadingText").textContent = copy().loadFailed;
  find("reload").hidden = false;
  find("reload").onclick = () => location.reload();
}
find("language").addEventListener(
  "change",
  (event) => setLocale(event.target.value),
  { signal: events.signal },
);
find("narration").addEventListener(
  "click",
  () => {
    if (["playing", "loading"].includes(narration.state)) narration.stop();
    else
      void narration.play(
        findNarrationRecording(recordings, getLocale(), copy().body),
      );
  },
  { signal: events.signal },
);
find("sound").addEventListener(
  "click",
  async () => {
    try {
      if (soundscape.active) soundscape.stop();
      else await soundscape.start();
    } catch (error) {
      console.error("Miniature ambience could not start:", error);
      render();
    }
  },
  { signal: events.signal },
);
find("motion").addEventListener(
  "click",
  () => {
    paused = !paused;
    runtime.pause(paused);
    render();
  },
  { signal: events.signal },
);
find("home").addEventListener("click", () => select("whole"), {
  signal: events.signal,
});
find("reset").addEventListener("click", () => runtime.reset(), {
  signal: events.signal,
});
find("zoomIn").addEventListener("click", () => runtime.zoom(-1), {
  signal: events.signal,
});
find("zoomOut").addEventListener("click", () => runtime.zoom(1), {
  signal: events.signal,
});
preference.addEventListener(
  "change",
  () => {
    paused = preference.matches;
    runtime?.pause(paused);
    runtime?.reducedMotion(paused);
    render();
  },
  { signal: events.signal },
);
document.addEventListener(
  "visibilitychange",
  () => {
    last = performance.now();
    runtime?.pause(paused || document.hidden);
  },
  { signal: events.signal },
);
window.addEventListener(
  "pagehide",
  (event) => {
    dispose();
    if (event.persisted)
      window.addEventListener("pageshow", () => location.reload(), {
        once: true,
      });
  },
  { once: true, signal: events.signal },
);
canvas.addEventListener(
  "keydown",
  (event) => {
    if (!ready || !["Home", "Escape", "+", "=", "-", "_"].includes(event.key))
      return;
    event.preventDefault();
    if (["Home", "Escape"].includes(event.key)) select("whole");
    else runtime.zoom(["+", "="].includes(event.key) ? -1 : 1);
  },
  { signal: events.signal },
);
find("storyDetails").open = !compact.matches;
const resizeObserver = new ResizeObserver(() => runtime?.resize());
resizeObserver.observe(canvas);
render();
try {
  const response = await fetch(`${miniatureStudy.assetRoot}scene.json`, {
    signal: events.signal,
  });
  if (!response.ok)
    throw new Error(`Miniature assets: HTTP ${response.status}`);
  manifest = await response.json();
  recordings = await loadNarrationLibrary();
  manifest.study = miniatureStudy;
  runtime = await start(canvas, manifest);
  if (disposed) runtime.dispose();
  else {
    for (const key of Object.keys(manifest.views)) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.view = key;
      button.addEventListener("click", () => select(key), {
        signal: events.signal,
      });
      find("viewpoints").append(button);
    }
    select(new URLSearchParams(location.search).get("view") ?? "whole");
    runtime.pause(paused);
    runtime.resize();
    ready = true;
    for (const id of ["home", "reset", "zoomIn", "zoomOut", "narration"])
      find(id).disabled = false;
    find("loading").hidden = true;
    render();
    window.__miniature = {
      select,
      dispose,
      runtime,
      manifest,
      soundscape,
      narration,
      get fps() {
        return fps;
      },
      get inspection() {
        return {
          ...runtime.inspection,
          selected,
          paused,
          hidden: document.hidden,
          elapsed,
          disposed,
          audio: soundscape.inspection,
          narration: narration.state,
        };
      },
    };
    function frame(now) {
      if (disposed) return;
      const duration = (now - last) / 1000;
      last = now;
      if (!document.hidden) {
        if (!paused) elapsed += Math.min(duration, 0.1);
        try {
          runtime.render(elapsed);
        } catch (error) {
          fail(error);
          return;
        }
        frames++;
        seconds += duration;
        if (seconds >= 1) {
          fps = frames / seconds;
          frames = seconds = 0;
        }
      }
      raf = requestAnimationFrame(frame);
    }
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
} catch (error) {
  if (!disposed) fail(error);
}
