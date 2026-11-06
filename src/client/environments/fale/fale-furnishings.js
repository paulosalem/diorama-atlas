import * as THREE from "three";
import { wovenPanel } from "../shared/woven-panel.js";
import { shapedTimber, laminaGeometry } from "../shared/natural-forms.js";
import { FALE } from "./fale-architecture.js";

function mat(
  k,
  m,
  position,
  width,
  length,
  angle = 0,
  rolled = false,
  parent = k.group,
) {
  const group = k.sub(position, angle, parent);
  group.name = "Ordinary woven floor mat";
  wovenPanel(k, {
    width,
    height: length,
    spacing: 0.022,
    material: m.leafDry,
    parent: group,
    surface: (x, y, z) => {
      const fold = rolled ? Math.max(0, y - length / 2 + 0.28) : 0;
      return [
        x,
        0.0036 +
          z +
          0.002 * Math.sin(x * 12 + y * 7) +
          (fold ? 0.065 * (1 - Math.cos(fold * 18)) : 0),
        y - (fold ? fold - Math.sin(fold * 18) * 0.065 : 0),
      ];
    },
  });
  return group;
}

function basket(k, m, position, parent, fresh = true) {
  const group = k.sub(position, 0.18, parent);
  group.name = "Open coconut-leaf utility basket";
  const material = fresh ? m.leafGreen : m.leafDry;
  wovenPanel(k, {
    width: 0.66,
    height: 0.52,
    parent: group,
    material,
    spacing: 0.028,
    surface: (x, y, relief) => {
      const u = x / 0.33,
        v = y / 0.26;
      const radius = Math.sqrt(u * u + v * v - u * u * v * v);
      return [
        x * Math.sqrt(1 - (v * v) / 2) + relief * u,
        0.0016 +
          0.22 * (Math.max(0, radius - 0.3) / 0.7) ** 1.55 +
          relief * (1 - radius),
        y * Math.sqrt(1 - (u * u) / 2) + relief * v,
      ];
    },
  });
  k.tube(
    Array.from({ length: 65 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2;
      return [
        0.33 * Math.cos(a),
        0.23 + 0.005 * Math.sin(a * 3),
        0.26 * Math.sin(a),
      ];
    }),
    0.008,
    material[1],
    group,
    true,
  );
  return group;
}

function bowl(k, m, position, parent, radius = 0.15) {
  return k.lathe(
    [
      [0, 0.01],
      [radius * 0.55, 0.01],
      [radius * 0.9, 0.05],
      [radius, 0.12],
      [radius * 0.95, 0.125],
      [radius * 0.84, 0.055],
      [radius * 0.5, 0.025],
      [0, 0.025],
    ].map(([radius, y]) => [radius, y - 0.01]),
    position,
    m.enamel,
    parent,
  );
}

function coconut(k, m, position, parent, open = false, seed = 0) {
  const group = k.sub(position, seed, parent);
  if (open) {
    group.position.y -= 0.012;
    k.lathe(
      [
        [0, 0.012],
        [0.055, 0.015],
        [0.1, 0.055],
        [0.115, 0.11],
        [0.106, 0.116],
        [0.09, 0.06],
        [0.045, 0.028],
        [0, 0.028],
      ],
      [0, 0, 0],
      m.coconut,
      group,
    );
    k.lathe(
      [
        [0.101, 0.112],
        [0.096, 0.095],
        [0.085, 0.063],
        [0.04, 0.033],
        [0, 0.033],
      ],
      [0, 0.001, 0],
      m.flesh,
      group,
    );
  } else {
    const geometry = new THREE.SphereGeometry(0.125, 40, 28);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      const a = Math.atan2(z, x);
      p.setXYZ(
        i,
        x * (0.98 + 0.05 * Math.cos(a * 3)),
        y * 1.24,
        z * (0.93 + 0.04 * Math.sin(y * 35 + seed)),
      );
    }
    geometry.computeVertexNormals();
    k.mesh(geometry, m.coconut, [0, 0.155, 0], [0, 0, 0.16], group);
    for (let fibre = 0; fibre < 96; fibre++) {
      const a = fibre * 2.399;
      k.tube(
        Array.from({ length: 7 }, (_, j) => {
          const t = 0.18 + j * 0.12;
          const r = Math.sin(t * Math.PI) * 0.127;
          return [
            Math.cos(a) * r,
            0.155 + Math.cos(t * Math.PI) * 0.154,
            Math.sin(a) * r * 0.95,
          ];
        }),
        0.0009,
        m.cord,
        group,
      );
    }
  }
}

function roomFurniture(k, m, group) {
  k.box([1.3, 0.17, 2.15], [-1.6, 0.45, -0.5], m.wood[1], group);
  for (const x of [-2.1, -1.1])
    for (const z of [-1.35, 0.35])
      k.box([0.085, 0.2, 0.085], [x, 0.32, z], m.wood[2], group);
  k.box([1.22, 0.12, 2.04], [-1.6, 0.58, -0.5], m.cloth, group, 0.055);
  k.cushion(
    [0.76, 0.12, 0.43],
    [-1.6, 0.69, -1.2],
    m.cloth,
    group,
    [0, -0.07, 0],
  );
  const blanket = new THREE.PlaneGeometry(1.48, 1.35, 40, 36);
  const cloth = blanket.attributes.position;
  for (let i = 0; i < cloth.count; i++) {
    const x = cloth.getX(i),
      z = cloth.getY(i);
    cloth.setXYZ(
      i,
      -1.6 + x,
      0.66 -
        Math.max(0, Math.abs(x) - 0.63) * 2 +
        0.008 * (1 + Math.sin(x * 23 + z * 9)) +
        0.018 * Math.exp(-(((z + 0.5) * 20) ** 2)),
      z - 0.05,
    );
  }
  blanket.computeVertexNormals();
  const blanketMaterial = k.ownMaterial(m.cloth.clone());
  blanketMaterial.color.setHex(0x89996f);
  blanketMaterial.side = THREE.DoubleSide;
  k.mesh(blanket, blanketMaterial, [0, 0, 0], [0, 0, 0], group);
  for (const x of [1.32, 2.28])
    for (const z of [-1.37, -0.63])
      k.box([0.065, 0.75, 0.065], [x, 0.65, z], m.wood[1], group);
  k.box([1.1, 0.055, 0.88], [1.8, 1.05, -1], m.wood[0], group);
  bowl(k, m, [1.6, 1.08, -1], group);
  k.lathe(
    [
      [0, 0],
      [0.09, 0],
      [0.11, 0.15],
      [0.08, 0.31],
      [0.05, 0.32],
      [0.05, 0.29],
      [0.07, 0.15],
      [0, 0.025],
    ],
    [1.95, 1.08, -1.15],
    m.enamel,
    group,
  );
  mat(k, m, [0.35, 0.28, -0.4], 1.3, 1.7, 0, false, group);
  k.tube(
    [
      [2.03, 1.34, -1.15],
      [2.18, 1.3, -1.15],
      [2.17, 1.18, -1.15],
      [2.05, 1.15, -1.15],
    ],
    0.013,
    m.enamel,
    group,
  );
  k.poster([-0.25, 1.75, -1.745], {
    width: 0.64,
    height: 0.48,
    parent: group,
    image: "/public/fale/upolu.jpg",
  });
  for (const x of [-0.59, 0.09])
    k.box([0.026, 0.53, 0.022], [x, 1.75, -1.73], m.wood[1], group);
  for (const y of [1.49, 2.01])
    k.box([0.7, 0.026, 0.022], [-0.25, y, -1.73], m.wood[1], group);
  const stool = k.sub([1.7, 0.28, 0.05], 0.14, group);
  for (const x of [-0.18, 0.18])
    for (const z of [-0.16, 0.16])
      shapedTimber(
        k,
        [x * 1.1, 0, z * 1.1],
        [x, 0.43, z],
        0.055,
        m.wood[1],
        stool,
      );
  k.box([0.47, 0.045, 0.42], [0, 0.44, 0], m.wood[0], stool, 0.018);
  for (const x of [-0.18, 0.18])
    k.rod([x, 0.15, -0.17], [x, 0.15, 0.17], 0.018, m.wood[2], stool);
}

export function furnishFale(k, m, { cooking, home }) {
  mat(k, m, [-0.1, FALE.floor, 0.25], 2.5, 2.6, 0.03);
  mat(k, m, [-3.1, FALE.floor, 0], 1.35, 1.6, -0.1, true);
  const work = k.sub([2.6, FALE.floor, 0.35], -0.25);
  basket(k, m, [0, 0, 0], work);
  basket(k, m, [0.35, 0, -0.9], work, false);
  for (let i = 0; i < 11; i++)
    k.mesh(
      laminaGeometry({
        length: 0.7 + i * 0.018,
        width: 0.028,
        bend: 0.01,
        segments: 18,
      }),
      m.leafGreen[i % 3],
      [-0.38 + i * 0.025, 0.012 + i * 0.0007, 0.25],
      [-Math.PI / 2, 0, -0.35 + i * 0.023],
      work,
    );
  coconut(k, m, [-0.55, 0, -0.2], work, true);
  coconut(k, m, [-0.7, 0, -0.6], work, false, 0.4);
  bowl(k, m, [-0.4, 0, 0.9], work);
  roomFurniture(k, m, home);
  for (let i = 0; i < 33; i++) {
    const a = i * 2.399,
      r = Math.sqrt((i + 0.5) / 33) * 0.84;
    const geometry = new THREE.IcosahedronGeometry(0.1 + (i % 4) * 0.015, 2);
    const p = geometry.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j),
        y = p.getY(j),
        z = p.getZ(j);
      const scale = 1 + 0.08 * Math.sin(x * 35 + y * 29 + i);
      p.setXYZ(j, x * scale, y * 0.7 * scale, z * scale);
    }
    geometry.computeVertexNormals();
    geometry.rotateX(i);
    geometry.rotateZ(i * 0.3);
    geometry.computeBoundingBox();
    k.mesh(
      geometry,
      m.stone[i % 3],
      [-0.45 + Math.cos(a) * r, -geometry.boundingBox.min.y, Math.sin(a) * r],
      [0, 0, 0],
      cooking,
    );
  }
  for (let i = 0; i < 9; i++) {
    const geometry = new THREE.PlaneGeometry(1.55, 0.44, 48, 12);
    const p = geometry.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const u = p.getX(j),
        v = p.getY(j);
      const a = ((i % 3) - 1) * 0.19;
      const x =
        u * Math.cos(a) - v * Math.sin(a) - 0.45 + ((i % 3) - 1) * 0.025;
      const z =
        u * Math.sin(a) + v * Math.cos(a) + (Math.floor(i / 3) - 1) * 0.43;
      const y =
        0.17 + 0.19 * Math.max(0, 1 - ((x + 0.45) / 1) ** 2 - (z / 0.95) ** 2);
      p.setXYZ(j, x, y + i * 0.0015 + Math.sin(u * 140 + v * 13) * 0.0015, z);
    }
    geometry.computeVertexNormals();
    const leaf = k.mesh(geometry, m.cookingLeaf, [0, 0, 0], [0, 0, 0], cooking);
    leaf.name = "Overlapping umu leaf cover";
  }
  for (const x of [0.7, 1.5])
    for (const z of [-1.4, -0.75])
      shapedTimber(k, [x, 0, z], [x, 0.8, z], 0.065, m.wood[2], cooking);
  for (let i = 0; i < 5; i++)
    k.box(
      [0.95, 0.035, 0.14],
      [1.1, 0.81, -1.4 + i * 0.15],
      m.wood[i % 3],
      cooking,
    );
  bowl(k, m, [1.2, 0.835, -1.1], cooking, 0.22);
  coconut(k, m, [0.82, 0.835, -1.25], cooking, true);
  basket(k, m, [1.2, 0, 0.9], cooking, false);
  for (let i = 0; i < 7; i++)
    shapedTimber(
      k,
      [1.0, 0.09 + Math.floor(i / 3) * 0.1, 0.65 + (i % 3) * 0.1],
      [1.48, 0.12 + Math.floor(i / 3) * 0.1, 0.65 + (i % 3) * 0.1],
      0.09,
      m.wood[i % 3],
      cooking,
      { round: true, taper: 0.13, bend: 0.025, relief: 0.002, seed: i },
    );
}
