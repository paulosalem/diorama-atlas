import * as THREE from "three";
import { createOutdoorKit, outdoorView } from "./outdoor-kit.js";
import { buildTerrainStrip } from "../shared/cutaway-terrain.js";
import { createVineyardVines } from "./vineyard-vines.js";
import { buildVineyardQuinta } from "./vineyard-quinta.js";
import {
  buildVineyardCutaway,
  createVineyardGeologyMaterials,
} from "./vineyard-cutaway.js";
import {
  buildVineyardOppositeBank,
  oppositeBankBounds,
  oppositeShore,
} from "./vineyard-opposite-bank.js";
import { buildVineyardBoat } from "./vineyard-boat.js";
import { vineyardViews } from "./vineyard-views.js";
import { schistGeometry } from "./vineyard-stone.js";
import { buildVineyardHarvest } from "./vineyard-harvest.js";
import { buildVineyardYard } from "./vineyard-yard.js";
import { buildVineyardLife, vineyardYardView } from "./vineyard-life.js";
import { buildRiversideRailway } from "./riverside-railway.js";

const bend = (x) => 1.4 * Math.sin(x * 0.072) + 0.0008 * x * x;
const edge = (row, x) =>
  -3.5 - 2.4 * Math.exp(-(((x + 9) / 6) ** 2)) - row * 4.1 + bend(x);
const shore = (x) => -18.1 + 0.65 * Math.sin(x * 0.19);
const bounds = { width: 30, back: 10, front: -25 };

export function buildDouroMiniature(definition, renderer) {
  const k = createOutdoorKit(renderer, 41387, { exposure: 1, fogDensity: 0 });
  k.leafMaterial("broadleaf").userData.nativeWind = { anchor: [0.5, 0.13] };
  k.leafMaterial("grass").userData.nativeWind = { anchor: [0.5, 0] };
  const soil = k.material(0x9d8b63, 1);
  soil.userData.patinaProfile = "none";
  soil.userData.metresPerRepeat = 2;
  soil.userData.diffuseDetailMode = "tinted-grain";
  for (const [slot, file] of [
    ["map", "soil-diff.jpg"],
    ["normalMap", "soil-nor_gl.jpg"],
    ["roughnessMap", "soil-rough.jpg"],
  ])
    soil[slot] = k.imageTexture(
      `/public/outdoors/detail-assets/douro/${file}`,
      {
        repeat: true,
        data: slot !== "map",
      },
    );
  soil.normalScale.set(0.45, 0.45);
  const stone = k.ownMaterial(k.m.stone.clone());
  stone.color.set(0xaa9e84);
  stone.userData.metresPerRepeat = 0.8;
  const mortar = k.ownMaterial(stone.clone());
  mortar.color.set(0x716955);
  mortar.side = THREE.DoubleSide;
  const stones = [],
    gravel = [],
    grass = [],
    stairs = [];
  const vines = createVineyardVines(k);
  const strip = (material, front, back, left = -15, right = 15) =>
    buildTerrainStrip(k, material, front, back, { left, right, samples: 120 });
  buildVineyardYard(k, soil, {
    front: () => [0, bounds.back],
    back: (x) => [0, edge(0, x)],
  });
  const tones = [0xafa38e, 0xc0b299, 0x9b9884, 0x898574, 0xb7a792, 0x9c8b75];
  for (let row = 0; row < 3; row++) {
    const top = -row * 1.35,
      bottom = top - 1.35;
    strip(
      soil,
      (x) => [bottom, edge(row, x)],
      (x) => [bottom, row === 2 ? shore(x) : edge(row + 1, x)],
    );
    for (const [lo, hi] of [
      [-15, -1.24],
      [-0.06, 15],
    ])
      strip(
        mortar,
        (x) => [top, edge(row, x)],
        (x) => [bottom, edge(row, x) - 0.15],
        lo,
        hi,
      );
    for (let course = 0; course < 7; course++)
      for (let x = -14.8; x < 14.8;) {
        const width = Math.min(k.range(0.28, 0.61), 15 - x);
        if (!(x + width + 0.05 > -1.24 && x - 0.05 < -0.06))
          stones.push({
            position: [
              x + width / 2,
              top - 0.09 - course * 0.19,
              edge(row, x) - course * 0.022,
            ],
            scale: [width, k.range(0.15, 0.21), k.range(0.25, 0.37)],
            rotation: [
              k.range(-0.035, 0.035),
              -Math.atan((bend(x + 0.1) - bend(x)) / 0.1),
              k.range(-0.04, 0.04),
            ],
            color: tones[Math.floor(k.random() * tones.length)],
          });
        x += width - 0.025;
      }
    for (let x = -14.8; x < 14.8; x += 0.42) {
      if (x > -1.55 && x < 0.2) continue;
      stones.push({
        position: [x, top + 0.015, edge(row, x)],
        scale: [0.44, 0.105, 0.4],
        rotation: [0, 0, k.range(-0.025, 0.025)],
        color: 0xbcb096,
      });
    }
    const steps = [];
    for (let step = 0; step < 8; step++) {
      const y = top - step * 0.169;
      const z = edge(row, -0.65) + 0.12 - step * 0.34;
      k.box(
        [1.18, y - bottom + 0.04, 0.38],
        [-0.65, (y + bottom - 0.04) / 2, z],
        stone,
        k.group,
        0.015,
      );
      steps.push([-0.65, y, z]);
    }
    stairs.push({ width: 1.18, steps });
    for (let lane = 0; lane < 2; lane++) {
      for (let x = -13.7; x < 14.3; x += 1.72) {
        if (x > -2 && x < 0.5) continue;
        const z = edge(row, x) - 1.18 - lane * 1.62;
        vines.vine(x, bottom, z, {
          detail: true,
          angle: -Math.atan((bend(x + 0.1) - bend(x)) / 0.1),
        });
      }
      for (let x = -13.7; x < 14.5; x += 5.16)
        if (x < -2 || x > 0.5)
          vines.post(x, bottom, edge(row, x) - 1.18 - lane * 1.62);
      for (const y of [0.82, 1.4])
        for (const [lo, hi] of [
          [-13.7, -2.5],
          [0.8, 13.8],
        ]) {
          const points = [];
          for (let x = lo; x < hi; x += 1)
            points.push([x, bottom + y, edge(row, x) - 1.18 - lane * 1.62]);
          points.push([hi, bottom + y, edge(row, hi) - 1.18 - lane * 1.62]);
          k.tube(points, 0.003, k.m.iron);
        }
    }
  }
  for (const z of [0.9, 4.2, 7.5]) {
    for (let x = 1.7; x < 13; x += 1.72) vines.vine(x, 0, z, { detail: true });
    vines.vine(14.1, 0, z, { detail: true });
    for (const x of [1.3, 6.46, 11.62, 14.3]) vines.post(x, 0, z);
    for (const y of [0.82, 1.4])
      k.tube(
        [
          [1.3, y, z],
          [7, y, z],
          [14.3, y, z],
        ],
        0.003,
        k.m.iron,
      );
  }
  const quinta = buildVineyardQuinta(k, vines, { roofColor: 0xdd986e });
  for (const [x, z, scale] of [
    [-12.1, 6.7, 0.7],
    [-6.1, 7.8, 0.75],
    [-2.9, 7.9, 0.55],
  ]) {
    k.tree([x, 0, z], { height: 4.8 * scale, radius: 2 * scale });
  }
  for (let i = 0; i < 700; i++) {
    const x = k.range(-14.7, 14.7),
      row = i % 3;
    const z = edge(row, x) - k.range(0.38, 3.6),
      y = -(row + 1) * 1.35;
    if (x > -1.45 && x < 0.15) continue;
    gravel.push({
      position: [x, y + 0.025, z],
      scale: [
        k.range(0.035, 0.12),
        k.range(0.016, 0.045),
        k.range(0.035, 0.12),
      ],
      rotation: [0, k.random() * Math.PI, 0],
      color: tones[i % tones.length],
    });
    if (i % 3 === 0)
      grass.push({
        position: [x, y + 0.005, z],
        scale: [k.range(0.17, 0.29), k.range(0.12, 0.23), 1],
        rotation: [0, k.random() * Math.PI, k.range(-0.2, 0.2)],
        color: i % 2 ? 0xe9e0ac : 0xf3ebcb,
      });
  }
  const rockGeometry = schistGeometry();
  k.instances(rockGeometry, stone, stones);
  k.instances(new THREE.IcosahedronGeometry(1, 0), stone, gravel);
  k.instances(
    new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0),
    k.leafMaterial("grass"),
    grass,
  );
  strip(
    mortar,
    (x) => [-4.05, shore(x)],
    (x) => [-6.2, shore(x) - 1.1],
  );
  const riverbed = k.ownMaterial(soil.clone());
  riverbed.color.set(0x777c66);
  strip(
    riverbed,
    (x) => [-6.2, shore(x) - 1.1],
    () => [-6.2, bounds.front],
  );
  const water = k.material(0x557c70, 0.09, 0.08);
  water.userData.nativeWater = true;
  water.userData.patinaProfile = "none";
  strip(
    water,
    (x) => [-5.3, shore(x) - 0.64],
    () => [-5.3, bounds.front],
  );
  const sectionWater = k.material(0x54776b, 0.22);
  sectionWater.transparent = true;
  sectionWater.opacity = 0.84;
  sectionWater.side = THREE.DoubleSide;
  sectionWater.userData.patinaProfile = "none";
  strip(
    sectionWater,
    () => [-5.3, bounds.front],
    () => [-6.2, bounds.front],
  );
  for (const x of [-15, 15])
    k.mesh(
      new THREE.PlaneGeometry(25 + shore(x) - 0.64, 0.9),
      sectionWater,
      [x, -5.75, (shore(x) - 0.64 - 25) / 2],
      [0, Math.PI / 2, 0],
    );
  const bankRocks = [];
  for (let i = 0; i < 200; i++) {
    const x = k.range(-14.8, 14.8),
      z = shore(x) - k.range(0.2, 0.9);
    bankRocks.push({
      position: [x, -4.65 - (shore(x) - z), z],
      scale: [k.range(0.13, 0.32), k.range(0.1, 0.23), k.range(0.12, 0.28)],
      color: tones[i % tones.length],
    });
  }
  k.instances(new THREE.IcosahedronGeometry(1, 1), stone, bankRocks);
  const boat = buildVineyardBoat(k, [7, -5.26, -21.5]);
  const jetty = k.sub([6.7, -4.5, shore(6.7) - 0.55]);
  for (const x of [-0.55, 0.55])
    for (const z of [-0.9, 0.5])
      k.box([0.12, 1.8, 0.12], [x, -0.7, z], k.m.cedar, jetty, 0.01);
  for (let i = 0; i < 10; i++)
    k.box(
      [1.3, 0.075, 0.18],
      [0, 0, -1.05 + i * 0.19],
      k.m.cedar,
      jetty,
      0.006,
    );
  k.tube(
    [
      [6.75, -4.45, shore(6.7) - 1.45],
      [6.65, -4.8, -19.2],
      [6.5, -4.82, -19.4],
    ],
    0.012,
    k.material(0x9e936e, 1),
  );
  const harvest = buildVineyardHarvest(k, vines);
  const opposite = buildVineyardOppositeBank(k, vines, {
    soil,
    stone,
    water,
    sectionWater,
  });
  const geologyMaterials = createVineyardGeologyMaterials(k, soil);
  const geology = buildVineyardCutaway(k, {
    ...bounds,
    materials: geologyMaterials,
    profile: (x) => [
      [bounds.back, 0],
      [edge(0, x), 0],
      [edge(0, x), -1.35],
      [edge(1, x), -1.35],
      [edge(1, x), -2.7],
      [edge(2, x), -2.7],
      [edge(2, x), -4.05],
      [shore(x), -4.05],
      [shore(x) - 1.1, -6.2],
      [bounds.front, -6.2],
    ],
    rootStations: [
      { z: 4.2, y: 0 },
      { z: 0.9, y: 0 },
      { z: edge(0, 14.1) - 1.18, y: -1.35 },
      { z: edge(1, 14.1) - 1.18, y: -2.7 },
    ],
  });
  const oppositeGeology = buildVineyardCutaway(k, {
    ...opposite,
    materials: geologyMaterials,
  });
  const life = buildVineyardLife(k, vines);
  const railway = buildRiversideRailway(k, {
    center: (x) => oppositeShore(x) + 0.4,
    height: -3.75,
    bottom: -6.25,
    left: -15,
    right: 15,
  });
  const counts = vines.finish();
  const views = {
    whole: {
      ...outdoorView("Douro, in miniature", [62, 50, -46], [0, -1.5, -21], 37),
      orbit: true,
      overview: true,
    },
    ...structuredClone(vineyardViews),
    yard: structuredClone(vineyardYardView),
    railway: railway.view,
    river: {
      ...outdoorView(
        "Down to the water",
        [17, 0.5, -29],
        [6.5, -4.8, -20.5],
        44,
      ),
      orbit: true,
    },
    geology: {
      ...outdoorView(
        "Beneath the vineyard",
        [26, -0.4, 3],
        [15, -2.9, 0.3],
        46,
      ),
      orbit: true,
    },
    hills: {
      ...outdoorView("Across the river", [20, 7, -25], [-3, 0, -44], 49),
      orbit: true,
    },
    harvest: {
      ...outdoorView(
        "A pause at harvest",
        [-5.5, 1.65, 6.7],
        [-9.7, 1.1, 4],
        57,
      ),
    },
  };
  const runtime = k.finish(
    definition,
    views,
    {
      vines: [5.1, 0.85, 0.9],
      schist: [1.3, -0.55, edge(0, 1.3)],
      quinta: quinta.door,
      valley: [0, -5.3, -21],
    },
    {
      depthProbes: [
        {
          id: "quinta-door",
          origin: [-6.65, 1.2, 2.1],
          direction: [0, 0, -1],
          minDistance: 6.6,
        },
        {
          id: "empty-crate",
          origin: [-8.58, 0.49, 2.72],
          direction: [0, -1, 0],
          minDistance: 0.35,
        },
        {
          id: "water-jug",
          origin: [-9.34, 1.18, 0.33],
          direction: [0, -1, 0],
          minDistance: 0.25,
        },
        harvest.basketProbe,
        life.barrowProbe,
      ],
    },
  );
  runtime.miniature = {
    ...bounds,
    ...counts,
    geology,
    oppositeGeology,
    garden: opposite.garden,
    harvest,
    life,
    railway,
    pieces: [bounds, oppositeBankBounds],
    gap: bounds.front - oppositeBankBounds.back,
    stairs,
    mainPathWidth: 1.18,
  };
  runtime.motions = [
    { name: boat.name, type: "float", amplitude: 0.018, roll: 0.007 },
  ];
  runtime.waterExclusion = {
    name: boat.name,
    halfLength: 2.25,
    halfWidth: 0.69,
    floor: -0.14,
    sideHeight: 0.46,
  };
  return runtime;
}
