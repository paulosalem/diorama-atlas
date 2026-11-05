import * as THREE from "three";
import { createAlfamaMasonry } from "./alfama-plaster.js";

const PI = Math.PI;

export function alfamaMaterials(k) {
  const limewash = k.texture(
    (c, size) => {
      c.fillStyle = "#ecebe5";
      c.fillRect(0, 0, size, size);
      for (let i = 0; i < 32000; i++) {
        c.fillStyle = i % 3 ? "#ffffff16" : "#776e5c15";
        c.fillRect(
          k.random() * size,
          k.random() * size,
          k.range(0.5, 2.8),
          k.range(0.5, 2.8),
        );
      }
    },
    [1, 1],
    512,
  );
  const painted = (color, source = k.m.plaster) => {
    const material = k.ownMaterial(source.clone());
    material.color.set(color);
    material.userData = { ...source.userData, patinaProfile: "none" };
    if (source === k.m.plaster) {
      material.map = limewash;
      material.normalMap = null;
      material.roughnessMap = null;
      material.bumpMap = limewash;
      material.bumpScale = 0.004;
      material.userData.metresPerRepeat = 0.7;
    }
    return material;
  };
  const stone = painted(0xd3cbb9, k.m.stone);
  stone.normalScale.set(0.07, 0.07);
  stone.userData.metresPerRepeat = 0.5;
  stone.userData.diffuseDetailMode = "tinted-grain";
  stone.userData.diffuseDetailStrength = 0.22;
  const timber = painted(0x355b50, k.m.cedar);
  timber.roughness = 0.84;
  timber.userData.metresPerRepeat = 0.45;
  timber.userData.diffuseDetailStrength = 0.14;
  timber.normalScale.set(0.06, 0.06);
  const pot = painted(0xb87552, k.m.pot);
  pot.side = THREE.DoubleSide;
  const tile = painted(0xa9613f, k.m.pot);
  tile.name = "Alfama fired roof clay";
  tile.side = THREE.DoubleSide;
  tile.userData.diffuseDetailMode = "tinted-grain";
  tile.userData.diffuseDetailStrength = 0.45;
  tile.normalScale.set(0.23, 0.23);
  const glaze = k.material(0xf0ead8, 0.31);
  glaze.name = "Alfama varied azulejo";
  glaze.userData.patinaProfile = "tile";
  glaze.vertexColors = true;
  const chimney = painted(0xece7d7);
  chimney.name = "Alfama exposed chimney plaster";
  chimney.userData.patinaProfile = "plaster";
  glaze.map = k.texture(
    (c, size) => {
      c.fillStyle = "#eee9d9";
      c.fillRect(0, 0, size, size);
      c.strokeStyle = "#345d83";
      c.lineWidth = size * 0.024;
      for (let turn = 0; turn < 4; turn++) {
        c.save();
        c.translate(size / 2, size / 2);
        c.rotate((turn * PI) / 2);
        c.beginPath();
        c.moveTo(0, 0);
        c.bezierCurveTo(
          -size * 0.34,
          -size * 0.25,
          -size * 0.2,
          -size * 0.48,
          0,
          -size * 0.42,
        );
        c.bezierCurveTo(
          size * 0.2,
          -size * 0.48,
          size * 0.34,
          -size * 0.25,
          0,
          0,
        );
        c.stroke();
        c.restore();
      }
      c.strokeRect(size * 0.045, size * 0.045, size * 0.91, size * 0.91);
      c.fillStyle = "#ba9854";
      c.beginPath();
      c.arc(size / 2, size / 2, size * 0.055, 0, PI * 2);
      c.fill();
    },
    [1, 1],
    256,
  );
  return {
    wall: createAlfamaMasonry(k),
    stone,
    timber,
    pot,
    tile,
    glaze,
    chimney,
    white: painted(0xece7d7),
    ochre: painted(0xd9ba78),
    rose: painted(0xd3a193),
    blue: painted(0x9caeb2),
    mortar: k.material(0x8c8677, 1),
    iron: k.material(0x293d39, 0.75, 0.25),
    linen: k.textile(["#e2decf", "#e2decf", "#d4d0c3"]),
  };
}

export function tileGeometry({ channel = false } = {}) {
  const profile = new THREE.Shape();
  profile.absarc(0, 0, 0.105, 0, PI, false);
  profile.lineTo(-0.09, 0);
  profile.absarc(0, 0, 0.09, PI, 0, true);
  profile.closePath();
  const geometry = new THREE.ExtrudeGeometry(profile, {
    depth: 0.39,
    steps: 1,
    curveSegments: 12,
    bevelEnabled: false,
  });
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i),
      taper = 0.8 + (0.2 * z) / 0.39;
    p.setX(i, p.getX(i) * taper);
    p.setY(i, p.getY(i) * taper);
  }
  geometry.computeVertexNormals();
  if (channel) {
    geometry.rotateZ(PI);
    geometry.scale(1, 0.3, 1);
    geometry.translate(0, 0.022, 0);
  }
  return geometry;
}

export function buildAlfamaRoof(
  k,
  m,
  parent,
  width,
  depth,
  height,
  partyWalls = {},
  coveredWalls = {},
) {
  const pitch = 0.37;
  const half = depth / 2 + 0.24;
  const rise = half * Math.tan(pitch);
  const left =
    -width / 2 -
    (Object.hasOwn(partyWalls, "left") || coveredWalls.left >= height
      ? 0
      : 0.21);
  const right =
    width / 2 +
    (Object.hasOwn(partyWalls, "right") || coveredWalls.right >= height
      ? 0
      : 0.21);
  for (const sign of [-1, 1]) {
    const roof = k.sub([0, height + rise, -depth / 2], 0, parent);
    roof.rotation.x = sign * pitch;
    k.box(
      [right - left, 0.08, half / Math.cos(pitch)],
      [(right + left) / 2, -0.035, (sign * half) / Math.cos(pitch) / 2],
      m.tile,
      roof,
      0,
    );
    const geometry = tileGeometry();
    const entries = [],
      channels = [];
    const columns = Math.ceil((right - left) / 0.205);
    const length = half / Math.cos(pitch);
    const rows = Math.max(1, Math.ceil((length - 0.39) / 0.31) + 1);
    for (let column = 0; column < columns; column++)
      for (let row = 0; row < rows; row++) {
        const z = row * 0.31;
        const entry = {
          position: [
            left + ((column + 0.5) * (right - left)) / columns,
            0.015,
            sign * z,
          ],
          rotation: [0, sign < 0 ? PI : 0, 0],
          scale: [
            (right - left) / columns / 0.21,
            1,
            Math.min(0.39, length - z) / 0.39,
          ],
          color: new THREE.Color().setHSL(
            0.055 + k.range(-0.02, 0.02),
            0.28,
            k.range(0.5, 0.84),
          ),
        };
        entries.push(entry);
        if (column < columns - 1)
          channels.push({
            ...entry,
            position: [
              entry.position[0] + (right - left) / columns / 2,
              entry.position[1],
              entry.position[2],
            ],
          });
      }
    const tiles = k.instances(geometry, m.tile, entries);
    roof.add(tiles);
    roof.add(k.instances(tileGeometry({ channel: true }), m.tile, channels));
  }
  for (let x = left; x < right; x += 0.31) {
    const tile = tileGeometry();
    tile.scale(1, 1, Math.min(0.39, right - x) / 0.39);
    k.mesh(
      tile,
      m.tile,
      [x, height + rise + 0.1, -depth / 2],
      [0, PI / 2, 0],
      parent,
    );
  }
  for (const side of [-1, 1]) {
    if (Object.hasOwn(partyWalls, side < 0 ? "left" : "right")) continue;
    const shape = new THREE.Shape();
    shape.moveTo(-depth / 2, 0);
    shape.lineTo(0, rise);
    shape.lineTo(depth / 2, 0);
    shape.closePath();
    k.mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: false }),
      m.white,
      [(side * width) / 2 - 0.16, height, -depth / 2],
      [0, PI / 2, 0],
      parent,
    );
  }
  const chimney = k.sub(
    [width * 0.25, height + rise * 0.65, -depth * 0.66],
    0,
    parent,
  );
  for (const x of [-0.24, 0.24])
    k.box([0.13, 1.05, 0.56], [x, 0.5, 0], m.chimney, chimney);
  for (const z of [-0.22, 0.22])
    k.box([0.37, 0.68, 0.12], [0, 0.32, z], m.chimney, chimney);
  k.box([0.74, 0.1, 0.72], [0, 1.08, 0], m.tile, chimney);
}

export function alfamaRail(k, m, start, end, height = 0.95, parent = k.group) {
  const length = Math.hypot(...start.map((v, i) => end[i] - v));
  const top = (p) => [p[0], p[1] + height, p[2]];
  k.rod(top(start), top(end), 0.024, m.iron, parent);
  k.rod(
    [start[0], start[1] + 0.15, start[2]],
    [end[0], end[1] + 0.15, end[2]],
    0.014,
    m.iron,
    parent,
  );
  const count = Math.ceil(length / 0.16);
  for (let i = 0; i <= count; i++) {
    const p = start.map((v, axis) => v + ((end[axis] - v) * i) / count);
    k.rod(p, top(p), i % 6 === 0 ? 0.023 : 0.009, m.iron, parent);
  }
}

function surround(k, m, wall, x, bottom, width, height, door) {
  for (const side of [-1, 1])
    k.box(
      [0.14, height + 0.22, 0.48],
      [x + side * (width / 2 + 0.07), bottom + height / 2, 0.02],
      m.stone,
      wall,
    );
  k.box(
    [width + 0.42, 0.16, 0.49],
    [x, bottom + height + 0.05, 0.025],
    m.stone,
    wall,
  );
  k.box(
    [width + 0.32, door ? 0.055 : 0.12, door ? 0.6 : 0.56],
    [x, bottom, 0.065],
    m.stone,
    wall,
  );
}

function window(k, m, wall, x, bottom, balcony, seed) {
  const height = balcony ? 1.85 : 1.35;
  const width = 0.9;
  surround(k, m, wall, x, bottom, width, height, false);
  const frame = k.sub([x, bottom, -0.11], 0, wall);
  const joinery = seed % 3 === 0 ? m.white : m.timber;
  for (const xx of [-0.42, 0, 0.42])
    k.box([0.042, height, 0.05], [xx, height / 2, 0], joinery, frame, 0.002);
  for (const yy of [0.025, height * 0.46, height - 0.025])
    k.box([width, 0.042, 0.05], [0, yy, 0], joinery, frame, 0.002);
  k.box(
    [width - 0.08, height - 0.08, 0.012],
    [0, height / 2, -0.014],
    k.m.glass,
    frame,
    0,
  );
  for (const sign of [-1, 1]) {
    if (seed % 3 !== 0) {
      const shutter = k.sub(
        [x + sign * 0.49, bottom + height / 2, 0.23],
        sign * (0.25 + (seed % 3) * 0.23),
        wall,
      );
      for (const edge of [0.025, 0.405])
        k.box(
          [0.044, height, 0.04],
          [sign * edge, 0, 0],
          m.timber,
          shutter,
          0.003,
        );
      for (const y of [-height / 2 + 0.025, height / 2 - 0.025])
        k.box(
          [0.45, 0.05, 0.04],
          [sign * 0.22, y, 0],
          m.timber,
          shutter,
          0.003,
        );
      for (let y = -height / 2 + 0.095; y < height / 2 - 0.05; y += 0.095)
        k.box(
          [0.37, 0.075, 0.018],
          [sign * 0.22, y, 0],
          m.timber,
          shutter,
          0.002,
          [0.34, 0, 0],
        );
    }
    const curtainWidth = seed % 2 ? 0.25 : 0.39;
    const curtainGeometry = new THREE.PlaneGeometry(
      curtainWidth,
      height - 0.06 - (seed % 3) * 0.1,
      10,
      12,
    );
    const p = curtainGeometry.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setZ(i, Math.cos(p.getX(i) * 72 + seed) * 0.024);
    curtainGeometry.computeVertexNormals();
    k.mesh(
      curtainGeometry,
      m.linen,
      [x + sign * (0.44 - curtainWidth / 2), bottom + height / 2, -0.24],
      [0, 0, 0],
      wall,
    );
  }
  if (balcony) {
    k.box([1.54, 0.13, 0.7], [x, bottom - 0.04, 0.43], m.stone, wall);
    for (const side of [-1, 1]) {
      k.rod(
        [x + side * 0.55, bottom - 0.48, 0.17],
        [x + side * 0.55, bottom - 0.1, 0.69],
        0.032,
        m.iron,
        wall,
      );
      alfamaRail(
        k,
        m,
        [x + side * 0.72, bottom, 0.19],
        [x + side * 0.72, bottom, 0.75],
        0.96,
        wall,
      );
    }
    alfamaRail(
      k,
      m,
      [x - 0.72, bottom, 0.75],
      [x + 0.72, bottom, 0.75],
      0.96,
      wall,
    );
  }
}

function door(k, m, wall, x, width, open) {
  surround(k, m, wall, x, 0, width, 2.15, true);
  const leaf = k.sub([x - width / 2 + 0.025, 0, -0.12], open ? -1.32 : 0, wall);
  k.box(
    [width - 0.07, 2.1, 0.065],
    [(width - 0.07) / 2, 1.06, 0],
    m.timber,
    leaf,
    0.006,
  );
  for (const yy of [0.57, 1.54]) {
    k.box(
      [width - 0.24, 0.68, 0.025],
      [width / 2 - 0.03, yy, 0.047],
      m.timber,
      leaf,
    );
    k.cylinder(0.023, 0.13, [0.025, yy, 0.02], m.iron, leaf);
  }
  k.box([0.14, 0.035, 0.025], [width - 0.19, 1.04, 0.075], m.iron, leaf);
  k.box([0.2, 0.034, 0.014], [width / 2, 0.38, 0.048], m.iron, leaf, 0.003);
}

export function tilePanel(k, m, parent, x, width, bottom, height, z = 0.235) {
  k.box(
    [width, height, 0.025],
    [x, bottom + height / 2, z - 0.015],
    m.mortar,
    parent,
    0,
  );
  const columns = Math.floor(width / 0.155);
  const rows = Math.floor(height / 0.155);
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < columns; col++) {
      const tile = k.box(
        [width / columns - 0.004, height / rows - 0.004, 0.021],
        [
          x - width / 2 + ((col + 0.5) * width) / columns,
          bottom + ((row + 0.5) * height) / rows,
          z,
        ],
        m.glaze,
        parent,
        0.002,
      );
      tile.rotation.z = k.range(-0.006, 0.006);
      const tone =
        0.85 + 0.15 * Math.abs(Math.sin(col * 17.3 + row * 31.7 + x));
      const colors = new Float32Array(
        tile.geometry.attributes.position.count * 3,
      );
      for (let i = 0; i < colors.length; i += 3)
        colors.set([tone, tone * 0.99, tone * 0.97], i);
      tile.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }
}

export function buildAlfamaHouse(
  k,
  m,
  {
    position,
    width = 4,
    depth = 4.2,
    storeys = 2,
    angle = 0,
    color = m.white,
    open = false,
    passage = false,
    tiled = false,
    seed = 0,
    partyWalls = {},
    coveredWalls = {},
  },
) {
  const g = k.sub(position, angle);
  const height = storeys * 2.65;
  const fronts = [];
  for (const back of [false, true]) {
    const wall = k.sub([0, 0, back ? -depth : 0], back ? PI : 0, g);
    const holes = [];
    if (!back || passage)
      holes.push({
        x: 0,
        width: passage ? 1.55 : 1.04,
        bottom: 0,
        top: passage ? 2.45 : 2.15,
      });
    for (let floor = 1; floor < storeys; floor++)
      for (const x of width < 2.6 ? [0] : [-width * 0.25, width * 0.25]) {
        const bottom = floor * 2.65 + 0.32;
        if (bottom < (coveredWalls[back ? "back" : "front"] ?? 0)) continue;
        const balcony = !back && floor === 1 && x < 0 && !passage;
        holes.push({
          x,
          width: 0.9,
          bottom,
          top: bottom + (balcony ? 1.85 : 1.35),
        });
        window(k, m, wall, x, bottom, balcony, seed + floor);
      }
    m.wall(wall, width, height, 0.4, holes, color, seed + (back ? 21 : 0));
    if (passage) surround(k, m, wall, 0, 0, 1.55, 2.45, true);
    else if (!back) door(k, m, wall, 0, 1.04, open);
    if (!back && tiled)
      for (const side of [-1, 1])
        tilePanel(
          k,
          m,
          wall,
          side * (width / 4 + 0.3),
          width / 2 - 0.78,
          0.12,
          1.12,
        );
    fronts.push(wall);
    for (const side of [-1, 1])
      k.box(
        [width / 2 - 0.65, 0.2, 0.45],
        [side * (width / 4 + 0.325), 0.1, 0.025],
        m.stone,
        wall,
      );
    const left = Object.hasOwn(partyWalls, "left") ? 0 : 0.09;
    const right = Object.hasOwn(partyWalls, "right") ? 0 : 0.09;
    k.box(
      [width + left + right, 0.15, 0.54],
      [(right - left) / 2, height - 0.025, 0],
      color,
      wall,
    );
  }
  for (const side of [-1, 1]) {
    const key = side < 0 ? "left" : "right";
    if (Object.hasOwn(partyWalls, key)) {
      if (partyWalls[key]) {
        const shared = k.box(
          [0.4, height, depth],
          [(side * width) / 2, height / 2, -depth / 2],
          color,
          g,
          0,
        );
        shared.name = "Single shared party wall";
        shared.userData.partyWall = { side: key, thickness: 0.4 };
      }
      continue;
    }
    const wall = k.sub([(side * width) / 2, 0, -depth / 2], (side * PI) / 2, g);
    const holes = [];
    for (let floor = 1; floor < storeys; floor++) {
      const bottom = floor * 2.65 + 0.47;
      if (bottom < (coveredWalls[key] ?? 0)) continue;
      holes.push({ x: 0, width: 0.9, bottom, top: bottom + 1.35 });
      window(k, m, wall, 0, bottom, false, seed + floor + 1);
    }
    m.wall(wall, depth, height, 0.4, holes, color, seed + side + 12);
  }
  for (let floor = 0; floor <= storeys; floor++)
    k.box(
      [width - 0.15, 0.13, depth - 0.1],
      [0, floor * 2.65 - 0.08, -depth / 2],
      floor ? m.white : m.stone,
      g,
      0,
    );
  if (passage)
    for (const side of [-1, 1])
      k.box(
        [0.17, 2.48, depth - 0.4],
        [side * 0.86, 1.24, -depth / 2],
        color,
        g,
        0,
      );
  buildAlfamaRoof(k, m, g, width, depth, height, partyWalls, coveredWalls);
  const pipeX = width / 2 - 0.25;
  k.rod([pipeX, height - 0.3, 0.3], [pipeX, 0.3, 0.3], 0.042, m.iron, g);
  k.tube(
    [
      [pipeX, height + 0.05, 0.45],
      [pipeX, height - 0.12, 0.42],
      [pipeX, height - 0.3, 0.3],
    ],
    0.042,
    m.iron,
    g,
  );
  k.tube(
    [
      [pipeX, 0.3, 0.3],
      [pipeX, 0.2, 0.34],
      [pipeX, 0.12, 0.48],
    ],
    0.042,
    m.iron,
    g,
  );
  for (let y = 0.45; y < height; y += 1.4) {
    k.ring(0.047, 0.008, [pipeX, y, 0.3], m.iron, g);
    k.box([0.14, 0.025, 0.08], [pipeX, y, 0.24], m.iron, g);
  }
  k.tube(
    [
      [-width / 2, 2.4, 0.24],
      [0, 2.3, 0.25],
      [width / 2, 2.4, 0.24],
    ],
    0.012,
    m.iron,
    g,
  );
  k.wearPatch([width * 0.3, 0.36, 0.205], {
    parent: g,
    width: 0.7,
    height: 0.55,
    strength: 0.25,
  });
  return { group: g, front: fronts[0], height };
}

export { window as alfamaWindow, door as alfamaDoor };
