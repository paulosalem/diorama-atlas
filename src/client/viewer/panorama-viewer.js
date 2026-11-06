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
import { createMiniatureControls } from "./miniature-controls.js";
import { addOutdoorReferences } from "./outdoor-references.js";
import { addAboutButton } from "./about-atlas.js";
import {
  loadOutdoorDaylight,
  applyOutdoorDaylight,
} from "../environments/outdoors/outdoor-daylight.js";
import { applySurfacePatina } from "../environments/shared/surface-patina.js";
import { getLocale, subscribeLocale, t } from "../localization/locale.js";
import { createSceneNarration } from "./scene-narration.js";
import { hasClearSightline } from "./walking-space.js";
import {
  findNarrationRecording,
  loadNarrationLibrary,
} from "./narration-library.js";
import { sitePath } from "../site.js";
import { resolveSceneVersion } from "../catalog/scene-versions.js";
import { mountSceneVersions } from "./scene-versions.js";

let activeViewer = null;

export function getActiveViewer() {
  return activeViewer;
}

export async function createViewer(
  app,
  definition,
  { audio: atlasAudio, onNavigate, version: requestedVersion, signal } = {},
) {
  signal?.throwIfAborted();
  activeViewer?.dispose();
  const version = resolveSceneVersion(definition, requestedVersion);
  const sharedRuntimeMiniature = definition.environment === "domus";
  if (version?.experience === "miniature" && !sharedRuntimeMiniature) {
    const { createMiniatureViewer } = await import("./miniature-viewer.js");
    signal?.throwIfAborted();
    let miniature;
    miniature = await createMiniatureViewer(app, definition, {
      audio: atlasAudio,
      onNavigate,
      version,
      signal,
      onDispose: () => {
        if (activeViewer === miniature) activeViewer = null;
      },
    });
    if (signal?.aborted) {
      miniature.dispose();
      signal.throwIfAborted();
    }
    activeViewer = miniature;
    return activeViewer;
  }
  const events = new AbortController();
  let disposed = false;
  let narration = null;
  let miniature = null;
  app.innerHTML = `<section class="viewer" id="viewer"><header class="viewer-header"><div><p id="sceneRegion"></p><h1 id="sceneTitle"></h1></div><button id="resetViewButton">Reset view</button></header><div class="canvas-mount" id="canvasMount"><div class="hotspot-layer" id="hotspotLayer"></div><aside class="riad-detail-caption"><h2 id="riadDetailTitle"></h2><p id="riadDetailBody"></p><button id="listenButton">Listen</button></aside><div class="scene-loading" id="riadLoading" role="status">Preparing the space…</div></div><div class="riad-toolbar" id="riadToolbar"><div class="riad-viewpoints"></div><div class="riad-actions"><button id="riadDetails" aria-pressed="false">Show details</button><button id="riadExpand">Back to world</button></div></div><span id="riadViewLabel" class="sr-only" aria-live="polite"></span></section>`;
  document.title = `${t(definition.title)} · Diorama Atlas`;
  const viewer = app.querySelector("#viewer"),
    mount = app.querySelector("#canvasMount"),
    hotspotLayer = app.querySelector("#hotspotLayer");
  const toolbar = app.querySelector("#riadToolbar");
  viewer.setAttribute("aria-busy", "true");
  toolbar.inert = true;
  app.querySelector("#sceneTitle").textContent = t(definition.title);
  const regionLabel = () =>
    [
      t(definition.region),
      ...(definition.draft ? [t("Unfinished local preview")] : []),
    ].join(" · ");
  app.querySelector("#sceneRegion").textContent = regionLabel();
  app.querySelector("#riadLoading").textContent = t("Preparing the space…");
  const headerActions = document.createElement("div");
  headerActions.className = "viewer-header-actions";
  const resetButton = app.querySelector("#resetViewButton");
  resetButton.disabled = true;
  resetButton.textContent = t("Reset view");
  resetButton.before(headerActions);
  addAboutButton(headerActions);
  headerActions.append(resetButton);
  const disposeVersions = sharedRuntimeMiniature
    ? null
    : mountSceneVersions(viewer, definition, version);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  mount.prepend(renderer.domElement);
  const outdoor = definition.environment === "outdoor";
  const photographicDaylight = outdoor || Boolean(definition.daylight);
  if (photographicDaylight) renderer.toneMapping = THREE.AgXToneMapping;
  viewer.classList.toggle("is-outdoor", outdoor);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(57, 1, 0.04, outdoor ? 3000 : 120),
    controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  const generator = new THREE.PMREMGenerator(renderer);
  let environment, daylight;
  try {
    if (photographicDaylight) {
      daylight = await loadOutdoorDaylight(generator, definition.daylight);
      environment = daylight.environment;
    } else {
      const room = new RoomEnvironment();
      try {
        environment = generator.fromScene(room);
      } finally {
        room.dispose();
      }
    }
  } catch (error) {
    controls.dispose();
    renderer.dispose();
    throw new Error("The lighting environment could not be loaded.", {
      cause: error,
    });
  } finally {
    generator.dispose();
  }
  scene.environment = environment.texture;
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
  });
  target.samples = Math.min(4, renderer.capabilities.maxSamples);
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, 1, 1);
  ao.updateGtaoMaterial({
    radius: outdoor ? 0.45 : 0.24,
    distanceExponent: 1,
    thickness: 0.3,
  });
  ao.blendIntensity = outdoor ? 0.48 : 0.7;
  composer.addPass(ao);
  if (!outdoor)
    composer.addPass(
      new UnrealBloomPass(new THREE.Vector2(1, 1), 0.035, 0.32, 0.62),
    );
  composer.addPass(new OutputPass());
  let runtime;
  try {
    runtime = outdoor
      ? (
          await import("../environments/outdoors/outdoor-scenes.js")
        ).buildOutdoorEnvironment(definition, renderer)
      : definition.environment === "fale"
        ? (
            await import("../environments/fale/fale-scene.js")
          ).buildFaleEnvironment(definition, renderer)
        : definition.environment === "sauna"
          ? (
              await import("../environments/sauna/sauna-scene.js")
            ).buildSaunaEnvironment(definition, renderer)
          : definition.environment === "ger"
            ? (
                await import("../environments/ger/ger-scene.js")
              ).buildGerEnvironment(definition, renderer)
            : definition.environment === "domus"
              ? (
                  await import("../environments/domus/domus-scene.js")
                ).buildDomusEnvironment(definition, renderer)
              : definition.id === "riad"
                ? buildRiadEnvironment(definition, renderer)
                : buildInteriorEnvironment(definition, renderer);
  } catch (error) {
    environment.dispose();
    daylight?.texture.dispose();
    composer.passes.forEach((pass) => pass.dispose?.());
    composer.dispose();
    controls.dispose();
    renderer.dispose();
    throw error;
  }
  scene.add(runtime.group);
  scene.background = new THREE.Color(runtime.background ?? 0xc7d8df);
  if (daylight) applyOutdoorDaylight(scene, runtime, daylight);
  if (runtime.fog)
    scene.fog = new THREE.FogExp2(runtime.fog.color, runtime.fog.density);
  renderer.toneMappingExposure =
    (runtime.exposure ?? 0.94) * (daylight?.exposureGain ?? 1);
  scene.environmentIntensity =
    (runtime.environmentIntensity ?? 0.36) * (daylight?.intensity ?? 1);
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
    miniature?.resize();
  }
  function exit() {
    const destination = sitePath(definition.draft ? "/?draft=1" : "/");
    if (onNavigate) onNavigate(destination);
    else location.href = destination;
  }
  const panorama = createPanoramaControls({
    camera,
    canvas: renderer.domElement,
    controls,
    viewer,
    onResize: resize,
    onView: (label, key) => {
      app.querySelector("#riadViewLabel").textContent = t(label);
      narration?.select(key);
    },
    onDetails: (show) => {
      stopNarration();
      narration?.setDetailsVisible(show);
    },
    onExit: exit,
  });
  panorama.activate(runtime, definition);
  if (outdoor || definition.references)
    addOutdoorReferences(viewer, definition);
  const audio = new Audio();
  audio.preload = "none";
  let detailRequest = 0;
  const listenButton = app.querySelector("#listenButton");
  const voiceNote = document.createElement("small");
  voiceNote.textContent = t("AI-generated voice");
  listenButton.after(voiceNote);
  let listenState = "Listen";
  function setListenState(value) {
    listenState = value;
    listenButton.textContent = t(value);
  }
  function stopNarration() {
    detailRequest++;
    audio.pause();
    atlasAudio?.setDucked(false);
    setListenState("Listen");
  }
  audio.addEventListener("play", () => atlasAudio?.beginNarration(), {
    signal: events.signal,
  });
  for (const event of ["pause", "ended", "error"])
    audio.addEventListener(event, () => atlasAudio?.setDucked(false), {
      signal: events.signal,
    });
  const unsubscribeAudio = atlasAudio?.subscribe(() => {
    if (!atlasAudio.inspection.ownsPlayback) stopNarration();
  });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) stopNarration();
    },
    { signal: events.signal },
  );
  let selected = 0;
  function selectDetail(index) {
    selected = index;
    stopNarration();
    const detail = definition.details[index];
    panorama.lookAt(detail.point);
    app.querySelector("#riadDetailTitle").textContent = t(detail.title);
    app.querySelector("#riadDetailBody").textContent = t(detail.body);
  }
  const buttons = definition.details.map((detail, index) => {
    const b = document.createElement("button");
    b.className = "hotspot";
    b.textContent = t(detail.title);
    b.onclick = () => selectDetail(index);
    hotspotLayer.append(b);
    return b;
  });
  selectDetail(0);
  const unsubscribeLocale = subscribeLocale(() => {
    if (narration?.snapshot.state !== "playing") stopNarration();
    document.title = `${t(definition.title)} · Diorama Atlas`;
    voiceNote.textContent = t("AI-generated voice");
    app.querySelector("#sceneTitle").textContent = t(definition.title);
    app.querySelector("#sceneRegion").textContent = regionLabel();
    resetButton.textContent = t("Reset view");
    app.querySelector("#riadLoading").textContent = t("Preparing the space…");
    app.querySelector("#riadDetailTitle").textContent = t(
      definition.details[selected].title,
    );
    app.querySelector("#riadDetailBody").textContent = t(
      definition.details[selected].body,
    );
    buttons.forEach((button, index) => {
      button.textContent = t(definition.details[index].title);
    });
    setListenState(listenState);
  });
  const requestedView = new URLSearchParams(location.search).get("view");
  panorama.select(
    Object.hasOwn(runtime.views, requestedView) ? requestedView : undefined,
  );
  app.querySelector("#resetViewButton").onclick = () => {
    stopNarration();
    if (miniature?.active) miniature.select();
    else panorama.select();
  };
  app.querySelector("#listenButton").onclick = async () => {
    if (!audio.paused) {
      stopNarration();
      return;
    }
    const attempt = ++detailRequest;
    setListenState("Loading…");
    try {
      const recording = findNarrationRecording(
        await loadNarrationLibrary(),
        getLocale(),
        t(definition.details[selected].body),
      );
      if (disposed || attempt !== detailRequest) return;
      if (!recording)
        throw new Error("No OpenAI recording is available for this detail.");
      audio.src = recording.file;
      await audio.play();
      if (disposed || attempt !== detailRequest) return;
      setListenState("Pause");
    } catch (error) {
      if (disposed || attempt !== detailRequest) return;
      console.error("Could not play detail narration.", error);
      setListenState("Audio unavailable");
    }
  };
  audio.onended = () => {
    setListenState("Listen");
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
  const renderFrame = (now) => {
    frameDurations.push(now - last);
    if (frameDurations.length > 120) frameDurations.shift();
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    panorama.update(delta);
    runtime.updateCamera?.(camera, controls.target);
    if (!motionPreference.matches) {
      elapsed += delta;
      runtime.animations.forEach((fn) => fn(delta, elapsed));
    }
    if (!miniature?.active && viewer.classList.contains("show-riad-details"))
      runtime.hotspots.forEach((anchor, i) => {
        anchor.getWorldPosition(projected);
        projected.project(camera);
        const b = buttons[i];
        b.hidden =
          projected.z > 1 ||
          projected.z < 0 ||
          Math.abs(projected.x) > 0.96 ||
          Math.abs(projected.y) > 0.94 ||
          (runtime.walking &&
            (camera.position.distanceTo(anchor.position) > 8 ||
              !hasClearSightline(
                runtime.walking.walls,
                camera.position,
                anchor.position,
              )));
        b.style.left = `${(projected.x * 0.5 + 0.5) * mount.clientWidth}px`;
        b.style.top = `${(-projected.y * 0.5 + 0.5) * mount.clientHeight}px`;
      });
    if (atlasAudio) atlasAudio.update(camera);
    else runtime.soundscape?.update(camera);
    narration?.update(now);
    composer.render();
  };
  function dispose() {
    if (disposed) return;
    disposed = true;
    events.abort();
    disposeVersions?.();
    unsubscribeAudio?.();
    unsubscribeLocale();
    narration?.dispose();
    stopNarration();
    audio.removeAttribute("src");
    audio.load();
    renderer.setAnimationLoop(null);
    observer.disconnect();
    miniature?.dispose();
    panorama.dispose();
    controls.dispose();
    runtime.dispose?.();
    environment.dispose();
    daylight?.texture.dispose();
    composer.passes.forEach((pass) => pass.dispose?.());
    composer.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    if (activeViewer?.runtime === runtime) activeViewer = null;
  }
  const controller = {
    runtime,
    camera,
    renderer,
    scene,
    get narration() {
      return narration;
    },
    dispose,
    selectView(key) {
      if (miniature?.active) miniature.setMode("interior");
      panorama.select(key);
    },
    setMode(mode) {
      if (!miniature)
        throw new Error("This environment has no miniature view.");
      miniature.setMode(mode);
    },
    selectMiniatureView(key) {
      if (!miniature)
        throw new Error("This environment has no miniature view.");
      miniature.setMode("miniature");
      miniature.select(key);
    },
    get mode() {
      return miniature?.active ? "miniature" : "interior";
    },
    lookAt: panorama.lookAt,
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
    const patina = applySurfacePatina(runtime.group, definition, runtime.views);
    runtime.patina = patina.stats;
    runtime.patinaController = patina;
    runtime.miniature?.setActive(false);
    runtime.captureReflections?.(scene);
    if (runtime.miniature) {
      let narrationMode = false;
      let interiorNarration = requestedView ?? Object.keys(runtime.views)[0];
      miniature = createMiniatureControls({
        runtime,
        camera,
        controls,
        canvas: renderer.domElement,
        viewer,
        panorama,
        onExit: exit,
        onSelect: (key) => narration?.select(`miniature-${key}`),
        onChange: (active) => {
          if (active !== narrationMode) {
            if (
              active &&
              narration &&
              !narration.snapshot.view.startsWith("miniature-")
            )
              interiorNarration = narration.snapshot.view;
            stopNarration();
            narration?.setDetailsVisible(
              !active && viewer.classList.contains("show-riad-details"),
            );
            narration?.select(
              active ? `miniature-${miniature.selected}` : interiorNarration,
            );
            narrationMode = active;
          }
          scene.background.set(
            active ? runtime.miniature.background : runtime.background,
          );
          scene.environmentIntensity = active
            ? runtime.miniature.environmentIntensity
            : runtime.environmentIntensity;
          renderer.toneMappingExposure = active
            ? runtime.miniature.exposure
            : runtime.exposure;
          renderer.localClippingEnabled = active && runtime.miniature.cutaway;
          // GTAO's normal override cannot represent per-material section planes.
          ao.enabled = !renderer.localClippingEnabled;
        },
      });
      miniature.setMode(version.id, { updateUrl: false });
      if (
        miniature.active &&
        Object.hasOwn(runtime.miniature.views, requestedView)
      )
        miniature.select(requestedView, { notify: false, updateUrl: false });
      resize();
      miniature.ready();
    }
    composer.render();
    last = performance.now();
    renderer.setAnimationLoop(renderFrame);
    app.querySelector("#riadLoading").hidden = true;
    resetButton.disabled = false;
    toolbar.inert = false;
    viewer.setAttribute("aria-busy", "false");
    if (atlasAudio && definition.narration !== "browser") {
      narration = createSceneNarration({
        viewer,
        sceneId: definition.id,
        views: runtime.views,
        additionalViews: Object.fromEntries(
          Object.entries(runtime.miniature?.views ?? {}).map(([key, view]) => [
            `miniature-${key}`,
            { ...view, narrationView: definition.miniatureNarration[key] },
          ]),
        ),
        camera,
        audio,
        atlasAudio,
        stopNarration,
        initialView: miniature?.active
          ? `miniature-${miniature.selected}`
          : requestedView,
      });
    }
  } catch (error) {
    dispose();
    throw error;
  }
  return controller;
}
