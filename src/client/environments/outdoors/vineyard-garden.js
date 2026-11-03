import * as THREE from "three";

export const vineyardPath = (x) => -46.6 - 0.85 * Math.sin(x * 0.22);
export function vineyardGrowth(x, z) {
  const patch =
    0.52 +
    0.24 * Math.sin(x * 0.49 + z * 0.31) +
    0.19 * Math.sin(x * 0.83 - z * 0.57);
  const path = THREE.MathUtils.smoothstep(
    Math.abs(z - vineyardPath(x)),
    0.48,
    1.15,
  );
  return THREE.MathUtils.clamp(patch * path, 0, 1);
}

export function colorVineyardGround(mesh) {
  const positions = mesh.geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const dry = new THREE.Color(0xbba77b),
    green = new THREE.Color(0x659952),
    color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    color
      .copy(dry)
      .lerp(
        green,
        THREE.MathUtils.smoothstep(
          vineyardGrowth(positions.getX(i), positions.getZ(i)),
          0.1,
          0.65,
        ),
      );
    color.toArray(colors, i * 3);
  }
  mesh.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/** Clustered Mediterranean planting, leaving the worn contour path clear. */
export function buildVineyardGarden(k, { height, front, shore }) {
  const leaf = k.leafMaterial("broadleaf");
  const palette = [0xc5cfa5, 0xaeba91, 0xe2d6a7].map((tint) => {
    const material = k.ownMaterial(leaf.clone());
    material.color.set(tint);
    return material;
  });
  let trees = 0,
    shrubs = 0;
  const plant = (x, z, size, radius, kind, color) => {
    const group = k.tree([x, height(x, z), z], {
      height: size,
      radius,
      kind,
    });
    group.traverse((object) => {
      if (object.material?.userData.photographicFoliage === "broadleaf")
        object.material = palette[color % palette.length];
    });
    if (kind === "shrub") shrubs++;
    else trees++;
  };
  for (const [cx, cz, count] of [
    [-10, -49.2, 5],
    [-2.4, -50.0, 4],
    [6.8, -49.7, 5],
    [12, -44.7, 3],
  ]) {
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996;
      const reach = 0.45 + Math.sqrt(i) * 0.8;
      const x = THREE.MathUtils.clamp(
        cx + Math.cos(angle) * reach,
        -13.1,
        13.1,
      );
      const z = THREE.MathUtils.clamp(
        cz + Math.sin(angle) * reach,
        front + 1.4,
        -43.7,
      );
      if (Math.abs(z - vineyardPath(x)) < 0.9) continue;
      const size = k.range(2.4, 4.7);
      plant(x, z, size, size * k.range(0.35, 0.44), "broadleaf", i);
    }
  }
  for (let i = 0; i < 80; i++) {
    const x = k.range(-14, 14),
      z = k.range(front + 0.8, shore(x) - 11.6);
    if (vineyardGrowth(x, z) < 0.38) continue;
    const size = k.range(0.45, 1.1);
    plant(x, z, size, size * k.range(0.65, 1), "shrub", i);
  }
  const blades = [],
    stems = [],
    petals = [],
    centers = [];
  for (let i = 0; i < 2400; i++) {
    const x = k.range(-14.7, 14.7),
      z = k.range(front + 0.2, shore(x) - 11.5);
    if (k.random() > vineyardGrowth(x, z)) continue;
    const y = height(x, z);
    const size = k.range(0.18, 0.46),
      angle = k.random() * Math.PI;
    for (const turn of [0, Math.PI / 2])
      blades.push({
        position: [x, y + 0.008, z],
        scale: [size * 1.5, size, 1],
        rotation: [k.range(-0.15, 0.15), angle + turn, 0],
        color: i % 4 === 0 ? 0xf0dda7 : 0xb5ca83,
      });
    if (i % 31 !== 0) continue;
    for (let bloom = 0; bloom < 4; bloom++) {
      const bx = x + k.range(-0.12, 0.12),
        bz = z + k.range(-0.12, 0.12);
      const base = height(bx, bz),
        h = k.range(0.18, 0.34);
      stems.push({
        position: [bx, base + h / 2, bz],
        scale: [0.002, h, 0.002],
      });
      centers.push({
        position: [bx, base + h, bz],
        scale: [0.007, 0.004, 0.007],
      });
      for (let petal = 0; petal < 5; petal++) {
        const a = petal * Math.PI * 0.4;
        petals.push({
          position: [
            bx + Math.cos(a) * 0.013,
            base + h - 0.002,
            bz + Math.sin(a) * 0.013,
          ],
          scale: [0.016, 0.003, 0.008],
          rotation: [0, -a, 0],
          color: i % 2 ? 0xe5dccb : 0xb6a3bd,
        });
      }
    }
  }
  k.instances(
    new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0),
    k.leafMaterial("grass"),
    blades,
  );
  k.instances(
    new THREE.CylinderGeometry(1, 1, 1, 5),
    k.material(0x637b3e, 1),
    stems,
  );
  k.instances(
    new THREE.IcosahedronGeometry(1, 1),
    k.material(0xffffff, 0.95),
    petals,
  );
  k.instances(
    new THREE.IcosahedronGeometry(1, 0),
    k.material(0xd0a75c, 1),
    centers,
  );
  return {
    trees,
    shrubs,
    grassClumps: blades.length / 2,
    flowers: centers.length,
  };
}
