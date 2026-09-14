import * as THREE from "three";
import { createOutdoorKit, outdoorView } from "./outdoor-kit.js";

const PI = Math.PI;
const TAU = PI * 2;
const CLAY_PLANTER =
  "/public/outdoors/detail-assets/planter-pot-clay/planter_pot_clay_2k.gltf";
const SHORE_BOULDER =
  "/public/outdoors/detail-assets/boulder-01/boulder_01_1k.gltf";

function seedFor(definition, salt) {
  let seed = salt;
  for (const character of definition.id)
    seed = (Math.imul(seed, 31) + character.charCodeAt(0)) | 0;
  return seed >>> 0;
}

function coastalTools(k) {
  const cache = new Map();
  const geometry = (key, make) => {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  };
  const block = (
    size,
    position,
    material,
    parent = k.group,
    rotation = [0, 0, 0],
  ) => {
    const metres = material.userData.metresPerRepeat;
    const key = `block:${Boolean(material.transparent)}:${metres ? `${metres}:${size.join(":")}` : "plain"}`;
    const geo = geometry(key, () => {
      const result = new THREE.BoxGeometry(1, 1, 1);
      if (metres) {
        const { position: p, normal: n, uv } = result.attributes;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i) * size[0],
            y = p.getY(i) * size[1],
            z = p.getZ(i) * size[2];
          uv.setXY(
            i,
            (Math.abs(n.getX(i)) > 0.5 ? z : x) / metres,
            (Math.abs(n.getY(i)) > 0.5 ? z : y) / metres,
          );
        }
      }
      return result;
    });
    const mesh = k.mesh(geo, material, position, rotation, parent);
    mesh.scale.set(...size);
    return mesh;
  };
  const ball = (size, position, material, parent = k.group) => {
    const mesh = k.mesh(
      geometry("ball", () => new THREE.SphereGeometry(1, 10, 7)),
      material,
      position,
      [0, 0, 0],
      parent,
    );
    mesh.scale.set(...size);
    return mesh;
  };
  const cylinder = (
    radius,
    height,
    position,
    material,
    parent = k.group,
    bottom = radius,
    segments = 20,
  ) => {
    const ratio = bottom / radius;
    const mesh = k.mesh(
      geometry(
        `cylinder:${ratio}:${segments}`,
        () => new THREE.CylinderGeometry(1, ratio, 1, segments),
      ),
      material,
      position,
      [0, 0, 0],
      parent,
    );
    mesh.scale.set(radius, height, radius);
    return mesh;
  };
  const rod = (start, end, radius, material, parent = k.group) => {
    const a = new THREE.Vector3(...start),
      b = new THREE.Vector3(...end);
    const direction = b.clone().sub(a);
    const mesh = cylinder(
      radius,
      direction.length(),
      a.add(b).multiplyScalar(0.5).toArray(),
      material,
      parent,
      radius,
      6,
    );
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
    return mesh;
  };
  const stone = (
    size,
    position,
    material,
    parent = k.group,
    angle = 0,
    variation = 0,
  ) => {
    const geo = geometry(`paver:${variation}`, () => {
      const positions = [],
        uvs = [];
      const rings = [
        [
          [-0.48, -0.5, -0.46],
          [0.46, -0.5, -0.49],
          [0.49, -0.5, 0.47],
          [-0.48, -0.5, 0.49],
        ],
        [
          [-0.5, 0.24, -0.5],
          [0.5, 0.27, -0.48],
          [0.49, 0.26, 0.5],
          [-0.5, 0.24, 0.47],
        ],
        [
          [-0.477, 0.49, -0.476],
          [0.478, 0.47, -0.469],
          [0.474, 0.5, 0.478],
          [-0.475, 0.48, 0.472],
        ],
      ].map((ring) =>
        ring.map(([x, y, z], index) => [
          x + Math.sin(index * 3.7 + variation) * 0.018,
          y,
          z,
        ]),
      );
      const triangle = (a, b, c) => {
        positions.push(...a, ...b, ...c);
        for (const p of [a, b, c])
          uvs.push(
            p[0] * 0.21 + variation * 0.17,
            p[2] * 0.21 + variation * 0.23,
          );
      };
      for (let j = 0; j < 2; j++)
        for (let i = 0; i < 4; i++) {
          const next = (i + 1) % 4;
          triangle(rings[j][i], rings[j + 1][i], rings[j + 1][next]);
          triangle(rings[j][i], rings[j + 1][next], rings[j][next]);
        }
      triangle(rings[2][0], rings[2][3], rings[2][2]);
      triangle(rings[2][0], rings[2][2], rings[2][1]);
      triangle(rings[0][0], rings[0][1], rings[0][2]);
      triangle(rings[0][0], rings[0][2], rings[0][3]);
      const result = new THREE.BufferGeometry();
      result.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      result.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      result.computeVertexNormals();
      return result;
    });
    const mesh = k.mesh(geo, material, position, [0, angle, 0], parent);
    mesh.scale.set(...size);
    return mesh;
  };
  const painted = (color, source = k.m.plaster, roughness = 0.9) => {
    const material = k.material(color, roughness);
    material.map = source.map;
    material.normalMap = source.normalMap;
    material.roughnessMap = source.roughnessMap;
    material.normalScale.set(0.32, 0.32);
    material.userData.metresPerRepeat = source.userData.metresPerRepeat ?? 2;
    return material;
  };
  return { geometry, block, ball, cylinder, rod, stone, painted };
}

function chippedPaver(k, size, position, material, rotation = [0, 0, 0]) {
  const [width, height, depth] = size;
  const outline = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.17],
    [0.18, 0.5],
    [-0.5, 0.5],
  ];
  const shape = new THREE.Shape(
    outline.map(([x, z]) => new THREE.Vector2(x * width, z * depth)),
  );
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSize: 0.0025,
    bevelThickness: 0.0015,
    bevelSegments: 1,
    steps: 1,
  });
  geometry.rotateX(-PI / 2);
  geometry.translate(0, -height / 2, 0);
  const { position: p, normal: n, uv } = geometry.attributes;
  for (let i = 0; i < p.count; i++)
    uv.setXY(
      i,
      p.getX(i) / 2,
      (Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) : p.getY(i)) / 2,
    );
  return k.mesh(geometry, material, position, rotation);
}

function archShape(width, height) {
  const shape = new THREE.Shape();
  const radius = width / 2,
    spring = height - radius;
  shape.moveTo(-radius, 0);
  shape.lineTo(radius, 0);
  shape.lineTo(radius, spring);
  shape.absarc(0, spring, radius, 0, PI, false);
  shape.lineTo(-radius, 0);
  return shape;
}

function archMolding(
  k,
  t,
  position,
  width,
  height,
  thickness,
  material,
  parent,
  depth = 0.12,
) {
  const g = k.sub(position, 0, parent);
  const radius = width / 2,
    spring = height - radius,
    outer = radius + thickness;
  const outline = new THREE.Shape();
  outline.moveTo(-outer, 0);
  outline.lineTo(-outer, spring);
  outline.absarc(0, spring, outer, PI, 0, true);
  outline.lineTo(outer, 0);
  outline.lineTo(radius, 0);
  outline.lineTo(radius, spring);
  outline.absarc(0, spring, radius, 0, PI, false);
  outline.lineTo(-radius, 0);
  outline.closePath();
  const bevel = Math.min(0.006, thickness * 0.15, depth * 0.15);
  k.mesh(
    new THREE.ExtrudeGeometry(outline, {
      depth,
      bevelEnabled: true,
      bevelSize: bevel,
      bevelThickness: bevel * 0.6,
      bevelSegments: 2,
      curveSegments: 32,
    }),
    material,
    [0, 0, -depth / 2],
    [0, 0, 0],
    g,
  );
  return g;
}

function corniceMolding(k, t, length, position, material, parent) {
  const geometry = t.geometry(`cornice:${length}`, () => {
    const section = new THREE.Shape();
    section.moveTo(0.04, -0.065);
    section.lineTo(-0.025, -0.065);
    section.quadraticCurveTo(-0.051, -0.062, -0.058, -0.035);
    section.quadraticCurveTo(-0.061, -0.011, -0.087, 0.002);
    section.quadraticCurveTo(-0.107, 0.014, -0.083, 0.037);
    section.lineTo(-0.12, 0.057);
    section.lineTo(-0.15, 0.067);
    section.lineTo(-0.15, 0.095);
    section.lineTo(0.04, 0.095);
    section.closePath();
    const result = new THREE.ExtrudeGeometry(section, {
      depth: length,
      bevelEnabled: true,
      bevelSize: 0.002,
      bevelThickness: 0.003,
      bevelSegments: 2,
      curveSegments: 10,
    });
    result.rotateY(PI / 2);
    result.translate(-length / 2, 0, 0);
    return result;
  });
  return k.mesh(geometry, material, position, [0, 0, 0], parent);
}

function tileRoof(k, t, parent, width, depth, height, materials) {
  const pitch = 0.31;
  for (const sign of [-1, 1]) {
    t.block(
      [width + 0.5, 0.12, depth / 2 + 0.28],
      [0, height + (depth * pitch) / 4, -depth / 2 + (sign * depth) / 4],
      materials[0],
      parent,
      [sign * pitch, 0, 0],
    );
    for (let x = -width / 2 - 0.14; x < width / 2 + 0.2; x += 0.26) {
      for (let row = 0; row < Math.ceil(depth / 0.72); row++) {
        const distance = row * 0.37;
        if (distance > depth / 2 + 0.18) break;
        const z = -depth / 2 + sign * distance;
        const y = height + (depth / 2 - distance) * pitch;
        const geo = t.geometry("roof-tile", () =>
          new THREE.CylinderGeometry(
            0.105,
            0.12,
            0.43,
            6,
            1,
            true,
            0,
            PI,
          ).rotateY(PI / 2),
        );
        k.mesh(
          geo,
          materials[
            (row + Math.round(x * 13) + materials.length * 100) %
              materials.length
          ],
          [x, y, z],
          [PI / 2 + sign * pitch, 0, 0],
          parent,
        );
      }
    }
  }
  for (let x = -width / 2; x < width / 2; x += 0.38) {
    const ridge = t.cylinder(
      0.16,
      0.4,
      [x, height + (depth * pitch) / 2 + 0.06, -depth / 2],
      materials[1],
      parent,
      0.16,
      8,
    );
    ridge.rotation.z = PI / 2;
  }
}

function ironBalcony(k, t, parent, x, y, width, iron, stone) {
  const g = k.sub([x, y, 0.35], 0, parent);
  t.block([width + 0.25, 0.13, 0.84], [0, -0.07, 0.16], stone, g);
  for (const sx of [-width * 0.31, width * 0.31]) {
    k.tube(
      [
        [sx, -0.1, 0.42],
        [sx, -0.38, 0.14],
        [sx, -0.44, -0.12],
      ],
      0.045,
      stone,
      g,
    );
  }
  for (const height of [0.12, 0.8, 0.91])
    t.rod(
      [-width / 2, height, 0.54],
      [width / 2, height, 0.54],
      height === 0.91 ? 0.026 : 0.015,
      iron,
      g,
    );
  for (let x = -width / 2; x <= width / 2 + 0.01; x += 0.14) {
    t.rod([x, 0.1, 0.54], [x, 0.9, 0.54], 0.009, iron, g);
    if (Math.round((x + width / 2) / 0.14) % 2 === 0) {
      for (const sign of [-1, 1])
        k.tube(
          [
            [x, 0.23, 0.54],
            [x + sign * 0.08, 0.36, 0.54],
            [x + sign * 0.062, 0.52, 0.54],
            [x, 0.6, 0.54],
          ],
          0.007,
          iron,
          g,
        );
    }
  }
  for (const sign of [-1, 1]) {
    t.rod(
      [(sign * width) / 2, 0.9, -0.24],
      [(sign * width) / 2, 0.9, 0.54],
      0.024,
      iron,
      g,
    );
    for (let z = -0.2; z < 0.5; z += 0.15)
      t.rod(
        [(sign * width) / 2, 0.1, z],
        [(sign * width) / 2, 0.9, z],
        0.009,
        iron,
        g,
      );
  }
}

function inhabitedWindow(
  k,
  t,
  parent,
  { x, bottom, width, height, wood, materials, floor, variant },
) {
  const center = bottom + height / 2;
  t.block(
    [width + 0.82, height + 0.6, 0.08],
    [x, center, -2.36],
    materials.wall,
    parent,
  );
  t.block(
    [width + 0.82, 0.08, 2.05],
    [x, bottom - 0.16, -1.36],
    materials.floor,
    parent,
  );
  t.block(
    [width + 0.82, 0.08, 2.05],
    [x, bottom + height + 0.27, -1.36],
    materials.wall,
    parent,
  );
  for (const side of [-1, 1]) {
    t.block(
      [0.09, height + 0.6, 2.05],
      [x + side * (width / 2 + 0.36), center, -1.36],
      materials.wall,
      parent,
    );
    t.block(
      [0.06, height, 0.53],
      [x + side * (width / 2 - 0.01), center, -0.265],
      materials.reveal,
      parent,
    );
    const shutter = k.sub(
      [x + (side * width) / 2, bottom, 0.02],
      side * (floor === 1 ? 2.9 : 2.52 + variant * 0.06),
      parent,
    );
    const shutterWidth = width / 2 - 0.025,
      sx = (-side * shutterWidth) / 2;
    for (const edge of [-1, 1])
      t.block(
        [0.053, height, 0.065],
        [sx + edge * (shutterWidth / 2 - 0.025), height / 2, 0],
        wood,
        shutter,
      );
    for (const y of [0.045, height - 0.045])
      t.block([shutterWidth, 0.09, 0.065], [sx, y, 0], wood, shutter);
    for (let row = 0; row < 22; row++)
      t.block(
        [shutterWidth - 0.095, 0.047, 0.065],
        [sx, 0.14 + (row * (height - 0.28)) / 22, 0],
        wood,
        shutter,
        [0.32, 0, 0],
      );
    for (const y of [0.2, height - 0.2])
      t.block([0.085, 0.035, 0.018], [0, y, 0.044], k.m.iron, shutter);
    const curtainWidth = width * (side < 0 ? 0.3 : 0.27);
    const curtain = new THREE.PlaneGeometry(
        curtainWidth,
        height - 0.15,
        14,
        20,
      ),
      p = curtain.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const xx = p.getX(i),
        yy = p.getY(i),
        v = (yy + (height - 0.15) / 2) / (height - 0.15);
      p.setXYZ(
        i,
        xx * (0.77 + 0.23 * (1 - v)),
        yy - Math.cos((xx / curtainWidth) * TAU * 3) * 0.014 * (1 - v),
        Math.sin((xx / curtainWidth) * TAU * 4 + variant) * 0.026 +
          Math.sin(v * PI) * 0.015,
      );
    }
    curtain.computeVertexNormals();
    k.mesh(
      curtain,
      materials.curtain,
      [x + side * width * 0.32, center - 0.01, -0.76],
      [0, 0, 0],
      parent,
    );
  }
  for (const y of [bottom + 0.025, bottom + height - 0.025])
    t.block([width, 0.052, 0.57], [x, y, -0.28], materials.reveal, parent);
  k.mesh(
    new THREE.PlaneGeometry(width - 0.1, height - 0.1),
    materials.glass,
    [x, center, -0.3],
    [0, 0, 0],
    parent,
  );
  for (const sx of [-width / 2 + 0.055, 0, width / 2 - 0.055])
    t.block(
      [0.044, height - 0.05, 0.065],
      [x + sx, center, -0.255],
      materials.sash,
      parent,
    );
  for (const y of [
    bottom + 0.055,
    bottom + height * 0.43,
    bottom + height - 0.055,
  ])
    t.block(
      [width - 0.05, 0.044, 0.065],
      [x, y, -0.252],
      materials.sash,
      parent,
    );
  t.block(
    [0.022, 0.055, 0.017],
    [x + 0.044, bottom + height * 0.43 + 0.03, -0.208],
    k.m.brass,
    parent,
  );
}

function colonialFacade(
  k,
  t,
  {
    position,
    angle = 0,
    width = 6.6,
    height = 9,
    color,
    shutter,
    roof,
    balcony = true,
    windowMaterials,
  },
) {
  const g = k.sub(position, angle);
  const wall = t.painted(color),
    trim = t.painted(0xe9dfc8);
  wall.roughness = 0.97;
  wall.roughnessMap = null;
  trim.roughness = 0.96;
  trim.roughnessMap = null;
  const wood = t.painted(shutter, k.m.cedar, 0.77);
  const base = t.painted(0x8b8070, k.m.stone);
  const columns = Math.max(2, Math.round(width / 2.3));
  const bay = width / columns,
    opening = Math.min(1.3, bay * 0.56);
  t.block(
    [width, height, windowMaterials ? 2.8 : 4.5],
    [0, height / 2, windowMaterials ? -3.85 : -2.85],
    wall,
    g,
  );
  if (windowMaterials)
    for (const side of [-1, 1])
      t.block(
        [0.22, height, 2.6],
        [side * (width / 2 - 0.11), height / 2, -1.3],
        wall,
        g,
      );
  t.block([width, 0.65, 0.53], [0, 0.3, -0.25], base, g);
  for (let floor = 0; floor < 3; floor++) {
    const bottom = floor * 3.02 + 0.15;
    const openingBottom = floor ? bottom + 0.37 : 0.11;
    const openingHeight = floor ? 1.95 : 2.55;
    const top = openingBottom + openingHeight;
    t.block(
      [width, Math.max(0.05, openingBottom - bottom), 0.5],
      [0, (openingBottom + bottom) / 2, -0.25],
      wall,
      g,
    );
    t.block(
      [width, Math.max(0.15, Math.min(height, bottom + 3.02) - top), 0.5],
      [0, (Math.min(height, bottom + 3.02) + top) / 2, -0.25],
      wall,
      g,
    );
    for (let i = 0; i <= columns; i++) {
      const pierWidth =
        i === 0 || i === columns ? (bay - opening) / 2 : bay - opening;
      const x =
        i === 0
          ? -width / 2 + pierWidth / 2
          : i === columns
            ? width / 2 - pierWidth / 2
            : -width / 2 + i * bay;
      t.block(
        [pierWidth, openingHeight, 0.5],
        [x, openingBottom + openingHeight / 2, -0.25],
        wall,
        g,
      );
    }
    for (let i = 0; i < columns; i++) {
      const x = -width / 2 + bay * (i + 0.5);
      const open =
        windowMaterials &&
        ((floor === 1 && i === 1) || (floor === 2 && i === columns - 1));
      if (!open)
        t.block(
          [opening, openingHeight, 0.035],
          [x, openingBottom + openingHeight / 2, -0.535],
          wood,
          g,
        );
      for (const sign of [-1, 1]) {
        k.box(
          [0.12, openingHeight + 0.25, 0.16],
          [
            x + sign * (opening / 2 + 0.06),
            openingBottom + openingHeight / 2,
            0.024,
          ],
          trim,
          g,
          0.008,
        );
        if (!open)
          t.block(
            [opening / 2 - 0.035, openingHeight - 0.08, 0.06],
            [
              x + (sign * opening) / 4,
              openingBottom + openingHeight / 2,
              -0.34,
            ],
            wood,
            g,
          );
        t.block(
          [0.045, openingHeight, 0.075],
          [
            x + sign * (opening / 2 - 0.04),
            openingBottom + openingHeight / 2,
            -0.285,
          ],
          wood,
          g,
        );
      }
      if (floor) {
        if (open) {
          inhabitedWindow(k, t, g, {
            x,
            bottom: openingBottom,
            width: opening,
            height: openingHeight,
            wood,
            materials: windowMaterials,
            floor,
            variant: i,
          });
        } else {
          for (let row = 0; row < 23; row++)
            t.block(
              [opening - 0.16, 0.043, 0.09],
              [x, openingBottom + 0.13 + row * 0.075, -0.26],
              wood,
              g,
              [0.25, 0, 0],
            );
          t.block(
            [0.045, openingHeight, 0.08],
            [x, openingBottom + openingHeight / 2, -0.22],
            wood,
            g,
          );
        }
        if (balcony && floor === 1)
          ironBalcony(
            k,
            t,
            g,
            x,
            openingBottom,
            opening + 0.36,
            k.m.iron,
            trim,
          );
      } else {
        for (const side of [-1, 1])
          for (const y of [0.53, 1.45, 2.15]) {
            t.block(
              [opening * 0.34, 0.43, 0.035],
              [x + side * opening * 0.24, y, -0.275],
              wood,
              g,
            );
            t.block(
              [opening * 0.3, 0.36, 0.038],
              [x + side * opening * 0.24, y, -0.25],
              k.m.cedar,
              g,
            );
          }
        for (const side of [-1, 1])
          t.ball(
            [0.025, 0.025, 0.027],
            [x + side * 0.06, 1.13, -0.17],
            k.m.brass,
            g,
          );
        t.block([opening + 0.3, 0.11, 0.45], [x, 0.035, 0.08], base, g);
      }
      k.box(
        [opening + 0.35, 0.11, 0.23],
        [x, openingBottom - 0.055, 0.07],
        trim,
        g,
        0.009,
      );
      corniceMolding(k, t, opening + 0.48, [x, top + 0.08, 0.025], trim, g);
    }
    const cornice = Math.min(height, bottom + 3.02);
    corniceMolding(k, t, width + 0.12, [0, cornice, 0.025], trim, g);
  }
  for (const side of [-1, 1]) {
    for (let y = 0.8; y < height - 0.3; y += 0.4)
      t.block(
        [0.29, 0.24, 0.1],
        [side * (width / 2 - 0.145), y, 0.04],
        trim,
        g,
      );
  }
  for (const [y, projection] of [
    [height - 0.12, 0.23],
    [height + 0.01, 0.36],
    [height + 0.15, 0.44],
  ]) {
    k.box([width + projection, 0.13, projection], [0, y, 0.04], trim, g, 0.009);
  }
  const downpipe = k.sub([width / 2 - 0.17, 0, 0.25], 0, g);
  t.rod([0, 0.12, 0.1], [0, height + 0.1, 0.1], 0.04, k.m.iron, downpipe);
  for (let y = 0.55; y < height; y += 1.75)
    t.block([0.13, 0.035, 0.13], [0, y, 0.07], k.m.iron, downpipe);
  tileRoof(k, t, g, width, 5.2, height + 0.26, roof);
  return g;
}

function neighborhoodChapel(k, t, position, roof) {
  const g = k.sub(position);
  const limewash = t.painted(0xe1d4b8),
    trim = t.painted(0xeee4cf);
  limewash.roughness = 0.98;
  limewash.roughnessMap = null;
  trim.roughness = 0.96;
  trim.roughnessMap = null;
  const stone = t.painted(0xa89d85, k.m.stone),
    wood = t.painted(0x554434, k.m.cedar, 0.83);
  const inset = t.painted(0x41392d, k.m.cedar, 0.89),
    glass = k.material(0x60716f, 0.24);
  const silhouette = [
    [-3.9, 0],
    [3.9, 0],
    [3.9, 6],
    [1.28, 7.65],
    [1.28, 9.5],
    [0, 10.05],
    [-1.28, 9.5],
    [-1.28, 7.65],
    [-3.9, 6],
  ];
  const front = new THREE.Shape(silhouette.map((p) => new THREE.Vector2(...p)));
  front.closePath();
  const openings = [
    { x: 0, y: 0.16, width: 1.6, height: 2.9 },
    { x: -2.45, y: 2.6, width: 0.76, height: 1.5 },
    { x: 2.45, y: 2.6, width: 0.76, height: 1.5 },
    { x: 0, y: 7.78, width: 0.96, height: 1.45 },
  ];
  for (const opening of openings)
    front.holes.push(
      new THREE.Path(
        archShape(opening.width, opening.height)
          .getPoints(22)
          .map((p) => new THREE.Vector2(p.x + opening.x, p.y + opening.y)),
      ),
    );
  const oculus = new THREE.Path();
  oculus.absarc(0, 4.83, 0.43, 0, TAU);
  front.holes.push(oculus);
  t.block([7.8, 5.95, 7], [0, 2.975, -4.25], limewash, g);
  k.mesh(
    new THREE.ExtrudeGeometry(front, {
      depth: 0.52,
      bevelEnabled: false,
      curveSegments: 22,
    }),
    limewash,
    [0, 0, -0.52],
    [0, 0, 0],
    g,
  );
  for (const opening of openings) {
    const { x, y, width, height } = opening;
    archMolding(
      k,
      t,
      [x, y, 0.08],
      width,
      height,
      y > 7 ? 0.15 : 0.12,
      trim,
      g,
      0.15,
    );
    if (y > 7) continue;
    k.mesh(
      new THREE.ShapeGeometry(archShape(width, height), 22),
      y < 1 ? wood : glass,
      [x, y, -0.59],
      [0, 0, 0],
      g,
    );
    if (y < 1) {
      for (const side of [-1, 1])
        for (let row = 0; row < 4; row++) {
          t.block(
            [0.61, 0.46, 0.04],
            [side * 0.39, 0.51 + row * 0.53, -0.5],
            wood,
            g,
          );
          t.block(
            [0.49, 0.35, 0.034],
            [side * 0.39, 0.51 + row * 0.53, -0.46],
            inset,
            g,
          );
        }
      t.block([0.04, 2.34, 0.09], [0, 1.33, -0.43], wood, g);
      for (const side of [-1, 1])
        k.ring(
          0.048,
          0.01,
          [side * 0.13, 1.29, -0.36],
          k.m.bronze,
          g,
          [0, 0, 0],
        );
      t.block([2.09, 0.13, 0.65], [0, 0.07, 0.17], stone, g);
    } else {
      for (let xx = -0.28; xx < 0.32; xx += 0.14)
        t.rod(
          [x + xx, y + 0.09, -0.38],
          [x + xx, y + 1.1, -0.38],
          0.01,
          k.m.iron,
          g,
        );
      for (const yy of [0.21, 0.69, 1.07])
        t.rod(
          [x - 0.31, y + yy, -0.38],
          [x + 0.31, y + yy, -0.38],
          0.012,
          k.m.iron,
          g,
        );
      t.block([1.12, 0.09, 0.29], [x, y - 0.065, 0.055], trim, g);
    }
  }
  k.mesh(
    new THREE.CircleGeometry(0.43, 32),
    glass,
    [0, 4.83, -0.6],
    [0, 0, 0],
    g,
  );
  k.ring(0.49, 0.075, [0, 4.83, 0.08], trim, g, [0, 0, 0]);
  t.rod([-0.32, 4.83, -0.36], [0.32, 4.83, -0.36], 0.018, k.m.iron, g);
  t.rod([0, 4.51, -0.36], [0, 5.15, -0.36], 0.018, k.m.iron, g);
  for (const x of [-3.7, 3.7]) {
    t.block([0.29, 5.73, 0.23], [x, 2.99, 0.06], trim, g);
    for (const y of [0.23, 5.8])
      t.block([0.48, 0.19, 0.32], [x, y, 0.11], trim, g);
  }
  for (const [y, depth] of [
    [0.27, 0.28],
    [5.84, 0.34],
    [6.0, 0.4],
  ])
    t.block([7.95, 0.13, depth], [0, y, 0.04], trim, g);
  const coping = silhouette.slice(2).map(([x, y]) => [x, y, 0.09]);
  for (let i = 0; i < coping.length - 1; i++) {
    t.rod(coping[i], coping[i + 1], 0.095, trim, g);
    t.rod(
      coping[i].map((v, n) => (n === 1 ? v - 0.16 : v)),
      coping[i + 1].map((v, n) => (n === 1 ? v - 0.16 : v)),
      0.034,
      stone,
      g,
    );
  }
  t.rod([-0.47, 9.04, -0.18], [0.47, 9.04, -0.18], 0.038, k.m.iron, g);
  k.lathe(
    [
      [0.17, 0],
      [0.28, 0.045],
      [0.23, 0.12],
      [0.13, 0.4],
      [0.08, 0.48],
    ],
    [0, 8.08, -0.18],
    k.m.bronze,
    g,
    28,
  );
  t.rod([0, 7.98, -0.18], [0, 9.04, -0.18], 0.016, k.m.iron, g);
  t.rod([0, 10.06, -0.04], [0, 10.78, -0.04], 0.033, k.m.iron, g);
  t.rod([-0.21, 10.55, -0.04], [0.21, 10.55, -0.04], 0.025, k.m.iron, g);
  tileRoof(k, t, g, 7.8, 7.8, 5.96, roof);
  for (let step = 0; step < 3; step++)
    t.block(
      [8.4 + step * 0.29, 0.1, 0.85 + step * 0.42],
      [0, -0.05 - step * 0.1, 0.35 + step * 0.09],
      stone,
      g,
    );
  for (const x of [-2.6, 2.6]) {
    t.block([1.36, 0.13, 0.48], [x, 0.47, 1.05], stone, g);
    for (const dx of [-0.47, 0.47])
      t.block([0.18, 0.42, 0.34], [x + dx, 0.21, 1.05], stone, g);
  }
  return g;
}

function bahianCafeCorner(k, t, grade) {
  const level = grade(12, 7.4) + 0.02;
  const paving = t.painted(0xb7aa91, k.m.stone, 0.9);
  const wood = t.painted(0x9a764f, k.m.cedar, 0.73);
  const paint = t.painted(0x3e6774, k.m.cedar, 0.67);
  const wornRail = k.surfaceMaterial("weathered-wood", {
    scale: 0.65,
    normalStrength: 0.14,
  });
  const porcelain = k.material(0xf2ebda, 0.22),
    coffee = k.material(0x302015, 0.13);
  const fabric = wovenMaterial(k, {
    blue: "#6b8589",
    cream: "#e9dfc6",
    repeat: [1.5, 1],
  });
  k.box([4.7, 0.13, 5.6], [12.25, level - 0.075, 7.4], paving, k.group, 0.018);
  const table = k.sub([10.65, level, 8.4], 0.15);
  t.cylinder(0.53, 0.065, [0, 0.735, 0], wood, table, 0.53, 40);
  k.ring(0.508, 0.006, [0, 0.769, 0], wood, table);
  for (let i = 0; i < 3; i++) {
    const a = (i * TAU) / 3;
    t.rod(
      [Math.cos(a) * 0.33, 0.03, Math.sin(a) * 0.33],
      [Math.cos(a) * 0.17, 0.7, Math.sin(a) * 0.17],
      0.027,
      k.m.iron,
      table,
    );
    t.rod(
      [0, 0.29, 0],
      [Math.cos(a) * 0.25, 0.29, Math.sin(a) * 0.25],
      0.019,
      k.m.iron,
      table,
    );
  }
  for (const [x, z, angle] of [
    [-0.85, -0.05, PI / 2],
    [0.8, -0.28, -PI / 2],
  ]) {
    const chair = k.sub([x, 0, z], angle, table);
    for (const sx of [-0.22, 0.22])
      for (const sz of [-0.21, 0.21])
        t.rod([sx * 1.1, 0.025, sz * 1.1], [sx, 0.44, sz], 0.022, wood, chair);
    for (let i = 0; i < 6; i++)
      t.block([0.48, 0.035, 0.058], [0, 0.445, -0.2 + i * 0.08], wood, chair);
    for (const sx of [-0.22, 0.22])
      t.rod([sx, 0.42, -0.21], [sx, 0.94, -0.31], 0.026, paint, chair);
    for (const y of [0.6, 0.74, 0.88])
      t.block(
        [0.48, 0.08, 0.04],
        [0, y, -0.21 - (y - 0.42) * 0.19],
        x < 0 && y === 0.88 ? wornRail : paint,
        chair,
        [-0.19, 0, 0],
      );
    if (x > 0) {
      const wear = k.wearPatch([-0.11, 0.913, -0.2833], {
        width: 0.12,
        height: 0.015,
        parent: chair,
        surface: "weathered-wood",
        strength: 0.35,
        scale: 0.65,
      });
      wear.rotation.x = -0.19;
    }
  }
  for (const [x, z] of [
    [-0.22, 0.22],
    [0.23, -0.19],
  ]) {
    const cup = k.sub([x, 0.771, z], 0, table);
    k.lathe(
      [
        [0, 0],
        [0.048, 0.002],
        [0.07, 0.012],
        [0.074, 0.015],
        [0.064, 0.018],
        [0.047, 0.008],
        [0, 0.006],
      ],
      [0, 0, 0],
      porcelain,
      cup,
      28,
    );
    k.lathe(
      [
        [0.022, 0],
        [0.026, 0.006],
        [0.031, 0.037],
        [0.034, 0.045],
        [0.03, 0.046],
        [0.027, 0.035],
        [0.023, 0.006],
      ],
      [0, 0.009, 0],
      porcelain,
      cup,
      28,
    );
    k.ring(0.014, 0.0036, [0.04, 0.039, 0], porcelain, cup, [0, 0, 0]);
    t.cylinder(0.027, 0.003, [0, 0.044, 0], coffee, cup, 0.027, 24);
    k.ring(0.065, 0.0015, [0, 0.018, 0], paint, cup);
  }
  const pipSets = [
    [],
    [[0, 0]],
    [
      [-0.005, -0.006],
      [0.005, 0.006],
    ],
    [
      [-0.005, -0.006],
      [0, 0],
      [0.005, 0.006],
    ],
    [
      [-0.005, -0.006],
      [0.005, -0.006],
      [-0.005, 0.006],
      [0.005, 0.006],
    ],
    [
      [-0.005, -0.006],
      [0.005, -0.006],
      [0, 0],
      [-0.005, 0.006],
      [0.005, 0.006],
    ],
  ];
  for (const [i, [x, z, angle]] of [
    [-0.11, -0.035, 0],
    [-0.045, -0.035, 0],
    [0.02, -0.035, 0],
    [0.084, -0.035, 0],
    [0.14, 0.0, PI / 2],
    [-0.12, 0.08, -0.17],
  ].entries()) {
    const tile = k.sub([x, 0.779, z], angle, table);
    k.box([0.058, 0.01, 0.029], [0, 0, 0], porcelain, tile, 0.0015);
    t.rod([0, 0.0054, -0.012], [0, 0.0054, 0.012], 0.0006, k.m.dark, tile);
    for (const [side, value] of [
      [-1, i % 6],
      [1, (i + 3) % 6],
    ])
      for (const [dx, dz] of pipSets[value]) {
        t.ball(
          [0.0018, 0.0006, 0.0018],
          [side * 0.014 + dx, 0.0055, dz],
          k.m.dark,
          tile,
        );
      }
  }
  const awning = k.sub([14.73, grade(14.73, 8.35), 8.35], -PI / 2);
  k.wearPatch([-1.12, 0.68, -0.015], {
    width: 0.25,
    height: 0.34,
    parent: awning,
    surface: "worn-plaster",
    strength: 0.48,
    scale: 0.9,
  });
  k.wearPatch([-1.24, 1.01, -0.014], {
    width: 0.09,
    height: 0.11,
    parent: awning,
    surface: "worn-plaster",
    strength: 0.3,
    scale: 1.1,
  });
  const canopy = new THREE.PlaneGeometry(3.3, 3.8, 28, 24);
  canopy.rotateX(-PI / 2);
  const p = canopy.attributes.position;
  for (let i = 0; i < p.count; i++)
    p.setY(
      i,
      2.86 -
        ((p.getZ(i) + 1.9) / 3.8) * 0.36 -
        Math.cos(p.getX(i) * 7.5) * 0.007,
    );
  canopy.computeVertexNormals();
  k.mesh(canopy, fabric, [0, 0, 1.9], [0, 0, 0], awning);
  const valance = new THREE.PlaneGeometry(3.3, 0.17, 28, 2);
  for (let i = 0; i < valance.attributes.position.count; i++) {
    const p = valance.attributes.position;
    if (p.getY(i) < 0) p.setY(i, p.getY(i) - 0.022 * Math.cos(p.getX(i) * 9));
  }
  valance.computeVertexNormals();
  k.mesh(valance, fabric, [0, 2.415, 3.8], [0, 0, 0], awning);
  for (const x of [-1.54, 1.54]) {
    t.rod([x, 0.04, 3.68], [x, 2.51, 3.68], 0.029, k.m.iron, awning);
    t.rod([x, 2.83, 0.02], [x, 2.48, 3.76], 0.021, k.m.iron, awning);
    t.rod([x, 3.07, 0.02], [x, 2.6, 2.7], 0.009, k.m.iron, awning);
  }
  t.rod([-1.63, 2.5, 3.76], [1.63, 2.5, 3.76], 0.023, k.m.iron, awning);
  const signMap = k.texture(
    (c, s) => {
      c.fillStyle = "#ddd2ae";
      c.fillRect(0, 0, s, s);
      c.strokeStyle = "#3a6572";
      c.lineWidth = 12;
      c.strokeRect(27, 120, s - 54, s - 240);
      c.fillStyle = "#315763";
      c.font = "bold 88px Georgia";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("CAFÉ", s / 2, s / 2);
    },
    [1, 1],
    512,
  );
  const sign = k.material(0xffffff, 0.56);
  sign.map = signMap;
  k.mesh(
    new THREE.PlaneGeometry(0.83, 0.44),
    sign,
    [0, 2.12, 0.08],
    [0, 0, 0],
    awning,
  );
  k.poster([1.15, 1.38, -0.012], {
    width: 0.42,
    height: 0.63,
    parent: awning,
    image: "/public/print-library/poster-cafe-bahia.jpg",
  });
  const flowers = {
    leaf: k.leafMaterial("broadleaf"),
    flowers: [0xaf477d, 0xc56b93].map((c) => k.material(c, 0.87)),
  };
  k.model(CLAY_PLANTER, [11.65, level, 6.05], {
    height: 0.58,
    angle: 0.37,
    packedOcclusion: true,
  });
  const soil = t.painted(0x685845, k.m.ground, 1);
  t.cylinder(
    0.278,
    0.018,
    [11.65, level + 0.532, 6.05],
    soil,
    k.group,
    0.278,
    40,
  );
  bougainvillea(k, t, [11.65, level + 0.533, 6.05], 0.6, flowers);
  return [10.65, level + 0.86, 8.4];
}

/** An invented neighborhood praça using Bahia's regional architectural vocabulary. */
export function buildBahianSquare(definition, renderer) {
  const k = createOutdoorKit(renderer, seedFor(definition, 381), {
    sunPosition: [-19, 17, 9],
    sunColor: 0xffd8a5,
    sunIntensity: 3.1,
    skyColor: 0xb2c7d8,
    fogDensity: 0.0045,
    exposure: 0.88,
  });
  const t = coastalTools(k);
  const grade = (x, z) =>
    (z + 5) * 0.046 + 0.04 * (1 - Math.min(1, Math.abs(x) / 15));
  const gravel = t.painted(0x968f80, k.m.cobble);
  const stones = [
    0xb3aa9c, 0xaba292, 0xa1988a, 0xb5ac9c, 0xa8a095, 0xafa594,
  ].map((c) => {
    const material = t.painted(c, k.m.stone, 0.91);
    material.normalScale.set(0.13, 0.13);
    return material;
  });
  const roof = [0xa56b4b, 0xb57957, 0x936349, 0xbe8360].map((c) =>
    t.painted(c, k.m.terracotta, 0.86),
  );
  const repairStone = t.painted(0xa8a493, k.m.stone, 0.95);
  repairStone.normalScale.set(0.08, 0.08);
  const ground = new THREE.PlaneGeometry(110, 170, 12, 24);
  ground.rotateX(-PI / 2);
  for (let i = 0; i < ground.attributes.position.count; i++) {
    const p = ground.attributes.position;
    p.setY(i, grade(p.getX(i), p.getZ(i) + 5) - 0.016);
  }
  ground.computeVertexNormals();
  k.mesh(ground, gravel, [0, 0, 5]);
  t.block(
    [1.73, 0.008, 1.68],
    [8.66, grade(8.66, 6.8) - 0.016, 6.8],
    repairStone,
    k.group,
    [-0.046, 0, 0],
  );
  for (let row = 0, z = -19; z < 57; row++, z += 0.42) {
    for (let x = -15 + (row % 2) * 0.21; x < 15; x += 0.43) {
      const xx = x + k.range(-0.007, 0.007),
        zz = z + k.range(-0.007, 0.007);
      const size = [
        k.range(0.415, 0.427),
        k.range(0.049, 0.061),
        k.range(0.408, 0.419),
      ];
      const position = [xx, grade(xx, zz) - 0.014 + k.range(-0.003, 0.003), zz];
      const original = stones[Math.floor(k.random() * stones.length)],
        angle = k.range(-0.023, 0.023);
      const repaired = xx > 7.9 && xx < 9.45 && zz > 6.0 && zz < 7.6;
      if (
        (row === 61 && Math.abs(xx - 8.43) < 0.08) ||
        (row === 63 && Math.abs(xx - 8.86) < 0.08)
      ) {
        chippedPaver(k, size, position, original, [-0.046, angle, 0]);
      } else {
        const mesh = t.stone(
          size,
          position,
          repaired ? repairStone : original,
          k.group,
          angle,
          row % 4,
        );
        mesh.rotation.x = -0.046;
      }
    }
  }
  for (const side of [-1, 1]) {
    for (let z = -16.5; z < 55; z += 0.5) {
      const edge = z > 19 ? 10.5 : 14.75;
      const curb = side * (edge - 1.2),
        channel = side * (edge - 1.55);
      t.stone([0.3, 0.22, 0.48], [curb, grade(curb, z) + 0.03, z], stones[2]);
      t.stone(
        [0.25, 0.13, 0.49],
        [channel, grade(channel, z) - 0.045, z],
        gravel,
      );
    }
    for (let z = -13; z < 47; z += 3.45) {
      const x = side * ((z > 19 ? 10.5 : 14.75) - 1.9);
      const p = [x, grade(x, z), z];
      const post = k.sub(p);
      t.cylinder(0.13, 0.13, [0, 0.065, 0], k.m.iron, post, 0.18, 12);
      t.cylinder(0.065, 0.72, [0, 0.43, 0], k.m.iron, post, 0.095, 12);
      t.cylinder(0.097, 0.06, [0, 0.73, 0], k.m.iron, post, 0.097, 12);
      t.ball([0.092, 0.083, 0.092], [0, 0.815, 0], k.m.iron, post);
    }
  }
  const palette = [
    [0xd8b679, 0x3e6573],
    [0xcaa58d, 0x4f686a],
    [0x9eb9c2, 0x335e72],
    [0xdfd8bb, 0x44746e],
    [0xc18f6f, 0x3d5f72],
    [0xa8baac, 0x466351],
  ];
  const windowMaterials = {
    wall: t.painted(0xbeb29b),
    floor: t.painted(0x877460, k.m.cedar, 0.87),
    reveal: t.painted(0xd6cbb4),
    sash: t.painted(0xded5be, k.m.cedar, 0.73),
    curtain: k.material(0xeee7d7, 0.98),
    glass: k.material(0xc8d7d4, 0.13, 0.03),
  };
  windowMaterials.curtain.map = k.m.linen.map;
  windowMaterials.curtain.bumpMap = k.m.linen.bumpMap;
  windowMaterials.curtain.bumpScale = 0.0015;
  windowMaterials.curtain.side = THREE.DoubleSide;
  Object.assign(windowMaterials.glass, {
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    envMapIntensity: 0.65,
  });
  windowMaterials.glass.name = "Domestic window glass";
  for (const side of [-1, 1])
    for (let i = 0; i < 9; i++) {
      const z = -12.8 + i * 7.05,
        width = 7.08;
      const colors =
        side > 0 && i === 3
          ? palette[0]
          : palette[(i + (side > 0 ? 2 : 0)) % palette.length];
      const edge = i >= 5 ? 10.5 : 14.75;
      colonialFacade(k, t, {
        position: [side * edge, grade(side * edge, z) - 0.08, z],
        angle: side < 0 ? PI / 2 : -PI / 2,
        width,
        height: 9.1 + (i % 3 === 0 ? 0.27 : 0),
        color: colors[0],
        shutter: colors[1],
        roof,
        balcony: i % 3 !== 2,
        windowMaterials:
          i === 2 || (side > 0 && i === 3) ? windowMaterials : undefined,
      });
    }
  neighborhoodChapel(k, t, [-7.2, grade(-7.2, -18.4) + 0.28, -18.4], roof);
  for (const [x, color, width] of [
    [-16.5, 0xb9ad83, 8],
    [2.0, 0xc49b6c, 7.8],
    [9.55, 0xa2b7b1, 7.2],
    [17, 0xb68677, 7.2],
  ]) {
    colonialFacade(k, t, {
      position: [x, grade(x, -20.6), -20.6],
      width,
      height: 8.95,
      color,
      shutter: 0x4c615a,
      roof,
    });
  }
  for (const [x, color] of [
    [-9.32, 0xbdae85],
    [0, 0xa9b6b8],
    [9.32, 0xbc9480],
  ]) {
    colonialFacade(k, t, {
      position: [x, grade(x, 57), 57],
      angle: PI,
      width: 9.35,
      height: 9.1,
      color,
      shutter: 0x4d6256,
      roof,
      balcony: false,
    });
  }
  for (const side of [-1, 1]) {
    t.block(
      [0.6, 1.3, 10.5],
      [side * 14.6, grade(0, 51.6) + 0.6, 51.6],
      stones[2],
    );
    t.block(
      [0.72, 0.13, 10.7],
      [side * 14.6, grade(0, 51.6) + 1.3, 51.6],
      stones[0],
    );
  }
  const shade = [-8.8, grade(-8.8, 1.1), 1.1];
  t.cylinder(
    0.79,
    0.14,
    [shade[0], shade[1] + 0.045, shade[2]],
    stones[2],
    k.group,
    0.79,
    32,
  );
  t.cylinder(
    0.65,
    0.026,
    [shade[0], shade[1] + 0.122, shade[2]],
    gravel,
    k.group,
    0.65,
    24,
  );
  const shadeTree = k.tree([shade[0], shade[1] + 0.12, shade[2]], {
    height: 4.9,
    radius: 2.15,
  });
  shadeTree.name = "Irregular branching praça tree";
  shadeTree.rotation.y = 0.53;
  shadeTree.scale.z = 0.84;
  k.rod([0.08, 1.7, 0], [0.81, 2.36, -0.14], 0.037, k.m.bark, shadeTree, 0.077);
  k.rod(
    [0.81, 2.36, -0.14],
    [1.24, 2.67, -0.22],
    0.012,
    k.m.bark,
    shadeTree,
    0.037,
  );
  const lowBough = k.tree([0, 0, 0], {
    height: 1.15,
    radius: 0.67,
    kind: "shrub",
  });
  lowBough.position.set(1.24, 2.67, -0.22);
  lowBough.rotation.y = -0.6;
  shadeTree.add(lowBough);
  for (const [x, z, angle] of [
    [-10.9, 2.5, PI / 2],
    [-8.8, -1.55, 0],
  ]) {
    const bench = k.sub([x, grade(x, z), z], angle);
    for (let i = 0; i < 6; i++)
      t.block(
        [2.25, 0.055, 0.062],
        [0, 0.48, -0.2 + i * 0.08],
        k.m.cedar,
        bench,
      );
    for (const xx of [-0.79, 0.79]) {
      t.rod([xx, 0.035, -0.19], [xx, 0.46, -0.16], 0.027, k.m.iron, bench);
      t.rod([xx, 0.035, 0.24], [xx, 0.46, 0.2], 0.027, k.m.iron, bench);
      t.rod([xx, 0.25, -0.16], [xx, 0.25, 0.2], 0.019, k.m.iron, bench);
    }
  }
  for (const [side, z] of [
    [-1, -5.5],
    [1, 5.2],
  ]) {
    const lamp = k.sub([side * 12.28, grade(side * 12.28, z), z]);
    k.lathe(
      [
        [0.23, 0],
        [0.2, 0.15],
        [0.11, 0.3],
        [0.09, 0.5],
        [0.055, 3.3],
      ],
      [0, 0, 0],
      k.m.iron,
      lamp,
      16,
    );
    k.tube(
      [
        [0, 3.15, 0],
        [0, 3.7, 0],
        [-side * 0.36, 3.95, 0],
        [-side * 0.71, 3.7, 0],
      ],
      0.035,
      k.m.iron,
      lamp,
    );
    const head = k.sub([-side * 0.69, 3.26, 0], 0, lamp);
    t.block([0.38, 0.43, 0.38], [0, 0.18, 0], k.m.glass, head);
    for (const x of [-0.21, 0.21])
      for (const z of [-0.21, 0.21])
        t.rod([x, -0.03, z], [x * 0.82, 0.43, z * 0.82], 0.018, k.m.iron, head);
    t.cylinder(0.37, 0.18, [0, 0.48, 0], k.m.iron, head, 0.13, 4);
    t.cylinder(0.26, 0.07, [0, -0.06, 0], k.m.iron, head, 0.26, 4);
  }
  const planterLeaves = k.leafMaterial("broadleaf");
  for (const [x, z] of [
    [-13.9, 9.4],
    [14.05, -7.1],
    [-13.8, -11.4],
  ]) {
    const pot = k.sub([x, grade(x, z), z]);
    k.lathe(
      [
        [0.23, 0],
        [0.35, 0.08],
        [0.4, 0.65],
        [0.43, 0.7],
        [0.43, 0.77],
        [0.37, 0.77],
        [0.34, 0.66],
      ],
      [0, 0, 0],
      k.m.pot,
      pot,
      24,
    );
    t.cylinder(0.35, 0.03, [0, 0.67, 0], gravel, pot);
    for (let i = 0; i < 28; i++) {
      const a = k.range(0, TAU),
        r = k.range(0.07, 0.5);
      const end = [Math.cos(a) * r, k.range(0.85, 1.45), Math.sin(a) * r];
      t.rod([0, 0.66, 0], end, 0.006, k.m.bark, pot);
      const leaf = k.mesh(plantLamina(t), planterLeaves, end, [0, 0, 0], pot);
      leaf.scale.set(0.12, 0.23, 0.12);
      leaf.rotation.set(k.range(-0.6, 0.6), a, k.range(-0.6, 0.6));
      leaf.position.add(
        new THREE.Vector3(0, 0.105, 0).applyEuler(leaf.rotation),
      );
    }
  }
  const cafeAnchor = bahianCafeCorner(k, t, grade);
  return k.finish(
    definition,
    {
      arrival: outdoorView(
        "Coffee beside the praça",
        [10.15, 2.54, 12.2],
        [-2.5, 3.15, -13.8],
        61,
      ),
      chapel: outdoorView(
        "The small neighborhood chapel",
        [-2.8, 1.6, -9.4],
        [-7.2, 3.7, -18.4],
        59,
      ),
      facades: outdoorView(
        "Shutters & iron balconies",
        [6.9, 2.2, 6.8],
        [14.65, 4.5, 1.0],
        59,
      ),
      paving: outdoorView(
        "Worn stones & shade",
        [-9.2, 2.2, 7.8],
        [-3, 0.25, -4],
        62,
      ),
    },
    [[-7.2, 4.6, -18.05], [14.6, 4.7, 1.3], [-3.6, 0.46, 1.2], cafeAnchor],
    { exposure: 0.88, environmentIntensity: 0.12 },
  );
}

function wovenMaterial(
  k,
  {
    blue = "#235486",
    cream = "#e9e1c9",
    repeat = [1, 1],
    stripe = true,
    pattern = "stripe",
  } = {},
) {
  const map = k.texture(
    (c, s) => {
      c.fillStyle = cream;
      c.fillRect(0, 0, s, s);
      if (pattern === "rug") {
        c.fillStyle = "#985341";
        c.fillRect(0, 0, s, s);
        for (const [inset, color, thickness] of [
          [13, "#c6a667", 5],
          [24, "#433e30", 8],
          [42, "#d8c29b", 3],
          [58, "#bd804e", 8],
        ]) {
          c.strokeStyle = color;
          c.lineWidth = thickness;
          c.strokeRect(inset, inset, s - inset * 2, s - inset * 2);
        }
        for (let row = 0; row < 2; row++)
          for (let col = 0; col < 4; col++) {
            const x = 76 + col * 91,
              y = 84 + row * 173,
              width = 87,
              height = 166;
            c.fillStyle = ["#c4af89", "#9b573f", "#777957", "#b77c58"][
              (col + row) % 4
            ];
            c.fillRect(x, y, width, height);
            c.strokeStyle = "#e0c99c";
            c.lineWidth = 5;
            c.beginPath();
            c.moveTo(x + width / 2, y + 24);
            c.lineTo(x + width - 15, y + height / 2);
            c.lineTo(x + width / 2, y + height - 24);
            c.lineTo(x + 15, y + height / 2);
            c.closePath();
            c.stroke();
            c.strokeStyle = "#6d4332";
            c.lineWidth = 4;
            c.beginPath();
            c.moveTo(x + 22, y + height / 2);
            c.lineTo(x + width - 22, y + height / 2);
            c.moveTo(x + width / 2, y + 37);
            c.lineTo(x + width / 2, y + height - 37);
            c.stroke();
          }
        c.strokeStyle = "#dbc69f";
        c.lineWidth = 3;
        for (const y of [47, s - 47]) {
          c.beginPath();
          for (let x = 46; x <= s - 46; x += 9)
            c.lineTo(x, y + (Math.round(x / 9) % 2 ? 7 : -7));
          c.stroke();
        }
      } else if (stripe) {
        for (let x = 0; x < s; x += 128) {
          c.fillStyle = blue;
          c.fillRect(x + 17, 0, 36, s);
          c.fillRect(x + 63, 0, 5, s);
          c.fillRect(x + 76, 0, 5, s);
        }
      } else {
        c.fillStyle = blue;
        c.fillRect(0, 0, s, s);
      }
      for (let y = 0; y < s; y += 4)
        for (let x = 0; x < s; x += 4) {
          const even = (x / 4 + y / 4) % 2 === 0;
          c.fillStyle = even ? "#ffffff26" : "#10213925";
          c.fillRect(x, y, even ? 3 : 1, even ? 1 : 3);
        }
      for (let x = 1; x < s; x += 8) {
        c.fillStyle = "#fffaf011";
        c.fillRect(x, 0, 1, s);
      }
    },
    repeat,
    512,
  );
  const material = k.material(0xffffff, 0.96);
  material.map = map;
  material.bumpMap = map;
  material.bumpScale = 0.004;
  material.side = THREE.DoubleSide;
  return material;
}

function cushion(
  k,
  t,
  size,
  position,
  material,
  piping,
  parent,
  rotation = [0, 0, 0],
) {
  const geo = t.geometry("woven-cushion", () => {
    const geometry = new THREE.SphereGeometry(1, 16, 10);
    const p = geometry.attributes.position,
      uv = geometry.attributes.uv;
    const round = (value) => Math.sign(value) * Math.abs(value) ** 0.38;
    for (let i = 0; i < p.count; i++) {
      const x = round(p.getX(i)),
        y = round(p.getY(i)),
        z = round(p.getZ(i));
      p.setXYZ(
        i,
        x / 2,
        (y / 2) * (0.96 + 0.025 * Math.cos(x * 17 + z * 8)),
        z / 2,
      );
      uv.setXY(i, x / 2 + 0.5, z / 2 + 0.5);
    }
    geometry.computeVertexNormals();
    return geometry;
  });
  const g = k.sub(position, 0, parent);
  g.rotation.set(...rotation);
  const object = k.mesh(geo, material, [0, 0, 0], [0, 0, 0], g);
  object.scale.set(...size);
  const [w, h, d] = size;
  k.tube(
    [
      [-w * 0.42, 0, -d * 0.49],
      [w * 0.42, 0, -d * 0.49],
      [w * 0.49, 0, -d * 0.39],
      [w * 0.49, 0, d * 0.39],
      [w * 0.42, 0, d * 0.49],
      [-w * 0.42, 0, d * 0.49],
      [-w * 0.49, 0, d * 0.39],
      [-w * 0.49, 0, -d * 0.39],
    ],
    Math.min(0.007, h / 20),
    piping,
    g,
    true,
  );
  return g;
}

function blueStool(k, t, position, angle, blue) {
  const g = k.sub(position, angle);
  k.lathe(
    [
      [0, 0.39],
      [0.22, 0.39],
      [0.234, 0.4],
      [0.235, 0.426],
      [0.224, 0.435],
      [0, 0.435],
    ],
    [0, 0, 0],
    blue,
    g,
    28,
  );
  for (const x of [-0.135, 0.135])
    for (const z of [-0.135, 0.135]) {
      k.lathe(
        [
          [0.019, 0],
          [0.025, 0.018],
          [0.022, 0.075],
          [0.023, 0.12],
          [0.03, 0.15],
          [0.022, 0.18],
          [0.022, 0.27],
          [0.029, 0.3],
          [0.025, 0.38],
        ],
        [x, 0.018, z],
        blue,
        g,
        12,
      );
    }
  for (const side of [-1, 1]) {
    t.rod(
      [-0.135, 0.16, side * 0.135],
      [0.135, 0.16, side * 0.135],
      0.016,
      blue,
      g,
    );
    t.rod(
      [side * 0.135, 0.21, -0.135],
      [side * 0.135, 0.21, 0.135],
      0.016,
      blue,
      g,
    );
  }
  if (Math.round(Math.abs(position[0]) * 10) % 3 === 0) {
    const wear = k.wearPatch([0.11, 0.436, 0.105], {
      width: 0.06,
      height: 0.024,
      parent: g,
      surface: "weathered-wood",
      strength: 0.24,
      scale: 0.6,
    });
    wear.rotation.set(-PI / 2, 0, 0.2);
  }
  return g;
}

function drapedRug(k, t, position, width, material, parent) {
  const geo = t.geometry("draped-cafe-rug", () => {
    const geometry = new THREE.PlaneGeometry(1, 1, 28, 20),
      p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        v = p.getY(i) + 0.5;
      const over = Math.max(0, v - 0.87) / 0.13;
      p.setXYZ(
        i,
        x,
        0.2 + Math.min(v, 0.87) * 0.91 - over * 0.045,
        -0.253 + Math.sin(x * 27) * 0.014 * (1 - v) - over * 0.225,
      );
    }
    geometry.computeVertexNormals();
    return geometry;
  });
  const object = k.mesh(geo, material, position, [0, 0, 0], parent);
  object.scale.x = width;
  return object;
}

function curvedParapet(k, t, points, height, plaster, blue) {
  const path = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  const positions = [],
    uv = [],
    index = [],
    n = 40,
    thickness = 0.31;
  for (let i = 0; i <= n; i++) {
    const p = path.getPoint(i / n),
      tangent = path.getTangent(i / n);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    for (const [side, y] of [
      [-1, 0],
      [-1, height - 0.035],
      [1, height - 0.035],
      [1, 0],
    ]) {
      positions.push(
        p.x + (normal.x * side * thickness) / 2,
        p.y + y,
        p.z + (normal.z * side * thickness) / 2,
      );
      uv.push(i * 0.12, y / 2);
    }
    if (i < n)
      for (let face = 0; face < 3; face++) {
        const a = i * 4 + face,
          b = a + 4;
        index.push(a, a + 1, b, a + 1, b + 1, b);
      }
  }
  index.push(
    0,
    2,
    1,
    0,
    3,
    2,
    n * 4,
    n * 4 + 1,
    n * 4 + 2,
    n * 4,
    n * 4 + 2,
    n * 4 + 3,
  );
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  k.mesh(geo, plaster);
  const crown = points.map(([x, y, z]) => [x, y + height - 0.035, z]);
  k.tube(crown, thickness / 2, plaster);
  for (const y of [height + 0.12, height + 0.55])
    k.tube(
      points.map(([x, base, z]) => [x, base + y, z]),
      0.025,
      blue,
    );
  for (let i = 0; i <= 24; i++) {
    const p = path.getPoint(i / 24);
    t.rod(
      [p.x, p.y + height, p.z],
      [p.x, p.y + height + 0.55, p.z],
      0.013,
      blue,
    );
  }
}

function umbrella(k, t, position, radius, blue, cloths, rib) {
  const g = k.sub(position, k.range(-0.15, 0.15));
  t.cylinder(0.15, 0.055, [0, 0.027, 0], rib, g, 0.2);
  t.cylinder(0.027, 2.76, [0, 1.405, 0], blue, g, 0.027, 12);
  t.cylinder(0.065, 0.12, [0, 2.2, 0], rib, g, 0.065, 12);
  const segments = 10;
  for (let panel = 0; panel < segments; panel++) {
    const geo = t.geometry("umbrella-gore", () => {
      const positions = [],
        uv = [],
        index = [],
        radial = 7,
        across = 4;
      for (let row = 0; row <= radial; row++)
        for (let col = 0; col <= across; col++) {
          const r = row / radial,
            angle = ((col / across) * TAU) / segments;
          const sag =
            Math.sin((col / across) * PI) * Math.sin(r * PI * 0.73) * 0.07;
          positions.push(
            Math.cos(angle) * r,
            -0.39 * r ** 0.72 - sag,
            Math.sin(angle) * r,
          );
          uv.push(r * Math.cos(angle), r * Math.sin(angle));
        }
      for (let row = 0; row < radial; row++)
        for (let col = 0; col < across; col++) {
          const a = row * (across + 1) + col,
            b = a + across + 1;
          index.push(a, a + 1, b, a + 1, b + 1, b);
        }
      const result = new THREE.BufferGeometry();
      result.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      result.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      result.setIndex(index);
      result.computeVertexNormals();
      return result;
    });
    const cloth = k.mesh(
      geo,
      cloths[panel % cloths.length],
      [0, 2.78, 0],
      [0, (panel * TAU) / segments, 0],
      g,
    );
    cloth.scale.set(radius, radius, radius);
    const a = (-panel * TAU) / segments;
    const point = (r) => [
      Math.cos(a) * r * radius,
      2.78 - 0.39 * r ** 0.72 * radius - 0.014,
      Math.sin(a) * r * radius,
    ];
    const seam = [0, 0.15, 0.35, 0.6, 0.8, 1].map(point);
    k.tube(seam, 0.009, rib, g);
    t.rod([0, 2.18, 0], point(0.57), 0.01, rib, g);
    const edgeGeo = t.geometry("umbrella-valance", () => {
      const p = [],
        uv = [],
        indices = [];
      for (let i = 0; i <= 10; i++) {
        const angle = ((i / 10) * TAU) / segments;
        for (const bottom of [0, 1]) {
          p.push(
            Math.cos(angle),
            -0.39 - bottom * (0.075 + 0.027 * Math.sin((i / 10) * PI)),
            Math.sin(angle),
          );
          uv.push(i / 10, bottom);
        }
        if (i < 10) {
          const a = i * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const result = new THREE.BufferGeometry();
      result.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      result.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      result.setIndex(indices);
      result.computeVertexNormals();
      return result;
    });
    const valance = k.mesh(
      edgeGeo,
      cloths[panel % cloths.length],
      [0, 2.78, 0],
      [0, (panel * TAU) / segments, 0],
      g,
    );
    valance.scale.set(radius, radius, radius);
  }
  t.ball([0.052, 0.077, 0.052], [0, 2.845, 0], blue, g);
}

function railing(
  k,
  t,
  start,
  end,
  blue,
  plaster,
  { height = 0.91, parapet = 0.38 } = {},
) {
  const a = new THREE.Vector3(...start),
    b = new THREE.Vector3(...end),
    length = a.distanceTo(b);
  const g = k.sub(a.clone().add(b).multiplyScalar(0.5).toArray());
  g.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
  k.box([length + 0.12, parapet, 0.27], [0, parapet / 2, 0], plaster, g, 0.035);
  k.box([length + 0.2, 0.065, 0.34], [0, parapet + 0.02, 0], plaster, g, 0.025);
  for (const y of [parapet + 0.15, height])
    t.rod([-length / 2, y, 0], [length / 2, y, 0], 0.029, blue, g);
  const n = Math.ceil(length / 0.23);
  for (let i = 0; i <= n; i++) {
    const x = -length / 2 + (i * length) / n;
    t.rod(
      [x, parapet + 0.035, 0],
      [x, height, 0],
      i % 5 === 0 ? 0.025 : 0.014,
      blue,
      g,
    );
    if (i % 5 === 0)
      t.ball([0.035, 0.035, 0.035], [x, height + 0.025, 0], blue, g);
    if (i % 2 === 0 && i < n - 1) {
      const span = (length / n) * 2,
        center = x + span / 2;
      for (const sign of [-1, 1]) {
        const yy = sign > 0 ? height - 0.065 : parapet + 0.125;
        k.tube(
          [
            [center - 0.1, yy, 0],
            [center - 0.063, yy + sign * 0.05, 0],
            [center + 0.033, yy + sign * 0.045, 0],
            [center + 0.062, yy - sign * 0.025, 0],
            [center + 0.016, yy - sign * 0.05, 0],
          ],
          0.008,
          blue,
          g,
        );
      }
      t.rod(
        [x + 0.045, parapet + 0.22, 0],
        [x + span - 0.045, height - 0.18, 0],
        0.009,
        blue,
        g,
      );
      t.rod(
        [x + 0.045, height - 0.18, 0],
        [x + span - 0.045, parapet + 0.22, 0],
        0.009,
        blue,
        g,
      );
    }
  }
  return g;
}

function teaService(k, t, parent, materials, variant = 0) {
  const { silver, glass, tea, mint, porcelain } = materials;
  const tray = k.sub([0, 0.615, 0], variant * 0.17, parent);
  k.lathe(
    [
      [0, 0],
      [0.31, 0],
      [0.34, 0.015],
      [0.345, 0.027],
      [0.336, 0.039],
      [0.325, 0.03],
      [0.3, 0.013],
      [0, 0.013],
    ],
    [0, 0, 0],
    silver,
    tray,
    48,
  );
  for (const radius of [0.26, 0.29, 0.328])
    k.ring(radius, 0.0025, [0, 0.016, 0], silver, tray);
  for (const [i, x, z] of [
    [0, -0.13, 0.12],
    [1, 0.13, 0.09],
  ]) {
    const cup = k.sub([x, 0.025, z], i * 0.6, tray);
    k.lathe(
      [
        [0.028, 0],
        [0.033, 0.012],
        [0.043, 0.123],
        [0.044, 0.13],
        [0.04, 0.13],
        [0.039, 0.119],
        [0.029, 0.012],
        [0.026, 0.009],
      ],
      [0, 0, 0],
      glass,
      cup,
      28,
    );
    k.lathe(
      [
        [0, 0.014],
        [0.029, 0.014],
        [0.037, 0.083],
        [0, 0.083],
      ],
      [0, 0, 0],
      tea,
      cup,
      24,
    );
    for (const y of [0.023, 0.099, 0.109])
      k.ring(0.03 + y * 0.083, 0.0014, [0, y, 0], silver, cup);
    for (let j = 0; j < 5; j++) {
      const angle = (j * TAU) / 5 + variant;
      const leaf = t.ball(
        [0.013, 0.003, 0.022],
        [Math.cos(angle) * 0.016, 0.085 + j * 0.004, Math.sin(angle) * 0.017],
        mint,
        cup,
      );
      leaf.rotation.set(0.2, angle, 0.15);
      t.rod(
        [0, 0.05, 0],
        [Math.cos(angle) * 0.017, 0.103, Math.sin(angle) * 0.016],
        0.0008,
        mint,
        cup,
      );
    }
  }
  const pot = k.sub([-0.01, 0.024, -0.12], -0.65, tray);
  k.lathe(
    [
      [0.043, 0],
      [0.07, 0.015],
      [0.099, 0.069],
      [0.089, 0.135],
      [0.061, 0.165],
      [0.059, 0.183],
    ],
    [0, 0, 0],
    silver,
    pot,
    36,
  );
  k.lathe(
    [
      [0.064, 0],
      [0.07, 0.009],
      [0.049, 0.028],
      [0.014, 0.043],
      [0, 0.044],
    ],
    [0, 0.183, 0],
    silver,
    pot,
    28,
  );
  t.ball([0.016, 0.02, 0.016], [0, 0.236, 0], silver, pot);
  k.tube(
    [
      [0.073, 0.048, 0],
      [0.129, 0.067, 0],
      [0.143, 0.135, 0],
      [0.174, 0.174, 0],
    ],
    0.018,
    silver,
    pot,
  );
  k.tube(
    [
      [-0.066, 0.146, 0],
      [-0.127, 0.17, 0],
      [-0.143, 0.092, 0],
      [-0.087, 0.047, 0],
    ],
    0.008,
    silver,
    pot,
  );
  k.lathe(
    [
      [0, 0],
      [0.062, 0.005],
      [0.068, 0.014],
      [0.064, 0.018],
      [0, 0.014],
    ],
    [0.22, 0.021, -0.13],
    porcelain,
    tray,
    24,
  );
  for (let i = 0; i < 3; i++)
    t.block(
      [0.018, 0.017, 0.018],
      [0.21 + (i % 2) * 0.025, 0.044, -0.14 + Math.floor(i / 2) * 0.025],
      porcelain,
      tray,
    );
}

function cafeTable(k, t, position, materials, variant = 0) {
  const g = k.sub(position, variant * 0.37);
  const { blue, silver } = materials;
  t.cylinder(0.33, 0.047, [0, 0.59, 0], blue, g, 0.32, 32);
  for (let i = 0; i < 3; i++) {
    const a = (i * TAU) / 3;
    t.rod(
      [Math.cos(a) * 0.23, 0.03, Math.sin(a) * 0.23],
      [Math.cos(a) * 0.15, 0.57, Math.sin(a) * 0.15],
      0.025,
      blue,
      g,
    );
    t.rod(
      [0, 0.2, 0],
      [Math.cos(a) * 0.2, 0.2, Math.sin(a) * 0.2],
      0.015,
      silver,
      g,
    );
  }
  teaService(k, t, g, materials, variant);
  return g;
}

function plantLamina(t, bract = false) {
  return t.geometry(
    bract ? "bougainvillea-bract" : "coastal-photo-leaf",
    () => {
      const positions = [],
        uv = [],
        indices = [],
        segments = 6;
      for (let row = 0; row <= segments; row++) {
        const v = row / segments,
          width =
            Math.sin(v * PI) ** (bract ? 0.65 : 0.83) * (bract ? 0.51 : 0.38) +
            0.002;
        for (const side of [-1, 0, 1]) {
          const x = side * width;
          positions.push(
            x,
            v - 0.5,
            v * v * (bract ? 0.14 : 0.09) +
              (1 - Math.abs(side)) * Math.sin(v * PI) * 0.07,
          );
          // Crop one photographed leaf using physical width, not a stretched row.
          if (bract) uv.push(x / 1.024 + 0.5, v);
          else
            uv.push(
              0.038 + (x / 0.764 + 0.5) * (0.469 - 0.038),
              0.13 + v * (0.903 - 0.13),
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
    },
  );
}

function bougainvillea(k, t, position, scale, materials) {
  const g = k.sub(position);
  g.scale.setScalar(scale);
  materials.flowers.forEach((material) => {
    material.side = THREE.DoubleSide;
  });
  const branches = [
    [
      [-0.2, 0, 0],
      [-0.31, 1.1, 0.04],
      [0.1, 2.25, 0],
      [-0.8, 3.1, 0.18],
    ],
    [
      [0, 0.3, 0],
      [0.27, 1.4, -0.05],
      [0.83, 2.2, 0.1],
      [1.4, 2.65, 0.27],
    ],
    [
      [-0.05, 1, 0],
      [-0.7, 1.75, 0],
      [-1.6, 2.05, 0.12],
    ],
  ];
  for (const branch of branches) k.tube(branch, 0.026, k.m.bark, g);
  for (let i = 0; i < 150; i++) {
    const angle = k.range(0, TAU),
      radius = k.range(0.1, 1.6);
    const x = Math.cos(angle) * radius,
      y = 1.9 + Math.sin(angle) * 0.69 + k.range(-0.25, 0.65),
      z = k.range(-0.25, 0.35);
    const leaf = k.mesh(
      plantLamina(t),
      materials.leaf,
      [x, y, z],
      [0, 0, 0],
      g,
    );
    leaf.scale.set(0.14, 0.2, 0.14);
    leaf.rotation.set(k.range(-1, 1), angle, k.range(-1, 1));
    if (i % 3 === 0)
      k.rod(
        branches[Math.floor(i / 3) % branches.length][2],
        [x, y, z],
        0.0011,
        k.m.bark,
        g,
        0.004,
      );
    if (i % 3 !== 0) {
      for (let j = 0; j < 3; j++) {
        const a = (j * TAU) / 3;
        const bract = k.mesh(
          plantLamina(t, true),
          materials.flowers[i % materials.flowers.length],
          [x + Math.cos(a) * 0.031, y + Math.sin(a) * 0.027, z + 0.048],
          [0, 0, 0],
          g,
        );
        bract.scale.set(0.096, 0.12, 0.096);
        bract.rotation.set(0.4, a, j);
      }
    }
  }
}

function coastalRock(k, position, size, dry, wet, variation) {
  const outline = [
    [-0.48, -0.34],
    [-0.13, -0.52],
    [0.33, -0.4],
    [0.5, -0.06],
    [0.4, 0.33],
    [0.03, 0.5],
    [-0.4, 0.39],
    [-0.53, 0.01],
  ];
  const strata = [
    [-0.3, 1.02],
    [0.03, 1],
    [0.31, 0.87],
    [0.57, 0.91],
    [0.78, 0.67],
    [0.93, 0.31],
  ];
  const rings = strata.map(([y, extent], row) =>
    outline.map(([x, z], i) => [
      (x * extent - y * 0.095 + Math.sin(i * 2.1 + row + variation) * 0.021) *
        size[0],
      (y + Math.sin(i * 2.7 + row * 1.2 + variation * 3) * 0.04) * size[1],
      (z * extent +
        y * 0.06 +
        Math.cos(i * 1.7 + row * 1.9 + variation) * 0.024) *
        size[2],
    ]),
  );
  const pieces = [
    { material: dry, positions: [], uv: [] },
    { material: wet, positions: [], uv: [] },
  ];
  const triangle = (a, b, c) => {
    const normal = new THREE.Vector3()
      .subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a))
      .cross(
        new THREE.Vector3().subVectors(
          new THREE.Vector3(...c),
          new THREE.Vector3(...a),
        ),
      )
      .normalize();
    const piece =
      pieces[position[1] + (a[1] + b[1] + c[1]) / 3 < -33.25 ? 1 : 0];
    piece.positions.push(...a, ...b, ...c);
    for (const p of [a, b, c]) {
      const u =
        Math.abs(normal.x) > Math.abs(normal.z) && Math.abs(normal.y) < 0.6
          ? p[2]
          : p[0];
      const v = Math.abs(normal.y) > 0.6 ? p[2] : p[1];
      piece.uv.push(u / 1.8 + variation * 0.37, v / 1.8 + variation * 0.19);
    }
  };
  for (let row = 0; row < rings.length - 1; row++)
    for (let i = 0; i < outline.length; i++) {
      const next = (i + 1) % outline.length;
      triangle(rings[row][i], rings[row + 1][i], rings[row + 1][next]);
      triangle(rings[row][i], rings[row + 1][next], rings[row][next]);
    }
  for (let i = 1; i < outline.length - 1; i++)
    triangle(rings.at(-1)[0], rings.at(-1)[i + 1], rings.at(-1)[i]);
  for (const piece of pieces) {
    if (!piece.positions.length) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(piece.positions, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(piece.uv, 2));
    geometry.computeVertexNormals();
    const rock = k.mesh(geometry, piece.material, position, [
      0,
      variation * 0.67,
      0,
    ]);
    rock.name = "Fractured coastal limestone";
  }
}

function mediterraneanCoast(k, t, materials) {
  const ocean = k.water({
    width: 6400,
    depth: 5600,
    position: [0, -34.0, -2150],
    color: 0x246f88,
  });
  ocean.name = "Mediterranean coastal water";
  const ground = new THREE.PlaneGeometry(180, 165, 120, 110);
  ground.rotateX(-PI / 2);
  const naturalHeight = (x, z) => {
    const shoreCurve =
      6.5 * Math.exp(-((x - 24) * (x - 24)) / 289) -
      4 * Math.exp(-((x + 12) * (x + 12)) / 256) +
      Math.sin(x * 0.13) * 2.2;
    const base = Math.max(
      -37.5,
      -3.8 +
        Math.min(0, z + 8 + shoreCurve) * 0.48 -
        Math.max(0, Math.abs(x) - 30) * 0.52,
    );
    // Submerged relief must not rise back through the sea as isolated flat discs.
    const exposed = THREE.MathUtils.smoothstep(base, -35.8, -29);
    return (
      base +
      (Math.sin(x * 0.11) * 1.1 + Math.cos(z * 0.16 + x * 0.075) * 0.8) *
        exposed
    );
  };
  const boulderSites = [
    { x: 9.8, z: -25, height: 2.6, angle: 0.45 },
    { x: 24, z: -52, height: 5.2, angle: -1.1 },
    { x: -4, z: -65, height: 4.6, angle: 2.25 },
  ].map((site) => {
    const c = Math.abs(Math.cos(site.angle)),
      s = Math.abs(Math.sin(site.angle));
    return {
      ...site,
      groundY: naturalHeight(site.x, site.z),
      radiusX: site.height * (0.634 * c + 0.912 * s),
      radiusZ: site.height * (0.634 * s + 0.912 * c),
    };
  });
  const cliffHeight = (x, z) => {
    let y = naturalHeight(x, z);
    for (const site of boulderSites) {
      const dx = (x - site.x) / site.radiusX,
        dz = (z - site.z) / site.radiusZ;
      const distance = (dx ** 4 + dz ** 4) ** 0.25;
      const weight = 1 - THREE.MathUtils.smoothstep(distance, 1.2, 1.75);
      const seat = site.groundY - site.height * 0.045 * (dx * dx + dz * dz);
      y = THREE.MathUtils.lerp(y, seat, weight);
    }
    return y;
  };
  const p = ground.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i) - 46;
    p.setXYZ(i, x, cliffHeight(x, z), z);
    ground.attributes.uv.setXY(i, x / 3, z / 3);
  }
  ground.computeVertexNormals();
  k.mesh(ground, materials.rock);
  const shoreFeatures = [];
  for (let i = 0; i < 46; i++) {
    const x = k.range(-55, 57),
      z = k.range(-67, -15);
    if (Math.abs(x) < 12 && z > -19) continue;
    const y = cliffHeight(x, z);
    if (y < -33.5) continue;
    const size = [k.range(1.2, 3.4), k.range(0.6, 1.5), k.range(1.1, 2.8)];
    shoreFeatures.push({ x, y, z, size, shrub: i % 3 !== 0 });
  }
  const wetRock = t.painted(0x747b72, k.m.stone, 0.63);
  wetRock.normalScale.set(0.24, 0.24);
  delete wetRock.userData.metresPerRepeat;
  delete materials.rock.userData.metresPerRepeat;
  for (const site of boulderSites) {
    const rock = k.model(
      SHORE_BOULDER,
      [site.x, site.groundY - site.height * 0.16, site.z],
      {
        height: site.height,
        angle: site.angle,
        packedOcclusion: true,
      },
    );
    rock.name = "Embedded shore boulder";
  }
  for (const [x, z, angle] of [
    [-63, -194, 0.5],
    [12, -284, -0.6],
    [-118, -385, 0.25],
  ]) {
    const boat = k.sub([x, -33.79, z], angle);
    const hull = t.ball(
      [0.76, 0.31, 2.2],
      [0, 0.04, 0],
      materials.distantWhite,
      boat,
    );
    hull.rotation.z = 0.08;
    t.rod([0, 0.17, 0], [0, 5.5, 0], 0.035, materials.silver, boat);
    const sail = new THREE.BufferGeometry();
    sail.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0.8, 0, 0, 5.4, 0, 0, 0.8, 2.0], 3),
    );
    sail.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 0], 2),
    );
    sail.computeVertexNormals();
    k.mesh(sail, materials.sail, [0.025, 0, 0], [0, 0, 0], boat);
  }
  for (const [index, feature] of shoreFeatures.entries()) {
    const { x, y, z, size } = feature;
    if (feature.shrub && y > -32) {
      const shrub = k.tree([x, y + 0.025, z], {
        height: 0.75 + size[1] * 0.72,
        radius: 0.6 + size[0] * 0.14,
        kind: "shrub",
      });
      shrub.name = "Branched coastal scrub";
      shrub.rotation.y = index * 2.39996;
      shrub.scale.z = 0.82;
    } else if (y > -35) {
      coastalRock(
        k,
        [x, y - size[1] * 0.1, z],
        [size[0] * 1.3, size[1] * 0.95, size[2] * 1.4],
        materials.rock,
        wetRock,
        index,
      );
    }
  }
}

/** An anonymous Tunisian coastal café with an invented terrace and seating plan. */
export function buildTunisianCafe(definition, renderer) {
  const k = createOutdoorKit(renderer, seedFor(definition, 911), {
    sunPosition: [-25, 24, 12],
    sunColor: 0xfff0d7,
    sunIntensity: 2.35,
    skyColor: 0x9cbed0,
    fogDensity: 0.00045,
    exposure: 0.87,
  });
  const t = coastalTools(k);
  const plaster = t.painted(0xe7e3d7, k.m.plaster, 0.94);
  const blue = t.painted(0x287ab5, k.m.cedar, 0.56);
  blue.normalScale.set(0.12, 0.12);
  const wood = t.painted(0xa67c46, k.m.cedar, 0.73);
  const floor = [0xdbcfb7, 0xd6c7ac, 0xe1d5bf, 0xcfc0a7].map((c) => {
    const material = t.painted(c, k.m.stone, 0.8);
    material.normalScale.set(0.12, 0.12);
    return material;
  });
  const mortar = t.painted(0xbfb9a7, k.m.plaster);
  const silver = k.material(0xb4b4a0, 0.26, 0.86);
  const engraving = k.texture(
    (c, s) => {
      c.fillStyle = "#c3c1ad";
      c.fillRect(0, 0, s, s);
      for (let r = 30; r < s * 0.7; r += 19) {
        c.strokeStyle = r % 3 ? "#999b89" : "#dedec8";
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(s / 2, s / 2, r, 0, TAU);
        c.stroke();
      }
      for (let i = 0; i < 300; i++) {
        const a = i * 2.39996,
          r = Math.sqrt(i / 300) * s * 0.66;
        c.strokeStyle = "#939788";
        c.lineWidth = 1;
        c.beginPath();
        c.ellipse(
          s / 2 + Math.cos(a) * r,
          s / 2 + Math.sin(a) * r,
          3,
          5,
          a,
          0,
          TAU,
        );
        c.stroke();
      }
    },
    [1, 1],
    512,
  );
  silver.map = engraving;
  silver.bumpMap = engraving;
  silver.bumpScale = 0.0007;
  const glass = k.material(0xdeeee8, 0.075);
  glass.transparent = true;
  glass.opacity = 0.32;
  glass.depthWrite = false;
  glass.side = THREE.DoubleSide;
  const tea = k.material(0x8f6520, 0.16);
  tea.transparent = true;
  tea.opacity = 0.8;
  tea.depthWrite = false;
  const mint = k.material(0x50833c, 0.76),
    porcelain = k.material(0xf4edda, 0.23);
  const woven = wovenMaterial(k, { blue: "#35698a", cream: "#e7dfc9" });
  const backWoven = wovenMaterial(k, { pattern: "rug" });
  const cloths = [
    wovenMaterial(k, { blue: "#145db0", stripe: false, repeat: [5, 5] }),
    wovenMaterial(k, { blue: "#216bbb", stripe: false, repeat: [5, 5] }),
  ];
  const rib = k.material(0xd1c8ad, 0.58, 0.2);
  const materials = {
    blue,
    wood,
    silver,
    glass,
    tea,
    mint,
    porcelain,
    leaf: k.leafMaterial("broadleaf"),
    flowers: [0xa63b73, 0xbe4d8c, 0xc76c99].map((c) => k.material(c, 0.83)),
    rock: t.painted(0xa59f87, k.m.stone),
    distantWhite: k.material(0xd7dfd8, 0.95),
    sail: k.material(0xe3e7d9, 0.95),
  };
  materials.rock.name = "Coastal substrate";
  materials.sail.side = THREE.DoubleSide;
  mediterraneanCoast(k, t, materials);
  const levels = [
    {
      y: 3.3,
      z: 9.2,
      depth: 6.0,
      seats: [
        [-7.3, -1.55],
        [3.0, -1.2],
      ],
    },
    {
      y: 2.05,
      z: 2.2,
      depth: 8.0,
      seats: [
        [-8.6, -2.1],
        [-2.1, -1.65],
        [8.5, -2.1],
      ],
    },
    {
      y: 0.65,
      z: -4.5,
      depth: 5.4,
      seats: [
        [-7.6, -1.1],
        [0.75, -0.9],
        [8.1, -1.1],
      ],
    },
  ];
  for (let level = 0; level < levels.length; level++) {
    const { y, z, depth, seats } = levels[level];
    k.box([23.2, 7.8, depth + 0.22], [0, y - 4.0, z], plaster, k.group, 0.07);
    t.block([23.0, 0.09, depth], [0, y - 0.05, z], mortar);
    const columns = 51,
      rows = Math.floor(depth / 0.45);
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < columns; col++) {
        const x = -11.44 + ((col + 0.5) * 22.88) / columns;
        const zz = z - depth / 2 + ((row + 0.5) * depth) / rows;
        const size = [22.88 / columns - 0.008, 0.045, depth / rows - 0.008];
        const position = [x, y + k.range(-0.001, 0.001), zz],
          material = floor[Math.floor(k.random() * floor.length)];
        if (level === 1 && row === 8 && col === 14)
          chippedPaver(k, size, position, material);
        else t.stone(size, position, material, k.group, 0, (col + row) % 3);
      }
    for (const side of [-1, 1]) {
      if (level === 0 && side === 1) continue;
      railing(
        k,
        t,
        [side * 11.4, y, z - depth / 2],
        [side * 11.4, y, z + depth / 2],
        blue,
        plaster,
      );
    }
    if (level === 0)
      curvedParapet(
        k,
        t,
        [
          [11.4, y, 6.2],
          [11.35, y, 8.8],
          [10.8, y, 10.6],
          [10.7, y, 12.5],
          [11.35, y, 15],
          [11.4, y, 17.2],
        ],
        0.72,
        plaster,
        blue,
      );
    const front = z - depth / 2;
    railing(k, t, [-11.4, y, front], [4.55, y, front], blue, plaster, {
      height: 0.89,
      parapet: 0.33,
    });
    railing(k, t, [6.6, y, front], [11.4, y, front], blue, plaster, {
      height: 0.89,
      parapet: 0.33,
    });
    for (let x = -11.2; x < 11.3; x += 0.24) {
      if (x > 4.45 && x < 6.7) continue;
      t.block(
        [0.23, 0.008, 0.19],
        [x, y + 0.37, front],
        Math.round(x / 0.24) % 2 ? blue : porcelain,
      );
    }
    for (const [x, offset] of seats) {
      const bench = k.sub([x, y, z + offset]);
      k.box([2.7, 0.43, 0.72], [0, 0.215, 0], plaster, bench, 0.055);
      k.box([2.7, 0.74, 0.19], [0, 0.6, -0.37], plaster, bench, 0.04);
      for (const side of [-1, 1])
        k.box(
          [0.18, 0.68, 0.82],
          [side * 1.31, 0.35, -0.015],
          plaster,
          bench,
          0.045,
        );
      drapedRug(k, t, [0, 0, 0], 2.42, backWoven, bench);
      if (level === 1 && x < 0)
        cushion(
          k,
          t,
          [0.69, 0.095, 0.6],
          [0.75, 0.477, 0.03],
          woven,
          blue,
          bench,
        );
    }
    for (const [i, [x, offset]] of seats.entries()) {
      const tableZ = z + offset + 1.1;
      cafeTable(k, t, [x, y + 0.025, tableZ], materials, level * 3 + i);
      blueStool(k, t, [x - 0.77, y + 0.025, tableZ + 0.13], -PI / 2, blue);
      blueStool(k, t, [x + 0.57, y + 0.025, tableZ + 0.66], 0.42, blue);
      const shaded = level === 1 ? i !== 1 : i === 0;
      if (shaded)
        umbrella(
          k,
          t,
          [x - 1.03, y, tableZ + 0.72],
          level === 1 ? 1.57 : 1.4,
          blue,
          cloths,
          rib,
        );
    }
    if (level < 2) {
      const lower = levels[level + 1],
        stairFront = front - 2.42;
      for (let step = 0; step < 8; step++) {
        const stepY = lower.y + ((step + 1) * (y - lower.y)) / 8,
          zz = stairFront + step * 0.31;
        k.box(
          [1.85, stepY - lower.y + 0.1, 0.33],
          [5.6, lower.y + (stepY - lower.y) / 2 - 0.05, zz],
          plaster,
          k.group,
          0.016,
        );
        t.block(
          [1.84, 0.032, 0.325],
          [5.6, stepY + 0.005, zz],
          floor[step % floor.length],
        );
        t.block([1.84, 0.065, 0.022], [5.6, stepY - 0.055, zz - 0.167], blue);
      }
      for (const x of [4.57, 6.63]) {
        t.rod(
          [x, lower.y + 0.81, stairFront - 0.13],
          [x, y + 0.85, front + 0.11],
          0.035,
          blue,
        );
        for (let i = 0; i < 5; i++) {
          const f = i / 4,
            zz = stairFront + f * 2.42,
            yy = lower.y + f * (y - lower.y);
          t.rod([x, yy, zz], [x, yy + 0.83, zz], 0.023, blue);
        }
      }
    }
  }
  k.wearPatch([4.34, 3.49, 6.338], {
    width: 0.14,
    height: 0.19,
    surface: "worn-plaster",
    strength: 0.44,
    scale: 1.1,
  });
  // A real entrance court separates the visitor from the uphill café frontage.
  k.box([23.2, 6.8, 6.0], [0, -0.15, 15.2], plaster, k.group, 0.045);
  t.block([23.0, 0.07, 6.0], [0, 3.24, 15.2], mortar);
  for (let row = 0; row < 13; row++)
    for (let col = 0; col < 51; col++) {
      t.stone(
        [22.88 / 51 - 0.008, 0.045, 6 / 13 - 0.008],
        [
          -11.44 + ((col + 0.5) * 22.88) / 51,
          3.3,
          12.2 + ((row + 0.5) * 6) / 13,
        ],
        floor[(col + row * 3) % floor.length],
        k.group,
        0,
        (col + row) % 3,
      );
    }
  railing(k, t, [-11.4, 3.3, 12.2], [-11.4, 3.3, 17.2], blue, plaster);
  const rearWall = new THREE.Shape();
  rearWall.moveTo(-12.5, 0);
  rearWall.lineTo(12.5, 0);
  rearWall.lineTo(12.5, 4.1);
  rearWall.lineTo(-12.5, 4.1);
  rearWall.closePath();
  const rearDoors = [-8.8, -3.5, 3.0, 9.4];
  for (const x of rearDoors)
    rearWall.holes.push(
      new THREE.Path(
        archShape(1.5, 2.8)
          .getPoints(28)
          .map((p) => new THREE.Vector2(p.x + x, p.y)),
      ),
    );
  for (const x of [-0.5, 6.5])
    rearWall.holes.push(
      new THREE.Path(
        archShape(0.95, 1.45)
          .getPoints(24)
          .map((p) => new THREE.Vector2(p.x + x, p.y + 1.15)),
      ),
    );
  k.mesh(
    new THREE.ExtrudeGeometry(rearWall, {
      depth: 0.55,
      bevelEnabled: false,
      curveSegments: 28,
    }),
    plaster,
    [0, 3.3, 17.425],
  );
  t.block([25, 4.3, 2.8], [0, 1.15, 18.3], plaster);
  for (const x of rearDoors) {
    const door = k.sub([x, 3.31, 17.385], PI);
    k.mesh(
      new THREE.ShapeGeometry(archShape(1.5, 2.8), 28),
      blue,
      [0, 0, -0.3],
      [0, 0, 0],
      door,
    );
    archMolding(k, t, [0, 0, 0.045], 1.5, 2.8, 0.15, plaster, door, 0.12);
    for (let xx = -0.65; xx < 0.7; xx += 0.105) {
      const top = 2.05 + Math.sqrt(Math.max(0, 0.75 ** 2 - xx ** 2));
      t.block([0.071, top, 0.025], [xx, top / 2, -0.265], blue, door);
      for (let yy = 0.23; yy < Math.min(top, 2.5); yy += 0.24)
        t.ball([0.009, 0.009, 0.009], [xx, yy, -0.242], silver, door);
    }
    for (const sign of [-1, 1])
      k.ring(0.065, 0.01, [sign * 0.19, 1.38, -0.212], silver, door, [0, 0, 0]);
    k.box([1.94, 0.16, 0.65], [0, 0.02, 0.2], plaster, door, 0.018);
  }
  for (const x of [-0.5, 6.5]) {
    const window = k.sub([x, 4.45, 17.385], PI);
    k.mesh(
      new THREE.ShapeGeometry(archShape(0.95, 1.45), 24),
      k.m.dark,
      [0, 0, -0.24],
      [0, 0, 0],
      window,
    );
    archMolding(k, t, [0, 0, 0.055], 0.95, 1.45, 0.13, plaster, window, 0.14);
    for (let xx = -0.36; xx < 0.4; xx += 0.12)
      t.rod([xx, 0.06, -0.12], [xx, 1.21, -0.12], 0.012, blue, window);
    for (const y of [0.17, 0.65, 1.12])
      t.rod([-0.4, y, -0.12], [0.4, y, -0.12], 0.017, blue, window);
    t.block([1.28, 0.1, 0.31], [0, -0.04, 0.055], plaster, window);
  }
  t.block([25.3, 0.14, 0.79], [0, 7.45, 17.67], plaster);
  for (const x of [-0.35, 4.95]) {
    t.block([0.12, 3.52, 0.12], [x, 5.04, 14.6], blue);
    t.block([0.24, 0.13, 0.24], [x, 3.36, 14.6], blue);
  }
  t.block([5.55, 0.2, 0.17], [2.3, 6.83, 14.6], blue);
  for (let x = -0.45; x < 5.2; x += 0.51)
    t.block([0.085, 0.13, 3.2], [x, 6.91, 16.08], blue);
  const signMap = k.texture(
    (c, s) => {
      c.fillStyle = "#e0dcca";
      c.fillRect(0, 0, s, s);
      c.strokeStyle = "#32749b";
      c.lineWidth = 9;
      c.strokeRect(18, 50, s - 36, s - 100);
      c.fillStyle = "#245d84";
      c.font = "bold 94px Georgia";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("CAFÉ", s / 2, s / 2);
    },
    [1, 1],
    512,
  );
  const sign = k.material(0xffffff, 0.49);
  sign.map = signMap;
  k.mesh(
    new THREE.PlaneGeometry(1.25, 0.45),
    sign,
    [3.0, 6.62, 17.38],
    [0, PI, 0],
  );
  k.poster([4.5, 6.1, 17.365], {
    width: 0.45,
    height: 0.675,
    angle: PI,
    image: "/public/print-library/poster-tea.jpg",
  });
  for (const [x, z, width, height] of [
    [-16.8, 7.5, 9, 6.7],
    [-23.5, -1, 7, 5.2],
    [17.8, 12.0, 9, 5.5],
    [-17.1, 20.4, 9, 7.0],
    [17.8, 23.1, 9, 6.7],
  ]) {
    const house = k.sub([x, 1.9, z]);
    k.box([width, 7.3, 7], [0, -3.6, 0], plaster, house, 0.035);
    k.box([width, height, 7], [0, height / 2, 0], plaster, house, 0.06);
    t.block([width + 0.35, 0.18, 7.35], [0, height + 0.06, 0], plaster, house);
    for (let i = 0; i < 3; i++) {
      const xx = -width * 0.32 + i * width * 0.32;
      t.block([1.05, 1.65, 0.11], [xx, height - 1.8, -3.56], blue, house);
      for (let n = 0; n < 12; n++)
        t.block(
          [0.95, 0.055, 0.06],
          [xx, height - 2.48 + n * 0.117, -3.64],
          blue,
          house,
        );
      t.block([1.3, 0.1, 0.28], [xx, height - 2.66, -3.63], plaster, house);
    }
  }
  const potSoil = t.painted(0x685845, k.m.ground, 1);
  for (const [x, y, z, scale] of [
    [-11.0, 3.3, 11.8, 1.35],
    [-11.5, 1.9, 1.1, 0.95],
    [10.8, 3.3, 12.2, 1.2],
    [-17.5, 1.9, -0.9, 1.7],
    [-0.9, 3.3, 16.9, 1.0],
  ]) {
    k.lathe(
      [
        [0.29, 0],
        [0.44, 0.1],
        [0.49, 0.68],
        [0.53, 0.75],
        [0.5, 0.8],
        [0.43, 0.77],
      ],
      [x, y, z],
      k.m.pot,
      k.group,
      24,
    );
    t.cylinder(0.42, 0.025, [x, y + 0.72, z], potSoil, k.group, 0.42, 32);
    bougainvillea(k, t, [x, y + 0.46, z], scale, materials);
  }
  k.model(CLAY_PLANTER, [1.15, 3.3, 9.15], {
    height: 0.64,
    angle: -0.68,
    packedOcclusion: true,
  });
  t.cylinder(0.306, 0.02, [1.15, 3.894, 9.15], potSoil, k.group, 0.306, 40);
  bougainvillea(k, t, [1.15, 3.896, 9.15], 0.52, materials);
  return k.finish(
    definition,
    {
      arrival: outdoorView(
        "A café above the coast",
        [3.8, 5.02, 10.8],
        [-10.4, -2.1, -34],
        59,
      ),
      tea: outdoorView(
        "Mint tea in the sea breeze",
        [-3.35, 3.17, 2.85],
        [-2.1, 2.74, 1.65],
        55,
      ),
      steps: outdoorView(
        "Blue-edged terrace steps",
        [7.2, 4.95, 8.35],
        [5.6, 2.95, 5.0],
        60,
      ),
      outlook: outdoorView(
        "Cobalt railing & bay",
        [-3.7, 2.26, -6.0],
        [5.6, -7.7, -56],
        62,
      ),
    },
    [
      [-3.7, 1.43, -7.2],
      [3.0, 4.095, 9.1],
      [2.25, 4.0, 7.77],
      [5.6, 3.03, 5.02],
    ],
    { exposure: 0.87, environmentIntensity: 0.12 },
  );
}
