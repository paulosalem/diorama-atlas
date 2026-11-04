import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { createOutdoorKit, outdoorView } from "./outdoor-kit.js";
import {
  dressedStoneGeometry,
  shapedTimber,
  shavingGeometry,
  staticDetailLevels,
} from "../shared/natural-forms.js";

const PI = Math.PI;

function seedOf(definition, salt) {
  let seed = salt;
  for (const letter of definition.id)
    seed = (Math.imul(seed, 31) + letter.charCodeAt(0)) >>> 0;
  return seed;
}

function weathered(k, source, colors, roughness = 0.91) {
  return colors.map((color) => {
    const material = k.material(color, roughness);
    for (const slot of ["map", "normalMap", "roughnessMap", "bumpMap"])
      material[slot] = source[slot];
    material.normalScale.copy(source.normalScale);
    material.bumpScale = source.bumpScale;
    material.userData.metresPerRepeat = source.userData.metresPerRepeat;
    return material;
  });
}

function choose(k, items) {
  return items[Math.floor(k.random() * items.length)];
}

function pavingStoneGeometry(
  outline = [
    [-0.42, -0.5],
    [0.42, -0.5],
    [0.5, -0.42],
    [0.5, 0.42],
    [0.42, 0.5],
    [-0.42, 0.5],
    [-0.5, 0.42],
    [-0.5, -0.42],
  ],
) {
  const count = outline.length;
  const positions = [],
    uvs = [],
    indices = [];
  for (const [scale, height] of [
    [1, -0.09],
    [1, -0.016],
    [0.92, 0.004],
  ]) {
    for (const [x, z] of outline) {
      positions.push(x * scale, height, z * scale);
      uvs.push(x * 0.28 + 0.5, z * 0.28 + 0.5);
    }
  }
  for (let ring = 0; ring < 2; ring++)
    for (let i = 0; i < count; i++) {
      const a = ring * count + i,
        b = ring * count + ((i + 1) % count);
      indices.push(a, a + count, b, b, a + count, b + count);
    }
  for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(
    outline.map((p) => new THREE.Vector2(...p)),
    [],
  )) {
    indices.push(count * 2 + a, count * 2 + c, count * 2 + b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function streetPaving(k) {
  const geometry = pavingStoneGeometry();
  const cracked = [
    pavingStoneGeometry([
      [-0.42, -0.5],
      [-0.03, -0.5],
      [0.02, -0.15],
      [-0.045, 0.03],
      [0.02, 0.27],
      [-0.03, 0.5],
      [-0.42, 0.5],
      [-0.5, 0.42],
      [-0.5, -0.42],
    ]),
    pavingStoneGeometry([
      [0.015, -0.5],
      [0.42, -0.5],
      [0.5, -0.42],
      [0.5, 0.42],
      [0.42, 0.5],
      [0.015, 0.5],
      [0.065, 0.26],
      [0, 0.04],
      [0.065, -0.15],
    ]),
  ];
  const palettes = new Map();
  return ({
    width,
    depth,
    position = [0, 0, 0],
    stoneSize = 0.45,
    material = k.m.cobble,
    wear = [],
  }) => {
    const parent = k.sub(position);
    k.box([width, 0.13, depth], [0, -0.09, 0], k.m.stone, parent, 0);
    if (!palettes.has(material)) {
      palettes.set(
        material,
        [-0.045, -0.022, 0, 0.02, 0.039].map((offset) => {
          const tint = material.color.clone().offsetHSL(0, 0, offset);
          return weathered(k, material, [tint])[0];
        }),
      );
    }
    const palette = palettes.get(material);
    const rows = Math.ceil(depth / stoneSize),
      columns = Math.ceil(width / stoneSize);
    const dx = width / columns,
      dz = depth / rows;
    for (let row = 0; row < rows; row++)
      for (let col = 0; col <= columns; col++) {
        const start = -width / 2 + (col - (row % 2) * 0.5) * dx;
        const left = Math.max(-width / 2, start),
          right = Math.min(width / 2, start + dx);
        if (right - left < 0.025) continue;
        const x = (left + right) / 2,
          z = -depth / 2 + (row + 0.5) * dz;
        const stoneMaterial = choose(k, palette),
          y = k.range(-0.005, 0.004),
          angle = k.range(-0.015, 0.015);
        const worn = wear.some(
          ([wx, wz, radius]) => Math.hypot(x - wx, z - wz) < radius,
        );
        const treatment = (row * 37 + col * 19) % 7;
        if (worn && treatment < 2) {
          for (const [index, piece] of cracked.entries()) {
            const stone = k.mesh(
              piece,
              stoneMaterial,
              [x, y - index * 0.004, z],
              [0, angle, index * 0.008],
              parent,
            );
            stone.scale.set(right - left - 0.012, 1, dz - 0.012);
          }
        } else {
          const stone = k.mesh(
            geometry,
            worn && treatment === 3 ? palette[3] : stoneMaterial,
            [x, y - (worn && treatment === 4 ? 0.009 : 0), z],
            [0, angle, 0],
            parent,
          );
          stone.scale.set(right - left - 0.012, 1, dz - 0.012);
        }
      }
    return parent;
  };
}

function flatPolygon(points, depth = 0.04, bevel = 0, bevelSegments = 1) {
  const shape = new THREE.Shape(
    points.map((point) => new THREE.Vector2(...point)),
  );
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
  });
}

function roofTiles(
  k,
  parent,
  { width, depth, height, rise, palette, axis = 0, tileScale = 1 },
) {
  const roof = k.sub([0, height, 0], axis, parent);
  const angle = Math.atan2(rise, depth / 2);
  const slope = Math.hypot(depth / 2, rise);
  const tileGeometry = new THREE.CylinderGeometry(
    0.093 * tileScale,
    0.084 * tileScale,
    0.38 * tileScale,
    6,
    1,
    true,
    PI / 2,
    PI,
  );
  tileGeometry.rotateX(PI / 2);
  for (const side of [-1, 1]) {
    const plane = k.sub([0, rise / 2, (side * depth) / 4], 0, roof);
    plane.rotation.x = side * angle;
    k.box([width, 0.1, slope + 0.12], [0, -0.065, 0], k.m.cedar, plane, 0);
    for (
      let x = -width / 2 + 0.095 * tileScale;
      x < width / 2;
      x += 0.178 * tileScale
    ) {
      for (let z = -slope / 2; z < slope / 2 + 0.12; z += 0.3 * tileScale) {
        k.mesh(
          tileGeometry,
          choose(k, palette),
          [x, 0.016 + k.range(-0.006, 0.006), z],
          [0, 0, 0],
          plane,
        );
      }
    }
    k.box(
      [width + 0.08, 0.15, 0.14],
      [0, -0.07, (side * slope) / 2],
      k.m.cedar,
      plane,
      0,
    );
  }
  for (let x = -width / 2; x < width / 2; x += 0.31 * tileScale) {
    k.mesh(
      tileGeometry,
      choose(k, palette),
      [x, rise + 0.07, 0],
      [0, PI / 2, 0],
      roof,
    );
  }
}

function ropeCoil(
  k,
  position,
  parent = k.group,
  radius = 0.28,
  material = k.m.linen,
) {
  const points = [];
  for (let i = 0; i <= 144; i++) {
    const angle = (i / 144) * PI * 10;
    const r = radius * (0.35 + (0.65 * i) / 144);
    points.push([
      position[0] + Math.cos(angle) * r,
      position[1] + 0.017,
      position[2] + Math.sin(angle) * r,
    ]);
  }
  k.tube(points, 0.013, material, parent);
}

function wovenBasket(
  k,
  position,
  radius = 0.38,
  height = 0.38,
  parent = k.group,
) {
  const basket = k.sub(position, 0, parent);
  const straw = k.m.paper;
  k.lathe(
    [
      [radius * 0.68, 0],
      [radius * 0.72, 0.04],
      [radius, height],
      [radius - 0.025, height],
      [radius * 0.69, 0.045],
      [0, 0.045],
    ],
    [0, 0, 0],
    straw,
    basket,
    24,
  );
  for (let y = 0.05; y < height; y += 0.028) {
    k.mesh(
      new THREE.TorusGeometry(
        radius * (0.7 + (0.3 * y) / height),
        0.009,
        6,
        32,
      ),
      k.m.woodFloor,
      [0, y, 0],
      [PI / 2, 0, 0],
      basket,
    );
  }
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * PI * 2;
    k.rod(
      [Math.cos(a) * radius * 0.71, 0.01, Math.sin(a) * radius * 0.71],
      [Math.cos(a) * radius, height, Math.sin(a) * radius],
      0.008,
      straw,
      basket,
    );
  }
  k.ring(radius, 0.023, [0, height, 0], straw, basket);
  return basket;
}

function foldedTextile(
  k,
  position,
  width,
  depth,
  parent = k.group,
  edging = k.m.red,
) {
  const cloth = k.sub(position, 0, parent);
  k.box([width, 0.028, depth], [0, 0.014, 0], k.m.linen, cloth, 0.006);
  k.box(
    [width * 0.94, 0.019, depth],
    [0.009, 0.035, 0],
    k.m.linen,
    cloth,
    0.006,
  );
  for (const x of [-width * 0.37, -width * 0.28, width * 0.37]) {
    k.box([0.01, 0.003, depth * 0.94], [x, 0.046, 0], edging, cloth, 0);
  }
  for (let i = 0; i < 10; i++) {
    const x = -width * 0.44 + i * width * 0.098;
    k.rod(
      [x, 0.024, depth / 2],
      [x + k.range(-0.004, 0.004), 0.018, depth / 2 + 0.029],
      0.002,
      k.m.linen,
      cloth,
    );
  }
  return cloth;
}

function dryingMats(k, position, width, depth, parent) {
  const mats = k.sub(position, -0.035, parent);
  const count = Math.floor(width / 0.009);
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < count; i++) {
      const x =
        -width / 2 + ((i + 0.5) * width) / count + k.range(-0.0013, 0.0013);
      const y = 0.004 + layer * 0.0075 + k.range(-0.0007, 0.0007);
      k.rod(
        [x, y, -depth / 2 + k.range(-0.009, 0.008)],
        [x + k.range(-0.0015, 0.0015), y, depth / 2 + k.range(-0.009, 0.01)],
        k.range(0.0028, 0.0036),
        k.m.paper,
        mats,
        0.0026,
      );
    }
  }
  for (const z of [-depth * 0.28, depth * 0.28]) {
    k.tube(
      [
        [-width / 2 - 0.003, 0.027, z],
        [0, 0.028, z],
        [width / 2 + 0.004, 0.026, z],
        [width / 2 + 0.006, 0.002, z],
        [-width / 2 - 0.005, 0.002, z],
        [-width / 2 - 0.003, 0.027, z],
      ],
      0.0018,
      k.m.linen,
      mats,
    );
    for (const side of [-1, 1])
      k.rod(
        [width / 2 + 0.004, 0.025, z],
        [width / 2 + 0.03, 0.016, z + side * 0.014],
        0.0015,
        k.m.linen,
        mats,
      );
  }
  return mats;
}

function streetPlants(k) {
  const green = k.material(0x4e6540, 0.95);
  green.side = THREE.DoubleSide;
  const petalGeometry = new THREE.BufferGeometry();
  petalGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0, 0, 0, -0.065, 0.14, 0.012, 0, 0.26, 0.032, 0.065, 0.14, 0.012, 0,
        0.14, 0.033,
      ],
      3,
    ),
  );
  petalGeometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(
      [0.5, 0, 0, 0.5, 0.5, 1, 1, 0.5, 0.5, 0.5],
      2,
    ),
  );
  petalGeometry.setIndex([0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]);
  petalGeometry.computeVertexNormals();
  const centerGeometry = new THREE.IcosahedronGeometry(1, 0);
  const terracotta = weathered(k, k.m.terracotta, [0xb27a57], 0.93)[0];
  const up = new THREE.Vector3(0, 1, 0);
  function flower(position, radius, material, parent = k.group) {
    const bloom = k.sub(position, 0, parent);
    bloom.rotation.set(
      -PI / 2 + k.range(-0.35, 0.35),
      k.range(-0.3, 0.3),
      k.range(0, PI),
    );
    for (let i = 0; i < 6; i++) {
      const petal = k.mesh(
        petalGeometry,
        material,
        [0, 0, 0],
        [0, 0, (i / 6) * PI * 2],
        bloom,
      );
      petal.scale.setScalar(radius / 0.26);
    }
    k.mesh(
      centerGeometry,
      k.m.paper,
      [0, 0, 0.008],
      [0, 0, 0],
      bloom,
    ).scale.setScalar(radius * 0.18);
    return bloom;
  }
  function pot(
    position,
    scale,
    flowerMaterial,
    parent = k.group,
    { scanned = false, leafSway = false } = {},
  ) {
    const plant = k.sub(position, 0, parent);
    plant.scale.setScalar(scale);
    if (scanned) {
      k.model(
        "/public/outdoors/detail-assets/planter-pot-clay/planter_pot_clay_2k.gltf",
        [0, 0, 0],
        {
          height: 0.4,
          parent: plant,
          packedOcclusion: true,
        },
      );
    } else {
      k.lathe(
        [
          [0, 0],
          [0.15, 0],
          [0.18, 0.04],
          [0.215, 0.34],
          [0.24, 0.36],
          [0.24, 0.4],
          [0.21, 0.4],
          [0.196, 0.355],
          [0.14, 0.035],
          [0, 0.035],
        ],
        [0, 0, 0],
        terracotta,
        plant,
        20,
      );
    }
    k.cylinder(0.196, 0.012, [0, 0.354, 0], k.m.bark, plant, 0.196, 16);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * PI * 2,
        radius = k.range(0.12, 0.25),
        height = k.range(0.63, 0.95);
      const tip = [Math.cos(angle) * radius, height, Math.sin(angle) * radius];
      k.rod([0, 0.35, 0], tip, 0.007, green, plant);
      for (const t of [0.43, 0.73]) {
        const leaf = k.mesh(
          petalGeometry,
          green,
          [tip[0] * t, 0.35 + (height - 0.35) * t, tip[2] * t],
          [0, 0, 0],
          plant,
        );
        leaf.quaternion.setFromUnitVectors(
          up,
          new THREE.Vector3(Math.cos(angle), 0.35, Math.sin(angle)).normalize(),
        );
        leaf.scale.setScalar(k.range(0.65, 1.1));
        if (leafSway && i % 4 === 0 && t === 0.73) {
          const rest = leaf.quaternion.clone();
          k.animated.add(leaf);
          k.animations.push((_, elapsed) => {
            leaf.quaternion.copy(rest);
            leaf.rotateZ(
              0.045 * (Math.sin(elapsed * 0.9 + angle) - Math.sin(angle)),
            );
          });
        }
      }
      if (i % 2 === 0) flower(tip, 0.063, flowerMaterial, plant);
    }
    return plant;
  }
  return { flower, pot };
}

function brickFacade(k, parent, width, height, palette, openings = []) {
  k.box([width, height, 0.4], [0, height / 2, -0.24], k.m.brick, parent, 0);
  const brick = new THREE.BoxGeometry(0.3, 0.115, 0.085);
  for (let row = 0; row < height / 0.133; row++) {
    const y = 0.075 + row * 0.133;
    for (
      let x = -width / 2 + 0.15 + (row % 2) * 0.155;
      x < width / 2;
      x += 0.316
    ) {
      if (
        openings.some(
          (o) =>
            Math.abs(x - o.x) < o.width / 2 + 0.07 &&
            Math.abs(y - o.y) < o.height / 2 + 0.04,
        )
      )
        continue;
      const block = k.mesh(
        brick,
        choose(k, palette),
        [x, y, k.range(-0.025, 0.007)],
        [0, 0, k.range(-0.013, 0.013)],
        parent,
      );
      block.scale.x = k.range(0.92, 1.025);
    }
  }
}

function newarWindow(k, position, width, height, parent) {
  const window = k.sub(position, 0, parent);
  k.box([width, height, 0.065], [0, 0, 0.025], k.m.dark, window, 0);
  for (let layer = 0; layer < 3; layer++) {
    const border = 0.06 + layer * 0.065;
    for (const side of [-1, 1]) {
      k.box(
        [0.055, height + border * 2, 0.07],
        [side * (width / 2 + border), 0, 0.07 + layer * 0.025],
        k.m.cedar,
        window,
        0,
      );
      k.box(
        [width + border * 2, 0.055, 0.09],
        [0, side * (height / 2 + border), 0.085 + layer * 0.025],
        k.m.cedar,
        window,
        0,
      );
    }
  }
  const innerWidth = width - 0.1,
    innerHeight = height - 0.1;
  const pitch = 0.12;
  // Two clipped diagonal families are open timber lattice, not an opaque pattern.
  for (const slope of [-1, 1]) {
    for (
      let intercept = -innerHeight / 2 - innerWidth / 2;
      intercept <= innerHeight / 2 + innerWidth / 2;
      intercept += pitch
    ) {
      const endpoints = [];
      for (const x of [-innerWidth / 2, innerWidth / 2]) {
        const y = slope * x + intercept;
        if (Math.abs(y) <= innerHeight / 2) endpoints.push([x, y, 0.11]);
      }
      for (const y of [-innerHeight / 2, innerHeight / 2]) {
        const x = (y - intercept) / slope;
        if (Math.abs(x) < innerWidth / 2) endpoints.push([x, y, 0.11]);
      }
      if (endpoints.length === 2)
        k.rod(endpoints[0], endpoints[1], 0.01, k.m.cedar, window);
    }
  }
  for (const side of [-1, 1]) {
    k.box(
      [0.075, height + 0.15, 0.17],
      [(side * width) / 6, 0, 0.15],
      k.m.cedar,
      window,
      0,
    );
    k.box(
      [width + 0.55, 0.07, 0.33],
      [0, side * (height / 2 + 0.23), 0.15],
      k.m.cedar,
      window,
      0,
    );
  }
  for (let x = -width / 2; x <= width / 2; x += 0.145) {
    const ornament = k.box(
      [0.056, 0.056, 0.065],
      [x, height / 2 + 0.11, 0.19],
      k.m.woodFloor,
      window,
      0,
    );
    ornament.rotation.z = PI / 4;
    k.box(
      [0.042, 0.12, 0.07],
      [x, -height / 2 - 0.13, 0.16],
      k.m.cedar,
      window,
      0,
    );
  }
  for (const x of [-width * 0.36, 0, width * 0.36]) {
    k.rod(
      [x, -height / 2 - 0.32, 0.03],
      [x, -height / 2 - 0.2, 0.3],
      0.034,
      k.m.cedar,
      window,
    );
  }
}

function newarHouse(
  k,
  position,
  width,
  height,
  depth,
  angle,
  brickPalette,
  tilePalette,
  shop = false,
) {
  const house = k.sub(position, angle);
  const windows = [];
  for (let x = -width / 2 + 1.15; x < width / 2 - 0.5; x += 2.4) {
    windows.push({ x, y: 3.35, width: 1.1, height: 1.4 });
    if (height > 6.4) windows.push({ x, y: 5.65, width: 0.94, height: 1.18 });
    if (shop) windows.push({ x, y: 1.07, width: 1.62, height: 1.93 });
  }
  brickFacade(k, house, width, height, brickPalette, windows);
  k.box(
    [width, height, depth],
    [0, height / 2, -depth / 2 - 0.27],
    k.m.brick,
    house,
    0,
  );
  k.box(
    [width, 0.22, depth + 0.4],
    [0, -0.06, -depth / 2 - 0.22],
    k.m.brick,
    house,
    0,
  );
  for (const window of windows) {
    if (window.y > 2)
      newarWindow(
        k,
        [window.x, window.y, 0.02],
        window.width,
        window.height,
        house,
      );
    else {
      k.box(
        [window.width, window.height, 0.045],
        [window.x, window.y, 0.04],
        k.m.dark,
        house,
        0,
      );
      for (const side of [-1, 1]) {
        k.box(
          [0.13, 2.15, 0.19],
          [window.x + side * 0.87, 1.12, 0.06],
          k.m.cedar,
          house,
          0,
        );
        for (let x = 0; x < 0.5; x += 0.105) {
          k.box(
            [0.096, 1.9, 0.09],
            [window.x + side * (0.65 - x), 1.07, 0.13],
            k.m.cedar,
            house,
            0,
          );
        }
      }
      k.box([2.0, 0.17, 0.23], [window.x, 2.15, 0.08], k.m.cedar, house, 0);
      k.box([1.92, 0.12, 0.55], [window.x, 0.09, 0.18], k.m.stone, house);
    }
  }
  for (const y of [2.45, height - 0.22]) {
    k.box([width + 0.12, 0.12, 0.18], [0, y, 0.045], k.m.cedar, house, 0);
    k.box(
      [width + 0.1, 0.052, 0.13],
      [0, y + 0.14, 0.025],
      k.m.woodFloor,
      house,
      0,
    );
  }
  const roof = k.sub([0, 0, -depth / 2], 0, house);
  roofTiles(k, roof, {
    width: width + 0.85,
    depth: depth + 1.4,
    height,
    rise: 1.3,
    palette: tilePalette,
  });
  for (let x = -width / 2 + 0.25; x < width / 2; x += 0.55) {
    k.rod(
      [x, height - 0.74, 0.02],
      [x, height + 0.03, 0.65],
      0.045,
      k.m.cedar,
      house,
    );
    k.box([0.07, 0.09, 1.25], [x, height - 0.04, 0.15], k.m.cedar, house, 0);
  }
  return house;
}

function newarNeighbor(k, position, width, height, depth, angle, tiles) {
  const house = k.sub(position, angle);
  k.box(
    [width, height, depth],
    [0, height / 2, -depth / 2],
    k.m.brick,
    house,
    0,
  );
  k.box(
    [width, 0.22, depth + 0.05],
    [0, -0.06, -depth / 2],
    k.m.brick,
    house,
    0,
  );
  for (const y of [2.25, 4.65, height - 0.08]) {
    k.box([width + 0.12, 0.12, 0.16], [0, y, 0.05], k.m.cedar, house, 0);
  }
  for (let x = -width / 2 + 1.05; x < width / 2 - 0.6; x += 2.15) {
    for (const y of [3.33, 5.75]) {
      if (y + 0.72 > height) continue;
      k.box([0.93, 1.26, 0.05], [x, y, 0.045], k.m.dark, house, 0);
      for (const side of [-1, 1]) {
        k.box(
          [0.075, 1.42, 0.13],
          [x + side * 0.51, y, 0.1],
          k.m.cedar,
          house,
          0,
        );
        k.box(
          [1.16, 0.09, 0.22],
          [x, y + side * 0.69, 0.13],
          k.m.cedar,
          house,
          0,
        );
      }
      for (let i = 0; i < 6; i++)
        k.box(
          [0.025, 1.23, 0.045],
          [x - 0.39 + i * 0.156, y, 0.105],
          k.m.cedar,
          house,
          0,
        );
      for (let i = 0; i < 6; i++)
        k.box(
          [0.92, 0.026, 0.045],
          [x, y - 0.51 + i * 0.204, 0.13],
          k.m.cedar,
          house,
          0,
        );
    }
  }
  k.box([1.08, 1.96, 0.055], [0, 1.02, 0.04], k.m.dark, house, 0);
  for (const side of [-1, 1])
    k.box([0.1, 2.16, 0.19], [side * 0.61, 1.08, 0.1], k.m.cedar, house, 0);
  k.box([1.4, 0.14, 0.22], [0, 2.18, 0.1], k.m.cedar, house, 0);
  k.box([1.37, 0.1, 0.46], [0, 0.06, 0.14], k.m.stone, house, 0);
  const roofDepth = depth + 1.0,
    rise = 1.1;
  const slope = Math.hypot(roofDepth / 2, rise),
    roofAngle = Math.atan2(rise, roofDepth / 2);
  const tile = new THREE.CylinderGeometry(
    0.093,
    0.084,
    0.38,
    6,
    1,
    true,
    PI / 2,
    PI,
  );
  tile.rotateX(PI / 2);
  for (const side of [-1, 1]) {
    const plane = k.sub(
      [0, height + rise / 2, -depth / 2 + (side * roofDepth) / 4],
      0,
      house,
    );
    plane.rotation.x = side * roofAngle;
    k.box([width + 0.75, 0.11, slope], [0, 0, 0], tiles[1], plane, 0);
    k.box(
      [width + 0.85, 0.15, 0.15],
      [0, -0.07, (side * slope) / 2],
      k.m.cedar,
      plane,
      0,
    );
    for (let x = -width / 2 - 0.25; x <= width / 2 + 0.25; x += 0.18) {
      k.mesh(
        tile,
        tiles[Math.floor((x + width) * 5) % tiles.length],
        [x, 0.063, side * (slope / 2 - 0.12)],
        [0, 0, 0],
        plane,
      );
    }
  }
  return house;
}

function potteryLibrary() {
  const profiles = [
    [
      [0, 0.012],
      [0.13, 0.012],
      [0.2, 0.05],
      [0.245, 0.19],
      [0.218, 0.32],
      [0.15, 0.39],
      [0.14, 0.425],
      [0.166, 0.44],
      [0.169, 0.464],
      [0.143, 0.47],
      [0.123, 0.435],
      [0.12, 0.39],
      [0.19, 0.29],
      [0.213, 0.18],
      [0.178, 0.06],
      [0, 0.045],
    ],
    [
      [0, 0.014],
      [0.115, 0.014],
      [0.19, 0.055],
      [0.24, 0.15],
      [0.248, 0.255],
      [0.225, 0.28],
      [0.204, 0.28],
      [0.221, 0.24],
      [0.207, 0.145],
      [0.15, 0.06],
      [0, 0.043],
    ],
    [
      [0, 0.014],
      [0.09, 0.014],
      [0.15, 0.11],
      [0.165, 0.24],
      [0.12, 0.33],
      [0.065, 0.36],
      [0.064, 0.45],
      [0.084, 0.46],
      [0.084, 0.48],
      [0.06, 0.48],
      [0.05, 0.36],
      [0.095, 0.32],
      [0.135, 0.22],
      [0.12, 0.1],
      [0, 0.04],
    ],
    [
      [0, 0.01],
      [0.16, 0.01],
      [0.235, 0.09],
      [0.29, 0.17],
      [0.3, 0.205],
      [0.274, 0.209],
      [0.265, 0.176],
      [0.215, 0.105],
      [0.15, 0.036],
      [0, 0.032],
    ],
    [
      [0, 0.018],
      [0.135, 0.018],
      [0.175, 0.055],
      [0.155, 0.08],
      [0.17, 0.3],
      [0.21, 0.43],
      [0.22, 0.445],
      [0.22, 0.475],
      [0.2, 0.479],
      [0.19, 0.439],
      [0.145, 0.3],
      [0.13, 0.08],
      [0, 0.052],
    ],
  ];
  function thrown(profile, variant, close = false) {
    const height = Math.max(...profile.map((p) => p[1]));
    const path = close
      ? new THREE.CatmullRomCurve3(
          profile.map(([r, y]) => new THREE.Vector3(r, y, 0)),
          false,
          "centripetal",
        )
          .getPoints(70)
          .map(
            (p) =>
              new THREE.Vector2(
                Math.max(0, p.x),
                THREE.MathUtils.clamp(p.y, 0.012, height),
              ),
          )
      : profile.map((p) => new THREE.Vector2(...p));
    const segments = close ? 48 : 24;
    const geometry = new THREE.LatheGeometry(path, segments);
    const positions = geometry.attributes.position,
      uv = geometry.attributes.uv;
    const phase = variant * 1.73;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        y = positions.getY(i),
        z = positions.getZ(i);
      const angle = Math.atan2(x, z),
        radius = Math.hypot(x, z);
      const rim = (y / height) ** 8;
      const roundness =
        1 +
        0.007 * Math.sin(angle * 3 + phase) +
        0.004 * Math.sin(angle * 5 - phase);
      const rings = close
        ? 0.00065 * Math.sin(y * 150 + phase) * Math.min(1, radius / 0.1)
        : 0;
      positions.setXYZ(
        i,
        x * roundness + Math.sin(angle) * rings,
        y + rim * 0.0023 * Math.sin(angle * 3 + phase),
        z * roundness + Math.cos(angle) * rings,
      );
      uv.setY(i, y / height + variant * 0.173);
    }
    geometry.computeVertexNormals();
    const normals = geometry.attributes.normal;
    for (let row = 0; row < path.length; row++) {
      const last = segments * path.length + row;
      const normal = new THREE.Vector3()
        .fromBufferAttribute(normals, row)
        .add(new THREE.Vector3().fromBufferAttribute(normals, last))
        .normalize();
      normals.setXYZ(row, normal.x, normal.y, normal.z);
      normals.setXYZ(last, normal.x, normal.y, normal.z);
    }
    return geometry;
  }
  return {
    ordinary: profiles.map((profile) =>
      [0, 1, 2].map((variant) => thrown(profile, variant)),
    ),
    close: profiles.map((profile) => thrown(profile, 1, true)),
  };
}

function thrownClaySurface(material, worked = false) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader =
      `varying vec2 clayUv;\n${shader.vertexShader}`.replace(
        "#include <uv_vertex>",
        "#include <uv_vertex>\nclayUv = uv;",
      );
    shader.fragmentShader = `varying vec2 clayUv;\n${shader.fragmentShader}`
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec2 clayGrainUv = vec2(fract(clayUv.x), clayUv.y) * vec2(930.0, 480.0);
        float clayFine = 1.0 - smoothstep(0.55, 1.8, max(fwidth(clayGrainUv.x), fwidth(clayGrainUv.y)));
        float clayPore = fract(sin(dot(floor(clayGrainUv), vec2(127.1, 311.7))) * 43758.5453) - 0.5;
        float clayPhase = clayUv.y * 210.0 + 0.34 * sin(clayUv.x * 18.8496 + clayUv.y * 4.5);
        float clayRing = sin(clayPhase) * (1.0 - smoothstep(0.8, 2.4, fwidth(clayPhase)));
        float claySlip = 0.035 * sin(clayUv.x * 18.8496 + sin(clayUv.y * 12.0))
          + 0.020 * sin(clayUv.y * 33.0 + clayUv.x * 12.5664);
        float clayBurnish = smoothstep(-0.25, 0.70, sin(clayUv.x * 12.5664 + clayUv.y * 9.0) * 0.65
          + sin(clayUv.y * 18.0) * 0.35);
        diffuseColor.rgb *= 1.0 + claySlip + clayPore * clayFine * 0.035;`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + clayPore * clayFine * 0.065 + clayRing * 0.012
          - clayBurnish * ${worked ? "0.17" : "0.0"}, ${worked ? "0.59, 0.94" : "0.86, 1.0"});`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        float clayRelief = clayRing * 0.000055;
        vec3 clayDx = dFdx(-vViewPosition), clayDy = dFdy(-vViewPosition);
        vec3 clayS = cross(clayDy, normal), clayT = cross(normal, clayDx);
        float clayDet = dot(clayDx, clayS);
        normal = normalize(max(abs(clayDet), 1e-10) * normal
          - sign(clayDet) * (dFdx(clayRelief) * clayS + dFdy(clayRelief) * clayT));`,
      );
  };
  material.customProgramCacheKey = () =>
    `thrown-clay-slip-and-pores-v2-${worked ? "worked" : "dry"}`;
}

/** A working square: vessels dry in ordered patches, with walking routes between them. */
export function buildNewarPottersSquare(definition, renderer) {
  const k = createOutdoorKit(renderer, seedOf(definition, 901), {
    sunPosition: [-12, 15, 10],
    sunColor: 0xffe0b2,
    sunIntensity: 3.2,
    skyColor: 0xb9c8cf,
    fogDensity: 0.007,
    exposure: 0.88,
  });
  const bricks = weathered(
    k,
    k.m.brick,
    [0xb17b5d, 0xa96a50, 0x986348, 0xbd8060, 0x8b634f, 0xa07760],
  );
  const tiles = weathered(
    k,
    k.m.terracotta,
    [0x98694e, 0xa67556, 0x80664f, 0xb77e58],
  );
  const clay = weathered(
    k,
    k.m.terracotta,
    [
      0xc38355, 0xbd7548, 0xc89062, 0xac673e, 0xd49465, 0xae7c5a, 0x6d6b5d,
      0x898575, 0x817666,
    ],
  );
  clay.forEach((material) => thrownClaySurface(material));
  const workedClay = weathered(k, k.m.terracotta, [0xac673e], 0.79)[0];
  workedClay.roughnessMap = null;
  thrownClaySurface(workedClay, true);
  const paving = streetPaving(k);
  paving({
    width: 27,
    depth: 27,
    position: [0, -0.02, 0],
    stoneSize: 0.48,
    material: k.m.cobble,
    wear: [
      [2.8, 2.9, 0.66],
      [-10.9, -3.1, 0.58],
    ],
  });
  newarHouse(k, [-7.8, 0, -10], 7.8, 7.1, 4.3, 0, bricks, tiles, true);
  newarHouse(k, [0.3, 0, -10.2], 8.1, 6.9, 4.6, 0, bricks, tiles, true);
  newarHouse(k, [9.3, 0, -10.3], 6.7, 7.6, 4.7, 0, bricks, tiles);
  newarHouse(k, [-12.6, 0, -0.7], 17.5, 6.1, 4.1, PI / 2, bricks, tiles, true);
  newarHouse(k, [12.6, 0, 1.3], 15.6, 6.7, 4.3, -PI / 2, bricks, tiles, true);
  newarHouse(k, [-7, 0, 12.4], 10.7, 6.3, 4.5, PI, bricks, tiles, true);
  newarHouse(k, [8.1, 0, 12.4], 8.0, 7.2, 4.7, PI, bricks, tiles);
  // Open exits continue as real narrow streets, rather than exposing a backdrop.
  paving({
    width: 3,
    depth: 15,
    position: [1.0, -0.03, 18.5],
    stoneSize: 0.46,
  });
  paving({
    width: 3.1,
    depth: 3.8,
    position: [1.0, -0.03, 27.3],
    stoneSize: 0.55,
  });
  newarHouse(k, [-1.25, 0, 20], 13.8, 6.5, 3.3, PI / 2, bricks, tiles);
  newarHouse(k, [3.35, 0, 20], 13.8, 7.0, 3.3, -PI / 2, bricks, tiles);

  // These passages turn between full neighboring buildings; none opens onto the sky at ground level.
  k.box([57, 0.15, 64], [0, -0.17, 4.0], k.m.cobble, k.group, 0);
  paving({
    width: 1.7,
    depth: 8.7,
    position: [5.18, -0.025, -14.5],
    stoneSize: 0.48,
  });
  paving({
    width: 4.3,
    depth: 7.2,
    position: [-13.25, -0.025, -12.2],
    stoneSize: 0.5,
  });
  paving({
    width: 6.6,
    depth: 3.5,
    position: [15.4, -0.025, -8.35],
    stoneSize: 0.5,
  });
  newarNeighbor(k, [6.2, 0, -19.0], 10.0, 7.8, 4.6, 0, tiles);
  newarNeighbor(k, [-16.0, 0, -17.1], 13.0, 7.7, 4.7, 0, tiles);
  newarNeighbor(k, [-24.0, 0, -12.3], 12.0, 7.8, 4.7, PI / 2, tiles);
  newarNeighbor(k, [19.6, 0, -16.4], 12.8, 8.5, 4.8, -PI / 2, tiles);
  newarNeighbor(k, [19.6, 0, -3.4], 13.2, 7.9, 4.8, -PI / 2, tiles);
  newarNeighbor(k, [-20.1, 0, 15.2], 21.4, 7.5, 4.7, PI / 2, tiles);
  newarNeighbor(k, [20.0, 0, 14.1], 17.8, 8.0, 4.5, -PI / 2, tiles);
  newarNeighbor(k, [0.6, 0, 29.0], 16.0, 7.8, 4.5, PI, tiles);
  newarNeighbor(k, [19.0, 0, 29.0], 13.5, 8.1, 4.5, PI, tiles);

  const pots = potteryLibrary();
  const placePot = (
    x,
    z,
    style,
    scale,
    y = 0.035,
    parent = k.group,
    material = choose(k, clay.slice(0, 6)),
    close = false,
  ) => {
    const variant = Math.abs(Math.floor(x * 41 + z * 17 + scale * 23)) % 3;
    const geometry = close
      ? pots.close[style % 5]
      : pots.ordinary[style % 5][variant];
    const pot = k.mesh(
      geometry,
      material,
      [x, y, z],
      [k.range(-0.028, 0.028), k.range(0, PI * 2), k.range(-0.028, 0.028)],
      parent,
    );
    pot.scale.set(
      scale * k.range(0.93, 1.06),
      scale,
      scale * k.range(0.94, 1.055),
    );
    return pot;
  };
  for (const patch of [
    { x: -7.6, z: -6.8, rows: 9, cols: 12, dx: 0.53, dz: 0.54 },
    { x: -0.4, z: -5.8, rows: 12, cols: 10, dx: 0.48, dz: 0.49 },
    { x: -7.0, z: -0.9, rows: 11, cols: 10, dx: 0.48, dz: 0.49 },
  ]) {
    for (let row = 0; row < patch.rows; row++)
      for (let col = 0; col < patch.cols; col++) {
        if (k.random() < 0.048) continue;
        const style = row % 4 === 0 ? 3 : row % 5 === 0 ? 2 : 0;
        const scale = k.range(0.63, 0.92);
        const pot = placePot(
          patch.x + col * patch.dx + k.range(-0.035, 0.035),
          patch.z + row * patch.dz + k.range(-0.03, 0.03),
          style,
          scale,
          0.035,
          k.group,
          row % 5 < 2 ? clay[6 + (col % 3)] : undefined,
        );
        if (style === 0 && k.random() < 0.36) {
          pot.rotation.z += PI;
          pot.position.y += 0.47 * scale;
        }
      }
  }
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 8; col++) {
      placePot(
        -0.85 + col * 0.4,
        1.25 + row * 0.43,
        1,
        k.range(0.56, 0.73),
        0.035,
        k.group,
        clay[(row + col) % 7],
      );
    }
  for (const [x, z] of [
    [-10.3, -6],
    [-9.8, -5.6],
    [-10, 2.5],
    [8.8, 7.1],
    [-7, -8.3],
  ]) {
    placePot(x, z, 0, 1.6);
    for (let layer = 0; layer < 5; layer++)
      placePot(
        x + 0.65,
        z + 0.13,
        3,
        0.93 + layer * 0.025,
        0.03 + layer * 0.065,
      );
    for (let layer = 0; layer < 3; layer++)
      placePot(x + 1.14, z - 0.27, 4, 0.76, 0.03 + layer * 0.3);
    wovenBasket(k, [x - 0.48, 0.03, z + 0.6], 0.3, 0.43);
  }
  for (let i = 0; i < 14; i++) {
    const shard = flatPolygon(
      [
        [0, 0],
        [0.09, -0.025],
        [0.15, 0.055],
        [0.046, 0.12],
      ],
      0.014,
    );
    k.mesh(
      shard,
      clay[i % 6],
      [-8.7 + k.range(-0.6, 0.6), 0.036, -2 + k.range(-0.6, 0.6)],
      [-PI / 2, 0, k.range(0, PI * 2)],
    );
  }

  const shrine = k.sub([7.5, 0, -5.1]);
  for (let level = 0; level < 6; level++) {
    k.box(
      [4.5 - level * 0.29, 0.205, 4.8 - level * 0.5],
      [0, 0.105 + level * 0.205, -0.25 - level * 0.2],
      k.m.stone,
      shrine,
      0.022,
    );
  }
  brickFacade(k, k.sub([0, 1.23, -0.85], 0, shrine), 2.1, 1.7, bricks, [
    { x: 0, y: 0.71, width: 0.75, height: 1.32 },
  ]);
  k.box([2.1, 1.72, 2.0], [0, 2.08, -1.85], k.m.brick, shrine, 0);
  k.box([0.72, 1.28, 0.055], [0, 1.92, -0.77], k.m.dark, shrine, 0);
  for (const side of [-1, 1]) {
    k.box([0.14, 1.65, 0.2], [side * 0.49, 2.05, -0.72], k.m.cedar, shrine);
    k.box([0.14, 1.7, 0.16], [side * 1.18, 2.04, -0.51], k.m.cedar, shrine);
  }
  k.box([1.28, 0.15, 0.26], [0, 2.89, -0.7], k.m.cedar, shrine);
  const lowerRoof = k.sub([0, 0, -1.45], 0, shrine);
  roofTiles(k, lowerRoof, {
    width: 3.4,
    depth: 3.2,
    height: 2.97,
    rise: 0.78,
    palette: tiles,
  });
  k.box([1.04, 0.47, 0.85], [0, 3.8, -1.45], k.m.cedar, shrine, 0);
  roofTiles(k, lowerRoof, {
    width: 1.85,
    depth: 1.65,
    height: 4.05,
    rise: 0.62,
    palette: tiles,
  });
  k.lathe(
    [
      [0.14, 0],
      [0.14, 0.08],
      [0.07, 0.13],
      [0.08, 0.3],
      [0.025, 0.48],
      [0, 0.6],
    ],
    [0, 4.67, -1.45],
    k.m.bronze,
    shrine,
    24,
  );
  k.rod([0.68, 2.83, -0.56], [0.68, 2.56, -0.56], 0.009, k.m.iron, shrine);
  k.lathe(
    [
      [0.11, 0],
      [0.1, 0.028],
      [0.06, 0.14],
      [0.025, 0.17],
    ],
    [0.68, 2.39, -0.56],
    k.m.bronze,
    shrine,
    24,
  );
  k.sphere(0.024, [0.68, 2.38, -0.56], k.m.bronze, shrine);
  for (const x of [-1.6, 1.6]) {
    k.lathe(
      [
        [0.25, 0],
        [0.23, 0.15],
        [0.12, 0.2],
        [0.1, 0.54],
        [0.18, 0.58],
        [0.18, 0.65],
        [0.09, 0.7],
      ],
      [x, 1.02, -0.35],
      k.m.stone,
      shrine,
      16,
    );
  }
  for (let bundle = 0; bundle < 11; bundle++) {
    const x = -2.0 + bundle * 0.37,
      z = 2.4 + k.range(-0.1, 0.1);
    for (let stalk = 0; stalk < 13; stalk++) {
      const dx = k.range(-0.11, 0.11),
        dz = k.range(-0.1, 0.1),
        height = k.range(0.65, 1.05);
      k.rod(
        [x + dx, 0.05, z + dz],
        [x + dx * 0.24, height, z - 0.28],
        0.008,
        k.m.paper,
        shrine,
      );
    }
    k.ring(0.045, 0.009, [x, 0.52, z - 0.14], k.m.linen, shrine);
    k.rod(
      [x + 0.04, 0.52, z - 0.14],
      [x + 0.065, 0.465, z - 0.115],
      0.003,
      k.m.linen,
      shrine,
    );
    k.rod(
      [x + 0.04, 0.52, z - 0.14],
      [x + 0.025, 0.45, z - 0.1],
      0.003,
      k.m.linen,
      shrine,
    );
  }
  const potter = k.sub([-9.25, 0, -0.6]);
  k.box([2.0, 0.035, 1.55], [0, 0.04, 0], k.m.linen, potter, 0);
  k.cylinder(0.43, 0.14, [0, 0.16, 0], k.m.stone, potter, 0.41, 48);
  k.cylinder(0.41, 0.033, [0, 0.252, 0], clay[3], potter, 0.43, 48);
  placePot(0, 0, 0, 0.73, 0.273, potter, workedClay, true);
  k.box([0.7, 0.09, 0.4], [0.8, 0.19, 0.45], k.m.cedar, potter);
  for (const x of [0.57, 1.03])
    for (const z of [0.31, 0.59])
      k.box([0.07, 0.18, 0.07], [x, 0.1, z], k.m.cedar, potter);
  k.sphere(0.16, [-0.68, 0.16, 0.46], clay[3], potter, [1.3, 0.6, 1]);
  foldedTextile(k, [0.8, 0.238, 0.45], 0.39, 0.27, potter, k.m.paper);
  const clayBench = k.sub([2.8, -0.014, 1.6]);
  k.box([1.05, 0.07, 0.65], [0, 0.635, 0], k.m.cedar, clayBench, 0.006);
  for (const x of [-0.4, 0.4])
    for (const z of [-0.24, 0.24]) {
      k.box([0.075, 0.6, 0.075], [x, 0.3, z], k.m.cedar, clayBench, 0);
    }
  k.box([0.88, 0.06, 0.055], [0, 0.18, -0.24], k.m.cedar, clayBench, 0);
  placePot(-0.24, 0.04, 0, 0.5, 0.67, clayBench, workedClay, true);
  dryingMats(k, [0.28, 0.67, -0.07], 0.32, 0.35, clayBench);
  k.mesh(
    flatPolygon(
      [
        [-0.085, 0],
        [-0.067, 0.052],
        [0.046, 0.076],
        [0.09, 0.024],
        [0.045, -0.025],
      ],
      0.009,
    ),
    k.m.woodFloor,
    [-0.05, 0.671, 0.22],
    [-PI / 2, 0, -0.3],
    clayBench,
  );
  for (let i = 0; i < 3; i++)
    k.rod(
      [-0.16 + i * 0.06, 0.676, -0.24],
      [0.06 + i * 0.055, 0.676, -0.2],
      0.006,
      k.m.woodFloor,
      clayBench,
    );
  k.tube(
    [
      [0.03, 0.674, 0.13],
      [0.07, 0.674, 0.16],
      [0.085, 0.674, 0.12],
      [0.06, 0.674, 0.08],
      [0.03, 0.674, 0.13],
    ],
    0.0025,
    k.m.iron,
    clayBench,
  );
  const thresholdPlants = streetPlants(k),
    goldFlower = k.material(0xd2a74f, 0.97);
  goldFlower.side = THREE.DoubleSide;
  thresholdPlants.pot([-11.9, -0.014, -0.95], 0.85, goldFlower);
  wovenBasket(k, [-10.0, 0.035, 4.3], 0.52, 0.43);
  ropeCoil(k, [-9.6, 0.03, 3.65], k.group, 0.22);
  for (const x of [-11.5, 11.45]) {
    k.box([0.16, 0.045, 20], [x, 0.003, 0.1], k.m.dark, k.group, 0);
    for (let z = -9.4; z < 10; z += 0.59)
      k.box(
        [0.42, 0.09, 0.52],
        [x + 0.26, 0.035, z],
        k.m.stone,
        k.group,
        0.006,
      );
  }
  for (const [x, z] of [
    [-10.9, -3.2],
    [10.9, 4.4],
  ]) {
    k.box([0.45, 0.035, 0.72], [x, 0.025, z], k.m.iron, k.group, 0);
    for (let i = 0; i < 7; i++)
      k.box(
        [0.027, 0.013, 0.64],
        [x - 0.18 + i * 0.06, 0.052, z],
        k.m.dark,
        k.group,
        0,
      );
  }
  return k.finish(
    definition,
    {
      arrival: outdoorView(
        "Across the potters’ square",
        [4.25, 1.66, 4.4],
        [-0.75, 1.48, -5.9],
        64,
      ),
      pottery: outdoorView(
        "A pause at the clay bench",
        [0.95, 1.57, 3.75],
        [2.8, 0.83, 1.6],
        58,
      ),
      windows: outdoorView(
        "Newar timber lattice",
        [-1.0, 1.65, -6.35],
        [-3.6, 3.7, -10.1],
        59,
      ),
      shrine: outdoorView(
        "Stone steps and the shrine",
        [6.2, 1.65, 0.3],
        [7.5, 2.05, -6],
        59,
      ),
    },
    [
      [-3.9, 0.37, 1],
      [-3.6, 3.5, -10.07],
      [7.5, 1.33, -4.7],
      [2.8, 0.83, 1.6],
    ],
  );
}

function hullGeometry(
  length,
  halfWidth,
  depth,
  from = 0,
  to = 1,
  deck = false,
) {
  const positions = [],
    uvs = [],
    indices = [];
  const longitudinal = 48,
    transverse = deck ? 4 : 16;
  for (let row = 0; row <= longitudinal; row++) {
    const t = from + ((to - from) * row) / longitudinal;
    const z = (t - 0.5) * length;
    const width = halfWidth * Math.pow(Math.sin(PI * t), 0.7) + 0.015;
    const sheer = Math.pow(Math.abs(t - 0.5) * 2, 3.8) * 0.65;
    for (let col = 0; col <= transverse; col++) {
      const theta = (col / transverse - 0.5) * PI;
      const x = Math.sin(theta) * width + 0.028 * Math.sin(t * PI);
      const handPlaned =
        0.0017 * Math.sin(t * 59 + col * 1.7) * Math.sin(PI * t) ** 2;
      const y =
        sheer +
        (deck ? depth - 0.015 : (1 - Math.cos(theta)) * depth) +
        handPlaned;
      positions.push(x, y, z);
      uvs.push(col / transverse, t * 5);
      if (row < longitudinal && col < transverse) {
        const a = row * (transverse + 1) + col,
          b = a + transverse + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function ferroCamber(x, y) {
  return 0.027 * Math.sin((y + 0.35) * 2.4) + 0.055 * ((x + 0.025) / 0.37) ** 2;
}

function forgedFerroGeometry(outline) {
  const head = new THREE.CatmullRomCurve3(
    outline.slice(0, 13).map(([x, y]) => new THREE.Vector3(x, y, 0)),
    false,
    "centripetal",
  ).getPoints(52);
  const profile = [...head.map((p) => [p.x, p.y]), ...outline.slice(13)];
  const source = flatPolygon(profile, 0.022, 0.0045, 3);
  const positions = [],
    normals = [],
    uvs = [];
  const p = source.attributes.position,
    n = source.attributes.normal,
    uv = source.attributes.uv;
  function crownAt(x, y) {
    const hx = (x - 0.04) / 0.19,
      hy = (y - 0.66) / 0.19;
    const sx = (x - 0.035) / 0.075,
      sy = (y + 0.02) / 0.4;
    return (
      0.009 * Math.exp(-(hx * hx + hy * hy)) +
      0.0045 * Math.exp(-(sx * sx + sy ** 4))
    );
  }
  function emit(vertices, normal, level) {
    if (level > 0) {
      const middle = (a, b) => a.map((v, i) => (v + b[i]) / 2);
      const [a, b, c] = vertices,
        ab = middle(a, b),
        bc = middle(b, c),
        ca = middle(c, a);
      for (const triangle of [
        [a, ab, ca],
        [ab, b, bc],
        [ca, bc, c],
        [ab, bc, ca],
      ])
        emit(triangle, normal, level - 1);
      return;
    }
    for (const [x, y, z, u, v] of vertices) {
      const side = THREE.MathUtils.clamp((z - 0.011) / 0.011, -1, 1);
      const crown = crownAt(x, y);
      positions.push(x, y, z - 0.011 + ferroCamber(x, y) + side * crown);
      normals.push(...normal);
      uvs.push(u, v);
    }
  }
  for (let i = 0; i < p.count; i += 3) {
    const vertices = [i, i + 1, i + 2].map((j) => [
      p.getX(j),
      p.getY(j),
      p.getZ(j),
      uv.getX(j),
      uv.getY(j),
    ]);
    emit(vertices, [n.getX(i), n.getY(i), n.getZ(i)], 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  const welded = mergeVertices(geometry, 0.000001);
  const faceSides = Array.from(
    { length: welded.attributes.normal.count },
    (_, i) => welded.attributes.normal.getZ(i),
  );
  welded.computeVertexNormals();
  for (let i = 0; i < faceSides.length; i++) {
    if (Math.abs(faceSides[i]) < 0.99) continue;
    const side = Math.sign(faceSides[i]),
      x = welded.attributes.position.getX(i),
      y = welded.attributes.position.getY(i);
    const surface = (u, v) => ferroCamber(u, v) + side * crownAt(u, v);
    const step = 0.0001;
    const dx = (surface(x + step, y) - surface(x - step, y)) / (2 * step);
    const dy = (surface(x, y + step) - surface(x, y - step)) / (2 * step);
    const normal = new THREE.Vector3(-side * dx, -side * dy, side).normalize();
    welded.attributes.normal.setXYZ(i, normal.x, normal.y, normal.z);
  }
  source.dispose();
  geometry.dispose();
  return welded;
}

function gondolaLibrary() {
  return {
    hull: hullGeometry(10.6, 0.75, 0.47),
    bowDeck: hullGeometry(10.6, 0.75, 0.47, 0.79, 1, true),
    sternDeck: hullGeometry(10.6, 0.75, 0.47, 0, 0.2, true),
    ferro: forgedFerroGeometry([
      [-0.035, -0.37],
      [0.07, -0.33],
      [0.12, -0.11],
      [0.13, 0.34],
      [0.33, 0.48],
      [0.35, 0.61],
      [0.3, 0.72],
      [0.15, 0.81],
      [-0.13, 0.83],
      [-0.29, 0.69],
      [-0.1, 0.65],
      [-0.035, 0.55],
      [-0.035, 0.43],
      [-0.28, 0.43],
      [-0.28, 0.385],
      [-0.035, 0.37],
      [-0.035, 0.315],
      [-0.27, 0.315],
      [-0.27, 0.27],
      [-0.035, 0.255],
      [-0.035, 0.2],
      [-0.26, 0.2],
      [-0.26, 0.155],
      [-0.035, 0.14],
      [-0.035, 0.085],
      [-0.25, 0.085],
      [-0.25, 0.04],
      [-0.035, 0.025],
      [-0.035, -0.03],
      [-0.24, -0.03],
      [-0.24, -0.075],
      [-0.035, -0.09],
      [-0.035, -0.145],
      [-0.23, -0.145],
      [-0.23, -0.19],
      [-0.035, -0.205],
    ]),
  };
}

function gondola(
  k,
  library,
  position,
  angle,
  palette,
  { unfinished = false } = {},
) {
  const boat = k.sub(position, angle);
  k.mesh(
    library.hull,
    unfinished ? palette.bare : palette.black,
    [0, 0, 0],
    [0, 0, 0],
    boat,
  );
  k.mesh(
    library.bowDeck,
    unfinished ? palette.bare : palette.black,
    [0, 0, 0],
    [0, 0, 0],
    boat,
  );
  k.mesh(
    library.sternDeck,
    unfinished ? palette.bare : palette.black,
    [0, 0, 0],
    [0, 0, 0],
    boat,
  );
  for (const side of [-1, 1]) {
    const rail = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      rail.push([
        side * (0.75 * Math.sin(PI * t) ** 0.7 + 0.015) +
          0.028 * Math.sin(t * PI),
        0.47 + (Math.abs(t - 0.5) * 2) ** 3.8 * 0.65,
        (t - 0.5) * 10.6,
      ]);
    }
    k.tube(rail, 0.032, unfinished ? palette.bare : palette.rail, boat);
  }
  for (let rib = 0; rib < 15; rib++) {
    const t = 0.21 + (rib / 14) * 0.57;
    const width = 0.75 * Math.sin(PI * t) ** 0.7;
    const sheer = (Math.abs(t - 0.5) * 2) ** 3.8 * 0.65;
    const points = [];
    for (let j = 0; j <= 10; j++) {
      const theta = (j / 10 - 0.5) * PI;
      points.push([
        Math.sin(theta) * (width - 0.023),
        sheer + 0.03 + (1 - Math.cos(theta)) * 0.44,
        (t - 0.5) * 10.6,
      ]);
    }
    k.tube(points, 0.023, palette.bare, boat);
  }
  for (let i = 0; i < 5; i++) {
    k.box(
      [0.145, 0.023, 4.3],
      [-0.31 + i * 0.155, 0.084, -0.12],
      unfinished ? palette.bare : palette.floor,
      boat,
      0,
    );
  }
  for (const z of [-1.8, 0.5, 2.05])
    k.box([1.25, 0.07, 0.2], [0, 0.42, z], palette.bare, boat, 0.008);
  if (!unfinished) {
    const fitting = k.sub([0.018, 1.06, 5.1], -PI / 2, boat);
    k.mesh(library.ferro, palette.steel, [0, 0, 0], [0, 0, 0], fitting);
    for (const y of [-0.2, 0.24]) {
      k.mesh(
        new THREE.CylinderGeometry(0.009, 0.009, 0.012, 10),
        palette.steel,
        [0.03, y, ferroCamber(0.03, y) + 0.021],
        [PI / 2, 0, 0],
        fitting,
      );
    }
    k.box([0.85, 0.08, 0.57], [0, 0.38, -0.88], palette.black, boat, 0.016);
    k.box([0.9, 0.29, 0.075], [0, 0.54, -1.13], palette.black, boat, 0.018);
    k.tube(
      [
        [0.69, 0.43, -2.3],
        [0.69, 0.67, -2.3],
        [0.77, 0.91, -2.31],
        [0.9, 0.94, -2.32],
      ],
      0.032,
      palette.bare,
      boat,
    );
    k.tube(
      [
        [0.77, 0.91, -2.31],
        [0.67, 1.0, -2.31],
        [0.64, 1.13, -2.31],
      ],
      0.028,
      palette.bare,
      boat,
    );
  }
  return boat;
}

function sawhorse(k, position, angle, palette, parent = k.group) {
  const horse = k.sub(position, angle, parent);
  k.box([1.55, 0.14, 0.18], [0, 0.65, 0], palette, horse, 0.005);
  for (const x of [-0.57, 0.57]) {
    for (const side of [-1, 1])
      k.rod(
        [x, 0.62, side * 0.065],
        [x, 0.025, side * 0.41],
        0.065,
        palette,
        horse,
      );
    k.rod([x, 0.23, -0.31], [x, 0.23, 0.31], 0.032, palette, horse);
  }
  k.rod([-0.6, 0.28, -0.28], [0.6, 0.5, -0.15], 0.025, palette, horse);
}

function paintedHull(k) {
  const material = weathered(k, k.m.cedar, [0x303633], 0.41)[0];
  material.side = THREE.DoubleSide;
  material.normalScale.set(0.16, 0.16);
  material.roughnessMap = null;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader =
      `varying vec2 hullUv;\n${shader.vertexShader}`.replace(
        "#include <uv_vertex>",
        "#include <uv_vertex>\nhullUv = uv;",
      );
    shader.fragmentShader = `varying vec2 hullUv;\n${shader.fragmentShader}`
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float hullPlank = floor(hullUv.x * 10.0);
        float hullTone = fract(sin(hullPlank * 13.71 + 2.2) * 231.41) - 0.5;
        float hullJoint = 1.0 - smoothstep(0.003, 0.017, abs(fract(hullUv.x * 10.0) - 0.5));
        float hullRub = pow(max(0.0, sin(hullUv.y * 7.1 + hullUv.x * 14.0)), 12.0)
          * smoothstep(0.80, 0.98, abs(hullUv.x - 0.5) * 2.0);
        diffuseColor.rgb = mix(diffuse * 0.64, diffuseColor.rgb, 0.18)
          * (1.0 + hullTone * 0.07 - hullJoint * 0.10 + hullRub * 0.085);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + hullTone * 0.045 + hullRub * 0.12, 0.33, 0.57);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        float hullRelief = -hullJoint * 0.00042;
        vec3 hullDx = dFdx(-vViewPosition), hullDy = dFdy(-vViewPosition);
        vec3 hullS = cross(hullDy, normal), hullT = cross(normal, hullDx);
        float hullDet = dot(hullDx, hullS);
        normal = normalize(max(abs(hullDet), 1e-10) * normal
          - sign(hullDet) * (dFdx(hullRelief) * hullS + dFdy(hullRelief) * hullT));`,
      );
  };
  material.customProgramCacheKey = () => "painted-timber-hull-v1";
  return material;
}

function windowRecess(
  k,
  position,
  width,
  height,
  parent,
  materials,
  reveal,
  variation = position[0],
) {
  const room = k.sub(position, 0, parent);
  k.box([width, height, 0.045], [0, 0, -0.34], materials.backing, room, 0);
  for (const side of [-1, 1]) {
    k.box(
      [0.065, height, 0.4],
      [side * (width / 2 - 0.025), 0, -0.14],
      reveal,
      room,
      0,
    );
    k.box(
      [width, 0.065, 0.4],
      [0, side * (height / 2 - 0.025), -0.14],
      reveal,
      room,
      0,
    );
  }
  const curtainSide = Math.sin(variation * 7.1) > 0 ? -1 : 1;
  const cloth = new THREE.PlaneGeometry(
    width * (Math.sin(variation * 3) > 0 ? 0.37 : 0.53),
    height * 0.91,
    8,
    10,
  );
  const p = cloth.attributes.position;
  for (let i = 0; i < p.count; i++)
    p.setZ(
      i,
      Math.sin(p.getX(i) * 53) * 0.018 + Math.sin(p.getY(i) * 3) * 0.008,
    );
  cloth.computeVertexNormals();
  k.mesh(
    cloth,
    materials.curtain,
    [curtainSide * width * 0.29, -0.025, -0.18],
    [0, 0, 0],
    room,
  );
  k.box([0.045, height - 0.09, 0.075], [0, 0, -0.052], k.m.cedar, room, 0);
  k.box(
    [width - 0.09, 0.038, 0.075],
    [0, height * 0.12, -0.052],
    k.m.cedar,
    room,
    0,
  );
  const glazing = k.mesh(
    new THREE.PlaneGeometry(width - 0.1, height - 0.1),
    materials.glass,
    [0, 0, -0.035],
    [0, 0, 0],
    room,
  );
  glazing.castShadow = false;
  return room;
}

function facadeWithWindows(
  k,
  parent,
  width,
  height,
  depth,
  material,
  openings,
) {
  k.box(
    [width, height, depth - 0.55],
    [0, height / 2 + 0.1, -(depth + 0.55) / 2],
    material,
    parent,
    0,
  );
  const bands = new Map();
  for (const opening of openings) {
    if (!bands.has(opening.y)) bands.set(opening.y, []);
    bands.get(opening.y).push(opening);
  }
  const panel = (left, right, bottom, top) => {
    if (right - left > 0.001 && top - bottom > 0.001) {
      k.box(
        [right - left, top - bottom, 0.55],
        [(left + right) / 2, (bottom + top) / 2, -0.275],
        material,
        parent,
        0,
      );
    }
  };
  let bottom = 0.1;
  for (const row of [...bands.values()].sort((a, b) => a[0].y - b[0].y)) {
    const low = row[0].y - row[0].height / 2,
      high = row[0].y + row[0].height / 2;
    panel(-width / 2, width / 2, bottom, low);
    let left = -width / 2;
    for (const opening of row.sort((a, b) => a.x - b.x)) {
      panel(left, opening.x - opening.width / 2, low, high);
      left = opening.x + opening.width / 2;
    }
    panel(left, width / 2, low, high);
    bottom = high;
  }
  panel(-width / 2, width / 2, bottom, height + 0.1);
}

function shutterWindow(
  k,
  position,
  width,
  height,
  wall,
  timber,
  parent,
  open = false,
  bevel = 0.008,
  interior = null,
) {
  const window = k.sub(position, 0, parent);
  if (open && interior) {
    windowRecess(
      k,
      [0, 0, 0],
      width,
      height,
      window,
      interior,
      wall,
      position[0] + position[1] * 0.37,
    );
    for (const side of [-1, 1]) {
      k.box(
        [width + 0.25, 0.11, 0.12],
        [0, side * (height / 2 + 0.055), 0.025],
        wall,
        window,
        0,
      );
      k.box(
        [0.11, height + 0.24, 0.12],
        [side * (width / 2 + 0.055), 0, 0.025],
        wall,
        window,
        0,
      );
    }
  } else {
    k.box([width + 0.25, height + 0.24, 0.1], [0, 0, 0], wall, window, bevel);
    k.box([width, height, 0.04], [0, 0, 0.065], k.m.dark, window, 0);
  }
  for (const side of [-1, 1]) {
    const shutter = k.sub(
      [side * (open ? width * 0.78 : width * 0.255), 0, 0.1],
      side * (open ? -0.15 : 0),
      window,
    );
    k.box([width * 0.49, height, 0.055], [0, 0, 0], timber, shutter, 0);
    for (let y = -height / 2 + 0.08; y < height / 2; y += 0.1) {
      k.box(
        [width * 0.44, 0.038, 0.035],
        [0, y, 0.034],
        timber,
        shutter,
        0,
        [0.18, 0, 0],
      );
    }
    for (const y of [-height * 0.34, height * 0.34])
      k.box([width * 0.49, 0.055, 0.025], [0, y, 0.061], k.m.iron, shutter, 0);
  }
  k.box(
    [width + 0.36, 0.095, 0.28],
    [0, -height / 2 - 0.105, 0.09],
    wall,
    window,
    bevel,
  );
}

/** The squero is a timber workshop around real open hulls, viewed across its canal. */
export function buildVenetianBoatyard(definition, renderer) {
  const k = createOutdoorKit(renderer, seedOf(definition, 5474), {
    sunPosition: [-13, 20, 9],
    sunColor: 0xe9eeed,
    sunIntensity: 1.9,
    skyColor: 0xb6c4c8,
    fogDensity: 0.008,
    exposure: 0.94,
  });
  const wood = weathered(
    k,
    k.m.cedar,
    [0x68554a, 0x746151, 0x806953, 0x63564a, 0x8a715c],
  );
  const tiles = weathered(
    k,
    k.m.terracotta,
    [0xb78363, 0x97785d, 0xb68e70, 0xc69972],
  );
  const wall = weathered(
    k,
    k.m.plaster,
    [0xb86853, 0xc18c72, 0xcfba9d, 0xd2b391],
  );
  const shutter = weathered(k, k.m.cedar, [0x4b5d4c, 0x526152]);
  const black = paintedHull(k);
  const bare = weathered(k, k.m.cedar, [0xa28a66], 0.79)[0];
  bare.side = THREE.DoubleSide;
  const palette = {
    black,
    bare,
    rail: k.material(0x292b25, 0.33),
    floor: wood[0],
    steel: k.material(0xb8bdba, 0.18, 0.97),
  };
  palette.steel.envMapIntensity = 1.45;
  const library = gondolaLibrary();
  const plants = streetPlants(k),
    coralFlower = k.material(0xbd6865, 0.94);
  coralFlower.side = THREE.DoubleSide;
  const windowGlass = k.material(0xb8c4c0, 0.15, 0.18);
  windowGlass.transparent = true;
  windowGlass.opacity = 0.24;
  windowGlass.depthWrite = false;
  windowGlass.envMapIntensity = 0.8;
  const windowRooms = {
    backing: weathered(k, k.m.plaster, [0x918572], 0.97)[0],
    curtain: weathered(k, k.m.linen, [0xdbd0b9], 0.98)[0],
    glass: windowGlass,
  };
  windowRooms.curtain.side = THREE.DoubleSide;
  const paving = streetPaving(k);
  k.box([74, 0.6, 78], [0, -0.82, -18], k.m.stone, k.group, 0);
  k.box([29, 0.5, 18], [0, -0.18, -6], k.m.stone, k.group, 0);
  paving({
    width: 27,
    depth: 15,
    position: [0, 0.07, -6.4],
    stoneSize: 0.53,
    material: k.m.stone,
    wear: [[-9.0, 4.1, 0.63]],
  });
  k.water({
    width: 56,
    depth: 7.5,
    position: [0, -0.46, 6.75],
    color: 0x526e64,
  });
  k.water({
    width: 5.5,
    depth: 55,
    position: [-17.4, -0.46, -21],
    color: 0x526e64,
  });
  paving({
    width: 4.8,
    depth: 44,
    position: [-22.65, 0.07, -24.0],
    stoneSize: 0.64,
    material: k.m.stone,
  });
  paving({
    width: 3.0,
    depth: 33,
    position: [-12.85, 0.07, -29.0],
    stoneSize: 0.62,
    material: k.m.stone,
  });
  for (const x of [-20.3, -14.52]) {
    k.box([0.38, 0.93, 47], [x, -0.2, -23.2], k.m.stone, k.group, 0.009);
    k.box([0.55, 0.13, 47], [x, 0.28, -23.2], k.m.stone, k.group, 0.009);
  }
  k.box([20.0, 0.93, 0.65], [-18.0, -0.2, -46.95], k.m.stone, k.group, 0.009);
  k.box([70, 0.25, 27], [0, -0.06, 24.0], k.m.stone, k.group, 0);
  paving({
    width: 50,
    depth: 6,
    position: [0, 0.08, 13.5],
    stoneSize: 0.65,
    material: k.m.stone,
    wear: [[1.1, -1.65, 0.73]],
  });
  paving({
    width: 2.2,
    depth: 13.2,
    position: [0.75, 0.08, 23.0],
    stoneSize: 0.48,
    material: k.m.stone,
  });
  k.box([50, 0.8, 0.47], [0, -0.26, 10.55], k.m.stone, k.group, 0.01);
  const waterline = weathered(k, k.m.stone, [0x4e6551, 0x75806b, 0x53695c]);
  for (let x = -24; x < 25; x += 0.77) {
    k.box(
      [0.75, 0.22, 0.09],
      [x, -0.3 + k.range(-0.04, 0.02), 10.3],
      choose(k, waterline),
      k.group,
      0,
    );
  }
  for (const side of [-1, 1]) {
    k.box(
      [10.3, 0.92, 0.58],
      [side * 8.7, -0.21, 2.88],
      k.m.stone,
      k.group,
      0.01,
    );
    for (let x = 3.6; x < 13.8; x += 0.71) {
      k.box(
        [0.69, 0.28, 0.12],
        [side * x, -0.29, 3.21],
        choose(k, waterline),
        k.group,
        0.008,
      );
      k.box(
        [0.7, 0.13, 0.72],
        [side * x, 0.28, 2.99],
        k.m.stone,
        k.group,
        0.012,
      );
    }
  }
  const slip = k.sub([0, -0.06, 1.3]);
  k.box([7.2, 0.18, 5.2], [0, 0, 0], k.m.stone, slip, 0.006, [0.18, 0, 0]);
  for (const x of [-2.3, 0, 2.3]) {
    k.box([0.2, 0.085, 5.0], [x, 0.1, -0.1], wood[0], slip, 0, [0.18, 0, 0]);
    for (let z = -2.35; z < 2.5; z += 0.38)
      k.box([0.48, 0.07, 0.075], [x, 0.11 - z * 0.18, z], wood[1], slip, 0);
  }

  const workshop = k.sub([-0.6, 0, -6.7]);
  k.box([11.6, 4.2, 3.0], [0, 2.17, -3.5], wood[0], workshop, 0);
  for (let i = 0; i < 51; i++) {
    const x = -5.7 + i * 0.228;
    const overOpening = [-3.9, -0.5, 3.0].some(
      (center) => Math.abs(x - center) < 1.02,
    );
    if (!overOpening)
      k.box([0.216, 2.4, 0.14], [x, 1.31, 0.005], choose(k, wood), workshop, 0);
    if (
      [-4.35, -1.5, 1.6, 4.35].some((center) => Math.abs(x - center) < 0.52)
    ) {
      k.box(
        [0.216, 0.415, 0.14],
        [x, 2.6925, 0.005],
        choose(k, wood),
        workshop,
        0,
      );
      k.box(
        [0.216, 0.435, 0.14],
        [x, 4.1975, 0.005],
        choose(k, wood),
        workshop,
        0,
      );
    } else
      k.box(
        [0.216, 1.93, 0.14],
        [x, 3.45, 0.005],
        choose(k, wood),
        workshop,
        0,
      );
  }
  for (const x of [-5.78, -2.6, 1.02, 4.28, 5.78]) {
    k.box([0.17, 4.4, 0.21], [x, 2.27, 0.05], wood[0], workshop, 0);
  }
  for (const y of [0.25, 2.52, 4.33])
    k.box([11.85, 0.17, 0.24], [0, y, 0.1], wood[0], workshop, 0);
  for (const x of [-3.9, -0.5, 3.0]) {
    k.box([2.15, 2.25, 0.06], [x, 1.23, -1.88], wood[2], workshop, 0);
    for (const side of [-1, 1])
      k.box(
        [0.1, 2.25, 1.85],
        [x + side * 1.08, 1.23, -0.91],
        wood[0],
        workshop,
        0,
      );
    k.box([2.18, 0.16, 0.35], [x, 2.4, 0.12], wood[0], workshop, 0);
    k.box(
      [0.72, 2.1, 0.07],
      [x - 1.13, 1.25, 0.41],
      wood[2],
      workshop,
      0,
      [0, -0.48, 0],
    );
    for (let y = 0.45; y < 2.3; y += 0.47)
      k.box([0.73, 0.07, 0.07], [x - 1.15, y, 0.44], wood[0], workshop, 0);
  }
  for (const x of [-4.35, -1.5, 1.6, 4.35]) {
    windowRecess(k, [x, 3.44, 0.1], 0.98, 1.08, workshop, windowRooms, wood[2]);
    for (const side of [-1, 1])
      k.box(
        [0.07, 1.19, 0.13],
        [x + side * 0.51, 3.44, 0.15],
        wood[1],
        workshop,
        0,
      );
    for (const y of [2.86, 3.44, 4.02])
      k.box([1.13, 0.065, 0.12], [x, y, 0.15], wood[1], workshop, 0);
    k.box([0.05, 1.1, 0.1], [x, 3.44, 0.16], wood[1], workshop, 0);
  }
  const roof = k.sub([0, 0, -2.4], 0, workshop);
  roofTiles(k, roof, {
    width: 13,
    depth: 7.4,
    height: 4.38,
    rise: 1.5,
    palette: tiles,
  });
  for (let x = -5.65; x < 5.8; x += 0.63) {
    k.rod([x, 3.6, 0.12], [x, 4.45, 1.08], 0.045, wood[0], workshop);
  }
  k.box([10.5, 0.14, 0.62], [0, 2.49, 0.35], wood[1], workshop, 0);
  for (let x = -5.12; x < 5.2; x += 0.22)
    k.box([0.043, 0.66, 0.058], [x, 2.9, 0.62], wood[0], workshop, 0);
  k.box([10.5, 0.07, 0.1], [0, 3.27, 0.62], wood[1], workshop, 0);
  for (let x = -4.7; x < 5; x += 1.4) {
    k.box([0.56, 0.16, 0.27], [x, 3.35, 0.59], k.m.terracotta, workshop, 0.004);
    for (let leaf = 0; leaf < 6; leaf++)
      k.sphere(
        0.08,
        [x + k.range(-0.24, 0.24), 3.49 + k.range(-0.02, 0.15), 0.6],
        k.m.leaf,
        workshop,
        [1, 0.65, 1],
      );
    for (const dx of [-0.13, 0.12])
      plants.flower([x + dx, 3.59, 0.62], 0.051, coralFlower, workshop);
  }
  for (let i = 0; i < 10; i++)
    k.box(
      [3.5 + k.range(-0.2, 0.2), 0.11, 0.23],
      [6.6, 0.17 + i * 0.12, -6.5],
      choose(k, wood),
      k.group,
      0,
    );
  const wing = k.sub([-10.2, 0, -4.4]);
  wing.name = "Open oar workshop";
  for (const x of [-2.64, 2.64])
    k.box([0.16, 3.1, 6.4], [x, 1.63, -2.4], wood[1], wing, 0.012);
  for (let z = -5.3; z < 0.6; z += 0.25)
    k.box(
      [0.035, 2.85, 0.24],
      [-2.545, 1.58, z],
      wood[Math.round((z + 5.3) / 0.25) % wood.length],
      wing,
      0.003,
    );
  k.box([5.4, 3.1, 0.16], [0, 1.63, -5.52], wood[1], wing, 0.012);
  k.box([5.4, 0.12, 6.4], [0, 0.09, -2.4], wood[0], wing, 0.008);
  for (let y = 0.22; y < 3.1; y += 0.19) {
    if (y < 2.37) {
      k.box(
        [1.96, 0.176, 0.12],
        [-1.73, y, 0.83],
        choose(k, wood),
        wing,
        0.008,
      );
      k.box([1.68, 0.176, 0.12], [1.87, y, 0.83], choose(k, wood), wing, 0.008);
    } else
      k.box([5.42, 0.176, 0.12], [0, y, 0.83], choose(k, wood), wing, 0.008);
  }
  k.mesh(
    flatPolygon(
      [
        [-2.7, 0],
        [2.7, 0],
        [0, 1.2],
      ],
      0.12,
    ),
    wood[1],
    [0, 3.15, 0.83],
    [0, 0, 0],
    wing,
  );
  for (let x = -2.58; x < 2.7; x += 0.22) {
    const height = 1.19 * (1 - Math.abs(x) / 2.7);
    k.box(
      [0.21, height, 0.08],
      [x, 3.15 + height / 2, 0.94],
      choose(k, wood),
      wing,
      0,
    );
  }
  k.rod([-2.7, 3.18, 0.95], [0, 4.38, 0.95], 0.063, wood[0], wing);
  k.rod([2.7, 3.18, 0.95], [0, 4.38, 0.95], 0.063, wood[0], wing);
  roofTiles(k, k.sub([0, 0, -2.4], 0, wing), {
    width: 7.4,
    depth: 6.5,
    height: 3.15,
    rise: 1.2,
    palette: tiles,
    axis: PI / 2,
  });
  for (const x of [-0.77, 1.035])
    shapedTimber(k, [x, 0.15, 0.83], [x, 2.41, 0.83], 0.12, wood[0], wing, {
      depth: 0.23,
      seed: x,
      relief: 0.001,
    });
  shapedTimber(
    k,
    [-0.86, 2.42, 0.84],
    [1.13, 2.42, 0.84],
    0.14,
    wood[0],
    wing,
    { depth: 0.23, seed: 2, relief: 0.001 },
  );
  for (const [x, angle, sign] of [
    [-0.76, -Math.PI + 0.12, 1],
    [1.025, Math.PI - 0.1, -1],
  ]) {
    const door = k.sub([x, 0.16, 0.92], angle, wing);
    for (let i = 0; i < 5; i++)
      shapedTimber(
        k,
        [sign * (0.082 + i * 0.166), 0, 0],
        [sign * (0.082 + i * 0.166), 2.18, 0],
        0.162,
        wood[i % wood.length],
        door,
        { depth: 0.055, seed: i + x, relief: 0.0007 },
      );
    for (const y of [0.27, 1.82]) {
      k.box([0.77, 0.065, 0.035], [sign * 0.4, y, 0.045], wood[1], door, 0.003);
      k.box([0.32, 0.04, 0.01], [sign * 0.16, y, 0.07], k.m.iron, door, 0.003);
    }
  }
  const innerBench = k.sub([-1.66, 0.15, -1.45], Math.PI / 2, wing);
  k.box([2.7, 0.1, 0.74], [0, 0.85, 0], wood[2], innerBench, 0.012);
  for (const x of [-1.13, 1.13])
    for (const z of [-0.25, 0.25])
      shapedTimber(k, [x, 0, z], [x, 0.8, z], 0.11, wood[0], innerBench);
  for (let i = 0; i < 3; i++)
    shapedTimber(
      k,
      [-1.1, 0.92 + i * 0.045, 0],
      [1.05, 0.92 + i * 0.045, 0],
      0.04,
      bare,
      innerBench,
      { depth: 0.14, relief: 0.0005, seed: i },
    );
  k.box([0.22, 0.08, 0.06], [0.15, 1.1, 0.12], wood[0], innerBench, 0.01);
  k.cylinder(0.045, 0.14, [-0.5, 0.97, 0.2], k.m.iron, innerBench);
  for (let i = 0; i < 6; i++) {
    const z = -1.4 - i * 0.57;
    k.tube(
      [
        [-2.35, 0.35, z],
        [-1.75, 0.5, z],
        [-1.37, 1.02, z],
        [-1.21, 1.7, z],
      ],
      0.035,
      bare,
      wing,
    );
  }
  for (const y of [0.8, 1.55, 2.24])
    k.box([1.8, 0.065, 0.37], [1.55, y, -4.85], wood[0], wing, 0.004);
  for (let i = 0; i < 8; i++)
    k.cylinder(
      0.08,
      0.17,
      [1.0 + (i % 4) * 0.32, 0.93 + Math.floor(i / 4) * 0.75, -4.83],
      i % 3 ? wood[2] : k.m.iron,
      wing,
    );
  k.rod([0.2, 3.12, -1.4], [0.2, 2.55, -1.4], 0.004, k.m.iron, wing);
  k.lathe(
    [
      [0.18, 0],
      [0.16, 0.03],
      [0.055, 0.17],
      [0.025, 0.18],
    ],
    [0.2, 2.39, -1.4],
    k.m.iron,
    wing,
  );
  const lamp = new THREE.PointLight(0xffd6a2, 8, 6, 2);
  lamp.position.set(0.2, 2.38, -1.4);
  wing.add(lamp);
  const bulb = k.material(0xffe1ad, 0.5);
  bulb.emissive.set(0xffc980);
  bulb.emissiveIntensity = 0.8;
  k.sphere(0.035, [0.2, 2.42, -1.4], bulb, wing);

  for (const [x, z, width, height, depth, angle, color] of [
    [11.6, -5.2, 10.7, 7.2, 5.0, -PI / 2, 0],
    [-13.1, -13.3, 11.5, 7.8, 4.1, 0, 1],
    [9.8, 17.2, 16, 8.7, 4.2, PI, 1],
    [-8.1, 17.2, 15.5, 7.5, 4.4, PI, 2],
    [21, -0.5, 12, 8.2, 4.5, 0, 3],
    [-24, -3.3, 10, 9.0, 4.5, 0, 1],
    [-25.1, -16.2, 15.0, 8.6, 5.0, PI / 2, 1],
    [-25.1, -33.1, 18.6, 9.3, 5.0, PI / 2, 2],
    [-11.35, -28.0, 21.6, 8.8, 5.0, -PI / 2, 0],
    [-18.0, -47.3, 19.0, 9.0, 5.0, 0, 1],
    [-3.2, -24.6, 14.0, 9.2, 5.0, 0, 3],
    [12.0, -29.6, 20.2, 9.8, 5.5, 0, 2],
    [26.0, -16.0, 17.5, 9.1, 5.0, -PI / 2, 1],
    [24.1, 17.2, 13.2, 8.5, 4.6, PI, 3],
    [-23.1, 17.2, 14.5, 8.4, 4.6, PI, 1],
    [0.6, 29.6, 11.5, 8.6, 4.6, PI, 2],
  ]) {
    const house = k.sub([x, 0, z], angle);
    const distant = z < -18 || z > 26 || Math.abs(x) > 24;
    const windows = [];
    for (const y of [2.0, 4.8, 7.0]) {
      if (y + 0.7 > height) continue;
      for (let wx = -width / 2 + 1.2; wx < width / 2 - 0.5; wx += 2.35) {
        windows.push({
          x: wx,
          y,
          width: 0.94,
          height: 1.48,
          open: k.random() < 0.4 && !distant,
        });
      }
    }
    facadeWithWindows(
      k,
      house,
      width,
      height,
      depth,
      wall[color],
      windows.filter((window) => window.open),
    );
    k.box(
      [width + 0.1, 0.36, depth + 0.1],
      [0, -0.06, -depth / 2],
      k.m.stone,
      house,
      0,
    );
    k.box([width + 0.1, 0.55, 0.14], [0, 0.35, 0.025], k.m.stone, house, 0);
    for (const window of windows) {
      shutterWindow(
        k,
        [window.x, window.y, 0.06],
        window.width,
        window.height,
        wall[2],
        shutter[0],
        house,
        window.open,
        distant ? 0 : 0.008,
        windowRooms,
      );
    }
    roofTiles(k, k.sub([0, 0, -depth / 2], 0, house), {
      width: width + 0.65,
      depth: depth + 0.9,
      height: height + 0.12,
      rise: 1.15,
      palette: tiles,
      tileScale: distant ? 1.35 : 1,
    });
    k.tube(
      [
        [-width / 2 + 0.16, height, 0.08],
        [-width / 2 + 0.16, height - 0.35, 0.23],
        [-width / 2 + 0.16, 0.35, 0.23],
      ],
      0.045,
      k.m.iron,
      house,
    );
    for (let patch = 0; patch < 10; patch++) {
      const w = k.range(0.12, 0.48),
        h = k.range(0.08, 0.23);
      const chip = flatPolygon(
        [
          [-w, 0],
          [-w * 0.45, h],
          [w * 0.48, h * 0.7],
          [w, 0.02],
          [w * 0.35, -0.07],
        ],
        0.005,
      );
      k.mesh(
        chip,
        k.m.brick,
        [k.range(-width / 2 + 0.3, width / 2 - 0.3), k.range(0.6, 1.0), 0.023],
        [0, 0, 0],
        house,
      );
    }
  }
  const warehouse = k.sub([4.7, 0, -14.3]);
  k.box([11.5, 7.35, 7.0], [0, 3.675, -3.5], wall[1], warehouse, 0.012);
  k.box([11.6, 0.32, 7.1], [0, -0.06, -3.5], k.m.stone, warehouse, 0);
  k.box([11.65, 0.15, 0.27], [0, 3.65, 0.08], wall[3], warehouse, 0.008);
  for (const x of [-4.35, -2.25, 2.9, 4.7]) {
    shutterWindow(
      k,
      [x, 5.3, 0.06],
      0.83,
      1.52,
      wall[2],
      shutter[1],
      warehouse,
      false,
      0,
    );
  }
  for (const x of [-4.35, 4.35]) {
    shutterWindow(
      k,
      [x, 1.92, 0.06],
      1.06,
      1.7,
      wall[2],
      shutter[1],
      warehouse,
      false,
      0,
    );
  }
  for (const [y, width, height] of [
    [1.44, 2.9, 2.78],
    [5.03, 1.54, 2.25],
  ]) {
    k.box([width, height, 0.055], [0.45, y, 0.045], k.m.dark, warehouse, 0);
    const boards = Math.ceil(width / 0.14);
    for (let i = 0; i < boards; i++) {
      k.box(
        [width / boards - 0.006, height - 0.06, 0.07],
        [0.45 - width / 2 + ((i + 0.5) * width) / boards, y, 0.1],
        wood[i % wood.length],
        warehouse,
        0,
      );
    }
    for (const side of [-1, 1]) {
      k.box(
        [width, 0.095, 0.07],
        [0.45, y + side * height * 0.31, 0.16],
        wood[0],
        warehouse,
        0,
      );
      k.box(
        [0.1, height + 0.18, 0.17],
        [0.45 + side * (width / 2 + 0.07), y, 0.1],
        wall[3],
        warehouse,
        0,
      );
    }
  }
  k.rod([0.45, 6.65, 0.04], [0.45, 6.65, 1.18], 0.066, wood[0], warehouse);
  k.rod([0.45, 6.1, 0.07], [0.45, 6.63, 0.93], 0.034, k.m.iron, warehouse);
  k.ring(0.095, 0.02, [0.45, 6.46, 1.02], k.m.iron, warehouse, [0, 0, 0]);
  k.rod([0.45, 6.46, 1.02], [0.45, 4.02, 1.02], 0.013, k.m.linen, warehouse);
  roofTiles(k, k.sub([0, 0, -3.5], 0, warehouse), {
    width: 12.25,
    depth: 7.85,
    height: 7.4,
    rise: 1.1,
    palette: tiles,
  });
  for (const x of [-3.6, 3.4]) {
    k.box([0.46, 1.05, 0.51], [x, 8.57, -3.65], k.m.brick, warehouse, 0);
    k.box([0.59, 0.1, 0.63], [x, 9.15, -3.65], k.m.stone, warehouse, 0.008);
  }
  const bridge = k.sub([-17.45, 0, -10.4]);
  const bridgeSide = [];
  for (let i = 0; i <= 24; i++) {
    const x = -3.8 + (i / 24) * 7.6;
    bridgeSide.push([x, 0.33 + 1.6 * Math.sin((i / 24) * PI)]);
  }
  for (let i = 24; i >= 0; i--) {
    const x = -3.8 + (i / 24) * 7.6;
    bridgeSide.push([x, 0.1 + 1.08 * Math.sin((i / 24) * PI)]);
  }
  for (const z of [-0.83, 0.83])
    k.mesh(
      flatPolygon(bridgeSide, 0.28),
      k.m.stone,
      [0, 0, z],
      [0, 0, 0],
      bridge,
    );
  for (let i = 0; i < 23; i++) {
    const x = -3.65 + i * 0.33;
    k.box(
      [0.35, 0.18, 1.68],
      [x, 0.29 + 1.57 * Math.sin(((x + 3.8) / 7.6) * PI), 0.12],
      k.m.stone,
      bridge,
      0.006,
    );
  }
  gondola(k, library, [-0.8, 0.67, -2.15], PI / 2 + 0.1, palette);
  gondola(k, library, [1.2, 0.56, 1.08], PI / 2 - 0.12, palette, {
    unfinished: true,
  });
  gondola(k, library, [-6.3, -0.15, 5.6], PI / 2 + 0.04, palette);
  gondola(k, library, [8.4, 0.64, -1.65], 0.11, palette, { unfinished: true });
  for (const [x, z, angle] of [
    [-3.6, -2.5, PI / 2],
    [2.15, -1.85, PI / 2],
    [-1.5, 0.8, PI / 2],
    [3.7, 1.4, PI / 2],
    [8.4, -4.6, 0],
    [8.4, 1.2, 0],
  ]) {
    sawhorse(k, [x, 0.1, z], angle, wood[2]);
  }
  for (const [x, z] of [
    [-11, 2.8],
    [-5, 3],
    [6.4, 3.0],
    [13, 3],
    [-9.0, 10.4],
  ]) {
    const post = k.cylinder(
      0.13,
      1.75,
      [x, 0.03, z],
      wood[1],
      k.group,
      0.17,
      12,
    );
    post.rotation.z = k.range(-0.035, 0.035);
    for (const y of [0.35, 0.48]) k.ring(0.145, 0.025, [x, y, z], k.m.iron);
    ropeCoil(k, [x + 0.35, 0.34, z - 0.35], k.group, 0.28);
  }
  k.tube(
    [
      [-5, 0.49, 3],
      [-5.5, 0.22, 4.1],
      [-6.8, 0.47, 5.47],
    ],
    0.022,
    k.m.linen,
  );
  k.tube(
    [
      [-11, 0.46, 2.8],
      [-11.9, -0.12, 4.1],
      [-11.45, 0.7, 5.65],
    ],
    0.019,
    k.m.linen,
  );
  for (const x of [-9.9, -9.1, -8.3]) {
    const oar = k.sub([x, 0.12, -1.1], -0.25);
    shapedTimber(k, [0, 0.025, 0.2], [0, 0.025, -2.7], 0.052, bare, oar, {
      round: true,
      taper: 0.15,
      bend: 0.005,
      relief: 0.0003,
      seed: x,
    });
    shapedTimber(k, [0, 0.025, -2.6], [0, 0.017, -3.8], 0.24, bare, oar, {
      round: true,
      taper: 0,
      depth: 0.024,
      relief: 0.00015,
      section: (t) => [
        0.19 + 0.81 * Math.sin(Math.PI * t) ** 0.55,
        1 - t * 0.55,
      ],
    });
  }
  const workbench = k.sub([-9.1, 0.076, -2.35]);
  const benchSurface = k.surfaceMaterial("weathered-wood", {
    color: 0xe0d6c5,
    scale: 1.0,
    normalStrength: 0.22,
  });
  k.box([2.1, 0.1, 0.8], [0, 0.83, 0], benchSurface, workbench, 0.012);
  for (const x of [-0.86, 0.86])
    for (const z of [-0.28, 0.28])
      k.box([0.13, 0.8, 0.13], [x, 0.4, z], wood[1], workbench, 0);
  k.box([0.32, 0.065, 0.12], [-0.3, 0.923, 0.1], wood[0], workbench);
  k.box([0.07, 0.1, 0.085], [-0.32, 0.97, 0.1], k.m.iron, workbench);
  k.rod([0.4, 0.9, -0.2], [0.66, 0.93, -0.14], 0.02, wood[2], workbench);
  k.box([0.075, 0.06, 0.19], [0.69, 0.93, -0.14], k.m.iron, workbench);
  shapedTimber(
    k,
    [-1.48, 0.945, -0.03],
    [0.83, 0.95, 0.07],
    0.05,
    bare,
    workbench,
    { round: true, taper: 0.17, bend: 0.005, relief: 0.00025, seed: 8 },
  );
  shapedTimber(
    k,
    [0.75, 0.95, 0.07],
    [1.89, 0.95, 0.07],
    0.027,
    bare,
    workbench,
    {
      round: true,
      taper: 0,
      depth: 0.25,
      relief: 0.00015,
      seed: 12,
      section: (t) => [1 - 0.45 * t, 0.2 + 0.8 * Math.sin(Math.PI * t) ** 0.5],
    },
  );
  for (const x of [0.69, 0.84]) {
    k.box([0.028, 0.24, 0.028], [x, 0.89, 0.19], k.m.iron, workbench, 0.003);
    for (const y of [0.777, 1.006])
      k.box([0.028, 0.025, 0.22], [x, y, 0.09], k.m.iron, workbench, 0.003);
    k.cylinder(
      0.006,
      0.082,
      [x, 1.0, 0.05],
      palette.steel,
      workbench,
      0.006,
      12,
    );
    for (let y = 0.983; y < 1.044; y += 0.005)
      k.ring(0.006, 0.0012, [x, y, 0.05], palette.steel, workbench);
    k.cylinder(0.022, 0.007, [x, 0.962, 0.05], palette.steel, workbench);
    k.rod(
      [x - 0.036, 1.047, 0.05],
      [x + 0.036, 1.047, 0.05],
      0.003,
      palette.steel,
      workbench,
    );
  }
  foldedTextile(k, [-0.76, 0.882, 0.19], 0.35, 0.25, workbench, k.m.paper);
  const shaving = shavingGeometry();
  for (let i = 0; i < 38; i++) {
    const a = k.range(0, PI * 2),
      x = k.range(-0.7, 0.7),
      z = k.range(-0.3, 0.3);
    k.mesh(shaving, bare, [x, 0.883, z], [0, a, 0], workbench);
  }
  for (let i = 0; i < 25; i++)
    k.mesh(
      shaving,
      bare,
      [-9.0 + k.range(-0.6, 0.4), 0.115, -1.88 + k.range(-0.13, 0.38)],
      [0, k.range(0, PI * 2), 0],
    );
  const varnish = k.lathe(
    [
      [0.09, 0],
      [0.09, 0.16],
      [0.084, 0.16],
      [0.084, 0.015],
      [0, 0.015],
    ],
    [-0.86, 0.882, -0.24],
    k.m.iron,
    workbench,
  );
  varnish.name = "Open finishing tin";
  k.cylinder(
    0.081,
    0.004,
    [-0.86, 0.997, -0.24],
    k.material(0x563b21, 0.2),
    workbench,
  );
  shapedTimber(
    k,
    [-0.62, 0.892, -0.24],
    [-0.46, 0.892, -0.22],
    0.018,
    wood[2],
    workbench,
    { depth: 0.035, relief: 0.0002 },
  );
  for (let i = 0; i < 13; i++)
    k.rod(
      [-0.46, 0.891, -0.237 + i * 0.0025],
      [-0.42, 0.888, -0.237 + i * 0.0025],
      0.001,
      k.m.linen,
      workbench,
    );
  const printWidth = 0.38,
    printHeight = (printWidth * 1520) / 822;
  const print = k.sub([-8.4, 1.8, -3.48]);
  k.box(
    [printWidth + 0.07, printHeight + 0.07, 0.027],
    [0, 0, -0.016],
    wood[1],
    print,
    0.003,
  );
  k.poster([0, 0, 0.002], {
    width: printWidth,
    height: printHeight,
    parent: print,
    image: "/public/outdoors/detail-assets/canal-etching.jpg",
  });
  for (const side of [-1, 1]) {
    k.box(
      [printWidth + 0.075, 0.025, 0.027],
      [0, side * (printHeight / 2 + 0.024), 0.008],
      wood[0],
      print,
      0.002,
    );
    k.box(
      [0.025, printHeight + 0.075, 0.027],
      [side * (printWidth / 2 + 0.024), 0, 0.008],
      wood[0],
      print,
      0.002,
    );
  }
  k.tree([-11, 0.1, -9], { height: 7.7, radius: 2.3, kind: "broadleaf" });
  k.tree([9.6, 0.1, -12.5], { height: 7.1, radius: 2.1, kind: "broadleaf" });
  plants.pot([11.41, 4.003, -2.3], 0.5, coralFlower);
  return k.finish(
    definition,
    {
      arrival: outdoorView(
        "Across the working canal",
        [0, 1.73, 11.8],
        [-0.2, 2.12, -4.8],
        65,
      ),
      gondola: outdoorView(
        "Curved prow and forged ferro",
        [6.85, 1.72, -5.75],
        [4.18, 1.95, -2.67],
        55,
      ),
      workshop: outdoorView(
        "Oar repair and timberwork",
        [-6.1, 1.72, -0.8],
        [-9.1, 1.13, -2.35],
        59,
      ),
      canal: outdoorView(
        "Stone slipway and canal",
        [5.8, 1.73, 0.9],
        [-3.5, 0.22, 5.0],
        65,
      ),
    },
    [
      [4.27, 1.94, -2.67],
      [0, 0.2, 2.2],
      [-0.6, 3.1, -6.65],
      [-4.0, -0.38, 6.4],
    ],
  );
}

function clipPolygon(polygon, a, b, threshold) {
  const result = [];
  for (let i = 0; i < polygon.length; i++) {
    const start = polygon[i],
      end = polygon[(i + 1) % polygon.length];
    const ds = a * start[0] + b * start[1] - threshold;
    const de = a * end[0] + b * end[1] - threshold;
    if (ds <= 1e-8) result.push(start);
    if (ds < 0 !== de < 0) {
      const t = ds / (ds - de);
      result.push([
        start[0] + t * (end[0] - start[0]),
        start[1] + t * (end[1] - start[1]),
      ]);
    }
  }
  return result;
}

const fittedStoneMaterials = new WeakMap();

function polygonStone(points, depth, color, detail) {
  const seed = points.reduce((sum, p) => sum + p[0] * 7.3 + p[1] * 19.1, 0);
  const geometry = dressedStoneGeometry(points, depth, seed, detail);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i);
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function polygonWall(
  k,
  position,
  width,
  height,
  angle,
  palette,
  boundary = null,
) {
  if (!fittedStoneMaterials.has(palette)) {
    const material = k.ownMaterial(palette[0].clone());
    material.color.set(0xffffff);
    material.vertexColors = true;
    material.onBeforeCompile = palette[0].onBeforeCompile;
    material.customProgramCacheKey = palette[0].customProgramCacheKey;
    fittedStoneMaterials.set(palette, material);
  }
  const faceMaterial = fittedStoneMaterials.get(palette);
  const wall = k.sub(position, angle);
  const outline = boundary ?? [
    [-width / 2, 0],
    [width / 2, 0],
    [width / 2, height],
    [-width / 2, height],
  ];
  const sites = [];
  const cells = new Map();
  for (let row = 0; row < height / 0.75 + 1; row++) {
    for (let col = 0; col < width / 1.18 + 1; col++) {
      sites.push([
        -width / 2 + (col + (row % 2) * 0.48) * 1.18 + k.range(-0.28, 0.28),
        0.3 + row * 0.75 + k.range(-0.22, 0.22),
      ]);
    }
  }
  k.box([width, height, 0.7], [0, height / 2, -0.24], palette[0], wall, 0);
  if (position[1] < 1)
    k.box([width + 0.025, 0.42, 0.84], [0, -0.15, -0.2], palette[0], wall, 0);
  for (let i = 0; i < sites.length; i++) {
    const a = sites[i];
    let polygon = outline;
    for (let j = 0; j < sites.length && polygon.length >= 3; j++) {
      if (i === j) continue;
      const b = sites[j];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 3.8) continue;
      polygon = clipPolygon(
        polygon,
        b[0] - a[0],
        b[1] - a[1],
        (b[0] ** 2 + b[1] ** 2 - a[0] ** 2 - a[1] ** 2) / 2,
      );
    }
    if (polygon.length >= 3) {
      const depth = k.range(0.177, 0.184),
        color = choose(k, palette).color;
      const cell = Math.floor(a[0] / 12);
      if (!cells.has(cell)) cells.set(cell, { near: [], far: [] });
      cells.get(cell).near.push(polygonStone(polygon, depth, color));
      cells
        .get(cell)
        .far.push(
          polygonStone(polygon, depth, color, { edgeStep: 0.24, rings: 4 }),
        );
    }
  }
  for (const pieces of cells.values())
    staticDetailLevels(k, {
      ...pieces,
      material: faceMaterial,
      parent: wall,
      distance: 12,
    });
  return wall;
}

function colonialUpper(
  k,
  position,
  width,
  height,
  angle,
  plaster,
  wood,
  tiles,
  balcony = false,
) {
  const house = k.sub(position, angle);
  k.box([width, height, 3.4], [0, height / 2, -1.8], plaster, house, 0.012);
  for (let x = -width / 2 + 1.15; x < width / 2 - 0.5; x += 2.6) {
    shutterWindow(
      k,
      [x, height * 0.5, -0.025],
      1.0,
      1.4,
      plaster,
      wood,
      house,
      false,
    );
    if (balcony) {
      const b = k.sub([x, 0.28, 0.1], 0, house);
      k.box([1.5, 0.15, 0.68], [0, 0, 0.26], wood, b);
      for (const z of [0.01, 0.57])
        k.box([1.5, 0.06, 0.07], [0, 0.91, z], wood, b);
      for (const side of [-1, 1])
        k.box([0.07, 0.94, 0.65], [side * 0.72, 0.45, 0.27], wood, b, 0);
      for (let i = 0; i < 12; i++) {
        k.lathe(
          [
            [0.024, 0],
            [0.024, 0.15],
            [0.04, 0.26],
            [0.014, 0.35],
            [0.024, 0.62],
            [0.028, 0.76],
          ],
          [-0.65 + i * 0.118, 0.1, 0.57],
          wood,
          b,
          8,
        );
      }
      for (const side of [-1, 1])
        k.rod(
          [side * 0.52, -0.42, -0.1],
          [side * 0.52, -0.06, 0.46],
          0.045,
          wood,
          b,
        );
      for (const side of [-1, 1]) {
        k.mesh(
          flatPolygon(
            [
              [-0.11, 0],
              [-0.06, 0.05],
              [0.04, 0.026],
              [0.13, -0.013],
              [0.035, -0.053],
              [-0.08, -0.036],
            ],
            0.004,
          ),
          k.m.stone,
          [x + side * 0.63, 0.22, -0.095],
          [0, 0, side * 0.18],
          house,
        );
      }
    }
  }
  roofTiles(k, k.sub([0, 0, -1.3], 0, house), {
    width: width + 0.6,
    depth: 4.2,
    height,
    rise: 0.8,
    palette: tiles,
  });
  for (let x = -width / 2 + 0.15; x < width / 2; x += 0.4)
    k.box([0.08, 0.09, 0.74], [x, height - 0.035, 0.08], wood, house, 0);
  return house;
}

function streetLantern(k, position, angle) {
  const lantern = k.sub(position, angle);
  k.box([0.12, 0.29, 0.045], [0, 0, 0], k.m.iron, lantern);
  k.tube(
    [
      [0, 0.06, 0.04],
      [0, 0.29, 0.19],
      [0, 0.24, 0.45],
      [0, 0.09, 0.46],
    ],
    0.021,
    k.m.iron,
    lantern,
  );
  for (const x of [-0.13, 0.13])
    for (const z of [0.33, 0.59])
      k.rod(
        [x, -0.28, z],
        [x * 0.76, -0.62, 0.46 + (z - 0.46) * 0.76],
        0.012,
        k.m.iron,
        lantern,
      );
  k.box([0.32, 0.055, 0.32], [0, -0.26, 0.46], k.m.iron, lantern);
  k.box([0.24, 0.045, 0.24], [0, -0.64, 0.46], k.m.iron, lantern);
  k.cylinder(0.035, 0.24, [0, -0.46, 0.46], k.m.cream, lantern, 0.035, 12);
  const shade = k.material(0xcab98e, 0.74);
  shade.emissive.set(0xffc783);
  shade.emissiveIntensity = 0.23;
  k.box([0.18, 0.26, 0.18], [0, -0.455, 0.46], shade, lantern, 0.004);
}

/** Individually fitted andesite lines a lived-in, anonymous highland lane. */
export function buildAndeanLane(definition, renderer) {
  const k = createOutdoorKit(renderer, seedOf(definition, 1204), {
    sunPosition: [-7, 13, -20],
    sunColor: 0xffdfb6,
    sunIntensity: 3.35,
    skyColor: 0xa9c5d8,
    fogDensity: 0.009,
    exposure: 0.89,
  });
  const stone = weathered(
    k,
    k.m.stone,
    [0x817e70, 0x928e7d, 0xa09a87, 0x8d8978, 0x969181, 0xa7a08b, 0x77796f],
    0.96,
  );
  for (const material of stone) {
    material.normalScale.set(0.24, 0.24);
    material.roughnessMap = null;
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `
        #include <map_fragment>
        #ifdef USE_MAP
          diffuseColor.rgb = mix(diffuse * vec3(0.42, 0.42, 0.40), diffuseColor.rgb, 0.28);
        #endif
      `,
      );
    };
    material.customProgramCacheKey = () => "andean-andesite-subdued-albedo-v1";
  }
  const plaster = weathered(
    k,
    k.m.plaster,
    [0xe3d2ac, 0xd9cbae, 0xe4d4b7, 0xcaac86],
  );
  const timber = weathered(k, k.m.cedar, [0x5a4431, 0x4c4033, 0x635240]);
  const tiles = weathered(k, k.m.terracotta, [0xab7959, 0xbb8964, 0x8f735b]);
  const paving = streetPaving(k);
  k.box([46, 0.24, 78], [-1.5, -0.16, -12.0], k.m.cobble, k.group, 0);
  paving({
    width: 5.5,
    depth: 47,
    position: [0, -0.03, -5],
    stoneSize: 0.27,
    material: k.m.cobble,
    wear: [
      [-1.0, 8.3, 0.47],
      [-1.4, -1.0, 0.41],
    ],
  });
  // A worn, gently irregular central strip and open gutters preserve the street's scale.
  for (let z = -28; z < 18; z += 0.66) {
    k.box(
      [0.78 + k.range(-0.06, 0.06), 0.065, 0.63],
      [0, 0.022 + k.range(-0.004, 0.004), z],
      choose(k, stone),
      k.group,
      0.015,
    );
    for (const side of [-1, 1])
      k.box([0.18, 0.027, 0.64], [side * 2.26, 0.01, z], k.m.dark, k.group, 0);
  }
  for (const side of [-1, 1]) {
    for (let z = -27.8; z < 18; z += 0.44)
      k.box(
        [0.25, 0.13, 0.426],
        [side * 2.48, 0.045, z],
        choose(k, stone),
        k.group,
        0.025,
      );
  }
  polygonWall(k, [2.77, 0.11, -0.8], 4.4, 3.38, -PI / 2, stone);
  polygonWall(k, [2.77, 0.11, 8.0], 13.2, 3.38, -PI / 2, stone);
  polygonWall(k, [2.77, 0.11, -10.4], 14.8, 3.38, -PI / 2, stone);
  polygonWall(k, [2.77, 3.49, -1.4], 31.6, 0.65, -PI / 2, stone);
  polygonWall(k, [-2.8, 0.11, 6.0], 21, 3.12, PI / 2, stone);
  polygonWall(k, [-2.8, 0.11, -12.6], 10.2, 2.9, PI / 2, stone);
  for (const [x, z, width, bottom, height, angle, color, balcony] of [
    [2.94, 9.1, 10.6, 4.1, 2.6, -PI / 2, 0, false],
    [2.94, -1.6, 10.8, 4.1, 2.72, -PI / 2, 1, false],
    [2.94, -12.1, 10.2, 4.1, 2.48, -PI / 2, 2, false],
    [-2.97, 10.1, 12.0, 3.15, 3.12, PI / 2, 2, false],
    [-2.97, -0.4, 8.8, 3.15, 2.7, PI / 2, 0, true],
    [-2.97, -12.6, 10.2, 2.98, 3.06, PI / 2, 3, false],
  ]) {
    colonialUpper(
      k,
      [x, bottom, z],
      width,
      height,
      angle,
      plaster[color],
      timber[0],
      tiles,
      balcony,
    );
  }
  // The side passage has actual paving, several stepped thresholds, and receding walls.
  paving({
    width: 13.5,
    depth: 3.0,
    position: [-9.6, 0.005, -6.0],
    stoneSize: 0.29,
  });
  polygonWall(k, [-9.6, 0.1, -4.5], 13.3, 2.95, PI, stone);
  polygonWall(k, [-9.6, 0.1, -7.55], 13.3, 3.12, 0, stone);
  colonialUpper(
    k,
    [-9.6, 3.05, -4.57],
    13.3,
    2.7,
    PI,
    plaster[2],
    timber[1],
    tiles,
  );
  colonialUpper(
    k,
    [-9.6, 3.22, -7.48],
    13.3,
    2.6,
    0,
    plaster[0],
    timber[1],
    tiles,
  );
  for (let step = 0; step < 5; step++) {
    k.box(
      [0.44, 0.12 + step * 0.13, 2.88],
      [-4.7 - step * 0.45, 0.06 + step * 0.065, -6],
      choose(k, stone),
      k.group,
      0.014,
    );
  }
  k.box([9.2, 0.66, 2.88], [-11.3, 0.3, -6.0], k.m.cobble, k.group, 0.012);
  paving({
    width: 9.2,
    depth: 2.88,
    position: [-11.3, 0.638, -6.0],
    stoneSize: 0.34,
  });
  for (const [x, ground] of [
    [-5.1, 0.25],
    [-5.9, 0.51],
    [-6.65, 0.64],
  ]) {
    k.rod([x, ground, -7.22], [x, ground + 0.8, -7.22], 0.014, k.m.iron);
  }
  k.tube(
    [
      [-4.75, 0.94, -7.22],
      [-5.6, 1.2, -7.22],
      [-6.6, 1.45, -7.22],
      [-8.0, 1.45, -7.22],
    ],
    0.021,
    timber[1],
  );
  polygonWall(k, [-16.0, 0.65, -5.0], 0.9, 3.4, PI / 2, stone);
  polygonWall(k, [-16.0, 0.65, -7.0], 0.9, 3.4, PI / 2, stone);
  polygonWall(k, [-16.0, 2.85, -6.0], 1.1, 1.2, PI / 2, stone);
  const passageRoom = k.sub([-16.0, 0.65, -6.0], PI / 2);
  const passagePlaster = k.surfaceMaterial("worn-plaster", {
    color: 0xdfd2b5,
    scale: 1.2,
    normalStrength: 0.18,
  });
  k.box([1.12, 0.13, 1.75], [0, -0.055, -0.83], k.m.stone, passageRoom, 0.006);
  k.box([1.25, 2.22, 0.14], [0, 1.1, -1.68], passagePlaster, passageRoom, 0);
  for (const side of [-1, 1])
    k.box(
      [0.13, 2.22, 1.76],
      [side * 0.61, 1.1, -0.84],
      plaster[0],
      passageRoom,
      0,
    );
  const passageDoor = k.sub([-0.53, 0, -0.02], 0.66, passageRoom);
  for (let board = 0; board < 7; board++) {
    k.box(
      [0.126, 2.04, 0.065],
      [0.067 + board * 0.13, 1.06, 0],
      timber[2],
      passageDoor,
      0.002,
    );
  }
  for (const y of [0.4, 1.74])
    k.box([0.93, 0.1, 0.08], [0.46, y, -0.025], timber[1], passageDoor, 0);
  k.box([1.35, 0.09, 0.42], [-8.1, 1.055, -5.0], timber[2], k.group, 0.006);
  for (const x of [-8.62, -7.58])
    for (const z of [-5.14, -4.86]) {
      k.box([0.065, 0.37, 0.065], [x, 0.827, z], timber[1], k.group, 0);
    }
  foldedTextile(k, [-8.0, 1.103, -5.0], 0.42, 0.29, k.group, k.m.jade);
  k.lathe(
    [
      [0, 0],
      [0.12, 0],
      [0.15, 0.05],
      [0.18, 0.29],
      [0.2, 0.31],
      [0.2, 0.345],
      [0.172, 0.345],
      [0.158, 0.29],
      [0.126, 0.04],
      [0, 0.04],
    ],
    [-7.15, 0.643, -4.94],
    k.m.terracotta,
    k.group,
    24,
  );
  const hangingCloth = new THREE.PlaneGeometry(0.24, 0.53, 8, 12);
  const clothVertices = hangingCloth.attributes.position;
  for (let i = 0; i < clothVertices.count; i++) {
    clothVertices.setZ(
      i,
      Math.sin(clothVertices.getX(i) * 44) * 0.018 +
        0.025 * (clothVertices.getY(i) + 0.265) ** 2,
    );
  }
  hangingCloth.computeVertexNormals();
  k.mesh(hangingCloth, k.m.linen, [-9.2, 1.4, -4.79], [0, PI, 0]);
  k.rod([-9.35, 1.685, -4.79], [-9.05, 1.685, -4.79], 0.013, timber[1]);

  // End streets turn away behind complete buildings, not a flat photographic background.
  paving({
    width: 19,
    depth: 4.5,
    position: [0, -0.01, -21.0],
    stoneSize: 0.3,
  });
  polygonWall(k, [-7.2, 0.11, -23.0], 11.4, 2.6, 0, stone);
  polygonWall(k, [7.2, 0.11, -23.0], 11.4, 2.6, 0, stone);
  colonialUpper(
    k,
    [-7.2, 2.7, -23.2],
    11.4,
    3.2,
    0,
    plaster[0],
    timber[2],
    tiles,
    true,
  );
  colonialUpper(
    k,
    [7.2, 2.7, -23.2],
    11.4,
    3.2,
    0,
    plaster[2],
    timber[2],
    tiles,
  );
  paving({ width: 3.1, depth: 12, position: [0, -0.02, -29], stoneSize: 0.29 });
  polygonWall(k, [-1.75, 0.1, -30], 13.0, 3.0, PI / 2, stone);
  polygonWall(k, [1.75, 0.1, -30], 13.0, 3.0, -PI / 2, stone);
  colonialUpper(
    k,
    [-1.9, 3.1, -30],
    13.0,
    2.6,
    PI / 2,
    plaster[1],
    timber[2],
    tiles,
  );
  colonialUpper(
    k,
    [1.9, 3.1, -30],
    13.0,
    2.5,
    -PI / 2,
    plaster[2],
    timber[2],
    tiles,
  );
  paving({
    width: 3.1,
    depth: 6.0,
    position: [0, -0.02, -37.5],
    stoneSize: 0.31,
  });
  paving({
    width: 11.8,
    depth: 3.0,
    position: [-4.3, -0.02, -39.0],
    stoneSize: 0.32,
  });
  polygonWall(k, [1.75, 0.1, -38.0], 4.0, 3.0, -PI / 2, stone);
  polygonWall(k, [-1.75, 0.1, -37.0], 1.0, 3.0, PI / 2, stone);
  colonialUpper(
    k,
    [1.9, 3.1, -38.0],
    4.0,
    2.5,
    -PI / 2,
    plaster[2],
    timber[2],
    tiles,
  );
  polygonWall(k, [-0.3, 0.1, -41.3], 12.3, 3.2, 0, stone);
  colonialUpper(
    k,
    [-0.3, 3.3, -41.45],
    12.3,
    3.0,
    0,
    plaster[0],
    timber[1],
    tiles,
    true,
  );
  polygonWall(k, [-6.1, 0.1, -37.45], 8.7, 2.9, PI, stone);
  colonialUpper(
    k,
    [-6.1, 3.0, -37.3],
    8.7,
    2.6,
    PI,
    plaster[2],
    timber[0],
    tiles,
  );
  polygonWall(k, [-10.45, 0.1, -39.0], 3.2, 3.1, PI / 2, stone);
  colonialUpper(
    k,
    [-10.6, 3.2, -39.0],
    3.2,
    2.8,
    PI / 2,
    plaster[1],
    timber[2],
    tiles,
  );
  polygonWall(k, [0, 0.11, 19.3], 11.5, 3.0, PI, stone);
  colonialUpper(
    k,
    [0, 3.12, 19.5],
    11.5,
    3.1,
    PI,
    plaster[3],
    timber[0],
    tiles,
  );
  paving({
    width: 21.0,
    depth: 3.8,
    position: [0, -0.02, 17.4],
    stoneSize: 0.34,
  });
  for (const side of [-1, 1]) {
    polygonWall(k, [side * 10.5, 0.1, 16.5], 8.0, 3.0, (-side * PI) / 2, stone);
    colonialUpper(
      k,
      [side * 10.65, 3.1, 16.5],
      8.0,
      2.8,
      (-side * PI) / 2,
      plaster[side < 0 ? 0 : 2],
      timber[1],
      tiles,
    );
    polygonWall(k, [side * 9.6, 0.1, 21.4], 8.0, 3.1, PI, stone);
    colonialUpper(
      k,
      [side * 9.6, 3.2, 21.55],
      8.0,
      2.9,
      PI,
      plaster[side < 0 ? 2 : 1],
      timber[2],
      tiles,
    );
  }
  for (const [x, z, angle] of [
    [-2.43, 8.8, PI / 2],
    [2.45, 4.9, -PI / 2],
    [-2.43, -2.4, PI / 2],
    [2.45, -9, -PI / 2],
    [-2.43, -15.6, PI / 2],
  ]) {
    streetLantern(k, [x, 3.36, z], angle);
  }
  const doorway = k.sub([-2.49, 0.08, 2.1], PI / 2);
  const doorOak = weathered(k, k.m.cedar, [0x86694c], 0.88)[0];
  k.box([1.48, 2.38, 0.045], [0, 1.19, 0.06], k.m.dark, doorway, 0);
  for (let i = 0; i < 10; i++)
    k.box(
      [0.135, 2.27, 0.075],
      [-0.64 + i * 0.141, 1.15, 0.1],
      doorOak,
      doorway,
      0.002,
    );
  for (const side of [-1, 1]) {
    k.box(
      [0.22, 2.64, 0.25],
      [side * 0.89, 1.27, 0.04],
      stone[2],
      doorway,
      0.02,
    );
    k.ring(
      0.037,
      0.008,
      [side * 0.17, 1.06, 0.155],
      k.m.iron,
      doorway,
      [0, 0, 0],
    );
  }
  k.box([2.02, 0.3, 0.31], [0, 2.61, 0.04], stone[2], doorway, 0.018);
  for (const y of [0.4, 1.8])
    for (let i = 0; i < 8; i++)
      k.sphere(
        0.013,
        [-0.6 + i * 0.17, y, 0.151],
        k.m.iron,
        doorway,
        [1, 1, 0.4],
      );
  k.box([1.86, 0.12, 0.52], [0, 0.055, 0.26], stone[2], doorway, 0.024);
  const doorwayPlants = streetPlants(k),
    roseFlower = k.material(0xb35a70, 0.95);
  roseFlower.side = THREE.DoubleSide;
  const thresholdPlant = doorwayPlants.pot(
    [-0.97, -0.102, 0.44],
    0.83,
    roseFlower,
    doorway,
    { scanned: true, leafSway: true },
  );
  thresholdPlant.rotation.y = -0.18;
  const thresholdCloth = foldedTextile(
    k,
    [0.44, 0.117, 0.28],
    0.47,
    0.36,
    doorway,
    k.m.red,
  );
  thresholdCloth.rotation.y = -0.1;
  k.wearPatch([-0.16, 1.09, 0.1395], {
    width: 0.13,
    height: 0.19,
    parent: doorway,
    surface: "weathered-wood",
    strength: 0.18,
    scale: 0.4,
  });
  streetLantern(k, [-2.48, 3.12, 2.15], PI / 2);
  const thresholdLight = new THREE.PointLight(0xffd19a, 2.0, 3.4, 2);
  thresholdLight.position.set(-1.96, 2.67, 2.15);
  k.group.add(thresholdLight);
  for (const [x, z] of [
    [-2.23, 5.5],
    [2.21, -4.7],
    [-2.21, -13],
  ]) {
    k.box([0.35, 0.035, 0.59], [x, 0.03, z], k.m.iron, k.group, 0);
    for (let i = 0; i < 6; i++)
      k.box(
        [0.024, 0.012, 0.54],
        [x - 0.13 + i * 0.052, 0.053, z],
        k.m.dark,
        k.group,
        0,
      );
  }
  return k.finish(
    definition,
    {
      arrival: outdoorView(
        "Along the stone lane",
        [-0.65, 1.66, 10.3],
        [0.9, 1.66, -7.2],
        63,
      ),
      stone: outdoorView(
        "Hand-fitted andesite",
        [0.22, 1.63, 0.55],
        [2.56, 1.46, -0.8],
        55,
      ),
      passage: outdoorView(
        "Steps into the side passage",
        [-0.5, 1.66, -4.2],
        [-7.2, 1.28, -6],
        62,
      ),
      balconies: outdoorView(
        "A planted doorway and timber balcony",
        [0.65, 1.65, 4.8],
        [-2.3, 2.0, 2.1],
        63,
      ),
    },
    [
      [2.53, 1.55, -0.8],
      [0, 0.08, 3.4],
      [-2.4, 4.1, 2.85],
      [2.53, 2.0, -8.0],
    ],
  );
}
