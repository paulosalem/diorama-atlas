import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { buildRiadEnvironment } from "../environments/riad/riad-scene.js";
import { buildInteriorEnvironment } from "../environments/interiors/interior-scenes.js";
import { createPanoramaControls } from "./panorama-controls.js";

let activeViewer = null;

export function getActiveViewer() {
  return activeViewer;
}

export async function createViewer(
  app,
  definition,
  { audio: atlasAudio, onNavigate } = {},
) {
  activeViewer?.dispose();
  const events = new AbortController();
  let disposed = false;
  app.innerHTML = `<section class="viewer" id="viewer"><header class="viewer-header"><div><p id="sceneRegion"></p><h1 id="sceneTitle"></h1></div><button id="resetViewButton">Reset view</button></header><div class="canvas-mount" id="canvasMount"><div class="hotspot-layer" id="hotspotLayer"></div><aside class="riad-detail-caption"><h2 id="riadDetailTitle"></h2><p id="riadDetailBody"></p><button id="listenButton">Listen</button></aside><div class="scene-loading" id="riadLoading" role="status">Preparing the space…</div></div><div class="riad-toolbar" id="riadToolbar"><div class="riad-viewpoints"></div><div class="riad-actions"><button id="riadDetails" aria-pressed="false">Show details</button><button id="riadExpand">Back to world</button></div></div><span id="riadViewLabel" class="sr-only" aria-live="polite"></span></section>`;
  document.title = `${definition.title} · Diorama Atlas`;
  const viewer = app.querySelector("#viewer"),
    mount = app.querySelector("#canvasMount"),
    hotspotLayer = app.querySelector("#hotspotLayer");
  app.querySelector("#sceneTitle").textContent = definition.title;
  app.querySelector("#sceneRegion").textContent = definition.region;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  mount.prepend(renderer.domElement);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(57, 1, 0.04, 120),
    controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  const generator = new THREE.PMREMGenerator(renderer),
    room = new RoomEnvironment();
  const environment = generator.fromScene(room);
  scene.environment = environment.texture;
  room.dispose();
  generator.dispose();
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
  });
  target.samples = Math.min(4, renderer.capabilities.maxSamples);
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, 1, 1);
  ao.updateGtaoMaterial({ radius: 0.24, distanceExponent: 1, thickness: 0.3 });
  ao.blendIntensity = 0.7;
  composer.addPass(ao);
  composer.addPass(
    new UnrealBloomPass(new THREE.Vector2(1, 1), 0.035, 0.32, 0.62),
  );
  composer.addPass(new OutputPass());
  const runtime =
    definition.id === "riad"
      ? buildRiadEnvironment(definition, renderer)
      : buildInteriorEnvironment(definition, renderer);
  scene.add(runtime.group);
  scene.background = new THREE.Color(runtime.background ?? 0xc7d8df);
  if (runtime.fog)
    scene.fog = new THREE.FogExp2(runtime.fog.color, runtime.fog.density);
  renderer.toneMappingExposure = runtime.exposure ?? 0.94;
  scene.environmentIntensity = runtime.environmentIntensity ?? 0.36;
  function resize() {
    const w = mount.clientWidth,
      h = mount.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    if (runtime.aoScale) {
      const scale = renderer.getPixelRatio() * runtime.aoScale;
      ao.setSize(Math.round(w * scale), Math.round(h * scale));
    }
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const panorama = createPanoramaControls({
    camera,
    canvas: renderer.domElement,
    controls,
    viewer,
    onResize: resize,
    onView: (label) => {
      app.querySelector("#riadViewLabel").textContent = label;
    },
    onExit: () => {
      if (onNavigate) onNavigate("/");
      else location.href = "/";
    },
  });
  panorama.activate(runtime, definition);
  const audio = new Audio();
  audio.addEventListener("play", () => atlasAudio?.beginNarration(), {
    signal: events.signal,
  });
  for (const event of ["pause", "ended", "error"])
    audio.addEventListener(event, () => atlasAudio?.setDucked(false), {
      signal: events.signal,
    });
  const unsubscribeAudio = atlasAudio?.subscribe(() => {
    if (!atlasAudio.inspection.ownsPlayback && !audio.paused) {
      audio.pause();
      app.querySelector("#listenButton").textContent = "Listen";
    }
  });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        audio.pause();
        app.querySelector("#listenButton").textContent = "Listen";
      }
    },
    { signal: events.signal },
  );
  let selected = 0;
  function selectDetail(index) {
    selected = index;
    audio.pause();
    app.querySelector("#listenButton").textContent = "Listen";
    const detail = definition.details[index];
    panorama.lookAt(detail.point);
    app.querySelector("#riadDetailTitle").textContent = detail.title;
    app.querySelector("#riadDetailBody").textContent = detail.body;
  }
  const buttons = definition.details.map((detail, index) => {
    const b = document.createElement("button");
    b.className = "hotspot";
    b.textContent = detail.title;
    b.onclick = () => selectDetail(index);
    hotspotLayer.append(b);
    return b;
  });
  selectDetail(0);
  const requestedView = new URLSearchParams(location.search).get("view");
  panorama.select(
    Object.hasOwn(runtime.views, requestedView) ? requestedView : undefined,
  );
  app.querySelector("#resetViewButton").onclick = () => {
    audio.pause();
    panorama.select();
  };
  app.querySelector("#listenButton").onclick = async () => {
    const button = app.querySelector("#listenButton");
    if (!audio.paused) {
      audio.pause();
      button.textContent = "Listen";
      return;
    }
    button.textContent = "Loading…";
    audio.src = `/api/narration/${encodeURIComponent(definition.id)}/${encodeURIComponent(definition.details[selected].id)}`;
    try {
      await audio.play();
      button.textContent = "Pause";
    } catch (error) {
      console.error("Could not play detail narration.", error);
      button.textContent = "Audio unavailable";
    }
  };
  audio.onended = () => {
    app.querySelector("#listenButton").textContent = "Listen";
  };
  resize();
  window.addEventListener("resize", resize, { signal: events.signal });
  const observer = new ResizeObserver(resize);
  observer.observe(mount);
  const projected = new THREE.Vector3();
  let last = performance.now(),
    elapsed = 0;
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  const frameDurations = [];
  renderer.setAnimationLoop((now) => {
    frameDurations.push(now - last);
    if (frameDurations.length > 120) frameDurations.shift();
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!motionPreference.matches) {
      elapsed += delta;
      runtime.animations.forEach((fn) => fn(delta, elapsed));
    }
    if (viewer.classList.contains("show-riad-details"))
      runtime.hotspots.forEach((anchor, i) => {
        anchor.getWorldPosition(projected);
        projected.project(camera);
        const b = buttons[i];
        b.hidden = projected.z > 1 || projected.z < 0;
        b.style.left = `${(projected.x * 0.5 + 0.5) * mount.clientWidth}px`;
        b.style.top = `${(-projected.y * 0.5 + 0.5) * mount.clientHeight}px`;
      });
    if (atlasAudio) atlasAudio.update(camera);
    else runtime.soundscape?.update(camera);
    composer.render();
  });
  function dispose() {
    if (disposed) return;
    disposed = true;
    events.abort();
    unsubscribeAudio?.();
    atlasAudio?.setDucked(false);
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    renderer.setAnimationLoop(null);
    observer.disconnect();
    panorama.dispose();
    controls.dispose();
    runtime.dispose?.();
    environment.dispose();
    composer.passes.forEach((pass) => pass.dispose?.());
    composer.dispose();
    renderer.dispose();
    if (activeViewer?.runtime === runtime) activeViewer = null;
  }
  const controller = {
    runtime,
    camera,
    renderer,
    scene,
    dispose,
    selectView: panorama.select,
    get elapsed() {
      return elapsed;
    },
    get frameDurations() {
      return [...frameDurations];
    },
  };
  activeViewer = controller;
  window.addEventListener("pagehide", dispose, { signal: events.signal });
  try {
    await runtime.ready;
    if (disposed) return controller;
    runtime.captureReflections?.(scene);
    app.querySelector("#riadLoading").hidden = true;
  } catch (error) {
    dispose();
    throw error;
  }
  return controller;
}
