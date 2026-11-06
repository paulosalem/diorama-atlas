import * as THREE from "three";
import { shapedTimber } from "../shared/natural-forms.js";

export function gerStoveTopGeometry() {
  const outline = new THREE.Shape()
    .moveTo(-0.345, -0.365)
    .lineTo(0.345, -0.365)
    .lineTo(0.345, 0.365)
    .lineTo(-0.345, 0.365)
    .closePath();
  const flue = new THREE.Path();
  flue.absarc(0, 0.23, 0.058, 0, Math.PI * 2, true);
  outline.holes.push(flue);
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: 0.033,
    bevelEnabled: false,
    curveSegments: 32,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function bowl(k, m, position, radius = 0.095, parent = k.group) {
  return k.lathe(
    [
      [0, 0.006],
      [radius * 0.5, 0.006],
      [radius * 0.65, 0.025],
      [radius, 0.075],
      [radius, 0.082],
      [radius - 0.008, 0.082],
      [radius * 0.59, 0.028],
      [0, 0.02],
    ],
    position,
    m,
    parent,
    48,
  );
}

function blanket(
  k,
  m,
  parent,
  { width, depth, y, x = 0, z = 0, supportWidth = width },
) {
  const geometry = new THREE.PlaneGeometry(width + 0.2, depth, 32, 48);
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i),
      pz = p.getZ(i);
    const overhang = Math.max(0, Math.abs(px + x) - supportWidth / 2);
    p.setY(
      i,
      -overhang * 1.5 +
        0.006 * (1 + Math.sin(pz * 13 + px * 6) * Math.sin(px * 17 - pz * 4)),
    );
  }
  geometry.computeVertexNormals();
  return k.mesh(geometry, m, [x, y, z], [0, 0, 0], parent);
}

function chest(k, m, position, width, angle = 0) {
  const g = k.sub(position, angle);
  for (const x of [-width / 2 + 0.06, width / 2 - 0.06])
    for (const z of [-0.23, 0.23])
      k.box([0.075, 0.14, 0.075], [x, 0.07, z], m.wood[0], g);
  k.box([width, 0.055, 0.57], [0, 0.155, 0], m.wood[0], g);
  for (const z of [-0.27, 0.27])
    k.box([width, 0.54, 0.045], [0, 0.4, z], m.paint, g);
  for (const x of [-width / 2 + 0.025, width / 2 - 0.025])
    k.box([0.05, 0.54, 0.5], [x, 0.4, 0], m.paint, g);
  k.box([width + 0.035, 0.055, 0.6], [0, 0.695, 0], m.wood[1], g);
  for (const x of [-width / 2 + 0.06, 0, width / 2 - 0.06])
    k.box([0.025, 0.45, 0.01], [x, 0.4, 0.297], m.enamel, g);
  for (const y of [0.19, 0.61])
    k.box([width - 0.1, 0.02, 0.01], [0, y, 0.298], m.enamel, g);
  for (const x of [-width * 0.25, width * 0.25]) {
    k.box([width * 0.38, 0.31, 0.018], [x, 0.4, 0.298], m.paint, g);
    for (const y of [0.26, 0.55])
      k.box([width * 0.34, 0.008, 0.008], [x, y, 0.311], m.wood[1], g);
    k.ring(0.035, 0.006, [x, 0.49, 0.309], m.steel, g, [0, 0, 0]);
    k.box([0.07, 0.05, 0.013], [x, 0.52, 0.302], m.steel, g);
  }
  return g;
}

export function furnishGer(k, m, roof) {
  const hearth = k.sub([0, 0.13, 0.4]);
  k.box([1.13, 0.014, 1.15], [0, 0.007, 0], m.steel, hearth, 0.008);
  for (const x of [-0.27, 0.27])
    for (const z of [-0.28, 0.28]) {
      shapedTimber(
        k,
        [x * 1.15, 0.015, z * 1.1],
        [x, 0.19, z],
        0.037,
        m.steel,
        hearth,
        { segments: 4, taper: 0 },
      );
      k.box([0.075, 0.015, 0.075], [x * 1.15, 0.023, z * 1.1], m.steel, hearth);
    }
  // The firebox is assembled around empty space, including its front opening.
  k.box([0.65, 0.023, 0.68], [0, 0.2, 0], m.steel, hearth);
  for (const x of [-0.31, 0.31])
    k.box([0.026, 0.39, 0.68], [x, 0.4, 0], m.steel, hearth);
  k.box([0.65, 0.39, 0.026], [0, 0.4, -0.327], m.steel, hearth);
  k.mesh(gerStoveTopGeometry(), m.steel, [0, 0.5935, 0], [0, 0, 0], hearth);
  for (const x of [-0.325, 0.325])
    for (const z of [-0.28, 0.25])
      for (const y of [0.25, 0.53])
        k.sphere(0.008, [x, y, z], m.metal, hearth, [0.4, 1, 1]);
  for (const x of [-0.313, 0.313])
    k.rod([x, 0.21, 0.325], [x, 0.59, 0.325], 0.004, m.metal, hearth);
  for (const x of [-0.25, 0.25])
    k.box([0.15, 0.38, 0.024], [x, 0.4, 0.327], m.steel, hearth);
  for (const y of [0.23, 0.565])
    k.box([0.4, 0.07, 0.024], [0, y, 0.327], m.steel, hearth);
  const fireDoor = k.sub([-0.17, 0.27, 0.35], -1.05, hearth);
  k.box([0.34, 0.26, 0.028], [0.17, 0.13, 0], m.steel, fireDoor);
  k.rod([0.27, 0.1, 0.02], [0.27, 0.17, 0.02], 0.012, m.metal, fireDoor);
  const ash = k.material(0x5d5750, 1);
  k.box([0.48, 0.035, 0.5], [0, 0.23, 0], ash, hearth);
  const char = k.material(0x282320, 0.98);
  const ember = k.ownMaterial(
    new THREE.MeshStandardMaterial({
      color: 0x5c2618,
      emissive: 0xa92e0c,
      emissiveIntensity: 0.65,
      roughness: 1,
    }),
  );
  for (let i = 0; i < 7; i++)
    k.sphere(
      0.015,
      [-0.12 + i * 0.035, 0.266, 0.09],
      ember,
      hearth,
      [1.1, 0.3, 0.7],
    );
  for (let i = 0; i < 5; i++)
    shapedTimber(
      k,
      [-0.17, 0.27, -0.17 + i * 0.075],
      [0.18, 0.28, -0.16 + i * 0.075],
      0.035,
      char,
      hearth,
      { round: true, seed: i, segments: 9, bend: 0.006 },
    );
  for (const radius of [0.2, 0.145, 0.09])
    k.ring(radius, 0.006, [0, 0.631, 0.06], m.metal, hearth);
  const joint = 1.66;
  for (const [bottom, top, parent] of [
    [0.7565, joint, k.group],
    [joint, 3.36, roof],
  ]) {
    const height = top - bottom;
    k.lathe(
      [
        [0.054, 0],
        [0.058, 0],
        [0.058, height],
        [0.054, height],
        [0.054, 0],
      ],
      [0, bottom, 0.17],
      m.steel,
      parent,
      40,
    );
  }
  for (const y of [1.01, joint, 2.2, 2.95])
    k.ring(0.06, 0.008, [0, y, 0.17], m.metal, y >= joint ? roof : k.group);
  k.ring(0.058, 0.005, [0, 3.36, 0.17], m.steel, roof);
  const kettle = k.sub([0.02, 0.635, 0.04], 0.6, hearth);
  k.lathe(
    [
      [0, 0],
      [0.12, 0],
      [0.15, 0.05],
      [0.15, 0.14],
      [0.12, 0.2],
      [0.075, 0.22],
      [0.065, 0.22],
      [0.075, 0.19],
    ],
    [0, 0, 0],
    m.enamel,
    kettle,
  );
  k.cylinder(0.084, 0.016, [0, 0.225, 0], m.steel, kettle);
  k.sphere(0.025, [0, 0.25, 0], m.steel, kettle, [1, 0.6, 1]);
  k.tube(
    [
      [-0.13, 0.13, 0],
      [-0.18, 0.32, 0],
      [0, 0.39, 0],
      [0.18, 0.32, 0],
      [0.13, 0.13, 0],
    ],
    0.012,
    m.steel,
    kettle,
  );
  const spout = k.lathe(
    [
      [0.041, 0],
      [0.027, 0.1],
      [0.024, 0.14],
      [0.016, 0.14],
      [0.02, 0.1],
      [0.032, 0],
    ],
    [0, 0.09, 0.13],
    m.enamel,
    kettle,
    32,
  );
  spout.rotation.x = 0.7;
  const vaporMap = k.texture(
    (c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, "#ffffff66");
      g.addColorStop(1, "#ffffff00");
      c.fillStyle = g;
      c.fillRect(0, 0, s, s);
    },
    [1, 1],
    64,
  );
  for (let i = 0; i < 8; i++) {
    const mat = k.ownMaterial(
      new THREE.SpriteMaterial({
        map: vaporMap,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      }),
    );
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(0.05, 1.02 + i * 0.035, 0.6);
    sprite.scale.setScalar(0.09);
    k.group.add(sprite);
    k.animations.push((_, time) => {
      const age = (time * 0.24 + i / 8) % 1;
      sprite.position.set(
        0.05 + Math.sin(age * 5 + i) * age * 0.035,
        1.02 + age * 0.42,
        0.6,
      );
      sprite.scale.setScalar(0.035 + age * 0.13);
      mat.opacity = Math.sin(age * Math.PI) * 0.15;
    });
  }
  for (const sign of [-1, 1]) {
    const bed = k.sub([sign * 2.16, 0.13, -0.15]);
    for (const x of [-0.38, 0.38])
      for (const z of [-0.96, 0.96])
        shapedTimber(k, [x, 0, z], [x, 0.6, z], 0.065, m.wood[1], bed, {
          segments: 8,
          taper: 0,
        });
    for (const x of [-0.4, 0.4])
      k.box([0.06, 0.15, 2.08], [x, 0.27, 0], m.paint, bed);
    for (let z = -0.93; z < 1; z += 0.15)
      k.box([0.79, 0.03, 0.11], [0, 0.31, z], m.wood[1], bed);
    for (const z of [-1, 1]) {
      k.box([0.84, 0.25, 0.06], [0, 0.51, z], m.paint, bed);
      k.box(
        [0.7, 0.02, 0.015],
        [0, 0.57, z + Math.sign(z) * 0.034],
        m.enamel,
        bed,
      );
    }
    k.cushion([0.8, 0.13, 1.96], [0, 0.39, 0], m.lining, bed);
    blanket(k, m.bedding, bed, {
      width: 0.82,
      depth: sign < 0 ? 1.43 : 1.63,
      y: 0.465,
      z: sign < 0 ? 0.18 : 0.08,
    });
    k.cushion([0.66, 0.13, 0.36], [0.01, 0.51, -0.7], m.cloth, bed, [
      0,
      sign * 0.06,
      0,
    ]);
    for (let i = 0; i < (sign < 0 ? 2 : 3); i++)
      k.cushion(
        [0.65, 0.06, 0.36],
        [0, 0.51 + i * 0.065, 0.65],
        i % 2 ? m.cloth : m.bedding,
        bed,
      );
  }
  chest(k, m, [0, 0.13, -2.52], 1.55);
  const kitchen = chest(k, m, [1.94, 0.13, 1.45], 0.9, -0.75);
  for (let i = 0; i < 3; i++)
    bowl(k, m.enamel, [0.2, 0.73 + i * 0.04, 0.04], 0.12, kitchen);
  k.lathe(
    [
      [0.1, 0],
      [0.13, 0.02],
      [0.13, 0.26],
      [0.11, 0.3],
      [0.1, 0.3],
      [0.12, 0.25],
      [0.12, 0.025],
      [0, 0.025],
    ],
    [-0.2, 0.73, 0],
    m.metal,
    kitchen,
  );
  const table = k.sub([0, 0.13, -1.65]);
  for (const x of [-0.49, 0.49])
    for (const z of [-0.28, 0.28])
      shapedTimber(
        k,
        [x, 0, z],
        [x * 0.95, 0.41, z * 0.95],
        0.055,
        m.paint,
        table,
        { segments: 6, taper: -0.1 },
      );
  k.box([1.18, 0.055, 0.74], [0, 0.42, 0], m.wood[1], table);
  blanket(k, m.cloth, table, {
    width: 0.4,
    depth: 0.65,
    y: 0.461,
    x: -0.24,
    supportWidth: 1.18,
  });
  const spoon = k.sub([0.17, 0.453, 0.09], 0.34, table);
  k.rod([0, 0.006, -0.075], [0, 0.006, 0.05], 0.004, m.metal, spoon);
  k.sphere(0.018, [0, 0.009, 0.068], m.metal, spoon, [0.7, 0.16, 1.2]);
  const tray = k.sub([-1.16, 0.13, -1.7], 0.2);
  k.lathe(
    [
      [0, 0],
      [0.17, 0],
      [0.2, 0.025],
      [0.2, 0.08],
      [0.19, 0.08],
      [0.185, 0.035],
      [0, 0.018],
    ],
    [0, 0, 0],
    m.wood[1],
    tray,
  );
  for (const x of [-0.07, 0.035]) {
    k.cylinder(0.027, 0.09, [x, 0.066, 0], m.wood[0], tray);
    k.cylinder(0.038, 0.008, [x, 0.025, 0], m.wood[1], tray);
    k.cylinder(0.038, 0.008, [x, 0.107, 0], m.wood[1], tray);
    for (let y = 0.035; y < 0.1; y += 0.004)
      k.ring(0.03, 0.002, [x, y, 0], m.rope, tray);
  }
  k.tube(
    [
      [0.03, 0.023, 0.08],
      [0.14, 0.023, 0.07],
      [0.24, 0.01, 0.11],
      [0.29, 0.004, 0.16],
    ],
    0.002,
    m.rope,
    tray,
  );
  for (const [x, z] of [
    [-0.18, 0.15],
    [0.3, -0.16],
    [0.32, 0.2],
  ]) {
    const y = x < 0 ? 0.478 : 0.45;
    bowl(k, m.enamel, [x, y, z], 0.085, table);
    k.cylinder(
      0.067,
      0.002,
      [x, y + 0.062, z],
      k.material(0xb29b73, 0.22),
      table,
    );
  }
  const flask = k.sub([-0.35, 0.478, -0.17], -0.3, table);
  k.lathe(
    [
      [0, 0],
      [0.075, 0],
      [0.083, 0.04],
      [0.083, 0.29],
      [0.06, 0.34],
      [0.047, 0.35],
    ],
    [0, 0, 0],
    m.darkEnamel,
    flask,
  );
  k.cylinder(0.047, 0.045, [0, 0.372, 0], m.steel, flask);
  k.tube(
    [
      [0.074, 0.27, 0],
      [0.14, 0.26, 0],
      [0.14, 0.09, 0],
      [0.077, 0.08, 0],
    ],
    0.013,
    m.steel,
    flask,
  );
  // Plain stitched repair cloth, attached to its rail, moves only at the free edge.
  const cloth = k.mesh(
    new THREE.PlaneGeometry(0.38, 0.52, 16, 24),
    m.cloth,
    [-1.6, 1.06, 2.25],
    [0, -0.65, 0],
  );
  k.animateFabric(cloth, 0.006);
  k.rod([-1.81, 1.32, 2.1], [-1.4, 1.32, 2.39], 0.012, m.wood[1]);
}
