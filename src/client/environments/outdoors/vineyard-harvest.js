import * as THREE from "three";
import { schistGeometry } from "./vineyard-stone.js";

export function buildVineyardHarvest(k, vines) {
  const origin = [-9.7, 0, 4.15],
    g = k.sub(origin);
  const wood = k.ownMaterial(k.m.cedar.clone());
  wood.color.set(0xb49b70);
  const wicker = k.ownMaterial(k.m.cedar.clone());
  wicker.color.set(0xc3a772);
  const blue = k.material(0x526d7d, 0.3);
  const coffee = k.material(0x5a3926, 0.23);
  const flowerColors = [k.material(0xbc7366, 0.9), k.material(0xddd0ac, 0.9)];
  const terracotta = k.ownMaterial(k.m.terracotta.clone());
  terracotta.color.set(0xc58a5d);
  for (const x of [-1.85, 1.85])
    for (const z of [-1.3, 1.3]) {
      k.box([0.13, 2.48, 0.13], [x, 1.24, z], wood, g, 0.009, [
        0,
        k.range(-0.02, 0.02),
        k.range(-0.008, 0.008),
      ]);
      for (const direction of [-1, 1])
        k.rod(
          [x, 1.96, z],
          [x - Math.sign(x) * 0.38, 2.38, z + direction * 0.08],
          0.027,
          wood,
          g,
        );
    }
  for (const z of [-1.3, 1.3])
    k.box([4.1, 0.16, 0.13], [0, 2.4, z], wood, g, 0.008);
  for (const x of [-1.85, 0, 1.85])
    k.box([0.09, 0.11, 2.85], [x, 2.47, 0], wood, g, 0.006);
  const linen = k.textile(["#d5c6a4", "#d9cdb1", "#a4aa8d"], [3, 2]);
  const canopy = new THREE.PlaneGeometry(3.84, 2.76, 30, 24);
  const points = canopy.attributes.position,
    resting = [],
    free = [];
  points.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i),
      y = points.getY(i);
    const freedom = (1 - (x / 1.92) ** 2) * (1 - (y / 1.38) ** 2);
    resting.push(-0.13 * freedom + Math.sin(x * 23 + y * 4) * 0.007 * freedom);
    free.push(Math.max(0, freedom));
    points.setZ(i, resting[i]);
  }
  canopy.computeVertexNormals();
  const shade = k.mesh(canopy, linen, [0, 2.55, 0], [-Math.PI / 2, 0, 0], g);
  shade.name = "Breathing linen over the harvest table";
  k.animated.add(shade);
  k.animations.push((_, time) => {
    for (let i = 0; i < points.count; i++)
      points.setZ(
        i,
        resting[i] +
          free[i] * Math.sin(time * 0.8 + points.getX(i) * 1.3) * 0.018,
      );
    points.needsUpdate = true;
    canopy.computeVertexNormals();
  });
  for (const x of [-1.85, 1.85])
    for (const z of [-1.3, 1.3])
      k.tube(
        [
          [x, 2.54, z],
          [x + 0.06, 2.42, z + 0.04],
          [x, 2.37, z - 0.06],
        ],
        0.007,
        wicker,
        g,
      );
  for (let board = 0; board < 8; board++)
    k.box(
      [0.31, 0.06, 1.0],
      [-1.08 + board * 0.31, 0.78, -0.13],
      wood,
      g,
      0.007,
      [0, 0, k.range(-0.004, 0.004)],
    );
  for (const x of [-0.95, 0.95])
    for (const z of [-0.48, 0.25])
      k.box([0.09, 0.75, 0.09], [x, 0.375, z], wood, g, 0.006);
  k.box([2.15, 0.08, 0.09], [0, 0.26, -0.13], wood, g, 0.006);
  for (const x of [-0.9, 0.9])
    k.box([0.1, 0.4, 0.36], [x, 0.2, 0.95], wood, g, 0.007);
  for (const z of [0.83, 1.04])
    k.box([2.3, 0.055, 0.2], [0, 0.43, z], wood, g, 0.005);
  const towel = new THREE.PlaneGeometry(0.82, 0.67, 24, 20);
  const cloth = towel.attributes.position;
  for (let i = 0; i < cloth.count; i++)
    cloth.setZ(
      i,
      0.006 +
        0.007 *
          (1 + Math.sin(cloth.getX(i) * 33)) *
          (0.5 + 0.5 * Math.cos(cloth.getY(i) * 19)),
    );
  towel.computeVertexNormals();
  k.mesh(
    towel,
    k.textile(["#d6d3bc", "#567b75", "#d2c8a9"], [2, 2]),
    [0.43, 0.812, -0.08],
    [-Math.PI / 2, 0, 0.15],
    g,
  );
  function basket(x, y, z, filled) {
    const b = k.sub([x, y, z], k.range(-0.12, 0.12), g);
    k.lathe(
      [
        [0, 0],
        [0.19, 0],
        [0.27, 0.3],
        [0.27, 0.34],
        [0.252, 0.34],
        [0.25, 0.3],
        [0.178, 0.025],
        [0, 0.025],
      ],
      [0, 0, 0],
      wicker,
      b,
      32,
    );
    for (let row = 0; row < 17; row++) {
      const level = 0.02 + row * 0.019;
      k.mesh(
        new THREE.TorusGeometry(
          0.195 + Math.min(level, 0.3) * 0.25,
          0.006,
          5,
          32,
        ),
        wicker,
        [0, level, 0],
        [Math.PI / 2, 0, 0],
        b,
      );
    }
    for (let rib = 0; rib < 18; rib++) {
      const a = (rib * Math.PI) / 9;
      k.rod(
        [Math.cos(a) * 0.192, 0.02, Math.sin(a) * 0.192],
        [Math.cos(a) * 0.268, 0.335, Math.sin(a) * 0.268],
        0.005,
        wicker,
        b,
      );
    }
    k.tube(
      Array.from({ length: 13 }, (_, i) => {
        const a = (i * Math.PI) / 12;
        return [Math.cos(a) * 0.255, 0.31 + Math.sin(a) * 0.27, 0];
      }),
      0.014,
      wicker,
      b,
    );
    if (filled)
      for (let i = 0; i < 8; i++)
        vines.bunch(
          [
            origin[0] + x + k.range(-0.13, 0.13),
            y + 0.31,
            origin[2] + z + k.range(-0.12, 0.12),
          ],
          0.7,
        );
  }
  basket(-0.68, 0.813, -0.2, true);
  basket(1.43, 0.025, 0.58, false);
  for (const [x, z] of [
    [0.35, -0.12],
    [0.69, 0.1],
  ]) {
    k.lathe(
      [
        [0, 0],
        [0.04, 0],
        [0.057, 0.09],
        [0.055, 0.105],
        [0.047, 0.105],
        [0.045, 0.09],
        [0.034, 0.012],
        [0, 0.012],
      ],
      [x, 0.83, z],
      k.m.cream,
      g,
      24,
    );
    k.mesh(
      new THREE.TorusGeometry(0.051, 0.004, 6, 24),
      blue,
      [x, 0.93, z],
      [Math.PI / 2, 0, 0],
      g,
    );
    k.mesh(
      new THREE.TorusGeometry(0.027, 0.006, 6, 20),
      k.m.cream,
      [x + 0.066, 0.882, z],
      [0, Math.PI / 2, 0],
      g,
    );
    k.cylinder(0.044, 0.003, [x, 0.908, z], coffee, g, 0.044, 24);
  }
  k.book([-0.02, 0.817, -0.37], {
    parent: g,
    width: 0.23,
    depth: 0.3,
    angle: -0.18,
    image: "/public/outdoors/references/douro-terraces.jpg",
  });
  for (let i = 0; i < 12; i++)
    k.sphere(
      0.006,
      [k.range(-0.1, 0.25), 0.815, k.range(0.1, 0.28)],
      wicker,
      g,
      [1.4, 0.4, 0.7],
    );
  const plantPositions = [
    [-12.15, 2.2],
    [-11.9, 5.85],
    [-7.35, 5.9],
  ];
  const pottingSoil = k.material(0x67543a, 1),
    flowerStem = k.material(0x65774a, 1);
  for (const [x, z] of plantPositions) {
    k.lathe(
      [
        [0, 0],
        [0.18, 0],
        [0.25, 0.42],
        [0.27, 0.44],
        [0.244, 0.44],
        [0.225, 0.4],
        [0.163, 0.035],
        [0, 0.035],
      ],
      [x, 0, z],
      terracotta,
    );
    k.cylinder(0.223, 0.025, [x, 0.375, z], pottingSoil);
    k.tree([x, 0.39, z], { kind: "shrub", height: 0.6, radius: 0.48 });
    for (let i = 0; i < 8; i++) {
      const tip = [
        x + k.range(-0.2, 0.2),
        k.range(0.8, 0.96),
        z + k.range(-0.2, 0.2),
      ];
      k.rod([x, 0.39, z], tip, 0.002, flowerStem);
      k.sphere(0.018, tip, flowerColors[i % 2], k.group, [1, 0.4, 1]);
    }
  }
  for (const [x, z] of [
    [-12.7, 3.8],
    [-12.4, 6],
    [-3.8, 5.9],
    [-2.4, 7.5],
  ])
    k.tree([x, 0, z], {
      kind: "shrub",
      height: k.range(0.65, 1.05),
      radius: 0.8,
    });
  for (const x of [-11, -8.7, -5.15])
    k.wearPatch([x, 0.35, 1.836], {
      width: 0.65,
      height: 0.55,
      strength: 0.45,
    });
  const pavers = [];
  for (let row = 0; row < 7; row++)
    for (const x of [-6.91, -6.4])
      pavers.push({
        position: [x + k.range(-0.02, 0.02), 0.015, 2.12 + row * 0.49],
        scale: [0.46, 0.035, 0.44],
        rotation: [0, k.range(-0.035, 0.035), 0],
        color: row % 3 === 0 ? 0xd5c3a1 : 0xbeb494,
      });
  k.instances(schistGeometry(), k.m.stone, pavers);
  return {
    shade: shade.name,
    basketProbe: {
      id: "harvest-basket",
      origin: [-8.27, 0.35, 4.73],
      direction: [0, -1, 0],
      minDistance: 0.28,
    },
  };
}
