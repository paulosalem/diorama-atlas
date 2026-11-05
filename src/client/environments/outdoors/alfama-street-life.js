import * as THREE from "three";
import { alfamaPot, alfamaTable } from "./alfama-life.js";

function crate(k, m, position, parent, angle = 0) {
  const g = k.sub(position, angle, parent);
  g.name = "Open slatted household crate";
  for (const x of [-0.245, 0.245])
    for (const z of [-0.17, 0.17])
      k.box([0.035, 0.31, 0.035], [x, 0.155, z], k.m.cedar, g, 0.004);
  for (let i = 0; i < 5; i++)
    k.box([0.09, 0.025, 0.37], [-0.2 + i * 0.1, 0.013, 0], k.m.cedar, g, 0.003);
  for (const y of [0.065, 0.16, 0.255]) {
    for (const z of [-0.185, 0.185])
      k.box([0.53, 0.07, 0.018], [0, y, z], k.m.cedar, g, 0.003);
    for (const x of [-0.26, 0.26])
      k.box([0.018, 0.07, 0.37], [x, y, 0], k.m.cedar, g, 0.003);
  }
  for (const x of [-0.23, 0.23])
    for (const y of [0.065, 0.255])
      k.sphere(0.005, [x, y, 0.197], m.iron, g, [1, 1, 0.3]);
  return g;
}

function basket(k, m, position, parent, size = 1) {
  const g = k.sub(position, 0.13, parent);
  g.name = "Open woven laundry basket";
  g.scale.setScalar(size);
  k.lathe(
    [
      [0, 0],
      [0.16, 0],
      [0.235, 0.27],
      [0.235, 0.3],
      [0.219, 0.3],
      [0.215, 0.27],
      [0.145, 0.022],
      [0, 0.022],
    ],
    [0, 0, 0],
    k.m.cedar,
    g,
    40,
  );
  for (let row = 0; row < 17; row++) {
    const y = 0.025 + row * 0.016;
    k.ring(0.16 + y * 0.26, 0.006, [0, y, 0], m.wicker, g);
  }
  for (let i = 0; i < 28; i++) {
    const a = (i * Math.PI) / 14;
    k.rod(
      [Math.cos(a) * 0.16, 0.02, Math.sin(a) * 0.16],
      [Math.cos(a) * 0.235, 0.3, Math.sin(a) * 0.235],
      0.004,
      m.wicker,
      g,
    );
  }
  for (const side of [-1, 1])
    k.tube(
      [
        [side * 0.21, 0.24, -0.07],
        [side * 0.27, 0.36, 0],
        [side * 0.21, 0.24, 0.07],
      ],
      0.012,
      m.wicker,
      g,
    );
  return g;
}

function wateringCan(k, m, position, parent) {
  const g = k.sub(position, -0.35, parent);
  g.name = "Open watering can with rose and handles";
  k.lathe(
    [
      [0, 0],
      [0.125, 0],
      [0.145, 0.025],
      [0.145, 0.235],
      [0.13, 0.25],
      [0.116, 0.25],
      [0.13, 0.23],
      [0.13, 0.02],
      [0, 0.02],
    ],
    [0, 0, 0],
    m.enamel,
    g,
    32,
  );
  k.tube(
    [
      [-0.13, 0.04, 0],
      [-0.25, 0.1, 0],
      [-0.25, 0.24, 0],
      [-0.13, 0.23, 0],
    ],
    0.014,
    m.enamel,
    g,
  );
  k.tube(
    [
      [0, 0.23, -0.11],
      [0, 0.39, 0],
      [0, 0.23, 0.11],
    ],
    0.012,
    m.enamel,
    g,
  );
  k.rod([0.11, 0.07, 0], [0.38, 0.28, 0], 0.027, m.enamel, g);
  const rose = k.sub([0.38, 0.28, 0], 0, g);
  rose.rotation.z = -0.85;
  k.cylinder(0.065, 0.035, [0, 0, 0], m.enamel, rose, 0.035, 24);
  for (let i = 0; i < 13; i++) {
    const a = i * 2.4,
      r = 0.014 + (i % 3) * 0.016;
    k.cylinder(
      0.0025,
      0.001,
      [Math.cos(a) * r, 0.018, Math.sin(a) * r],
      m.iron,
      rose,
      0.0025,
      6,
    );
  }
  return g;
}

function broom(k, m, position, parent) {
  const g = k.sub(position, 0, parent);
  g.name = "Broom leaning against its wall";
  k.rod([0, 0.17, 0.25], [0.1, 1.37, 0], 0.016, k.m.cedar, g);
  for (let i = 0; i < 32; i++) {
    const x = ((i % 8) - 3.5) * 0.026;
    const z = Math.floor(i / 8) * 0.016;
    k.rod(
      [x * 0.35, 0.24, 0.24 + z * 0.4],
      [x, 0.006, 0.27 + z],
      0.003,
      m.wicker,
      g,
    );
  }
  for (const y of [0.16, 0.2])
    k.box([0.12, 0.014, 0.05], [0, y, 0.255], m.iron, g, 0.004);
  return g;
}

function foldedLinen(k, m, position, parent, angle = 0) {
  const g = k.sub(position, angle, parent);
  k.cushion([0.34, 0.045, 0.25], [0, 0.023, 0], m.linen, g);
  k.cushion([0.3, 0.035, 0.23], [0.015, 0.059, 0], m.blueLinen, g);
  return g;
}

function plantedShelf(k, m, position, parent, size = 0.7) {
  const g = k.sub(position, 0, parent);
  k.box([0.55, 0.035, 0.43], [0, -0.018, 0.015], m.timber, g, 0.004);
  for (const x of [-0.19, 0.19]) {
    k.rod([x, -0.29, -0.19], [x, -0.035, 0.2], 0.012, m.iron, g);
    k.box([0.055, 0.33, 0.025], [x, -0.15, -0.19], m.iron, g, 0.003);
  }
  alfamaPot(k, m, [0, 0, 0], size, g);
  return g;
}

export function buildAlfamaStreetLife(k, materials, houses, upperChair) {
  const m = {
    ...materials,
    enamel: k.material(0x788f86, 0.53, 0.25),
    wicker: k.material(0x9d805a, 0.94),
    blueLinen: k.textile(["#758c96", "#bbc4bd", "#bbc4bd"]),
  };
  const activity = [];
  for (const [index, house] of houses.entries()) {
    const { group, width, passage } = house;
    if (width >= 2.6 && !passage) {
      alfamaPot(k, m, [-width * 0.25 - 0.38, 2.995, 0.45], 0.88, group);
      if (index % 3 !== 1)
        alfamaPot(k, m, [-width * 0.25 + 0.39, 2.995, 0.46], 0.64, group);
    }
    if (index % 3 === 0)
      plantedShelf(k, m, [width * 0.25, 2.98, 0.43], group, 0.65);
    if (!passage) {
      k.box([0.075, 0.13, 0.035], [0.74, 1.4, 0.23], m.enamel, group, 0.006);
      k.sphere(0.014, [0.74, 1.38, 0.251], m.iron, group, [1, 1, 0.45]);
    }
    if (index === 2) broom(k, m, [-1.75, 0, 0.23], group);
    if ([0, 4, 8, 13].includes(index)) {
      const x = Math.min(width / 2 - 0.32, 1.25);
      broom(k, m, [x, 0, 0.23], group);
      const box = crate(k, m, [-x, 0, 0.47], group, -0.06);
      if (index % 2 === 0) {
        alfamaPot(k, m, [0, 0.025, 0], 0.58, box);
      } else {
        foldedLinen(k, m, [0, 0.025, 0], box);
      }
      activity.push({ kind: "doorstep-care", house: index });
    }
  }
  const meal = alfamaTable(k, m, [-1.25, 0, 1.05], houses[1].group);
  const cloth = new THREE.PlaneGeometry(0.9, 0.57, 24, 18);
  cloth.rotateX(-Math.PI / 2);
  const cp = cloth.attributes.position;
  for (let i = 0; i < cp.count; i++)
    cp.setY(i, 0.7743 + 0.00035 * Math.sin(cp.getX(i) * 31 + cp.getZ(i) * 19));
  cloth.computeVertexNormals();
  k.mesh(cloth, m.linen, [0, 0, 0], [0, 0, 0], meal);
  for (let i = 0; i < 9; i++)
    k.sphere(
      0.0025 + (i % 3) * 0.001,
      [-0.38 + i * 0.023, 0.78, 0.22 + Math.sin(i * 2.4) * 0.035],
      m.wicker,
      meal,
      [1.2, 0.5, 0.7],
    );
  activity.push({ kind: "outdoor-meal", house: 1 });

  const tending = k.sub([8.55, 2.4, -5.08], 0.07);
  for (const x of [-0.46, 0.46])
    for (const z of [-0.15, 0.15])
      k.box([0.045, 0.57, 0.045], [x, 0.285, z], k.m.cedar, tending, 0.004);
  for (let board = 0; board < 3; board++)
    k.box(
      [1.06, 0.035, 0.13],
      [0, 0.585, -0.14 + board * 0.14],
      k.m.cedar,
      tending,
      0.005,
    );
  const can = wateringCan(k, m, [0.17, 0.603, 0], tending);
  alfamaPot(k, m, [-0.36, 0.603, -0.01], 0.56, tending);
  const empty = crate(k, m, [-0.17, 0, 0], tending);
  empty.name = "Empty crate beneath the potting bench";
  activity.push({ kind: "plant-tending", position: [8.55, 2.4, -5.08] });

  const washing = basket(k, m, [7.1, 2.4, -4.15], k.group, 0.95);
  foldedLinen(k, m, [0, 0.19, 0], washing, 0.2);
  activity.push({ kind: "laundry-sorting", position: [7.1, 2.4, -4.15] });
  const backWall = k.sub([-10.9, 3.92, -3.2], Math.PI / 2);
  plantedShelf(k, m, [0, 0, 0.22], backWall, 0.84);
  plantedShelf(k, m, [0.86, 0.68, 0.22], backWall, 0.6);
  activity.push({ kind: "wall-garden", position: [-10.9, 3.92, -3.2] });
  const towel = new THREE.PlaneGeometry(0.3, 0.46, 14, 20);
  const p = towel.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (0.23 - p.getY(i)) / 0.46;
    p.setXYZ(
      i,
      p.getX(i),
      0.84 - t * 0.46,
      -0.205 -
        0.04 * Math.sin(t * Math.PI) +
        Math.sin(p.getX(i) * 63) * 0.006 * t,
    );
  }
  towel.computeVertexNormals();
  const hanging = k.mesh(towel, m.blueLinen, [0, 0, 0], [0, 0, 0], upperChair);
  hanging.name = "Towel resting over the chair back";
  k.animateFabric(hanging, 0.003);
  activity.push({ kind: "resting-linen", position: [-5.1, 4.8, -7.8] });

  const fallen = k.material(0x9b8657, 0.97);
  for (const [x, y, z] of [
    [6.5, 2.4, -2.95],
    [-2.4, 2.4, 1.4],
    [-6.4, 4.8, -8.1],
  ]) {
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.SphereGeometry(1, 8, 4);
      k.mesh(
        leaf,
        fallen,
        [
          x + Math.cos(i * 2.4) * (0.26 + i * 0.015),
          y + 0.004,
          z + Math.sin(i * 2.4) * 0.27,
        ],
        [0, i * 1.7, 0],
      ).scale.set(0.012, 0.003, 0.031);
    }
  }
  const probe = (id, object, local, minDistance) => {
    object.updateWorldMatrix(true, false);
    return {
      id,
      kind: "cavity",
      origin: new THREE.Vector3(...local)
        .applyMatrix4(object.matrixWorld)
        .toArray(),
      direction: [0, -1, 0],
      minDistance,
    };
  };
  return {
    activity,
    probes: [
      probe("alfama-watering-can", can, [0.04, 0.28, 0.04], 0.24),
      probe("alfama-household-crate", empty, [0, 0.3, 0], 0.25),
    ],
  };
}
