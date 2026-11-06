import * as THREE from "three";
import { buildOutdoorEnvironment } from "../outdoors/outdoor-scenes.js";
import { configureOutdoorMaterialScale } from "../outdoors/outdoor-material-scale.js";
import {
  buildCutawayTerrain,
  buildTerrainStrip,
} from "../shared/cutaway-terrain.js";
import { sectionEnvironment } from "./sectioned-environment.js";
import { landscapeSections } from "../../catalog/miniature-compositions.js";

function coastline(x, z) {
  const curve =
    6.5 * Math.exp(-((x - 24) ** 2) / 289) -
    4 * Math.exp(-((x + 12) ** 2) / 256) +
    Math.sin(x * 0.13) * 2.2;
  const base = Math.max(
    -37.5,
    -3.8 +
      Math.min(0, z + 8 + curve) * 0.48 -
      Math.max(0, Math.abs(x) - 30) * 0.52,
  );
  return (
    base +
    (Math.sin(x * 0.11) * 1.1 + Math.cos(z * 0.16 + x * 0.075) * 0.8) *
      THREE.MathUtils.smoothstep(base, -35.8, -29) -
    0.16
  );
}

function trimCoastalWater(section, ownership) {
  const water = [];
  section.group.traverse((mesh) => {
    if (mesh.material?.userData.nativeWater) water.push(mesh);
  });
  for (const mesh of water) {
    mesh.geometry.computeBoundingBox();
    const height = mesh.geometry.boundingBox.min.y;
    const { min, max } = section.box;
    const shore = (x) => {
      let back = min.z,
        front = max.z;
      if (coastline(x, back) + 0.16 >= height) return back;
      if (coastline(x, front) + 0.16 <= height) return front;
      for (let i = 0; i < 32; i++) {
        const middle = (back + front) / 2;
        if (coastline(x, middle) + 0.16 < height) back = middle;
        else front = middle;
      }
      return (back + front) / 2;
    };
    const samples = Math.ceil((max.x - min.x) / 0.35);
    if (
      !Array.from(
        { length: samples + 1 },
        (_, i) => shore(min.x + ((max.x - min.x) * i) / samples) > min.z + 1e-6,
      ).some(Boolean)
    ) {
      mesh.removeFromParent();
      continue;
    }
    buildTerrainStrip(
      {
        mesh(geometry) {
          mesh.geometry = ownership.own(geometry);
          return mesh;
        },
      },
      mesh.material,
      (x) => [height, shore(x)],
      () => [height, min.z],
      {
        left: min.x,
        right: max.x,
        samples,
      },
    );
  }
}

function foundation(section, composition, ownership, sampleMaterial) {
  const { box, group } = section;
  const boundary = [];
  const corners = [
    [box.min.x, box.min.z],
    [box.max.x, box.min.z],
    [box.max.x, box.max.z],
    [box.min.x, box.max.z],
  ];
  for (let side = 0; side < 4; side++) {
    const a = corners[side],
      b = corners[(side + 1) % 4];
    const count = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.8);
    for (let i = 0; i < count; i++) {
      const x = a[0] + ((b[0] - a[0]) * i) / count,
        z = a[1] + ((b[1] - a[1]) * i) / count;
      const y =
        composition.ground === null
          ? coastline(x, z)
          : typeof composition.ground === "function"
            ? composition.ground(x, z)
            : composition.ground;
      boundary.push([x, y, z]);
    }
  }
  const rock = ownership.own(
    new THREE.MeshStandardMaterial({
      color: composition.color,
      roughness: 0.98,
      map: sampleMaterial?.map ?? null,
      normalMap: sampleMaterial?.normalMap ?? null,
      roughnessMap: sampleMaterial?.roughnessMap ?? null,
      normalScale: new THREE.Vector2(0.3, 0.3),
    }),
  );
  const soil = ownership.own(rock.clone());
  soil.color.multiplyScalar(0.73);
  for (const [material, profile] of [
    [rock, "stone"],
    [soil, "earth"],
  ]) {
    material.userData.patinaProfile = profile;
    material.userData.metresPerRepeat = 2;
    material.userData.diffuseDetailMode = "tinted-grain";
    material.userData.diffuseDetailStrength = 0.45;
    const normalize = configureOutdoorMaterialScale(material);
    normalize?.();
  }
  const kit = {
    mesh(geometry, material, position = [0, 0, 0]) {
      const mesh = new THREE.Mesh(ownership.own(geometry), material);
      mesh.position.fromArray(position);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    },
  };
  buildCutawayTerrain(kit, {
    boundary,
    bottom: composition.bottom,
    soilDepth: 0.32,
    soil,
    rock,
  });
}

export function buildLandscapeMiniature(definition, renderer, study) {
  const composition = landscapeSections[definition.id];
  if (!composition)
    throw new Error(`No landscape miniature composition for ${definition.id}.`);
  const runtime = buildOutdoorEnvironment(definition, renderer);
  let ownership,
    disposed = false;
  const originalDispose = runtime.dispose;
  runtime.dispose = () => {
    if (disposed) return;
    disposed = true;
    ownership?.dispose();
    originalDispose();
  };
  runtime.motions = [];
  const [left, back, right, front] = composition.bounds;
  const min = [left, composition.bottom + 0.1, back],
    max = [right, 60, front];
  const firstMax = [...max],
    secondMin = [...min];
  firstMax[composition.axis] = composition.split;
  secondMin[composition.axis] = composition.split;
  const offset = [0, 0, 0];
  offset[composition.axis] =
    definition.id === "tunisian-terrace-cafe" ? 4 : 2.2;
  const translate = (point) =>
    point.map(
      (value, axis) =>
        value +
        (point[composition.axis] >= composition.split ? offset[axis] : 0),
    );
  runtime.views = Object.fromEntries(
    Object.entries(runtime.views).map(([key, value]) => [
      key,
      {
        ...value,
        position: translate(value.position),
        target: translate(value.target),
      },
    ]),
  );
  runtime.views = { whole: study.whole, ...runtime.views };
  if (runtime.depthProbes)
    runtime.depthProbes = runtime.depthProbes.map((probe) => ({
      ...probe,
      origin: translate(probe.origin),
    }));
  runtime.ready = runtime.ready.then(() => {
    if (disposed) return;
    let stone;
    runtime.group.traverse((object) => {
      if (
        !stone &&
        /\/materials\/rock_/.test(object.material?.map?.image?.src ?? "")
      )
        stone = object.material;
    });
    ownership = sectionEnvironment(runtime, [
      { min, max: firstMax, name: "First complete landscape section" },
      {
        min: secondMin,
        max,
        offset,
        name: "Second complete landscape section",
      },
    ]);
    ownership.sections.forEach((section) => {
      if (composition.ground === null) trimCoastalWater(section, ownership);
      foundation(section, composition, ownership, stone);
    });
    runtime.sections = ownership.sections.map(({ box, offset: shift }) => ({
      min: box.min.toArray(),
      max: box.max.toArray(),
      offset: shift,
    }));
  });
  return runtime;
}
