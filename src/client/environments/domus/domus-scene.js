import * as THREE from "three";
import { createEnvironmentKit } from "../shared/environment-kit.js";
import { configureWaterMaterial } from "../shared/water-flow.js";
import { createCameraLightCulling } from "../shared/camera-light-culling.js";
import { createRecordedSoundscape } from "../shared/recorded-soundscape.js";
import { SOUNDSCAPES } from "../shared/soundscape-profiles.js";
import { createDomusMaterials } from "./domus-materials.js";
import { buildDomusArchitecture } from "./domus-architecture.js";
import { createDomusObjects } from "./domus-objects.js";
import { furnishDomus } from "./domus-household.js";
import { createDomusMiniature } from "./domus-miniature.js";
import { domusViews, domusRooms, DOMUS_EYE_HEIGHT } from "./domus-layout.js";

export function buildDomusEnvironment(definition, renderer) {
  const kit = createEnvironmentKit(renderer, 6079);
  const m = createDomusMaterials(kit);
  const architecture = buildDomusArchitecture(kit, m);
  const objects = createDomusObjects(kit, m, architecture);
  const anchors = furnishDomus(kit, m, architecture, objects);
  const steamMap = kit.texture(
    (context, size) => {
      const gradient = context.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2,
      );
      gradient.addColorStop(0, "rgba(255,255,255,0.35)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    },
    [1, 1],
    64,
  );
  for (let i = 0; i < 12; i++) {
    const material = kit.ownMaterial(
      new THREE.SpriteMaterial({
        map: steamMap,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    const vapor = new THREE.Sprite(material);
    kit.group.add(vapor);
    kit.animations.push((_, elapsed) => {
      const age = (elapsed * 0.19 + i / 12) % 1;
      vapor.position.set(
        13.65 + Math.sin(i * 2.4 + elapsed * 0.4) * age * 0.075,
        1.45 + age * 0.52,
        7 + Math.cos(i * 1.7) * 0.05,
      );
      vapor.scale.setScalar(0.07 + age * 0.2);
      material.opacity = Math.sin(age * Math.PI) * 0.18;
    });
  }
  const time = { value: 0 };
  const water = kit.ownMaterial(
    new THREE.MeshPhysicalMaterial({
      color: 0x7d9991,
      roughness: 0.16,
      metalness: 0.05,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
    }),
  );
  configureWaterMaterial(water, {
    time,
    disturbance: { value: new THREE.Vector4(0, 0, 0, 0) },
  });
  const pool = kit.mesh(
    new THREE.PlaneGeometry(3.1, 3.8),
    water,
    [0, -0.14, 6],
    [-Math.PI / 2, 0, 0],
  );
  pool.castShadow = false;
  const gardenWater = kit.mesh(
    new THREE.CircleGeometry(0.55, 48),
    water,
    [0, 0.31, -11],
    [-Math.PI / 2, 0, 0],
  );
  gardenWater.castShadow = false;
  const bathWater = kit.mesh(
    new THREE.PlaneGeometry(1.78, 2.35),
    water,
    [13.55, 0.43, -15],
    [-Math.PI / 2, 0, 0],
  );
  bathWater.castShadow = false;
  kit.animations.push((_, elapsed) => {
    time.value = elapsed;
  });
  kit.group.add(new THREE.HemisphereLight(0xd5e3e9, 0x7e6347, 0.42));
  const sun = new THREE.DirectionalLight(0xffedcc, 3.2);
  sun.position.set(-16, 32, 8);
  sun.target.position.set(0, 0, -3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, {
    left: -25,
    right: 25,
    top: 28,
    bottom: -28,
    near: 0.5,
    far: 85,
  });
  sun.shadow.normalBias = 0.025;
  sun.shadow.bias = -0.00012;
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  let lastShadowUpdate = 0;
  kit.animations.push((_, elapsed) => {
    // Foliage moves less than a shadow texel between these full-resolution captures.
    if (elapsed - lastShadowUpdate >= 0.2) {
      sun.shadow.needsUpdate = true;
      lastShadowUpdate = elapsed;
    }
  });
  kit.group.add(sun, sun.target);
  for (const [position, width, height, intensity] of [
    [[0, 3.85, 6], 4, 4, 1.7],
    [[0, 3.8, -11], 8, 8, 1.5],
  ]) {
    const light = new THREE.RectAreaLight(0xc7d9e0, intensity, width, height);
    light.position.set(...position);
    light.lookAt(position[0], 0, position[2]);
    kit.group.add(light);
  }
  // Subdued bounce compensates for the raster renderer's lack of indirect GI.
  for (const room of domusRooms) {
    if (["atrium", "garden", "passage"].includes(room.id)) continue;
    const [x1, x2, z1, z2] = room.bounds;
    const bounce = new THREE.PointLight(0xffdab2, 1.2, 9, 2);
    bounce.position.set((x1 + x2) / 2, 2.65, (z1 + z2) / 2);
    kit.group.add(bounce);
  }
  const miniature = createDomusMiniature(kit, architecture, sun);
  const runtime = kit.finish(definition, domusViews, anchors, {
    environmentIntensity: 0.2,
    exposure: 1.08,
    aoScale: 0.65,
    soundscape: createRecordedSoundscape(SOUNDSCAPES["roman-domus"]),
  });
  runtime.background = 0xbdd4dd;
  runtime.walking = {
    bounds: architecture.bounds,
    obstacles: architecture.obstacles,
    walls: architecture.sightWalls,
    eyeHeight: DOMUS_EYE_HEIGHT,
  };
  runtime.rooms = domusRooms;
  runtime.miniature = miniature;
  const updateLights = createCameraLightCulling(runtime.group, 6);
  updateLights(new THREE.Vector3(...domusViews.atrium.position));
  runtime.updateCamera = (camera, target) =>
    updateLights(miniature.active ? target : camera.position);
  return runtime;
}
