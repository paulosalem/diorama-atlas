import * as THREE from "three";
import { createOutdoorKit } from "./outdoor-kit.js";
import { createVineyardVines } from "./vineyard-vines.js";
import { buildVineyardQuinta } from "./vineyard-quinta.js";
import {
  buildVineyardLandscape,
  vineyardRiverBank,
} from "./vineyard-landscape.js";
import { vineyardViews } from "./vineyard-views.js";
import { schistGeometry } from "./vineyard-stone.js";
import { buildVineyardYard } from "./vineyard-yard.js";
import { buildVineyardLife, vineyardYardView } from "./vineyard-life.js";
import { buildRiversideRailway } from "./riverside-railway.js";
import { addVineyardGroundcover } from "./vineyard-garden.js";

const bend = (x) => 1.4 * Math.sin(x * 0.072) + 0.0008 * x * x;
const edge = (row, x) =>
  -3.5 - 2.4 * Math.exp(-(((x + 9) / 6) ** 2)) - row * 4.1 + bend(x);
const level = (row) => -row * 1.35;

function strip(
  k,
  material,
  front,
  back,
  { lo = -72, hi = 72, samples = 120 } = {},
) {
  const p = [],
    uv = [],
    index = [];
  for (let i = 0; i <= samples; i++) {
    const x = lo + ((hi - lo) * i) / samples;
    for (const boundary of [front, back]) {
      const [y, z] = boundary(x);
      p.push(x, y, z);
      uv.push(x * 0.5, z * 0.5);
    }
    if (i < samples) {
      const a = i * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return k.mesh(geometry, material);
}

export function buildDouroVineyard(definition, renderer) {
  const k = createOutdoorKit(renderer, 41387, {
    sunPosition: [12, 21, 18],
    sunColor: 0xffe2ad,
    sunIntensity: 4.6,
    skyColor: 0xb9d8ec,
    ambientIntensity: 0.6,
    exposure: 1.03,
    fogDensity: 0.00065,
  });
  const earth = k.material(0x9b8968, 1);
  earth.map = k.imageTexture(
    "/public/outdoors/detail-assets/douro/soil-diff.jpg",
    { repeat: true },
  );
  earth.normalMap = k.imageTexture(
    "/public/outdoors/detail-assets/douro/soil-nor_gl.jpg",
    { repeat: true, data: true },
  );
  earth.roughnessMap = k.imageTexture(
    "/public/outdoors/detail-assets/douro/soil-rough.jpg",
    { repeat: true, data: true },
  );
  earth.normalScale.set(0.45, 0.45);
  earth.userData.metresPerRepeat = 2;
  earth.userData.diffuseDetailMode = "tinted-grain";
  earth.userData.patinaProfile = "none";
  const shale = k.ownMaterial(k.m.stone.clone());
  shale.color.set(0xa49b83);
  shale.normalScale.set(0.5, 0.5);
  shale.userData.metresPerRepeat = 0.8;
  const mortar = k.ownMaterial(k.m.stone.clone());
  mortar.color.set(0x625e50);
  mortar.side = THREE.DoubleSide;
  const stones = [],
    chips = [],
    grass = [],
    stairs = [];
  const vines = createVineyardVines(k);
  const wallTones = [
    0xafa38e, 0xc0b299, 0x9b9884, 0x898574, 0xb7a792, 0x9c8b75,
  ];
  function retainingWall({
    top,
    base,
    front,
    hasStairs = false,
    lo = -64,
    hi = 64,
  }) {
    for (const [start, end] of hasStairs
      ? [
          [lo, -1.24],
          [-0.06, hi],
        ]
      : [[lo, hi]])
      strip(
        k,
        mortar,
        (x) => [top, front(x)],
        (x) => [base - 0.03, front(x) - 0.18],
        { lo: start, hi: end },
      );
    for (let course = 0; course < 7; course++) {
      let x = lo + k.range(-0.22, 0.02);
      while (x < hi) {
        const width = k.range(0.24, 0.64),
          z = front(x + width / 2);
        const hasStair =
          hasStairs && x + width + 0.05 > -1.24 && x - 0.05 < -0.06;
        if (!hasStair)
          stones.push({
            position: [
              x + width / 2,
              top - 0.09 - (course * (top - base)) / 7 + k.range(-0.026, 0.026),
              z - 0.02 - course * 0.024,
            ],
            scale: [width, k.range(0.12, 0.2), k.range(0.26, 0.48)],
            rotation: [
              k.range(-0.06, 0.06),
              -Math.atan((front(x + width / 2 + 0.1) - z) / 0.1),
              k.range(-0.055, 0.055),
            ],
            color: wallTones[Math.floor(k.random() * wallTones.length)],
          });
        x += width - 0.025;
      }
    }
    for (let x = lo; x < hi; x += 0.41) {
      if (x > -1.6 && x < 0.25 && hasStairs) continue;
      stones.push({
        position: [x, top + 0.018, front(x)],
        scale: [k.range(0.35, 0.52), 0.12, k.range(0.3, 0.4)],
        rotation: [0, k.range(-0.09, 0.09), k.range(-0.025, 0.025)],
        color: 0xb3ab98,
      });
    }
  }
  // Broad working terrace; the land continues both uphill and down to the river.
  buildVineyardYard(k, earth, {
    front: (x) => [0.01, 9 + bend(x)],
    back: (x) => [0, edge(0, x)],
    left: -78,
    right: 78,
  });
  for (let row = 0; row < 11; row++) {
    const y = level(row + 1);
    strip(
      k,
      earth,
      (x) => [y, edge(row, x) - 0.18],
      (x) => [y, edge(row + 1, x)],
    );
    retainingWall({
      top: level(row),
      base: y,
      front: (x) => edge(row, x),
      hasStairs: row < 5,
    });
    for (let lane = 0; lane < 2; lane++) {
      for (let x = -48; x < 49; x += 1.72) {
        if (x > -2 && x < 0.5 && row < 5) continue;
        const z = edge(row, x) - 1.18 - lane * 1.62;
        vines.vine(x + k.range(-0.07, 0.07), y, z, {
          detail: row < 3 && Math.abs(x) < 19,
          angle: -Math.atan((bend(x + 0.1) - bend(x)) / 0.1),
          scale: k.range(0.88, 1.02),
        });
      }
      for (let x = -49; x < 50; x += 5.16)
        vines.post(x, y, edge(row, x) - 1.18 - lane * 1.62);
      for (const height of [0.82, 1.4])
        for (const [lo, hi] of row < 5
          ? [
              [-49, -2],
              [0.5, 50],
            ]
          : [[-49, 50]]) {
          const points = [];
          for (let x = lo; x < hi; x += 3)
            points.push([x, y + height, edge(row, x) - 1.18 - lane * 1.62]);
          points.push([hi, y + height, edge(row, hi) - 1.18 - lane * 1.62]);
          k.tube(points, 0.002, k.m.iron);
        }
    }
    if (row < 5) {
      const z = edge(row, -0.65) + 0.12;
      const steps = [];
      for (let step = 0; step < 8; step++) {
        const top = level(row) - step * 0.169;
        const bottom = level(row + 1) - 0.04;
        k.box(
          [1.18, top - bottom, 0.38],
          [-0.65, (top + bottom) / 2, z - step * 0.34],
          shale,
          k.group,
          0.015,
        );
        steps.push([-0.65, top, z - step * 0.34]);
      }
      stairs.push({ width: 1.18, steps });
    }
  }
  for (let row = 0; row < 5; row++) {
    const near = 9 + row * 5.6,
      y = (row + 1) * 1.45;
    strip(
      k,
      earth,
      (x) => [y, near + 5.6 + bend(x)],
      (x) => [y, near + bend(x)],
    );
    retainingWall({ top: y, base: y - 1.45, front: (x) => near + bend(x) });
    for (let x = -56; x <= 56; x += 1.85) {
      vines.vine(x, y, near + 1.2 + bend(x), { detail: false });
    }
  }
  for (let i = 0; i < 2200; i++) {
    const row = Math.floor(k.random() * 5),
      x = k.range(-28, 28),
      y = level(row + 1),
      z = edge(row, x) - k.range(0.45, 3.8);
    chips.push({
      position: [x, y + 0.018, z],
      scale: [k.range(0.03, 0.12), k.range(0.012, 0.035), k.range(0.025, 0.08)],
      rotation: [0, k.range(0, 6.28), 0],
      color: wallTones[i % wallTones.length],
    });
    if (i % 7 === 0)
      grass.push({
        position: [x, y + 0.002, edge(row, x) - 0.35],
        scale: [0.012, k.range(0.07, 0.19), 0.012],
        rotation: [k.range(-0.4, 0.4), k.range(0, 6.28), k.range(-0.4, 0.4)],
      });
  }
  k.instances(schistGeometry(), shale, stones).name =
    "Schist retaining-wall stones";
  for (let i = 0; i < 1800; i++) {
    const x = k.range(-23, 23),
      z = k.range(-1.8, 8);
    if ((x > -11.7 && x < -4.3 && z < 3.1) || (x > -1.5 && x < 0.3)) continue;
    const nearVines = Math.abs(z - 0.9) < 0.7 && x > 3;
    if (!nearVines && k.random() < 0.72) continue;
    chips.push({
      position: [x, 0.015, z],
      scale: [
        k.range(0.015, 0.075),
        k.range(0.006, 0.023),
        k.range(0.012, 0.045),
      ],
      rotation: [0, k.range(0, 6.28), 0],
      color: wallTones[i % wallTones.length],
    });
    if (nearVines && i % 3 === 0)
      for (let blade = 0; blade < 6; blade++)
        grass.push({
          position: [
            x + k.range(-0.04, 0.04),
            0.002,
            z + k.range(-0.035, 0.035),
          ],
          scale: [0.006, k.range(0.06, 0.15), 0.004],
          rotation: [k.range(-0.4, 0.4), k.range(0, 6.28), k.range(-0.5, 0.5)],
        });
  }
  k.instances(new THREE.IcosahedronGeometry(1, 0), shale, chips, {
    shadow: false,
  });
  k.instances(
    new THREE.ConeGeometry(1, 1, 3).translate(0, 0.5, 0),
    k.material(0x788b42, 1),
    grass,
    {
      shadow: false,
    },
  );
  const quinta = buildVineyardQuinta(k, vines);
  // A close row at the yard edge makes vine structure visible from human height.
  for (let x = 3.3; x < 18; x += 1.73) {
    vines.vine(x, 0, 0.9, { detail: true, scale: 1.04 });
    if (x < 4 || x > 16) vines.post(x, 0, 0.9);
  }
  for (const h of [0.84, 1.43])
    k.rod([3.3, h, 0.9], [17.8, h, 0.9], 0.002, k.m.iron);
  for (const x of [-24, 23])
    k.tree([x, 0, 4.5 + bend(x)], { height: 4.8, radius: 2.3 });

  const water = k.water({
    width: 1500,
    depth: 260,
    position: [0, -27, -166],
    color: 0x3e7979,
  });
  water.children[0].material.uniforms.waterScale.value = 1.8;
  strip(
    k,
    earth,
    (x) => [-14.85, edge(11, Math.max(-72, Math.min(72, x)))],
    (x) => [-27.1, -73 + 10 * Math.sin(x * 0.018)],
    { lo: -750, hi: 750 },
  );
  const railwayBounds = { left: -180, right: 180 };
  const landscape = buildVineyardLandscape(k, earth, { railwayBounds });
  for (let layer = 0; layer < 3; layer++) {
    const mat = k.material([0x7c8a81, 0x8d9b95, 0x9eaba5][layer], 1);
    strip(
      k,
      mat,
      (x) => [
        25 +
          layer * 12 +
          15 * Math.sin(x * 0.009 + layer) +
          8 * Math.sin(x * 0.018),
        -500 - layer * 130,
      ],
      (x) => [-35, -670 - layer * 130],
      { lo: -900, hi: 900, samples: 160 },
    );
  }
  const life = buildVineyardLife(k, vines);
  const railway = buildRiversideRailway(k, {
    center: (x) => vineyardRiverBank(x) + 0.4,
    height: -25.7,
    bottom: -29.5,
    ...railwayBounds,
  });
  const counts = vines.finish();
  const groundcover = addVineyardGroundcover(k, { edge, level });
  const runtime = k.finish(
    definition,
    {
      ...structuredClone(vineyardViews),
      yard: { ...structuredClone(vineyardYardView), narration: false },
      railway: { ...railway.view, narration: false },
    },
    {
      vines: [5.1, 0.85, 0.9],
      schist: [1.3, -0.55, edge(0, 1.3)],
      quinta: quinta.door,
      valley: [0, -18, -92],
    },
    {
      depthProbes: [
        life.barrowProbe,
        {
          id: "drinking-cup",
          kind: "cavity",
          origin: [-10.29, 1, 0.5],
          direction: [0, -1, 0],
          minDistance: 0.14,
        },
        {
          id: "quinta-door",
          kind: "doorway",
          origin: [-6.65, 1.2, 2.1],
          direction: [0, 0, -1],
          minDistance: 6.6,
        },
        {
          id: "empty-crate",
          kind: "cavity",
          origin: [-8.58, 0.49, 2.72],
          direction: [0, -1, 0],
          minDistance: 0.35,
        },
        {
          id: "water-jug",
          kind: "cavity",
          origin: [-9.34, 1.18, 0.33],
          direction: [0, -1, 0],
          minDistance: 0.25,
        },
      ],
    },
  );
  runtime.vineyard = {
    ...counts,
    groundcover,
    landscape,
    terraces: 11,
    quinta,
    life,
    railway,
    stairs,
    mainPathWidth: 1.18,
  };
  return runtime;
}
