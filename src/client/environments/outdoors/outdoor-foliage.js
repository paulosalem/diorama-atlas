import * as THREE from "three";

function foldedLeaf(width, length, segments = 7, region = [0, 0, 1, 1]) {
  const positions = [],
    uv = [],
    indices = [];
  for (let row = 0; row <= segments; row++) {
    const t = row / segments;
    const halfWidth =
      (Math.sin(Math.PI * t) ** 0.72 * width) / 2 + width * 0.012;
    for (const side of [-1, 0, 1]) {
      positions.push(
        side * halfWidth,
        t * length,
        length * 0.17 * t * t +
          (1 - Math.abs(side)) * width * 0.12 * Math.sin(Math.PI * t),
      );
      uv.push(
        region[0] +
          (0.5 + (side * halfWidth) / width) * (region[2] - region[0]),
        region[1] + t * (region[3] - region[1]),
      );
    }
    if (row < segments)
      for (let column = 0; column < 2; column++) {
        const a = row * 3 + column;
        indices.push(a, a + 1, a + 3, a + 1, a + 4, a + 3);
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
  return geometry;
}

export function createOutdoorTree(
  k,
  foliage,
  position,
  { height = 5, radius = 2, kind = "broadleaf" } = {},
) {
  if (
    !Number.isFinite(height) ||
    !Number.isFinite(radius) ||
    height <= 0 ||
    radius <= 0
  )
    throw new Error("Outdoor vegetation requires positive finite dimensions.");
  const palm = kind === "palm",
    shrub = kind === "shrub";
  const g = k.sub(position);
  const trunkHeight = height * (palm ? 1 : 0.78);
  if (!shrub) {
    const geometryHeight = trunkHeight + 0.1;
    const trunk = new THREE.CylinderGeometry(
      height * 0.011,
      height * 0.031,
      geometryHeight,
      14,
      20,
    );
    const points = trunk.attributes.position;
    for (let i = 0; i < points.count; i++) {
      const t = (points.getY(i) + geometryHeight / 2) / geometryHeight;
      const angle = Math.atan2(points.getZ(i), points.getX(i));
      const irregularity =
        (1 + Math.sin(angle * 5 + t * 11) * 0.035) *
        (1 + Math.exp(-t * 14) * 0.3);
      points.setX(
        i,
        points.getX(i) * irregularity + Math.sin(t * 2.1) * radius * 0.065,
      );
      points.setZ(
        i,
        points.getZ(i) * irregularity + Math.sin(t * 3.0) * radius * 0.035,
      );
    }
    trunk.computeVertexNormals();
    k.mesh(trunk, k.m.bark, [0, trunkHeight / 2 - 0.05, 0], [0, 0, 0], g);
  }
  const length = palm
    ? 0.86
    : THREE.MathUtils.clamp(height * 0.057, 0.08, 0.31);
  const count = palm ? 840 : shrub ? 620 : 2350;
  const regions = palm
    ? [[0, 0, 1, 1]]
    : [
        [0.038, 0.13, 0.469, 0.903],
        [0.532, 0.13, 0.967, 0.903],
      ];
  const leafMeshes = regions.map((region, index) => {
    const geometry = foldedLeaf(
      palm ? 0.035 : length * 0.48,
      length,
      7,
      region,
    );
    k.geometries.add(geometry);
    return new THREE.InstancedMesh(
      geometry,
      palm ? foliage.palm : foliage.broadleaf,
      Math.ceil((count - index) / regions.length),
    );
  });
  const transform = new THREE.Object3D(),
    direction = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0),
    clusters = [],
    fronds = [];
  const branch = (a, b, base, tip) => k.rod(a, b, tip, k.m.bark, g, base);
  if (palm) {
    for (let i = 0; i < 14; i++) {
      const angle = (i * Math.PI * 2) / 14 + k.range(-0.09, 0.09);
      const reach = radius * k.range(0.76, 1.09);
      const rise = radius * k.range(0.09, 0.23),
        drop = radius * k.range(0.18, 0.43);
      const point = (t) => [
        0.1 + Math.cos(angle) * reach * t,
        height + Math.sin(Math.PI * t) * rise - t * t * drop,
        Math.sin(angle) * reach * t,
      ];
      fronds.push({ angle, reach, point });
      k.tube([0, 0.2, 0.45, 0.7, 1].map(point), 0.012, k.m.bark, g);
    }
  } else {
    const branches = shrub ? 8 : 12;
    for (let i = 0; i < branches; i++) {
      const angle = i * 2.39996 + k.range(-0.25, 0.25),
        reach = radius * k.range(0.38, 0.88);
      const start = [
        shrub ? Math.cos(angle) * 0.1 : 0.07,
        shrub ? -0.015 : height * k.range(0.29, 0.53),
        0,
      ];
      const elbow = [
        Math.cos(angle) * reach * 0.45,
        height * k.range(0.54, 0.67),
        Math.sin(angle) * reach * 0.45,
      ];
      const tip = [
        Math.cos(angle) * reach,
        height * k.range(0.65, 0.94),
        Math.sin(angle) * reach,
      ];
      branch(start, elbow, height * 0.012, height * 0.006);
      branch(elbow, tip, height * 0.006, height * 0.0018);
      const extent = radius * k.range(0.19, 0.32);
      clusters.push({ center: new THREE.Vector3(...tip), extent });
      for (let twig = 0; twig < 4; twig++) {
        const end = [
          tip[0] + k.range(-extent, extent),
          tip[1] + k.range(-extent * 0.4, extent * 0.5),
          tip[2] + k.range(-extent, extent),
        ];
        branch(tip, end, 0.006, 0.0015);
      }
    }
  }
  for (let i = 0; i < count; i++) {
    if (palm) {
      const frond = fronds[Math.floor(i / 60)],
        side = i % 2 ? 1 : -1;
      const t = 0.11 + (Math.floor((i % 60) / 2) / 30) * 0.87;
      direction
        .set(
          -Math.sin(frond.angle) * side + Math.cos(frond.angle) * 0.18,
          -0.21 - t * 0.28,
          Math.cos(frond.angle) * side + Math.sin(frond.angle) * 0.18,
        )
        .normalize();
      transform.position.fromArray(frond.point(t));
      transform.quaternion.setFromUnitVectors(up, direction);
      transform.rotateY(k.range(-0.32, 0.32));
      transform.scale.set(
        k.range(0.85, 1.12),
        0.32 + Math.sin(t * Math.PI) * 0.9,
        1,
      );
    } else {
      const cluster = clusters[i % clusters.length];
      const angle = k.range(0, Math.PI * 2),
        vertical = k.range(-1, 1);
      const reach = Math.cbrt(k.random()) * cluster.extent;
      const horizontal = Math.sqrt(1 - vertical * vertical) * reach;
      transform.position
        .copy(cluster.center)
        .add(
          new THREE.Vector3(
            Math.cos(angle) * horizontal,
            vertical * reach * 0.72,
            Math.sin(angle) * horizontal,
          ),
        );
      transform.rotation.set(
        k.range(-1.4, 1.4),
        angle,
        k.range(-Math.PI, Math.PI),
      );
      transform.scale.setScalar(k.range(0.68, 1.27));
    }
    const leaves = leafMeshes[i % leafMeshes.length],
      index = Math.floor(i / leafMeshes.length);
    transform.updateMatrix();
    leaves.setMatrixAt(index, transform.matrix);
    leaves.setColorAt(
      index,
      new THREE.Color().setRGB(
        k.range(0.86, 1.04),
        k.range(0.88, 1.08),
        k.range(0.85, 1.04),
      ),
    );
  }
  for (const leaves of leafMeshes) {
    leaves.castShadow = leaves.receiveShadow = true;
    leaves.instanceMatrix.needsUpdate = true;
    leaves.computeBoundingSphere();
    g.add(leaves);
  }
  return g;
}
