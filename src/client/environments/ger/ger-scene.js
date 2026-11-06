import * as THREE from "three";
import { createEnvironmentKit } from "../shared/environment-kit.js";
import { createRecordedSoundscape } from "../shared/recorded-soundscape.js";
import { SOUNDSCAPES } from "../shared/soundscape-profiles.js";
import { buildCutawayTerrain } from "../shared/cutaway-terrain.js";
import { shapedTimber } from "../shared/natural-forms.js";
import { createFoliageWind } from "../outdoors/foliage-wind.js";
import { gerViews } from "../../catalog/ger-catalog.js";
import { gerMaterials } from "./ger-materials.js";
import { buildGerArchitecture } from "./ger-architecture.js";
import { furnishGer } from "./ger-household.js";

function grounds(k, m, miniature) {
  const radius = 6.2;
  const height = (x, z) => {
    const distance = Math.hypot(x, z);
    const near = THREE.MathUtils.smoothstep(distance, 3.25, 7);
    const hills = THREE.MathUtils.smoothstep(distance, 24, 70);
    return (
      -0.02 +
      near *
        (0.035 * Math.sin(x * 1.3 + z * 0.8) + 0.018 * Math.sin(z * 2.8 - x)) +
      hills *
        (4.8 +
          3.6 * Math.sin(x * 0.047 + z * 0.028) +
          2.9 * Math.sin(z * 0.065 - x * 0.032))
    );
  };
  const lands = [new THREE.RingGeometry(0, radius, 160, 50)];
  if (!miniature) lands.push(new THREE.RingGeometry(radius, 120, 160, 90));
  for (const land of lands) {
    land.rotateX(-Math.PI / 2);
    const vertices = land.attributes.position,
      uv = land.attributes.uv;
    const colors = [];
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i),
        z = vertices.getZ(i);
      vertices.setY(i, height(x, z));
      uv.setXY(i, x / 1.8, z / 1.8);
      const path = z > 2.7 && Math.abs(x) < 0.65 + Math.max(0, z - 3) * 0.05;
      const variation =
        0.9 + 0.08 * Math.sin(x * 2.1 + z * 1.7) * Math.cos(z * 0.8 - x * 0.6);
      const color = new THREE.Color(path ? 0xcbb798 : 0xa5ad79).multiplyScalar(
        variation,
      );
      colors.push(color.r, color.g, color.b);
    }
    land.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    land.computeVertexNormals();
    k.mesh(land, m.ground);
  }
  if (miniature) {
    buildCutawayTerrain(k, {
      boundary: Array.from({ length: 160 }, (_, i) => {
        const a = (i * Math.PI * 2) / 160;
        const x = Math.sin(a) * radius,
          z = Math.cos(a) * radius;
        return [x, height(x, z), z];
      }).reverse(),
      bottom: -0.65,
      soilDepth: 0.18,
      soil: k.material(0x7d7155, 1),
      rock: k.material(0x736b5b, 1),
    });
  }
  for (let i = 0; i < 7200; i++) {
    const angle = k.random() * Math.PI * 2;
    const r =
      i < 2600
        ? 3.25 + k.random() ** 0.7 * 2.85
        : 6.25 + k.random() ** 0.7 * 20;
    const x = Math.sin(angle) * r,
      z = Math.cos(angle) * r;
    if (z > 2.8 && Math.abs(x) < 0.65 + (z - 3) * 0.05) continue;
    const heights = Array.from(
      { length: 5 },
      () => 0.025 + k.random() ** 2 * 0.16,
    );
    if (miniature && r > 6.1) continue;
    const cluster = k.sub([x, height(x, z), z], angle);
    for (let j = 0; j < 5; j++) {
      const height = heights[j];
      const geo = new THREE.PlaneGeometry(0.013, height, 1, 4);
      const p = geo.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const t = (p.getY(v) + height / 2) / height;
        p.setXYZ(
          v,
          p.getX(v) * (1 - t * 0.9) + t * t * 0.035,
          t * height,
          t * t * 0.018,
        );
        geo.attributes.uv.setX(v, 0.5);
      }
      geo.computeVertexNormals();
      const blade = k.mesh(
        geo,
        m.grass[i % 3],
        [j * 0.008, 0, 0],
        [0, j * 2.4, 0],
        cluster,
      );
      blade.castShadow = false;
    }
  }
  // A small external work area leaves the doorway and its worn approach clear.
  for (let i = 0; i < 6; i++) {
    const z = 1.5 + (i % 3) * 0.1;
    const y = height(3.7, z) + 0.045 + Math.floor(i / 3) * 0.085;
    shapedTimber(
      k,
      [3.4, y, z],
      [3.96, y + 0.015, z + 0.015],
      0.095,
      m.wood[i % 4],
      k.group,
      { round: true, seed: i, segments: 12, bend: 0.012, relief: 0.004 },
    );
  }
  const bucket = k.sub([3.7, height(3.7, 2.3), 2.3]);
  k.lathe(
    [
      [0, 0],
      [0.16, 0],
      [0.2, 0.3],
      [0.195, 0.31],
      [0.18, 0.3],
      [0.145, 0.018],
      [0, 0.018],
    ],
    [0, 0, 0],
    m.metal,
    bucket,
  );
  k.tube(
    [
      [-0.2, 0.28, 0],
      [-0.17, 0.55, 0],
      [0.17, 0.55, 0],
      [0.2, 0.28, 0],
    ],
    0.008,
    m.steel,
    bucket,
  );
}

export function buildGerEnvironment(
  definition,
  renderer,
  { miniature = false, study } = {},
) {
  const k = createEnvironmentKit(renderer, 73149, { miniature });
  const m = gerMaterials(k);
  const { roof } = buildGerArchitecture(k, m);
  furnishGer(k, m, roof);
  grounds(k, m, miniature);
  k.group.add(new THREE.HemisphereLight(0xc9dcdf, 0x806344, 0.42));
  const sun = new THREE.DirectionalLight(0xffecc9, 3.4);
  sun.position.set(-5, 9, 8);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -9,
    right: 9,
    top: 9,
    bottom: -9,
    near: 0.1,
    far: 40,
  });
  sun.shadow.normalBias = 0.012;
  sun.shadow.bias = -0.0001;
  k.group.add(sun, sun.target);
  const crownLight = new THREE.PointLight(0xdce9f0, 2.1, 6, 2);
  crownLight.position.set(0, 2.65, 0);
  k.group.add(crownLight);
  const doorway = new THREE.RectAreaLight(0xffe6c6, 3.5, 1.05, 1.45);
  doorway.position.set(0, 1, 3.1);
  doorway.lookAt(0, 1, 0);
  k.group.add(doorway);
  const runtime = k.finish(
    definition,
    miniature
      ? {
          whole: study.whole,
          ...gerViews,
          framework: { ...gerViews.framework, shellOpen: false },
          passage: { ...gerViews.passage, shellOpen: false },
          camp: { ...gerViews.camp, shellOpen: false },
        }
      : gerViews,
    {},
    {
      environmentIntensity: 0.22,
      exposure: 1.08,
      soundscape: createRecordedSoundscape(SOUNDSCAPES["mongolian-ger"]),
      depthProbes: [
        {
          id: "ger-door",
          origin: [0, 0.9, 2.4],
          direction: [0, 0, 1],
          minDistance: 3,
        },
      ],
    },
  );
  runtime.background = 0xc3d7df;
  runtime.sun = sun;
  runtime.motions = [];
  if (!miniature) {
    const wind = createFoliageWind(runtime.group);
    k.animations.push((_, time) => wind.update(time));
    const dispose = runtime.dispose;
    let disposed = false;
    runtime.dispose = () => {
      if (disposed) return;
      disposed = true;
      wind.dispose();
      dispose();
    };
  }
  return runtime;
}
