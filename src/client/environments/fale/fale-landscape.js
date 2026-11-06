import * as THREE from "three";
import { buildCutawayTerrain } from "../shared/cutaway-terrain.js";
import { tropicalVegetation } from "../shared/tropical-vegetation.js";
import { grassCover } from "../shared/grass-cover.js";
import { createOutdoorTree } from "../outdoors/outdoor-foliage.js";

export function faleRouteDistance(x, z) {
  const segments = [
    [0, 3.8, 0.3, 10],
    [0, -3.8, -2.7, -6.8],
    [-2.7, -6.8, -2.7, -7.5],
    [0, -3.8, 5.3, -4.5],
  ];
  return Math.min(
    ...segments.map(([ax, az, bx, bz]) => {
      const t = THREE.MathUtils.clamp(
        ((x - ax) * (bx - ax) + (z - az) * (bz - az)) /
          ((bx - ax) ** 2 + (bz - az) ** 2),
        0,
        1,
      );
      return Math.hypot(x - ax - t * (bx - ax), z - az - t * (bz - az));
    }),
  );
}

function occupied(x, z) {
  return (
    Math.hypot(Math.max(0, Math.abs(x) - 1.8), z) < 3.14 ||
    (x > -6.15 && x < -0.5 && z > -11.5 && z < -7.5) ||
    (x > 4.3 && x < 9.1 && z > -8.7 && z < -4.3)
  );
}

export function faleGroundHeight(x, z) {
  const edge = THREE.MathUtils.smoothstep(
    Math.max(Math.abs(x) - 7, Math.abs(z + 1) - 9),
    0,
    10,
  );
  const hills = THREE.MathUtils.smoothstep(
    Math.max(Math.abs(x), Math.abs(z)),
    20,
    65,
  );
  return (
    edge * (0.12 + 0.1 * Math.sin(x * 0.6) * Math.sin(z * 0.4)) +
    hills * (5 + 2 * Math.sin(x * 0.065 + z * 0.05))
  );
}

export function buildFaleLandscape(k, m, miniature) {
  const extent = miniature ? [-11, 11, -13, 10] : [-65, 65, -65, 65];
  const [x0, x1, z0, z1] = extent;
  const geometry = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 180, 180);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = geometry.attributes.position,
    colors = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i);
    p.setY(i, faleGroundHeight(x, z));
    geometry.attributes.uv.setXY(i, x * 0.7, z * 0.7);
    const route =
      1 - THREE.MathUtils.smoothstep(faleRouteDistance(x, z), 0.35, 0.9);
    const color = new THREE.Color(0xb8c493).lerp(
      new THREE.Color(0xe4cfad),
      route,
    );
    if (x > 4.3 && x < 9.1 && z > -8.7 && z < -4.3) color.setHex(0xcfbd9a);
    color.multiplyScalar(0.9 + 0.09 * Math.sin(x * 3 + z) * Math.sin(z * 2));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const ground = k.mesh(geometry, m.ground);
  ground.castShadow = false;
  if (miniature) {
    const boundary = [];
    for (let i = 0; i < 80; i++) boundary.push([x0 + ((x1 - x0) * i) / 80, z0]);
    for (let i = 0; i < 80; i++) boundary.push([x1, z0 + ((z1 - z0) * i) / 80]);
    for (let i = 0; i < 80; i++) boundary.push([x1 - ((x1 - x0) * i) / 80, z1]);
    for (let i = 0; i < 80; i++) boundary.push([x0, z1 - ((z1 - z0) * i) / 80]);
    buildCutawayTerrain(k, {
      boundary: boundary.map(([x, z]) => [x, faleGroundHeight(x, z), z]),
      bottom: -1.2,
      soilDepth: 0.18,
      soil: k.material(0x6a654c, 1),
      rock: m.stone[1],
    });
  }
  const vegetation = tropicalVegetation(k, {
    leafColor: 0x6d9954,
    bark: m.bark,
  });
  for (const [x, z, height] of [
    [-8, -5, 8],
    [9, 3, 8.5],
    [-8, 6, 7.5],
    [6.8, -11, 9],
    [-8, -11, 8],
    [10, -9, 8],
  ]) {
    vegetation.palm([x, faleGroundHeight(x, z), z], {
      height,
      radius: height * 0.34,
    });
  }
  for (let i = 0; i < 28; i++) {
    const side = i % 2 ? -1 : 1,
      x = side * (8.5 + 0.9 * Math.sin(i * 2.3)),
      z = -10 + (i / 28) * 17;
    if (occupied(x, z)) continue;
    vegetation.understory([x, faleGroundHeight(x, z), z], {
      height: 0.7 + (i % 4) * 0.23,
    });
  }
  if (!miniature)
    for (let i = 0; i < 22; i++) {
      const a = i * 2.399,
        r = 20 + (i % 7);
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      vegetation.palm([x, faleGroundHeight(x, z), z], {
        height: 7 + (i % 5),
        radius: 3.2,
      });
    }
  if (!miniature)
    for (let i = 0; i < 65; i++) {
      const a = i * 2.399,
        r = 15 + (i % 9) * 1.2;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      vegetation.understory([x, faleGroundHeight(x, z), z], {
        height: 1.5 + (i % 5) * 0.35,
      });
    }
  const treeKit = {
    ...k,
    m: { ...k.m, bark: m.bark },
    geometries: { add: (geometry) => k.ownGeometry(geometry) },
  };
  const foliage = { broadleaf: m.canopy };
  for (const [x, z, height, radius] of [
    [-8, 1, 5, 2.4],
    [6, 9, 4.5, 2],
    [-7.8, -9, 4.8, 2.2],
    [1.8, -11.2, 5.2, 2.4],
  ])
    createOutdoorTree(treeKit, foliage, [x, faleGroundHeight(x, z), z], {
      height,
      radius,
    });
  if (!miniature)
    for (let i = 0; i < 42; i++) {
      const a = i * 2.399,
        r = 18 + (i % 6) * 3.2;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      createOutdoorTree(treeKit, foliage, [x, faleGroundHeight(x, z), z], {
        height: 5 + (i % 5) * 0.8,
        radius: 2.8 + (i % 3) * 0.4,
      });
    }
  const positions = [];
  const random = (i) => {
    const value = Math.sin(i * 127.1 + 31.7) * 43758.5453;
    return value - Math.floor(value);
  };
  for (let i = 0; i < 100000; i++) {
    const x = -10.8 + random(i * 2) * 21.6;
    const z = -12.8 + random(i * 2 + 1) * 22.6;
    if (occupied(x, z) || faleRouteDistance(x, z) < 0.45 + 0.1 * Math.sin(i))
      continue;
    positions.push([x, faleGroundHeight(x, z) - 0.002, z]);
  }
  grassCover(k, { positions });
}
