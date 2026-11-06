import * as THREE from "three";
import { shapedTimber } from "../shared/natural-forms.js";
import { wovenPanel } from "../shared/woven-panel.js";

export const FALE = Object.freeze({
  half: 1.8,
  radius: 3,
  floor: 0.42,
  eave: 2.65,
  ridge: 5.65,
});

export function falePerimeter(u, radius = FALE.radius, half = FALE.half) {
  const quarter = (((u % 1) + 1) % 1) * 4;
  if (quarter < 1) {
    const a = -Math.PI / 2 + quarter * Math.PI;
    return [half + radius * Math.cos(a), radius * Math.sin(a)];
  }
  if (quarter < 2) return [half - (quarter - 1) * half * 2, radius];
  if (quarter < 3) {
    const a = Math.PI / 2 + (quarter - 2) * Math.PI;
    return [-half + radius * Math.cos(a), radius * Math.sin(a)];
  }
  return [-half + (quarter - 3) * half * 2, -radius];
}

export function faleRoofPoint(
  u,
  v,
  {
    half = FALE.half,
    radius = 3.35,
    eave = FALE.eave,
    ridge = FALE.ridge,
  } = {},
) {
  const [x, z] = falePerimeter(u, radius * (1 - v), half);
  return [x, eave + (ridge - eave) * (0.65 * v + 0.35 * v ** 1.8), z];
}

export function faleRoofGeometry(options = {}) {
  const columns = 1536,
    rows = 48;
  const position = [],
    uv = [],
    index = [];
  for (let layer = 0; layer < 2; layer++)
    for (let row = 0; row <= rows; row++)
      for (let col = 0; col <= columns; col++) {
        const u = col / columns,
          v = (row / rows) * 0.997;
        const p = faleRoofPoint(u, v, options);
        const ripple = Math.sin(u * Math.PI * 2 * 192) * 0.009 * (1 - v * 0.8);
        p[1] += ripple - layer * 0.007;
        position.push(...p);
        uv.push(u * 28, v * 4);
      }
  const stride = columns + 1,
    count = stride * (rows + 1);
  for (let layer = 0; layer < 2; layer++)
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < columns; col++) {
        const a = layer * count + row * stride + col,
          b = a + stride;
        index.push(
          ...(layer
            ? [a, a + 1, b, a + 1, b + 1, b]
            : [a, b, a + 1, a + 1, b, b + 1]),
        );
      }
  for (const row of [0, rows])
    for (let col = 0; col < columns; col++) {
      const a = row * stride + col,
        b = a + count;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(position, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export function bindJoint(k, m, position, radius, parent, angle = 0) {
  const group = k.sub(position, 0, parent);
  group.rotation.z = angle;
  for (let band = 0; band < 9; band++) {
    const points = [];
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      points.push([
        Math.cos(a) * radius,
        (band - 4) * 0.008 + Math.sin(a * 2) * 0.016,
        Math.sin(a) * radius,
      ]);
    }
    k.tube(points, 0.0032, m.cord, group, true);
  }
  return group;
}

function platform(k, m) {
  const points = Array.from(
    { length: 192 },
    (_, i) => new THREE.Vector2(...falePerimeter(i / 192)),
  );
  const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(points), {
    depth: FALE.floor,
    bevelEnabled: false,
    curveSegments: 48,
  });
  geometry.rotateX(-Math.PI / 2);
  k.mesh(geometry, m.concrete);
  for (let i = 0; i < 112; i++) {
    const u = i / 112;
    const [x, z] = falePerimeter(u, 3.015);
    const next = falePerimeter(u + 0.0001, 3.015);
    const angle = -Math.atan2(next[1] - z, next[0] - x);
    const width = Math.hypot(next[0] - x, next[1] - z) / 0.0001 / 112;
    for (let row = 0; row < 2; row++)
      k.box(
        [width * 0.96, 0.185, 0.12],
        [x, 0.11 + row * 0.19, z],
        m.stone[i % 3],
        k.group,
        0.025,
        [0, angle, 0],
      );
  }
  for (const sign of [-1, 1])
    for (let step = 0; step < 3; step++)
      k.box(
        [1.65, 0.14 * (3 - step), 0.32],
        [0, 0.07 * (3 - step), sign * (3.15 + step * 0.31)],
        m.concrete,
        k.group,
        0.015,
      );
}

function mainFale(k, m) {
  platform(k, m);
  const roof = k.sub();
  roof.name = "Fale roof and attached framing";
  k.lift(roof);
  k.mesh(faleRoofGeometry(), m.roof, [0, 0, 0], [0, 0, 0], roof);
  for (let i = 0; i < 48; i++)
    for (const v of [0.13, 0.45, 0.75]) {
      const p = faleRoofPoint((i + 0.0625) / 48, v);
      p[1] += 0.009 * (1 - v * 0.8) + 0.003;
      k.sphere(0.007, p, m.zinc, roof, [1, 0.55, 1]);
    }
  k.box([3.72, 0.07, 0.22], [0, FALE.ridge + 0.035, 0], m.roof, roof, 0.03);
  const postPositions = [];
  for (const z of [-2.8, 2.8])
    for (const x of [-1.8, -0.9, 0.9, 1.8]) postPositions.push([x, z]);
  for (const side of [-1, 1])
    for (let i = 1; i < 8; i++) {
      const a = -Math.PI / 2 + (i / 8) * Math.PI;
      postPositions.push([side * (1.8 + 2.8 * Math.cos(a)), 2.8 * Math.sin(a)]);
    }
  for (const [i, [x, z]] of postPositions.entries()) {
    shapedTimber(k, [x, 0.39, z], [x, 2.95, z], 0.14, m.wood[i % 3], k.group, {
      round: true,
      taper: 0.03,
      relief: 0.0007,
      seed: i,
    });
    bindJoint(k, m, [x, 2.88, z], 0.076, k.group);
  }
  for (const x of [-1.65, 1.65]) {
    for (const z of [-1.3, 1.3]) {
      shapedTimber(k, [x, 0.39, z], [x, 4.1, z], 0.25, m.wood[0], k.group, {
        round: true,
        taper: 0.025,
        relief: 0.001,
        seed: x + z,
      });
      bindJoint(k, m, [x, 3.86, z], 0.135, k.group);
      for (let band = 0; band < 7; band++)
        for (const side of [-1, 1]) {
          const angle = (side * Math.PI) / 4 + (band - 3) * 0.025;
          const dx = Math.cos(angle),
            dz = Math.sin(angle);
          const lower = 3.8 + band * 0.006;
          const upper = 4.185 + band * 0.003;
          k.tube(
            [
              [x + dx * 0.126, lower, z + dz * 0.126],
              [x + dx * 0.167, 3.93, z + dz * 0.167],
              [x + dx * 0.167, upper - 0.035, z + dz * 0.167],
              [x + dx * 0.14, upper, z + dz * 0.14],
              [x, upper, z],
              [x - dx * 0.14, upper, z - dz * 0.14],
              [x - dx * 0.167, upper - 0.035, z - dz * 0.167],
              [x - dx * 0.167, 3.93, z - dz * 0.167],
              ...Array.from({ length: 17 }, (_, i) => {
                const a = angle + Math.PI + (i / 16) * Math.PI;
                return [
                  x + Math.cos(a) * 0.126,
                  lower,
                  z + Math.sin(a) * 0.126,
                ];
              }),
            ],
            0.0026,
            m.cord,
            k.group,
            true,
          );
        }
    }
    shapedTimber(k, [x, 4.015, -1.44], [x, 4.015, 1.44], 0.2, m.wood[1]);
    shapedTimber(k, [x, 4.07, 0], [x, 5.57, 0], 0.16, m.wood[2], roof);
    for (const z of [-1.3, 1.3])
      shapedTimber(
        k,
        [x, 3.8, z],
        [x, 4.85, Math.sign(z) * 0.65],
        0.09,
        m.wood[1],
        roof,
      );
  }
  for (const z of [-1.3, 1.3])
    shapedTimber(k, [-1.95, 4.07, z], [1.95, 4.07, z], 0.18, m.wood[1]);
  shapedTimber(k, [-1.85, 5.55, 0], [1.85, 5.55, 0], 0.18, m.wood[1], roof);
  for (const v of [0.025, 0.16418, 0.43, 0.64, 0.82]) {
    const points = Array.from({ length: 97 }, (_, i) => {
      const p = faleRoofPoint(i / 96, v);
      p[1] -= 0.085;
      return p;
    });
    k.tube(points, 0.043, m.wood[2], roof, true);
  }
  for (let i = 0; i < 48; i++) {
    const points = Array.from({ length: 20 }, (_, j) => {
      const p = faleRoofPoint(i / 48, (j / 19) * 0.99);
      p[1] -= 0.035;
      return p;
    });
    k.tube(points, 0.028, m.wood[i % 3], roof);
    if (i % 3 === 0)
      k.tube(
        points.map(([x, y, z]) => [x, y + 0.052, z]),
        0.009,
        m.roofSeam,
        roof,
      );
  }
  for (const [x, z, angle, lowered] of [
    [-1.35, -2.83, 0, false],
    [1.35, -2.83, 0, true],
    [3.8, -1.35, -0.9, false],
    [-3.8, -1.35, 0.9, true],
  ]) {
    const group = k.sub([x, 2.76, z], angle);
    group.name = "Suspended woven pola";
    for (let panel = 0; panel < (lowered ? 3 : 1); panel++) {
      const section = k.sub([0, -panel * 0.34 - 0.16, 0], 0, group);
      wovenPanel(k, {
        width: 0.82,
        height: 0.39,
        parent: section,
        material: m.leafDry,
        spacing: 0.025,
        surface: (x, y, z) => [x, y, z + Math.sin(x * 4) * 0.009],
      });
      for (const y of [-0.19, 0.19])
        k.rod([-0.42, y, 0.005], [0.42, y, 0.005], 0.008, m.cord, section);
    }
    for (const side of [-1, 1])
      k.rod(
        [side * 0.3, 0.11, 0.01],
        [side * 0.3, lowered ? -1.05 : -0.39, 0.01],
        0.003,
        m.cord,
        group,
      );
    k.animated.add(group);
    k.animations.push((_, time) => {
      group.rotation.x = Math.sin(time * 0.7 + x) * 0.012;
    });
  }
  return roof;
}

function shelter(k, m) {
  const group = k.sub([6.7, 0, -6.5], -0.13);
  group.name = "Connected cooking shelter";
  for (const x of [-1.8, 1.8])
    for (const z of [-1.7, 1.7]) {
      shapedTimber(
        k,
        [x, -0.06, z],
        [x, 2.76 - z * 0.12, z],
        0.13,
        m.wood[2],
        group,
        { round: true, seed: x + z },
      );
      bindJoint(k, m, [x, 2.7 - z * 0.12, z], 0.073, group);
    }
  for (const x of [-1.8, 0, 1.8])
    k.rod([x, 3.03, -2], [x, 2.55, 2], 0.055, m.wood[1], group);
  for (const z of [-1.7, 1.7])
    k.rod(
      [-1.9, 2.7 - z * 0.12, z],
      [1.9, 2.7 - z * 0.12, z],
      0.055,
      m.wood[1],
      group,
    );
  for (let panel = 0; panel < 6; panel++) {
    const geometry = new THREE.PlaneGeometry(0.7, 4.3, 56, 12);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getY(i);
      p.setXYZ(
        i,
        x,
        2.85 - z * 0.12 + Math.sin((x * Math.PI * 2) / 0.0875) * 0.012,
        z,
      );
    }
    geometry.computeVertexNormals();
    k.mesh(geometry, m.zinc, [(panel - 2.5) * 0.695, 0, 0], [0, 0, 0], group);
  }
  return group;
}

function home(k, m) {
  const group = k.sub([-3.3, 0, -9.5]);
  group.name = "Furnished private living room";
  k.box([5.4, 0.28, 3.8], [0, 0.14, 0], m.concrete, group);
  const front = k.sub([0, 0, 1.82], 0, group);
  const holes = [
    { x: 0.6, width: 0.98, bottom: 0.28, top: 2.38 },
    { x: -1.5, width: 1.15, bottom: 1.05, top: 2.18 },
  ];
  k.wallWithOpenings(front, 5.4, 2.55, 0.14, holes, m.wall, 0.28);
  for (const z of [-1.83])
    k.box([5.4, 2.55, 0.14], [0, 1.555, z], m.wall, group);
  for (const x of [-2.63, 2.63])
    k.box([0.14, 2.55, 3.52], [x, 1.555, 0], m.wall, group);
  for (const x of [-2.7, 2.56]) {
    const triangle = new THREE.Shape()
      .moveTo(-1.83, 2.83)
      .lineTo(0, 3.47)
      .lineTo(1.83, 2.83)
      .closePath();
    const gable = new THREE.ExtrudeGeometry(triangle, {
      depth: 0.14,
      bevelEnabled: false,
    });
    gable.rotateY(Math.PI / 2);
    k.mesh(gable, m.wall, [x, 0, 0], [0, 0, 0], group);
  }
  for (const hole of holes) {
    for (const side of [-1, 1])
      k.box(
        [0.065, hole.top - hole.bottom + 0.1, 0.22],
        [
          hole.x + side * (hole.width / 2 + 0.032),
          (hole.bottom + hole.top) / 2,
          0,
        ],
        m.trim,
        front,
      );
    for (const y of [hole.bottom, hole.top])
      k.box([hole.width + 0.18, 0.06, 0.23], [hole.x, y, 0], m.trim, front);
  }
  const door = k.sub([0.11, 0.28, 0.09], -1.5, front);
  for (let i = 0; i < 6; i++)
    k.box([0.154, 2.04, 0.035], [0.078 + i * 0.158, 1.03, 0], m.trim, door);
  k.sphere(0.025, [0.86, 0.95, 0.035], m.zinc, door);
  for (let i = 0; i < 7; i++)
    k.box(
      [1.12, 0.12, 0.016],
      [-1.5, 1.14 + i * 0.145, 0],
      k.m.glass,
      front,
      0,
      [-0.5, 0, 0],
    );
  for (let i = 0; i < 3; i++)
    k.box(
      [1.45, 0.095 * (3 - i), 0.3],
      [0.6, 0.0475 * (3 - i), 1.99 + i * 0.29],
      m.concrete,
      group,
    );
  for (const side of [-1, 1]) {
    const sheet = new THREE.PlaneGeometry(5.95, 2.2, 408, 20);
    const positions = sheet.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        z = side * (positions.getY(i) + 1.1);
      positions.setXYZ(
        i,
        x,
        3.47 -
          Math.abs(z) * 0.35 +
          Math.sin((x * Math.PI * 2) / 0.0875) * 0.011,
        z,
      );
    }
    sheet.computeVertexNormals();
    k.mesh(sheet, m.roof, [0, 0, 0], [0, 0, 0], group);
    k.rod(
      [-2.8, 2.75, side * 1.8],
      [2.8, 2.75, side * 1.8],
      0.07,
      m.wood[1],
      group,
    );
    for (let x = -2.6; x <= 2.6; x += 0.65)
      k.rod([x, 3.42, 0], [x, 2.68, side * 2.1], 0.04, m.wood[1], group);
  }
  k.box([6, 0.035, 0.2], [0, 3.49, 0], m.roofSeam, group, 0.012);
  return group;
}

export function buildFaleArchitecture(k, m) {
  return { roof: mainFale(k, m), cooking: shelter(k, m), home: home(k, m) };
}
