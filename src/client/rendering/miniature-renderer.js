import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { buildMiniatureEnvironment } from "../environments/miniatures/miniature-scenes.js";
import { createOpeningShell } from "../environments/miniatures/opening-shell.js";
import { loadOutdoorDaylight } from "../environments/outdoors/outdoor-daylight.js";
import { createMiniatureWater } from "../environments/outdoors/miniature-water.js";
import { createFoliageWind } from "../environments/outdoors/foliage-wind.js";
import { applySurfacePatina } from "../environments/shared/surface-patina.js";
import { miniatureCamera } from "./miniature-camera.js";
import { inspectGeometry, probeGeometry } from "./scene-inspection.js";

export async function createMiniatureRenderer(
  canvas,
  definition,
  study,
  { signal } = {},
) {
  signal?.throwIfAborted();
  const loading = new AbortController();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = study.exposure ?? 1.3;
  renderer.info.autoReset = false;
  const scene = new THREE.Scene();
  renderer.setClearColor(0x000000, 0);
  const camera = new THREE.PerspectiveCamera(37, 1, 0.025, study.farClip);
  const presentation = miniatureCamera(camera, canvas);
  const generator = new THREE.PMREMGenerator(renderer);
  const reflectionBackground = new THREE.Color(0xc2cfbf);
  const reflectionHooks = [];
  let runtime, daylight, composer, water, wind, floor, ao;
  let disposed = false;
  function withReflectionBackground(capture) {
    const previous = scene.background;
    scene.background ??= reflectionBackground;
    try {
      return capture();
    } finally {
      scene.background = previous;
    }
  }
  function captureReflections() {
    withReflectionBackground(() => runtime.captureReflections(scene));
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    loading.abort();
    signal?.removeEventListener("abort", dispose);
    presentation.dispose();
    reflectionHooks.forEach((restore) => restore());
    water?.dispose();
    wind?.dispose();
    runtime?.dispose();
    floor?.geometry.dispose();
    floor?.material.dispose();
    daylight?.environment.dispose();
    daylight?.texture.dispose();
    generator.dispose();
    composer?.passes.forEach((pass) => pass.dispose?.());
    composer?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
  signal?.addEventListener("abort", dispose, { once: true });
  try {
    runtime = buildMiniatureEnvironment(definition, renderer, study);
    scene.add(runtime.group);
    await Promise.all([
      runtime.ready,
      loadOutdoorDaylight(generator, "broken-clouds", {
        signal: loading.signal,
      }).then((value) => {
        if (disposed) {
          value.environment.dispose();
          value.texture.dispose();
          loading.signal.throwIfAborted();
        }
        daylight = value;
      }),
    ]);
    loading.signal.throwIfAborted();
    generator.dispose();
    scene.environment = daylight.environment.texture;
    scene.environmentIntensity = study.environmentIntensity ?? 0.35;
    runtime.group.traverse((object) => {
      // Dense cutout foliage must retain its silhouette in every offscreen pass.
      if (object.material?.alphaToCoverage)
        object.material.alphaToCoverage = false;
      if (object.isLOD) {
        object.autoUpdate = false;
        object.levels.forEach((level, index) => {
          level.object.visible = index === 0;
        });
      }
    });
    const sun = runtime.sun;
    sun.position.fromArray(study.sunPosition);
    sun.target.position.fromArray(study.sunTarget);
    sun.color.setRGB(1, 0.87, 0.68);
    sun.intensity = study.sunIntensity ?? 3.5;
    const sky = runtime.group.children.find((light) => light.isHemisphereLight);
    if (!sky) throw new Error("The miniature requires authored daylight.");
    sky.intensity = 0.22;
    sky.color.setRGB(0.7, 0.82, 1);
    sky.groundColor.setRGB(0.52, 0.42, 0.28);
    const direction = sun.position.clone().sub(sun.target.position);
    scene.environmentRotation.y =
      daylight.sunAzimuth - Math.atan2(direction.z, direction.x);
    scene.backgroundRotation.copy(scene.environmentRotation);
    if (study.bounce) {
      const bounce = new THREE.PointLight(
        new THREE.Color().setRGB(1, 0.82, 0.57),
        study.bounce.intensity,
        study.bounce.distance,
      );
      bounce.position.fromArray(study.bounce.position);
      scene.add(bounce);
    }
    floor = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.ShadowMaterial({ color: 0x203024, opacity: 0.22 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = study.floorY;
    floor.receiveShadow = true;
    scene.add(floor);
    const patina = applySurfacePatina(runtime.group, definition, runtime.views);
    runtime.patina = patina.stats;
    runtime.patinaController = patina;
    water = createMiniatureWater(runtime, scene, daylight.texture);
    runtime.group.traverse((object) => {
      if (!object.isReflector || water.surfaces.includes(object)) return;
      const capture = object.onBeforeRender;
      reflectionHooks.push(() => {
        object.onBeforeRender = capture;
      });
      object.onBeforeRender = (...args) =>
        withReflectionBackground(() => capture.apply(object, args));
    });
    wind = createFoliageWind(runtime.group);
    if (water.surfaces.length < study.planarReflections)
      throw new Error("The miniature is missing its river reflection.");
    const floating = runtime.motions.map((motion) => {
      const object = runtime.group.getObjectByName(motion.name);
      if (!object) throw new Error(`Missing animated object: ${motion.name}`);
      return { object, motion, y: object.position.y, roll: object.rotation.z };
    });
    const geometry = inspectGeometry(runtime.group);
    if (!geometry.finiteGeometry)
      throw new Error("The miniature contains invalid geometry.");
    const shell = runtime.shell
      ? createOpeningShell(runtime.group, runtime.shell, study.openOffset)
      : null;
    scene.updateMatrixWorld(true);
    const shadowCamera = sun.shadow.camera;
    shadowCamera.position.copy(sun.position);
    shadowCamera.lookAt(sun.target.position);
    shadowCamera.updateMatrixWorld();
    const shadowBounds = new THREE.Box3(
      new THREE.Vector3(...(shell?.sweptBounds ?? geometry.bounds).min),
      new THREE.Vector3(...(shell?.sweptBounds ?? geometry.bounds).max),
    ).applyMatrix4(shadowCamera.matrixWorldInverse);
    Object.assign(shadowCamera, {
      left: shadowBounds.min.x - 3,
      right: shadowBounds.max.x + 3,
      bottom: shadowBounds.min.y - 3,
      top: shadowBounds.max.y + 3,
      near: Math.max(0.1, -shadowBounds.max.z - 10),
      far: -shadowBounds.min.z + 10,
    });
    shadowCamera.updateProjectionMatrix();
    captureReflections();
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
    });
    target.samples = Math.min(4, renderer.capabilities.maxSamples);
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    ao = new GTAOPass(scene, camera, 1, 1);
    ao.updateGtaoMaterial({ radius: 0.3, distanceExponent: 1, thickness: 0.3 });
    ao.blendIntensity = 0.45;
    composer.addPass(ao);
    composer.addPass(new OutputPass());
    function resize() {
      const w = canvas.clientWidth,
        h = canvas.clientHeight;
      if (!w || !h || disposed) return;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      const scale = renderer.getPixelRatio() * 0.75;
      ao.setSize(Math.round(w * scale), Math.round(h * scale));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      presentation.resize();
    }
    resize();
    presentation.frameBounds(geometry.bounds);
    presentation.view(runtime.views[study.defaultView]);
    let lastTime = null,
      shadowTick = -1;
    function frameShell() {
      presentation.frameBounds(shell.bounds());
      presentation.resize();
      sun.shadow.needsUpdate = true;
    }
    const deformable = [];
    runtime.group.traverseVisible((mesh) => {
      if (mesh.geometry?.attributes.position.usage === THREE.DynamicDrawUsage)
        deformable.push(mesh);
    });
    return {
      runtime,
      renderer,
      scene,
      camera,
      view: presentation.view,
      zoom: presentation.zoom,
      reset: presentation.reset,
      reducedMotion: presentation.reducedMotion,
      setOpen(open, immediate = false) {
        if (!shell)
          throw new Error("This miniature does not have an opening shell.");
        shell.setOpen(open, { immediate });
        if (immediate) {
          frameShell();
          captureReflections();
        }
      },
      render(time) {
        if (disposed) return;
        if (shell?.update(performance.now())) {
          frameShell();
          if (!shell.inspection.moving) captureReflections();
        }
        if (time !== lastTime) {
          const delta = lastTime === null ? 0 : Math.max(0, time - lastTime);
          runtime.animations.forEach((animate) => animate(delta, time));
          for (const { object, motion, y, roll } of floating) {
            object.position.y = y + Math.sin(time * 0.83) * motion.amplitude;
            object.rotation.z = roll + Math.sin(time * 0.67) * motion.roll;
          }
          lastTime = time;
        }
        water.update(time);
        wind.update(time);
        const tick = Math.floor(time * 10);
        if (tick !== shadowTick) {
          sun.shadow.needsUpdate = true;
          shadowTick = tick;
        }
        presentation.update();
        renderer.info.reset();
        composer.render();
      },
      resize,
      dispose,
      probe: (origin, direction, length, options) =>
        probeGeometry(runtime.group, origin, direction, length, options),
      get inspection() {
        return {
          ...geometry,
          ...(shell ? { bounds: shell.bounds(), shell: shell.inspection } : {}),
          renderer: "three",
          animations: runtime.animations.length + floating.length + wind.count,
          reflections: water.surfaces.length,
          reflectionCaptures: water.captures,
          animationTime: lastTime,
          camera: presentation.inspection,
          deformationSamples: deformable.map((mesh) => {
            const array = mesh.geometry.attributes.position.array;
            const stride = Math.max(3, Math.floor(array.length / 192) * 3);
            return Array.from(
              { length: Math.ceil(array.length / stride) },
              (_, i) => Array.from(array.slice(i * stride, i * stride + 3)),
            ).flat();
          }),
        };
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
