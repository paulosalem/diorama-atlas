import * as THREE from "three";

/** A closed terrain section, with a thin soil horizon above textured bedrock. */
export function buildCutawayTerrain(
  k,
  { boundary, bottom, soilDepth = 0.36, soil, rock, relief = () => 0 },
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
        point[1] - soilDepth <= bottom,
    )
  )
    throw new Error("A cutaway needs a finite boundary above its bedrock.");
  const meshes = [];
  for (const [material, rows] of [
    [rock, 128],
    [soil, 3],
  ]) {
    const positions = [],
      uv = [],
      indices = [];
    for (let i = 0; i <= boundary.length; i++) {
      const [x, top, z] = boundary[i % boundary.length];
      const previous = boundary[(i + boundary.length - 1) % boundary.length];
      const next = boundary[(i + 1) % boundary.length];
      const normal = new THREE.Vector2(
        next[2] - previous[2],
        previous[0] - next[0],
      ).normalize();
      const depth = soilDepth * (1 + 0.17 * Math.sin(x * 1.7 + z * 2.4));
      for (let row = 0; row <= rows; row++) {
        const fraction = row / rows;
        const y =
          material === rock
            ? bottom + fraction * (top - depth - bottom)
            : top - depth + fraction * depth;
        const offset =
          material === rock
            ? relief(x, y, z) * Math.sin(Math.PI * fraction)
            : 0;
        if (!Number.isFinite(offset))
          throw new Error("Cutaway relief must remain finite.");
        positions.push(x + normal.x * offset, y, z + normal.y * offset);
        uv.push((x + z) * 0.35, y * 0.35);
        if (i < boundary.length && row < rows) {
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
