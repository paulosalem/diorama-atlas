import { getStudy } from "./scenes.js";

const engine = new URLSearchParams(location.search).get("engine");
const status = document.querySelector(".engine-status");
const canvas = document.querySelector("canvas");
let runtime;
let view = new URLSearchParams(location.search).get("view");
let paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
let hidden = document.hidden;
let elapsed = 0;
let last = performance.now();
let frames = 0;
let sum = 0;
let raf;
let disposed = false;
const events = new AbortController();
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
async function dispose() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(raf);
  events.abort();
  await runtime?.dispose();
}
function fail(error) {
  status.classList.add("error");
  status.textContent = `${engine}: ${error.message}. Reload after correcting the build.`;
  console.error(error);
}
try {
  if (!["current", "babylon", "playcanvas", "unity"].includes(engine))
    throw new Error("Unknown engine");
  const study = getStudy(
    new URLSearchParams(location.search).get("scene") ?? undefined,
  );
  if (study.miniature && engine !== "babylon")
    throw new Error("The miniature experiment uses Babylon.js only");
  if (study.backdrop) document.body.style.backgroundColor = study.backdrop;
  view ??= study.defaultView;
  document.title = `${study.title} · ${engine}`;
  const response = await fetch(`${study.assetRoot}scene.json`);
  if (!response.ok)
    throw new Error(`Exported ${study.title} assets are missing`);
  const manifest = await response.json();
  manifest.study = study;
  const module = await import(
    engine === "babylon" ? "./rendering/babylon.js" : `./${engine}.js`
  );
  runtime = await module.start(canvas, manifest);
  function select(key) {
    if (!Object.hasOwn(manifest.views, key))
      throw new Error(`Unknown viewpoint: ${key}`);
    view = key;
    runtime.view(manifest.views[key], key);
  }
  select(view);
  window.addEventListener(
    "message",
    (event) => {
      if (
        event.origin !== location.origin ||
        event.source !== parent ||
        event.data?.type !== "study-controls"
      )
        return;
      if (event.data.view !== view) select(event.data.view);
      paused = Boolean(event.data.paused);
      runtime.pause?.(paused || hidden);
    },
    { signal: events.signal },
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      hidden = document.hidden;
      runtime.pause?.(paused || hidden);
      last = performance.now();
    },
    { signal: events.signal },
  );
  motionPreference.addEventListener(
    "change",
    (event) => {
      paused = event.matches;
      runtime.pause?.(paused || hidden);
    },
    { signal: events.signal },
  );
  window.addEventListener("resize", () => runtime.resize(), {
    signal: events.signal,
  });
  runtime.pause?.(paused || hidden);
  runtime.resize();
  status.textContent = `${engine} · ready`;
  window.__engineStudy = {
    engine,
    runtime,
    manifest,
    select,
    dispose,
    get inspection() {
      return { view, paused, hidden, elapsed, disposed, ...runtime.inspection };
    },
  };
  parent.postMessage({ type: "study-ready", engine }, location.origin);
  function frame(now) {
    const duration = (now - last) / 1000;
    const delta = Math.min(duration, 0.1);
    last = now;
    if (!hidden) {
      if (!paused) elapsed += delta;
      runtime.render?.(elapsed, paused ? 0 : delta);
      sum += duration;
      frames++;
      if (sum >= 1) {
        const fps =
          engine === "unity" ? runtime.fps : (runtime.fps ?? frames / sum);
        status.textContent = `${engine} · ${fps == null ? "native player" : `${Math.round(fps)} fps`}${paused ? " · motion paused" : ""}`;
        window.__engineStudy.fps = fps;
        frames = sum = 0;
      }
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
} catch (error) {
  await dispose();
  fail(error);
}
window.addEventListener(
  "pagehide",
  () => {
    dispose().catch(fail);
  },
  { once: true },
);
