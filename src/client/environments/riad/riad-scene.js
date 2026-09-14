import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createRiadMaterials } from "../shared/materials.js";
import { createRiadDetailMaterials } from "./riad-detail-materials.js";
import { addRiadCraft } from "./riad-craft.js";
import { addRiadAtmosphere } from "./riad-atmosphere.js";
import { createRecordedSoundscape } from "../shared/recorded-soundscape.js";
import { getSoundscapeProfile } from "../shared/soundscape-profiles.js";
import { buildRiadRooms } from "./riad-rooms.js";

export const RIAD_VIEWS = {
  courtyard: {
    label: "Courtyard",
    position: [2.35, 1.65, 3.55],
    target: [-0.6, 1.65, -2.05],
    fov: 57,
  },
  fountain: {
    label: "At the fountain",
    position: [1.6, 1.38, 2.55],
    target: [-0.3, 0.8, -0.8],
    fov: 60,
  },
  tea: {
    label: "Tea alcove",
    position: [-0.65, 1.32, 1.5],
    target: [-3.5, 0.96, -0.6],
    fov: 59,
  },
  cedar: {
    label: "Cedar & carving",
    position: [0.95, 1.68, -0.6],
    target: [0, 2.45, -4.3],
    fov: 62,
  },
  doorway: {
    label: "Through the doorway",
    position: [0, 1.62, -3.4],
    target: [0, 1.43, -8.2],
    fov: 59,
  },
  upstairs: {
    label: "Upstairs",
    position: [3.25, 6.48, -3.2],
    target: [3.1, 6.0, -7.0],
    fov: 58,
  },
};

// The riad is constructed in metres. Architecture, furniture and small objects
// share a material library; repeated static parts are batched after construction.
export function buildRiadEnvironment(definition, renderer) {
  const m = createRiadMaterials(renderer);
  const detail = createRiadDetailMaterials(renderer, m);
  let cushionIndex = 0;
  const group = new THREE.Group();
  group.name = "Marrakech riad — full scale";
  const animations = [
    (_, time) => {
      m.water.userData.time.value = time;
    },
  ];
  let seed = 901;
  const rand = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const range = (a, b) => a + (b - a) * rand();
  const geometries = new Set();
  const dynamic = new Set();
  function object(
    geo,
    mat,
    xyz = [0, 0, 0],
    rotation = [0, 0, 0],
    parent = group,
  ) {
    geometries.add(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...xyz);
    mesh.rotation.set(...rotation);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function box(
    size,
    xyz,
    mat,
    bevel = 0.012,
    parent = group,
    rotation = [0, 0, 0],
  ) {
    return object(
      bevel
        ? new RoundedBoxGeometry(
            ...size,
            1,
            Math.min(bevel, Math.min(...size) * 0.24),
          )
        : new THREE.BoxGeometry(...size),
      mat,
      xyz,
      rotation,
      parent,
    );
  }
  function lathe(points, mat, xyz, parent = group, segments = 48) {
    return object(
      new THREE.LatheGeometry(
        points.map((p) => new THREE.Vector2(...p)),
        segments,
      ),
      mat,
      xyz,
      [0, 0, 0],
      parent,
    );
  }
  function rod(a, b, radius, mat, parent = group, r2 = radius) {
    const from = new THREE.Vector3(...a),
      to = new THREE.Vector3(...b),
      d = to.clone().sub(from);
    const mesh = object(
      new THREE.CylinderGeometry(r2, radius, d.length(), 8),
      mat,
      from.add(to).multiplyScalar(0.5).toArray(),
      [0, 0, 0],
      parent,
    );
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      d.normalize(),
    );
    return mesh;
  }
  function curve(points, radius, mat, parent = group, closed = false) {
    return object(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(
          points.map((p) => new THREE.Vector3(...p)),
          closed,
        ),
        Math.min(180, Math.max(12, points.length)),
        radius,
        5,
        closed,
      ),
      mat,
      [0, 0, 0],
      [0, 0, 0],
      parent,
    );
  }
  function torus(
    radius,
    tube,
    xyz,
    mat,
    rotation = [Math.PI / 2, 0, 0],
    parent = group,
  ) {
    return object(
      new THREE.TorusGeometry(radius, tube, 8, 64),
      mat,
      xyz,
      rotation,
      parent,
    );
  }
  function sphere(radius, xyz, mat, parent = group, scale = [1, 1, 1]) {
    const o = object(
      new THREE.SphereGeometry(radius, 16, 12),
      mat,
      xyz,
      [0, 0, 0],
      parent,
    );
    o.scale.set(...scale);
    return o;
  }
  function subgroup(xyz = [0, 0, 0], rotation = 0, parent = group) {
    const g = new THREE.Group();
    g.position.set(...xyz);
    g.rotation.y = rotation;
    parent.add(g);
    return g;
  }

  // Real tiled paving, extending under the perimeter galleries.
  box([10.8, 0.18, 11.2], [0, -0.1, 0], m.floor, 0.01);
  box([11.1, 0.3, 11.5], [0, -0.31, 0], m.grout, 0);
  // Fine seams and individually set, slightly irregular border tiles.
  function mosaicStrip(
    width,
    height,
    xyz,
    rotation = [0, 0, 0],
    parent = group,
    cell = 0.12,
    forceStars = false,
  ) {
    const g = subgroup(xyz, 0, parent);
    g.rotation.set(...rotation);
    const stars = forceStars || (height > 0.5 && width > 2);
    box([width, height, 0.012], [0, 0, 0], stars ? m.tiles[1] : m.grout, 0, g);
    let starGeo;
    if (stars) {
      const shape = new THREE.Shape();
      for (let k = 0; k < 16; k++) {
        const a = (k * Math.PI) / 8,
          r = cell * (k % 2 ? 0.355 : 0.48);
        if (k === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      shape.closePath();
      starGeo = new THREE.ShapeGeometry(shape);
    }
    for (
      let x = -width / 2 + cell / 2;
      x <= width / 2 - cell / 2 + 0.001;
      x += cell
    )
      for (
        let y = -height / 2 + cell / 2;
        y <= height / 2 - cell / 2 + 0.001;
        y += cell
      ) {
        const row = Math.round((y + height / 2) / cell),
          col = Math.round((x + width / 2) / cell);
        const tileIndex = (row + col) % 2 ? 1 : 0;
        const mat = detail.tileVariants[tileIndex][Math.floor(rand() * 6)];
        if (stars)
          object(
            starGeo,
            detail.tileVariants[0][Math.floor(rand() * 6)],
            [x, y, 0.008],
            [0, 0, Math.PI / 8],
            g,
          );
        else
          box(
            [cell * 0.97, cell * 0.97, 0.004],
            [x, y, 0.008 + rand() * 0.0005],
            mat,
            0.0007,
            g,
          );
      }
    return g;
  }
  for (const x of [-4.2, 4.2])
    mosaicStrip(0.26, 10.7, [x, 0.018, 0], [-Math.PI / 2, 0, 0]);
  for (const z of [-3.4, 4.8])
    mosaicStrip(8.3, 0.25, [0, 0.018, z], [-Math.PI / 2, 0, 0]);
  // Perimeter tiles stop at the new doorways in buildRiadRooms.
  for (const x of [-5.04, 5.04])
    mosaicStrip(
      10.7,
      0.74,
      [x, 0.43, 0],
      [0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0],
    );

  function column(x, z, parent) {
    const profile = [
      [0.25, 0],
      [0.25, 0.1],
      [0.21, 0.13],
      [0.21, 0.22],
      [0.18, 0.25],
      [0.15, 0.3],
      [0.139, 0.42],
      [0.13, 1.8],
      [0.14, 2.02],
      [0.18, 2.07],
      [0.19, 2.12],
      [0.17, 2.18],
      [0.22, 2.22],
      [0.23, 2.29],
    ];
    lathe(profile, m.marble, [x, 0.05, z], parent);
    box([0.49, 0.16, 0.49], [x, 2.42, z], m.carved, 0.015, parent);
    for (let i = 0; i < 4; i++)
      box(
        [0.49 + 0.025 * i, 0.045, 0.49 + 0.025 * i],
        [x, 2.52 + 0.045 * i, z],
        m.plaster,
        0.005,
        parent,
      );
  }
  function arch(center, parent) {
    const width = 2.94,
      radius = 1.24,
      spring = 2.65,
      rise = 1.33,
      top = 4.58;
    const g = subgroup([center, 0, 0], 0, parent);
    const points = [];
    for (let i = 0; i <= 240; i++) {
      const t = (i / 240) * Math.PI;
      const scallop = 0.035 * Math.sin((i / 240) * Math.PI * 24) ** 2;
      points.push([
        Math.cos(t) * (radius - scallop),
        spring + Math.sin(t) * (rise - scallop),
      ]);
    }
    const shape = new THREE.Shape();
    shape.moveTo(width / 2, spring);
    shape.lineTo(...points[0]);
    points.forEach((p) => shape.lineTo(...p));
    shape.lineTo(-width / 2, spring);
    shape.lineTo(-width / 2, top);
    shape.lineTo(width / 2, top);
    shape.closePath();
    object(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.29,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.009,
        bevelSegments: 2,
        steps: 1,
      }),
      m.carved,
      [0, 0, -0.16],
      [0, 0, 0],
      g,
    );
    curve(
      points.map(([x, y]) => [x, y, 0.17]),
      0.025,
      m.plaster,
      g,
    );
    curve(
      points.map(([x, y]) => [x * 1.07, spring + (y - spring) * 1.07, 0.185]),
      0.018,
      m.plaster,
      g,
    );
    // Raised plaster rosettes, not painted pictures of arches.
    for (const side of [-1, 1])
      for (let row = 0; row < 3; row++) {
        const cx = side * 1.12,
          cy = 3.62 + row * 0.28;
        torus(0.095, 0.012, [cx, cy, 0.17], m.plaster, [0, 0, 0], g);
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          const petal = sphere(
            0.032,
            [cx + Math.cos(a) * 0.06, cy + Math.sin(a) * 0.06, 0.175],
            m.plaster,
            g,
            [0.6, 1.2, 0.45],
          );
          petal.rotation.z = a - Math.PI / 2;
        }
      }
    for (const y of [4.36, 4.44, 4.53])
      box([width, 0.032, 0.05], [0, y, 0.18], m.plaster, 0.005, g);
  }
  function arcade(position, rotation, count = 3) {
    const g = subgroup(position, rotation);
    for (let i = 0; i <= count; i++) column((i - count / 2) * 2.94, 0, g);
    for (let i = 0; i < count; i++) arch((i - (count - 1) / 2) * 2.94, g);
    box([count * 2.94 + 0.45, 0.22, 1.25], [0, 4.7, -0.46], m.cedar, 0.02, g);
    for (let x = -count * 1.47; x < count * 1.47; x += 0.25)
      box([0.06, 0.16, 0.65], [x, 4.54, -0.24], m.cedar, 0.006, g);
    // Upper timber galleries create enclosure and meaningful overhead shadows.
    box([count * 2.94 + 0.4, 0.16, 0.16], [0, 5.73, 0.05], m.cedar, 0.01, g);
    box([count * 2.94 + 0.4, 0.18, 0.16], [0, 4.98, 0.05], m.cedar, 0.01, g);
    for (let x = -count * 1.47; x < count * 1.47; x += 0.14) {
      lathe(
        [
          [0.023, 0],
          [0.027, 0.05],
          [0.014, 0.15],
          [0.023, 0.32],
          [0.014, 0.5],
          [0.027, 0.61],
          [0.023, 0.67],
        ],
        m.cedar,
        [x, 5.05, 0.05],
        g,
        8,
      );
    }
    for (let x = -count * 1.47; x <= count * 1.47; x += 2.94) {
      box([0.16, 2.55, 0.16], [x, 6.04, 0], m.cedar, 0.008, g);
      box([0.34, 0.13, 0.32], [x, 7.21, 0], m.cedar, 0.008, g);
    }
    box([count * 2.94 + 0.5, 0.22, 1.55], [0, 7.32, -0.5], m.cedar, 0.01, g);
    return g;
  }
  arcade([0, 0, -3.65], 0);
  arcade([-4.42, 0, 0.76], Math.PI / 2);
  arcade([4.42, 0, 0.76], -Math.PI / 2);
  // Front gallery is behind the visitor, making all look directions architectural.
  arcade([0, 0, 5.17], Math.PI);
  box([10.7, 2.7, 0.25], [0, 5.95, 5.6], m.plaster);
  for (const z of [-4.35, 5.22]) box([10.4, 0.16, 0.9], [0, 7.4, z], m.plaster);
  for (const x of [-4.8, 4.8])
    box([1.05, 0.16, 10.6], [x, 7.4, 0.4], m.plaster);
  function lattice(width, height, xyz, parent = group) {
    const g = subgroup(xyz, 0, parent);
    box([width + 0.12, 0.1, 0.09], [0, height / 2, 0], m.cedar, 0.004, g);
    box([width + 0.12, 0.1, 0.09], [0, -height / 2, 0], m.cedar, 0.004, g);
    for (const sign of [-1, 1])
      box([0.1, height, 0.09], [(sign * width) / 2, 0, 0], m.cedar, 0.004, g);
    const cell = 0.18;
    for (let x = -width / 2 + cell / 2; x < width / 2; x += cell)
      for (let y = -height / 2 + cell / 2; y < height / 2; y += cell) {
        const r = cell * 0.47;
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4,
            b = ((k + 1) * Math.PI) / 4;
          rod(
            [x + Math.cos(a) * r, y + Math.sin(a) * r, 0.025],
            [x + Math.cos(b) * r, y + Math.sin(b) * r, 0.025],
            0.009,
            m.cedar,
            g,
          );
        }
      }
    return g;
  }
  // Hand-built cedar portal with lattice sidelights and partly open door leaves.
  for (const x of [-1.26, 1.26]) {
    box([0.2, 3.36, 0.3], [x, 1.68, -4.78], m.cedar);
    lattice(0.5, 2.28, [x - Math.sign(x) * 0.37, 1.68, -4.72]);
  }
  box([2.74, 0.18, 0.3], [0, 3.35, -4.78], m.cedar);
  lattice(2.64, 0.49, [0, 3.68, -4.77]);
  for (const side of [-1, 1]) {
    const door = subgroup([side * 0.67, 0, -4.92], side * 1.05);
    const cx = -side * 0.31;
    box([0.62, 2.83, 0.09], [cx, 1.42, 0], m.cedar, 0.008, door);
    for (const y of [0.54, 1.47, 2.37]) {
      box([0.46, 0.71, 0.035], [cx, y, 0.068], m.cedar, 0.006, door);
      for (const dy of [-0.36, 0.36])
        box([0.49, 0.03, 0.045], [cx, y + dy, 0.08], m.brass, 0.002, door);
    }
    torus(
      0.056,
      0.008,
      [cx - side * 0.14, 1.36, 0.1],
      m.bronze,
      [0, 0, 0],
      door,
    );
  }
  // Octagonal zellige fountain. Rim and basin are separate, genuinely hollow.
  const fountain = subgroup([0, 0, -0.35]);
  fountain.name = "Courtyard fountain";
  const outer = 1.37,
    inner = 1.15,
    sides = 8,
    rimY = 0.28;
  object(
    new THREE.CylinderGeometry(1.49, 1.51, 0.05, 8),
    m.grout,
    [0, 0.02, 0],
    [0, Math.PI / 8, 0],
    fountain,
  );
  for (let i = 0; i < sides; i++) {
    const angle = (i * Math.PI) / 4;
    const seg = subgroup([0, 0, 0], angle, fountain);
    const length = 2 * outer * Math.tan(Math.PI / 8);
    box([length, 0.25, 0.22], [0, 0.155, outer - 0.09], m.tiles[0], 0.008, seg);
    mosaicStrip(
      length - 0.02,
      0.18,
      [0, 0.16, outer + 0.026],
      [0, 0, 0],
      seg,
      0.065,
    );
    box(
      [length + 0.028, 0.065, 0.25],
      [0, rimY, outer - 0.09],
      m.marble,
      0.012,
      seg,
    );
    mosaicStrip(
      length - 0.025,
      0.17,
      [0, rimY + 0.035, outer - 0.09],
      [-Math.PI / 2, 0, 0],
      seg,
      0.06,
    );
  }
  object(
    new THREE.CylinderGeometry(inner, inner, 0.035, 8),
    m.tiles[0],
    [0, 0.07, 0],
    [0, Math.PI / 8, 0],
    fountain,
  );
  // Geometric apron around the water catches the grazing daylight.
  for (let i = 0; i < 8; i++)
    for (let k = 0; k < 14; k++) {
      const a = (i * Math.PI) / 4 + ((k / 14 - 0.5) * Math.PI) / 4;
      const r = 1.47;
      box(
        [0.064, 0.015, 0.075],
        [Math.sin(a) * r, 0.056, Math.cos(a) * r],
        m.tiles[k % 2 ? 1 : 0],
        0.002,
        fountain,
        [0, a, 0],
      );
    }
  lathe(
    [
      [0.27, 0],
      [0.3, 0.05],
      [0.27, 0.1],
      [0.19, 0.18],
      [0.17, 0.41],
      [0.26, 0.45],
    ],
    m.marble,
    [0, 0.085, 0],
    fountain,
  );
  const bowlGeo = new THREE.LatheGeometry(
    [
      [0.2, 0.43],
      [0.35, 0.45],
      [0.53, 0.5],
      [0.64, 0.59],
      [0.67, 0.7],
      [0.65, 0.76],
      [0.6, 0.77],
      [0.58, 0.7],
      [0.52, 0.62],
      [0.38, 0.56],
      [0.12, 0.54],
    ].map((p) => new THREE.Vector2(...p)),
    96,
  );
  // Subtle fluting is real geometry, including the silhouette.
  const bp = bowlGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i),
      z = bp.getZ(i),
      y = bp.getY(i),
      a = Math.atan2(x, z);
    const f =
      1 + 0.025 * Math.cos(a * 20) * THREE.MathUtils.smoothstep(y, 0.48, 0.7);
    bp.setXYZ(i, x * f, y, z * f);
  }
  bowlGeo.computeVertexNormals();
  object(bowlGeo, m.marble, [0, 0.085, 0], [0, 0, 0], fountain);
  function water(radius, y, segments) {
    const geo = new THREE.CircleGeometry(radius, segments, 0, Math.PI * 2);
    geo.rotateX(-Math.PI / 2);
    const surface = object(geo, m.water, [0, y, 0], [0, 0, 0], fountain);
    surface.castShadow = false;
    dynamic.add(surface);
    const base = geo.attributes.position.array.slice();
    animations.push((_, time) => {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3],
          z = base[i * 3 + 2];
        p.setY(
          i,
          Math.sin(Math.hypot(x, z) * 24 - time * 3.4) * 0.0035 +
            Math.sin(x * 17 + z * 12 + time * 2) * 0.002,
        );
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
    });
    return surface;
  }
  const lowerWater = water(1.2, 0.15, 8);
  lowerWater.material = m.water.clone();
  lowerWater.material.opacity = 0.4;
  lowerWater.material.color.set(0x40664f);
  lowerWater.material.metalness = 0.05;
  water(0.585, 0.785, 96);
  const jet = curve(
    [
      [0, 0.78, 0],
      [0.016, 0.99, 0.006],
      [0, 1.12, 0.01],
      [-0.025, 1.06, 0.01],
      [-0.055, 0.83, 0.02],
    ],
    0.012,
    m.water,
    fountain,
  );
  jet.castShadow = false;
  for (let i = 0; i < 24; i++) {
    const drop = sphere(range(0.006, 0.012), [0, 1, 0], m.water, fountain);
    dynamic.add(drop);
    drop.castShadow = false;
    const phase = rand(),
      a = rand() * Math.PI * 2;
    animations.push((_, t) => {
      const f = (t * 0.64 + phase) % 1;
      drop.position.set(
        Math.cos(a) * f * 0.11,
        0.81 + Math.sin(f * Math.PI) * 0.28,
        Math.sin(a) * f * 0.11,
      );
    });
  }

  function pot(xyz, radius = 0.48, height = 0.72, parent = group) {
    const g = subgroup(xyz, 0, parent);
    lathe(
      [
        [radius * 0.56, 0],
        [radius * 0.6, 0.055],
        [radius * 0.86, height * 0.21],
        [radius, height * 0.6],
        [radius * 0.91, height * 0.9],
        [radius * 0.98, height * 0.93],
        [radius * 0.98, height],
        [radius * 0.84, height],
        [radius * 0.82, height * 0.91],
        [radius * 0.84, height * 0.8],
      ],
      m.pot,
      [0, 0, 0],
      g,
    );
    object(
      new THREE.CylinderGeometry(radius * 0.82, radius * 0.82, 0.015, 32),
      m.soil,
      [0, height * 0.84, 0],
      [0, 0, 0],
      g,
    );
    torus(
      radius * 0.95,
      0.025,
      [0, height * 0.96, 0],
      m.pot,
      [Math.PI / 2, 0, 0],
      g,
    );
    return g;
  }
  function citrus(xyz, scale = 1) {
    const tree = subgroup(xyz);
    tree.scale.setScalar(scale);
    pot([0, 0, 0], 0.46, 0.69, tree);
    const branchTips = [];
    const trunk = [
      [0, 0.55, 0],
      [0.05, 1, 0],
      [-0.04, 1.37, 0.04],
      [0.01, 1.74, 0.06],
    ];
    for (let i = 0; i < 3; i++)
      rod(
        trunk[i],
        trunk[i + 1],
        0.05 - i * 0.01,
        m.bark,
        tree,
        0.044 - i * 0.012,
      );
    for (let i = 0; i < 15; i++) {
      const a = i * 2.399,
        r = range(0.32, 0.7),
        y = range(1.65, 2.58);
      const tip = [Math.cos(a) * r, y, Math.sin(a) * r];
      curve(
        [
          [0, 1.19 + rand() * 0.46, 0],
          [tip[0] * 0.5, y - 0.19, tip[2] * 0.4],
          tip,
        ],
        0.012 + rand() * 0.009,
        m.bark,
        tree,
      );
      branchTips.push(tip);
    }
    const geo = new THREE.PlaneGeometry(0.09, 0.19, 2, 4);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setZ(i, 0.025 * Math.sin((p.getY(i) / 0.19 + 0.5) * Math.PI));
    geo.computeVertexNormals();
    geometries.add(geo);
    const leaves = new THREE.InstancedMesh(geo, m.leaf, 1650);
    leaves.castShadow = leaves.receiveShadow = true;
    tree.add(leaves);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 1650; i++) {
      const tip = branchTips[i % branchTips.length],
        r = Math.cbrt(rand()) * 0.38,
        a = rand() * Math.PI * 2,
        v = range(-1, 1);
      dummy.position.set(
        tip[0] + Math.cos(a) * r * Math.sqrt(1 - v * v),
        tip[1] + v * r * 0.72,
        tip[2] + Math.sin(a) * r * Math.sqrt(1 - v * v),
      );
      dummy.rotation.set(
        range(-1.1, 1.1),
        range(0, Math.PI * 2),
        range(-Math.PI, Math.PI),
      );
      dummy.scale.setScalar(range(0.65, 1.2));
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
      leaves.setColorAt(
        i,
        new THREE.Color().setHSL(
          0.23 + rand() * 0.045,
          0.2 + rand() * 0.18,
          0.46 + rand() * 0.18,
        ),
      );
    }
    leaves.instanceMatrix.needsUpdate = true;
    const orangeMat = new THREE.MeshStandardMaterial({
      color: 0xc48124,
      roughness: 0.64,
    });
    for (let i = 0; i < 19; i++) {
      const t = branchTips[i % branchTips.length];
      sphere(
        range(0.055, 0.077),
        [t[0] + range(-0.22, 0.22), t[1] - 0.11, t[2] + range(-0.19, 0.19)],
        orangeMat,
        tree,
        [1, 0.95, 1],
      );
    }
    return tree;
  }
  citrus([-3.17, 0, -2.59], 1.12);
  citrus([3.23, 0, -2.8], 1.06);
  citrus([4.74, 0, 2.65], 0.74);
  // Smaller aromatic plants have individual arcing leaves.
  const herb = pot([-3.93, 0, -2.24], 0.3, 0.42);
  for (let i = 0; i < 48; i++) {
    const a = rand() * Math.PI * 2,
      r = rand() * 0.24;
    const leaf = object(
      new THREE.PlaneGeometry(0.11, 0.33, 1, 3),
      m.leaf,
      [Math.cos(a) * r, 0.56 + rand() * 0.16, Math.sin(a) * r],
      [range(-1, 1), a, range(-1, 1)],
      herb,
    );
    leaf.castShadow = false;
  }

  function cushion(size, xyz, rotation = [0, 0, 0], parent = group) {
    const geo = new THREE.SphereGeometry(1, 32, 20),
      p = geo.attributes.position;
    // A soft superellipsoid with a pinched sewn edge, rather than rounded boxes.
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      const power = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.43);
      const wrinkle = 1 + 0.018 * Math.sin(x * 29 + y * 11) * Math.cos(z * 24);
      p.setXYZ(
        i,
        (power(x) * size[0]) / 2,
        ((power(y) * size[1]) / 2) * wrinkle,
        (power(z) * size[2]) / 2,
      );
    }
    geo.computeVertexNormals();
    return object(
      geo,
      detail.cushions[cushionIndex++ % detail.cushions.length],
      xyz,
      rotation,
      parent,
    );
  }
  const salon = subgroup([-4.64, 0, 0.4], Math.PI / 2);
  salon.name = "Tea alcove";
  box([3.55, 0.38, 0.87], [0, 0.21, 0], m.plaster, 0.015, salon);
  mosaicStrip(3.5, 0.3, [0, 0.21, 0.447], [0, 0, 0], salon, 0.09);
  cushion([3.42, 0.23, 0.85], [0, 0.49, 0], [0, 0, 0], salon);
  for (let i = 0; i < 5; i++)
    cushion(
      [0.69, 0.64, 0.23],
      [
        -1.38 + i * 0.69 + (i === 3 ? 0.06 : 0),
        i === 3 ? 0.83 : 0.9,
        -0.22 + (i === 3 ? 0.06 : 0),
      ],
      [i === 3 ? 0.3 : 0.13, i === 3 ? 0.16 : 0, range(-0.08, 0.08)],
      salon,
    );
  for (const x of [-1.62, 1.62])
    cushion([0.21, 0.29, 0.76], [x, 0.7, 0.05], [0, 0, 0], salon);
  // Rug, hem and fringe; gently undulates over the floor.
  const rugGeo = new THREE.PlaneGeometry(1.65, 2.5, 32, 48);
  const rp = rugGeo.attributes.position;
  for (let i = 0; i < rp.count; i++)
    rp.setZ(i, Math.sin(rp.getX(i) * 12 + rp.getY(i) * 3) * 0.005);
  rugGeo.computeVertexNormals();
  object(rugGeo, detail.rug, [-2.97, 0.029, 0.57], [-Math.PI / 2, 0, 0.05]);
  for (const z of [-0.68, 1.82])
    for (let x = -3.74; x < -2.18; x += 0.034)
      rod(
        [x, 0.025, z],
        [x + range(-0.01, 0.01), 0.023, z + (z < 0 ? -0.095 : 0.095)],
        0.003,
        m.cream,
      );
  const tea = subgroup([-3.05, 0, 0.13]);
  tea.name = "Brass tea service";
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    lathe(
      [
        [0.03, 0],
        [0.043, 0.05],
        [0.025, 0.1],
        [0.04, 0.2],
        [0.027, 0.27],
        [0.045, 0.36],
      ],
      m.cedar,
      [Math.cos(a) * 0.34, 0.02, Math.sin(a) * 0.34],
      tea,
      16,
    );
  }
  object(
    new THREE.CylinderGeometry(0.55, 0.56, 0.045, 64),
    m.cedar,
    [0, 0.39, 0],
    [0, 0, 0],
    tea,
  );
  object(
    new THREE.CylinderGeometry(0.53, 0.51, 0.015, 64),
    m.brass,
    [0, 0.422, 0],
    [0, 0, 0],
    tea,
  );
  for (const r of [0.5, 0.46, 0.42])
    torus(r, 0.006, [0, 0.436, 0], m.brass, [Math.PI / 2, 0, 0], tea);
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2;
    box(
      [0.006, 0.003, 0.03],
      [Math.sin(a) * 0.475, 0.439, Math.cos(a) * 0.475],
      m.bronze,
      0.001,
      tea,
      [0, a, 0],
    );
  }
  // Tea pot, swept spout and handle, lid, feet, and separate transparent glasses.
  const teapot = subgroup([-0.11, 0.44, -0.03], -0.5, tea);
  lathe(
    [
      [0.065, 0],
      [0.1, 0.025],
      [0.135, 0.09],
      [0.125, 0.17],
      [0.075, 0.22],
      [0.071, 0.24],
    ],
    m.brass,
    [0, 0, 0],
    teapot,
  );
  lathe(
    [
      [0.086, 0.24],
      [0.082, 0.255],
      [0.034, 0.285],
      [0.016, 0.294],
    ],
    m.brass,
    [0, 0, 0],
    teapot,
  );
  sphere(0.021, [0, 0.309, 0], m.brass, teapot);
  curve(
    [
      [0.105, 0.07, 0],
      [0.185, 0.09, 0],
      [0.19, 0.21, 0],
      [0.255, 0.27, 0],
    ],
    0.021,
    m.brass,
    teapot,
  );
  curve(
    [
      [-0.09, 0.19, 0],
      [-0.2, 0.23, 0],
      [-0.23, 0.1, 0],
      [-0.12, 0.045, 0],
    ],
    0.014,
    m.brass,
    teapot,
  );
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const glass = subgroup(
      [Math.cos(a) * 0.3, 0.444, Math.sin(a) * 0.3],
      0,
      tea,
    );
    lathe(
      [
        [0.034, 0],
        [0.037, 0.01],
        [0.04, 0.105],
        [0.043, 0.112],
        [0.039, 0.112],
        [0.035, 0.017],
        [0.03, 0.01],
      ],
      m.glass,
      [0, 0, 0],
      glass,
      32,
    );
    const fill = i === 1 ? 0.014 : 0.024 + rand() * 0.035;
    object(
      new THREE.CylinderGeometry(0.035, 0.032, fill, 24),
      detail.tea,
      [0, 0.012 + fill / 2, 0],
      [0, 0, 0],
      glass,
    );
    if (i < 3)
      for (let k = 0; k < 3; k++)
        object(
          new THREE.PlaneGeometry(0.014, 0.034, 1, 2),
          m.leaf,
          [range(-0.015, 0.015), 0.098 + rand() * 0.016, range(-0.015, 0.015)],
          [-0.6, k * 2, 0.4],
          glass,
        );
    for (const y of [0.024, 0.079, 0.102])
      torus(0.039, 0.002, [0, y, 0], m.brass, [Math.PI / 2, 0, 0], glass);
  }
  teapot.traverse((o) => {
    if (o.isMesh) o.material = detail.silver;
  });
  for (const y of [0.04, 0.17, 0.22])
    torus(
      y === 0.22 ? 0.074 : 0.119,
      0.002,
      [0, y, 0],
      m.bronze,
      [Math.PI / 2, 0, 0],
      teapot,
    );
  for (let i = 0; i < 20; i++) {
    const a = (i * Math.PI) / 10;
    curve(
      [
        [Math.cos(a) * 0.13, 0.09, Math.sin(a) * 0.13],
        [Math.cos(a + 0.05) * 0.13, 0.14, Math.sin(a + 0.05) * 0.13],
        [Math.cos(a) * 0.12, 0.17, Math.sin(a) * 0.12],
      ],
      0.0018,
      m.bronze,
      teapot,
    );
  }
  pot([2.45, 0, -4.32], 0.29, 0.66);
  pot([2.83, 0, -4.44], 0.19, 0.4);

  function lantern(xyz, scale = 1) {
    const g = subgroup(xyz);
    g.scale.setScalar(scale);
    lathe(
      [
        [0.1, 0],
        [0.18, 0.06],
        [0.14, 0.1],
        [0.13, 0.42],
        [0.19, 0.48],
        [0.1, 0.55],
        [0.02, 0.67],
      ],
      m.bronze,
      [0, 0, 0],
      g,
      8,
    );
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xe1b867,
      emissive: 0xffb94c,
      emissiveIntensity: 0.45,
      roughness: 0.45,
    });
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      box(
        [0.092, 0.29, 0.006],
        [Math.sin(a) * 0.133, 0.27, Math.cos(a) * 0.133],
        glowMat,
        0.002,
        g,
        [0, a, 0],
      );
      for (let row = 0; row < 5; row++)
        torus(
          0.017,
          0.005,
          [Math.sin(a) * 0.14, 0.14 + row * 0.064, Math.cos(a) * 0.14],
          m.bronze,
          [0, a, 0],
          g,
        );
    }
    torus(0.045, 0.008, [0, 0.72, 0], m.bronze, [0, 0, 0], g);
    return g;
  }
  for (const x of [-2.94, 0, 2.94]) {
    lantern([x, 3.15, -4.18], 0.84);
    rod([x, 3.77, -4.18], [x, 4.5, -4.18], 0.008, m.bronze);
    const light = new THREE.PointLight(0xffc787, 2.8, 3.2, 2);
    light.position.set(x, 3.38, -4.1);
    group.add(light);
  }
  lantern([-4.05, 0.04, 1.8], 0.85);
  lantern([2.65, 0.03, -3.72], 0.7);
  const rooms = buildRiadRooms({
    group,
    m,
    detail,
    box,
    object,
    subgroup,
    lathe,
    rod,
    torus,
    cushion,
    lantern,
    mosaicStrip,
  });
  addRiadCraft({
    m,
    detail,
    group,
    box,
    object,
    lathe,
    rod,
    curve,
    torus,
    sphere,
    subgroup,
    rand,
    range,
    pot,
  });
  const atmosphere = addRiadAtmosphere({
    group,
    m,
    detail,
    animations,
    dynamic,
    geometries,
    object,
    subgroup,
    rod,
    torus,
    rand,
    range,
  });
  const soundscape = createRecordedSoundscape(getSoundscapeProfile("riad"));
  // Slanting warm sun and cool sky separate the courtyard from shaded galleries.
  const sun = new THREE.DirectionalLight(0xffd29c, 5.2);
  sun.position.set(-3, 13, 8);
  sun.target.position.set(0, 0, -2);
  group.add(sun, sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 42;
  sun.shadow.normalBias = 0.012;
  sun.shadow.bias = -0.00012;
  sun.shadow.radius = 3;
  group.add(new THREE.HemisphereLight(0xabc9ed, 0x806344, 0.55));
  const bounce = new THREE.PointLight(0xffcd94, 5, 14, 2);
  bounce.position.set(0, 2, 2);
  group.add(bounce);

  const anchors = {
    fountain: [0, 0.87, -0.35],
    zellige: [0.93, 0.3, 0.57],
    "tea-tray": [-3.05, 0.7, 0.13],
    "cedar-screen": [0.94, 2, -4.67],
    citrus: [-3.17, 2, -2.59],
  };
  const hotspots = definition.details.map((detail) => {
    const p = anchors[detail.id] ?? detail.point;
    detail.point = [...p];
    const o = new THREE.Object3D();
    o.position.set(...p);
    group.add(o);
    return o;
  });
  const focus = {
    group: new THREE.Group(),
    ring: new THREE.Object3D(),
    orb: new THREE.Object3D(),
  };
  focus.group.visible = false;
  // Merge static geometry by material to keep the richly detailed room interactive.
  group.updateMatrixWorld(true);
  const batches = new Map();
  const remove = [];
  group.traverse((o) => {
    if (
      !o.isMesh ||
      o.isInstancedMesh ||
      dynamic.has(o) ||
      o.material.transparent
    )
      return;
    const key = `${o.material.uuid}/${o.castShadow}/${o.receiveShadow}/${Boolean(o.geometry.index)}`;
    if (!batches.has(key))
      batches.set(key, {
        material: o.material,
        cast: o.castShadow,
        receive: o.receiveShadow,
        geometries: [],
      });
    const geo = o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    geo.deleteAttribute("uv1");
    batches.get(key).geometries.push(geo);
    remove.push(o);
  });
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.geometries, false);
    batch.geometries.forEach((g) => g.dispose());
    if (!geometry)
      throw new Error("Riad geometry batch could not be assembled.");
    geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, batch.material);
    mesh.castShadow = batch.cast;
    mesh.receiveShadow = batch.receive;
    group.add(mesh);
  }
  remove.forEach((o) => o.removeFromParent());
  let reflectionTarget = null;
  const reflectiveMaterials = [
    m.water,
    m.brass,
    m.bronze,
    m.glass,
    detail.silver,
    detail.tea,
  ];
  function captureReflections(scene) {
    reflectionTarget = new THREE.WebGLCubeRenderTarget(256, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    const probe = new THREE.CubeCamera(0.06, 35, reflectionTarget);
    probe.position.set(0, 1.05, -0.35);
    const hidden = [];
    group.traverse((o) => {
      if (o.isMesh && o.material === m.water) {
        hidden.push(o);
        o.visible = false;
      }
    });
    atmosphere.mirror.visible = false;
    probe.update(renderer, scene);
    atmosphere.mirror.visible = true;
    sun.shadow.autoUpdate = false;
    sun.shadow.needsUpdate = true;
    hidden.forEach((o) => {
      o.visible = true;
    });
    reflectiveMaterials.forEach((mat) => {
      mat.envMap = reflectionTarget.texture;
      mat.envMapIntensity = mat === m.glass ? 0.26 : 0.8;
      mat.needsUpdate = true;
    });
  }
  return {
    group,
    animations,
    hotspots,
    focus,
    ready: m.ready,
    views: RIAD_VIEWS,
    captureReflections,
    soundscape,
    openings: rooms.openings,
    exposure: 0.88,
    aoScale: 0.75,
    environmentIntensity: 0.2,
    background: 0xb5ccdc,
    fog: { color: 0xd1b796, density: 0.009 },
    dispose() {
      soundscape.dispose();
      rooms.dispose();
      atmosphere.dispose();
      detail.dispose();
      reflectionTarget?.dispose();
      geometries.forEach((g) => g.dispose());
      const materials = new Set();
      group.traverse((o) => {
        if (o.isMesh) materials.add(o.material);
        if (o.isLight) o.dispose();
      });
      materials.forEach((mat) => mat.dispose());
      m.dispose();
    },
  };
}
