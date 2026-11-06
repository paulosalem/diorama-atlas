import * as THREE from "three";
import { shapedTimber } from "../shared/natural-forms.js";

export const SAUNA = Object.freeze({
  left: -2.8,
  right: 3,
  back: -2.4,
  front: 1.4,
  partition: 0.8,
  floor: 0.35,
  ceiling: 2.65,
  ridge: 3.7,
  doorWidth: 0.88,
  doorHeight: 1.9,
});

function frame(k, m, parent, hole, door = false) {
  const height = hole.top - hole.bottom;
  for (const sign of [-1, 1])
    k.box(
      [0.065, height + 0.12, 0.24],
      [
        hole.x + sign * (hole.width / 2 + 0.032),
        (hole.bottom + hole.top) / 2,
        0,
      ],
      m.wood[1],
      parent,
    );
  k.box(
    [hole.width + 0.19, 0.07, 0.25],
    [hole.x, hole.top + 0.035, 0],
    m.wood[1],
    parent,
  );
  k.box(
    [hole.width + 0.08, 0.045, door ? 0.23 : 0.3],
    [hole.x, hole.bottom - 0.023, 0],
    m.wood[2],
    parent,
  );
  if (door) {
    const pivot = k.sub(
      [hole.x - hole.width / 2 + 0.012, hole.bottom, 0.04],
      hole.openAngle ?? -1.49,
      parent,
    );
    for (let i = 0; i < 7; i++)
      k.box(
        [(hole.width - 0.03) / 7 - 0.002, height - 0.045, 0.048],
        [((i + 0.5) * (hole.width - 0.03)) / 7, height / 2, 0],
        m.wood[i % 4],
        pivot,
        0.004,
      );
    for (const y of [0.24, height - 0.25]) {
      k.box(
        [hole.width - 0.08, 0.08, 0.035],
        [hole.width / 2, y, -0.035],
        m.wood[0],
        pivot,
      );
      k.cylinder(0.012, 0.085, [0, y, 0], m.metal, pivot);
    }
    for (const sign of [-1, 1]) {
      k.box(
        [0.03, 0.2, 0.035],
        [hole.width - 0.11, 0.9, sign * 0.07],
        m.wood[2],
        pivot,
      );
      for (const y of [0.82, 0.98])
        k.box(
          [0.03, 0.025, 0.05],
          [hole.width - 0.11, y, sign * 0.04],
          m.wood[2],
          pivot,
        );
    }
  } else {
    k.box(
      [hole.width - 0.035, height - 0.035, 0.008],
      [hole.x, (hole.bottom + hole.top) / 2, 0],
      k.m.glass,
      parent,
      0,
    );
    k.box(
      [0.025, height, 0.035],
      [hole.x, (hole.bottom + hole.top) / 2, 0.03],
      m.wood[1],
      parent,
    );
  }
}

function wall(k, m, { position, angle = 0, width, holes = [], lift = false }) {
  const group = k.sub(position, angle);
  if (lift) k.lift(group);
  const height = SAUNA.ceiling - SAUNA.floor;
  const rows = 15;
  k.wallWithOpenings(group, width, height, 0.15, holes, m.wood[1], SAUNA.floor);
  const lining = k.sub([0, 0, 0.0875], 0, group);
  const cladding = k.sub([0, 0, -0.0875], 0, group);
  for (let i = 0; i < rows; i++) {
    const bottom = SAUNA.floor + (i * height) / rows;
    k.wallWithOpenings(
      lining,
      width,
      height / rows - 0.003,
      0.025,
      holes,
      m.wood[i % 4],
      bottom,
    );
    k.wallWithOpenings(
      cladding,
      width,
      height / rows - 0.004,
      0.025,
      holes,
      m.outside[i % 3],
      bottom,
    );
  }
  group.traverse((object) => {
    if (object.isMesh) object.userData.timberAxis = 0;
  });
  for (const sign of [-1, 1])
    k.box(
      [0.11, height, 0.028],
      [sign * (width / 2 - 0.055), SAUNA.floor + height / 2, -0.113],
      m.outside[1],
      group,
      0.003,
    );
  for (const hole of holes) frame(k, m, group, hole, hole.door);
  return group;
}

export function saunaRoofGeometry(side) {
  const left = side < 0 ? -3.1 : 0.1;
  const right = side < 0 ? 0.1 : 3.3;
  const shape = new THREE.Shape([
    new THREE.Vector2(left, -2.75),
    new THREE.Vector2(right, -2.75),
    new THREE.Vector2(right, 3.85),
    new THREE.Vector2(left, 3.85),
  ]);
  if (side < 0) {
    const hole = new THREE.Path();
    hole.moveTo(-2.31, -0.16);
    hole.lineTo(-2.31, 0.36);
    hole.lineTo(-1.79, 0.36);
    hole.lineTo(-1.79, -0.16);
    hole.closePath();
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.065,
    bevelEnabled: false,
  });
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getY(i),
      depth = p.getZ(i);
    p.setXYZ(i, x, SAUNA.ridge - Math.abs(x - 0.1) * 0.33 - depth, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function buildSaunaArchitecture(k, m) {
  const { floor, ceiling } = SAUNA;
  k.box([5.98, 0.32, 4], [0.1, floor - 0.18, -0.5], m.stone[1], k.group, 0.025);
  const frontWindow = { x: -1.1, width: 1.15, bottom: 1.5, top: 2.13 };
  const outerDoor = {
    x: 1.9,
    width: SAUNA.doorWidth,
    bottom: floor + 0.025,
    top: floor + SAUNA.doorHeight,
    door: true,
    openAngle: 1.49,
  };
  wall(k, m, {
    position: [0.1, 0, 1.4],
    angle: Math.PI,
    width: 5.98,
    holes: [
      { ...frontWindow, x: 1.2 },
      { ...outerDoor, x: -1.8 },
    ],
    lift: true,
  });
  wall(k, m, {
    position: [0.1, 0, -2.4],
    width: 5.98,
    holes: [{ x: -1.2, width: 0.8, bottom: 2.03, top: 2.4 }],
  });
  wall(k, m, { position: [-2.8, 0, -0.5], angle: Math.PI / 2, width: 3.8 });
  wall(k, m, {
    position: [3, 0, -0.5],
    angle: -Math.PI / 2,
    width: 3.8,
    holes: [{ x: 0, width: 1, bottom: 1.2, top: 2.15 }],
    lift: true,
  });
  wall(k, m, {
    position: [0.8, 0, -0.5],
    angle: Math.PI / 2,
    width: 3.8,
    holes: [
      {
        x: -1,
        width: SAUNA.doorWidth,
        bottom: floor + 0.025,
        top: floor + SAUNA.doorHeight,
        door: true,
      },
    ],
  });
  for (let x = -2.65; x < 0.7; x += 0.3)
    for (let z = -2.25; z < 1.3; z += 0.3)
      k.box(
        [0.292, 0.025, 0.292],
        [x, floor - 0.0125, z],
        m.floor[Math.abs(Math.round(x * 13 + z * 7)) % 3],
        k.group,
        0.003,
      );
  for (let x = 0.96; x < 2.95; x += 0.145)
    k.box(
      [0.141, 0.035, 3.6],
      [x, floor - 0.0175, -0.5],
      m.wood[Math.abs(Math.round(x * 21)) % 4],
      k.group,
      0.003,
    );
  const roof = k.lift(k.sub());
  for (let x = -2.7; x < 2.99; x += 0.145) {
    const chimney = x > -2.32 && x < -1.78;
    for (const [from, to] of chimney
      ? [
          [-2.4, -0.18],
          [0.38, 1.4],
        ]
      : [[-2.4, 1.4]])
      k.box(
        [0.142, 0.09, to - from],
        [x, ceiling + 0.045, (to + from) / 2],
        m.wood[Math.abs(Math.round(x * 17)) % 4],
        roof,
        0.003,
      );
  }
  const collar = new THREE.Shape()
    .moveTo(-0.4, -0.32)
    .lineTo(0.4, -0.32)
    .lineTo(0.4, 0.32)
    .lineTo(-0.4, 0.32)
    .closePath();
  const flue = new THREE.Path();
  flue.absarc(0, 0, 0.08, 0, Math.PI * 2, true);
  collar.holes.push(flue);
  const collarGeometry = new THREE.ExtrudeGeometry(collar, {
    depth: 0.018,
    bevelEnabled: false,
    curveSegments: 48,
  });
  collarGeometry.rotateX(Math.PI / 2);
  k.mesh(collarGeometry, m.metal, [-2.05, ceiling, 0.1], [0, 0, 0], roof);
  k.ring(0.092, 0.012, [-2.05, ceiling - 0.017, 0.1], m.metal, roof);
  for (const side of [-1, 1])
    k.mesh(saunaRoofGeometry(side), m.roof, [0, 0, 0], [0, 0, 0], roof);
  for (let x = -3.02; x < 3.25; x += 0.14)
    k.box(
      [0.146, 0.025, 2.26],
      [x, SAUNA.ridge - Math.abs(x - 0.1) * 0.33 - 0.084, 2.68],
      m.wood[Math.abs(Math.round(x * 13)) % 4],
      roof,
      0.002,
      [0, 0, x < 0.1 ? Math.atan(0.33) : -Math.atan(0.33)],
    );
  for (const [x0, x1, z0, z1] of [
    [-2.44, -1.66, -0.31, -0.115],
    [-2.44, -1.66, 0.315, 0.51],
    [-2.44, -2.265, -0.115, 0.315],
    [-1.835, -1.66, -0.115, 0.315],
  ]) {
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    geo.rotateX(-Math.PI / 2);
    geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setY(i, SAUNA.ridge - Math.abs(p.getX(i) - 0.1) * 0.33 + 0.012);
    geo.computeVertexNormals();
    k.mesh(geo, m.metal, [0, 0, 0], [0, 0, 0], roof);
  }
  for (let z = -2.65; z < 3.8; z += 0.37) {
    for (const side of [-1, 1]) {
      const ranges =
        side < 0 && z > -0.16 && z < 0.36
          ? [
              [-3.1, -2.31],
              [-1.79, 0.1],
            ]
          : [[side < 0 ? -3.1 : 0.1, side < 0 ? 0.1 : 3.3]];
      for (const [a, b] of ranges)
        k.rod(
          [a, SAUNA.ridge - Math.abs(a - 0.1) * 0.33 + 0.008, z],
          [b, SAUNA.ridge - Math.abs(b - 0.1) * 0.33 + 0.008, z],
          0.009,
          m.roof,
          roof,
        );
    }
  }
  for (const z of [-2.55, 1.5, 3.7]) {
    for (const x of [-3.05, 3.25])
      shapedTimber(k, [x, 2.54, z], [0.1, 3.56, z], 0.14, m.outside[1], roof, {
        depth: 0.1,
        taper: 0,
        segments: 14,
      });
  }
  for (const z of [-2.4, 1.4]) {
    const profile = new THREE.Shape([
      new THREE.Vector2(-2.8, ceiling),
      new THREE.Vector2(3, ceiling),
      new THREE.Vector2(3, 2.678),
      new THREE.Vector2(0.1, 3.635),
      new THREE.Vector2(-2.8, 2.678),
    ]);
    const geo = new THREE.ExtrudeGeometry(profile, {
      depth: 0.14,
      bevelEnabled: false,
    });
    k.mesh(geo, m.outside[0], [0, 0, z - 0.07], [0, 0, 0], roof);
  }
  for (const x of [-2.7, 2.9]) {
    k.box([0.16, 0.18, 6.6], [x, 2.621, 0.55], m.outside[1], roof);
    shapedTimber(
      k,
      [x, floor, 3.5],
      [x, 2.62, 3.5],
      0.14,
      m.outside[2],
      k.group,
      { taper: 0, segments: 16 },
    );
    k.box([0.2, 0.45, 0.2], [x, 0.09, 3.5], m.stone[1]);
  }
  for (let z = 1.58; z < 3.65; z += 0.14)
    k.box(
      [5.82, 0.045, 0.135],
      [0.1, floor - 0.0225, z],
      m.outside[Math.abs(Math.round(z * 17)) % 3],
      k.group,
      0.005,
    );
  for (const x of [-2.5, -0.4, 1.7, 2.7])
    k.box([0.12, 0.2, 2.5], [x, 0.205, 2.5], m.outside[0]);
  k.box([1.35, 0.17, 0.42], [1.95, 0.1, 3.85], m.outside[1], k.group, 0.012);
  return { roof };
}
