import * as THREE from "three";
import {
  alfamaGeraniumLeafGeometry,
  alfamaPetalGeometry,
} from "./alfama-detail-geometry.js";

const plantKits = new WeakMap();

export function alfamaGeranium(k, parent) {
  if (!plantKits.has(k)) {
    const leaf = k.material(0xffffff, 0.88);
    leaf.vertexColors = true;
    leaf.side = THREE.DoubleSide;
    const petals = [0xb44e60, 0xca6876, 0xdca19d].map((color) => {
      const material = k.material(color, 0.82);
      material.side = THREE.DoubleSide;
      return material;
    });
    plantKits.set(k, {
      leaf,
      petals,
      stem: k.material(0x687845, 0.92),
      leafGeometry: alfamaGeraniumLeafGeometry(),
      petalGeometry: alfamaPetalGeometry(),
    });
  }
  const p = plantKits.get(k);
  const turn = k.range(0, Math.PI * 2);
  for (let branch = 0; branch < 5; branch++) {
    const angle = turn + branch * 2.4;
    const end = [
      Math.cos(angle) * 0.13,
      k.range(0.58, 0.78),
      Math.sin(angle) * 0.13,
    ];
    const stem = [end[0] * 0.34, 0.45, end[2] * 0.34];
    const stalk = k.tube([[0, 0.29, 0], stem, end], 0.004, p.stem, parent);
    for (let j = 0; j < 4; j++) {
      const t = 0.18 + j * 0.18,
        a = angle + j * 2.1;
      const node = stalk.geometry.parameters.path.getPoint(t).toArray();
      const tip = [
        node[0] + Math.cos(a) * 0.055,
        node[1] + 0.018,
        node[2] + Math.sin(a) * 0.055,
      ];
      k.rod(node, tip, 0.002, p.stem, parent);
      const leaf = k.mesh(
        p.leafGeometry,
        p.leaf,
        tip,
        [0.65 + j * 0.12, -a + Math.PI / 2, 0.15],
        parent,
      );
      leaf.scale.setScalar(k.range(0.8, 1.15));
    }
    const crown = k.sub(end, angle, parent);
    for (let flower = 0; flower < 7; flower++) {
      const a = flower * 2.4,
        radius = flower === 0 ? 0 : 0.034;
      const point = [
        Math.cos(a) * radius,
        flower === 0 ? 0.04 : 0.022,
        Math.sin(a) * radius,
      ];
      k.rod([0, 0, 0], point, 0.0015, p.stem, crown);
      const bloom = k.sub(point, a, crown);
      bloom.rotation.x = -1.05 + (flower % 3) * 0.22;
      for (let petal = 0; petal < 5; petal++) {
        const mesh = k.mesh(
          p.petalGeometry,
          p.petals[(branch + flower) % p.petals.length],
          [0, 0, 0],
          [0.08 * (petal % 2), 0, petal * Math.PI * 0.4],
          bloom,
        );
        mesh.scale.y = petal < 2 ? 1.08 : 0.88;
      }
      k.sphere(0.003, [0, 0, 0.002], p.stem, bloom);
    }
  }
}

export function alfamaPot(k, m, position, size = 1, parent = k.group) {
  const g = k.sub(position, k.range(-0.3, 0.3), parent);
  g.scale.setScalar(size);
  k.lathe(
    [
      [0, 0],
      [0.12, 0],
      [0.14, 0.03],
      [0.19, 0.32],
      [0.21, 0.33],
      [0.21, 0.37],
      [0.18, 0.37],
      [0.17, 0.32],
      [0.12, 0.045],
      [0, 0.045],
    ],
    [0, 0, 0],
    m.pot,
    g,
    24,
  );
  k.cylinder(0.17, 0.015, [0, 0.29, 0], k.m.ground, g);
  if (size >= 0.75) {
    alfamaGeranium(k, g);
    return g;
  }
  const leaf = k.leafMaterial("broadleaf");
  for (let branch = 0; branch < 11; branch++) {
    const angle = branch * 2.4;
    const end = [
      Math.cos(angle) * 0.22,
      k.range(0.46, 0.65),
      Math.sin(angle) * 0.22,
    ];
    k.rod([0, 0.3, 0], end, 0.006, m.timber, g);
    for (let j = 1; j <= 3; j++) {
      const t = j / 3;
      const p = [end[0] * t, 0.3 + (end[1] - 0.3) * t, end[2] * t];
      const geometry = new THREE.PlaneGeometry(0.14, 0.19, 4, 5);
      geometry.translate(0, 0.095, 0);
      const a = geometry.attributes.position;
      for (let i = 0; i < a.count; i++)
        a.setZ(i, Math.sin(a.getY(i) * 12) * 0.025);
      geometry.computeVertexNormals();
      k.mesh(geometry, leaf, p, [0.85, angle + j, 0.4], g);
    }
  }
  return g;
}

export function alfamaLaundry(k, m, from, to) {
  const span = Math.hypot(to[0] - from[0], to[2] - from[2]);
  if (span < 2)
    throw new RangeError(
      "An Alfama washing line needs at least two metres between supports.",
    );
  const parent = k.sub(
    [from[0], 0, from[2]],
    Math.atan2(from[2] - to[2], to[0] - from[0]),
  );
  const start = [0, from[1], 0],
    end = [span, to[1], 0];
  const sag = 0.18;
  const lineY = (t) =>
    start[1] + (end[1] - start[1]) * t - Math.sin(Math.PI * t) * sag;
  k.tube(
    [start, [start[0] + span / 2, lineY(0.5), start[2]], end],
    0.008,
    m.iron,
    parent,
  );
  const fabrics = [
    m.linen,
    k.textile(["#b5c3c4", "#e0e0d3", "#b5c3c4"]),
    k.textile(["#d5bb9b", "#d5bb9b", "#c5a783"]),
  ];
  for (const [index, t] of [0.24, 0.51, 0.75].entries()) {
    const width = index === 1 ? 0.6 : 0.88;
    const height = index === 1 ? 0.72 : 1.18;
    const geometry = new THREE.PlaneGeometry(width, height, 18, 22);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const free = (height / 2 - p.getY(i)) / height;
      p.setZ(
        i,
        0.055 * Math.sin(p.getX(i) * 18 + index) * free + 0.06 * free * free,
      );
      p.setY(
        i,
        p.getY(i) +
          lineY(t + p.getX(i) / span) -
          lineY(t) -
          (1 - Math.abs(p.getX(i)) / (width / 2)) * 0.045 * (1 - free),
      );
    }
    geometry.computeVertexNormals();
    const x = start[0] + span * t;
    const y = lineY(t);
    const cloth = k.mesh(
      geometry,
      fabrics[index],
      [x, y - height / 2, start[2]],
      [0, 0, 0],
      parent,
    );
    cloth.name = "Pegged household linen";
    k.animateFabric(cloth, 0.018 + index * 0.004);
    for (const sign of [-1, 1])
      k.box(
        [0.018, 0.075, 0.021],
        [
          x + sign * (width / 2 - 0.025),
          lineY(t + (sign * (width / 2 - 0.025)) / span) + 0.005,
          start[2],
        ],
        k.m.cedar,
        parent,
        0.003,
      );
  }
}

export function alfamaChair(k, m, position, angle = 0, parent = k.group) {
  const g = k.sub(position, angle, parent);
  for (const x of [-0.19, 0.19])
    for (const z of [-0.18, 0.18])
      k.rod(
        [x * 1.12, 0, z * 1.12],
        [x, z < 0 ? 0.87 : 0.43, z],
        0.022,
        m.timber,
        g,
      );
  for (let i = 0; i < 5; i++)
    k.box(
      [0.43, 0.025, 0.075],
      [0, 0.44, -0.17 + i * 0.085],
      m.timber,
      g,
      0.004,
    );
  for (const y of [0.65, 0.8])
    k.box([0.43, 0.075, 0.025], [0, y, -0.18], m.timber, g, 0.004);
  return g;
}

export function alfamaWashing(k, m, position) {
  const g = k.sub(position, -0.15);
  for (const x of [-0.2, 0.2])
    for (const z of [-0.19, 0.19])
      k.rod([x * 1.12, 0, z * 1.12], [x, 0.44, z], 0.025, m.timber, g);
  for (let plank = 0; plank < 4; plank++)
    k.box([0.52, 0.035, 0.12], [0, 0.45, -0.195 + plank * 0.13], m.timber, g);
  k.lathe(
    [
      [0, 0],
      [0.19, 0],
      [0.29, 0.15],
      [0.3, 0.18],
      [0.285, 0.19],
      [0.27, 0.155],
      [0.18, 0.018],
      [0, 0.018],
    ],
    [0, 0.47, 0],
    k.m.cream,
    g,
    36,
  );
  k.ring(0.292, 0.011, [0, 0.65, 0], m.timber, g, [Math.PI / 2, 0, 0]);
  const cloth = new THREE.PlaneGeometry(0.25, 0.4, 14, 24);
  const p = cloth.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const along = (p.getY(i) + 0.2) / 0.4;
    p.setXYZ(
      i,
      p.getX(i),
      0.56 + Math.sin(along * Math.PI) * 0.09,
      0.05 + along * 0.32 + Math.sin(p.getX(i) * 55) * 0.012,
    );
  }
  cloth.computeVertexNormals();
  k.mesh(cloth, m.linen, [0.04, 0, 0], [0, 0, 0], g);
  k.box([0.12, 0.035, 0.07], [-0.16, 0.51, 0.16], k.m.cream, g, 0.012);
  k.box([0.15, 0.025, 0.06], [-0.15, 0.52, -0.12], k.m.cedar, g, 0.008);
  for (let row = 0; row < 3; row++)
    for (let column = 0; column < 10; column++)
      k.rod(
        [-0.215 + column * 0.014, 0.51, -0.14 + row * 0.02],
        [-0.215 + column * 0.014, 0.482, -0.14 + row * 0.02],
        0.002,
        m.linen,
        g,
      );
  return g;
}

export function alfamaTable(k, m, position, parent = k.group) {
  const g = k.sub(position, 0.08, parent);
  for (const x of [-0.46, 0.46])
    for (const z of [-0.29, 0.29])
      k.box([0.055, 0.72, 0.055], [x, 0.36, z], k.m.cedar, g);
  for (let i = 0; i < 5; i++)
    k.box(
      [1.08, 0.045, 0.15],
      [0, 0.75, -0.32 + i * 0.16],
      k.m.cedar,
      g,
      0.006,
    );
  k.lathe(
    [
      [0, 0],
      [0.12, 0],
      [0.15, 0.024],
      [0.147, 0.034],
      [0.12, 0.015],
      [0, 0.015],
    ],
    [-0.18, 0.775, 0.07],
    k.m.cream,
    g,
  );
  k.lathe(
    [
      [0, 0],
      [0.035, 0],
      [0.043, 0.065],
      [0.036, 0.065],
      [0.028, 0.009],
      [0, 0.009],
    ],
    [0.25, 0.775, 0.13],
    k.m.cream,
    g,
    24,
  );
  k.ring(0.025, 0.006, [0.293, 0.813, 0.13], k.m.cream, g, [0, 0, 0]);
  const jar = k.lathe(
    [
      [0, 0],
      [0.065, 0],
      [0.075, 0.13],
      [0.05, 0.16],
      [0.05, 0.19],
      [0.042, 0.19],
      [0.042, 0.15],
      [0.06, 0.12],
      [0.055, 0.01],
      [0, 0.01],
    ],
    [0.28, 0.775, -0.17],
    k.m.cream,
    g,
  );
  const label = new THREE.CylinderGeometry(
    0.0755,
    0.0755,
    0.075,
    28,
    1,
    true,
    -Math.PI * 0.65,
    Math.PI * 1.3,
  );
  k.mesh(label, k.prints.label("olive-pt"), [0, 0.08, 0], [0, 0, 0], jar);
  for (let i = 0; i < 5; i++)
    k.sphere(
      0.017,
      [-0.21 + k.range(-0.04, 0.04), 0.804, 0.07 + k.range(-0.04, 0.04)],
      m.timber,
      g,
      [1, 0.7, 0.8],
    );
  alfamaChair(k, m, [0, 0, 0.82], Math.PI, g);
  alfamaChair(k, m, [-0.76, 0, -0.03], -Math.PI / 2, g);
  return g;
}

export function alfamaLantern(k, m, position, parent = k.group) {
  const g = k.sub(position, 0, parent);
  k.box([0.12, 0.27, 0.04], [0, 0, 0], m.iron, g);
  k.tube(
    [
      [0, -0.06, 0.02],
      [0, 0.12, 0.3],
      [0, 0.04, 0.48],
    ],
    0.023,
    m.iron,
    g,
  );
  for (const x of [-0.12, 0.12])
    for (const z of [0.35, 0.57])
      k.rod([x * 0.7, -0.43, z], [x, -0.05, z], 0.013, m.iron, g);
  k.box([0.28, 0.045, 0.28], [0, -0.06, 0.46], m.iron, g);
  k.box([0.2, 0.035, 0.24], [0, -0.44, 0.46], m.iron, g);
  k.box([0.22, 0.32, 0.2], [0, -0.25, 0.46], k.m.glass, g, 0);
}
