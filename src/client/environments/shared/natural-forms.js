import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

function geometry(position, uv, index) {
  const result = new THREE.BufferGeometry();
  result.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(position, 3),
  );
  result.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  result.setIndex(index);
  result.computeVertexNormals();
  return result;
}

function positive(...values) {
  if (values.some((value) => !Number.isFinite(value) || value <= 0))
    throw new Error("Natural forms require positive finite dimensions.");
}

/** A longitudinally shaped, closed member; its principal axis is local Y. */
export function timberGeometry({
  length,
  width,
  depth = width,
  seed = 1,
  round = false,
  taper = 0.035,
  bend = 0,
  relief = 0.0008,
  segments = 28,
  section = () => [1, 1],
}) {
  positive(length, width, depth, segments);
  const radial = 32;
  const positions = [],
    uv = [],
    indices = [];
  const phase = seed * 1.618;
  const point = (row, column) => {
    const t = row / segments;
    const angle = (column / radial) * Math.PI * 2;
    const [sectionX, sectionZ] = section(t);
    const exponent = round ? 1 : 0.17;
    const shape = (v) => Math.sign(v) * Math.abs(v) ** exponent;
    const radius =
      1 - taper * t + (round ? 0.028 : 0.004) * Math.sin(t * 6.1 + phase);
    const grain =
      relief *
      (0.55 * Math.sin(angle * 11 + phase + t * 1.8) +
        0.3 * Math.sin(angle * 23 - phase + t * 4.2));
    const endSplit = round
      ? Math.exp(-((Math.sin(angle - phase) / 0.1) ** 2)) *
        Math.exp(-t * 13) *
        width *
        0.045
      : 0;
    const shoulder = !round
      ? relief *
        2 *
        Math.exp(-(((t - 0.24 - 0.1 * Math.sin(phase)) / 0.09) ** 2)) *
        Math.max(0, Math.cos(angle * 4 + phase)) ** 8
      : 0;
    return [
      shape(Math.cos(angle)) *
        (width * 0.5 * radius * sectionX + grain - endSplit - shoulder) +
        bend * Math.sin(t * Math.PI),
      (t - 0.5) * length,
      shape(Math.sin(angle)) *
        (depth * 0.5 * radius * sectionZ + grain - shoulder) +
        bend * 0.35 * Math.sin(t * Math.PI) * Math.sin(t * Math.PI * 0.7),
    ];
  };
  for (let row = 0; row <= segments; row++) {
    for (let column = 0; column <= radial; column++) {
      positions.push(...point(row, column % radial));
      uv.push(column / radial, row / segments);
      if (row < segments && column < radial) {
        const a = row * (radial + 1) + column,
          b = a + radial + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  for (const row of [0, segments]) {
    const center = positions.length / 3;
    const t = row / segments;
    positions.push(
      bend * Math.sin(t * Math.PI),
      (t - 0.5) * length,
      bend * 0.35 * Math.sin(t * Math.PI) * Math.sin(t * Math.PI * 0.7),
    );
    uv.push(0.5, 0.5);
    for (let column = 0; column < radial; column++) {
      const p = point(row, column);
      positions.push(...p);
      uv.push(0.5 + p[0] / width, 0.5 + p[2] / depth);
    }
    for (let column = 0; column < radial; column++) {
      const a = center + 1 + column,
        b = center + 1 + ((column + 1) % radial);
      indices.push(...(row === 0 ? [center, a, b] : [center, b, a]));
    }
  }
  return geometry(positions, uv, indices);
}

export function shapedTimber(
  k,
  start,
  end,
  width,
  material,
  parent = k.group,
  options = {},
) {
  const a = new THREE.Vector3(...start),
    b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const object = k.mesh(
    timberGeometry({ ...options, length: direction.length(), width }),
    material,
    a.add(b).multiplyScalar(0.5).toArray(),
    [0, 0, 0],
    parent,
  );
  object.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  return object;
}

/** Continuous dressed face and narrow fitted joint, rather than bevelled polygon tiles. */
export function dressedStoneGeometry(
  points,
  depth,
  seed = 1,
  { edgeStep = 0.085, rings = 10 } = {},
) {
  positive(depth, edgeStep, rings);
  if (points.length < 3 || points.flat().some((n) => !Number.isFinite(n)))
    throw new Error("A dressed stone needs a finite polygon.");
  const center = points.reduce(
    (c, p) => [c[0] + p[0] / points.length, c[1] + p[1] / points.length],
    [0, 0],
  );
  const perimeter = [];
  for (let edge = 0; edge < points.length; edge++) {
    const a = points[edge],
      b = points[(edge + 1) % points.length];
    const steps = Math.max(
      3,
      Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / edgeStep),
    );
    for (let i = 0; i < steps; i++)
      perimeter.push([
        THREE.MathUtils.lerp(a[0], b[0], i / steps),
        THREE.MathUtils.lerp(a[1], b[1], i / steps),
      ]);
  }
  const positions = [],
    uv = [],
    indices = [];
  const count = perimeter.length,
    phase = seed * 2.399;
  const relief = (x, y) =>
    0.0028 *
      Math.sin(x * 16 + Math.sin(y * 11) + phase) *
      Math.sin(y * 19 - phase) +
    0.0011 * Math.sin(x * 79 + y * 61 + phase) -
    0.006 *
      Math.exp(
        -(
          (x - center[0] - 0.12 * Math.sin(phase)) ** 2 +
          (y - center[1] - 0.13 * Math.cos(phase)) ** 2
        ) / 0.003,
      );
  for (let ring = 0; ring <= rings; ring++) {
    const r = 1 - ring / (rings + 1);
    for (let i = 0; i < count; i++) {
      const edge = perimeter[i];
      const x = center[0] + (edge[0] - center[0]) * r * 0.998;
      const y = center[1] + (edge[1] - center[1]) * r * 0.998;
      const shoulder = Math.exp(
        -(((1 - r) / (0.075 + 0.025 * Math.sin(phase))) ** 2),
      );
      const face =
        depth +
        0.027 * (1 - r * r) -
        0.026 * shoulder +
        relief(x, y) * Math.min(1, (1 - r) * 12);
      positions.push(x, y, face);
      uv.push(x * 0.47, y * 0.47);
      if (ring < rings) {
        const a = ring * count + i,
          b = ring * count + ((i + 1) % count);
        indices.push(a, b, a + count, b, b + count, a + count);
      }
    }
  }
  const cap = positions.length / 3;
  positions.push(...center, depth + 0.027 + relief(...center));
  uv.push(center[0] * 0.47, center[1] * 0.47);
  for (let i = 0; i < count; i++)
    indices.push(rings * count + i, rings * count + ((i + 1) % count), cap);
  const rear = positions.length / 3;
  for (const [x, y] of perimeter) {
    positions.push(
      center[0] + (x - center[0]) * 0.998,
      center[1] + (y - center[1]) * 0.998,
      depth - 0.12,
    );
    uv.push(x * 0.47, y * 0.47);
  }
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    indices.push(i, rear + i, next, next, rear + i, rear + next);
  }
  const backCenter = positions.length / 3;
  positions.push(...center, depth - 0.12);
  uv.push(center[0] * 0.47, center[1] * 0.47);
  for (let i = 0; i < count; i++)
    indices.push(backCenter, rear + ((i + 1) % count), rear + i);
  return geometry(positions, uv, indices);
}

/** Batch spatially adjacent pieces while restoring full shape before close approach. */
export function staticDetailLevels(
  k,
  { near, far, material, parent = k.group, distance = 24 },
) {
  positive(distance);
  if (!near.length || near.length !== far.length)
    throw new Error(
      "Static detail levels require corresponding nonempty pieces.",
    );
  const geometries = [near, far].map((pieces) => {
    const merged = mergeGeometries(pieces);
    if (!merged)
      throw new Error("Static detail pieces have incompatible attributes.");
    pieces.forEach((piece) => piece.dispose());
    return merged;
  });
  geometries[0].computeBoundingSphere();
  const center = geometries[0].boundingSphere.center.clone();
  const radius = geometries[0].boundingSphere.radius;
  const lod = new THREE.LOD();
  lod.userData.staticDetail = true;
  lod.position.copy(center);
  geometries.forEach((geometry, index) => {
    geometry.translate(-center.x, -center.y, -center.z);
    const mesh = k.mesh(geometry, material, [0, 0, 0], [0, 0, 0], lod);
    lod.addLevel(mesh, index ? distance + radius : 0, 0.12);
  });
  // Keep the distance-selected children out of the kit's static merge.
  k.animated.add(lod);
  parent.add(lod);
  return lod;
}

export function laminaGeometry({
  length = 1,
  width = 0.32,
  bend = 0.3,
  seed = 1,
  segments = 24,
  columns = 6,
} = {}) {
  positive(length, width, segments, columns);
  const positions = [],
    uv = [],
    indices = [];
  for (let row = 0; row <= segments; row++) {
    const t = row / segments;
    for (let col = 0; col <= columns; col++) {
      const side = (col / columns) * 2 - 1;
      const tear =
        Math.abs(side) > 0.65 && t > 0.25
          ? 1 - 0.16 * Math.max(0, Math.sin(t * 63 + seed)) ** 12
          : 1;
      const half = Math.max(0.001, Math.sin(Math.PI * t) ** 0.68) * width * 0.5;
      positions.push(
        side * half * tear * (1 + 0.045 * Math.sin(t * 14 + seed)),
        t * length,
        bend * t * t +
          width * 0.11 * Math.abs(side) * Math.sin(Math.PI * t) +
          width * 0.018 * side * side * Math.sin(t * 75 + seed),
      );
      uv.push(col / columns, t);
      if (row < segments && col < columns) {
        const a = row * (columns + 1) + col,
          b = a + columns + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  return geometry(positions, uv, indices);
}

export function shavingGeometry(radius = 0.017, width = 0.006, turns = 1.6) {
  positive(radius, width, turns);
  const path = new THREE.CatmullRomCurve3(
    Array.from({ length: 33 }, (_, i) => {
      const a = (i / 32) * turns * Math.PI * 2;
      return new THREE.Vector3(
        (i / 32) * width * 1.7,
        radius * (1 - Math.cos(a)),
        radius * Math.sin(a),
      );
    }),
  );
  const section = new THREE.Shape();
  section.moveTo(-width / 2, -0.00035);
  section.lineTo(width / 2, -0.00035);
  section.lineTo(width / 2, 0.00035);
  section.lineTo(-width / 2, 0.00035);
  section.closePath();
  return new THREE.ExtrudeGeometry(section, {
    extrudePath: path,
    steps: 48,
    bevelEnabled: false,
  });
}
