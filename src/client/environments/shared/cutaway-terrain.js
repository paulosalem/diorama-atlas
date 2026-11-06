import * as THREE from "three";

function mineralNoise(x, y, z) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z);
  const smooth = (value) => value * value * (3 - 2 * value);
  const fx = smooth(x - ix),
    fy = smooth(y - iy),
    fz = smooth(z - iz);
  const hash = (a, b, c) => {
    let value =
      Math.imul(a, 374761393) ^
      Math.imul(b, 668265263) ^
      Math.imul(c, 2147483647);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
  };
  const mix = (a, b, t) => a + (b - a) * t;
  return (
    mix(
      mix(
        mix(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx),
        mix(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx),
        fy,
      ),
      mix(
        mix(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx),
        mix(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx),
        fy,
      ),
      fz,
    ) *
      2 -
    1
  );
}

export function cutawayRockRelief(x, y, z) {
  return (
    0.028 * mineralNoise(x * 1.3, y * 1.1, z * 1.3) +
    0.012 * mineralNoise(x * 4.7 + 11, y * 3.1, z * 4.7 - 7) +
    0.004 * mineralNoise(x * 11.3, y * 9.1 + 3, z * 11.3)
  );
}

/** A closed terrain section, with a thin soil horizon above textured bedrock. */
export function buildCutawayTerrain(
  k,
  {
    boundary,
    bottom,
    soilDepth = 0.36,
    soil,
    rock,
    relief = cutawayRockRelief,
  },
) {
  if (
    boundary.length < 4 ||
    !Number.isFinite(bottom) ||
    !Number.isFinite(soilDepth) ||
    soilDepth <= 0 ||
    boundary.some(
      (point) =>
        point.length !== 3 ||
        !point.every(Number.isFinite) ||
        point[1] - soilDepth * 1.17 <= bottom,
    )
  )
    throw new Error("A cutaway needs a finite boundary above its bedrock.");
  const sampled = [];
  let distance = 0;
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i],
      b = boundary[(i + 1) % boundary.length];
    const length = Math.hypot(b[0] - a[0], b[2] - a[2]);
    if (length === 0) {
      if (a[1] !== b[1]) sampled.push([...a, distance]);
      continue;
    }
    const steps = Math.ceil(length / 0.35);
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      sampled.push([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
        distance + length * t,
      ]);
    }
    distance += length;
  }
  const area = boundary.reduce((sum, point, i) => {
    const next = boundary[(i + 1) % boundary.length];
    return sum + point[0] * next[2] - next[0] * point[2];
  }, 0);
  if (sampled.length < 3 || Math.abs(area) < 1e-10)
    throw new Error("A cutaway boundary needs a nonzero horizontal footprint.");
  const meshes = [];
  for (const [material, rows, isRock] of [
    [rock, 128, true],
    [soil, 3, false],
  ]) {
    const positions = [],
      uv = [],
      indices = [];
    for (let i = 0; i <= sampled.length; i++) {
      const [x, top, z, along] = sampled[i % sampled.length];
      const previous = sampled[(i + sampled.length - 1) % sampled.length];
      const next = sampled[(i + 1) % sampled.length];
      const normal = new THREE.Vector2(
        next[2] - previous[2],
        previous[0] - next[0],
      ).normalize();
      const depth = soilDepth * (1 + 0.17 * Math.sin(x * 1.7 + z * 2.4));
      for (let row = 0; row <= rows; row++) {
        const fraction = row / rows;
        const y = isRock
          ? bottom + fraction * (top - depth - bottom)
          : top - depth + fraction * depth;
        const offset = isRock
          ? relief(x, y, z) * Math.sin(Math.PI * fraction)
          : 0;
        if (!Number.isFinite(offset))
          throw new Error("Cutaway relief must remain finite.");
        positions.push(x + normal.x * offset, y, z + normal.y * offset);
        uv.push((i === sampled.length ? distance : along) * 0.35, y * 0.35);
        if (i < sampled.length && row < rows) {
          const a = i * (rows + 1) + row,
            b = a + rows + 1;
          indices.push(a, b + 1, b, a, a + 1, b + 1);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    meshes.push(k.mesh(geometry, material));
  }
  const outline = new THREE.Shape(
    boundary.map(([x, , z]) => new THREE.Vector2(x, z)),
  );
  const underside = new THREE.ShapeGeometry(outline);
  underside.rotateX(Math.PI / 2);
  meshes.push(k.mesh(underside, rock, [0, bottom, 0]));
  return meshes;
}

export function buildTerrainStrip(
  k,
  material,
  front,
  back,
  { left, right, samples = 100 },
) {
  const positions = [],
    uv = [],
    indices = [];
  for (let i = 0; i <= samples; i++) {
    const x = left + ((right - left) * i) / samples;
    for (const boundary of [front, back]) {
      const [y, z] = boundary(x);
      positions.push(x, y, z);
      uv.push(x * 0.5, z * 0.5);
    }
    if (i < samples) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return k.mesh(geometry, material);
}
