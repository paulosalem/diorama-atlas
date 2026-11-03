import * as pc from "/lab/vendor/playcanvas/build/playcanvas.mjs";
import { lookControls, waterNormal } from "/src/client/rendering/common.js";
import { playcanvasPatina } from "/src/client/rendering/patina.js";
import {
  loadInstances,
  playcanvasInstances,
} from "/src/client/rendering/instances.js";
import { playcanvasFoliage } from "/src/client/rendering/foliage.js";
import { playcanvasMaterialScale } from "/src/client/rendering/material-scale.js";
import { playcanvasPlanarWater } from "./planar-water.js";

function asset(app, name, type, url) {
  return new Promise((resolve, reject) => {
    const item = new pc.Asset(name, type, { url });
    item.once("load", () => resolve(item));
    item.once("error", (error) => reject(new Error(`${name}: ${error}`)));
    app.assets.add(item);
    app.assets.load(item);
  });
}
export async function start(canvas, manifest) {
  const study = manifest.study;
  const app = new pc.Application(canvas, {
    graphicsDeviceOptions: { antialias: true, alpha: false },
  });
  try {
    app.graphicsDevice.maxPixelRatio = Math.min(devicePixelRatio, 1.5);
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    app.scene.ambientLight = new pc.Color(0.12, 0.15, 0.19);
    if (study.outdoor) {
      app.scene.fog.type = pc.FOG_EXP2;
      app.scene.fog.color.set(...study.fogColor);
      app.scene.fog.density = study.fogDensity;
    }
    const camera = new pc.Entity("Matched camera");
    camera.addComponent("camera", {
      nearClip: 0.04,
      farClip: study.farClip,
      clearColor: new pc.Color(0.58, 0.68, 0.76),
    });
    camera.camera.toneMapping = pc.TONEMAP_ACES;
    app.root.addChild(camera);
    const finish = new pc.CameraFrame(app, camera.camera);
    finish.rendering.toneMapping = pc.TONEMAP_ACES;
    finish.rendering.samples = 4;
    finish.ssao.type = pc.SSAOTYPE_COMBINE;
    finish.ssao.intensity = 0.6;
    finish.ssao.radius = 0.3;
    finish.bloom.intensity = 0.006;
    finish.update();
    const sun = new pc.Entity("Late afternoon");
    sun.addComponent("light", {
      type: "directional",
      color: new pc.Color(1, 0.93, 0.82),
      intensity: 1.8,
      castShadows: true,
      shadowResolution: 4096,
      shadowDistance: study.outdoor ? study.shadowDistance : 30,
      shadowBias: 0.1,
      normalOffsetBias: 0.03,
      shadowType: pc.SHADOW_PCF5,
      numCascades: study.outdoor ? 3 : 2,
    });
    sun.setEulerAngles(...study.sunRotation);
    app.root.addChild(sun);
    const practicals = [];
    for (const data of manifest.lights.filter(
      (light) => light.type === "PointLight",
    )) {
      const entity = new pc.Entity("Lantern bounce");
      entity.addComponent("light", {
        type: "omni",
        color: new pc.Color(
          ...data.color.map((v) =>
            v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055,
          ),
        ),
        intensity: data.intensity * 0.06,
        range: data.distance,
        falloffMode: pc.LIGHTFALLOFF_INVERSESQUARED,
      });
      entity.setPosition(...data.position);
      app.root.addChild(entity);
      practicals.push([entity.light, entity.light.intensity]);
    }
    const [model, hdr] = await Promise.all([
      asset(app, study.title, "container", `${study.assetRoot}${study.model}`),
      asset(
        app,
        "Courtyard daylight",
        "texture",
        "/public/outdoors/detail-assets/daylight-pure-sky_2k.hdr",
      ),
    ]);
    const lighting = pc.EnvLighting.generateLightingSource(hdr.resource, {
      size: 256,
    });
    const atlas = pc.EnvLighting.generateAtlas(lighting);
    app.scene.envAtlas = atlas;
    app.scene.skyboxIntensity = study.outdoor ? 0.65 : 0.3;
    const skybox = study.outdoor
      ? pc.EnvLighting.generateSkyboxCubemap(hdr.resource, 512)
      : null;
    if (skybox) app.scene.skybox = skybox;
    const root = model.resource.instantiateRenderEntity();
    app.root.addChild(root);
    const aged = new Set();
    const winds = new Map();
    const scaled = new Set();
    for (const component of root.findComponents("render")) {
      for (const mesh of component.meshInstances) {
        const material = mesh.material;
        const metadata = manifest.materials.find(
          (entry) => entry.name === material.name,
        );
        const data = metadata?.patina;
        if (metadata?.metresPerRepeat && !scaled.has(material)) {
          playcanvasMaterialScale(material, metadata.metresPerRepeat);
          scaled.add(material);
        }
        if (data && !aged.has(material)) {
          playcanvasPatina(pc, app.graphicsDevice, material, data);
          aged.add(material);
        }
        if (metadata?.wind && !winds.has(material))
          winds.set(
            material,
            playcanvasFoliage(pc, app.graphicsDevice, material, metadata.wind),
          );
      }
    }
    const instances = await loadInstances(manifest);
    const instanceBuffers = playcanvasInstances(pc, app, root, instances);
    const normal = new pc.Texture(app.graphicsDevice, {
      name: "Fountain ripples",
      width: 256,
      height: 256,
      mipmaps: true,
      addressU: pc.ADDRESS_REPEAT,
      addressV: pc.ADDRESS_REPEAT,
    });
    normal.setSource(waterNormal());
    const waters = new Set();
    const waterMeshes = [];
    for (const component of root.findComponents("render")) {
      component.castShadows = component.receiveShadows = true;
      for (const mesh of component.meshInstances) {
        if (mesh.material.name.startsWith("water-")) {
          mesh.material.normalMap = normal;
          mesh.material.bumpiness = 0.4;
          mesh.material.gloss = 0.91;
          mesh.material.useMetalness = true;
          mesh.material.metalness = 0.15;
          if (study.outdoor) mesh.material.normalMapTiling.set(180, 32);
          mesh.material.update();
          waters.add(mesh.material);
          waterMeshes.push(mesh);
        }
      }
    }
    const animations = model.resource.animations;
    if (animations.length) {
      root.addComponent("anim", { activate: true });
      const layers = animations.map((entry, i) => ({
        name: `Linen ${i}`,
        states: [{ name: "START" }, { name: "Loop", speed: 1, loop: true }],
        transitions: [{ from: "START", to: "Loop" }],
      }));
      root.anim.loadStateGraph({ layers, parameters: {} });
      animations.forEach((entry, i) =>
        root.anim.layers[i].assignAnimation("Loop", entry.resource),
      );
    }
    const vapourImage = document.createElement("canvas");
    vapourImage.width = vapourImage.height = 64;
    const context = vapourImage.getContext("2d");
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "white");
    gradient.addColorStop(1, "transparent");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const vapour = new pc.Texture(app.graphicsDevice, {
      width: 64,
      height: 64,
    });
    vapour.setSource(vapourImage);
    const steam = new pc.Entity("Fresh mint tea");
    steam.addComponent("particlesystem", {
      numParticles: 40,
      lifetime: 3,
      rate: 0.12,
      rate2: 0.2,
      emitterExtents: new pc.Vec3(0.025, 0, 0.025),
      colorMap: vapour,
      lighting: false,
      blendType: pc.BLEND_NORMAL,
      localVelocityGraph: new pc.CurveSet(
        [0, 0.005, 1, 0.015],
        [0, 0.12, 1, 0.08],
        [0, 0, 1, 0.01],
      ),
      scaleGraph: new pc.Curve([0, 0.02, 1, 0.07]),
      alphaGraph: new pc.Curve([0, 0, 0.2, 0.08, 1, 0]),
    });
    steam.setPosition(...(study.steamPosition ?? [0, 0, 0]));
    steam.enabled = Boolean(study.steamPosition);
    app.root.addChild(steam);
    let base;
    const controls = lookControls(canvas, (yaw, pitch) => {
      const rotation = new pc.Quat().setFromEulerAngles(
        (pitch * 180) / Math.PI,
        (yaw * 180) / Math.PI,
        0,
      );
      camera.setRotation(new pc.Quat().mul2(base, rotation));
    });
    const reflection = study.outdoor
      ? null
      : new pc.Texture(app.graphicsDevice, {
          name: "Courtyard reflection",
          width: 256,
          height: 256,
          cubemap: true,
          format: pc.PIXELFORMAT_RGBA16F,
          mipmaps: false,
        });
    const probePosition = new pc.Vec3(...study.probePosition);
    const faces = [
      [
        [1, 0, 0],
        [0, -1, 0],
      ],
      [
        [-1, 0, 0],
        [0, -1, 0],
      ],
      [
        [0, 1, 0],
        [0, 0, 1],
      ],
      [
        [0, -1, 0],
        [0, 0, -1],
      ],
      [
        [0, 0, 1],
        [0, -1, 0],
      ],
      [
        [0, 0, -1],
        [0, -1, 0],
      ],
    ];
    const probeCameras = study.outdoor
      ? []
      : faces.map(([direction, up], face) => {
          const entity = new pc.Entity(`Reflection face ${face}`);
          entity.addComponent("camera", {
            fov: 90,
            aspectRatio: 1,
            aspectRatioMode: pc.ASPECT_MANUAL,
            nearClip: 0.05,
            farClip: study.probeFar,
            priority: -10 + face,
            clearColor: new pc.Color(0.58, 0.68, 0.76),
            renderTarget: new pc.RenderTarget({
              colorBuffer: reflection,
              face,
              depth: true,
            }),
          });
          entity.camera.toneMapping = pc.TONEMAP_NONE;
          entity.camera.gammaCorrection = pc.GAMMA_NONE;
          entity.setPosition(probePosition);
          entity.lookAt(
            probePosition.clone().add(new pc.Vec3(...direction)),
            new pc.Vec3(...up),
          );
          app.root.addChild(entity);
          return entity;
        });
    waterMeshes.forEach((mesh) => {
      mesh.visible = false;
    });
    const captured = new Promise((resolve) => app.once("postrender", resolve));
    app.start();
    await captured;
    for (const entity of probeCameras) {
      entity.camera.renderTarget.destroy();
      entity.destroy();
    }
    waterMeshes.forEach((mesh) => {
      mesh.visible = true;
    });
    const localLighting =
      reflection &&
      pc.EnvLighting.generateLightingSource(reflection, {
        size: 256,
      });
    const localAtlas =
      localLighting && pc.EnvLighting.generateAtlas(localLighting);
    for (const material of localAtlas ? waters : []) {
      material.envAtlas = localAtlas;
      material.cubeMapProjection = pc.CUBEPROJ_BOX;
      material.cubeMapProjectionBox = new pc.BoundingBox(
        probePosition,
        new pc.Vec3(...study.probeSize).mulScalar(0.5),
      );
      material.update();
    }
    const planar = study.outdoor
      ? playcanvasPlanarWater(pc, app, camera, waterMeshes, study)
      : null;
    let motionTime = 0;
    return {
      view(view) {
        camera.setPosition(...view.position);
        camera.lookAt(new pc.Vec3(...view.target));
        camera.camera.fov = view.fov;
        base = camera.getRotation().clone();
        controls.reset();
      },
      pause(paused) {
        app.timeScale = paused ? 0 : 1;
      },
      render(time) {
        motionTime = time;
        planar?.update(time);
        winds.forEach((animate) => animate(time));
        waters.forEach((material) => {
          material.normalMapOffset.set(time * 0.008, time * 0.004);
          material.update();
        });
        practicals.forEach(([light, intensity], i) => {
          light.intensity = intensity * (1 + 0.015 * Math.sin(time * 1.7 + i));
        });
        finish.update();
      },
      resize() {
        app.resizeCanvas();
      },
      dispose() {
        planar?.dispose();
        controls.dispose();
        finish.destroy();
        normal.destroy();
        vapour.destroy();
        atlas.destroy();
        lighting.destroy();
        localAtlas?.destroy();
        localLighting?.destroy();
        reflection?.destroy();
        skybox?.destroy();
        instanceBuffers.forEach((buffer) => buffer.destroy());
        app.destroy();
      },
      get fps() {
        return app.stats.frame.fps;
      },
      get inspection() {
        return {
          meshes: root
            .findComponents("render")
            .reduce(
              (sum, component) => sum + component.meshInstances.length,
              0,
            ),
          animations: animations.length + winds.size + (study.outdoor ? 1 : 0),
          instances: instances.reduce((sum, group) => sum + group.count, 0),
          windMaterials: winds.size,
          reflections: 1,
          patinaMaterials: aged.size,
          animationTime: study.outdoor
            ? motionTime
            : (root.anim?.layers[0]?.activeStateCurrentTime ?? 0),
        };
      },
    };
  } catch (error) {
    app.destroy();
    throw error;
  }
}
