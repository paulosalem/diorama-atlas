import * as THREE from "three";
import { buildBicycle, buildWorkCar } from "./rural-vehicles.js";
import { alfamaGeranium } from "./alfama-life.js";
import { alfamaLocalPoint } from "./alfama-layout.js";

export const alfamaDailyPlacements = {
  car: { position: [11.85, -0.004, 5], angle: 0 },
  bicycles: [
    { position: [-0.75, 2.396, 0.2], angle: 0 },
    {
      position: alfamaLocalPoint([3.8, -0.004, 7.05], -0.28, [1.73, 0, 1.1]),
      angle: Math.PI / 2 - 0.28,
    },
  ],
  planters: [
    { position: [1.22, 2.396, -0.38], kind: "jar", plant: "flowers" },
    { position: [4.9, 2.396, -0.55], kind: "trough", plant: "herbs" },
    { position: [-2.84, 4.796, -4.5], kind: "bowl", plant: "succulent" },
    { position: [3.95, 4.796, -6.8], kind: "bucket", plant: "herbs" },
    { position: [-8.15, 4.796, -7.95], kind: "jar", plant: "flowers" },
    { position: [7.6, 2.396, -5.1], kind: "bucket", plant: "empty" },
    { position: [10.33, 2.396, -4.73], kind: "bowl", plant: "succulent" },
  ],
  trolley: { position: [6.55, 2.396, 1.62], angle: 0.08 },
};

export const alfamaPlanterProfiles = {
  jar: [
    [0, 0],
    [0.14, 0],
    [0.155, 0.03],
    [0.2, 0.1],
    [0.235, 0.27],
    [0.21, 0.41],
    [0.17, 0.47],
    [0.18, 0.49],
    [0.178, 0.52],
    [0.153, 0.52],
    [0.15, 0.47],
    [0.187, 0.4],
    [0.211, 0.27],
    [0.175, 0.1],
    [0.125, 0.035],
    [0, 0.035],
  ],
  bowl: [
    [0, 0],
    [0.12, 0],
    [0.125, 0.025],
    [0.195, 0.09],
    [0.235, 0.18],
    [0.24, 0.2],
    [0.219, 0.21],
    [0.21, 0.18],
    [0.173, 0.095],
    [0.105, 0.025],
    [0, 0.025],
  ],
  bucket: [
    [0, 0],
    [0.14, 0],
    [0.145, 0.016],
    [0.175, 0.3],
    [0.183, 0.315],
    [0.181, 0.327],
    [0.166, 0.327],
    [0.164, 0.3],
    [0.135, 0.019],
    [0, 0.019],
  ],
};

function rosette(k, m, parent, y) {
  for (let ring = 0; ring < 3; ring++)
    for (let i = 0; i < 9 - ring * 2; i++) {
      const length = 0.19 - ring * 0.045;
      const geometry = new THREE.SphereGeometry(1, 12, 12);
      const p = geometry.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const t = (p.getY(v) + 1) / 2;
        p.setXYZ(
          v,
          p.getX(v) * 0.033 * (1 - 0.5 * t),
          t * length,
          p.getZ(v) * 0.012 + Math.sin(t * Math.PI) * 0.025,
        );
      }
      geometry.computeVertexNormals();
      const leaf = k.sub([0, y, 0], i * 2.4 + ring * 0.65, parent);
      k.mesh(geometry, m.succulent, [0, 0, 0], [1.12 - ring * 0.3, 0, 0], leaf);
    }
}

function herbs(k, m, parent, y, width = 0.18) {
  const leaf = k.leafMaterial("broadleaf");
  for (let i = 0; i < 17; i++) {
    const a = i * 2.4;
    const start = [Math.cos(a) * width * 0.44, y, Math.sin(a) * 0.055];
    const end = [
      start[0] + Math.cos(a) * 0.045,
      y + 0.14 + (i % 5) * 0.03,
      start[2] + Math.sin(a) * 0.065,
    ];
    k.rod(start, end, 0.0025, m.stem, parent);
    for (let j = 1; j <= 4; j++) {
      const point = start.map(
        (value, axis) => value + ((end[axis] - value) * j) / 5,
      );
      for (const side of [-1, 1]) {
        const geometry = new THREE.PlaneGeometry(0.055, 0.075, 4, 6);
        geometry.translate(0, 0.0375, 0);
        const p = geometry.attributes.position;
        for (let v = 0; v < p.count; v++)
          p.setZ(v, Math.sin(p.getY(v) * 30) * 0.013);
        geometry.computeVertexNormals();
        k.mesh(geometry, leaf, point, [side * 0.85, a, side * 0.35], parent);
      }
    }
  }
}

export function alfamaPlanterGeometry(kind) {
  const profile = alfamaPlanterProfiles[kind];
  const points = [new THREE.Vector2(...profile[0])];
  for (let i = 1; i < profile.length; i++) {
    const from = new THREE.Vector2(...profile[i - 1]);
    const to = new THREE.Vector2(...profile[i]);
    const steps =
      kind === "bucket" ? 1 : Math.ceil(from.distanceTo(to) / 0.004);
    for (let j = 1; j <= steps; j++)
      points.push(from.clone().lerp(to, j / steps));
  }
  const geometry = new THREE.LatheGeometry(points, 64);
  const p = geometry.attributes.position;
  const colors = [];
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i),
      a = Math.atan2(p.getZ(i), p.getX(i));
    const radius = Math.hypot(p.getX(i), p.getZ(i));
    if (kind !== "bucket" && radius > 0.01 && y > 0.035) {
      const relief =
        0.0008 * Math.sin(y * 245) * Math.sin((Math.PI * y) / 0.52);
      p.setX(i, p.getX(i) * (1 + relief / radius));
      p.setZ(i, p.getZ(i) * (1 + relief / radius));
    }
    const tone = 0.94 + 0.04 * Math.sin(a * 2 + y * 18) * Math.cos(a - y * 7);
    colors.push(tone, tone, tone);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function planter(k, m, { position, kind, plant }) {
  const g = k.sub(position);
  g.name = `Alfama ${kind} planter`;
  let soilY, radius;
  if (kind === "trough") {
    k.box([0.75, 0.035, 0.32], [0, 0.0175, 0], m.clay, g, 0.008);
    for (const x of [-0.367, 0.367])
      k.box([0.025, 0.235, 0.32], [x, 0.1375, 0], m.clay, g, 0.008);
    for (const z of [-0.15, 0.15]) {
      k.box([0.75, 0.235, 0.025], [0, 0.1375, z], m.clay, g, 0.008);
      k.box([0.77, 0.025, 0.04], [0, 0.25, z], m.clay, g, 0.008);
    }
    k.box([0.71, 0.018, 0.27], [0, 0.19, 0], k.m.ground, g, 0);
    for (const x of [-0.22, 0, 0.22]) herbs(k, m, k.sub([x, 0, 0], 0, g), 0.2);
    return g;
  }
  const material =
    kind === "jar" ? m.glaze : kind === "bucket" ? m.zinc : m.clay;
  k.mesh(alfamaPlanterGeometry(kind), m.vessels[kind], [0, 0, 0], [0, 0, 0], g);
  if (kind === "jar") {
    for (const side of [-1, 1])
      k.tube(
        [
          [side * 0.18, 0.45, 0],
          [side * 0.265, 0.4, 0],
          [side * 0.25, 0.3, 0],
          [side * 0.23, 0.27, 0],
        ],
        0.018,
        material,
        g,
      );
    for (const y of [0.12, 0.14])
      k.ring(0.21 + (y - 0.12) * 0.2, 0.005, [0, y, 0], m.cream, g);
    soilY = 0.45;
    radius = 0.148;
  } else if (kind === "bucket") {
    for (const y of [0.035, 0.25, 0.285])
      k.ring(0.145 + y * 0.1, 0.004, [0, y, 0], material, g);
    for (const side of [-1, 1]) {
      k.box([0.014, 0.045, 0.035], [side * 0.175, 0.28, 0], material, g, 0.004);
      k.sphere(0.007, [side * 0.185, 0.28, 0], m.iron, g);
    }
    k.tube(
      [
        [-0.18, 0.28, 0],
        [-0.14, 0.43, 0.08],
        [0.14, 0.43, 0.08],
        [0.18, 0.28, 0],
      ],
      0.006,
      material,
      g,
    );
    k.rod([-0.055, 0.444, 0.09], [0.055, 0.444, 0.09], 0.013, m.wood, g);
    soilY = 0.265;
    radius = 0.158;
  } else {
    soilY = 0.155;
    radius = 0.194;
  }
  if (plant === "empty") return g;
  k.cylinder(radius, 0.018, [0, soilY - 0.009, 0], k.m.ground, g);
  if (plant === "flowers") {
    const flowers = k.sub([0, soilY - 0.29, 0], 0.4, g);
    alfamaGeranium(k, flowers);
  } else if (plant === "succulent") rosette(k, m, g, soilY);
  else herbs(k, m, g, soilY);
  return g;
}

function cycleDetails(k, m, g, shopping) {
  for (const z of [-0.63, 0.63]) {
    k.tube(
      Array.from({ length: 19 }, (_, i) => {
        const a = -0.12 + (i * (Math.PI + 0.24)) / 18;
        return [0, 0.34 + Math.sin(a) * 0.36, z + Math.cos(a) * 0.36];
      }),
      0.018,
      m.zinc,
      g,
    );
    k.box([0.01, 0.035, 0.075], [0.011, 0.48, z + 0.12], m.reflector, g, 0.006);
  }
  k.sphere(0.027, [-0.16, 1.095, -0.42], m.zinc, g, [1, 0.65, 1]);
  k.rod([-0.18, 1.055, -0.3], [-0.2, 1.04, -0.23], 0.005, m.iron, g);
  k.cylinder(0.036, 0.055, [0, 0.85, -0.5], m.zinc, g).rotation.x = Math.PI / 2;
  k.mesh(
    new THREE.CircleGeometry(0.03, 24),
    m.cream,
    [0, 0.85, -0.532],
    [0, Math.PI, 0],
    g,
  );
  if (!shopping) {
    k.tube(
      [
        [0.08, 0.5, 0.2],
        [0.14, 0.57, 0.27],
        [0.14, 0.56, 0.49],
        [0.08, 0.4, 0.55],
      ],
      0.009,
      m.iron,
      g,
    );
    return;
  }
  const basket = k.sub([0, 0.735, 0.64], 0, g);
  basket.name = "Open grocery basket on bicycle rack";
  k.box([0.29, 0.016, 0.36], [0, 0.008, 0], m.wood, basket, 0.005);
  for (let row = 0; row < 13; row++) {
    const y = 0.024 + row * 0.016;
    const x = 0.145 + y * 0.18,
      z = 0.18 + y * 0.15;
    k.tube(
      [
        [-x, y, -z],
        [x, y, -z],
        [x, y, z],
        [-x, y, z],
      ],
      0.005,
      m.wicker,
      basket,
      true,
    );
  }
  for (const side of [-1, 1])
    for (let i = 0; i < 7; i++) {
      const x = -0.13 + i * 0.043;
      k.rod(
        [x, 0.015, side * 0.18],
        [x * 1.25, 0.23, side * 0.215],
        0.004,
        m.wicker,
        basket,
      );
    }
  for (const [i, x, z] of [
    [0, -0.07, -0.08],
    [1, 0.07, 0.035],
    [2, -0.05, 0.1],
  ]) {
    k.sphere(
      0.048,
      [x, 0.056, z],
      i % 2 ? m.apple : m.ochre,
      basket,
      [1, 0.9, 0.95],
    );
    k.rod([x, 0.093, z], [x + 0.004, 0.11, z], 0.003, m.wood, basket);
  }
}

function shoppingTrolley(k, m, { position, angle }) {
  const g = k.sub(position, angle);
  g.name = "Cloth shopping trolley waiting beside the passage";
  for (const x of [-0.18, 0.18]) {
    k.mesh(
      new THREE.TorusGeometry(0.07, 0.022, 10, 28),
      m.iron,
      [x, 0.092, 0],
      [0, Math.PI / 2, 0],
      g,
    );
    k.rod([x, 0.092, 0], [x * 0.83, 0.92, -0.08], 0.011, m.zinc, g);
    k.rod([x * 0.83, 0.17, 0], [x * 0.83, 0.01, 0.19], 0.01, m.zinc, g);
  }
  k.rod([-0.18, 0.092, 0], [0.18, 0.092, 0], 0.014, m.zinc, g);
  k.rod([-0.15, 0.92, -0.08], [0.15, 0.92, -0.08], 0.023, m.iron, g);
  k.box([0.31, 0.025, 0.26], [0, 0.17, 0.1], m.zinc, g, 0.008);
  const bag = new THREE.SphereGeometry(1, 24, 20);
  const p = bag.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const width = 0.15 * (0.92 + 0.08 * Math.cos(y * 3));
    p.setXYZ(
      i,
      Math.sign(p.getX(i)) * Math.abs(p.getX(i)) ** 0.3 * width,
      0.45 + y * 0.265,
      0.1 +
        Math.sign(p.getZ(i)) * Math.abs(p.getZ(i)) ** 0.3 * 0.12 +
        0.007 * Math.sin(y * 21 + p.getX(i) * 5),
    );
  }
  bag.computeVertexNormals();
  k.mesh(bag, m.cloth, [0, 0, 0], [0, 0, 0], g);
  k.tube(
    [
      [-0.135, 0.665, 0.15],
      [0, 0.69, 0.225],
      [0.135, 0.665, 0.15],
    ],
    0.004,
    m.cream,
    g,
  );
  k.box([0.035, 0.065, 0.01], [0, 0.64, 0.224], m.iron, g, 0.005);
  return g;
}

export function buildAlfamaDailyLife(k, materials) {
  const m = {
    ...materials,
    glaze: k.material(0x688d85, 0.28),
    clay: k.ownMaterial(materials.pot.clone()),
    zinc: k.material(0xa6aaa1, 0.57, 0.65),
    cream: k.material(0xd8d2ba, 0.66),
    wood: k.m.cedar,
    wicker: k.material(0xaa8e60, 0.94),
    succulent: k.material(0x7d9a79, 0.85),
    stem: k.material(0x667847, 0.94),
    reflector: k.material(0xd2a23b, 0.28),
    apple: k.material(0x9b593d, 0.78),
    cloth: k.textile(["#546a78", "#546a78", "#a3afb0"]),
  };
  m.clay.color.set(0xc59b7c);
  m.vessels = Object.fromEntries(
    Object.entries({ bowl: m.clay, jar: m.glaze, bucket: m.zinc }).map(
      ([kind, material]) => {
        const vessel = k.ownMaterial(material.clone());
        vessel.vertexColors = true;
        return [kind, vessel];
      },
    ),
  );
  const carSpec = alfamaDailyPlacements.car;
  const car = buildWorkCar(k, carSpec.position, carSpec.angle, {
    hatchback: true,
    registration: { country: "P", number: "DA-26-04" },
  });
  car.name = "Small parked car on the accessible lower street";
  const bicycles = alfamaDailyPlacements.bicycles.map((spec, i) => {
    const bicycle = buildBicycle(k, spec.position, spec.angle);
    bicycle.name = i
      ? "Bicycle with groceries by the lower houses"
      : "Parked bicycle beside the middle lane";
    cycleDetails(k, m, bicycle, i === 1);
    return bicycle;
  });
  const planters = alfamaDailyPlacements.planters.map((spec) =>
    planter(k, m, spec),
  );
  const trolley = shoppingTrolley(k, m, alfamaDailyPlacements.trolley);
  const hose = k.material(0x697666, 0.91);
  for (let turn = 0; turn < 3; turn++)
    k.ring(
      0.16 + turn * 0.022,
      0.009,
      [8.8, 2.412 + turn * 0.008, -4.75],
      hose,
    );
  k.tube(
    [
      [8.98, 2.412, -4.75],
      [9.1, 2.412, -4.65],
      [9.13, 2.412, -4.46],
    ],
    0.009,
    hose,
  );
  k.rod([9.13, 2.412, -4.46], [9.12, 2.412, -4.4], 0.018, m.zinc);
  k.group.updateMatrixWorld(true);
  const groundContacts = [];
  const contact = (id, object, local) =>
    groundContacts.push({
      id,
      point: new THREE.Vector3(...local)
        .applyMatrix4(object.matrixWorld)
        .toArray(),
    });
  for (const x of [-0.76, 0.76])
    for (const z of [-1.12, 1.12])
      contact("car-tyre", car, [x + Math.sign(x) * 0.1, 0, z]);
  for (const [i, bicycle] of bicycles.entries())
    for (const z of [-0.63, 0.63])
      contact(`bicycle-${i}-tyre`, bicycle, [0.09, 0, z]);
  planters.forEach((g, i) =>
    contact(`planter-${i}`, g, [
      0,
      0,
      alfamaDailyPlacements.planters[i].kind === "jar" ? 0.29 : 0.27,
    ]),
  );
  for (const x of [-0.23, 0.23]) contact("trolley-wheel", trolley, [x, 0, 0]);
  const bucket = planters[5];
  const cavity = new THREE.Vector3(0.04, 0.34, 0.02).applyMatrix4(
    bucket.matrixWorld,
  );
  return {
    groundContacts,
    activity: [
      { kind: "parked-car", position: carSpec.position },
      ...alfamaDailyPlacements.bicycles.map(({ position }) => ({
        kind: "parked-bicycle",
        position,
      })),
      ...alfamaDailyPlacements.planters.map(({ position, kind, plant }) => ({
        kind: "mixed-planter",
        vessel: kind,
        plant,
        position,
      })),
      {
        kind: "shopping-trolley",
        position: alfamaDailyPlacements.trolley.position,
      },
    ],
    probes: [
      {
        id: "alfama-empty-metal-bucket",
        kind: "cavity",
        origin: cavity.toArray(),
        direction: [0, -1, 0],
        minDistance: 0.31,
      },
    ],
  };
}
