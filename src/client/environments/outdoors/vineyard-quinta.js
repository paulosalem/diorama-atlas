import * as THREE from "three";
import { buildVineyardCrate } from "./vineyard-crate.js";
import { addQuintaPlanters } from "./vineyard-garden.js";

function roofTile() {
  const p = [],
    uv = [],
    indices = [],
    segments = 10;
  for (let row = 0; row < 2; row++)
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI;
      p.push(Math.cos(a) * 0.11, Math.sin(a) * 0.045, row * 0.36);
      uv.push(i / segments, row);
      if (row === 0 && i < segments) {
        const n = i + segments + 1;
        indices.push(i, n, i + 1, i + 1, n, n + 1);
      }
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function buildVineyardQuinta(k, vines, { roofColor = 0xb47756 } = {}) {
  const origin = [-8, 0, 1.6],
    g = k.sub(origin);
  const lime = k.material(0xede7cf, 0.98);
  lime.userData.patinaProfile = "none";
  lime.map = k.texture(
    (context, size) => {
      context.fillStyle = "#eeeadd";
      context.fillRect(0, 0, size, size);
      for (let i = 0; i < 18000; i++) {
        context.fillStyle = i % 2 ? "#ffffff18" : "#9a927212";
        context.fillRect(
          k.random() * size,
          k.random() * size,
          k.range(0.5, 3),
          k.range(0.5, 3),
        );
      }
    },
    [1, 1],
    512,
  );
  lime.bumpMap = lime.map;
  lime.bumpScale = 0.003;
  lime.userData.metresPerRepeat = 0.8;
  const timber = k.ownMaterial(k.m.cedar.clone());
  timber.color.set(0xb79a70);
  timber.roughness = 0.74;
  const green = k.ownMaterial(k.m.cedar.clone());
  green.color.set(0x52764c);
  const stone = k.ownMaterial(k.m.stone.clone());
  stone.color.set(0xaca18c);
  const tile = k.ownMaterial(k.m.terracotta.clone());
  tile.color.set(roofColor);
  tile.side = THREE.DoubleSide;
  const front = k.sub([0, 0, 0], 0, g);
  k.wallWithOpenings(
    front,
    6.8,
    2.85,
    0.46,
    [
      { x: 1.35, width: 1.65, bottom: 0, top: 2.3 },
      { x: -1.8, width: 1.15, bottom: 1.05, top: 2.16 },
    ],
    lime,
  );
  const back = k.sub([0, 0, -5.8], 0, g);
  k.wallWithOpenings(
    back,
    6.8,
    2.85,
    0.46,
    [{ x: 1.35, width: 1.5, bottom: 0, top: 2.25 }],
    lime,
  );
  for (const side of [-1, 1]) {
    const wall = k.sub([side * 3.4, 0, -2.9], Math.PI / 2, g);
    k.wallWithOpenings(
      wall,
      5.8,
      2.85,
      0.46,
      side === 1 ? [{ x: 0, width: 1.2, bottom: 1.1, top: 2.14 }] : [],
      lime,
    );
    const shape = new THREE.Shape();
    shape.moveTo(-3.12, 0);
    shape.lineTo(0, 1.12);
    shape.lineTo(3.12, 0);
    shape.closePath();
    k.mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.42, bevelEnabled: false }),
      lime,
      [side * 3.4 - 0.21, 2.85, -2.9],
      [0, Math.PI / 2, 0],
      g,
    );
  }
  k.box([6.8, 0.18, 6.2], [0, -0.055, -2.9], stone, g, 0);
  const floorTones = [0xd5c8ae, 0xc3b89e, 0xd8c9ae, 0xcac0a6, 0xbdb69e].map(
    (color) => {
      const material = k.ownMaterial(stone.clone());
      material.color.set(color);
      material.normalScale.set(0.14, 0.14);
      material.userData.diffuseDetailMode = "tinted-grain";
      material.userData.metresPerRepeat = 0.85;
      return material;
    },
  );
  for (let row = 0; row < 8; row++) {
    let left = -3.17;
    while (left < 3.16) {
      let width = Math.min(k.range(0.61, 0.92), 3.17 - left);
      if (3.17 - left - width < 0.25) width = 3.17 - left;
      k.box(
        [width - 0.009, 0.028, 0.654],
        [left + width / 2, 0.046, -5.23 + row * 0.664],
        floorTones[Math.floor(k.random() * floorTones.length)],
        g,
        0.004,
      );
      left += width;
    }
  }
  for (const x of [0.43, 2.27]) {
    k.box([0.2, 2.46, 0.56], [x, 1.23, 0], stone, g, 0.012);
    k.box(
      [0.055, 2.27, 0.13],
      [x + (x < 1 ? 0.08 : -0.08), 1.14, -0.17],
      timber,
      g,
      0.004,
    );
  }
  k.box([2.02, 0.21, 0.56], [1.35, 2.4, 0], stone, g, 0.012);
  k.box([1.88, 0.09, 0.7], [1.35, 0.045, 0.09], stone, g, 0.006);
  const door = k.sub([2.17, 0, -0.07], -1.42, g);
  for (let i = 0; i < 7; i++)
    k.box(
      [0.106, 2.21, 0.05],
      [-0.057 - i * 0.112, 1.15, 0],
      green,
      door,
      0.003,
    );
  for (const y of [0.38, 1.84]) {
    k.box([0.72, 0.05, 0.018], [-0.41, y, 0.035], k.m.iron, door, 0.004);
    for (const x of [-0.12, -0.65])
      k.sphere(0.012, [x, y, 0.05], k.m.iron, door, [1, 1, 0.35]);
  }
  k.ring(0.055, 0.009, [-0.65, 1.08, 0.065], k.m.iron, door, [0, 0, 0]);
  for (const z of [0, -5.8]) {
    for (const x of [0.5, 2.2])
      k.box([0.1, 2.22, 0.12], [x, 1.12, z], timber, g, 0.003);
  }
  for (const x of [-2.42, -1.18])
    k.box([0.16, 1.34, 0.56], [x, 1.62, 0], stone, g, 0.008);
  for (const y of [1.0, 2.24])
    k.box([1.42, 0.14, 0.62], [-1.8, y, 0.025], stone, g, 0.009);
  for (const [x, angle] of [
    [-2.37, -0.95],
    [-1.23, 0.95],
  ]) {
    const shutter = k.sub([x, 1.59, 0.27], angle, g);
    k.box(
      [0.54, 1.06, 0.045],
      [x < -2 ? -0.27 : 0.27, 0, 0],
      green,
      shutter,
      0.005,
    );
    for (let i = 0; i < 9; i++)
      k.box(
        [0.47, 0.037, 0.055],
        [x < -2 ? -0.27 : 0.27, -0.43 + i * 0.105, 0.022],
        green,
        shutter,
        0.002,
        [0.24, 0, 0],
      );
  }
  const sideWindow = k.sub([3.4, 1.62, -2.9], Math.PI / 2, g);
  for (const x of [-0.67, 0.67])
    k.box([0.14, 1.3, 0.56], [x, 0, 0], stone, sideWindow, 0.009);
  for (const y of [-0.58, 0.59])
    k.box([1.47, 0.14, 0.62], [0, y, 0.025], stone, sideWindow, 0.009);
  for (const side of [-1, 1]) {
    const shutter = k.sub([side * 0.62, 0, 0.27], side * 0.95, sideWindow);
    for (let i = 0; i < 5; i++)
      k.box(
        [0.112, 1.06, 0.045],
        [side * (0.06 + i * 0.116), 0, 0],
        green,
        shutter,
        0.004,
      );
    for (const y of [-0.36, 0.36])
      k.box(
        [0.54, 0.04, 0.018],
        [side * 0.29, y, 0.034],
        k.m.iron,
        shutter,
        0.003,
      );
  }
  // The roof has a separate underside, structural rafters and overlapping curved tiles.
  const pitch = Math.atan(1.13 / 3.25);
  for (const sign of [-1, 1]) {
    k.box([7.5, 0.09, 3.5], [0, 3.4, -2.9 + sign * 1.65], timber, g, 0, [
      sign * pitch,
      0,
      0,
    ]);
    for (let x = -3.25; x < 3.4; x += 0.68)
      k.box(
        [0.09, 0.14, 3.48],
        [x, 3.32, -2.9 + sign * 1.65],
        timber,
        g,
        0.004,
        [sign * pitch, 0, 0],
      );
  }
  k.box([7.4, 0.2, 0.18], [0, 3.86, -2.9], timber, g, 0.008);
  for (let z = -5.5; z <= 0; z += 1.38)
    k.box([6.7, 0.18, 0.16], [0, 2.77, z], timber, g, 0.008);
  const tiles = [];
  for (const sign of [-1, 1])
    for (let row = 0; row < 11; row++)
      for (let col = 0; col < 37; col++) {
        const distance = row * 0.29;
        tiles.push({
          position: [
            origin[0] - 3.66 + col * 0.203,
            3.995 - distance * Math.tan(pitch) + k.range(-0.005, 0.005),
            origin[2] - 2.9 + sign * distance,
          ],
          rotation: [sign * pitch, sign < 0 ? Math.PI : 0, 0],
          color: new THREE.Color(0xffffff).offsetHSL(
            k.range(-0.014, 0.014),
            k.range(-0.04, 0.02),
            k.range(-0.16, 0),
          ),
        });
      }
  k.instances(roofTile(), tile, tiles);

  function crate(position, filled = false, angle = 0) {
    return buildVineyardCrate(k, vines, timber, position, {
      parent: g,
      filled,
      angle,
    });
  }
  crate([0.05, 0.02, 0.8], true, 0.06);
  crate([-0.58, 0.02, 1.12], false, -0.12);
  crate([-2.55, 0.02, -3.9]);
  crate([-2.51, 0.35, -3.92], false, 0.025);
  const table = k.sub([-1.7, 0, -1.2], 0, g);
  for (const x of [-0.69, 0.69])
    for (const z of [-0.29, 0.29])
      k.box([0.075, 0.78, 0.075], [x, 0.39, z], timber, table, 0.006);
  for (let i = 0; i < 4; i++)
    k.box(
      [1.65, 0.055, 0.182],
      [0, 0.8, -0.285 + i * 0.19],
      timber,
      table,
      0.005,
    );
  k.book([-0.24, 0.832, 0.02], {
    parent: table,
    width: 0.22,
    depth: 0.28,
    angle: -0.15,
    image: "/public/outdoors/references/douro-river.jpg",
  });
  const cloth = k.textile(["#cdc5a7", "#6d7563", "#d4caac"], [2, 2]);
  cloth.userData.vineyardWorkCloth = true;
  const clothGeo = new THREE.PlaneGeometry(0.48, 0.52, 24, 26);
  const cp = clothGeo.attributes.position,
    clothAngle = 0.1;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i),
      y = cp.getY(i),
      tableX = 0.43 + x * Math.cos(clothAngle) - y * Math.sin(clothAngle),
      tableZ = -0.03 - x * Math.sin(clothAngle) - y * Math.cos(clothAngle),
      pressure = Math.min(
        THREE.MathUtils.smoothstep(
          Math.hypot(tableX - 0.36, tableZ + 0.07),
          0.09,
          0.12,
        ),
        THREE.MathUtils.smoothstep(
          Math.hypot(tableX - 0.28, tableZ - 0.14),
          0.065,
          0.09,
        ),
        THREE.MathUtils.smoothstep(
          Math.hypot(tableX - 0.28, tableZ - 0.22),
          0.065,
          0.09,
        ),
      );
    cp.setZ(
      i,
      pressure *
        (0.004 * (1 + Math.sin(x * 38)) + 0.002 * (1 + Math.cos(y * 31))),
    );
  }
  clothGeo.computeVertexNormals();
  k.mesh(
    clothGeo,
    cloth,
    [0.43, 0.829, -0.03],
    [-Math.PI / 2, 0, clothAngle],
    table,
  );
  const jug = k.sub([0.36, 0.8295, -0.07], 0, table);
  k.lathe(
    [
      [0, 0],
      [0.06, 0],
      [0.09, 0.045],
      [0.086, 0.19],
      [0.035, 0.24],
      [0.035, 0.28],
      [0.026, 0.28],
      [0.026, 0.245],
      [0.076, 0.18],
      [0.075, 0.045],
      [0, 0.027],
    ],
    [0, 0, 0],
    k.m.cream,
    jug,
  );
  const handle = k.tube(
    [
      [0.07, 0.199, 0],
      [0.15, 0.184, 0],
      [0.155, 0.084, 0],
      [0.07, 0.064, 0],
    ],
    0.008,
    k.m.cream,
    jug,
  );
  handle.name = "Water jug handle";
  const steel = k.material(0xa3abad, 0.3, 0.82);
  for (const sign of [-1, 1]) {
    k.rod(
      [0.13, 0.836, 0.08],
      [0.28, 0.836, 0.18 + sign * 0.04],
      0.005,
      k.m.iron,
      table,
    );
    k.mesh(
      new THREE.TorusGeometry(0.027, 0.006, 6, 16),
      green,
      [0.28, 0.836, 0.18 + sign * 0.04],
      [Math.PI / 2, 0, 0],
      table,
    );
    const blade = new THREE.Shape();
    blade.moveTo(-0.008, -0.008);
    blade.lineTo(0.013, 0);
    blade.quadraticCurveTo(-0.025, 0.065, -0.09, 0.105);
    blade.quadraticCurveTo(-0.076, 0.055, -0.02, 0.01);
    blade.closePath();
    k.mesh(
      new THREE.ExtrudeGeometry(blade, {
        depth: 0.0025,
        bevelEnabled: true,
        bevelSize: 0.0006,
        bevelThickness: 0.0004,
        bevelSegments: 1,
        steps: 1,
      }).rotateX(-Math.PI / 2),
      steel,
      [0.13, 0.834 + sign * 0.0015, 0.08],
      [0, sign * 0.18, 0],
      table,
    );
  }
  k.sphere(0.007, [0.13, 0.843, 0.08], k.m.brass, table);
  const cup = k.sub([-0.59, 0.828, 0.1], 0.3, table);
  k.lathe(
    [
      [0, 0],
      [0.034, 0],
      [0.043, 0.089],
      [0.039, 0.091],
      [0.03, 0.009],
      [0, 0.009],
    ],
    [0, 0, 0],
    k.m.cream,
    cup,
    32,
  );
  k.tube(
    [
      [0.037, 0.072, 0],
      [0.069, 0.071, 0],
      [0.067, 0.026, 0],
      [0.035, 0.025, 0],
    ],
    0.005,
    k.m.cream,
    cup,
  );
  const chair = k.sub([-0.57, 0.061, -1.18], Math.PI / 2, g);
  for (const x of [-0.18, 0.18])
    for (const z of [-0.17, 0.17]) {
      k.box([0.038, 0.42, 0.038], [x, 0.21, z], timber, chair, 0.003);
      if (z > 0)
        k.box([0.035, 0.45, 0.035], [x, 0.635, z], timber, chair, 0.003);
    }
  for (let board = 0; board < 4; board++)
    k.box(
      [0.405, 0.026, 0.091],
      [0, 0.428, -0.15 + board * 0.1],
      timber,
      chair,
      0.003,
    );
  for (const y of [0.63, 0.76, 0.85])
    k.box([0.4, 0.052, 0.026], [0, y, 0.17], timber, chair, 0.004);
  for (const x of [-0.18, 0.18])
    k.rod([x, 0.19, -0.17], [x, 0.19, 0.17], 0.012, timber, chair);
  k.rod([-0.18, 0.2, 0], [0.18, 0.2, 0], 0.012, timber, chair);
  k.poster([-1.8, 1.89, -5.558], {
    width: 0.52,
    height: 0.35,
    parent: g,
    image: "/public/outdoors/references/douro-grapes.jpg",
  });
  for (const x of [-2.8, -0.7])
    k.box([0.08, 1.6, 0.08], [x, 0.8, -5.28], timber, g, 0.003);
  for (const y of [0.45, 1.05, 1.56]) {
    k.box([2.28, 0.05, 0.4], [-1.75, y, -5.25], timber, g, 0.004);
    if (y < 1.5)
      for (let i = 0; i < 3; i++)
        k.lathe(
          [
            [0, 0],
            [0.08, 0],
            [0.09, 0.12],
            [0.062, 0.16],
            [0.054, 0.16],
            [0.075, 0.11],
            [0.07, 0.02],
            [0, 0.02],
          ],
          [
            -2.55 + i * 0.35 + k.range(-0.03, 0.03),
            y + 0.03,
            -5.22 + k.range(-0.03, 0.03),
          ],
          k.m.pot,
          g,
          20,
        );
  }
  k.rod([-3.02, 0.1, -2.3], [-2.85, 1.45, -2.45], 0.018, timber, g);
  k.box(
    [0.28, 0.17, 0.025],
    [-3.02, 0.17, -2.3],
    k.m.iron,
    g,
    0.008,
    [0.2, 0, 0],
  );
  const flax = k.textile(["#ad9869", "#c6b78e", "#95845c"], [3, 3]);
  for (let winding = 0; winding < 7; winding++)
    k.mesh(
      new THREE.TorusGeometry(0.105 + winding * 0.005, 0.007, 5, 32),
      flax,
      [-0.98, 1.61 + winding * 0.004, -5.22],
      [Math.PI / 2, 0, winding * 0.09],
      g,
    );
  const hat = k.sub([-3.08, 1.87, -2.52], 0, g);
  k.mesh(
    new THREE.RingGeometry(0.1, 0.22, 48),
    flax,
    [0, 0, 0],
    [0, Math.PI / 2, 0],
    hat,
  );
  k.mesh(
    new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).scale(
      0.115,
      0.087,
      0.115,
    ),
    flax,
    [0.003, 0, 0],
    [0, 0, -Math.PI / 2],
    hat,
  );
  k.rod([-3.16, 2.04, -2.52], [-3.04, 2.04, -2.52], 0.009, k.m.iron, g);
  for (let cane = 0; cane < 9; cane++)
    k.tube(
      [
        [-2.6 + cane * 0.018, 0.08, -4.72],
        [-2.43 + cane * 0.016, 0.095, -4.32],
        [-2.37 + cane * 0.021, 0.09, -3.92],
      ],
      0.007,
      timber,
      g,
    );
  for (const [x, width] of [
    [-2.85, 0.72],
    [-0.6, 0.52],
    [2.83, 0.51],
  ])
    k.wearPatch([x, 0.27, 0.235], {
      parent: g,
      width,
      height: 0.43,
      strength: 0.2,
    });
  const fill = new THREE.HemisphereLight(0xe0dbc5, 0x655941, 0.25);
  fill.position.set(-7, 2, -1);
  k.group.add(fill);
  addQuintaPlanters(k, g);
  return {
    door: [-6.65, 1.15, 1.6],
    work: [-9.7, 0.85, 0.4],
    exit: [-6.65, 1.15, -4.2],
  };
}
