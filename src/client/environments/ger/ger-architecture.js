import * as THREE from "three";
import { shapedTimber } from "../shared/natural-forms.js";

export const GER = Object.freeze({
  radius: 3.1,
  wall: 1.68,
  crown: 2.86,
  crownRadius: 0.67,
  doorWidth: 1.08,
  doorHeight: 1.5,
});
const tau = Math.PI * 2;
const point = (r, a, y) => [Math.sin(a) * r, y, Math.cos(a) * r];
const fabricFold = (a, y, r) =>
  (0.013 * Math.sin(a * 31 + y * 1.8) +
    0.007 * Math.sin(a * 57 - y * 4) +
    0.009 * Math.sin(y * 17 + a * 4.2) * Math.sin(a * 13)) *
  Math.min(1, r);

// Closed cross-sections preserve actual textile thickness, including cut edges.
export function gerCoverGeometry(profile, start, span, segments = 144) {
  const resolved = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i],
      b = profile[i + 1];
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.07),
    );
    for (let j = 0; j < steps; j++)
      resolved.push(
        new THREE.Vector2(
          THREE.MathUtils.lerp(a[0], b[0], j / steps),
          THREE.MathUtils.lerp(a[1], b[1], j / steps),
        ),
      );
  }
  resolved.push(new THREE.Vector2(...profile.at(-1)));
  const shape = new THREE.LatheGeometry(resolved, segments, start, span);
  const p = shape.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const a = Math.atan2(x, z),
      r = Math.hypot(x, z);
    const fold = fabricFold(a, y, r);
    p.setXYZ(i, x + Math.sin(a) * fold, y, z + Math.cos(a) * fold);
  }
  shape.computeVertexNormals();
  if (span < Math.PI * 2 - 0.001) {
    const triangles = THREE.ShapeUtils.triangulateShape(
      resolved.slice(0, -1),
      [],
    );
    const indices = Array.from(shape.index.array);
    for (const [column, reverse] of [
      [0, true],
      [segments, false],
    ]) {
      const offset = column * resolved.length;
      for (const triangle of triangles) {
        const [a, b, c] = triangle.map((i) => i + offset);
        indices.push(...(reverse ? [a, c, b] : [a, b, c]));
      }
    }
    shape.setIndex(indices);
    shape.computeVertexNormals();
  }
  return shape;
}

export function buildGerArchitecture(k, m) {
  const { radius: r, wall, crown, crownRadius: cr } = GER;
  const roof = k.lift(k.sub());
  roof.name = "Ger roof, radial poles and front enclosure";
  const frontAngle = Math.PI / 3;
  const doorway = Math.asin(0.6 / r);
  const wallProfile = [
    [r, 0.14],
    [r + 0.075, 0.14],
    [r + 0.075, wall + 0.1],
    [r, wall + 0.1],
    [r, 0.14],
  ];
  const cover = (profile, start, span, mat, parent) =>
    k.mesh(
      gerCoverGeometry(profile, start, span),
      mat,
      [0, 0, 0],
      [0, 0, 0],
      parent,
    );
  cover(wallProfile, frontAngle, tau - frontAngle * 2, m.canvas, k.group);
  for (const sign of [-1, 1]) {
    const start = sign > 0 ? doorway : tau - frontAngle;
    cover(wallProfile, start, frontAngle - doorway, m.canvas, roof);
  }
  const inner = [
    [r - 0.025, 0.16],
    [r, 0.16],
    [r, wall + 0.07],
    [r - 0.025, wall + 0.07],
    [r - 0.025, 0.16],
  ];
  cover(inner, frontAngle, tau - frontAngle * 2, m.lining, k.group);
  for (const sign of [-1, 1])
    cover(
      inner,
      sign > 0 ? doorway : tau - frontAngle,
      frontAngle - doorway,
      m.lining,
      roof,
    );
  cover(
    [
      [r + 0.1, wall + 0.05],
      [cr, crown + 0.1],
      [cr, crown + 0.045],
      [r + 0.1, wall - 0.005],
      [r + 0.1, wall + 0.05],
    ],
    0,
    tau,
    m.canvas,
    roof,
  );
  cover(
    [
      [r, wall - 0.005],
      [cr, crown + 0.04],
      [cr, crown],
      [r, wall - 0.045],
      [r, wall - 0.005],
    ],
    0,
    tau,
    m.felt,
    roof,
  );
  // Two families of laths follow the cylindrical wall instead of cutting chords through it.
  const low = 0.18,
    high = wall - 0.04,
    slope = 0.31;
  const tieGeometry = k.ownGeometry(new THREE.IcosahedronGeometry(0.013, 1));
  for (let index = 0; index < 70; index++) {
    const start = (index * tau) / 70;
    for (const sign of [-1, 1]) {
      const cuts = [low, high];
      for (const turn of [-tau, 0, tau])
        for (const boundary of [
          -frontAngle,
          -doorway - 0.025,
          doorway + 0.025,
          frontAngle,
        ]) {
          const y = low + (turn + boundary - start) / (sign * slope);
          if (y > low && y < high) cuts.push(y);
        }
      cuts.sort((a, b) => a - b);
      for (let section = 1; section < cuts.length; section++) {
        const from = cuts[section - 1],
          to = cuts[section];
        const mid = start + sign * ((from + to) / 2 - low) * slope;
        const angle = Math.atan2(Math.sin(mid), Math.cos(mid));
        if (Math.abs(angle) < doorway + 0.025) continue;
        const parent = Math.abs(angle) < frontAngle ? roof : k.group;
        const steps = Math.max(1, Math.ceil((to - from) / 0.18));
        const at = (fraction) => {
          const y = THREE.MathUtils.lerp(from, to, fraction);
          return point(
            r - 0.08 - (sign > 0 ? 0.014 : 0),
            start + sign * (y - low) * slope,
            y,
          );
        };
        for (let j = 0; j < steps; j++)
          shapedTimber(
            k,
            at(j / steps),
            at((j + 1) / steps),
            0.026,
            m.wood[index % 4],
            parent,
            { depth: 0.016, segments: 3, relief: 0.0002, taper: 0 },
          );
      }
      if (sign < 0) continue;
      for (let row = 1; row <= 10; row++) {
        const y = low + (row * tau) / (70 * 2 * slope);
        if (y >= high) continue;
        const a = start + sign * (y - low) * slope;
        const signed = Math.atan2(Math.sin(a), Math.cos(a));
        if (Math.abs(signed) < doorway + 0.03) continue;
        k.mesh(
          tieGeometry,
          m.rope,
          point(r - 0.105, a, y),
          [0, a, 0],
          Math.abs(signed) < frontAngle ? roof : k.group,
        );
      }
    }
  }
  for (let i = 0; i < 64; i++) {
    const a = (i * tau) / 64;
    shapedTimber(
      k,
      point(r - 0.06, a, wall - 0.04),
      point(cr + 0.04, a, crown - 0.02),
      0.041,
      i % 4 ? m.paint : m.wood[1],
      roof,
      { depth: 0.034, taper: 0.13, seed: i, segments: 10, relief: 0.00035 },
    );
  }
  k.lathe(
    [
      [cr - 0.06, crown - 0.08],
      [cr + 0.1, crown - 0.08],
      [cr + 0.1, crown + 0.11],
      [cr - 0.06, crown + 0.11],
      [cr - 0.06, crown - 0.08],
    ],
    [0, 0, 0],
    m.paint,
    roof,
    96,
  );
  for (const x of [-0.62, 0.62]) {
    shapedTimber(
      k,
      [x, 0.13, 0],
      [x, crown - 0.055, 0],
      0.075,
      m.paint,
      k.group,
      { depth: 0.08, segments: 20, taper: 0.05 },
    );
    k.box([0.24, 0.09, 0.16], [x, crown - 0.09, 0], m.paint);
    k.box([0.12, 0.045, 0.13], [x, 0.155, 0], m.wood[0]);
  }
  for (const z of [-0.25, 0.25])
    shapedTimber(
      k,
      [-0.57, crown + 0.04, z],
      [0.57, crown + 0.04, z],
      0.025,
      m.paint,
      roof,
      { segments: 4, depth: 0.035 },
    );
  // A folded cover leaves the crown visibly open, rather than a transparent plug.
  k.cushion(
    [1.25, 0.085, 0.45],
    [0, crown + 0.16, -0.65],
    m.canvas,
    roof,
    [-0.3, 0, 0],
  );
  for (const y of [0.48, 1.22, 1.65]) {
    for (const [start, end, parent] of [
      [doorway, frontAngle, roof],
      [frontAngle, tau - frontAngle, k.group],
      [tau - frontAngle, tau - doorway, roof],
    ]) {
      const count = Math.ceil((end - start) * 55);
      const section = Array.from({ length: count + 1 }, (_, i) => {
        const a = start + ((end - start) * i) / count;
        const signed = Math.atan2(Math.sin(a), Math.cos(a));
        return point(r + 0.091 + fabricFold(signed, y, r), a, y);
      });
      k.tube(section, 0.011, m.rope, parent);
    }
  }
  // Narrow, stitched overlaps follow the same displaced cloth as the cover.
  for (let i = 0; i < 10; i++) {
    const a = doorway + ((tau - 2 * doorway) * (i + 0.5)) / 10;
    const signed = Math.atan2(Math.sin(a), Math.cos(a));
    const parent = Math.abs(signed) < frontAngle ? roof : k.group;
    for (const offset of [-0.003, 0.003])
      k.tube(
        Array.from({ length: 40 }, (_, row) => {
          const y = 0.16 + (row / 39) * 1.52;
          return point(
            r + 0.077 + fabricFold(signed + offset, y, r),
            a + offset,
            y,
          );
        }),
        0.0025,
        m.canvas,
        parent,
      );
  }
  for (const a of [-1.3, 1.3]) {
    const nodes = [
      point(r + 0.12, a, 0.17),
      point(r + 0.11, a, wall + 0.06),
      point(1.7, a, 2.48),
      point(cr, a, crown + 0.13),
    ];
    k.tube(nodes, 0.013, m.rope, roof);
  }
  const door = k.lift(k.sub([0, 0.13, 3.015]));
  const frameHeight = GER.doorHeight + 0.05;
  for (const x of [-0.59, 0.59])
    k.box([0.1, frameHeight, 0.19], [x, frameHeight / 2, 0], m.paint, door);
  k.box([1.28, 0.1, 0.2], [0, frameHeight, 0], m.paint, door);
  k.box([1.18, 0.06, 0.29], [0, 0.03, 0], m.wood[1], door);
  const leaf = k.sub([-0.54, 0.06, 0.03], -1.85, door);
  for (let i = 0; i < 7; i++)
    shapedTimber(
      k,
      [i * 0.151 + 0.075, 0, 0],
      [i * 0.151 + 0.075, GER.doorHeight - 0.07, 0],
      0.148,
      m.paint,
      leaf,
      { depth: 0.05, segments: 8, taper: 0 },
    );
  for (const y of [0.2, 0.76, 1.28])
    k.box([1.06, 0.055, 0.035], [0.53, y, -0.04], m.wood[0], leaf);
  for (const y of [0.26, 1.2])
    k.cylinder(0.017, 0.1, [0.01, y, 0], m.steel, leaf);
  k.ring(0.03, 0.005, [0.9, 0.75, 0.04], m.steel, leaf, [0, 0, 0]);
  // Individually fitted boards meet the circular perimeter with no projecting corners.
  for (let i = -14; i <= 14; i++) {
    const x = i * 0.209;
    const half = Math.sqrt(
      Math.max(0, (r - 0.05) ** 2 - (Math.abs(x) + 0.103) ** 2),
    );
    if (!half) continue;
    for (let row = 0; row < 3; row++) {
      const length = (half * 2) / 3;
      k.box(
        [0.204, 0.055, length - 0.006],
        [x, 0.1025, -half + length * (row + 0.5)],
        m.wood[(i + 15 + row) % 4],
        k.group,
        0.002,
      );
    }
  }
  k.cylinder(r + 0.01, 0.11, [0, 0.047, 0], m.wood[0], k.group, r + 0.01, 128);
  return { roof };
}
