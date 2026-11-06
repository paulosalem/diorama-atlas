import * as THREE from "three";
import { laminaGeometry, shapedTimber } from "./natural-forms.js";

export function birchSprig(
  k,
  {
    parent = k.group,
    length = 0.6,
    seed = 1,
    leaves,
    wood,
    count = 12,
    segments = 10,
    leafStart = 0.14,
  },
) {
  const stem = [0.07 * length * Math.sin(seed), length, 0.09 * length];
  k.rod([0, 0, 0], stem, length * 0.007, wood, parent, length * 0.0015);
  for (let i = 0; i < count; i++) {
    const t = leafStart + (i / count) * (0.96 - leafStart);
    const side = i % 2 ? -1 : 1;
    const root = stem.map((v) => v * t);
    const tip = [
      root[0] + side * length * (0.28 - t * 0.18),
      root[1] + length * 0.085,
      root[2] + Math.sin(i * 2.4 + seed) * length * 0.13,
    ];
    k.rod(root, tip, 0.0015, wood, parent, 0.0007);
    const size = length * (0.11 + 0.025 * Math.sin(i * 2.3 + seed));
    const geometry = laminaGeometry({
      length: size,
      width: size * 0.72,
      bend: size * 0.15,
      seed: seed + i,
      segments,
      columns: 2,
    });
    const p = geometry.attributes.position;
    for (let v = 0; v < p.count; v++) {
      p.setX(
        v,
        p.getX(v) * (0.92 + 0.08 * Math.cos((p.getY(v) / size) * Math.PI * 18)),
      );
      geometry.attributes.uv.setX(v, 0.5);
    }
    geometry.computeVertexNormals();
    const leaf = k.mesh(
      geometry,
      leaves[i % leaves.length],
      tip,
      [0, seed + i * 1.7, side * 0.9],
      parent,
    );
    leaf.castShadow = true;
  }
}

export function birchTree(
  k,
  { position, height = 6, seed = 1, leaves, bark, wood, distant = false },
) {
  const tree = k.sub(position, seed * 1.17);
  shapedTimber(k, [0, 0, 0], [0.16, height, 0.07], height * 0.045, bark, tree, {
    round: true,
    taper: 0.89,
    bend: 0.06,
    segments: 48,
    relief: 0.003,
    seed,
  });
  const branches = distant ? 9 : 15;
  const sprigs = distant ? 7 : 14;
  for (let i = 0; i < branches; i++) {
    const angle = i * 2.4 + seed;
    const t = i / branches;
    const y = height * (0.28 + t * 0.56);
    const radius =
      height * (0.29 - t * 0.17) * (1 + 0.16 * Math.sin(seed + i * 1.7));
    const start = [(0.16 * y) / height, y, (0.07 * y) / height];
    const tip = [
      Math.cos(angle) * radius,
      y + height * 0.15,
      Math.sin(angle) * radius,
    ];
    const points = [start, [tip[0] * 0.5, y + height * 0.1, tip[2] * 0.5], tip];
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    k.tube(points, 0.02 * (1 - t * 0.6), wood, tree);
    for (let j = 0; j < sprigs; j++) {
      const t = 0.12 + (j / sprigs) * 0.87;
      const root = curve.getPoint(t).toArray();
      const twig = k.sub(root, angle + (j % 2 ? -0.75 : 0.75), tree);
      twig.rotation.z = 1.05 + 0.35 * Math.sin(seed + j);
      twig.rotation.x = 0.6 * Math.sin(angle);
      birchSprig(k, {
        parent: twig,
        length: height * (0.12 + 0.02 * Math.sin(j)),
        seed: seed + i * 13 + j,
        count: distant ? 12 : 18,
        segments: distant ? 4 : 6,
        leaves,
        wood,
      });
    }
  }
  for (let i = 0; i < 5; i++) {
    const angle = i * 1.3;
    k.tube(
      [
        [0, 0.12, 0],
        [Math.cos(angle) * 0.22, 0.035, Math.sin(angle) * 0.22],
        [Math.cos(angle) * 0.4, -0.015, Math.sin(angle) * 0.4],
      ],
      0.025,
      bark,
      tree,
    );
  }
  return tree;
}
