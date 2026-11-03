import * as THREE from "three";
import { buildWorkCar, buildBicycle } from "./rural-vehicles.js";
import { buildVineyardCrate } from "./vineyard-crate.js";
import { vineyardYardGrowth } from "./vineyard-yard.js";
import { outdoorView } from "./outdoor-kit.js";

export const vineyardYardView = outdoorView(
  "The working yard",
  [0.2, 2.4, 8.8],
  [-5.7, 0.9, 1.1],
  62,
);

export function buildVineyardLife(k, vines) {
  buildWorkCar(k, [-2.8, 0.01, 4.7], 0.12);
  buildBicycle(k, [-4.02, 0.01, -1.3], -0.035);
  const wood = k.ownMaterial(k.m.cedar.clone());
  wood.color.set(0x887253);
  const iron = k.material(0x60675f, 0.7, 0.5);
  const hose = k.material(0x556754, 0.94);
  const crates = [
    { position: [-3.8, 0.01, 6.85], filled: true, angle: -0.08 },
    { position: [-4.5, 0.01, 6.74], angle: 0.04 },
    { position: [-4.48, 0.335, 6.74], angle: 0.07 },
    { position: [-4.3, -1.35, -7.1], filled: true, angle: 0.13 },
    { position: [8.2, -2.7, -11.2], angle: -0.1 },
  ];
  for (const { position, ...options } of crates)
    buildVineyardCrate(k, vines, wood, position, options);
  const rack = k.sub([-5.17, 0, 1.99]);
  k.box([0.75, 0.075, 0.05], [0, 1.25, 0], wood, rack, 0.008);
  for (const x of [-0.27, 0, 0.27]) {
    k.rod([x, 0.23, 0.23], [x + 0.025, 1.51, 0.035], 0.019, wood, rack);
    k.rod([x - 0.04, 1.26, 0], [x - 0.04, 1.26, 0.08], 0.005, iron, rack);
  }
  k.box(
    [0.19, 0.26, 0.025],
    [-0.27, 0.135, 0.245],
    iron,
    rack,
    0.025,
    [0.13, 0, 0],
  );
  k.rod([-0.16, 0.18, 0.24], [0.16, 0.18, 0.24], 0.013, iron, rack);
  for (let i = 0; i < 7; i++)
    k.rod(
      [-0.15 + i * 0.05, 0.18, 0.24],
      [-0.15 + i * 0.05, 0.035, 0.27],
      0.005,
      iron,
      rack,
    );
  k.box([0.22, 0.02, 0.12], [0.27, 0.04, 0.3], iron, rack, 0.008, [0.18, 0, 0]);
  for (let turn = 0; turn < 4; turn++)
    k.mesh(
      new THREE.TorusGeometry(0.3 - turn * 0.018, 0.012, 6, 48),
      hose,
      [-4.87, 0.025 + turn * 0.022, 2.73],
      [Math.PI / 2, 0, 0],
    );
  k.tube(
    [
      [-4.58, 0.025, 2.73],
      [-4.4, 0.025, 3.0],
      [-4.53, 0.025, 3.34],
      [-4.8, 0.025, 3.42],
    ],
    0.012,
    hose,
  );
  k.rod([-4.8, 0.025, 3.42], [-4.92, 0.025, 3.45], 0.018, iron);
  const barrow = k.sub([-2.8, 0, -2.25], -0.28);
  const enamel = k.material(0x738a7b, 0.65, 0.25);
  k.box([0.58, 0.018, 0.82], [0, 0.49, 0], enamel, barrow, 0.008);
  for (const x of [-0.29, 0.29])
    k.box([0.018, 0.26, 0.84], [x, 0.62, 0], enamel, barrow, 0.008);
  for (const z of [-0.41, 0.41])
    k.box([0.58, 0.26, 0.018], [0, 0.62, z], enamel, barrow, 0.008);
  for (const side of [-1, 1]) {
    k.rod(
      [side * 0.2, 0.21, -0.59],
      [side * 0.27, 0.74, 0.99],
      0.023,
      iron,
      barrow,
    );
    k.rod(
      [side * 0.23, 0.5, 0.28],
      [side * 0.26, 0.01, 0.44],
      0.02,
      iron,
      barrow,
    );
    k.rod(
      [side * 0.27, 0.74, 0.99],
      [side * 0.27, 0.77, 1.12],
      0.03,
      hose,
      barrow,
    );
  }
  k.mesh(
    new THREE.TorusGeometry(0.17, 0.04, 8, 28),
    k.material(0x34362f, 1),
    [0, 0.21, -0.59],
    [0, Math.PI / 2, 0],
    barrow,
  );
  k.mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.08, 20),
    iron,
    [0, 0.21, -0.59],
    [0, 0, Math.PI / 2],
    barrow,
  );
  k.rod([-0.2, 0.21, -0.59], [0.2, 0.21, -0.59], 0.025, iron, barrow);
  const chips = [];
  for (let i = 0; i < 22; i++)
    chips.push({
      position: [-2.8 + k.range(-0.15, 0.15), 0.52, -2.25 + k.range(-0.2, 0.2)],
      scale: [k.range(0.04, 0.08), 0.025, k.range(0.03, 0.07)],
      rotation: [0, k.random() * Math.PI, 0],
    });
  k.instances(new THREE.IcosahedronGeometry(1, 0), k.m.stone, chips);
  const grass = [],
    gravel = [],
    clippings = [];
  for (let i = 0; i < 6500; i++) {
    const x = k.range(-14.65, -3.5),
      z = k.range(-3.9, 7.6);
    if (k.random() > vineyardYardGrowth(x, z) * 0.9) continue;
    const height = k.range(0.08, 0.3),
      angle = k.random() * Math.PI;
    for (const turn of [0, Math.PI / 2])
      grass.push({
        position: [x, 0.012, z],
        scale: [height * 1.6, height, 1],
        rotation: [0, angle + turn, 0],
        color: i % 4 ? 0xb6c583 : 0xe7d2a3,
      });
  }
  for (let i = 0; i < 580; i++) {
    const x = k.range(-5.8, -1.35),
      z = k.range(2.1, 8.6);
    if (vineyardYardGrowth(x, z) > 0.22) continue;
    gravel.push({
      position: [x, 0.014, z],
      scale: [
        k.range(0.015, 0.055),
        k.range(0.006, 0.018),
        k.range(0.015, 0.05),
      ],
      rotation: [0, k.random() * Math.PI, 0],
      color: i % 3 ? 0xb2a58a : 0x7f8070,
    });
  }
  for (let i = 0; i < 14; i++)
    clippings.push({
      position: [-4.3 + k.range(-0.3, 0.3), -1.335, -7.1 + k.range(-0.4, 0.4)],
      scale: [0.004, k.range(0.08, 0.25), 0.004],
      rotation: [Math.PI / 2, k.random() * Math.PI, 0],
    });
  k.instances(
    new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0),
    k.leafMaterial("grass"),
    grass,
  );
  k.instances(
    new THREE.IcosahedronGeometry(1, 0),
    k.material(0xffffff, 1),
    gravel,
  );
  k.instances(new THREE.CylinderGeometry(1, 1, 1, 5), wood, clippings);
  return {
    car: [-2.8, 0.01, 4.7],
    bicycle: [-4.02, 0.01, -1.3],
    crates: crates.length,
    grassClumps: grass.length / 2,
    gravel: gravel.length,
    barrowProbe: {
      id: "wheelbarrow",
      kind: "cavity",
      origin: [-2.8, 0.83, -2.25],
      direction: [0, -1, 0],
      minDistance: 0.25,
    },
  };
}
