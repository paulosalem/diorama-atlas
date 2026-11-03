import { script, lookControls, waterNormal } from "./common.js";
import { babylonPatina } from "./patina.js";
import { babylonInstances, loadInstances } from "./instances.js";
import { babylonFoliage } from "./foliage.js";
import { babylonMaterialScale } from "./material-scale.js";
import { miniatureCamera } from "./miniature-camera.js";
import { babylonHullWater } from "./hull-water.js";
import { sitePath } from "../site.js";

export async function start(canvas, manifest) {
  const study = manifest.study;
  await script(sitePath("/node_modules/babylonjs/babylon.js"));
  await script(
    sitePath("/node_modules/babylonjs-loaders/babylonjs.loaders.min.js"),
  );
  const B = BABYLON;
  const engine = new B.Engine(canvas, true, {
    stencil: true,
    preserveDrawingBuffer: true,
    ...(study.miniature ? { alpha: true, premultipliedAlpha: false } : {}),
  });
  engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio, 1.5));
  const scene = new B.Scene(engine);
  let presentation;
  try {
    scene.useRightHandedSystem = true;
    scene.clearColor = study.miniature
      ? new B.Color4(0, 0, 0, 0)
      : new B.Color4(0.58, 0.68, 0.76, 1);
    scene.fogMode = B.Scene.FOGMODE_EXP2;
    scene.fogDensity = study.fogDensity;
    scene.fogColor = B.Color3.FromArray(study.fogColor);
    const camera = new B.FreeCamera(
      "Matched camera",
      new B.Vector3(2.35, 1.65, 3.55),
      scene,
    );
    camera.minZ = 0.04;
    camera.maxZ = study.farClip;
    if (study.miniature) {
      presentation = miniatureCamera(B, scene, canvas);
      camera.dispose();
    }
    const cameras = presentation?.cameras ?? [camera];
    const sky = new B.HemisphericLight(
      "Courtyard sky",
      new B.Vector3(0, 1, 0),
      scene,
    );
    sky.intensity = study.miniature ? 0.22 : study.outdoor ? 0.12 : 0.25;
    sky.diffuse = new B.Color3(0.7, 0.82, 1);
    sky.groundColor = study.miniature
      ? new B.Color3(0.52, 0.42, 0.28)
      : new B.Color3(0.3, 0.2, 0.12);
    const sun = new B.DirectionalLight(
      "Late afternoon",
      B.Vector3.FromArray(study.sunTarget)
        .subtract(B.Vector3.FromArray(study.sunPosition))
        .normalize(),
      scene,
    );
    sun.position = B.Vector3.FromArray(study.sunPosition);
    sun.diffuse = study.miniature
      ? new B.Color3(1, 0.87, 0.68)
      : study.outdoor
        ? new B.Color3(1, 0.9, 0.73)
        : new B.Color3(1, 0.84, 0.65);
    sun.intensity = study.miniature ? 3.5 : study.outdoor ? 3.1 : 3.4;
    const cascaded = study.outdoor && !study.miniature;
    const shadow = cascaded
      ? new B.CascadedShadowGenerator(2048, sun)
      : new B.ShadowGenerator(4096, sun);
    if (cascaded) {
      shadow.numCascades = 3;
      shadow.shadowMaxZ = study.shadowDistance;
      shadow.lambda = 0.8;
      shadow.stabilizeCascades = true;
    }
    shadow.usePercentageCloserFiltering = true;
    shadow.filteringQuality = B.ShadowGenerator.QUALITY_HIGH;
    shadow.bias = 0.00015;
    shadow.normalBias = 0.015;
    sun.shadowMinZ = 0.1;
    sun.shadowMaxZ = study.outdoor ? 160 : 45;
    const environment = new B.HDRCubeTexture(
      sitePath("/public/outdoors/detail-assets/daylight-pure-sky_2k.hdr"),
      scene,
      256,
      false,
      true,
      false,
      true,
    );
    scene.environmentTexture = environment;
    scene.environmentIntensity = study.outdoor ? 0.9 : 0.5;
    if (study.outdoor && !study.miniature) {
      const skybox = scene.createDefaultSkybox(environment, true, 2300, 0);
      skybox.material.fogEnabled = false;
    }
    if (study.outdoor)
      B.SceneLoader.OnPluginActivatedObservable.addOnce((loader) => {
        loader.createInstances = false;
      });
    const loaded = await B.SceneLoader.ImportMeshAsync(
      "",
      study.assetRoot,
      study.model,
      scene,
    );
    const instances = await loadInstances(manifest);
    babylonInstances(scene, instances);
    if (study.miniature)
      loaded.meshes.forEach((mesh) => {
        mesh.thinInstanceEnablePicking = true;
      });
    const aged = new Set();
    const winds = new Map();
    const scaled = new Set();
    for (const mesh of loaded.meshes) {
      const material = mesh.material;
      const metadata = manifest.materials.find(
        (entry) => entry.name === material?.name,
      );
      const data = metadata?.patina;
      if (metadata?.metresPerRepeat && !scaled.has(material)) {
        babylonMaterialScale(B, material, metadata.metresPerRepeat);
        scaled.add(material);
      }
      if (data && !aged.has(material)) {
        babylonPatina(B, material, data);
        aged.add(material);
      }
      if (metadata?.wind && !winds.has(material))
        winds.set(material, babylonFoliage(B, material, metadata.wind));
    }
    const normalCanvas = waterNormal();
    const normal = new B.DynamicTexture(
      "Fountain ripples",
      normalCanvas,
      scene,
      true,
    );
    normal.update();
    if (study.outdoor) {
      normal.uScale = study.miniature ? 1 : 180;
      normal.vScale = study.miniature ? 1 : 32;
    }
    for (const mesh of loaded.meshes) {
      mesh.receiveShadows = true;
      if (mesh.material?.getClassName().startsWith("PBR"))
        mesh.material.maxSimultaneousLights =
          manifest.lights.filter((light) => light.type === "PointLight")
            .length + (study.miniature ? 3 : 2);
      if (mesh.getTotalVertices() > 0) shadow.addShadowCaster(mesh);
      if (mesh.material?.name.startsWith("water-")) {
        mesh.material.bumpTexture = normal;
        mesh.material.roughness = 0.09;
        mesh.material.metallic = 0.15;
        if (study.miniature) normal.level = 0.28;
      }
    }
    const mirrors = new Map();
    for (const mesh of loaded.meshes.filter((item) =>
      item.material?.name.startsWith("water-"),
    )) {
      const extent = mesh.getBoundingInfo().boundingBox.extendSizeWorld;
      if (
        mirrors.has(mesh.material) ||
        Math.min(extent.x, extent.z) < 0.2 ||
        extent.y > 0.02
      )
        continue;
      const height = mesh.getBoundingInfo().boundingBox.centerWorld.y;
      const mirror = new B.MirrorTexture(
        `Water reflection ${height}`,
        study.miniature ? 1024 : 512,
        scene,
        true,
      );
      mirror.mirrorPlane = new B.Plane(0, -1, 0, height);
      mirror.renderList = loaded.meshes.filter(
        (item) => !item.material?.name.startsWith("water-"),
      );
      mirror.blurKernel = 4;
      mirror.refreshRate = 2;
      mesh.material.reflectionTexture = mirror;
      mirrors.set(mesh.material, mirror);
    }
    shadow.getShadowMap().refreshRate = study.outdoor
      ? 2
      : B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
    const practicals = [];
    for (const data of manifest.lights.filter(
      (light) => light.type === "PointLight",
    )) {
      const light = new B.PointLight(
        "Lantern bounce",
        B.Vector3.FromArray(data.position),
        scene,
      );
      light.diffuse = B.Color3.FromArray(data.color);
      light.intensity = data.intensity * 0.65;
      light.range = data.distance;
      practicals.push([light, light.intensity]);
    }
    if (study.miniature) {
      const floor = B.MeshBuilder.CreateGround(
        "Quiet studio ground",
        { width: 500, height: 500 },
        scene,
      );
      floor.position.y = -10.6;
      const material = new B.BackgroundMaterial("Soft floating shadow", scene);
      material.shadowOnly = true;
      material.primaryColor = new B.Color3(0.12, 0.19, 0.14);
      material.alpha = 0.22;
      material.opacityFresnel = false;
      floor.material = material;
      floor.receiveShadows = true;
      const bounce = new B.PointLight(
        "Warm light through the quinta",
        new B.Vector3(-7.5, 2.2, -0.8),
        scene,
      );
      bounce.diffuse = new B.Color3(1, 0.82, 0.57);
      bounce.intensity = 4;
      bounce.range = 5;
    }
    const pipeline = new B.DefaultRenderingPipeline(
      "Photographic finish",
      true,
      scene,
      cameras,
    );
    pipeline.samples = 4;
    pipeline.fxaaEnabled = true;
    pipeline.bloomEnabled = true;
    pipeline.bloomWeight = study.miniature ? 0.035 : 0.08;
    pipeline.bloomThreshold = 1.2;
    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    scene.imageProcessingConfiguration.toneMappingType =
      B.ImageProcessingConfiguration.TONEMAPPING_ACES;
    scene.imageProcessingConfiguration.exposure = study.miniature
      ? 1.1
      : study.outdoor
        ? 1.35
        : 1.15;
    const ao = new B.SSAO2RenderingPipeline(
      "Contact shadows",
      scene,
      { ssaoRatio: 0.5, blurRatio: 1 },
      cameras,
    );
    ao.radius = 0.3;
    ao.totalStrength = 0.7;
    ao.samples = 16;
    const steam = new B.ParticleSystem("Fresh mint tea", 80, scene);
    const particle = new B.DynamicTexture("Soft vapour", 64, scene);
    const context = particle.getContext();
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "white");
    gradient.addColorStop(1, "transparent");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    particle.update();
    steam.particleTexture = particle;
    steam.emitter = B.Vector3.FromArray(study.steamPosition ?? [0, 0, 0]);
    steam.minEmitBox = new B.Vector3(-0.02, 0, -0.02);
    steam.maxEmitBox = new B.Vector3(0.02, 0, 0.02);
    steam.color1 = new B.Color4(1, 0.95, 0.83, 0.08);
    steam.color2 = new B.Color4(1, 1, 0.95, 0.04);
    steam.colorDead = new B.Color4(1, 1, 1, 0);
    steam.minSize = 0.025;
    steam.maxSize = 0.07;
    steam.minLifeTime = 2;
    steam.maxLifeTime = 4;
    steam.emitRate = 10;
    steam.direction1 = new B.Vector3(-0.015, 0.1, 0);
    steam.direction2 = new B.Vector3(0.015, 0.15, 0.01);
    steam.minEmitPower = steam.maxEmitPower = 1;
    if (study.steamPosition) steam.start();
    let motionTime = 0;
    let baseRotation;
    const controls = presentation
      ? null
      : lookControls(canvas, (yaw, pitch) => {
          camera.rotation.copyFrom(baseRotation);
          camera.rotation.y += yaw;
          camera.rotation.x -= pitch;
        });
    const moving = (manifest.motions ?? []).map((motion) => {
      const node = scene.getNodeByName(motion.name);
      if (!node || motion.type !== "float")
        throw new Error(`Unsupported scene motion: ${motion.name}`);
      if (node.rotationQuaternion) {
        node.rotationQuaternion.toEulerAnglesToRef(node.rotation);
        node.rotationQuaternion = null;
      }
      return {
        ...motion,
        node,
        position: node.position.clone(),
        rotation: node.rotation.clone(),
      };
    });
    if (manifest.waterExclusion) {
      const profile = manifest.waterExclusion;
      const hull = scene.getNodeByName(profile.name);
      if (!hull)
        throw new Error("The river's hull exclusion is missing its boat.");
      const waterMaterials = new Set(
        loaded.meshes
          .filter((mesh) => mesh.material?.name.startsWith("water-"))
          .map((mesh) => mesh.material),
      );
      for (const material of waterMaterials)
        babylonHullWater(B, material, hull, profile);
    }
    const variants = new Map();
    for (const mesh of loaded.meshes) {
      if (!mesh.material || !mesh.getTotalVertices()) continue;
      const key = `${mesh.material.uniqueId}/${mesh.getVerticesDataKinds().join(",")}/${mesh.hasThinInstances}`;
      if (!variants.has(key)) variants.set(key, mesh);
    }
    await Promise.all(
      [...variants.values()].map((mesh) =>
        mesh.material.forceCompilationAsync(mesh, {
          useInstances: mesh.hasThinInstances,
        }),
      ),
    );
    const bounds = {
      min: [Infinity, Infinity, Infinity],
      max: [-Infinity, -Infinity, -Infinity],
    };
    let finiteGeometry = true;
    for (const mesh of loaded.meshes) {
      if (!mesh.getTotalVertices()) continue;
      finiteGeometry &&= mesh
        .getVerticesDataKinds()
        .filter((kind) => !mesh.getVertexBuffer(kind).getIsInstanced())
        .every((kind) => mesh.getVerticesData(kind).every(Number.isFinite));
      const box = mesh.getBoundingInfo().boundingBox;
      box.minimumWorld.asArray().forEach((value, i) => {
        bounds.min[i] = Math.min(bounds.min[i], value);
      });
      box.maximumWorld.asArray().forEach((value, i) => {
        bounds.max[i] = Math.max(bounds.max[i], value);
      });
    }
    finiteGeometry &&= instances.every(
      (group) =>
        group.matrices.every(Number.isFinite) &&
        group.colors.every(Number.isFinite),
    );
    presentation?.frameBounds(bounds);
    let shadowPasses = 0,
      reflectionPasses = 0;
    if (study.miniature) {
      const shadowMap = shadow.getShadowMap();
      shadowMap.onAfterRenderObservable.add(() => shadowPasses++);
      shadowMap.refreshRate = B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
      mirrors.forEach((mirror) => {
        mirror.onAfterRenderObservable.add(() => reflectionPasses++);
        mirror.refreshRate = B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
      });
      let shadowTick = -1,
        reflectionTick = -1;
      const reflectedView = B.Matrix.Zero(),
        reflectedProjection = B.Matrix.Zero();
      scene.onBeforeRenderObservable.add(() => {
        const tick = Math.floor(motionTime * 10);
        const view = scene.activeCamera.getViewMatrix();
        const projection = scene.activeCamera.getProjectionMatrix();
        if (tick !== shadowTick) {
          shadowMap.resetRefreshCounter();
          shadowTick = tick;
        }
        if (
          tick !== reflectionTick ||
          !view.equals(reflectedView) ||
          !projection.equals(reflectedProjection)
        ) {
          mirrors.forEach((mirror) => mirror.resetRefreshCounter());
          reflectedView.copyFrom(view);
          reflectedProjection.copyFrom(projection);
          reflectionTick = tick;
        }
      });
    }
    return {
      view(view) {
        if (presentation) {
          presentation.view(view);
          return;
        }
        camera.position.copyFromFloats(...view.position);
        camera.setTarget(B.Vector3.FromArray(view.target));
        camera.fov = (view.fov * Math.PI) / 180;
        baseRotation = camera.rotation.clone();
        controls.reset();
      },
      zoom(direction) {
        presentation?.zoom(direction);
      },
      reset() {
        presentation?.reset();
      },
      reducedMotion(value) {
        presentation?.reducedMotion(value);
      },
      pause(paused) {
        loaded.animationGroups.forEach((group) =>
          paused ? group.pause() : group.play(true),
        );
        steam.updateSpeed = paused ? 0 : 0.01;
      },
      render(time) {
        motionTime = time;
        winds.forEach((animate) => animate(time));
        normal.uOffset = time * 0.008;
        normal.vOffset = time * 0.004;
        practicals.forEach(([light, intensity], i) => {
          light.intensity = intensity * (1 + 0.015 * Math.sin(time * 1.7 + i));
        });
        for (const motion of moving) {
          motion.node.position.y =
            motion.position.y + Math.sin(time * 0.65) * motion.amplitude;
          motion.node.rotation.z =
            motion.rotation.z + Math.sin(time * 0.48) * motion.roll;
        }
        scene.render();
      },
      async ready(signal) {
        signal?.throwIfAborted();
        await new Promise((resolve, reject) => {
          const abort = () => reject(signal.reason);
          signal?.addEventListener("abort", abort, { once: true });
          scene.executeWhenReady(() => {
            signal?.removeEventListener("abort", abort);
            resolve();
          }, true);
        });
        shadow.getShadowMap().resetRefreshCounter();
        mirrors.forEach((mirror) => mirror.resetRefreshCounter());
      },
      resize() {
        engine.resize();
        presentation?.resize();
      },
      get cameraMatrix() {
        return scene.activeCamera.getWorldMatrix().asArray();
      },
      dispose() {
        controls?.dispose();
        presentation?.dispose();
        ao.dispose();
        pipeline.dispose();
        scene.dispose();
        engine.dispose();
      },
      probe(origin, direction, length = 100) {
        const ray = new B.Ray(
          B.Vector3.FromArray(origin),
          B.Vector3.FromArray(direction),
          length,
        );
        const hit = scene.pickWithRay(
          ray,
          (mesh) => loaded.meshes.includes(mesh) && mesh.isEnabled(),
        );
        return hit?.hit ? hit.distance : null;
      },
      get inspection() {
        return {
          meshes: loaded.meshes.length,
          finiteGeometry,
          bounds,
          animations:
            loaded.animationGroups.length +
            winds.size +
            (study.outdoor ? 1 : 0),
          instances: instances.reduce((sum, group) => sum + group.count, 0),
          windMaterials: winds.size,
          reflections: mirrors.size,
          patinaMaterials: aged.size,
          animationTime: study.outdoor
            ? motionTime
            : (loaded.animationGroups[0]?.animatables[0]?.masterFrame ?? 0),
          ...(presentation
            ? {
                camera: presentation.inspection,
                motions: moving.length,
                motionTransforms: moving.map(({ node }) => ({
                  position: node.position.asArray(),
                  rotation: node.rotation.asArray(),
                })),
                renderPasses: {
                  shadows: shadowPasses,
                  reflections: reflectionPasses,
                },
                clothFrames: loaded.animationGroups.map(
                  (group) => group.animatables[0]?.masterFrame ?? 0,
                ),
                clothWeights: loaded.meshes
                  .filter((mesh) => mesh.morphTargetManager)
                  .map((mesh) =>
                    Array.from(
                      { length: mesh.morphTargetManager.numTargets },
                      (_, i) => mesh.morphTargetManager.getTarget(i).influence,
                    ),
                  ),
              }
            : {}),
        };
      },
    };
  } catch (error) {
    presentation?.dispose();
    scene.dispose();
    engine.dispose();
    throw error;
  }
}
