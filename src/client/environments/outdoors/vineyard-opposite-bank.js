import * as THREE from "three";
import { buildTerrainStrip } from "../shared/cutaway-terrain.js";
import { schistGeometry } from "./vineyard-stone.js";
import { buildVineyardGarden, colorVineyardGround } from "./vineyard-garden.js";

export const oppositeBankBounds = { width: 30, back: -27.4, front: -52 };
export const oppositeShore = (x) => -31.4 + 0.75 * Math.sin(x * 0.16 + 0.3);
const terraces = [
  [-1.1, -6.2],
  [0, -5.3],
  [1.5, -4.05],
  [3.3, -4.05],
  [4.2, -2.8],
  [6, -2.8],
  [6.9, -1.55],
  [8.7, -1.55],
  [9.6, -0.3],
  [11.4, -0.3],
];

export function oppositeBankProfile(x) {
  const shore = oppositeShore(x);
  const profile = [
    [oppositeBankBounds.back, -6.2],
    ...terraces.map(([distance, y]) => [shore - distance, y]),
  ];
  const start = shore - 11.4;
  for (let row = 1; row <= 32; row++) {
    const z = start + ((oppositeBankBounds.front - start) * row) / 32;
    profile.push([z, ridgeHeight(x, start - z)]);
  }
  return profile;
}

function ridgeHeight(x, distance) {
  const slope =
    0.66 +
    0.46 * Math.exp(-(((x + 7) / 4.5) ** 2)) +
    0.28 * Math.exp(-(((x - 8) / 3.8) ** 2));
  return (
    -0.3 +
    distance * slope +
    0.14 * Math.sin(distance * 1.8 + x * 0.5) * Math.min(1, distance)
  );
}

export function oppositeBankHeight(x, z) {
  const profile = oppositeBankProfile(x);
  if (z >= profile[0][0]) return profile[0][1];
  for (let i = 1; i < profile.length; i++) {
    const [farZ, farY] = profile[i],
      [nearZ, nearY] = profile[i - 1];
    if (z >= farZ)
      return nearY + ((nearZ - z) / (nearZ - farZ)) * (farY - nearY);
  }
  return profile.at(-1)[1];
}

export function buildVineyardOppositeBank(
  k,
  vines,
  { soil, stone, water, sectionWater },
) {
  const { width, back, front } = oppositeBankBounds;
  const strip = (material, near, far) =>
    buildTerrainStrip(k, material, near, far, {
      left: -width / 2,
      right: width / 2,
      samples: 120,
    });
  strip(
    soil,
    () => [-6.2, back],
    (x) => [-6.2, oppositeShore(x) + 1.1],
  );
  for (let i = 1; i < terraces.length; i++) {
    const [d0, y0] = terraces[i - 1],
      [d1, y1] = terraces[i];
    strip(
      y0 === y1 ? soil : stone,
      (x) => [y0, oppositeShore(x) - d0],
      (x) => [y1, oppositeShore(x) - d1],
    );
  }
  const hillSoil = k.ownMaterial(soil.clone());
  hillSoil.color.set(0xcccccc);
  hillSoil.vertexColors = true;
  for (let row = 0; row < 32; row++)
    colorVineyardGround(
      strip(
        hillSoil,
        (x) => {
          const start = oppositeShore(x) - 11.4;
          const z = start + ((front - start) * row) / 32;
          return [ridgeHeight(x, start - z), z];
        },
        (x) => {
          const start = oppositeShore(x) - 11.4;
          const z = start + ((front - start) * (row + 1)) / 32;
          return [ridgeHeight(x, start - z), z];
        },
      ),
    );
  strip(
    water,
    () => [-5.3, back],
    (x) => [-5.3, oppositeShore(x)],
  );
  strip(
    sectionWater,
    () => [-5.3, back],
    () => [-6.2, back],
  );
  for (const x of [-width / 2, width / 2]) {
    const shore = oppositeShore(x);
    k.mesh(
      new THREE.PlaneGeometry(back - shore, 0.9),
      sectionWater,
      [x, -5.75, (back + shore) / 2],
      [0, Math.PI / 2, 0],
    );
  }
  const rocks = [],
    grass = [];
  for (const [distance, y] of [
    [2.4, -4.05],
    [5.1, -2.8],
    [7.8, -1.55],
    [10.5, -0.3],
  ]) {
    const xs = Array.from({ length: 16 }, (_, i) => -13.6 + i * 1.7);
    xs.push(14.1);
    for (const x of xs) {
      vines.vine(x, y, oppositeShore(x) - distance, {
        detail: true,
        angle: -Math.atan(0.12 * Math.cos(x * 0.16 + 0.3)),
      });
    }
    for (const x of [-14, -8, -2, 4, 10, 14.5])
      vines.post(x, y, oppositeShore(x) - distance);
    for (const height of [0.82, 1.4])
      k.tube(
        Array.from({ length: 31 }, (_, i) => {
          const x = -14.5 + (i * 29) / 30;
          return [x, y + height, oppositeShore(x) - distance];
        }),
        0.003,
        k.m.iron,
      );
  }
  for (let i = 0; i < 430; i++) {
    const x = k.range(-14.6, 14.6);
    const z = k.range(front + 0.3, oppositeShore(x) - 0.3);
    const y = oppositeBankHeight(x, z);
    const size = i % 7 === 0 ? k.range(0.2, 0.48) : k.range(0.035, 0.13);
    rocks.push({
      position: [x, y + size * 0.08, z],
      scale: [size, size * 0.28, size * 0.7],
      rotation: [0, k.random() * Math.PI, k.range(-0.2, 0.2)],
      color: [0xaaa18b, 0xb5ab93, 0x898c79][i % 3],
    });
    if (i % 2 === 0)
      grass.push({
        position: [x, y + 0.015, z],
        scale: [k.range(0.2, 0.45), k.range(0.15, 0.38), 1],
        rotation: [0, k.random() * Math.PI, 0],
        color: 0xe7dcb9,
      });
  }
  k.instances(schistGeometry(), stone, rocks);
  k.instances(
    new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0),
    k.leafMaterial("grass"),
    grass,
  );
  for (const [x, z, height] of [
    [-11.9, -49.8, 3.5],
    [-8.7, -50.2, 3.2],
    [-3.1, -48.6, 3],
    [2.4, -49.5, 3.8],
    [7.3, -50.1, 3.5],
    [12.4, -48.9, 2.8],
  ])
    k.tree([x, oppositeBankHeight(x, z), z], { height, radius: height * 0.35 });
  const garden = buildVineyardGarden(k, {
    height: oppositeBankHeight,
    front,
    shore: oppositeShore,
  });
  return {
    ...oppositeBankBounds,
    profile: oppositeBankProfile,
    garden,
    rootStations: [
      { z: oppositeShore(14.1) - 5.1, y: -2.8 },
      { z: oppositeShore(14.1) - 10.5, y: -0.3 },
    ],
  };
}
