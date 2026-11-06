import * as THREE from "three";
import { createOutdoorKit, outdoorView } from "./outdoor-kit.js";

const PI = Math.PI;

function chamferedBox(size, radius) {
  const half = size.map((value) => value / 2);
  const bevel = Math.min(radius, Math.min(...size) * 0.22);
  const positions = [],
    normals = [],
    uvs = [];
  function face(points) {
    const vertices = points.map((point) => new THREE.Vector3(...point));
    const normal = vertices[1]
      .clone()
      .sub(vertices[0])
      .cross(vertices[2].clone().sub(vertices[0]))
      .normalize();
    const center = vertices.reduce(
      (sum, point) => sum.add(point),
      new THREE.Vector3(),
    );
    if (normal.dot(center) < 0) {
      vertices.reverse();
      normal.negate();
    }
    const axis =
      Math.abs(normal.x) > 0.5 ? 0 : Math.abs(normal.y) > 0.5 ? 1 : 2;
    for (let i = 1; i < vertices.length - 1; i++)
      for (const point of [vertices[0], vertices[i], vertices[i + 1]]) {
        positions.push(...point.toArray());
        normals.push(...normal.toArray());
        uvs.push(
          (axis === 0 ? point.z / size[2] : point.x / size[0]) + 0.5,
          (axis === 1 ? point.z / size[2] : point.y / size[1]) + 0.5,
        );
      }
  }
  for (let axis = 0; axis < 3; axis++) {
    const b = (axis + 1) % 3,
      c = (axis + 2) % 3;
    for (const sign of [-1, 1]) {
      face(
        [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([sb, sc]) => {
          const point = [0, 0, 0];
          point[axis] = sign * half[axis];
          point[b] = sb * (half[b] - bevel);
          point[c] = sc * (half[c] - bevel);
          return point;
        }),
      );
    }
    for (const sb of [-1, 1])
      for (const sc of [-1, 1]) {
        face(
          [
            [-1, 0],
            [1, 0],
            [1, 1],
            [-1, 1],
          ].map(([sa, inset]) => {
            const point = [0, 0, 0];
            point[axis] = sa * (half[axis] - bevel);
            point[b] = sb * (half[b] - (inset ? bevel : 0));
            point[c] = sc * (half[c] - (inset ? 0 : bevel));
            return point;
          }),
        );
      }
  }
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      for (const z of [-1, 1]) {
        const signs = [x, y, z];
        face(
          [0, 1, 2].map((axis) =>
            half.map(
              (value, i) => signs[i] * (value - (i === axis ? 0 : bevel)),
            ),
          ),
        );
      }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}

function architectureKit(renderer, seed, options) {
  const k = createOutdoorKit(renderer, seed, options),
    originalBox = k.box;
  // Thousands of stones and carved rails need bevels, not 300-triangle rounded cubes.
  k.box = (
    size,
    position,
    material = k.m.cedar,
    parent = k.group,
    bevel = 0.008,
    rotation = [0, 0, 0],
  ) => {
    if (!bevel)
      return originalBox(size, position, material, parent, 0, rotation);
    const geometry = chamferedBox(size, bevel);
    const scale = material.userData.metresPerRepeat;
    if (scale) {
      const { position: p, normal: n, uv } = geometry.attributes,
        offset = k.random() * 3;
      for (let i = 0; i < p.count; i++) {
        const x = Math.abs(n.getX(i)),
          y = Math.abs(n.getY(i)),
          z = Math.abs(n.getZ(i));
        uv.setXY(
          i,
          (x > y && x > z ? p.getZ(i) : p.getX(i)) / scale + offset,
          (y > x && y > z ? p.getZ(i) : p.getY(i)) / scale + offset * 0.63,
        );
      }
    }
    return k.mesh(geometry, material, position, rotation, parent);
  };
  return k;
}

function seedFor(definition, salt) {
  let seed = salt;
  for (const character of definition.id)
    seed = (Math.imul(seed, 31) + character.charCodeAt(0)) | 0;
  return seed >>> 0;
}

function shapeMesh(
  k,
  shape,
  material,
  position,
  depth = 0.08,
  parent = k.group,
) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 24,
    steps: 1,
  });
  return k.mesh(geometry, material, position, [0, 0, 0], parent);
}

function pointedPath(path, width, spring, rise, reverse = false) {
  const sign = reverse ? 1 : -1;
  path.lineTo((sign * width) / 2, spring);
  path.quadraticCurveTo(
    (sign * width) / 2,
    spring + rise * 0.57,
    0,
    spring + rise,
  );
  path.quadraticCurveTo(
    (-sign * width) / 2,
    spring + rise * 0.57,
    (-sign * width) / 2,
    spring,
  );
}

function pointedWall(
  k,
  { width, height, opening, spring, rise, depth, material, position, parent },
) {
  // The arch is a notch in the masonry, not a dark shape pasted on a wall.
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(-opening / 2, 0);
  pointedPath(shape, opening, spring, rise);
  shape.lineTo(opening / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.closePath();
  const wall = shapeMesh(k, shape, material, position, depth, parent);
  const uv = wall.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, uv.getX(i) / 1.8, uv.getY(i) / 1.8);
  return wall;
}

function pointedBand(
  k,
  { width, spring, rise, thickness, position, material, parent, depth = 0.05 },
) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2 - thickness, 0);
  pointedPath(shape, width + thickness * 2, spring, rise + thickness);
  shape.lineTo(width / 2 + thickness, 0);
  shape.lineTo(width / 2, 0);
  pointedPath(shape, width, spring, rise, true);
  shape.lineTo(-width / 2, 0);
  shape.closePath();
  return shapeMesh(k, shape, material, position, depth, parent);
}

function pointedOutline(
  k,
  width,
  spring,
  rise,
  position,
  radius,
  material,
  parent,
) {
  const path = new THREE.CurvePath();
  path.add(
    new THREE.LineCurve3(
      new THREE.Vector3(-width / 2, 0, 0),
      new THREE.Vector3(-width / 2, spring, 0),
    ),
  );
  path.add(
    new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-width / 2, spring, 0),
      new THREE.Vector3(-width / 2, spring + rise * 0.57, 0),
      new THREE.Vector3(0, spring + rise, 0),
    ),
  );
  path.add(
    new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, spring + rise, 0),
      new THREE.Vector3(width / 2, spring + rise * 0.57, 0),
      new THREE.Vector3(width / 2, spring, 0),
    ),
  );
  path.add(
    new THREE.LineCurve3(
      new THREE.Vector3(width / 2, spring, 0),
      new THREE.Vector3(width / 2, 0, 0),
    ),
  );
  return k.mesh(
    new THREE.TubeGeometry(path, 64, radius, 6, false),
    material,
    position,
    [0, 0, 0],
    parent,
  );
}

function starPoints(cx, cy, radius, inner, count = 8, angle = PI / 8) {
  return Array.from({ length: count * 2 }, (_, i) => {
    const a = angle + (i * PI) / count,
      r = i % 2 ? inner : radius;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}

function ornamentMaterial(
  k,
  {
    ground,
    line,
    accent,
    scale = 1,
    roughness = 0.45,
    glazed = false,
    motif = "star",
  },
) {
  const tiles = glazed
    ? Array.from({ length: 256 }, () => ({
        tone: k.range(-0.055, 0.055),
        height: k.range(186, 205),
        roughness: k.range(86, 146),
        chipped: k.random() < 0.018,
      }))
    : [];
  function tileLayers(context, size, channel) {
    const unit = size / 16;
    if (channel !== "color") {
      context.fillStyle = channel === "height" ? "#414141" : "#ededed";
      context.fillRect(0, 0, size, size);
    }
    for (let row = 0; row < 16; row++)
      for (let column = 0; column < 16; column++) {
        const tile = tiles[row * 16 + column],
          x = column * unit,
          y = row * unit;
        if (channel === "color")
          context.fillStyle =
            tile.tone < 0
              ? `rgba(32,29,22,${-tile.tone})`
              : `rgba(243,231,203,${tile.tone})`;
        else {
          const value = Math.round(
            channel === "height" ? tile.height : tile.roughness,
          );
          context.fillStyle = `rgb(${value},${value},${value})`;
        }
        context.fillRect(x + 1.5, y + 1.5, unit - 3, unit - 3);
        if (channel === "color") {
          context.strokeStyle = "#81735fcc";
          context.lineWidth = 1.8;
          context.strokeRect(x, y, unit, unit);
        }
        if (tile.chipped) {
          context.fillStyle =
            channel === "color"
              ? "#a28b6a"
              : channel === "height"
                ? "#686868"
                : "#dfdfdf";
          context.beginPath();
          context.moveTo(x + 1.5, y + 1.5);
          context.lineTo(x + 8, y + 1.5);
          context.lineTo(x + 6, y + 5);
          context.lineTo(x + 1.5, y + 8);
          context.closePath();
          context.fill();
        }
      }
  }
  const map = k.texture(
    (context, size) => {
      context.fillStyle = ground;
      context.fillRect(0, 0, size, size);
      const cell = size / 4;
      const polygon = (points) => {
        context.beginPath();
        points.forEach(([x, y], i) =>
          i ? context.lineTo(x, y) : context.moveTo(x, y),
        );
        context.closePath();
      };
      for (let row = -1; row <= 4; row++)
        for (let column = -1; column <= 4; column++) {
          const x = column * cell + cell / 2,
            y = row * cell + cell / 2;
          if (motif === "lozenge") {
            context.strokeStyle = accent;
            context.lineWidth = 8;
            polygon([
              [x, y - cell * 0.49],
              [x + cell * 0.49, y],
              [x, y + cell * 0.49],
              [x - cell * 0.49, y],
            ]);
            context.stroke();
            context.strokeStyle = line;
            context.lineWidth = 3;
            polygon([
              [x, y - cell * 0.39],
              [x + cell * 0.39, y],
              [x, y + cell * 0.39],
              [x - cell * 0.39, y],
            ]);
            context.stroke();
            context.fillStyle = line;
            polygon(starPoints(x, y, cell * 0.2, cell * 0.1));
            context.fill();
            context.fillStyle = ground;
            polygon(starPoints(x, y, cell * 0.13, cell * 0.065));
            context.fill();
            continue;
          }
          context.strokeStyle = accent;
          context.lineWidth = 8;
          polygon(starPoints(x, y, cell * 0.53, cell * 0.245));
          context.stroke();
          context.strokeStyle = line;
          context.lineWidth = 4;
          polygon(starPoints(x, y, cell * 0.46, cell * 0.214));
          context.stroke();
          context.fillStyle = line;
          polygon(starPoints(x, y, cell * 0.14, cell * 0.098));
          context.fill();
          context.strokeStyle = line;
          context.lineWidth = 3;
          for (let quadrant = 0; quadrant < 4; quadrant++) {
            context.save();
            context.translate(x, y);
            context.rotate((quadrant * PI) / 2);
            context.beginPath();
            context.moveTo(cell * 0.22, -cell * 0.08);
            context.bezierCurveTo(
              cell * 0.44,
              -cell * 0.26,
              cell * 0.5,
              cell * 0.18,
              cell * 0.22,
              cell * 0.08,
            );
            context.stroke();
            context.restore();
          }
        }
      for (let i = 0; i < 9000; i++) {
        context.fillStyle = i % 3 ? "#d8c0a013" : "#121c2623";
        context.fillRect(
          k.random() * size,
          k.random() * size,
          k.range(0.3, 2.1),
          k.range(0.3, 2.1),
        );
      }
      if (glazed) tileLayers(context, size, "color");
    },
    [scale, scale],
  );
  const material = k.material(0xffffff, glazed ? 1 : roughness);
  material.userData.patinaProfile = glazed ? "tile" : "wood";
  material.map = map;
  if (glazed) {
    material.bumpMap = k.texture(
      (context, size) => tileLayers(context, size, "height"),
      [scale, scale],
    );
    material.roughnessMap = k.texture(
      (context, size) => tileLayers(context, size, "roughness"),
      [scale, scale],
    );
    material.bumpMap.colorSpace = material.roughnessMap.colorSpace =
      THREE.NoColorSpace;
    material.bumpScale = 0.009;
    material.userData.metresPerRepeat = 1.8;
  } else {
    material.bumpMap = map;
    material.bumpScale = 0.007;
  }
  return material;
}

function glazeVariations(k, original) {
  return [0xffffff, 0xeaf0e7, 0xf3e8dc].map((color) => {
    const material = k.material(color, original.roughness);
    material.map = original.map;
    material.bumpMap = original.bumpMap;
    material.bumpScale = original.bumpScale;
    material.roughnessMap = original.roughnessMap;
    material.userData.metresPerRepeat = original.userData.metresPerRepeat;
    return material;
  });
}

function diamond(k, center, width, height, material, parent, depth = 0.016) {
  const shape = new THREE.Shape();
  shape.moveTo(0, height / 2);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, -height / 2);
  shape.lineTo(-width / 2, 0);
  shape.closePath();
  return shapeMesh(k, shape, material, center, depth, parent);
}

function carvedDoor(
  k,
  position,
  width,
  height,
  material,
  trim,
  parent = k.group,
) {
  const door = k.sub(position, 0, parent);
  k.box([width, height, 0.11], [0, height / 2, -0.08], material, door, 0.005);
  for (const sign of [-1, 1]) {
    const x = sign * width * 0.245;
    for (let row = 0; row < 4; row++) {
      const y = 0.23 + (row * (height - 0.3)) / 4;
      k.box(
        [width * 0.42, (height - 0.5) / 4, 0.045],
        [x, y + 0.15, -0.01],
        trim,
        door,
        0.004,
      );
      k.box(
        [width * 0.34, (height - 0.65) / 4, 0.025],
        [x, y + 0.15, 0.02],
        material,
        door,
        0.003,
      );
      diamond(k, [x, y + 0.15, 0.036], width * 0.22, 0.23, trim, door, 0.01);
    }
    k.ring(
      0.046,
      0.011,
      [sign * 0.095, height * 0.46, 0.055],
      k.m.bronze,
      door,
      [0, 0, 0],
    );
  }
  for (const x of [-width / 2 - 0.065, 0, width / 2 + 0.065]) {
    k.box(
      [x === 0 ? 0.035 : 0.115, height + 0.18, 0.17],
      [x, height / 2, 0],
      trim,
      door,
      0.003,
    );
  }
  k.box([width + 0.24, 0.12, 0.18], [0, height + 0.08, 0], trim, door, 0.003);
  return door;
}

function gardenAccents(k) {
  const vertices = [],
    uvs = [],
    indices = [],
    leafWidth = 0.28;
  for (let row = 0; row <= 7; row++) {
    const t = row / 7,
      arch = Math.sin(PI * t),
      halfWidth = 0.008 + 0.132 * arch ** 0.7;
    for (let column = 0; column <= 2; column++) {
      const q = column - 1,
        x = q * halfWidth;
      vertices.push(
        x,
        t * 0.7,
        (0.035 - 0.015 * Math.abs(q)) * arch + x * t * 0.14,
      );
      uvs.push(
        0.038 + (x / leafWidth + 0.5) * (0.469 - 0.038),
        0.13 + t * (0.903 - 0.13),
      );
    }
    if (row)
      for (let column = 0; column < 2; column++) {
        const a = (row - 1) * 3 + column,
          b = row * 3 + column;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
  }
  const leafGeometry = new THREE.BufferGeometry();
  leafGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  leafGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  leafGeometry.setIndex(indices);
  leafGeometry.computeVertexNormals();
  const leafMaterial = k.leafMaterial("broadleaf"),
    stemMaterial = k.material(0x69804d, 0.9);
  function leaf(parent, point, direction, scale) {
    const object = k.mesh(leafGeometry, leafMaterial, point, [0, 0, 0], parent);
    object.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(...direction).normalize(),
    );
    object.rotateY(k.range(-0.28, 0.28));
    object.scale.setScalar(scale);
  }
  function plant(point, scale = 1, parent = k.group) {
    const group = k.sub(point, 0, parent);
    group.scale.setScalar(scale);
    for (let stem = 0; stem < 7; stem++) {
      const angle = (stem * PI * 2) / 7 + k.range(-0.2, 0.2),
        radius = k.range(0.2, 0.42),
        height = k.range(0.65, 0.97);
      const end = [Math.cos(angle) * radius, height, Math.sin(angle) * radius];
      k.tube(
        [[0, 0, 0], [end[0] * 0.28, height * 0.64, end[2] * 0.28], end],
        0.01,
        stemMaterial,
        group,
      );
      for (let node = 0; node < 4; node++) {
        const t = 0.4 + node * 0.18,
          spread = angle + (node % 2 ? -0.65 : 0.65);
        leaf(
          group,
          [end[0] * t, height * t, end[2] * t],
          [Math.cos(spread), 0.2 + node * 0.09, Math.sin(spread)],
          k.range(0.42, 0.62),
        );
      }
    }
    return group;
  }
  function pot(point, scale = 1, parent = k.group, { scanned = false } = {}) {
    const group = k.sub(point, 0, parent);
    group.scale.setScalar(scale);
    if (scanned)
      k.model(
        "/public/outdoors/detail-assets/planter-pot-clay/planter_pot_clay_2k.gltf",
        [0, 0, 0],
        {
          height: 0.64,
          parent: group,
          packedOcclusion: true,
        },
      );
    else
      k.lathe(
        [
          [0.24, 0],
          [0.27, 0.035],
          [0.3, 0.1],
          [0.39, 0.52],
          [0.42, 0.57],
          [0.42, 0.64],
          [0.37, 0.64],
          [0.35, 0.54],
          [0.26, 0.1],
        ],
        [0, 0, 0],
        k.m.terracotta,
        group,
        32,
      );
    k.cylinder(0.35, 0.025, [0, 0.585, 0], k.m.bark, group, 0.35, 28);
    plant([0, 0.61, 0], 1, group);
    return group;
  }
  function frangipani(point) {
    const group = k.sub(point),
      petals = k.material(0xf1e6c6, 0.85),
      throat = k.material(0xcdaa49, 0.83);
    petals.side = THREE.DoubleSide;
    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.bezierCurveTo(-0.045, 0.04, -0.064, 0.116, 0.004, 0.151);
    petalShape.bezierCurveTo(0.064, 0.15, 0.078, 0.057, 0, 0);
    const petalGeometry = new THREE.ShapeGeometry(petalShape, 8),
      p = petalGeometry.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setZ(i, 0.018 * Math.sin((p.getY(i) / 0.151) * PI));
    petalGeometry.computeVertexNormals();
    function blossom(position, scale) {
      const flower = k.sub(position, k.range(0, PI * 2), group);
      flower.scale.setScalar(scale);
      flower.rotation.x = k.range(-0.46, 0.46);
      flower.rotation.z = k.range(-0.35, 0.35);
      for (let petal = 0; petal < 5; petal++)
        k.mesh(
          petalGeometry,
          petals,
          [0, 0.009, 0],
          [-PI / 2, 0, (petal * PI * 2) / 5],
          flower,
        );
      k.sphere(0.021, [0, 0.017, 0], throat, flower, [1, 0.48, 1]);
    }
    k.tube(
      [
        [0, 0, 0],
        [0.05, 1.15, 0.06],
        [-0.11, 2.1, 0.03],
      ],
      0.15,
      k.m.bark,
      group,
    );
    for (let branch = 0; branch < 6; branch++) {
      const angle = (branch * PI) / 3 + k.range(-0.16, 0.16),
        height = k.range(2.5, 2.97);
      const end = [Math.cos(angle) * 1.35, height, Math.sin(angle) * 1.35];
      k.tube(
        [
          [0, 1.46 + branch * 0.05, 0],
          [end[0] * 0.43, height - 0.47, end[2] * 0.43],
          end,
        ],
        0.072,
        k.m.bark,
        group,
      );
      for (const fork of [-1, 1]) {
        const bearing = angle + fork * 0.31,
          radius = k.range(1.9, 2.35);
        const tip = [
          Math.cos(bearing) * radius,
          height + k.range(0.38, 0.68),
          Math.sin(bearing) * radius,
        ];
        k.tube(
          [
            end,
            [(end[0] + tip[0]) / 2, tip[1] - 0.13, (end[2] + tip[2]) / 2],
            tip,
          ],
          0.04,
          k.m.bark,
          group,
        );
        for (let blade = 0; blade < 9; blade++) {
          const azimuth = (blade * PI * 2) / 9 + k.range(-0.15, 0.15);
          leaf(
            group,
            tip,
            [Math.cos(azimuth), k.range(-0.03, 0.42), Math.sin(azimuth)],
            k.range(0.55, 0.84),
          );
        }
        if ((branch + (fork > 0 ? 1 : 0)) % 3 !== 0) {
          k.rod(
            tip,
            [tip[0], tip[1] + 0.25, tip[2]],
            0.008,
            stemMaterial,
            group,
          );
          for (let flower = 0; flower < 4; flower++) {
            const azimuth = (flower * PI) / 2 + angle;
            blossom(
              [
                tip[0] + Math.cos(azimuth) * 0.12,
                tip[1] + 0.25 + k.range(0, 0.07),
                tip[2] + Math.sin(azimuth) * 0.12,
              ],
              k.range(0.28, 0.37),
            );
          }
        }
      }
    }
    return group;
  }
  return { plant, pot, frangipani };
}

function irregularPatch(k, x, y, width, height) {
  return Array.from({ length: 20 }, (_, i) => {
    const angle = (i * PI) / 10,
      radius = 1 + 0.1 * Math.sin(angle * 5) + k.range(-0.14, 0.14);
    return [
      x + Math.cos(angle) * width * 0.5 * radius,
      y + Math.sin(angle) * height * 0.5 * radius,
    ];
  });
}

function plasteredSurface(
  k,
  { width, height, position, material, losses, parent = k.group },
) {
  const group = k.sub(position, 0, parent),
    surface = new THREE.Shape();
  surface.moveTo(-width / 2, 0);
  surface.lineTo(width / 2, 0);
  surface.lineTo(width / 2, height);
  surface.lineTo(-width / 2, height);
  surface.closePath();
  for (const [x, y, patchWidth, patchHeight] of losses) {
    const points = irregularPatch(k, x, y, patchWidth, patchHeight),
      hole = new THREE.Path();
    points.forEach(([px, py], i) =>
      i ? hole.lineTo(px, py) : hole.moveTo(px, py),
    );
    hole.closePath();
    surface.holes.push(hole);
  }
  k.box([width, height, 0.032], [0, height / 2, -0.016], k.m.brick, group, 0);
  const coat = shapeMesh(k, surface, material, [0, 0, 0], 0.028, group);
  const { position: p, uv } = coat.geometry.attributes;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2, p.getY(i) / 2);
  return group;
}

function paintScuff(k, position, width, height, material, parent = k.group) {
  const shape = new THREE.Shape();
  irregularPatch(k, 0, 0, width, height).forEach(([x, y], i) =>
    i ? shape.lineTo(x, y) : shape.moveTo(x, y),
  );
  shape.closePath();
  return shapeMesh(k, shape, material, position, 0.001, parent);
}

function wornPaving(k, paving, locations) {
  const repair = k.material(0xb6b1a1, 0.96);
  repair.normalMap = k.m.stone.normalMap;
  repair.normalScale.set(0.2, 0.2);
  paving.updateWorldMatrix(true, false);
  const stones = paving.children.filter((object) => {
    if (!object.isMesh) return false;
    object.geometry.computeBoundingBox();
    const size = object.geometry.boundingBox.getSize(new THREE.Vector3());
    return size.x < 1.5 && size.z < 1.5 && size.y < 0.1;
  });
  for (const [x, z, repaired] of locations) {
    const target = paving.worldToLocal(new THREE.Vector3(x, 0, z));
    let stone,
      distance = Infinity;
    for (const candidate of stones) {
      if (candidate.parent !== paving) continue;
      const next = Math.hypot(
        candidate.position.x - target.x,
        candidate.position.z - target.z,
      );
      if (next < distance) {
        stone = candidate;
        distance = next;
      }
    }
    if (!stone || distance > 1)
      throw new Error(`No paving stone is available at ${x}, ${z}.`);
    const size = stone.geometry.boundingBox.getSize(new THREE.Vector3()),
      w = size.x,
      d = size.z;
    const group = k.sub(stone.position.toArray(), stone.rotation.y, paving),
      phase = k.random() * 3;
    function fragment(points, material, settlement = 0) {
      const shape = new THREE.Shape();
      points.forEach(([px, pz], i) =>
        i ? shape.lineTo(px, -pz) : shape.moveTo(px, -pz),
      );
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: size.y - 0.004,
        bevelEnabled: true,
        bevelSize: 0.002,
        bevelThickness: 0.002,
        bevelSegments: 1,
        steps: 1,
      });
      const { position: p, uv } = geometry.attributes;
      for (let i = 0; i < p.count; i++)
        uv.setXY(i, p.getX(i) / 2 + phase, p.getY(i) / 2 + phase * 0.63);
      k.mesh(
        geometry,
        material,
        [0, -size.y / 2 + settlement, 0],
        [-PI / 2, 0, 0],
        group,
      );
    }
    if (repaired) {
      fragment(
        [
          [-w / 2, -d / 2],
          [w * 0.18, -d / 2],
          [w / 2, -d * 0.15],
          [w / 2, d / 2],
          [-w / 2, d / 2],
        ],
        stone.material,
      );
      fragment(
        [
          [w * 0.18 + 0.006, -d / 2],
          [w / 2, -d / 2],
          [w / 2, -d * 0.15 - 0.006],
        ],
        repair,
        -0.002,
      );
    } else {
      const gap = 0.003;
      fragment(
        [
          [-w / 2, -d / 2],
          [-w * 0.15 - gap, -d / 2],
          [-w * 0.06 - gap, -d * 0.15],
          [w * 0.08 - gap, d * 0.1],
          [w * 0.22 - gap, d / 2],
          [-w / 2, d / 2],
        ],
        stone.material,
      );
      fragment(
        [
          [-w * 0.15 + gap, -d / 2],
          [w / 2, -d / 2],
          [w / 2, d / 2],
          [w * 0.22 + gap, d / 2],
          [w * 0.08 + gap, d * 0.1],
          [-w * 0.06 + gap, -d * 0.15],
        ],
        stone.material,
        -0.003,
      );
    }
    stone.removeFromParent();
  }
}

function ropeCoil(k, position, material, parent = k.group, radius = 0.3) {
  const points = Array.from({ length: 97 }, (_, i) => {
    const t = i / 96,
      angle = t * PI * 8,
      r = radius * (0.46 + t * 0.54);
    return new THREE.Vector3(
      Math.cos(angle) * r,
      0.006 * t,
      Math.sin(angle) * r,
    );
  });
  return k.mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      192,
      Math.min(0.011, radius * 0.035),
      5,
      false,
    ),
    material,
    position,
    [0, 0, 0],
    parent,
  );
}

function wovenBasket(
  k,
  position,
  material,
  parent = k.group,
  radius = 0.35,
  height = 0.46,
) {
  const basket = k.sub(position, 0.13, parent),
    thickness = radius * 0.021;
  k.lathe(
    [
      [radius * 0.7, 0],
      [radius * 0.77, 0.03],
      [radius * 0.99, height * 0.82],
      [radius, height],
      [radius * 0.93, height],
      [radius * 0.92, height * 0.82],
      [radius * 0.69, 0.04],
      [radius * 0.68, 0],
    ],
    [0, 0, 0],
    k.m.linen,
    basket,
    32,
  );
  k.cylinder(
    radius * 0.71,
    0.025,
    [0, 0.015, 0],
    material,
    basket,
    radius * 0.71,
    24,
  );
  for (let row = 1; row <= 10; row++) {
    const y = (height * row) / 11;
    k.ring(
      radius * (0.72 + 0.28 * (y / height) ** 0.65),
      thickness,
      [0, y, 0],
      material,
      basket,
    );
  }
  for (let reed = 0; reed < 18; reed++) {
    const angle = (reed * PI) / 9;
    k.tube(
      [
        [
          Math.cos(angle) * radius * 0.73,
          0.03,
          Math.sin(angle) * radius * 0.73,
        ],
        [
          Math.cos(angle) * radius * 0.9,
          height * 0.5,
          Math.sin(angle) * radius * 0.9,
        ],
        [Math.cos(angle) * radius, height, Math.sin(angle) * radius],
      ],
      thickness,
      material,
      basket,
    );
  }
  k.ring(radius, thickness * 1.7, [0, height, 0], material, basket);
  k.tube(
    [
      [-radius * 0.94, height * 0.89, 0],
      [-radius * 0.83, height + radius * 0.57, 0],
      [0, height + radius * 0.88, 0],
      [radius * 0.83, height + radius * 0.57, 0],
      [radius * 0.94, height * 0.89, 0],
    ],
    thickness * 1.8,
    material,
    basket,
  );
  return basket;
}

/** An original teaching court using Central Asian brick and glazed-tile grammar. */
export function buildMadrasaCourtyard(definition, renderer) {
  const k = architectureKit(renderer, seedFor(definition, 1417), {
    sunPosition: [-14, 18, 12],
    sunColor: 0xffe8c5,
    sunIntensity: 3.25,
    skyColor: 0xb2d1e0,
    fogDensity: 0.0045,
    exposure: 0.86,
  });
  const { m, box, sub } = k;
  const blue = k.material(0x183e64, 0.32),
    turquoise = k.material(0x31999d, 0.3);
  const ivory = k.material(0xd8c9a4, 0.72),
    ochre = k.material(0xac804b, 0.76);
  ivory.userData.patinaProfile = "stone";
  ochre.userData.patinaProfile = "plaster";
  const shade = k.material(0x494d44, 0.96),
    darkWood = k.material(0x40372b, 0.89);
  const ceramic = ornamentMaterial(k, {
    ground: "#234461",
    line: "#bdc9b5",
    accent: "#429b9e",
    glazed: true,
  });
  const paleCeramic = ornamentMaterial(k, {
    ground: "#d0bc91",
    line: "#254c68",
    accent: "#529190",
    glazed: true,
  });
  const latticeCeramic = ornamentMaterial(k, {
    ground: "#234461",
    line: "#bdc9b5",
    accent: "#429b9e",
    glazed: true,
    motif: "lozenge",
  });
  const ceramicLots = glazeVariations(k, ceramic),
    borderLots = glazeVariations(k, paleCeramic);
  const latticeLots = glazeVariations(k, latticeCeramic);
  const brickShades = [0xb39469, 0xa68a66, 0xba9d75, 0xc0a67c].map((color) =>
    k.material(color, 0.91),
  );
  box([65, 0.3, 65], [0, -0.27, 0], m.stone, k.group, 0);
  const paving = k.paving({
    width: 26.4,
    depth: 18.4,
    position: [-0.6, -0.01, 0.6],
    stoneSize: 0.66,
    material: m.stone,
  });
  wornPaving(k, paving, [
    [-6.7, -6.4, false],
    [-5.2, 4.8, true],
    [4.1, -4.5, false],
    [8.8, 4.6, true],
  ]);
  for (const z of [-8.25, 9.35])
    box([26.2, 0.16, 0.58], [-0.6, 0.06, z], ivory, k.group, 0.015);
  for (const x of [-12.8, 11.6])
    box([0.58, 0.16, 17.7], [x, 0.06, 0.6], ivory, k.group, 0.015);

  function bay(parent, x, level, elaborate = true) {
    const y = level ? 5.04 : 0.25,
      height = level ? 4.42 : 4.62;
    const width = 3.84,
      opening = level ? 2.58 : 2.78;
    const spring = level ? 1.83 : 2.1,
      rise = level ? 1.58 : 1.68;
    const g = sub([x, y, 0], 0, parent);
    const lot = Math.abs(Math.round(x / 3.84) + level) % ceramicLots.length;
    const field =
      level && Math.abs(Math.round(x / 3.84)) % 3 === 1
        ? latticeLots[lot]
        : ceramicLots[lot];
    pointedWall(k, {
      width,
      height,
      opening,
      spring,
      rise,
      depth: 0.62,
      material: field,
      position: [0, 0, -0.62],
      parent: g,
    });
    box([width - 0.25, height, 0.22], [0, height / 2, -2.18], m.brick, g, 0);
    box([width - 0.1, 0.14, 2.4], [0, -0.075, -0.92], m.stone, g, 0.006);
    box([width, 0.2, 2.5], [0, height - 0.12, -0.9], m.brick, g, 0);
    for (const sign of [-1, 1])
      box(
        [0.3, height, 2.05],
        [sign * (width / 2 - 0.15), height / 2, -1.11],
        m.brick,
        g,
        0,
      );
    pointedBand(k, {
      width: opening + 0.07,
      spring,
      rise: rise + 0.035,
      thickness: 0.19,
      position: [0, 0, 0.018],
      material: paleCeramic,
      parent: g,
    });
    pointedOutline(
      k,
      opening + 0.025,
      spring,
      rise + 0.014,
      [0, 0, 0.08],
      0.028,
      turquoise,
      g,
    );
    pointedOutline(
      k,
      opening + 0.46,
      spring,
      rise + 0.22,
      [0, 0, 0.075],
      0.018,
      ivory,
      g,
    );
    for (const sign of [-1, 1]) {
      const borderX = sign * (width / 2 - 0.1),
        units = Math.ceil(height / 0.22),
        unit = height / units;
      box(
        [0.135, height, 0.035],
        [borderX, height / 2, 0.017],
        ochre,
        g,
        0.002,
      );
      for (let index = 0; index < units; index++) {
        const centerY = (index + 0.5) * unit,
          material = borderLots[(index + lot) % borderLots.length];
        if (
          elaborate &&
          !level &&
          x > 2 &&
          x < 5 &&
          index === 2 &&
          sign === 1
        ) {
          const chip = new THREE.Shape();
          chip.moveTo(-0.0675, -unit / 2 + 0.003);
          chip.lineTo(0.0675, -unit / 2 + 0.003);
          chip.lineTo(0.0675, unit / 2 - 0.055);
          chip.lineTo(0.0275, unit / 2 - 0.055);
          chip.lineTo(0.0175, unit / 2 - 0.003);
          chip.lineTo(-0.0675, unit / 2 - 0.003);
          chip.closePath();
          shapeMesh(k, chip, material, [borderX, centerY, 0.038], 0.032, g);
        } else
          box(
            [0.135, unit - 0.006, 0.032],
            [borderX, centerY, 0.054],
            material,
            g,
            0.002,
          );
      }
      box(
        [0.035, height, 0.09],
        [sign * (width / 2 - 0.2), height / 2, 0.033],
        blue,
        g,
        0.001,
      );
    }
    box([width, 0.22, 0.08], [0, height - 0.12, 0.02], paleCeramic, g, 0.001);
    if (elaborate) {
      for (const sign of [-1, 1])
        for (let row = 0; row < 7; row++) {
          diamond(
            k,
            [sign * 1.6, 0.4 + row * 0.48, 0.09],
            0.18,
            0.28,
            turquoise,
            g,
          );
          diamond(
            k,
            [sign * 1.6, 0.4 + row * 0.48, 0.108],
            0.063,
            0.1,
            ivory,
            g,
          );
        }
      for (const sign of [-1, 1]) {
        const points = starPoints(sign * 1.13, height - 0.76, 0.27, 0.125).map(
          ([px, py]) => [px, py, 0.085],
        );
        k.tube(points, 0.014, ivory, g, true);
      }
    }
    pointedWall(k, {
      width: 2.62,
      height: height - 0.4,
      opening: 1.02,
      spring: 1.63,
      rise: 0.62,
      depth: 0.09,
      material: m.brick,
      position: [0, 0, -1.94],
      parent: g,
    });
    pointedBand(k, {
      width: 1.04,
      spring: 1.63,
      rise: 0.63,
      thickness: 0.12,
      position: [0, 0, -1.81],
      material: paleCeramic,
      parent: g,
    });
    carvedDoor(k, [0, 0, -2.0], 0.96, 1.9, darkWood, ochre, g);
    if (level) {
      box([opening + 0.1, 0.56, 0.18], [0, 0.27, -0.16], m.brick, g, 0);
      for (let panel = 0; panel < 4; panel++)
        box(
          [0.48, 0.34, 0.025],
          [(panel - 1.5) * 0.58, 0.28, -0.057],
          ceramic,
          g,
          0,
        );
      box([opening + 0.2, 0.12, 0.32], [0, 0.6, -0.14], ivory, g, 0.008);
    } else {
      box([1.5, 0.12, 0.42], [0, 0.04, -1.7], ivory, g, 0.015);
    }
  }

  function wing(position, angle, count, detailed = true, levels = 2) {
    const wingGroup = sub(position, angle);
    const length = count * 3.84;
    box([length + 0.18, 0.3, 2.8], [0, 0.1, -1.1], m.stone, wingGroup, 0.015);
    for (let i = 0; i < count; i++)
      for (let level = 0; level < levels; level++) {
        bay(wingGroup, (i - (count - 1) / 2) * 3.84, level, detailed);
      }
    for (const [y, height, depth, material] of [
      [4.91, 0.24, 0.83, ivory],
      [5.1, 0.13, 0.69, blue],
      [9.63, 0.3, 0.91, ivory],
      [9.88, 0.18, 0.75, paleCeramic],
    ]) {
      if (levels === 1 && y > 5.2) continue;
      box(
        [length + 0.14, height, depth],
        [0, y, -0.1],
        material,
        wingGroup,
        0.005,
      );
    }
    const roofHeight = levels === 1 ? 5.37 : 10.1;
    box([length + 0.1, 0.6, 2.7], [0, roofHeight, -1.1], m.brick, wingGroup, 0);
    for (let x = -length / 2 + 0.2; x < length / 2; x += 0.4) {
      for (let row = 0; row < 3; row++) {
        box(
          [0.38, 0.12, 0.055],
          [x + (row % 2) * 0.12, roofHeight - 0.16 + row * 0.15, 0.268],
          brickShades[Math.floor(k.random() * 4)],
          wingGroup,
          0.002,
        );
      }
    }
    box(
      [length + 0.2, 0.13, 2.9],
      [0, roofHeight + 0.36, -1.08],
      ivory,
      wingGroup,
      0.01,
    );
    return wingGroup;
  }

  wing([-0.62, 0, -9.0], 0, 7);
  wing([12.82, 0, 0.6], -PI / 2, 5);
  wing([-0.62, 0, 10.2], PI, 7, false, 1);
  wing([-14.06, 0, 0.6], PI / 2, 5, false, 1);
  const basin = sub([-4.3, 0, -2.1]);
  k.cylinder(1.28, 0.16, [0, 0.08, 0], ivory, basin, 1.28, 8);
  k.lathe(
    [
      [1.08, 0],
      [1.08, 0.42],
      [0.99, 0.52],
      [0.84, 0.52],
      [0.79, 0.41],
      [0.79, 0.18],
      [0, 0.18],
    ],
    [0, 0.16, 0],
    m.stone,
    basin,
    8,
  );
  k.cylinder(
    0.78,
    0.018,
    [0, 0.37, 0],
    k.material(0x55756b, 0.23, 0.08),
    basin,
    0.78,
    40,
  );
  box([3.9, 0.16, 3.2], [6.4, 0.055, -2.3], ivory, k.group, 0.012);
  box([3.55, 0.025, 2.85], [6.4, 0.15, -2.3], m.bark, k.group, 0);
  k.tree([6.4, 0.15, -2.3], { height: 4.4, radius: 1.85, kind: "broadleaf" });
  const garden = gardenAccents(k);
  for (const point of [
    [5.1, 0.17, -3.2],
    [7.5, 0.17, -3.0],
    [5.2, 0.17, -1.3],
    [7.45, 0.17, -1.25],
  ])
    garden.plant(point, 0.42);
  const tea = k.material(0x785024, 0.21);
  for (const position of [
    [-8.3, 0.25, -10.0],
    [8.9, 0, 5.4],
  ]) {
    const bench = sub(position);
    box([2.3, 0.15, 0.65], [0, 0.48, 0], ivory, bench, 0.022);
    for (const x of [-0.84, 0.84])
      box([0.27, 0.4, 0.47], [x, 0.2, 0], m.stone, bench, 0.013);
    if (position[0] < 0) {
      const folio = k.book([-0.36, 0.56, -0.035], {
        width: 0.24,
        depth: 0.347,
        thickness: 0.044,
        angle: -0.13,
        parent: bench,
        image: "/public/outdoors/detail-assets/lotus-botanical-plate.jpg",
      });
      folio.name = "Collected botanical plate folio";
      const glass = sub([0.38, 0.556, 0.055], 0.14, bench);
      k.lathe(
        [
          [0, 0],
          [0.047, 0],
          [0.069, 0.009],
          [0.072, 0.015],
          [0.063, 0.02],
          [0.043, 0.011],
          [0, 0.011],
        ],
        [0, 0, 0],
        ivory,
        glass,
        32,
      );
      k.lathe(
        [
          [0.04, 0],
          [0.047, 0.005],
          [0.05, 0.088],
          [0.049, 0.117],
          [0.045, 0.119],
          [0.045, 0.09],
          [0.042, 0.012],
          [0, 0.012],
        ],
        [0, 0.012, 0],
        m.glass,
        glass,
        32,
      );
      k.cylinder(0.044, 0.054, [0, 0.05, 0], tea, glass, 0.041, 32);
      k.ring(0.047, 0.002, [0, 0.131, 0], m.glass, glass);
    }
  }
  for (let z = -7.6; z < 9; z += 0.8) {
    box([0.22, 0.045, 0.78], [-10.7, 0.02, z], shade, k.group, 0.002);
    for (const x of [-10.88, -10.52])
      box([0.12, 0.065, 0.79], [x, 0.035, z], ivory, k.group, 0.002);
  }
  return k.finish(
    definition,
    {
      arrival: outdoorView(
        "Courtyard between the galleries",
        [-7.3, 1.67, 7.1],
        [5.8, 3.9, -7.8],
        66,
      ),
      arcade: outdoorView(
        "Inside the pointed arcade",
        [4.6, 1.67, -5.0],
        [3.25, 2.05, -9.7],
        60,
      ),
      ceramics: outdoorView(
        "Glazed geometric borders",
        [7.9, 1.64, -5.4],
        [8.4, 2.5, -8.95],
        56,
      ),
      gallery: outdoorView(
        "Shaded reading alcove",
        [-6.1, 1.62, -6.7],
        [-8.3, 1.05, -10.0],
        56,
      ),
    },
    [
      [3.22, 2.8, -8.9],
      [8.6, 2.65, -8.89],
      [3.22, 1.55, -10.94],
      [3.2, 0.12, 2.0],
    ],
    { exposure: 0.86 },
  );
}

function scrollBrace(k, position, side, material, parent, scale = 1) {
  const group = k.sub(position, 0, parent);
  group.scale.set(scale, scale, scale);
  const outline = new THREE.Shape();
  outline.moveTo(0, 0);
  outline.lineTo(side * 0.75, 0);
  outline.bezierCurveTo(
    side * 0.66,
    -0.16,
    side * 0.46,
    -0.19,
    side * 0.43,
    -0.33,
  );
  outline.bezierCurveTo(side * 0.3, -0.55, side * 0.17, -0.68, 0, -0.73);
  outline.lineTo(0, -0.51);
  outline.bezierCurveTo(
    side * 0.22,
    -0.42,
    side * 0.36,
    -0.17,
    side * 0.38,
    -0.12,
  );
  outline.lineTo(0, -0.12);
  outline.closePath();
  shapeMesh(k, outline, material, [0, 0, -0.045], 0.09, group);
  k.tube(
    [
      [side * 0.09, -0.15, 0.07],
      [side * 0.31, -0.25, 0.07],
      [side * 0.21, -0.42, 0.07],
      [side * 0.14, -0.31, 0.07],
    ],
    0.022,
    material,
    group,
  );
}

function piercedFrieze(k, parent, x, y, z, width, material, cream) {
  k.box([width, 0.09, 0.13], [x, y, z], cream, parent, 0.002);
  const count = Math.max(2, Math.round(width / 0.24)),
    pitch = width / count;
  for (let i = 0; i < count; i++) {
    const center = x - width / 2 + (i + 0.5) * pitch;
    const shape = new THREE.Shape();
    shape.moveTo(-pitch * 0.49, 0);
    shape.lineTo(pitch * 0.49, 0);
    shape.lineTo(pitch * 0.49, -0.21);
    shape.bezierCurveTo(pitch * 0.24, -0.3, pitch * 0.19, -0.36, 0, -0.4);
    shape.bezierCurveTo(
      -pitch * 0.19,
      -0.36,
      -pitch * 0.24,
      -0.3,
      -pitch * 0.49,
      -0.21,
    );
    shape.closePath();
    const hole = new THREE.Path();
    hole.absellipse(0, -0.15, pitch * 0.2, 0.075, 0, PI * 2, true);
    shape.holes.push(hole);
    shapeMesh(k, shape, material, [center, y - 0.02, z], 0.045, parent);
    k.sphere(0.024, [center, y - 0.41, z + 0.023], cream, parent, [1, 1.8, 1]);
  }
}

/** An anonymous trading house with Swahili-coast and Indian Ocean timberwork. */
export function buildSwahiliVerandah(definition, renderer) {
  const k = architectureKit(renderer, seedFor(definition, 1894), {
    sunPosition: [-16, 21, 13],
    sunColor: 0xffedcf,
    sunIntensity: 3.35,
    skyColor: 0xb8dce4,
    fogDensity: 0.006,
    exposure: 0.87,
  });
  const { m, box, sub } = k;
  const mint = k.material(0x7cae9a, 0.77),
    turquoise = k.material(0x518f83, 0.65);
  const deepGreen = k.material(0x376e65, 0.76),
    cream = k.material(0xe4debf, 0.86);
  const chalk = k.material(0xece5d1, 0.91),
    darkWindow = k.material(0x354c47, 0.84);
  cream.userData.patinaProfile = chalk.userData.patinaProfile = "plaster";
  const stone = m.stone,
    warmWood = k.material(0x6b5135, 0.88),
    rust = k.material(0x80513c, 0.87);
  const ropeMaterial = k.material(0xa28c62, 0.96);
  for (const paint of [mint, turquoise, deepGreen]) {
    paint.normalMap = m.cedar.normalMap;
    paint.normalScale.set(0.14, 0.14);
  }
  box([1200, 0.4, 220], [0, -0.34, -87], stone, k.group, 0);
  const paving = k.paving({
    width: 36,
    depth: 22,
    position: [0, -0.02, 6],
    stoneSize: 0.63,
    material: m.cobble,
  });
  wornPaving(k, paving, [
    [-3.6, 0.45, true],
    [-1.1, 3.0, false],
    [8.4, 9.6, true],
    [-10.9, 7.5, false],
  ]);
  box([1000, 0.03, 8.4], [0, -0.045, 17], m.ground, k.group, 0);
  const quayPaving = k.paving({
    width: 64,
    depth: 9.8,
    position: [0, -0.025, 17.55],
    stoneSize: 0.78,
    material: m.stone,
  });
  wornPaving(k, quayPaving, [
    [10.8, 20.5, false],
    [-8.7, 18.0, true],
    [3.0, 14.0, false],
    [18.4, 21.1, true],
  ]);
  for (let x = -29; x <= 29; x += 1)
    box([0.98, 0.14, 0.29], [x, 0.03, 12.55], chalk, k.group, 0.009);
  const building = sub([0, 0, -3.5]);
  building.scale.set(0.78, 1, 1.08);
  box([24.8, 0.8, 10.0], [0, 0.33, -2.55], stone, building, 0.015);
  box([24.5, 7.0, 7.2], [0, 4.25, -3.75], m.plaster, building, 0.015);
  const limeCoat = k.material(0xe3ddc8, 0.94);
  limeCoat.normalMap = m.plaster.normalMap;
  limeCoat.normalScale.set(0.35, 0.35);
  plasteredSurface(k, {
    width: 24.5,
    height: 3.4,
    position: [0, 0.6, -0.088],
    material: limeCoat,
    parent: building,
    losses: [
      [-9.05, 0.34, 0.58, 0.3],
      [3.8, 0.3, 0.4, 0.22],
      [8.8, 0.95, 0.28, 0.44],
    ],
  });
  for (const x of [-11.9, 11.9]) {
    box([0.42, 7.2, 0.42], [x, 4.2, 0.05], cream, building, 0.008);
    for (const y of [1, 4.1, 7.35])
      box([0.6, 0.17, 0.59], [x, y, 0.08], chalk, building, 0.004);
  }
  for (const y of [0.85, 4.18, 7.45])
    box([24.85, 0.21, 1.05], [0, y, 0.07], chalk, building, 0.008);

  function shutterWindow(
    x,
    y,
    width = 1.28,
    height = 2.32,
    z = 0.03,
    arched = false,
  ) {
    const windowGroup = sub([x, y, z], 0, building);
    box(
      [width + 0.28, height + 0.24, 0.16],
      [0, height / 2, 0],
      cream,
      windowGroup,
      0.003,
    );
    box(
      [width, height, 0.075],
      [0, height / 2, 0.095],
      darkWindow,
      windowGroup,
      0,
    );
    for (const side of [-1, 1]) {
      const shutter = sub(
        [side * width * 0.28, 0, 0.145],
        side * -0.06,
        windowGroup,
      );
      for (const dx of [-width * 0.225, width * 0.225])
        box(
          [0.06, height, 0.07],
          [dx, height / 2, 0],
          turquoise,
          shutter,
          0.003,
        );
      for (const sy of [0.04, height * 0.5, height - 0.03])
        box([width * 0.49, 0.065, 0.09], [0, sy, 0], turquoise, shutter, 0.003);
      for (let row = 0; row < 24; row++)
        box(
          [width * 0.44, 0.05, 0.072],
          [0, 0.12 + (row * (height - 0.23)) / 24, 0.018],
          deepGreen,
          shutter,
          0.001,
          [-0.34, 0, 0],
        );
    }
    box(
      [width + 0.38, 0.13, 0.38],
      [0, -0.02, 0.11],
      chalk,
      windowGroup,
      0.008,
    );
    if (arched) {
      const shape = new THREE.Shape();
      shape.moveTo(-width / 2 - 0.12, 0);
      shape.absellipse(0, 0, width / 2 + 0.12, 0.48, PI, 0, true);
      shape.lineTo(width / 2, 0);
      shape.absellipse(0, 0, width / 2, 0.34, 0, PI, false);
      shape.closePath();
      shapeMesh(k, shape, cream, [0, height + 0.06, 0.04], 0.13, windowGroup);
      for (let i = -2; i <= 2; i++)
        k.rod(
          [0, height + 0.06, 0.09],
          [
            Math.sin(i * 0.47) * width * 0.47,
            height + 0.06 + Math.cos(i * 0.47) * 0.34,
            0.09,
          ],
          0.015,
          turquoise,
          windowGroup,
        );
    } else {
      box(
        [width + 0.34, 0.13, 0.2],
        [0, height + 0.1, 0.03],
        chalk,
        windowGroup,
        0.004,
      );
    }
  }

  for (const y of [1.05, 4.62]) {
    for (const x of [-10.5, -7.45, -4.95, -2.48, 0, 2.48, 4.95, 7.45, 10.5]) {
      if (y < 2 && x === -4.95) continue;
      shutterWindow(
        x,
        y,
        Math.abs(x) > 9 ? 1.5 : 1.28,
        y < 2 ? 2.37 : 2.25,
        0.03,
        y < 2,
      );
    }
  }
  const entrance = sub([-4.95, 0, 0], 0, building);
  carvedDoor(k, [0, 0.86, 0.23], 2.1, 2.68, warmWood, deepGreen, entrance);
  for (const sign of [-1, 1]) {
    box([0.22, 3.02, 0.26], [sign * 1.25, 2.32, 0.32], cream, entrance, 0.006);
    for (let i = 0; i < 16; i++)
      diamond(
        k,
        [sign * 1.25, 1.03 + i * 0.17, 0.466],
        0.13,
        0.13,
        mint,
        entrance,
        0.012,
      );
  }
  paintScuff(k, [1.26, 1.7, 0.4515], 0.056, 0.14, m.cedar, entrance);
  paintScuff(k, [-1.23, 1.19, 0.4515], 0.049, 0.1, m.cedar, entrance);
  box([2.75, 0.22, 0.37], [0, 3.83, 0.35], chalk, entrance, 0.008);
  for (let step = 0; step < 6; step++) {
    box(
      [4.65 - step * 0.07, 0.15, 2.55 - step * 0.34],
      [0, 0.075 + step * 0.145, 2.05 - step * 0.17],
      stone,
      entrance,
      0.012,
    );
  }
  for (const sign of [-1, 1]) {
    box([0.29, 0.78, 2.7], [sign * 2.52, 0.4, 2.0], chalk, entrance, 0.008);
    k.rod(
      [sign * 2.52, 0.79, 3.2],
      [sign * 2.52, 1.5, 0.85],
      0.048,
      turquoise,
      entrance,
    );
  }
  k.wearPatch([-0.62, 0.8, 1.626], {
    width: 0.72,
    height: 0.11,
    parent: entrance,
    surface: "worn-plaster",
    strength: 0.28,
    scale: 1.1,
  });
  box([4.28, 0.15, 1.22], [0, 0.805, 0.64], stone, entrance, 0.008);
  const garden = gardenAccents(k);
  garden.pot([-1.65, 0.885, 0.65], 0.86, entrance, { scanned: true });
  garden.pot([1.65, 0.885, 0.62], 0.73, entrance);
  const weaveMap = k.texture(
    (context, size) => {
      context.fillStyle = "#a79871";
      context.fillRect(0, 0, size, size);
      for (let row = 0; row < size; row += 5) {
        context.strokeStyle = row % 10 ? "#c4b48b" : "#7c7255";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(0, row);
        context.lineTo(size, row);
        context.stroke();
        for (let column = 0; column < size; column += 8) {
          context.fillStyle =
            (column / 8 + row / 5) % 2 ? "#cfbf952f" : "#51493440";
          context.fillRect(column, row, 3, 4);
        }
      }
      context.strokeStyle = "#55624d";
      context.lineWidth = 13;
      context.strokeRect(23, 26, size - 46, size - 52);
      context.strokeStyle = "#bbae83";
      context.lineWidth = 4;
      context.strokeRect(34, 37, size - 68, size - 74);
    },
    [1, 1],
    512,
  );
  const woven = k.material(0xffffff, 0.97),
    straw = k.material(0xb7a77e, 0.94);
  woven.map = weaveMap;
  woven.bumpMap = weaveMap;
  woven.bumpScale = 0.0018;
  const mat = sub([0, 0.881, 0.69], 0.016, entrance);
  box([1.55, 0.018, 0.76], [0, 0.009, 0], woven, mat, 0.003);
  for (let thread = 0; thread < 33; thread++)
    for (const end of [-1, 1]) {
      const x = -0.72 + thread * 0.045;
      k.rod(
        [x, 0.007, end * 0.38],
        [x + k.range(-0.005, 0.005), 0.004, end * k.range(0.418, 0.432)],
        0.0018,
        straw,
        mat,
      );
    }

  const spindle = [
    [0.044, 0],
    [0.055, 0.045],
    [0.055, 0.09],
    [0.024, 0.16],
    [0.034, 0.29],
    [0.06, 0.37],
    [0.058, 0.42],
    [0.024, 0.53],
    [0.032, 0.67],
    [0.05, 0.73],
    [0.05, 0.78],
  ];
  const column = [
    [0.135, 0],
    [0.135, 0.13],
    [0.095, 0.19],
    [0.087, 0.38],
    [0.125, 0.46],
    [0.125, 0.52],
    [0.086, 0.6],
    [0.065, 2.26],
    [0.083, 2.34],
    [0.13, 2.43],
    [0.13, 2.53],
    [0.19, 2.57],
    [0.19, 2.68],
  ];
  {
    const balcony = sub([0, 4.26, 0], 0, building);
    box([24.95, 0.25, 2.58], [0, -0.06, 1.0], cream, balcony, 0.008);
    box([24.9, 0.11, 2.48], [0, 0.09, 1.01], mint, balcony, 0.003);
    for (let x = -12.15; x <= 12.16; x += 2.43) {
      k.lathe(column, [x, 0.14, 2.08], turquoise, balcony, 16);
      box([0.32, 0.3, 0.31], [x, 0.21, 2.08], chalk, balcony, 0.006);
      for (const y of [0.58, 2.6])
        box([0.3, 0.1, 0.29], [x, y, 2.08], cream, balcony, 0.004);
      scrollBrace(k, [x, 2.83, 2.1], 1, mint, balcony, 0.97);
      scrollBrace(k, [x, 2.83, 2.1], -1, mint, balcony, 0.97);
      const sideBrace = sub([x, 2.83, 2.04], PI / 2, balcony);
      scrollBrace(k, [0, 0, 0], 1, turquoise, sideBrace, 1.2);
    }
    for (let bay = 0; bay < 10; bay++) {
      const x = -12.15 + (bay + 0.5) * 2.43;
      for (const y of [0.21, 1.08])
        box([2.24, 0.12, 0.15], [x, y, 2.09], turquoise, balcony, 0.003);
      for (let spindleIndex = 0; spindleIndex < 10; spindleIndex++) {
        k.lathe(
          spindle,
          [x - 1.02 + spindleIndex * 0.226, 0.26, 2.09],
          mint,
          balcony,
          12,
        );
      }
      box([2.34, 0.105, 0.21], [x, 1.2, 2.09], cream, balcony, 0.004);
      piercedFrieze(k, balcony, x, -0.19, 2.17, 2.41, turquoise, cream);
      piercedFrieze(k, balcony, x, 2.92, 2.13, 2.41, mint, cream);
      // An open diamond transom casts its own fine fretwork shadow.
      for (let panel = 0; panel < 6; panel++) {
        const px = x - 0.94 + panel * 0.376;
        k.rod(
          [px - 0.17, 2.95, 2.13],
          [px, 3.15, 2.13],
          0.018,
          deepGreen,
          balcony,
        );
        k.rod(
          [px, 3.15, 2.13],
          [px + 0.17, 2.95, 2.13],
          0.018,
          deepGreen,
          balcony,
        );
      }
    }
    for (const sign of [-1, 1]) {
      const side = sub([sign * 12.16, 0, 0.97], PI / 2, balcony);
      for (const y of [0.23, 1.08, 1.21])
        box([2.15, 0.1, 0.15], [0, y, 0], turquoise, side, 0.002);
      for (let i = 0; i < 10; i++)
        k.lathe(spindle, [-0.98 + i * 0.217, 0.26, 0], mint, side, 12);
    }
    for (let x = -12; x <= 12; x += 0.25)
      box([0.17, 0.1, 2.14], [x, -0.24, 0.98], deepGreen, balcony, 0.002);
  }
  for (const x of [-12.1, -7.3, -2.42, 2.42, 4.85, 7.3, 12.1]) {
    k.lathe(
      [
        [0.16, 0],
        [0.16, 0.17],
        [0.12, 0.25],
        [0.105, 2.85],
        [0.18, 2.97],
        [0.21, 3.13],
      ],
      [x, 0.89, 2.02],
      chalk,
      building,
      20,
    );
    scrollBrace(k, [x, 4.02, 2.04], x < 0 ? 1 : -1, cream, building, 0.9);
  }
  box([25.2, 0.18, 10.15], [0, 7.5, -2.54], chalk, building, 0.008);
  const roofGeometry = new THREE.BufferGeometry();
  roofGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -12.75, 0, 5.05, 12.75, 0, 5.05, 9, 2.02, 0, -12.75, 0, 5.05, 9, 2.02,
        0, -9, 2.02, 0, -12.75, 0, -5.05, -9, 2.02, 0, 9, 2.02, 0, -12.75, 0,
        -5.05, 9, 2.02, 0, 12.75, 0, -5.05, -12.75, 0, -5.05, -12.75, 0, 5.05,
        -9, 2.02, 0, 12.75, 0, 5.05, 12.75, 0, -5.05, 9, 2.02, 0,
      ],
      3,
    ),
  );
  const roofUVs = [];
  for (let i = 0; i < roofGeometry.attributes.position.count; i++)
    roofUVs.push(
      roofGeometry.attributes.position.getX(i) / 2,
      roofGeometry.attributes.position.getZ(i) / 2,
    );
  roofGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(roofUVs, 2));
  roofGeometry.computeVertexNormals();
  k.mesh(roofGeometry, rust, [0, 7.66, -2.55], [0, 0, 0], building);
  for (let x = -12.5; x < 12.6; x += 0.26) {
    const ridgeHeight = Math.min(2.02, (12.75 - Math.abs(x)) * 0.54);
    k.rod(
      [x, 7.66, 2.5],
      [x, 7.66 + ridgeHeight, -2.4],
      0.027,
      m.terracotta,
      building,
    );
    k.rod(
      [x, 7.66 + ridgeHeight, -2.4],
      [x, 7.66, -7.55],
      0.027,
      m.terracotta,
      building,
    );
  }
  box([25.35, 0.19, 0.25], [0, 7.55, 2.49], turquoise, building, 0.005);
  piercedFrieze(k, building, 0, 7.47, 2.48, 25.1, mint, cream);
  for (const x of [-6.2, 1.2, 7.6])
    paintScuff(k, [x, 5.46, 2.1965], 0.14, 0.036, m.cedar, building);

  for (const x of [-16.6, 17.6])
    k.tree([x, 0, 5.1], {
      height: x < 0 ? 9.2 : 8.4,
      radius: 3.3,
      kind: "palm",
    });
  for (const x of [-14, 14]) {
    k.cylinder(0.68, 0.16, [x, 0.05, 6], stone, k.group, 0.68, 32);
    k.lathe(
      [
        [0.38, 0],
        [0.5, 0.09],
        [0.58, 0.66],
        [0.6, 0.72],
        [0.54, 0.75],
      ],
      [x, 0.12, 6],
      m.terracotta,
    );
    k.tree([x, 0.6, 6], { height: 2.1, radius: 0.95, kind: "shrub" });
  }
  for (const x of [-27, 27]) {
    const neighbor = sub([x, 0, -4.0]);
    box([14, 8.2, 13], [0, 4.1, -2], m.plaster, neighbor, 0);
    for (const y of [2.1, 5.4])
      for (const wx of [-4.5, -1.5, 1.5, 4.5]) {
        box([1.35, 2.1, 0.1], [wx, y, 4.54], warmWood, neighbor, 0.005);
        for (let row = 0; row < 16; row++)
          box(
            [1.2, 0.067, 0.12],
            [wx, y - 0.96 + row * 0.124, 4.6],
            deepGreen,
            neighbor,
            0.001,
          );
      }
    box([14.4, 0.25, 13.4], [0, 8.33, -2], cream, neighbor, 0.008);
  }
  const contextPlaster = k.material(0xbab4a0, 0.96);
  contextPlaster.normalMap = m.plaster.normalMap;
  contextPlaster.normalScale.set(0.4, 0.4);
  for (const side of [-1, 1]) {
    const neighbor = sub([side * 17.1, 0, -5.4]);
    box([8.2, 7.7, 11.3], [0, 3.85, 0], contextPlaster, neighbor, 0.012);
    box([8.35, 0.28, 11.45], [0, 0.17, 0], stone, neighbor, 0.009);
    for (const y of [3.8, 7.66])
      box([8.45, 0.18, 11.55], [0, y, 0], chalk, neighbor, 0.005);
    for (const y of [1.4, 4.9])
      for (const x of [-2.65, 0, 2.65]) {
        box([1.54, 2.26, 0.12], [x, y + 0.35, 5.7], cream, neighbor, 0.004);
        box([1.3, 2.05, 0.1], [x, y + 0.35, 5.79], deepGreen, neighbor, 0.003);
        for (let row = 0; row < 19; row++)
          box(
            [1.21, 0.045, 0.12],
            [x, y - 0.53 + row * 0.1, 5.86],
            turquoise,
            neighbor,
            0.001,
            [-0.3, 0, 0],
          );
        box([1.68, 0.1, 0.31], [x, y - 0.8, 5.82], chalk, neighbor, 0.004);
      }
    for (const z of [-9, -15])
      k.tree([side * 23.4, 0, z], {
        height: 9.2,
        radius: 4.0,
        kind: "broadleaf",
      });
    k.tree([side * 27, 0, 18.8], { height: 8.3, radius: 3.2, kind: "palm" });
    const bench = sub(side < 0 ? [-1.6, 0.07, 7.35] : [11, 0, 20.4]);
    for (let board = 0; board < 4; board++)
      box([2.25, 0.07, 0.11], [0, 0.52, board * 0.125], warmWood, bench, 0.004);
    for (let board = 0; board < 4; board++)
      box(
        [2.25, 0.1, 0.075],
        [0, 0.71 + board * 0.13, -0.09],
        warmWood,
        bench,
        0.003,
      );
    for (const x of [-0.84, 0.84]) {
      k.rod([x, -0.006, 0.06], [x, 1.19, -0.09], 0.035, m.iron, bench);
      k.rod([x, -0.006, 0.44], [x, 0.52, 0.32], 0.035, m.iron, bench);
    }
  }
  {
    k.paving({
      width: 4.2,
      depth: 3.1,
      position: [-1.6, 0.045, 8.25],
      stoneSize: 0.58,
      material: m.stone,
    });
    for (const z of [6.65, 9.85])
      box([4.4, 0.1, 0.1], [-1.6, 0.015, z], stone, k.group, 0.006);
    for (const x of [-3.75, 0.55])
      box([0.1, 0.1, 3.3], [x, 0.015, 8.25], stone, k.group, 0.006);
    const restCorner = sub([-1.6, 0.07, 8.25]);
    restCorner.name = "Shaded coastal rope-and-basket bench";
    const shadeWood = k.surfaceMaterial("weathered-wood", {
      scale: 1.4,
      normalStrength: 0.22,
    });
    const shadeHeight = (x, z) =>
      2.6 +
      0.06 * (x / 2.1) ** 2 +
      0.04 * (z / 1.575) ** 2 -
      0.014 * Math.cos(x * 2 + z * 3);
    const shade = new THREE.PlaneGeometry(4.2, 3.15, 16, 12),
      shadePoints = shade.attributes.position;
    for (let i = 0; i < shadePoints.count; i++)
      shadePoints.setZ(
        i,
        shadeHeight(shadePoints.getX(i), -shadePoints.getY(i)),
      );
    shade.computeVertexNormals();
    k.mesh(shade, m.linen, [0, 0, 0], [-PI / 2, 0, 0], restCorner);
    for (const x of [-1.95, 1.95])
      for (const z of [-1.4, 1.4]) {
        const height = shadeHeight(x, z);
        k.rod(
          [x, -0.012, z],
          [x, height + 0.035, z],
          0.038,
          shadeWood,
          restCorner,
        );
        k.ring(0.045, 0.006, [x, height - 0.02, z], ropeMaterial, restCorner);
      }
    const worktable = sub([0.92, 0, 0.62], -0.08, restCorner);
    for (const x of [-0.43, 0.43])
      for (const z of [-0.24, 0.24])
        box([0.065, 0.66, 0.065], [x, 0.33, z], shadeWood, worktable, 0.004);
    for (const z of [-0.225, 0, 0.225])
      box([1.08, 0.055, 0.215], [0, 0.69, z], shadeWood, worktable, 0.005);
    ropeCoil(k, [-0.14, 0.726, -0.035], ropeMaterial, worktable, 0.21);
    const winder = sub([0.32, 0.739, 0.025], -0.24, worktable);
    box([0.24, 0.027, 0.052], [0, 0, 0], warmWood, winder, 0.005);
    for (const x of [-0.11, 0.11])
      box([0.035, 0.028, 0.14], [x, 0, 0], warmWood, winder, 0.004);
    for (let turn = 0; turn < 7; turn++)
      k.tube(
        [
          [-0.084 + turn * 0.024, 0.017, -0.032],
          [-0.084 + turn * 0.024, 0.019, 0.032],
          [-0.084 + turn * 0.024, -0.018, 0.032],
          [-0.084 + turn * 0.024, -0.018, -0.032],
        ],
        0.0028,
        ropeMaterial,
        winder,
        true,
      );
    wovenBasket(k, [-1.29, -0.004, 0.63], ropeMaterial, restCorner);
    k.mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.55, 20),
      m.linen,
      [-0.65, 0.61, -0.7],
      [0, 0, PI / 2],
      restCorner,
    );
    const seaTree = [7.2, 0, 21.0];
    box(
      [1.35, 0.05, 1.35],
      [seaTree[0], 0.012, seaTree[2]],
      m.ground,
      k.group,
      0,
    );
    for (const dx of [-0.72, 0.72])
      box(
        [0.1, 0.12, 1.55],
        [seaTree[0] + dx, 0.035, seaTree[2]],
        stone,
        k.group,
        0.006,
      );
    for (const dz of [-0.72, 0.72])
      box(
        [1.55, 0.12, 0.1],
        [seaTree[0], 0.035, seaTree[2] + dz],
        stone,
        k.group,
        0.006,
      );
    k.tree(seaTree, { height: 6.2, radius: 2.25, kind: "palm" });
    wovenBasket(k, [10.3, -0.005, 20.78], ropeMaterial, k.group, 0.25, 0.33);
  }
  box([1000, 0.1, 14], [0, -0.16, 16.4], m.ground, k.group, 0);
  for (const x of [-34, 34]) {
    const block = sub([x, 0, -18]);
    box([19, 9.1, 24], [0, 4.55, 0], contextPlaster, block, 0.006);
    box([19.3, 0.3, 24.3], [0, 9.16, 0], chalk, block, 0.008);
    for (const y of [2.2, 5.5, 8.0])
      for (let wx = -7.6; wx < 8; wx += 3.8) {
        box([1.45, 1.9, 0.09], [wx, y, 12.05], deepGreen, block, 0.003);
        box([1.65, 0.1, 0.22], [wx, y - 0.99, 12.1], cream, block, 0.003);
      }
  }
  for (const side of [-1, 1])
    for (let block = 0; block < 4; block++) {
      const width = 17.5,
        height = 7.8 + (block % 2) * 1.2;
      const row = sub([
        side * (51.5 + block * 18.1),
        0,
        -5.8 - (block % 2) * 0.45,
      ]);
      box([width, height, 15.0], [0, height / 2, 0], contextPlaster, row, 0);
      box([width + 0.2, 0.22, 15.2], [0, height + 0.08, 0], cream, row, 0.004);
      for (const y of [1.7, 4.9])
        for (const x of [-6.9, -3.4, 0, 3.4, 6.9]) {
          box([1.4, 2.13, 0.12], [x, y, 7.55], deepGreen, row, 0);
          box([1.64, 0.13, 0.18], [x, y - 1.1, 7.59], cream, row, 0);
          box([0.065, 2.05, 0.08], [x, y, 7.63], mint, row, 0);
        }
      box([width + 0.12, 0.15, 0.24], [0, 3.5, 7.53], chalk, row, 0);
    }
  for (const side of [-1, 1])
    k.tree([side * 75.0, 0, 7.7], {
      height: 8.5,
      radius: 3.6,
      kind: "broadleaf",
    });
  box([1000, 1.0, 0.75], [0, 0.4, 23], chalk, k.group, 0.015);
  box([1000, 0.17, 0.98], [0, 0.98, 23], cream, k.group, 0.013);
  const mooring = sub([9.4, 0, 22.1]);
  k.cylinder(0.13, 0.055, [0, 0.0225, 0], m.iron, mooring, 0.15, 16);
  k.cylinder(0.07, 0.31, [0, 0.2, 0], m.iron, mooring, 0.08, 16);
  k.rod([-0.16, 0.3, 0], [0.16, 0.3, 0], 0.046, m.iron, mooring);
  ropeCoil(k, [0.64, 0.035, 0], ropeMaterial, mooring, 0.35);
  k.tube(
    [
      [0.98, 0.045, -0.04],
      [1.17, 0.043, 0.18],
      [1.39, 0.035, 0.07],
    ],
    0.01,
    ropeMaterial,
    mooring,
  );
  k.water({
    width: 2500,
    depth: 2000,
    position: [0, -0.22, 1023],
    color: 0x477b86,
  });
  const mooredBoat = sub([13.5, -0.15, 52.5], -0.28);
  const hullMaterial = k.material(0x584434, 0.89);
  hullMaterial.side = THREE.DoubleSide;
  const hullPositions = [],
    hullUVs = [],
    hullIndices = [];
  for (let station = 0; station <= 20; station++) {
    const t = station / 20,
      width = 0.08 + Math.sin(t * PI) ** 0.7 * 0.88;
    const bottom = -0.33 + 0.2 * (2 * t - 1) ** 4;
    for (let rib = 0; rib <= 10; rib++) {
      const angle = -PI / 2 + (rib / 10) * PI;
      hullPositions.push(
        Math.sin(angle) * width,
        bottom + 0.68 * (1 - Math.cos(angle)),
        -3.5 + 7 * t,
      );
      hullUVs.push(rib / 10, t * 4);
      if (station && rib) {
        const a = (station - 1) * 11 + rib - 1,
          b = station * 11 + rib - 1;
        hullIndices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const hull = new THREE.BufferGeometry();
  hull.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(hullPositions, 3),
  );
  hull.setAttribute("uv", new THREE.Float32BufferAttribute(hullUVs, 2));
  hull.setIndex(hullIndices);
  hull.computeVertexNormals();
  k.mesh(hull, hullMaterial, [0, 0, 0], [0, 0, 0], mooredBoat);
  for (const side of [-1, 1])
    k.tube(
      Array.from({ length: 21 }, (_, i) => {
        const t = i / 20;
        return [
          side * (0.08 + Math.sin(t * PI) ** 0.7 * 0.88),
          0.35 + 0.2 * (2 * t - 1) ** 4,
          -3.5 + 7 * t,
        ];
      }),
      0.054,
      warmWood,
      mooredBoat,
    );
  for (const z of [-1.85, -0.55, 0.85, 2.05])
    box([1.38, 0.095, 0.25], [0, 0.21, z], warmWood, mooredBoat, 0.008);
  k.rod([0, -0.01, -0.45], [0, 4.4, -0.61], 0.055, warmWood, mooredBoat, 0.033);
  k.rod([0, 4.18, -1.3], [0, 2.2, 2.79], 0.04, warmWood, mooredBoat);
  k.tube(
    [
      [0, 4.12, -1.18],
      [0, 3.5, 0.06],
      [0, 2.24, 2.68],
    ],
    0.082,
    m.linen,
    mooredBoat,
  );
  k.tube(
    [
      [0, 4.34, -0.61],
      [0.78, 0.38, 1.64],
      [0, 4.34, -0.61],
      [-0.78, 0.38, 1.64],
    ],
    0.008,
    cream,
    mooredBoat,
  );
  k.tube(
    [
      [0, 0.53, -3.47],
      [-0.4, 0.02, -5.8],
      [-0.56, -0.03, -8.2],
    ],
    0.015,
    warmWood,
    mooredBoat,
  );
  k.sphere(0.15, [-0.56, -0.02, -8.2], cream, mooredBoat, [1, 0.8, 1]);
  return k.finish(
    definition,
    {
      arrival: outdoorView(
        "Trading house and shaded work corner",
        [4.1, 1.66, 13.6],
        [-1.0, 3.1, -2.4],
        68,
      ),
      entrance: outdoorView(
        "Carved door and coral steps",
        [-0.8, 1.66, 3.2],
        [-3.86, 2.18, -3.2],
        62,
      ),
      balconies: outdoorView(
        "Ornamental timber gallery",
        [-7.7, 1.66, 5.6],
        [-2.8, 5.65, -1.25],
        64,
      ),
      coastal: outdoorView(
        "Rope and baskets in the shade",
        [3.6, 1.63, 10.8],
        [-1.35, 1.13, 8.05],
        57,
      ),
    },
    [
      [-3.24, 0.52, -1.77],
      [-2.8, 5.1, -1.21],
      [1.0, 7.14, -1.2],
      [10.3, 0.12, 10.7],
    ],
    { exposure: 0.87 },
  );
}

function roofFascia(k, parent, points, height, material) {
  const positions = [],
    uvs = [],
    indices = [];
  material.side = THREE.DoubleSide;
  let distance = 0;
  for (let i = 0; i < points.length; i++) {
    const [x, y, z] = points[i];
    if (i) distance += Math.hypot(x - points[i - 1][0], y - points[i - 1][1]);
    positions.push(x, y, z + 0.018, x, y - height, z + 0.018);
    uvs.push(distance / 0.9, height / 0.9, distance / 0.9, 0);
    if (i) {
      const a = (i - 1) * 2,
        b = i * 2;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
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
  k.mesh(geometry, material, [0, 0, 0], [0, 0, 0], parent);
}

function curvedRoof(
  k,
  parent,
  {
    width,
    length,
    ridge,
    eave,
    centerZ,
    materials,
    edgeMaterial,
    fasciaMaterial = edgeMaterial,
    tileScale = 1,
    shoulder = 0.4,
  },
) {
  const half = width / 2;
  const heightAt = (x, z) => {
    const t = Math.min(1, Math.abs(x) / half),
      longitudinal = Math.abs((z - centerZ) / (length / 2));
    const knee = 16 * shoulder * t * t * (1 - t) * (1 - t);
    return (
      eave +
      (ridge - eave) * (1 - t) ** 2.08 +
      knee +
      0.17 * t ** 12 +
      0.34 * longitudinal ** 12 * (1 - 0.5 * t)
    );
  };
  const basePositions = [],
    baseUVs = [],
    baseIndices = [];
  const xSegments = 42,
    zSegments = 28;
  for (let row = 0; row <= zSegments; row++)
    for (let column = 0; column <= xSegments; column++) {
      const x = -half + (width * column) / xSegments,
        z = centerZ - length / 2 + (length * row) / zSegments;
      basePositions.push(x, heightAt(x, z), z);
      baseUVs.push(column / 3, row / 3);
    }
  for (let row = 0; row < zSegments; row++)
    for (let column = 0; column < xSegments; column++) {
      const a = row * (xSegments + 1) + column,
        b = a + xSegments + 1;
      baseIndices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const base = new THREE.BufferGeometry();
  base.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(basePositions, 3),
  );
  base.setAttribute("uv", new THREE.Float32BufferAttribute(baseUVs, 2));
  base.setIndex(baseIndices);
  base.computeVertexNormals();
  k.mesh(base, materials[0], [0, 0, 0], [0, 0, 0], parent);
  // A roof has an opaque timber soffit as well as its upward-facing tile surface.
  const underside = base.clone(),
    soffitPositions = underside.attributes.position;
  for (let i = 0; i < soffitPositions.count; i++)
    soffitPositions.setY(i, soffitPositions.getY(i) - 0.095 * tileScale);
  const soffitIndices = underside.index;
  for (let i = 0; i < soffitIndices.count; i += 3) {
    const first = soffitIndices.getX(i);
    soffitIndices.setX(i, soffitIndices.getX(i + 2));
    soffitIndices.setX(i + 2, first);
  }
  underside.computeVertexNormals();
  k.mesh(underside, edgeMaterial, [0, 0, 0], [0, 0, 0], parent);

  // Each pan tile has a cambered top and a projecting, shadow-casting lower lip.
  const batches = materials.map(() => ({
    positions: [],
    uvs: [],
    indices: [],
  }));
  const across = Math.ceil(half / (0.205 * tileScale)),
    along = Math.ceil(length / (0.28 * tileScale));
  for (const side of [-1, 1])
    for (let row = 0; row < across; row++)
      for (let column = 0; column < along; column++) {
        const batch = batches[Math.floor(k.random() * batches.length)],
          start = batch.positions.length / 3;
        const x0 = side * ((row * half) / across),
          x1 = side * (((row + 1) * half) / across + 0.023);
        const z0 = centerZ - length / 2 + (column * length) / along + 0.006,
          z1 = z0 + length / along - 0.012;
        const weather = k.range(0, 0.008);
        for (let u = 0; u <= 2; u++)
          for (let v = 0; v <= 2; v++) {
            const x = THREE.MathUtils.lerp(x0, x1, u / 2),
              z = THREE.MathUtils.lerp(z0, z1, v / 2);
            batch.positions.push(
              x,
              heightAt(x, z) +
                0.03 +
                weather +
                0.018 * Math.sin((v / 2) * PI) +
                0.009 * u,
              z,
            );
            batch.uvs.push(v / 2, u / 2);
          }
        for (let u = 0; u < 2; u++)
          for (let v = 0; v < 2; v++) {
            const a = start + u * 3 + v,
              b = a + 3;
            if (side > 0) batch.indices.push(a, a + 1, b, b, a + 1, b + 1);
            else batch.indices.push(a, b, a + 1, b, b + 1, a + 1);
          }
        const lipStart = batch.positions.length / 3;
        for (let v = 0; v <= 2; v++) {
          const z = THREE.MathUtils.lerp(z0, z1, v / 2);
          batch.positions.push(x1, heightAt(x1, z) + 0.005, z);
          batch.uvs.push(v / 2, 0);
        }
        for (let v = 0; v < 2; v++) {
          const a = start + 6 + v,
            b = lipStart + v;
          if (side > 0) batch.indices.push(a, b, a + 1, b, b + 1, a + 1);
          else batch.indices.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i],
      geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(batch.positions, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(batch.uvs, 2));
    geometry.setIndex(batch.indices);
    geometry.computeVertexNormals();
    k.mesh(geometry, materials[i], [0, 0, 0], [0, 0, 0], parent);
  }
  for (const end of [-1, 1]) {
    const z = centerZ + (end * length) / 2;
    for (const side of [-1, 1]) {
      const points = Array.from({ length: 24 }, (_, i) => {
        const x = (side * half * i) / 23;
        return [x, heightAt(x, z) + 0.035, z];
      });
      roofFascia(k, parent, points, 0.27 * tileScale, fasciaMaterial);
      k.tube(points, 0.051 * tileScale, k.m.cream, parent);
      k.tube(
        points.map(([x, y, pz]) => [x, y - 0.27 * tileScale, pz - end * 0.04]),
        0.024 * tileScale,
        k.m.brass,
        parent,
      );
      const tip = points[points.length - 1];
      k.tube(
        [
          tip,
          [tip[0] + side * 0.2, tip[1] + 0.18, z],
          [tip[0] + side * 0.34, tip[1] + 0.56, z],
          [tip[0] + side * 0.25, tip[1] + 0.8, z],
        ],
        0.037 * tileScale,
        k.m.brass,
        parent,
      );
    }
  }
  for (const side of [-1, 1]) {
    const points = Array.from({ length: 24 }, (_, i) => {
      const z = centerZ - length / 2 + (length * i) / 23;
      return [side * half, heightAt(half, z) - 0.055, z];
    });
    roofFascia(k, parent, points, 0.19 * tileScale, edgeMaterial);
    k.tube(points, 0.083 * tileScale, edgeMaterial, parent);
    for (
      let z = centerZ - length / 2 + 0.2;
      z < centerZ + length / 2;
      z += 0.32 * tileScale
    ) {
      k.box(
        [0.2 * tileScale, 0.11 * tileScale, 0.05 * tileScale],
        [side * (half - 0.08), heightAt(half, z) - 0.13, z],
        edgeMaterial,
        parent,
        0.003,
      );
    }
  }
  k.tube(
    Array.from({ length: 25 }, (_, i) => {
      const z = centerZ - length / 2 + (length * i) / 24;
      return [0, heightAt(0, z) + 0.08, z];
    }),
    0.13 * tileScale,
    edgeMaterial,
    parent,
  );
  return heightAt;
}

function gildedColumn(k, position, height, red, gold, parent) {
  const column = k.sub(position, 0, parent);
  k.lathe(
    [
      [0.23, 0],
      [0.23, 0.12],
      [0.19, 0.17],
      [0.16, 0.27],
      [0.145, height - 0.4],
      [0.19, height - 0.28],
      [0.24, height - 0.22],
      [0.24, height],
    ],
    [0, 0, 0],
    red,
    column,
    16,
  );
  for (const y of [0.15, 0.29, height - 0.39, height - 0.25, height - 0.08])
    k.cylinder(
      y < 0.3 ? 0.21 : 0.245,
      0.057,
      [0, y, 0],
      gold,
      column,
      y < 0.3 ? 0.21 : 0.245,
      16,
    );
  for (let y = 0.52; y < height - 0.6; y += 0.32)
    for (let face = 0; face < 4; face++) {
      const panel = k.sub([0, 0, 0], (face * PI) / 2, column);
      diamond(k, [0, y, 0.15], 0.13, 0.23, gold, panel, 0.012);
      diamond(k, [0, y, 0.164], 0.055, 0.1, red, panel, 0.009);
    }
  for (const side of [-1, 1]) {
    scrollBrace(k, [0, height - 0.04, 0.04], side, gold, column, 0.9);
    const cross = k.sub([0, 0, 0], PI / 2, column);
    scrollBrace(k, [0, height - 0.04, 0.04], side, gold, cross, 0.9);
  }
}

function stupa(k, position, scale, plaster, gold) {
  const group = k.sub(position);
  group.scale.setScalar(scale);
  for (let tier = 0; tier < 4; tier++) {
    const width = 2.9 - tier * 0.3;
    k.box(
      [width, 0.21, width],
      [0, 0.11 + tier * 0.23, 0],
      plaster,
      group,
      0.013,
    );
  }
  k.lathe(
    [
      [1.04, 0],
      [1.04, 0.16],
      [0.88, 0.21],
      [0.88, 0.32],
      [0.99, 0.38],
      [0.91, 0.5],
      [0.73, 0.58],
      [0.63, 0.77],
      [0.54, 1.03],
      [0.5, 1.35],
      [0.44, 1.58],
      [0.3, 1.76],
      [0.26, 1.82],
    ],
    [0, 0.87, 0],
    plaster,
    group,
    32,
  );
  for (let ring = 0; ring < 5; ring++)
    k.cylinder(
      0.35 - ring * 0.035,
      0.1,
      [0, 2.72 + ring * 0.13, 0],
      plaster,
      group,
      0.4 - ring * 0.035,
      32,
    );
  k.lathe(
    [
      [0.23, 0],
      [0.25, 0.12],
      [0.16, 0.21],
      [0.17, 0.36],
      [0.12, 0.43],
      [0.13, 0.6],
      [0.085, 0.68],
      [0.09, 0.83],
      [0.048, 0.92],
      [0.04, 1.22],
      [0, 1.61],
    ],
    [0, 3.3, 0],
    gold,
    group,
    24,
  );
  for (let side = 0; side < 4; side++) {
    const panel = k.sub([0, 0, 0], (side * PI) / 2, group);
    pointedBand(k, {
      width: 0.35,
      spring: 0.31,
      rise: 0.29,
      thickness: 0.1,
      position: [0, 1.29, 0.78],
      material: gold,
      parent: panel,
      depth: 0.035,
    });
  }
  return group;
}

/** An original Lao court ensemble with swept tiled roofs and nonfigurative relief. */
export function buildLaoTempleCourt(definition, renderer) {
  const k = architectureKit(renderer, seedFor(definition, 1560), {
    sunPosition: [-13, 18, 11],
    sunColor: 0xffe4bb,
    sunIntensity: 3.1,
    skyColor: 0xb8d2d6,
    fogDensity: 0.008,
    exposure: 0.85,
  });
  const { m, box, sub } = k;
  const gold = k.material(0xc49b4d, 0.41, 0.62),
    paleGold = k.material(0xd1b173, 0.57, 0.31);
  const lacquer = k.material(0x582e26, 0.7),
    oldRed = k.material(0x793e31, 0.89);
  const ivory = k.material(0xc5baa0, 0.96),
    plaster = m.plaster;
  gold.userData.patinaProfile = paleGold.userData.patinaProfile = "metal";
  lacquer.userData.patinaProfile = oldRed.userData.patinaProfile = "wood";
  ivory.userData.patinaProfile = "plaster";
  const fascia = ornamentMaterial(k, {
    ground: "#642b23",
    line: "#d6b365",
    accent: "#bd9548",
    roughness: 0.57,
  });
  const roofMaterials = [
    0x884e37, 0x78503b, 0x9d5e43, 0x694735, 0x866347, 0x956649,
  ].map((color) => k.material(color, 0.91));
  for (const material of roofMaterials)
    material.userData.patinaProfile = "tile";
  const clayGrain = k.texture(
    (context, size) => {
      context.fillStyle = "#c3c3c3";
      context.fillRect(0, 0, size, size);
      for (let i = 0; i < 14000; i++) {
        const value = Math.floor(k.range(135, 240));
        context.fillStyle = `rgb(${value},${value},${value})`;
        context.fillRect(
          k.random() * size,
          k.random() * size,
          k.range(0.4, 3.1),
          k.range(0.4, 4.5),
        );
      }
      for (let i = 0; i < 23; i++) {
        context.strokeStyle = "#7c7c7c28";
        context.lineWidth = k.range(0.3, 1.4);
        context.beginPath();
        context.moveTo(k.random() * size, 0);
        context.quadraticCurveTo(
          k.random() * size,
          size * 0.55,
          k.random() * size,
          size,
        );
        context.stroke();
      }
    },
    [1, 1],
    512,
  );
  clayGrain.colorSpace = THREE.NoColorSpace;
  for (const clay of roofMaterials) {
    clay.bumpMap = clayGrain;
    clay.bumpScale = 0.006;
    clay.roughnessMap = clayGrain;
  }
  box([80, 0.3, 75], [0, -0.22, 0], m.stone, k.group, 0);
  const paving = k.paving({
    width: 37,
    depth: 37,
    position: [0, -0.005, 0],
    stoneSize: 0.67,
    material: m.stone,
  });
  wornPaving(k, paving, [
    [-7.4, 10.9, true],
    [-5.7, 8.5, false],
    [7.7, 5.5, false],
    [3.0, 11.8, true],
  ]);
  const temple = sub([2.0, 0, -3.8], -0.16);
  temple.scale.set(0.91, 1, 0.88);
  for (let step = 0; step < 4; step++)
    box(
      [9.1 - step * 0.31, 0.16, 17.0 - step * 0.31],
      [0, 0.08 + step * 0.15, -2.3],
      ivory,
      temple,
      0.012,
    );
  box([6.6, 3.9, 12.4], [0, 2.52, -3.3], lacquer, temple, 0.006);
  for (const side of [-1, 1]) {
    const wall = sub(
      [side * 3.32, 0.67, -3.4],
      side > 0 ? PI / 2 : -PI / 2,
      temple,
    );
    box([12.0, 0.18, 0.09], [0, 0.1, 0], oldRed, wall, 0.005);
    box([12.0, 0.12, 0.13], [0, 3.44, 0.025], gold, wall, 0.004);
    for (let bay = 0; bay < 6; bay++) {
      const x = (bay - 2.5) * 1.94;
      box([0.1, 3.38, 0.12], [x - 0.94, 1.85, 0.025], gold, wall, 0.003);
      box([1.34, 2.13, 0.08], [x, 1.76, 0.05], oldRed, wall, 0.004);
      for (const sx of [-0.71, 0.71])
        box([0.085, 2.4, 0.1], [x + sx, 1.81, 0.09], paleGold, wall, 0.004);
      for (const y of [0.6, 3.02])
        box([1.49, 0.09, 0.12], [x, y, 0.1], gold, wall, 0.003);
      for (let row = 0; row < 6; row++)
        for (let column = 0; column < 2; column++) {
          const center = x + (column - 0.5) * 0.53 + (row % 2 ? 0.1 : -0.1),
            y = 0.83 + row * 0.36;
          diamond(k, [center, y, 0.11], 0.28, 0.25, gold, wall, 0.017);
          diamond(k, [center, y, 0.13], 0.14, 0.12, lacquer, wall, 0.012);
          k.rod(
            [center - 0.16, y - 0.12, 0.15],
            [center, y - 0.23, 0.15],
            0.013,
            paleGold,
            wall,
          );
          k.rod(
            [center, y - 0.23, 0.15],
            [center + 0.16, y - 0.12, 0.15],
            0.013,
            paleGold,
            wall,
          );
        }
      for (let i = 0; i < 8; i++)
        diamond(
          k,
          [x - 0.7 + i * 0.2, 3.27, 0.04],
          0.11,
          0.12,
          paleGold,
          wall,
          0.009,
        );
    }
  }
  for (const z of [3.3, 5.12])
    for (const x of [-2.73, 2.73])
      gildedColumn(k, [x, 0.65, z], 4.24, lacquer, gold, temple);
  paintScuff(k, [2.73, 0.8, 5.333], 0.12, 0.022, lacquer, temple);
  box([6.2, 0.19, 2.4], [0, 0.67, 4.1], oldRed, temple, 0.006);
  for (let step = 0; step < 4; step++)
    box(
      [4.2 - step * 0.12, 0.16, 2.15 - step * 0.39],
      [0, 0.08 + step * 0.15, 6.05 - step * 0.195],
      ivory,
      temple,
      0.012,
    );
  k.wearPatch([-0.65, 0.53, 5.956], {
    width: 0.75,
    height: 0.13,
    parent: temple,
    surface: "worn-plaster",
    strength: 0.24,
    scale: 1.3,
  });
  carvedDoor(k, [0, 0.67, 2.94], 1.65, 2.85, lacquer, gold, temple);
  for (const side of [-1, 1])
    for (let row = 0; row < 7; row++) {
      diamond(
        k,
        [side * 2.14, 1.0 + row * 0.42, 2.967],
        0.32,
        0.36,
        paleGold,
        temple,
        0.02,
      );
    }
  box([6.3, 0.26, 0.28], [0, 4.89, 5.12], lacquer, temple, 0.004);
  for (const y of [4.78, 4.99])
    box([6.38, 0.046, 0.33], [0, y, 5.12], gold, temple, 0.002);
  for (let i = 0; i < 25; i++)
    diamond(
      k,
      [-2.95 + i * 0.245, 4.88, 5.29],
      0.14,
      0.13,
      gold,
      temple,
      0.014,
    );

  const lowerRoofHeight = curvedRoof(k, temple, {
    width: 13.35,
    length: 19.2,
    ridge: 6.28,
    eave: 1.99,
    centerZ: -2.2,
    materials: roofMaterials,
    edgeMaterial: lacquer,
    fasciaMaterial: fascia,
    shoulder: 1.55,
  });
  curvedRoof(k, temple, {
    width: 10.25,
    length: 16.95,
    ridge: 7.68,
    eave: 3.78,
    centerZ: -2.05,
    materials: roofMaterials,
    edgeMaterial: lacquer,
    fasciaMaterial: fascia,
    shoulder: 1.55,
  });
  const upperRoofHeight = curvedRoof(k, temple, {
    width: 7.45,
    length: 14.75,
    ridge: 9.0,
    eave: 5.38,
    centerZ: -1.89,
    materials: roofMaterials,
    edgeMaterial: lacquer,
    fasciaMaterial: fascia,
    shoulder: 1.55,
  });
  // Nonfigurative relief on the forward gable, below the upper roof's curve.
  const gable = new THREE.Shape();
  gable.moveTo(-3.725, 5.3);
  for (let i = 0; i <= 64; i++) {
    const x = -3.725 + (i / 64) * 7.45;
    gable.lineTo(x, upperRoofHeight(x, 5.485) - 0.14);
  }
  gable.lineTo(3.725, 5.3);
  gable.closePath();
  shapeMesh(k, gable, lacquer, [0, 0, 5.48], 0.14, temple);
  for (const side of [-1, 1]) {
    const points = Array.from({ length: 28 }, (_, i) => {
      const x = (side * 3.725 * i) / 27;
      return [x, upperRoofHeight(x, 5.485) - 0.2, 5.655];
    });
    k.tube(points, 0.065, gold, temple);
  }
  for (let row = 0; row < 12; row++) {
    const y = 5.49 + row * 0.29;
    let half = 0;
    for (let x = 0; x < 3.6; x += 0.04)
      if (upperRoofHeight(x, 5.485) > y + 0.35) half = x;
    for (let x = -half; x <= half; x += 0.31) {
      diamond(k, [x, y, 5.649], 0.2, 0.25, gold, temple, 0.034);
      diamond(k, [x, y, 5.686], 0.075, 0.11, oldRed, temple, 0.012);
    }
  }
  for (const end of [-1, 1]) {
    const z = -1.89 + end * 7.375;
    k.tube(
      [
        [0, 9.36, z],
        [0, 9.65, z + end * 0.24],
        [0, 10.14, z + end * 0.37],
        [0, 10.72, z + end * 0.17],
      ],
      0.069,
      gold,
      temple,
    );
    k.tube(
      [
        [0, 9.4, z],
        [0.09, 9.76, z + end * 0.05],
        [0.035, 10.2, z + end * 0.15],
      ],
      0.032,
      paleGold,
      temple,
    );
  }
  for (let z = -7.6; z < 2.8; z += 0.48) {
    k.lathe(
      [
        [0.11, 0],
        [0.12, 0.075],
        [0.07, 0.16],
        [0.065, 0.31],
        [0, 0.49],
      ],
      [0, 9.1, z],
      gold,
      temple,
      12,
    );
  }
  for (const side of [-1, 1])
    for (let z = -10.8; z < 6.5; z += 0.69) {
      k.tube(
        Array.from({ length: 12 }, (_, i) => {
          const x = side * (3.19 + (i / 11) * 3.19);
          return [x, lowerRoofHeight(x, z) - 0.19, z];
        }),
        0.055,
        lacquer,
        temple,
      );
    }

  const agedStupa = stupa(k, [11.2, 0, 3.3], 0.85, ivory, paleGold);
  k.wearPatch([0.48, 0.13, 1.451], {
    width: 0.58,
    height: 0.15,
    parent: agedStupa,
    surface: "worn-plaster",
    strength: 0.48,
    scale: 1.1,
  });
  k.wearPatch([0.31, 0.36, 1.301], {
    width: 0.42,
    height: 0.15,
    parent: agedStupa,
    surface: "worn-plaster",
    strength: 0.34,
    scale: 1.1,
  });
  stupa(k, [13.0, 0, -2.2], 0.66, plaster, gold);
  stupa(k, [-11.0, 0, -13.6], 1.02, ivory, paleGold);
  const pavilion = sub([-10.8, 0, 2.8], 0.22);
  for (let step = 0; step < 3; step++)
    box(
      [6.2 - step * 0.24, 0.17, 4.95 - step * 0.24],
      [0, 0.09 + step * 0.17, 0],
      ivory,
      pavilion,
      0.01,
    );
  box([4.9, 2.4, 0.2], [0, 1.72, -1.4], oldRed, pavilion, 0.005);
  for (const side of [-1, 1])
    box([0.16, 0.92, 2.8], [side * 2.45, 0.97, 0.05], lacquer, pavilion, 0.005);
  for (const z of [-1.25, 1.62])
    for (const x of [-2.25, 2.25])
      gildedColumn(k, [x, 0.52, z], 2.75, lacquer, gold, pavilion);
  for (let panel = 0; panel < 9; panel++) {
    const x = (panel - 4) * 0.48;
    box([0.034, 1.9, 0.05], [x, 1.77, -1.27], gold, pavilion, 0.002);
    for (const y of [1.03, 1.51, 1.99, 2.47])
      diamond(k, [x, y, -1.23], 0.25, 0.28, paleGold, pavilion, 0.018);
  }
  for (const x of [-1.74, 1.74]) {
    box([0.43, 0.11, 2.2], [x, 0.98, 0.02], m.cedar, pavilion, 0.008);
    for (const z of [-0.78, 0.78])
      box([0.23, 0.41, 0.23], [x, 0.74, z], lacquer, pavilion, 0.004);
  }
  const maintenance = sub([7.0, 0.02, 9.92], -0.1);
  maintenance.name = "Gardener water jar beside the foreground bench";
  maintenance.scale.setScalar(1.16);
  k.lathe(
    [
      [0.15, 0],
      [0.21, 0.045],
      [0.29, 0.19],
      [0.3, 0.3],
      [0.25, 0.43],
      [0.18, 0.49],
      [0.19, 0.53],
      [0.16, 0.53],
      [0.15, 0.47],
      [0.23, 0.35],
    ],
    [0, 0, 0],
    m.terracotta,
    maintenance,
    32,
  );
  k.cylinder(0.205, 0.025, [0, 0.535, 0], m.cedar, maintenance, 0.2, 32);
  k.sphere(0.036, [0, 0.562, 0], m.cedar, maintenance, [1, 0.5, 1]);
  const bristles = k.material(0x9f875d, 0.97);
  const broom = sub([7.41, 0.012, 10.18], -0.13);
  k.rod([0, 0.34, 0], [0.12, 1.7, -0.12], 0.014, m.cedar, broom);
  for (let strand = 0; strand < 28; strand++) {
    const offset = (strand - 13.5) * 0.009;
    k.rod(
      [offset, 0.012 + k.range(0, 0.014), k.range(-0.027, 0.027)],
      [offset * 0.17, 0.39, 0],
      0.0028,
      bristles,
      broom,
    );
  }
  k.ring(0.026, 0.006, [0, 0.31, 0], m.linen, broom);
  const cloth = new THREE.PlaneGeometry(0.34, 0.4, 10, 12),
    clothPositions = cloth.attributes.position;
  for (let i = 0; i < clothPositions.count; i++)
    clothPositions.setZ(
      i,
      0.011 * (1 + Math.sin(clothPositions.getY(i) * 24)) +
        0.004 * (1 + Math.cos(clothPositions.getX(i) * 31)),
    );
  cloth.computeVertexNormals();
  k.mesh(cloth, m.linen, [8.04, 0.638, 10.18], [-PI / 2, 0, 0.15]);
  const gardenNotes = k.book([8.58, 0.636, 10.04], {
    width: 0.2,
    depth: 0.3,
    thickness: 0.029,
    angle: 0.17,
    image: "/public/outdoors/generated/botanical-field-notes.png",
  });
  gardenNotes.name = "Garden notebook on the working bench";
  curvedRoof(k, pavilion, {
    width: 6.2,
    length: 5.15,
    ridge: 4.95,
    eave: 2.8,
    centerZ: -0.15,
    materials: roofMaterials,
    edgeMaterial: lacquer,
    fasciaMaterial: fascia,
    tileScale: 1.15,
    shoulder: 0.6,
  });
  curvedRoof(k, pavilion, {
    width: 4.75,
    length: 4.25,
    ridge: 5.95,
    eave: 4.0,
    centerZ: -0.22,
    materials: roofMaterials,
    edgeMaterial: lacquer,
    fasciaMaterial: fascia,
    tileScale: 1.15,
    shoulder: 0.6,
  });
  for (const [position, height, radius] of [
    [[-17.2, 0, 9], 7.1, 3.7],
    [[15.8, 0, 7.5], 7.7, 3.9],
    [[-14.7, 0, -18], 8.2, 4.2],
    [[14, 0, -19.5], 9.8, 4.7],
    [[1.4, 0, -23], 11.2, 5.1],
  ]) {
    k.tree(position, { height, radius, kind: "broadleaf" });
    k.cylinder(
      radius * 0.5,
      0.06,
      [position[0], 0.02, position[2]],
      m.bark,
      k.group,
      radius * 0.5,
      32,
    );
  }
  for (const x of [-18.9, 18.9]) {
    box([0.65, 1.4, 40], [x, 0.67, -1.4], plaster, k.group, 0.009);
    box([0.81, 0.14, 40.2], [x, 1.43, -1.4], ivory, k.group, 0.008);
    for (let z = -20; z < 18; z += 3.2) {
      box([0.89, 1.73, 0.85], [x, 0.82, z], ivory, k.group, 0.007);
      k.lathe(
        [
          [0.44, 0],
          [0.44, 0.1],
          [0.25, 0.22],
          [0.14, 0.41],
          [0, 0.55],
        ],
        [x, 1.7, z],
        oldRed,
        k.group,
        4,
      );
    }
  }
  box([39, 1.52, 0.65], [0, 0.71, -21.45], plaster, k.group, 0.01);
  box([39.25, 0.15, 0.86], [0, 1.5, -21.45], ivory, k.group, 0.008);
  for (const side of [-1, 1]) {
    box([15.4, 1.43, 0.67], [side * 11.2, 0.66, 19.35], plaster, k.group, 0.01);
    box([15.6, 0.15, 0.86], [side * 11.2, 1.42, 19.35], ivory, k.group, 0.008);
    box([0.83, 3.05, 0.83], [side * 3.36, 1.48, 19.35], ivory, k.group, 0.012);
    for (const y of [0.27, 2.75, 3.07])
      box([1.02, 0.15, 1.01], [side * 3.36, y, 19.35], oldRed, k.group, 0.008);
  }
  const weatheredWall = sub([-11.2, -0.055, 19.011], PI);
  plasteredSurface(k, {
    width: 15.4,
    height: 1.43,
    position: [0, 0, 0],
    material: plaster,
    parent: weatheredWall,
    losses: [
      [-3.1, 0.28, 0.42, 0.24],
      [4.6, 0.61, 0.26, 0.39],
    ],
  });
  const gate = sub([0, 0, 19.35]);
  gate.userData.batchRoot = true;
  gate.userData.sectionFootprint = [-3.8, -0.5, 3.8, 0.5];
  curvedRoof(k, gate, {
    width: 8.7,
    length: 3.1,
    ridge: 4.98,
    eave: 3.14,
    centerZ: 0,
    materials: roofMaterials,
    edgeMaterial: lacquer,
    tileScale: 2.3,
  });
  k.paving({
    width: 6.25,
    depth: 9.0,
    position: [0, -0.006, 21.3],
    stoneSize: 0.69,
    material: m.stone,
  });
  box([140, 0.12, 14], [0, -0.22, 27], m.ground, k.group, 0);
  box([160, 0.14, 160], [0, -0.39, 0], m.ground, k.group, 0);

  const dwellingPlaster = k.material(0xc2b69a, 0.97),
    dwellingTimber = k.material(0x614637, 0.88);
  dwellingPlaster.normalMap = m.plaster.normalMap;
  dwellingPlaster.normalScale.set(0.4, 0.4);
  dwellingTimber.normalMap = m.cedar.normalMap;
  dwellingTimber.normalScale.set(0.23, 0.23);
  for (const [position, angle, width, depth] of [
    [[-12.5, 0, -27.9], 0, 10.0, 8.3],
    [[1.0, 0, -29.0], 0, 11.5, 8.0],
    [[14.0, 0, -27.4], -0.08, 9.5, 9.1],
    [[-26.9, 0, -0.5], PI / 2, 12.0, 8.0],
    [[27.3, 0, -1.0], -PI / 2, 11.8, 7.6],
    [[-10.5, 0, 33.5], PI, 11.3, 8.0],
    [[12.3, 0, 33.0], PI, 10.3, 8.0],
  ]) {
    const house = sub(position, angle);
    box([width - 1.2, 0.42, depth - 0.72], [0, 0.19, 0], ivory, house, 0.008);
    box(
      [width - 1.4, 3.34, depth - 0.9],
      [0, 2.0, 0],
      dwellingPlaster,
      house,
      0.008,
    );
    for (const y of [0.48, 3.64])
      box(
        [width - 1.27, 0.13, depth - 0.8],
        [0, y, 0],
        dwellingTimber,
        house,
        0.004,
      );
    const count = Math.floor(width / 2.2),
      front = (depth - 0.9) / 2 + 0.03;
    for (let column = 0; column < count; column++) {
      const x = (column - (count - 1) / 2) * 2.0;
      box([1.28, 1.72, 0.09], [x, 2.0, front], dwellingTimber, house, 0.003);
      for (const sign of [-1, 1])
        box(
          [0.073, 1.92, 0.13],
          [x + sign * 0.7, 2.0, front + 0.04],
          oldRed,
          house,
          0.003,
        );
      for (let slat = 0; slat < 14; slat++)
        box(
          [1.18, 0.055, 0.055],
          [x, 1.26 + slat * 0.113, front + 0.066],
          lacquer,
          house,
          0.001,
        );
      box([1.53, 0.1, 0.22], [x, 1.07, front + 0.02], oldRed, house, 0.003);
    }
    const houseRoofHeight = curvedRoof(k, house, {
      width,
      length: depth + 0.75,
      ridge: 5.6,
      eave: 3.58,
      centerZ: 0,
      materials: roofMaterials,
      edgeMaterial: dwellingTimber,
      tileScale: 2.6,
    });
    for (const end of [-1, 1]) {
      const z = (end * (depth + 0.75)) / 2,
        gable = new THREE.Shape();
      gable.moveTo(-width / 2, 3.58);
      for (let i = 0; i <= 40; i++) {
        const x = -width / 2 + (width * i) / 40;
        gable.lineTo(x, houseRoofHeight(x, z) - 0.14);
      }
      gable.lineTo(width / 2, 3.58);
      gable.closePath();
      shapeMesh(k, gable, dwellingTimber, [0, 0, z - 0.025], 0.05, house);
    }
  }
  for (const [x, z, height, radius] of [
    [-20.5, -23.5, 10.1, 4.3],
    [-5.5, -24.7, 9.2, 4.1],
    [8.0, -25.2, 10.7, 4.5],
    [23.0, -22, 11.2, 4.5],
    [-23, 12.2, 9.1, 4.3],
    [23.7, 12.0, 9.3, 4.4],
    [-18.2, 25.7, 10.2, 4.9],
    [18.9, 26.0, 9.8, 4.6],
    [-2.9, 36.7, 10.9, 4.7],
    [4.5, 37.1, 11.8, 4.9],
  ])
    k.tree([x, 0, z], { height, radius, kind: "broadleaf" });
  const garden = gardenAccents(k);
  k.cylinder(1.52, 0.08, [-11.1, 0.035, 10.5], m.bark, k.group, 1.52, 48);
  k.ring(1.56, 0.045, [-11.1, 0.065, 10.5], ivory);
  garden.frangipani([-11.1, 0.075, 10.5]);
  for (const x of [-8.2, 8.3]) {
    box([1.65, 0.15, 0.57], [x, 0.56, 10.1], ivory, k.group, 0.015);
    for (const dx of [-0.57, 0.57])
      box([0.2, 0.48, 0.42], [x + dx, 0.25, 10.1], plaster, k.group, 0.008);
  }
  temple.updateMatrix();
  const templePoint = (position) =>
    new THREE.Vector3(...position).applyMatrix4(temple.matrix).toArray();
  return k.finish(
    definition,
    {
      arrival: outdoorView(
        "Temple court and gardener's bench",
        [12.6, 1.65, 12.6],
        [2.2, 3.45, -3.4],
        65,
      ),
      roof: outdoorView(
        "Low sweeping tiled eaves",
        [10.5, 1.66, -1.0],
        [3.0, 4.2, -6.0],
        65,
      ),
      portico: outdoorView(
        "Gilded timber portico",
        [4.0, 1.65, 7.3],
        templePoint([0, 3.8, 4.4]),
        63,
      ),
      pavilion: outdoorView(
        "Gardener's notebook and water jar",
        [10.7, 1.56, 12.8],
        [8.15, 1.0, 9.65],
        56,
      ),
    },
    [
      templePoint([5.4, 2.8, 2.0]),
      templePoint([2.73, 3.0, 5.12]),
      [-7, 0.1, 4.0],
      templePoint([3.36, 2.1, -5.3]),
    ],
    { exposure: 0.85 },
  );
}
