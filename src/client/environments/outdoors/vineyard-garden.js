import * as THREE from "three";

export function addVineyardGroundcover(k, { edge, level }) {
  const blades = [],
    geometry = new THREE.PlaneGeometry(0.046, 0.25, 1, 5),
    position = geometry.attributes.position,
    uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    const t = uv.getY(i);
    position.setXYZ(i, position.getX(i) + 0.014, t * 0.25, t * t * 0.045);
    uv.setXY(i, 0.35 + uv.getX(i) * 0.102, 0.275 + t * 0.565);
  }
  geometry.computeVertexNormals();
  const material = k.leafMaterial("grass");
  function tuft(x, y, z) {
    for (let blade = 0; blade < 9; blade++)
      blades.push({
        position: [x + k.range(-0.09, 0.09), y, z + k.range(-0.09, 0.09)],
        rotation: [k.range(-0.26, 0.26), k.range(0, Math.PI * 2), 0],
        scale: [k.range(0.7, 1.25), k.range(0.42, 1.1), 1],
        color: new THREE.Color().setHSL(
          k.range(0.2, 0.26),
          k.range(0.3, 0.5),
          k.range(0.72, 0.88),
        ),
      });
  }
  for (let row = 0; row < 5; row++)
    for (let x = -26; x < 27; x += 0.37) {
      if (x > -1.9 && x < 0.6) continue;
      for (let lane = 0; lane < 2; lane++) {
        if (k.random() < 0.22) continue;
        tuft(
          x + k.range(-0.1, 0.1),
          level(row + 1) + 0.002,
          edge(row, x) - 1.18 - lane * 1.62 + k.range(-0.28, 0.28),
        );
      }
    }
  for (let x = 3.2; x < 18.2; x += 0.13)
    for (const z of [0.65, 1.1]) tuft(x, 0.012, z + k.range(-0.13, 0.13));
  for (let x = -12; x < -8.7; x += 0.2)
    tuft(x, 0.012, 2.45 + k.range(-0.12, 0.12));
  k.instanceCells(geometry, material, blades, {
    cellSize: 8,
    shadow: false,
  }).name = "Living vineyard margins";
  addFloweringVerge(k, edge);
  return blades.length;
}

function addFloweringVerge(k, edge) {
  const leaves = [],
    petals = [],
    centers = [],
    stemMaterial = k.material(0x697c3d, 0.96),
    leaf = new THREE.PlaneGeometry(0.034, 0.075, 2, 4),
    position = leaf.attributes.position,
    uv = leaf.attributes.uv,
    up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < position.count; i++) {
    const t = uv.getY(i);
    position.setY(i, t * 0.075);
    position.setZ(
      i,
      0.012 * t * t + (1 - Math.abs(position.getX(i)) / 0.017) * 0.004,
    );
    uv.setXY(i, 0.038 + uv.getX(i) * 0.431, 0.13 + t * 0.773);
  }
  leaf.computeVertexNormals();
  for (let x = 1.7; x < 17.8; x += 0.63) {
    if (k.random() < 0.16) continue;
    const z = edge(0, x) + 0.4;
    for (let stem = 0; stem < 10; stem++) {
      const angle = k.range(0, Math.PI * 2),
        from = new THREE.Vector3(
          x + k.range(-0.15, 0.15),
          0.001,
          z + k.range(-0.12, 0.12),
        ),
        to = from
          .clone()
          .add(
            new THREE.Vector3(
              Math.cos(angle) * 0.06,
              k.range(0.12, 0.24),
              Math.sin(angle) * 0.06,
            ),
          );
      k.rod(from.toArray(), to.toArray(), 0.0016, stemMaterial);
      for (const t of [0.27, 0.52, 0.76])
        for (const sign of [-1, 1]) {
          const direction = new THREE.Vector3(
              Math.cos(angle) * sign,
              0.45,
              Math.sin(angle) * sign,
            ).normalize(),
            rotation = new THREE.Euler().setFromQuaternion(
              new THREE.Quaternion().setFromUnitVectors(up, direction),
            );
          leaves.push({
            position: from.clone().lerp(to, t).toArray(),
            rotation: [rotation.x, rotation.y, rotation.z],
            scale: [k.range(0.75, 1.1), k.range(0.7, 1.1), 1],
            color: 0xc2dfa1,
          });
        }
      if (stem % 4 !== 0) continue;
      centers.push({ position: to.toArray(), scale: [0.004, 0.002, 0.004] });
      for (let petal = 0; petal < 7; petal++) {
        const a = (petal * Math.PI * 2) / 7;
        petals.push({
          position: [
            to.x + Math.cos(a) * 0.006,
            to.y,
            to.z + Math.sin(a) * 0.006,
          ],
          rotation: [0, -a, 0],
          scale: [0.007, 0.0015, 0.003],
        });
      }
    }
  }
  k.instances(leaf, k.leafMaterial("broadleaf"), leaves).name =
    "Low flowering vineyard verge";
  k.instances(new THREE.SphereGeometry(1, 8, 4), k.m.cream, petals);
  k.instances(
    new THREE.SphereGeometry(1, 8, 4),
    k.material(0xd2a64e, 0.95),
    centers,
  );
}

export function addQuintaPlanters(k, parent) {
  const soil = k.material(0x443a25, 1),
    petals = k.material(0xcd654f, 0.87),
    center = k.material(0xe4be79, 0.9),
    stem = k.material(0x62783b, 0.95);
  for (const [x, y, z, size] of [
    [-2.9, 0.006, 0.63, 1],
    [2.77, 0.002, -6.3, 0.9],
    [-2.06, 1.072, 0.05, 0.46],
    [-2.25, 1.586, -5.25, 0.64],
  ]) {
    const pot = k.sub([x, y, z], 0, parent);
    pot.scale.setScalar(size);
    k.lathe(
      [
        [0, 0],
        [0.13, 0],
        [0.17, 0.27],
        [0.185, 0.28],
        [0.185, 0.315],
        [0.158, 0.315],
        [0.147, 0.27],
        [0.11, 0.03],
        [0, 0.03],
      ],
      [0, 0, 0],
      k.m.terracotta,
      pot,
      32,
    );
    k.cylinder(0.145, 0.012, [0, 0.266, 0], soil, pot);
    pot.add(
      k.tree([0, 0.27, 0], { height: 0.35, radius: 0.19, kind: "shrub" }),
    );
    for (let flower = 0; flower < 7; flower++) {
      const angle = flower * 2.4,
        px = Math.cos(angle) * 0.13,
        pz = Math.sin(angle) * 0.13,
        py = 0.61 + k.range(-0.055, 0.075);
      k.rod([0, 0.28, 0], [px, py, pz], 0.002, stem, pot);
      for (let bloom = 0; bloom < 4; bloom++) {
        const a = bloom * 2.4,
          bx = px + Math.cos(a) * 0.017,
          bz = pz + Math.sin(a) * 0.017,
          by = py + (bloom % 2) * 0.014;
        for (let petal = 0; petal < 5; petal++) {
          const turn = (petal * Math.PI * 2) / 5;
          k.sphere(
            0.009,
            [bx + Math.cos(turn) * 0.009, by, bz + Math.sin(turn) * 0.009],
            petals,
            pot,
            [1, 0.26, 1],
          );
        }
        k.sphere(0.003, [bx, by + 0.002, bz], center, pot);
      }
    }
  }
}

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
