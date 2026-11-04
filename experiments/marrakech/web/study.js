import { createRecordedSoundscape } from "/src/client/environments/shared/recorded-soundscape.js";
import { getSoundscapeProfile } from "/src/client/environments/shared/soundscape-profiles.js";
import { getStudy, studies } from "./scenes.js";

const study = getStudy(
  new URLSearchParams(location.search).get("scene") ?? undefined,
);
document.title = `${study.title} · Engine study`;
document.querySelector("h1").textContent = `${study.title}, four ways`;
document.querySelector("#description").textContent =
  `The same ${study.subject}. Four rendering engines. An isolated study.`;
const selector = document.querySelector("#scene");
for (const item of Object.values(studies)) {
  const option = document.createElement("option");
  option.value = item.id;
  option.textContent = item.title;
  option.selected = item.id === study.id;
  selector.append(option);
}
selector.onchange = () => {
  location.href = `/lab/?scene=${encodeURIComponent(selector.value)}`;
};
const response = await fetch(`${study.assetRoot}scene.json`);
// Assets are a sibling of the web root, exposed explicitly by the local server.
if (!response.ok)
  throw new Error(
    `Scene manifest unavailable (${response.status}). Run npm run export.`,
  );
const manifest = await response.json();
const panes = document.querySelector("#panes");
const frames = [];
let current = study.defaultView;
let paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
const engines = [
  ["current", "Three.js · current"],
  ["babylon", "Babylon.js"],
  ["playcanvas", "PlayCanvas"],
  ["unity", "Unity · URP"],
];
function url(engine) {
  return `/lab/engine.html?scene=${study.id}&engine=${engine}&view=${current}`;
}
for (const [engine, label] of engines) {
  const article = document.createElement("article");
  const title = document.createElement("div");
  title.className = "pane-title";
  const heading = document.createElement("h2");
  heading.textContent = label;
  const link = document.createElement("a");
  link.textContent = "Open alone ↗";
  link.target = "_blank";
  link.rel = "noopener";
  link.href = url(engine);
  const frame = document.createElement("iframe");
  frame.title = `${label}, ${study.title}`;
  frame.src = url(engine);
  frame.allow = "fullscreen";
  title.append(heading, link);
  article.append(title, frame);
  panes.append(article);
  frames.push({ engine, frame, link });
}
function broadcast() {
  for (const { engine, frame, link } of frames) {
    link.href = url(engine);
    frame.contentWindow.postMessage(
      { type: "study-controls", view: current, paused },
      location.origin,
    );
  }
}
for (const [key, view] of Object.entries(manifest.views)) {
  const button = document.createElement("button");
  button.textContent = view.label;
  button.setAttribute("aria-pressed", String(key === current));
  button.onclick = () => {
    current = key;
    for (const sibling of button.parentElement.children)
      sibling.setAttribute("aria-pressed", String(sibling === button));
    broadcast();
  };
  document.querySelector("#views").append(button);
}
window.addEventListener("message", (event) => {
  if (
    event.origin === location.origin &&
    frames.some(({ frame }) => frame.contentWindow === event.source) &&
    event.data?.type === "study-ready"
  )
    broadcast();
});
const motion = document.querySelector("#motion");
function updateMotion() {
  motion.textContent = paused ? "Resume motion" : "Pause motion";
  motion.setAttribute("aria-pressed", String(paused));
  broadcast();
}
motion.onclick = () => {
  paused = !paused;
  updateMotion();
};
matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
  "change",
  (event) => {
    paused = event.matches;
    updateMotion();
  },
);
updateMotion();
const soundscape = createRecordedSoundscape(
  getSoundscapeProfile(study.sceneId),
);
const sound = document.querySelector("#sound");
sound.textContent = `Enable ${study.subject} sound`;
sound.onclick = async () => {
  sound.disabled = true;
  try {
    const enabled = sound.getAttribute("aria-pressed") !== "true";
    if (enabled) await soundscape.start();
    else soundscape.stop();
    if (enabled && !soundscape.active) {
      throw new Error(
        soundscape.status.error ||
          soundscape.status.notice ||
          "Playback could not start",
      );
    }
    sound.setAttribute("aria-pressed", String(soundscape.active));
    sound.textContent = soundscape.active
      ? `Mute ${study.subject} sound`
      : `Enable ${study.subject} sound`;
  } catch (error) {
    document.querySelector("#notice").textContent =
      `Sound could not start: ${error.message}`;
  } finally {
    sound.disabled = false;
  }
};
window.addEventListener("pagehide", () => soundscape.dispose(), { once: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    soundscape.pause();
    sound.setAttribute("aria-pressed", "false");
    sound.textContent = `Enable ${study.subject} sound`;
  }
});
window.__study = { soundscape, frames, study };
document.querySelector("#notice").textContent =
  "Experimental native renders — not a claim of photorealism. The Three.js pane preserves the original scene.";
