import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { shapedTimber } from "../shared/natural-forms.js";
import { birchSprig } from "../shared/birch-vegetation.js";
import { SAUNA } from "./sauna-architecture.js";
import { timberSteps } from "../shared/timber-steps.js";
import { charredWoodMaterial } from "../shared/charred-wood-material.js";

function bench(
  k,
  m,
  position,
  { width, depth, height, angle = 0, parent = k.group },
) {
  const group = k.sub(position, angle, parent);
  const count = Math.round(depth / 0.11);
  for (let i = 0; i < count; i++) {
    const z = -depth / 2 + ((i + 0.5) * depth) / count;
    shapedTimber(
      k,
      [-width / 2, height - 0.022, z],
      [width / 2, height - 0.022, z],
      0.045,
      m.wood[i % 4],
      group,
      {
        depth: depth / count - 0.009,
        taper: 0,
        bend: 0,
        relief: 0.0004,
        segments: 20,
        seed: i + width * 19,
      },
    );
  }
  for (const x of [-width / 2 + 0.12, width / 2 - 0.12]) {
    for (const z of [-depth / 2 + 0.09, depth / 2 - 0.09])
      shapedTimber(
        k,
        [x, 0, z],
        [x, height - 0.05, z],
        0.065,
        m.wood[1],
        group,
        { taper: 0, segments: 10 },
      );
    k.box([0.075, 0.075, depth], [x, height - 0.08, 0], m.wood[2], group);
  }
  for (const z of [-depth / 2 + 0.07, depth / 2 - 0.07])
    k.box([width - 0.16, 0.09, 0.045], [0, height - 0.1, z], m.wood[0], group);
  return group;
}

function cloth(k, material, position, width, depth, overhang = 0) {
  const geometry = new THREE.PlaneGeometry(width, depth, 24, 32);
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i);
    const edge = depth / 2 - overhang;
    const fall = Math.max(0, z - edge);
    const fold =
      0.004 * (1 + Math.sin(x * 37 + z * 13)) +
      0.012 * Math.exp(-(((x + 0.19 - z * 0.2) / 0.05) ** 2));
    p.setXYZ(
      i,
      x + 0.006 * Math.sin(z * 23) * Math.abs(x / width),
      0.003 + fold * Math.exp(-fall * 14) - fall * 0.97,
      Math.min(z, edge) + (1 - Math.exp(-fall * 30)) * 0.018,
    );
  }
  geometry.computeVertexNormals();
  return k.mesh(geometry, material, position);
}

export function saunaStoneGeometry(seed, size = 0.12) {
  const geometry = new THREE.IcosahedronGeometry(size, 7);
  const planes = [];
  for (let i = 0; i < 10; i++) {
    const y = 1 - (i + 0.5) / 5;
    const radius = Math.sqrt(1 - y * y);
    const angle = i * 2.399 + seed * 0.31;
    planes.push([
      new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius),
      0.61 + 0.14 * (0.5 + 0.5 * Math.sin(i * 3.7 + seed)),
    ]);
  }
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / size,
      y = p.getY(i) / size,
      z = p.getZ(i) / size;
    const direction = new THREE.Vector3(x, y, z);
    let radius = 1;
    for (const [normal, distance] of planes) {
      const dot = normal.dot(direction);
      if (dot > 0) radius = Math.min(radius, distance / dot);
    }
    const fissure =
      0.018 * Math.exp(-(((x + y * 0.4 - 0.22 * Math.sin(seed)) / 0.028) ** 2));
    const relief = 0.006 * Math.sin(x * 39 + seed) * Math.sin(z * 31 + y * 21);
    radius += relief - fissure;
    p.setXYZ(
      i,
      x * size * radius,
      y * size * radius * (0.8 + 0.1 * Math.sin(seed)),
      z * size * radius * 1.07,
    );
  }
  geometry.deleteAttribute("normal");
  const welded = mergeVertices(geometry, 0.00001);
  geometry.dispose();
  welded.computeVertexNormals();
  return welded;
}

function heater(k, m, roof) {
  const group = k.sub([-2.05, SAUNA.floor, 0.1]);
  k.box([1.13, 0.035, 1.25], [0, 0.0175, 0.07], m.stone[1], group);
  for (const x of [-0.28, 0.28])
    for (const z of [-0.25, 0.25])
      k.box([0.065, 0.16, 0.065], [x, 0.11, z], m.iron, group);
  k.box([0.66, 0.03, 0.67], [0, 0.19, 0], m.iron, group);
  for (const x of [-0.32, 0.32])
    k.box([0.025, 0.56, 0.67], [x, 0.47, 0], m.iron, group);
  k.box([0.66, 0.56, 0.025], [0, 0.47, -0.325], m.iron, group);
  for (const x of [-0.27, 0.27])
    k.box([0.12, 0.56, 0.025], [x, 0.47, 0.325], m.iron, group);
  for (const y of [0.235, 0.67])
    k.box([0.43, 0.09, 0.025], [0, y, 0.325], m.iron, group);
  for (const x of [-0.32, 0.32])
    k.box([0.03, 0.16, 0.7], [x, 0.82, 0], m.metal, group);
  for (const z of [-0.335, 0.335])
    k.box([0.66, 0.16, 0.03], [0, 0.82, z], m.metal, group);
  for (let x = -0.25; x < 0.28; x += 0.08)
    k.rod([x, 0.74, -0.29], [x, 0.74, 0.29], 0.015, m.iron, group);
  for (let i = 0; i < 24; i++) {
    const row = Math.floor(i / 8),
      angle = ((i % 8) * Math.PI) / 4 + row * 0.06;
    k.mesh(
      saunaStoneGeometry(i, 0.13 + 0.006 * Math.sin(i * 3.1)),
      m.stone[i % 3],
      [Math.cos(angle) * 0.225, 0.82 + row * 0.11, Math.sin(angle) * 0.225],
      [i * 0.5, i * 1.4, i * 0.4],
      group,
    );
  }
  const door = k.sub([-0.215, 0.28, 0.345], 0.14, group);
  for (const x of [0, 0.43])
    k.box([0.028, 0.35, 0.028], [x, 0.175, 0], m.iron, door);
  for (const y of [0, 0.35])
    k.box([0.45, 0.03, 0.028], [0.215, y, 0], m.iron, door);
  k.box([0.4, 0.32, 0.006], [0.215, 0.175, 0], k.m.glass, door, 0);
  k.rod([0.4, 0.14, 0.04], [0.4, 0.25, 0.04], 0.012, m.metal, door);
  const char = charredWoodMaterial(k);
  for (let i = 0; i < 6; i++)
    shapedTimber(
      k,
      [-0.21, 0.27 + Math.floor(i / 3) * 0.063, -0.18 + (i % 3) * 0.16],
      [
        0.18 + 0.02 * Math.sin(i),
        0.275 + Math.floor(i / 3) * 0.063,
        -0.16 + (i % 3) * 0.16 + 0.016 * Math.sin(i * 2),
      ],
      0.065,
      char,
      group,
      { round: true, seed: i, relief: 0.003, taper: 0.1, segments: 24 },
    );
  for (let i = 0; i < 31; i++)
    k.mesh(
      saunaStoneGeometry(i, 0.009 + 0.01 * (0.5 + 0.5 * Math.sin(i * 4.7))),
      char,
      [
        Math.sin(i * 2.4) * 0.19,
        0.369 + 0.004 * Math.sin(i * 1.7),
        0.14 + Math.cos(i * 3.7) * 0.075,
      ],
      [i * 0.7, i, 0],
      group,
    );
  const glow = new THREE.PointLight(0xffa15c, 0.22, 1.6);
  glow.position.set(0, 0.44, 0.12);
  group.add(glow);
  k.animations.push((_, time) => {
    char.emissiveIntensity = 0.65 + 0.04 * Math.sin(time * 1.4);
    glow.intensity =
      0.22 + 0.025 * Math.sin(time * 2.3) + 0.01 * Math.sin(time * 4.1);
  });
  for (const [bottom, top, parent] of [
    [1.13, 2.3, k.group],
    [2.3, 4.2, roof],
  ]) {
    k.lathe(
      [
        [0.068, 0],
        [0.074, 0],
        [0.074, 0.003],
        [0.074, top - bottom - 0.003],
        [0.074, top - bottom],
        [0.068, top - bottom],
        [0.068, top - bottom - 0.003],
        [0.068, 0.003],
        [0.068, 0],
      ],
      [-2.05, bottom, 0.1],
      m.iron,
      parent,
    );
  }
  for (let y = 2.85; y < 4.1; y += 0.15)
    for (const [size, position] of [
      [
        [0.38, 0.145, 0.07],
        [-2.05, y, -0.09],
      ],
      [
        [0.38, 0.145, 0.07],
        [-2.05, y, 0.29],
      ],
      [
        [0.07, 0.145, 0.31],
        [-2.24, y, 0.1],
      ],
      [
        [0.07, 0.145, 0.31],
        [-1.86, y, 0.1],
      ],
    ])
      k.box(size, position, m.stone[Math.round(y * 10) % 3], roof, 0.005);
  for (const x of [-2.24, -1.86])
    k.rod([x, 4.1, 0.1], [x, 4.31, 0.1], 0.012, m.iron, roof);
  k.box([0.6, 0.025, 0.6], [-2.05, 4.33, 0.1], m.iron, roof, 0.015);
  k.box([0.045, 1.3, 1.15], [-2.65, 1.02, 0.15], m.stone[1]);
  k.box([1.18, 1.3, 0.045], [-2.05, 1.02, 1.18], m.stone[1]);
  for (const z of [-0.42, 0.88])
    shapedTimber(
      k,
      [-1.36, SAUNA.floor, z],
      [-1.36, 1.07, z],
      0.055,
      m.wood[0],
      k.group,
      { taper: 0 },
    );
  shapedTimber(
    k,
    [-1.36, 1.07, -0.42],
    [-1.36, 1.07, 0.88],
    0.06,
    m.wood[1],
    k.group,
    { depth: 0.075, taper: 0 },
  );
}

function waterBucket(k, m, position) {
  const bucket = k.sub(position, 0.2);
  k.lathe(
    [
      [0, 0],
      [0.15, 0],
      [0.19, 0.26],
      [0.19, 0.275],
      [0.182, 0.275],
      [0.143, 0.014],
      [0, 0.014],
    ],
    [0, 0, 0],
    m.metal,
    bucket,
    56,
  );
  for (const y of [0.035, 0.075, 0.23, 0.27])
    k.ring(0.15 + (y / 0.275) * 0.04, 0.003, [0, y, 0], m.metal, bucket);
  k.tube(
    [
      [-0.185, 0.24, 0],
      [-0.16, 0.48, 0],
      [0.16, 0.48, 0],
      [0.185, 0.24, 0],
    ],
    0.008,
    m.iron,
    bucket,
  );
  shapedTimber(
    k,
    [-0.08, 0.486, 0],
    [0.08, 0.486, 0],
    0.027,
    m.wood[2],
    bucket,
    { round: true, taper: 0, segments: 12 },
  );
  const water = k.material(0x3e5855, 0.2, 0.2);
  k.mesh(
    new THREE.CircleGeometry(0.175, 48),
    water,
    [0, 0.21, 0],
    [-Math.PI / 2, 0, 0],
    bucket,
  );
  const ladle = k.sub([0.025, 0.11, 0.02], 0.4, bucket);
  ladle.rotation.z = -0.28;
  k.lathe(
    [
      [0, 0],
      [0.055, 0.012],
      [0.075, 0.055],
      [0.075, 0.061],
      [0.068, 0.06],
      [0.049, 0.019],
      [0, 0.008],
    ],
    [0, 0, 0],
    m.metal,
    ladle,
  );
  k.rod([0.06, 0.035, 0], [0.06, 0.5, 0], 0.008, m.metal, ladle);
  shapedTimber(k, [0.06, 0.4, 0], [0.06, 0.67, 0], 0.03, m.wood[0], ladle, {
    round: true,
    taper: 0.12,
    segments: 16,
  });
}

export function furnishSauna(k, m, roof) {
  heater(k, m, roof);
  bench(k, m, [-1.05, SAUNA.floor, -1.91], {
    width: 3.2,
    depth: 0.68,
    height: 1.15,
  });
  bench(k, m, [-1.05, SAUNA.floor, -1.19], {
    width: 3.2,
    depth: 0.7,
    height: 0.65,
  });
  timberSteps(k, {
    position: [-0.38, SAUNA.floor, -0.04],
    width: 0.75,
    rise: 0.163,
    run: 0.267,
    count: 3,
    material: m.wood[2],
  });
  for (const y of [1.71, 1.9])
    shapedTimber(
      k,
      [-2.57, y, -2.265],
      [0.49, y, -2.265],
      0.09,
      m.wood[0],
      k.group,
      { depth: 0.025, taper: 0, segments: 25 },
    );
  for (const x of [-2.4, -1.1, 0.35])
    k.box([0.045, 0.45, 0.04], [x, 1.79, -2.29], m.wood[1]);
  cloth(k, m.linen, [-1.65, 1.501, -1.82], 0.87, 0.74, 0.12);
  const headrest = k.sub([-1.83, 1.513, -1.94], 0.12);
  const profile = (z) =>
    0.032 + 0.072 * Math.sin(((z + 0.162) / 0.324) * Math.PI);
  for (let i = 0; i < 7; i++) {
    const z = -0.162 + i * 0.054;
    const slat = k.sub([0, profile(z), z], 0, headrest);
    slat.rotation.x = -Math.atan(
      ((0.072 * Math.PI) / 0.324) * Math.cos((i / 6) * Math.PI),
    );
    shapedTimber(k, [-0.2, 0, 0], [0.2, 0, 0], 0.022, m.wood[i % 4], slat, {
      depth: 0.046,
      taper: 0,
      segments: 12,
    });
  }
  for (const x of [-0.165, 0.165]) {
    const side = new THREE.Shape().moveTo(-0.18, 0).lineTo(0.18, 0);
    for (let i = 20; i >= 0; i--) {
      const z = -0.18 + i * 0.018;
      side.lineTo(z, profile(z) - 0.01);
    }
    side.closePath();
    const geo = new THREE.ExtrudeGeometry(side, {
      depth: 0.025,
      bevelEnabled: false,
    });
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setXYZ(i, 0.0125 - p.getZ(i), p.getY(i), p.getX(i));
    geo.computeVertexNormals();
    k.mesh(geo, m.wood[1], [x, 0, 0], [0, 0, 0], headrest);
  }
  waterBucket(k, m, [-0.15, 1.0, -1.22]);
  const whisk = k.sub([-1.4, 1.055, -1.19], 0.1);
  whisk.rotation.z = Math.PI / 2;
  for (let i = 0; i < 24; i++) {
    const sprig = k.sub(
      [0.008 * Math.cos(i), 0, 0.008 * Math.sin(i)],
      Math.PI / 2 + 0.1 * Math.sin(i),
      whisk,
    );
    sprig.rotation.z = 0.07 * Math.sin(i);
    birchSprig(k, {
      parent: sprig,
      length: 0.52 + 0.06 * Math.sin(i * 1.7),
      seed: i + 21,
      count: 18,
      leafStart: 0.3,
      leaves: m.leaf,
      wood: k.m.bark,
    });
  }
  for (const y of [0.05, 0.12])
    k.ring(0.025, 0.004, [0, y, 0], m.outside[0], whisk);
  whisk.position.y += 1.005 - new THREE.Box3().setFromObject(whisk).min.y;
  bench(k, m, [2.55, SAUNA.floor, -1.25], {
    width: 1.7,
    depth: 0.52,
    height: 0.46,
    angle: Math.PI / 2,
  });
  cloth(k, m.towel, [2.55, 0.812, -1.45], 0.48, 0.65, 0.06);
  for (const x of [1.25, 1.85, 2.45]) {
    k.box([0.07, 0.1, 0.05], [x, 1.85, -2.265], m.wood[1]);
    k.rod([x, 1.84, -2.24], [x, 1.88, -2.11], 0.014, m.wood[0]);
  }
  const hanging = new THREE.PlaneGeometry(0.56, 0.85, 18, 28);
  const p = hanging.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      t = (y + 0.425) / 0.85;
    p.setXYZ(
      i,
      x * (1 - 0.94 * THREE.MathUtils.smoothstep(t, 0.72, 1)),
      y,
      (0.029 * Math.sin(x * 32) + 0.012 * Math.cos(y * 8)) * (1 - t),
    );
  }
  hanging.computeVertexNormals();
  k.animateFabric(k.mesh(hanging, m.towel, [1.85, 1.45, -2.1]), 0.002);
  const enamel = k.material(0xb9c9c7, 0.27, 0.08);
  const washBasin = k.sub([-2.05, SAUNA.floor + 0.005, -1.2]);
  k.lathe(
    [
      [0, 0],
      [0.19, 0],
      [0.27, 0.18],
      [0.27, 0.19],
      [0.263, 0.19],
      [0.183, 0.008],
      [0, 0.008],
    ],
    [0, 0, 0],
    enamel,
    washBasin,
    64,
  );
  k.ring(0.267, 0.005, [0, 0.19, 0], m.iron, washBasin);
  const jug = k.sub([2.55, 0.812, -0.58], -0.3);
  k.lathe(
    [
      [0, 0],
      [0.075, 0],
      [0.09, 0.08],
      [0.077, 0.24],
      [0.083, 0.25],
      [0.078, 0.25],
      [0.072, 0.236],
      [0.085, 0.08],
      [0.07, 0.008],
      [0, 0.008],
    ],
    [0, 0, 0],
    enamel,
    jug,
    48,
  );
  k.tube(
    [
      [0.075, 0.2, 0],
      [0.145, 0.2, 0],
      [0.155, 0.08, 0],
      [0.085, 0.055, 0],
    ],
    0.012,
    enamel,
    jug,
  );
  k.lathe(
    [
      [0, 0],
      [0.035, 0],
      [0.042, 0.08],
      [0.037, 0.08],
      [0.031, 0.006],
      [0, 0.006],
    ],
    [2.56, 0.812, -0.83],
    enamel,
  );
  for (const z of [-1.75, -1.51]) {
    const shoe = k.sphere(
      0.11,
      [2.3, 0.41, z],
      m.outside[1],
      k.group,
      [1.45, 0.44, 0.7],
    );
    shoe.rotation.y = -0.18;
    k.tube(
      [
        [2.26, 0.42, z - 0.065],
        [2.26, 0.49, z],
        [2.26, 0.42, z + 0.065],
      ],
      0.012,
      m.linen,
    );
  }
  bench(k, m, [-1.25, SAUNA.floor, 2.85], {
    width: 2.1,
    depth: 0.5,
    height: 0.45,
  });
  for (let i = 0; i < 14; i++) {
    const x = -2.45 + (i % 4) * 0.11,
      y = 0.41 + Math.floor(i / 4) * 0.1;
    shapedTimber(
      k,
      [x, y, 1.85],
      [x + 0.02, y + 0.01, 2.34],
      0.105,
      m.outside[i % 3],
      k.group,
      {
        round: true,
        taper: 0.12,
        bend: 0.012,
        relief: 0.005,
        seed: i,
        segments: 16,
      },
    );
  }
}
