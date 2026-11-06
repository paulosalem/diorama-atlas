import * as THREE from "three";
import { buildCutawayTerrain } from "../shared/cutaway-terrain.js";
import { birchTree } from "../shared/birch-vegetation.js";
import { shapedTimber } from "../shared/natural-forms.js";
import { createOutdoorWater } from "../outdoors/outdoor-water.js";
import { saunaStoneGeometry } from "./sauna-furnishings.js";

export const saunaShore = (x) =>
  6.7 + 0.45 * Math.sin(x * 0.7) + 0.22 * Math.sin(x * 1.8);
const farShore = (x) => 77 + 3 * Math.sin(x * 0.06);
const pathX = (z) => 1.95 + 0.35 * Math.sin((z - 3.5) * 0.7);

export function saunaGroundHeight(x, z) {
  const shore = saunaShore(x);
  if (z > 50)
    return (
      -0.15 +
      Math.tanh((z - farShore(x)) * 0.26) * 0.65 +
      Math.max(0, z - farShore(x)) * 0.015
    );
  if (z > shore) return -0.15 - Math.min(0.65, (z - shore) * 0.3);
  const slope = THREE.MathUtils.smoothstep(z, 3.9, shore);
  const forest = THREE.MathUtils.smoothstep(
    Math.hypot(x * 0.75, z + 0.5),
    3.2,
    8,
  );
  const beyondClearing = Math.max(0, Math.abs(x) - 8, -7 - z);
  const woodedRise =
    (1 - Math.exp(-beyondClearing / 6)) *
    (1.35 + 0.55 * Math.sin(x * 0.17) + 0.45 * Math.sin(z * 0.21));
  return (
    -0.02 +
    (1 - slope) * forest * (0.045 + 0.025 * Math.sin(x * 2 + z * 1.3)) -
    slope * 0.13 +
    (1 - slope) * woodedRise
  );
}

function patch(k, m, x0, x1, z0, z1, columns, rows) {
  const geometry = new THREE.PlaneGeometry(x1 - x0, z1 - z0, columns, rows);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = geometry.attributes.position,
    colors = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i);
    p.setY(i, saunaGroundHeight(x, z));
    geometry.attributes.uv.setXY(i, x * 0.65, z * 0.65);
    const path = z > 3 && Math.abs(x - pathX(z)) < 0.58;
    const wet = z > saunaShore(x) - 0.35 && z < farShore(x) + 0.4;
    const color = new THREE.Color(wet ? 0x726f55 : path ? 0xc2b194 : 0x89986a);
    color.multiplyScalar(
      0.9 + 0.09 * Math.sin(x * 1.7 + z * 2.8) * Math.sin(z * 0.9),
    );
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const land = k.mesh(geometry, m.ground);
  land.castShadow = false;
}

export function buildSaunaLandscape(k, m, miniature) {
  patch(k, m, -8, 8, -7, 12, 128, 152);
  if (!miniature) {
    const xs = [-80, -8, 8, 80],
      zs = [-80, -7, 12, 105];
    for (let x = 0; x < 3; x++)
      for (let z = 0; z < 3; z++) {
        if (x === 1 && z === 1) continue;
        patch(
          k,
          m,
          xs[x],
          xs[x + 1],
          zs[z],
          zs[z + 1],
          x === 1 ? 128 : 64,
          z === 1 ? 152 : 64,
        );
      }
  } else {
    const boundary = [];
    for (let i = 0; i < 128; i++) boundary.push([-8 + (i / 128) * 16, -7]);
    for (let i = 0; i < 152; i++) boundary.push([8, -7 + (i / 152) * 19]);
    for (let i = 0; i < 128; i++) boundary.push([8 - (i / 128) * 16, 12]);
    for (let i = 0; i < 152; i++) boundary.push([-8, 12 - (i / 152) * 19]);
    buildCutawayTerrain(k, {
      boundary: boundary.map(([x, z]) => [x, saunaGroundHeight(x, z), z]),
      bottom: -1.65,
      soilDepth: 0.18,
      soil: k.material(0x675a42, 1),
      rock: m.stone[1],
    });
  }
  let seed = 81237;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const grass = m.leaf.map(() => ({ positions: [], uv: [], indices: [] }));
  for (let i = 0; i < 10000; i++) {
    const x = -7.8 + random() * 15.6,
      z = -6.8 + random() * 14;
    const length = 0.035 + random() ** 2 * 0.17;
    const angle = random() * Math.PI * 2;
    if (
      (x > -3.2 && x < 3.4 && z > -2.7 && z < 4) ||
      (z > 3.2 && Math.abs(x - pathX(z)) < 0.62) ||
      z > saunaShore(x) - 0.1
    )
      continue;
    const data = grass[i % grass.length];
    for (let blade = 0; blade < 7; blade++) {
      const a = angle + blade * 2.399;
      const bx = x + Math.cos(a) * 0.016,
        bz = z + Math.sin(a) * 0.016;
      const by = saunaGroundHeight(bx, bz);
      const height = length * (0.75 + 0.25 * Math.sin(blade + i));
      const base = data.positions.length / 3;
      for (let row = 0; row <= 4; row++) {
        const t = row / 4;
        const lean = t * t * height * 0.55;
        for (const sign of [-1, 1]) {
          const spread = sign * 0.0045 * (1 - t * 0.98);
          data.positions.push(
            bx + Math.cos(a) * lean - Math.sin(a) * spread,
            by + t * height,
            bz + Math.sin(a) * lean + Math.cos(a) * spread,
          );
          data.uv.push(0.5, t);
        }
        if (row < 4) {
          const v = base + row * 2;
          data.indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
        }
      }
    }
  }
  for (const [i, data] of grass.entries()) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(data.positions, 3),
    );
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(data.uv, 2));
    geo.setIndex(data.indices);
    geo.computeVertexNormals();
    k.mesh(geo, m.leaf[i]);
  }
  const trees = [
    [-5.7, -2.7, 6.7],
    [-6.4, 2.5, 6.2],
    [-4.7, 4.9, 5.5],
    [5.4, -2.8, 6.5],
    [6.8, 2.2, 5.6],
    [4.5, -5.7, 7],
    [-1.6, -5.9, 6.4],
    [-6.3, -6.1, 7.3],
  ];
  if (!miniature) {
    for (let i = 0; i < 24; i++) {
      const side = i % 2 ? -1 : 1;
      trees.push([
        side * (10 + (i % 6) * 3.7),
        -10 - Math.floor(i / 6) * 4.2,
        6 + random() * 2,
      ]);
    }
    for (let i = 0; i < 52; i++) {
      const x = -76 + (i / 51) * 152 + random() * 1.7;
      trees.push([x, farShore(x) + 2.5 + random() * 7, 7 + random() * 4]);
    }
  }
  for (const [i, [x, z, height]] of trees.entries())
    birchTree(k, {
      position: [x, saunaGroundHeight(x, z), z],
      height,
      seed: i + 5,
      leaves: m.leaf,
      bark: m.bark,
      wood: k.m.bark,
      distant: i >= 8,
    });
  const forest = [];
  if (!miniature) {
    for (let i = 0; i < 61; i++) {
      const x = -76 + (i / 60) * 152 + random() * 1.5;
      const z = farShore(x) + 3 + random() * 8;
      forest.push({
        position: [x, saunaGroundHeight(x, z), z],
        height: 7 + random() * 4,
        angle: random() * Math.PI * 2,
      });
    }
    for (let i = 0; i < 25; i++) {
      const x = -28 + (i / 24) * 56 + random();
      const z = -8 - random() * 8;
      forest.push({
        position: [x, saunaGroundHeight(x, z), z],
        height: 6 + random() * 3,
        angle: random() * Math.PI * 2,
      });
    }
  }
  for (let i = 0; i < 75; i++) {
    const x = -7.6 + random() * 15.2,
      z = saunaShore(x) - 0.28 + random() * 0.6;
    if (Math.abs(x - 2.15) < 0.9) continue;
    const radius = 0.035 + random() ** 2 * 0.17;
    k.mesh(
      saunaStoneGeometry(i, radius),
      m.stone[i % 3],
      [x, saunaGroundHeight(x, z) + radius * 0.2, z],
      [i, i * 0.8, 0],
    );
    if (i % 5 > 1) continue;
    for (let j = 0; j < 7; j++) {
      const rx = x + (random() - 0.5) * 0.28,
        rz = z + random() * 0.2;
      const root = [rx, saunaGroundHeight(rx, rz), rz];
      const top = [
        rx + (random() - 0.5) * 0.18,
        root[1] + 0.3 + random() * 0.55,
        rz + 0.04,
      ];
      k.rod(root, top, 0.003, m.leaf[j % 3]);
      k.tube(
        [
          root.map((v, axis) => THREE.MathUtils.lerp(v, top[axis], 0.45)),
          [rx + 0.1, top[1] - 0.1, rz + 0.05],
          [rx + 0.18, top[1] - 0.18, rz + 0.1],
        ],
        0.007,
        m.leaf[j % 3],
      );
    }
  }
  for (let z = 6.0; z < 10.8; z += 0.14)
    shapedTimber(
      k,
      [1.45, 0.11, z],
      [2.85, 0.11, z],
      0.045,
      m.outside[Math.abs(Math.round(z * 9)) % 3],
      k.group,
      { depth: 0.132, taper: 0, segments: 12, relief: 0.0007 },
    );
  for (const x of [1.62, 2.68]) {
    k.box([0.11, 0.15, 5], [x, 0.015, 8.4], m.outside[0]);
    for (const z of [6.2, 8.2, 10.5])
      shapedTimber(
        k,
        [x, saunaGroundHeight(x, z) - 0.16, z],
        [x, 0.09, z],
        0.12,
        m.outside[1],
        k.group,
        { round: true, taper: 0.03, segments: 16 },
      );
  }
  for (const z of [9.5, 10.15]) {
    k.tube(
      [
        [2.73, 0.13, z],
        [2.78, 0.75, z],
        [3.1, 0.75, z],
        [3.18, -0.62, z],
      ],
      0.025,
      m.metal,
    );
  }
  for (const y of [-0.5, -0.22, 0.06])
    k.rod([3.18, y, 9.5], [3.18, y, 10.15], 0.022, m.metal);
  const positions = [],
    uv = [],
    indices = [];
  const half = miniature ? 8 : 80,
    samples = miniature ? 160 : 320;
  for (let i = 0; i <= samples; i++) {
    const x = -half + (i / samples) * half * 2;
    for (const z of [saunaShore(x) + 0.006, miniature ? 12 : farShore(x)]) {
      positions.push(x, -z, 0);
      uv.push(i / samples, z / 90);
    }
    if (i < samples) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  let water;
  if (miniature) {
    const edge = [];
    for (let i = 0; i <= 48; i++)
      edge.push([8, THREE.MathUtils.lerp(saunaShore(8), 12, i / 48)]);
    for (let i = 1; i <= 128; i++) edge.push([8 - i / 8, 12]);
    for (let i = 1; i <= 48; i++)
      edge.push([-8, THREE.MathUtils.lerp(12, saunaShore(-8), i / 48)]);
    const sides = [],
      colors = [],
      faces = [];
    edge.forEach(([x, z], i) => {
      sides.push(x, saunaGroundHeight(x, z), z, x, -0.15, z);
      colors.push(0.22, 0.35, 0.31, 0.43, 0.57, 0.52);
      if (i < edge.length - 1) {
        const v = i * 2;
        faces.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      }
    });
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(sides, 3),
    );
    edgeGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3),
    );
    edgeGeometry.setIndex(faces);
    edgeGeometry.computeVertexNormals();
    const edgeMaterial = k.material(0xffffff, 0.32);
    edgeMaterial.vertexColors = true;
    const liquid = k.mesh(edgeGeometry, edgeMaterial);
    liquid.name = "Lake cut faces above the lakebed";
    liquid.castShadow = false;
    const material = k.material(0x53756f, 0.2);
    material.userData.nativeWater = true;
    water = new THREE.Mesh(k.ownGeometry(geometry), material);
    water.rotation.x = -Math.PI / 2;
  } else {
    water = createOutdoorWater({
      width: half * 2,
      depth: 70,
      color: 0x53756f,
      geometry,
    });
    k.animations.push((_, time) => {
      water.material.uniforms.waterTime.value = time;
    });
  }
  water.position.y = -0.15;
  water.name = "Single Finnish lake surface";
  return { water, forest };
}
