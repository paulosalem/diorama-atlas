import * as THREE from "three";
import { furnishDomusGarden } from "./domus-garden.js";

export function furnishDomus(kit, m, architecture, o) {
  const { box, sub, cylinder, sphere, rod, tube, ring } = kit;
  const {
    furniture,
    bowl,
    jar,
    amphora,
    cloth,
    table,
    stool,
    couch,
    chest,
    lamp,
    scroll,
    tablets,
    bread,
    fruit,
    basket,
    painting,
    plant,
  } = o;
  const points = {};
  const mark = (id, point) => {
    points[id] = point;
  };
  const shelf = (x, z, width, y, parent) =>
    box([width, 0.055, 0.4], [x, y, z], m.wood, parent);
  const bench = (position, width, angle = 0) => {
    const g = furniture(position, width, 0.48, angle);
    box([width, 0.085, 0.48], [0, 0.45, 0], m.wood, g);
    for (const x of [-width * 0.38, width * 0.38])
      box([0.1, 0.42, 0.4], [x, 0.21, 0], m.wood, g);
    return g;
  };
  const personalCare = (g, height) => {
    const mirror = cylinder(
      0.11,
      0.009,
      [0.18, height + 0.015, 0],
      m.bronze,
      g,
    );
    mirror.scale.x = 0.8;
    rod(
      [0.18, height + 0.015, 0.1],
      [0.18, height + 0.015, 0.24],
      0.013,
      m.ivory,
      g,
    );
    box([0.14, 0.008, 0.04], [-0.15, height + 0.015, 0], m.ivory, g);
    for (let i = 0; i < 15; i++)
      box(
        [0.003, 0.008, 0.06],
        [-0.215 + i * 0.009, height + 0.015, 0.045],
        m.ivory,
        g,
        0,
      );
    for (let i = 0; i < 3; i++) {
      rod(
        [-0.18 + i * 0.018, height + 0.016, -0.08],
        [-0.16 + i * 0.018, height + 0.016, -0.23],
        0.003,
        m.bronze,
        g,
      );
      sphere(0.009, [-0.18 + i * 0.018, height + 0.016, -0.08], m.ivory, g);
    }
    jar(
      [0.01, height + 0.04, -0.1],
      { radius: 0.045, height: 0.16, material: m.glass, handles: false },
      g,
    );
    bowl([0, height + 0.04, 0.12], 0.045, 0.022, m.glazed, g);
  };
  const sandals = (position, parent) => {
    for (const x of [-0.08, 0.08]) {
      const sole = kit.cushion(
        [0.105, 0.018, 0.27],
        [position[0] + x, position[1], position[2]],
        m.wood,
        parent,
      );
      sole.rotation.y = x;
      for (const z of [-0.05, 0.01])
        tube(
          [
            [position[0] + x - 0.048, position[1] + 0.008, position[2] + z],
            [position[0] + x, position[1] + 0.055, position[2] + z + 0.025],
            [position[0] + x + 0.048, position[1] + 0.008, position[2] + z],
          ],
          0.007,
          m.wood,
          parent,
        );
    }
  };
  const tunic = (position, parent) => {
    const garment = sub(position, 0, parent);
    garment.name = "domus-hanging-tunic";
    const positions = [],
      uvs = [],
      indices = [];
    const rows = 36,
      columns = 24;
    const panelSize = (rows + 1) * (columns + 1);
    const vertex = (row, col, side) =>
      side * panelSize + row * (columns + 1) + col;
    for (let side = 0; side < 2; side++)
      for (let row = 0; row <= rows; row++) {
        const v = row / rows;
        const width =
          v < 0.66
            ? 0.28 + v * 0.03
            : v < 0.76
              ? 0.3 + (v - 0.66) * 1.9
              : 0.49 - (v - 0.76) * 0.25;
        for (let col = 0; col <= columns; col++) {
          const u = col / columns;
          const x = (u * 2 - 1) * width;
          const neckline = 0.12 * Math.exp(-((x / 0.14) ** 4));
          const y = v * 0.93 - neckline * Math.max(0, (v - 0.85) / 0.15);
          const z =
            (side ? -1 : 1) * (0.018 + 0.022 * Math.sin(Math.PI * u)) +
            Math.sin(x * 43 + v * 0.7) * (0.012 + (1 - v) * 0.015);
          positions.push(x, y, z);
          uvs.push(u, v);
          if (row < rows && col < columns) {
            const a = vertex(row, col, side),
              b = a + columns + 1;
            if (side) indices.push(a, b, a + 1, a + 1, b, b + 1);
            else indices.push(a, a + 1, b, a + 1, b + 1, b);
          }
        }
      }
    // Join the sides and shoulders, leaving neck, sleeves and hem open.
    for (let row = 0; row < Math.floor(rows * 0.66); row++)
      for (const col of [0, columns]) {
        const a = vertex(row, col, 0),
          b = vertex(row + 1, col, 0);
        const c = vertex(row, col, 1),
          d = vertex(row + 1, col, 1);
        indices.push(a, b, c, b, d, c);
      }
    for (let col = 0; col < columns; col++) {
      if (col >= 8 && col < 16) continue;
      const a = vertex(rows, col, 0),
        b = vertex(rows, col, 1);
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    kit.mesh(geometry, m.linen, [0, 0, 0], [0, 0, 0], garment);
    for (const side of [0, 1])
      for (const row of [0, rows]) {
        const edge = [];
        for (let col = 0; col <= columns; col++) {
          const offset = vertex(row, col, side) * 3;
          edge.push(positions.slice(offset, offset + 3));
        }
        tube(edge, 0.002, m.linen, garment);
      }
    rod([-0.35, 1.05, -0.075], [0.35, 1.05, -0.075], 0.022, m.wood, garment);
    for (const x of [-0.23, 0.23]) {
      rod([x, 1.05, -0.15], [x, 1.05, -0.06], 0.015, m.wood, garment);
      tube(
        [
          [x, 0.93, 0],
          [x, 1.07, -0.075],
          [x, 0.93, -0.025],
        ],
        0.004,
        m.linen,
        garment,
      );
    }
    return garment;
  };

  // Reception and the transition from street to household.
  bench([-5.9, 0, 6.2], 2.5, Math.PI / 2);
  bench([5.9, 0, 7.4], 2.2, Math.PI / 2);
  const display = table([0, 0, 1.5], 1.7, 0.65, 0.85, m.stone);
  bowl([-0.44, 0.9, 0], 0.23, 0.07, m.bronze, display);
  jar(
    [0.42, 0.9, 0],
    { height: 0.36, radius: 0.14, material: m.bronze },
    display,
  );
  mark("reception", [0, 0.95, 1.5]);
  const well = furniture([2.7, 0, 4.15], 0.82, 0.82);
  kit.lathe(
    [
      [0.33, 0],
      [0.37, 0.06],
      [0.34, 0.72],
      [0.4, 0.78],
      [0.28, 0.78],
      [0.27, 0.09],
      [0.33, 0],
    ],
    [0, 0, 0],
    m.stone,
    well,
  );
  jar(
    [0.56, 0, 0.2],
    { height: 0.4, radius: 0.2, handles: false, material: m.wood },
    well,
  );
  tube(
    [
      [0.53, 0.4, 0.2],
      [0.51, 0.57, 0.2],
      [0.71, 0.55, 0.2],
      [0.73, 0.4, 0.2],
    ],
    0.016,
    m.iron,
    well,
  );
  for (let i = 0; i < 5; i++)
    ring(0.16 + i * 0.012, 0.007, [0.7, 0.02, -0.4], m.linen, well);
  mark("water", [0, -0.13, 6]);
  stool([-2.6, 0, 15.5]);
  const porterTable = table([-3.7, 0, 16], 0.8, 0.6, 0.72);
  lamp([0, 0.76, 0], porterTable);
  for (let i = 0; i < 3; i++) {
    ring(0.027, 0.006, [-0.2 + i * 0.07, 0.77, 0.1], m.bronze, porterTable);
    rod(
      [-0.2 + i * 0.07, 0.77, 0.12],
      [-0.2 + i * 0.07, 0.77, 0.22],
      0.008,
      m.bronze,
      porterTable,
    );
  }
  mark("entrance", [0, 1.3, 17]);
  couch([-9.7, 0, 15.3], 0, { plain: true, width: 1.85, depth: 0.7 });
  chest([-12.1, 0, 13.2], 0, false, 0.65);

  const desk = table([-1, 0, -3.55], 1.65, 0.85, 0.78);
  tablets([-0.31, 0.825, 0.06], desk);
  scroll([0.36, 0.83, -0.1], desk, true);
  bowl([0.52, 0.83, 0.22], 0.08, 0.025, m.bronze, desk);
  for (let i = 0; i < 6; i++)
    cylinder(
      0.013,
      0.002,
      [0.5 + i * 0.008, 0.86 + i * 0.002, 0.22],
      m.bronze,
      desk,
      0.013,
      16,
    );
  lamp([-0.65, 0.83, -0.27], desk);
  stool([-1, 0, -4.4]);
  chest([1.95, 0, -3.7], 0, false);
  mark("accounts", [-1.15, 0.9, -3.5]);
  painting([-2.83, 2.1, -2.5], 0.8, 1, m.portrait, Math.PI / 2);

  // Shrine as an architectural aedicula, without invented devotional text.
  const shrine = furniture([-6.48, 0, 1.25], 1.05, 0.55, Math.PI / 2);
  box([1.05, 0.85, 0.52], [0, 0.425, 0], m.ochre, shrine);
  box([1.2, 0.08, 0.64], [0, 0.89, 0], m.stone, shrine);
  for (const x of [-0.47, 0.47]) {
    kit.lathe(
      [
        [0.085, 0],
        [0.07, 0.08],
        [0.046, 0.66],
        [0.08, 0.72],
      ],
      [x, 0.94, 0.19],
      m.cream,
      shrine,
      20,
    );
  }
  box([1.16, 0.1, 0.6], [0, 1.71, 0], m.cream, shrine);
  const pediment = new THREE.Shape();
  pediment.moveTo(-0.62, 0);
  pediment.lineTo(0, 0.37);
  pediment.lineTo(0.62, 0);
  pediment.closePath();
  kit.mesh(
    new THREE.ExtrudeGeometry(pediment, { depth: 0.5, bevelEnabled: false }),
    m.cream,
    [0, 1.76, -0.25],
    [0, 0, 0],
    shrine,
  );
  for (const x of [-0.22, 0.22]) {
    cylinder(0.055, 0.025, [x, 0.96, 0], m.bronze, shrine);
    const body = cylinder(
      0.024,
      0.13,
      [x, 1.055, 0],
      m.bronze,
      shrine,
      0.046,
      12,
    );
    body.rotation.z = x * 0.2;
    sphere(0.027, [x, 1.145, 0], m.bronze, shrine);
    rod([x, 1.09, 0], [x - 0.065, 1.13, 0.015], 0.009, m.bronze, shrine);
    rod([x, 1.09, 0], [x + 0.055, 1.19, 0], 0.009, m.bronze, shrine);
  }
  bowl([0, 0.94, 0.2], 0.1, 0.025, m.glazed, shrine);
  lamp([0.39, 0.95, 0.16], shrine);
  mark("worship", [-6.2, 1.35, 1.25]);

  const loom = furniture([-11.5, 0, 8.8], 2, 0.95, Math.PI / 2);
  for (const x of [-0.8, 0.8]) {
    box([0.11, 2.15, 0.12], [x, 1.075, 0], m.wood, loom);
    rod([x, 0, 0.68], [x, 1.5, 0], 0.05, m.wood, loom);
  }
  rod([-0.92, 2.06, 0], [0.92, 2.06, 0], 0.055, m.wood, loom);
  const fabric = kit.mesh(
    new THREE.PlaneGeometry(1.45, 0.87, 16, 16),
    m.blueCloth,
    [0, 1.57, 0.015],
    [0, 0, 0],
    loom,
  );
  kit.animateFabric(fabric, 0.002);
  for (let i = 0; i < 38; i++) {
    const x = -0.7 + (i * 1.4) / 37;
    rod([x, 1.14, 0.02], [x, 0.42, 0.09], 0.0016, m.linen, loom);
    if (i % 3 === 0) {
      const weight = cylinder(
        0.035,
        0.08,
        [x, 0.39, 0.09],
        m.clay,
        loom,
        0.024,
        12,
      );
      weight.rotation.z = 0.1;
    }
  }
  rod([-0.82, 0.97, 0.055], [0.82, 0.97, 0.055], 0.027, m.wood, loom);
  const work = table([-10.7, 0, 11.1], 1.6, 0.75, 0.73);
  cloth([-0.2, 0.78, 0], 0.8, 0.55, m.linen, work);
  rod([0.3, 0.79, -0.22], [0.39, 0.79, 0.2], 0.008, m.wood, work);
  cylinder(0.033, 0.025, [0.38, 0.805, 0.15], m.clay, work);
  tube(
    [
      [0.53, 0.79, 0.16],
      [0.63, 0.79, 0.2],
      [0.68, 0.79, 0.16],
    ],
    0.009,
    m.iron,
    work,
  );
  rod([0.53, 0.79, 0.16], [0.55, 0.79, -0.07], 0.009, m.iron, work);
  rod([0.68, 0.79, 0.16], [0.57, 0.79, -0.07], 0.009, m.iron, work);
  const wool = basket([-10, 0, 7.2]);
  for (let i = 0; i < 6; i++)
    sphere(
      0.075,
      [kit.range(-0.1, 0.1), 0.19 + i * 0.005, kit.range(-0.1, 0.1)],
      m.linen,
      wool,
    );
  stool([-10.2, 0, 9.1]);
  mark("textiles", [-11.5, 1.25, 8.8]);

  couch([-11, 0, 1.8], 0, { width: 2.05, depth: 1.15 });
  chest([-11.2, 0, 5.25], 0, true, 1.2);
  const vanity = table([-12.1, 0, 3.7], 0.9, 0.6, 0.7);
  personalCare(vanity, 0.74);
  lamp([0.3, 0.75, -0.17], vanity, true);
  sandals([-10.1, 0.02, 2.6]);
  tunic([-11.6, 1.25, 5.8]).rotation.y = Math.PI;
  mark("rest", [-11, 0.72, 1.8]);
  mark("grooming", [-12.1, 0.83, 3.7]);
  const study = table([-10.6, 0, -4.7], 1.8, 0.8, 0.76);
  tablets([-0.35, 0.81, 0.07], study);
  scroll([0.4, 0.81, 0], study, true);
  lamp([0.7, 0.81, -0.2], study);
  stool([-10.5, 0, -3.7]);
  const rolls = furniture([-12.4, 0, -3.3], 0.55, 2.8);
  for (const y of [0.35, 0.82, 1.29, 1.76]) {
    box([0.48, 0.055, 2.8], [0, y, 0], m.wood, rolls);
    for (let i = 0; i < 7; i++) scroll([0, y + 0.035, -1.1 + i * 0.35], rolls);
  }
  for (const z of [-1.4, 1.4])
    box([0.48, 1.9, 0.065], [0, 0.95, z], m.wood, rolls);
  painting([-12.82, 2.1, -1.6], 0.75, 0.95, m.portrait, Math.PI / 2);
  mark("literacy", [-10.6, 0.9, -4.7]);

  // Three couches around accessible low serving tables.
  couch([-10.3, 0, -12.7], 0, { width: 2.9, depth: 1.05 });
  couch([-11.9, 0, -10.8], Math.PI / 2, { width: 2.75, depth: 1.05 });
  couch([-8.7, 0, -11], Math.PI / 2, { width: 2.4, depth: 1.05 });
  const meal = table([-10.3, 0, -10.8], 1.5, 1.35, 0.5);
  cloth([0, 0.55, 0.12], 0.66, 0.96, m.linen, meal);
  bowl([-0.36, 0.56, -0.32], 0.22, 0.035, m.glazed, meal);
  bread([-0.36, 0.6, -0.32], meal);
  bowl([0.35, 0.56, -0.28], 0.17, 0.07, m.glazed, meal);
  fruit([0.35, 0.63, -0.28], "olive", 12, meal);
  bowl([0.33, 0.56, 0.29], 0.19, 0.05, m.bronze, meal);
  fruit([0.33, 0.61, 0.29], "fig", 8, meal);
  fruit([-0.25, 0.58, 0.27], "grape", 26, meal);
  for (const x of [-0.6, 0.6]) bowl([x, 0.56, 0], 0.08, 0.08, m.glass, meal);
  for (let i = 0; i < 12; i++)
    sphere(
      0.005,
      [kit.range(-0.5, 0.1), 0.558, kit.range(-0.3, 0.4)],
      m.bread,
      meal,
    );
  const serving = table([-10.1, 0, -6.65], 1.6, 0.7, 0.78);
  for (let i = 0; i < 3; i++)
    sphere(
      0.026,
      [0.15 + i * 0.06, 0.89, -0.02],
      m.ivory,
      serving,
      [1, 1.35, 1],
    );
  jar(
    [-0.4, 0.82, 0],
    { height: 0.45, radius: 0.19, material: m.bronze },
    serving,
  );
  bowl([0.35, 0.82, 0], 0.23, 0.18, m.bronze, serving);
  rod([0.1, 1.03, 0], [0.5, 1.03, 0], 0.01, m.bronze, serving);
  painting([-12.83, 2.05, -10], 1.25, 0.9, m.fruitArt, Math.PI / 2);
  mark("dining", [-10.3, 0.72, -10.8]);
  mark("wine", [-10.5, 1, -6.65]);
  couch([-11.3, 0, -19.4], 0, { width: 1.6, depth: 0.7, plain: true });
  couch([-11.3, 0, -15.3], 0, { width: 1.9, depth: 0.8, plain: true });
  chest([-12.2, 0, -17.3], 0, true, 0.7);
  const game = table([-9.6, 0, -19], 0.7, 0.65, 0.38);
  box([0.42, 0.012, 0.42], [0, 0.424, 0], m.wood, game);
  for (let i = 0; i < 7; i++) {
    box([0.4, 0.002, 0.002], [0, 0.432, -0.18 + i * 0.06], m.ivory, game, 0);
    box([0.002, 0.002, 0.4], [-0.18 + i * 0.06, 0.432, 0], m.ivory, game, 0);
    cylinder(
      0.017,
      0.008,
      [-0.15 + (i % 3) * 0.09, 0.44, -0.13 + Math.floor(i / 3) * 0.12],
      i % 2 ? m.ivory : m.black,
      game,
      0.017,
      16,
    );
  }
  basket([-9.6, 0, -15.2]);
  mark("childhood", [-9.6, 0.5, -19]);

  Object.assign(points, furnishDomusGarden(kit, m, o));
  couch([-3.7, 0, -19.75], 0, { width: 2.4 });
  couch([3.7, 0, -19.75], Math.PI, { width: 2.4 });
  const exedra = table([-3.4, 0, -18.65], 0.85, 0.65, 0.58);
  scroll([0.1, 0.62, 0], exedra);
  bowl([-0.2, 0.62, 0.13], 0.07, 0.07, m.glass, exedra);
  painting([0, 2.1, -20.82], 1.8, 1.15, m.fruitArt);
  const lyre = sub([5.8, 0.48, -20.3]);
  sphere(0.18, [0, 0.14, 0], m.wood, lyre, [1.2, 1, 0.35]);
  for (const sign of [-1, 1])
    tube(
      [
        [sign * 0.16, 0.18, 0],
        [sign * 0.2, 0.47, 0],
        [sign * 0.27, 0.64, 0],
      ],
      0.025,
      m.wood,
      lyre,
    );
  rod([-0.27, 0.61, 0], [0.27, 0.61, 0], 0.022, m.wood, lyre);
  for (let i = 0; i < 7; i++)
    rod(
      [-0.12 + i * 0.04, 0.08, 0.06],
      [-0.17 + i * 0.057, 0.61, 0.01],
      0.0015,
      m.linen,
      lyre,
    );
  mark("art", [0, 2.1, -20.8]);

  // The working half of the home is as fully constructed as its reception rooms.
  const hearth = furniture([13.75, 0, 7.8], 1.65, 3.1);
  const coal = kit.material(0x8d3020, 1);
  coal.emissive.set(0xa8370e);
  coal.emissiveIntensity = 0.75;
  for (const z of [-1.5, 0, 1.5])
    box([1.65, 0.8, 0.2], [0, 0.4, z], m.signinum, hearth);
  box([0.18, 0.8, 3.1], [0.76, 0.4, 0], m.signinum, hearth);
  box([1.65, 0.13, 3.1], [0, 0.86, 0], m.signinum, hearth);
  for (const z of [-0.8, 0.7]) {
    for (let i = 0; i < 6; i++)
      rod(
        [-0.52, 0.99, z - 0.16 + i * 0.05],
        [0.22, 0.99, z + 0.1 - i * 0.03],
        0.035,
        m.black,
        hearth,
      );
    for (const x of [-0.35, 0.15])
      rod([x, 0.95, z - 0.2], [x, 1.15, z - 0.2], 0.016, m.iron, hearth);
    ring(0.23, 0.017, [-0.1, 1.15, z], m.iron, hearth);
    for (let i = 0; i < 9; i++)
      sphere(
        0.022,
        [-0.35 + (i % 3) * 0.12, 0.974, z - 0.11 + Math.floor(i / 3) * 0.09],
        coal,
        hearth,
        [1.4, 0.5, 1],
      );
    jar(
      [-0.1, 1.14, z],
      { height: 0.28, radius: 0.22, material: m.iron },
      hearth,
    );
  }
  for (let i = 0; i < 12; i++)
    rod(
      [-0.45, 0.12 + (i % 3) * 0.06, -1.2 + Math.floor(i / 3) * 0.2],
      [0.35, 0.13 + (i % 3) * 0.06, -1.1 + Math.floor(i / 3) * 0.2],
      0.03,
      m.wood,
      hearth,
    );
  const preparation = table([12.25, 0, 4.15], 2.2, 0.9, 0.8);
  bowl([-0.64, 0.85, 0], 0.21, 0.13, m.stone, preparation);
  rod([-0.62, 0.91, 0], [-0.4, 1.09, 0.02], 0.035, m.stone, preparation);
  box([0.56, 0.025, 0.43], [0.27, 0.854, 0], m.wood, preparation);
  const knife = box([0.018, 0.035, 0.2], [0.42, 0.894, 0], m.iron, preparation);
  knife.rotation.y = 0.25;
  rod([0.39, 0.891, 0.1], [0.37, 0.891, 0.22], 0.017, m.wood, preparation);
  for (let i = 0; i < 4; i++)
    sphere(
      0.045,
      [0.15 + i * 0.08, 0.908, -0.06],
      m.cream,
      preparation,
      [1, 0.8, 1],
    );
  plant([0.75, 0.85, -0.2], 0.2, preparation);
  basket([11.4, 0, 8.5], 0.32, 0.35);
  jar([10.3, 0, 9.2], { height: 0.75, radius: 0.3 });
  for (let i = 0; i < 4; i++) {
    const z = 5 + i * 0.45;
    rod([14.77, 1.65, z], [14.77, 2.05, z], 0.014, m.bronze);
    const pan = bowl([14.77, 1.55, z], 0.13, 0.055, m.bronze);
    pan.rotation.z = Math.PI / 2;
  }
  mark("cooking", [13.7, 1.25, 7.3]);
  mark("preparation", [12.1, 0.98, 4.15]);
  const pantry = furniture([14.3, 0, 0], 0.9, 4.8);
  for (let i = 0; i < 7; i++)
    amphora([0, 0, -2 + i * 0.65], i * 0.24, true, pantry);
  const storage = furniture([12.2, 0, -2.45], 3.5, 0.8);
  for (const y of [0.55, 1.15, 1.75]) {
    shelf(0, 0, 3.5, y, storage);
    for (let i = 0; i < 6; i++)
      jar(
        [-1.45 + i * 0.56, y + 0.035, 0],
        { height: 0.38, radius: 0.15, closed: true },
        storage,
      );
  }
  for (const x of [-1.7, 1.7]) box([0.09, 2, 0.5], [x, 1, 0], m.wood, storage);
  for (let i = 0; i < 3; i++)
    kit.cushion([0.5, 0.65, 0.48], [10.6 + i * 0.65, 0.325, 2.3], m.linen);
  jar([13.4, 0, 2], {
    height: 0.95,
    radius: 0.39,
    closed: true,
    handles: false,
  });
  mark("provisions", [14.2, 0.8, 0]);
  couch([13.2, 0, 15.6], 0, { width: 1.9, depth: 0.72, plain: true });
  couch([13.2, 0, 11.3], 0, { width: 1.9, depth: 0.72, plain: true });
  chest([14.3, 0, 13.45], 0, false, 0.6);
  const repair = table([11.2, 0, 16.25], 1.3, 0.65, 0.7);
  cloth([-0.12, 0.745, 0], 0.65, 0.46, m.linen, repair);
  lamp([0.4, 0.75, 0], repair, true);
  sandals([13.1, 0.015, 14.65]);
  tunic([14.8, 1.15, 13.1]).rotation.y = -Math.PI / 2;
  rod([10.1, 0, 10.65], [10.2, 1.35, 10.7], 0.02, m.wood);
  for (let i = 0; i < 14; i++)
    rod(
      [10.1, 0.23, 10.65],
      [9.98 + i * 0.02, 0.02, 10.65 + Math.sin(i) * 0.04],
      0.006,
      m.wood,
    );
  mark("labor", [13, 0.8, 15.5]);

  // A pierced slab: a literal hole, not a black circle pasted over solid geometry.
  const toilet = furniture([14, 0, -4.5], 1.45, 1.3);
  for (const z of [-0.57, 0.57])
    box([1.4, 0.44, 0.12], [0, 0.22, z], m.signinum, toilet);
  const seat = new THREE.Shape();
  seat.moveTo(-0.7, -0.65);
  seat.lineTo(0.7, -0.65);
  seat.lineTo(0.7, 0.65);
  seat.lineTo(-0.7, 0.65);
  seat.closePath();
  const hole = new THREE.Path();
  hole.absellipse(0, 0, 0.15, 0.19, 0, Math.PI * 2, true);
  seat.holes.push(hole);
  const seatMesh = kit.mesh(
    new THREE.ExtrudeGeometry(seat, { depth: 0.055, bevelEnabled: false }),
    m.wood,
    [0, 0.49, 0],
    [-Math.PI / 2, 0, 0],
    toilet,
  );
  seatMesh.receiveShadow = true;
  box([1.1, 0.04, 0.75], [0.1, 0.03, 0], m.black, toilet);
  jar([11.5, 0, -5.45], {
    height: 0.43,
    radius: 0.22,
    handles: false,
    material: m.wood,
  });
  mark("sanitation", [14, 0.55, -4.5]);
  const changing = bench([13.1, 0, -8.55], 2.9);
  cloth([0.1, 0.505, 0], 0.7, 0.5, m.linen, changing, { drape: 0.16 });
  for (let i = 0; i < 5; i++)
    rod(
      [12 + i * 0.45, 1.7, -8.81],
      [12 + i * 0.45, 1.7, -8.62],
      0.018,
      m.wood,
    );
  const bathTools = table([14.25, 0, -6.7], 0.8, 0.6, 0.68);
  jar(
    [-0.2, 0.72, 0],
    { radius: 0.055, height: 0.15, handles: false, material: m.glass },
    bathTools,
  );
  tube(
    [
      [0.15, 0.74, -0.14],
      [0.14, 0.74, 0.03],
      [0.22, 0.74, 0.14],
      [0.3, 0.74, 0.09],
    ],
    0.014,
    m.bronze,
    bathTools,
  );
  sandals([12.1, 0.015, -7.7]);
  mark("bathing", [14.2, 0.8, -6.7]);
  bench([13.2, 0, -12.55], 2.8);
  const basin = furniture([14.1, 0, -10.3], 0.95, 0.95);
  cylinder(0.16, 0.62, [0, 0.31, 0], m.stone, basin, 0.24);
  bowl([0, 0.62, 0], 0.43, 0.15, m.stone, basin);
  lamp([13, 0.08, -9.25], undefined, true);
  mark("warmth", [14, 0.85, -10.3]);
  const bath = furniture([13.55, 0, -15], 2.15, 2.85);
  for (const x of [-1, 1]) box([0.18, 0.62, 2.7], [x, 0.31, 0], m.stone, bath);
  for (const z of [-1.27, 1.27])
    box([2.18, 0.62, 0.18], [0, 0.31, z], m.stone, bath);
  box([1.85, 0.08, 2.4], [0, 0.07, 0], m.stone, bath);
  box([0.45, 0.23, 2.3], [-0.71, 0.21, 0], m.stone, bath);
  mark("hot-water", [13.55, 0.5, -15]);
  const furnace = furniture([13.6, 0, -18.3], 2, 2.1, -Math.PI / 2);
  for (const x of [-0.8, 0.8])
    box([0.28, 1.15, 1.9], [x, 0.575, 0], m.signinum, furnace);
  box([1.9, 0.2, 1.9], [0, 1.15, 0], m.signinum, furnace);
  box([1.9, 1.1, 0.2], [0, 0.55, -0.9], m.signinum, furnace);
  for (let i = 0; i < 7; i++)
    rod(
      [-0.5, 0.1 + (i % 2) * 0.1, -0.5 + i * 0.14],
      [0.5, 0.16 + (i % 2) * 0.07, -0.45 + i * 0.14],
      0.052,
      m.black,
      furnace,
    );
  for (let i = 0; i < 12; i++)
    sphere(
      0.028,
      [kit.range(-0.45, 0.45), 0.08, kit.range(-0.5, 0.7)],
      coal,
      furnace,
      [1.5, 0.5, 1],
    );
  const fire = new THREE.PointLight(0xff7b35, 2, 4, 2);
  fire.position.set(0, 0.3, 0.3);
  furnace.add(fire);
  jar(
    [0, 1.25, 0],
    { height: 0.65, radius: 0.55, material: m.bronze, handles: false },
    furnace,
  );
  // Small exposed service-side section explains the supported heated floor.
  const hypocaust = furniture([11.1, 0, -20.2], 2.7, 0.9);
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < 5; j++)
      box(
        [0.19, 0.055, 0.19],
        [-1.1 + i * 0.43, 0.05 + j * 0.065, 0],
        m.clay,
        hypocaust,
      );
  box([2.7, 0.13, 0.85], [0, 0.43, 0], m.signinum, hypocaust);
  mark("fuel", [13.6, 0.65, -18.2]);

  const frontStore = furniture([5.9, 0, 15.15], 1.4, 2.8);
  for (let i = 0; i < 4; i++)
    amphora([0, 0, -1 + i * 0.63], 0, true, frontStore);
  const balance = table([3.7, 0, 16.1], 1.4, 0.65, 0.75);
  rod([0, 0.79, 0], [0, 1.3, 0], 0.018, m.bronze, balance);
  rod([-0.3, 1.3, 0], [0.3, 1.3, 0], 0.01, m.bronze, balance);
  for (const x of [-0.27, 0.27]) {
    bowl([x, 0.94, 0], 0.12, 0.035, m.bronze, balance);
    for (const z of [-0.075, 0.075])
      rod([x, 1.3, 0], [x, 0.98, z], 0.002, m.bronze, balance);
  }
  for (let i = 0; i < 4; i++)
    cylinder(
      0.02 + i * 0.01,
      0.04 + i * 0.015,
      [-0.45 + i * 0.08, 0.81, 0.18],
      m.bronze,
      balance,
    );
  tablets([0.45, 0.8, 0.05], balance);
  mark("trade", [3.7, 1, 16.1]);
  return points;
}
