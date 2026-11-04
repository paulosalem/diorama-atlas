import * as THREE from "three";
import { createEnvironmentKit } from "../shared/environment-kit.js";
import { createInteriorProps } from "./interior-props.js";
import { deepenSurroundings } from "./interior-depth.js";
import { addInteriorLife } from "./interior-life.js";
import { printCatalog } from "../shared/print-catalog.js";
import { shapedTimber } from "../shared/natural-forms.js";
import { completeInteriorMiniature } from "../miniatures/interior-miniature.js";

function sceneSeed(definition) {
  let n = 32;
  for (const c of definition.id) n = (Math.imul(n, 31) + c.charCodeAt(0)) | 0;
  return n >>> 0;
}
function view(label, position, target, fov = 61) {
  return { label, position, target, fov };
}
function detailsAt(definition, rules, fallback) {
  return definition.details.map((d) => {
    const words = `${d.id} ${d.title}`.toLowerCase();
    return (
      rules.find(([pattern]) => pattern.test(words))?.[1] ??
      rules.find(([pattern]) => pattern.test(d.anchor ?? ""))?.[1] ??
      fallback
    );
  });
}

/** Select a purpose-built interior; saved entry descriptions and history remain intact. */
export function buildInteriorEnvironment(
  definition,
  renderer,
  { miniature = false } = {},
) {
  const text =
    `${definition.id} ${definition.title} ${definition.requestPrompt ?? ""}`.toLowerCase();
  const type = /kerala|backwater/.test(text)
    ? "kitchen"
    : /textile|weav|kente|oaxaca|workshop/.test(text)
      ? "workshop"
      : /herb|apothecar|hanoi/.test(text)
        ? "herbshop"
        : /bookshop|bookstore|library/.test(text)
          ? "bookshop"
          : /meyhane|tasca|tavern|lisbon/.test(text)
            ? "tavern"
            : /kissaten|coffee|cafe|café|kyoto/.test(text)
              ? "cafe"
              : ({
                  courtyard: "kitchen",
                  workshop: "workshop",
                  shop: "herbshop",
                  bookshop: "bookshop",
                  tavern: "tavern",
                  cafe: "cafe",
                  market: "herbshop",
                }[definition.blueprint?.archetype] ?? "herbshop");
  const k = createEnvironmentKit(renderer, sceneSeed(definition), {
    rustic: type === "workshop" || type === "kitchen",
    miniature,
  });
  const p = createInteriorProps(
    k,
    type === "tavern" && /lisbon|tasca/.test(text) ? "lisbon" : type,
  );
  if (type === "workshop" || type === "kitchen") {
    k.m.cedar.color.set(0xddd0ab);
    k.m.cedar.roughnessMap = null;
    k.m.cedar.roughness = 0.96;
  }
  const builders = {
    cafe: buildCafe,
    tavern: buildTavern,
    herbshop: buildHerbShop,
    bookshop: buildBookshop,
    workshop: buildWorkshop,
    kitchen: buildKitchen,
  };
  const finish = (views, anchors, options = {}) => {
    const depth = deepenSurroundings(k, p, type, definition);
    const life = addInteriorLife(k, p, type, definition);
    if (miniature) completeInteriorMiniature(k, p, type, definition);
    return k.finish(definition, { ...views, ...depth.views }, anchors, {
      ...options,
      ...life,
      depthProbes: depth.depthProbes,
    });
  };
  return builders[type](definition, k, p, finish);
}

function buildCafe(definition, k, p, finish) {
  const { m, group, box, sub, lathe, cylinder, rod, tube, ring, sphere } = k;
  const vintage = definition.generated,
    width = vintage ? 6.8 : 7.4;
  k.room({ width, depth: 9.2, height: 3.35, wall: m.plaster });
  // Walnut wainscot and narrow joinery panels below the window line.
  for (const side of [-1, 1]) {
    const wall = sub(
      [side * (width / 2 - 0.14), 0, 0],
      side < 0 ? Math.PI / 2 : -Math.PI / 2,
    );
    box([9, 0.93, 0.065], [0, 0.5, 0], m.cedar, wall);
    for (let x = -4.4; x < 4.5; x += 0.48)
      box([0.032, 0.8, 0.06], [x, 0.5, 0.045], m.cedar, wall);
    box([9, 0.07, 0.1], [0, 1.02, 0.04], m.cedar, wall);
  }
  for (const z of [-2.6, 0.4, 3.0])
    k.windowPanel([-width / 2 + 0.17, 2.01, z], 1.9, 1.65, Math.PI / 2, true);
  const counter = sub([2.1, 0, -0.3]);
  box([1.02, 1.01, 5.1], [0, 0.505, 0], m.cedar, counter, 0.02);
  box([1.19, 0.07, 5.3], [0, 1.055, 0], m.cedar, counter, 0.02);
  for (let z = -2.35; z < 2.5; z += 0.52) {
    box([0.022, 0.81, 0.42], [-0.522, 0.51, z], m.cedar, counter);
    cylinder(0.2, 0.04, [-0.94, 0.7, z], p.leather, counter);
    lathe(
      [
        [0.22, 0],
        [0.17, 0.04],
        [0.045, 0.1],
        [0.039, 0.67],
      ],
      [-0.94, 0, z],
      m.iron,
      counter,
      24,
    );
    ring(0.14, 0.011, [-0.94, 0.3, z], m.brass, counter);
  }
  p.shelves([width / 2 - 0.44, 0, -1.45], {
    width: 3.5,
    height: 2.6,
    rows: 4,
    angle: -Math.PI / 2,
    kind: "cups",
    density: 10,
  });
  // Siphon brewers have glass chambers, metal supports, and individual burners.
  const brewedCoffee = k.material(0x26160c, 0.17);
  for (let i = 0; i < 3; i++) {
    const g = sub([2.0, 1.095, -1.85 + i * 0.6]);
    cylinder(0.11, 0.025, [0, 0.013, 0], m.iron, g);
    rod([0.1, 0.02, 0], [0.1, 0.54, 0], 0.011, m.brass, g);
    ring(0.065, 0.007, [0, 0.38, 0], m.brass, g);
    lathe(
      [
        [0.006, 0],
        [0.056, 0.015],
        [0.071, 0.065],
        [0.045, 0.135],
        [0.02, 0.15],
      ],
      [0, 0.13, 0],
      m.glass,
      g,
    );
    lathe(
      [
        [0.02, 0],
        [0.056, 0.03],
        [0.06, 0.19],
        [0.063, 0.2],
        [0.057, 0.2],
        [0.052, 0.04],
        [0.015, 0.008],
      ],
      [0, 0.32, 0],
      m.glass,
      g,
    );
    cylinder(0.053, 0.009, [0, 0.36, 0], p.porcelain, g);
    lathe(
      [
        [0.025, 0],
        [0.047, 0.01],
        [0.063, 0.045],
        [0.061, 0.058],
        [0, 0.058],
      ],
      [0, 0.155, 0],
      brewedCoffee,
      g,
      32,
    );
    cylinder(0.025, 0.055, [0, 0.069, 0], m.brass, g);
    sphere(0.009, [0, 0.112, 0], m.brass, g, [1, 2, 1]);
  }
  p.cup([1.84, 1.096, 0.3]);
  p.jar([2.37, 1.096, 0.8], group, 0.85);
  p.jar([2.4, 1.096, 1.25], group, 1);
  k.framedText(
    "珈琲\nCOFFEE\nゆっくりと",
    [2.58, 1.5, 1.68],
    0.36,
    0.43,
    -Math.PI / 2,
  );
  for (const z of [-2.55, 0.45, 3.15]) {
    p.bench([-width / 2 + 0.65, 0, z], 1.82, Math.PI / 2, p.leather);
    p.table([-width / 2 + 1.48, 0, z], {
      width: 0.72,
      depth: 1.05,
      settings: 2,
    });
    p.chair([-width / 2 + 2.17, 0, z - 0.33], -Math.PI / 2);
    p.chair([-width / 2 + 2.17, 0, z + 0.33], -Math.PI / 2);
  }
  const recordRack = sub([-0.6, 0, -4.3]);
  box([3.6, 1.65, 0.045], [0, 1.35, -0.2], m.cedar, recordRack);
  for (const y of [0.55, 0.94, 1.33, 1.72, 2.11])
    box([3.6, 0.035, 0.39], [0, y, 0], m.cedar, recordRack);
  const sleeves = [0x766c57, 0x544d47, 0x6b5145, 0x444c4b, 0xaaa08a].map((c) =>
    k.material(c, 0.98),
  );
  for (let row = 0; row < 4; row++) {
    const y = 0.55 + row * 0.39 + 0.175,
      count = [128, 136, 131, 139][row];
    for (const start of [-1.7, 0.5])
      for (let i = 0; i < count; i++) {
        const x = start + i * 0.0085;
        box([0.006, 0.315, 0.315], [x, y, 0.02], sleeves[i % 5], recordRack, 0);
        k.mesh(
          new THREE.PlaneGeometry(0.006, 0.313),
          k.prints.recordSpine(printCatalog.records[(i + row) % 4].id),
          [x, y, 0.1785],
          [0, 0, 0],
          recordRack,
        );
        const artwork = k.prints.record(printCatalog.records[(i + row) % 4].id);
        for (const side of [-1, 1])
          k.mesh(
            new THREE.PlaneGeometry(0.313, 0.313),
            artwork,
            [x + side * 0.0038, y, 0.02],
            [0, (side * Math.PI) / 2, 0],
            recordRack,
          );
      }
    for (let i = 0; i < 2; i++) {
      const display = sub(
        [-0.18 + i * 0.36, y, 0.1],
        i ? 0.06 : -0.045,
        recordRack,
      );
      display.rotation.x = -0.1;
      box([0.31, 0.315, 0.008], [0, 0, 0], m.paper, display, 0);
      k.mesh(
        new THREE.PlaneGeometry(0.31, 0.315),
        k.prints.record(printCatalog.records[(row + i) % 4].id),
        [0, 0, 0.0048],
        [0, 0, 0],
        display,
      );
    }
  }
  for (let i = 0; i < 4; i++) {
    box([0.3, 0.3, 0.012], [-1.7 + i * 0.64, 2.55, -4.06], m.paper);
    k.mesh(
      new THREE.PlaneGeometry(0.3, 0.3),
      k.prints.record(printCatalog.records[i].id),
      [-1.7 + i * 0.64, 2.55, -4.053],
    );
  }
  box([1.32, 0.86, 0.61], [-0.6, 0.43, -3.86], m.cedar);
  box([0.86, 0.12, 0.54], [-0.6, 0.91, -3.84], m.cedar);
  cylinder(0.18, 0.014, [-0.69, 0.985, -3.84], m.dark);
  tube(
    [
      [-0.31, 0.998, -3.99],
      [-0.27, 1.04, -3.79],
      [-0.47, 1.02, -3.66],
    ],
    0.006,
    m.brass,
  );
  for (const x of [-2.55, 1.44]) {
    box([0.42, 0.67, 0.32], [x, 1.37, -4.04], m.cedar);
    for (const [y, r] of [
      [1.25, 0.12],
      [1.56, 0.055],
    ])
      meshDisc(k, [x, y, -3.87], r, m.dark);
  }
  k.framedText("MONO\n33⅓\nLISTENING ROOM", [-0.5, 2.96, -4.43], 1.1, 0.32);
  for (const z of [-2.3, 0.3, 2.9])
    p.pendant([0.1, 3.3, z], vintage ? "green" : "brass");
  p.foliage([-2.64, 0, -3.8], 0.65);
  p.openBook([-2.02, 0.739, 0.45]);
  p.cake([-width / 2 + 1.48, 0.748, -2.55]);
  p.cake([-width / 2 + 1.48, 0.748, 3.15]);
  p.wallPrint([1.3, 2.75, -4.444], { id: "coffee", width: 0.62, height: 0.93 });
  k.lightRoom({
    daylight: true,
    intensity: 2.8,
    height: 3.35,
    sunPosition: [-7.5, 5, 2.8],
  });
  return finish(
    {
      room: view(
        "Listening room",
        [-0.65, 1.62, 3.85],
        [0.35, 1.45, -1.85],
        64,
      ),
      coffee: view("Siphon bar", [0.43, 1.52, 0.05], [2.02, 1.37, -1.2], 59),
      records: view(
        "Records & turntable",
        [0.3, 1.5, -1.87],
        [-0.8, 1.46, -4.12],
        59,
      ),
      booth: view("Window booth", [-0.42, 1.25, 1.52], [-2.8, 0.98, 0.36], 59),
    },
    detailsAt(
      definition,
      [
        [/siphon|brew|counter|coffee bar/, [2.0, 1.44, -1.3]],
        [/record|jazz|music|listen/, [-0.65, 1.7, -4.1]],
        [/booth|velvet|seat/, [-width / 2 + 0.6, 0.8, 0.45]],
        [/menu|card/, [2.58, 1.5, 1.68]],
        [/dessert|toast|cake|table/, [-width / 2 + 1.48, 0.81, 0.45]],
      ],
      [0, 1, -1],
    ),
    { exposure: 0.96, environmentIntensity: 0.3 },
  );
}
function meshDisc(k, position, radius, mat, parent = k.group) {
  return k.mesh(
    new THREE.CircleGeometry(radius, 40),
    mat,
    position,
    [0, 0, 0],
    parent,
  );
}

function buildTavern(definition, k, p, finish) {
  const { m, group, box, sub, rod, ring, sphere } = k;
  const lisbon = /lisbon|tasca/i.test(definition.title),
    variant = sceneSeed(definition) % 3;
  const width = lisbon ? 6.7 + variant * 0.22 : 7.4,
    depth = 8.8;
  k.room({ width, depth, height: 3.45, floorKind: "tile", wall: m.plaster });
  const tileMap = k.texture(
    (c, s) => {
      c.fillStyle = "#deded0";
      c.fillRect(0, 0, s, s);
      const blue = lisbon ? "#29485c" : "#346257";
      for (let y = 0; y < s; y += 128)
        for (let x = 0; x < s; x += 128) {
          c.strokeStyle = "#a2a692";
          c.lineWidth = 2;
          c.strokeRect(x + 1, y + 1, 126, 126);
          c.strokeStyle = blue;
          c.lineWidth = 5;
          c.beginPath();
          c.moveTo(x + 64, y + 13);
          c.lineTo(x + 114, y + 64);
          c.lineTo(x + 64, y + 115);
          c.lineTo(x + 14, y + 64);
          c.closePath();
          c.stroke();
          for (let a = 0; a < 4; a++) {
            c.save();
            c.translate(x + 64, y + 64);
            c.rotate((a * Math.PI) / 2);
            c.beginPath();
            c.ellipse(0, -24, 11, 21, 0, 0, Math.PI * 2);
            c.stroke();
            c.restore();
          }
          c.fillStyle = blue;
          c.beginPath();
          c.arc(x + 64, y + 64, 7, 0, Math.PI * 2);
          c.fill();
        }
    },
    [depth / 1.6, 1.42 / 1.6],
  );
  const tile = k.material(0xffffff, 0.37);
  tile.map = tileMap;
  tile.bumpMap = tileMap;
  tile.bumpScale = 0.002;
  for (const side of [-1, 1])
    k.wallPanel({
      position: [side * (width / 2 - 0.132), 0, 0],
      angle: Math.PI / 2,
      width: depth - 0.1,
      height: 1.42,
      bottom: 0.04,
      thickness: 0.025,
      material: tile,
    });
  k.wallPanel({
    position: [0, 0, -depth / 2 + 0.133],
    width: width - 0.1,
    height: 1.42,
    bottom: 0.04,
    thickness: 0.024,
    material: tile,
  });
  for (const z of lisbon ? [-2.3, 1.05] : [2.65])
    k.windowPanel([-width / 2 + 0.17, 2.15, z], 1.7, 1.7, Math.PI / 2, false);
  // Long lunch counter with bottle storage and stacks of plates.
  const bar = sub([width / 2 - 1.0, 0, -0.3]);
  box([1.05, 1.02, 5.8], [0, 0.51, 0], m.cedar, bar, 0.013);
  box(
    [1.2, 0.075, 5.95],
    [0, 1.06, 0],
    lisbon ? m.cedar : m.marble,
    bar,
    0.017,
  );
  for (let z = -2.7; z < 2.8; z += 0.56) {
    box([0.026, 0.84, 0.44], [-0.54, 0.51, z], m.cedar, bar);
    ring(0.017, 0.004, [-0.56, 0.76, z], m.brass, bar, [0, Math.PI / 2, 0]);
  }
  p.shelves([width / 2 - 0.42, 0, -2.3], {
    width: 3.5,
    height: 2.9,
    rows: 4,
    angle: -Math.PI / 2,
    kind: "bottles",
    density: 12,
  });
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 7; i++)
      p.plate(
        [width / 2 - 1.25, 1.106 + i * 0.016, -2.2 + j * 0.39],
        group,
        0.13,
      );
  for (const z of [-0.9, 0.3, 1.7]) {
    p.bottle([width / 2 - 0.85, 1.105, z], group, 1.2);
    p.plate([width / 2 - 1.25, 1.11, z + 0.24], group, 0.18, true);
  }
  if (lisbon)
    k.framedText(
      "PRATOS DO DIA\nSopa · Peixe · Arroz\nVinho da casa\nBom apetite",
      [0.05, 2.34, -4.24],
      1.8,
      1.25,
      0,
      true,
    );
  else
    k.framedText(
      "MEZE\nZeytin · Peynir\nSofrada sohbet",
      [0.05, 2.34, -4.24],
      1.5,
      0.95,
      0,
      true,
    );
  for (const z of [-2.6, 0.13, 2.95]) {
    p.bench([-width / 2 + 0.6, 0, z], 1.95, Math.PI / 2, p.leather);
    const table = p.table([-width / 2 + 1.4, 0, z], {
      width: 0.84,
      depth: 1.2,
      settings: 0,
      cloth: true,
    });
    for (const dz of [-0.33, 0.33]) {
      p.plate([0, 0.755, dz], table, 0.14, true);
      p.glass([0.25, 0.755, dz], table, !lisbon);
    }
    p.plate([-0.17, 0.755, 0], table, 0.13, true);
    p.bottle([-0.2, 0.78, 0], table, 0.85);
    p.chair([-width / 2 + 2.1, 0, z], -Math.PI / 2);
  }
  // Local instruments and serving furniture distinguish Istanbul from the tascas.
  if (!lisbon) {
    const oud = sub([-1.7, 1.6, -4.17]);
    sphere(0.25, [0, 0, 0], m.cedar, oud, [1, 1.35, 0.28]);
    box([0.075, 0.57, 0.05], [0, 0.51, 0], m.cedar, oud);
    for (let i = 0; i < 6; i++)
      rod(
        [-0.018 + i * 0.007, -0.19, 0.08],
        [-0.018 + i * 0.007, 0.77, 0.03],
        0.001,
        m.brass,
        oud,
      );
    meshDisc(k, [0, 0.09, 0.078], 0.06, m.dark, oud);
  } else {
    p.wallPrint([2.75, 2.39, -4.244], {
      id: "wine",
      width: 0.55,
      height: 0.825,
    });
    p.jar([-2.7, 1.35, -4.13], group, 1.25);
  }
  if (!lisbon)
    p.wallPrint([2.95, 2.3, -4.244], {
      id: "table",
      width: 0.65,
      height: 0.975,
    });
  for (const z of [-2.1, 0.6, 3.0]) p.pendant([0.05, 3.42, z]);
  p.foliage([-2.65, 0, 3.65], 0.65);
  if (!lisbon)
    k.mirror([-width / 2 + 0.17, 2.12, -0.8], 2.7, 1.25, Math.PI / 2);
  k.lightRoom({
    daylight: true,
    height: 3.45,
    intensity: 2.8,
    sunPosition: [-7, 5, 4.5],
  });
  const center = width / 2 - 1;
  return finish(
    {
      room: view(
        lisbon ? "Inside the tasca" : "Inside the meyhane",
        [0.02, 1.62, 3.85],
        [0.35, 1.25, -2.6],
        64,
      ),
      table: view(
        lisbon ? "At the lunch table" : "Meze table",
        [-1.0, 1.38, 1.2],
        [-2.3, 0.78, 0.13],
        60,
      ),
      bar: view(
        "The serving counter",
        [0.65, 1.57, 1.6],
        [center, 1.35, -1.4],
        61,
      ),
      tiles: view(
        lisbon ? "Azulejo & window" : "Mirrors & music",
        [-0.5, 1.62, -0.9],
        [-width / 2 + 0.16, 1.85, lisbon ? -2.3 : -0.8],
        60,
      ),
    },
    detailsAt(
      definition,
      [
        [/menu|board/, [0.05, 2.34, -4.24]],
        [/mirror/, [-width / 2 + 0.16, 2.1, -0.8]],
        [/raki|rakı|glass/, [-width / 2 + 1.15, 0.89, 0.13]],
        [/tile|azulejo|wall/, [-width / 2 + 0.16, 1.18, -1.8]],
        [/meze|plate|lunch|table|dish|petisco/, [-width / 2 + 1.4, 0.85, 0.13]],
        [/bottle|wine/, [width / 2 - 0.43, 1.9, -2.3]],
        [/counter|bar|serv|drawer/, [center, 1.18, -0.7]],
        [/music|oud|instrument/, [-1.7, 1.9, -4.12]],
      ],
      [center, 1.18, -0.7],
    ),
  );
}

function buildHerbShop(definition, k, p, finish) {
  const { m, group, box, sub, cylinder, rod, sphere } = k;
  const width = 5.2,
    depth = 9.1;
  k.room({ width, depth, height: 3.5, floorKind: "tile", wall: m.plaster });
  for (const x of [-1.55, 1.55])
    p.drawerCabinet([x, 0, -4.2], {
      width: 1.45,
      height: 3.0,
      rows: 10,
      cols: 4,
    });
  p.drawerCabinet([-2.25, 0, -1.0], {
    width: 4.8,
    height: 2.5,
    rows: 8,
    cols: 13,
    angle: Math.PI / 2,
  });
  p.shelves([2.25, 0, -1.25], {
    width: 5.9,
    height: 2.9,
    rows: 5,
    angle: -Math.PI / 2,
    kind: "jars",
    density: 18,
  });
  const work = p.table([-0.17, 0, -1.7], {
    width: 2.9,
    depth: 0.85,
    height: 0.9,
    settings: 0,
  });
  p.scale([-0.25, 0.91, -0.04], work);
  p.jar([1.0, 0.91, -0.1], work, 1.15);
  p.jar([0.7, 0.91, 0.05], work, 0.8);
  // Paper packets, folded at their corners, and open trays of botanical material.
  for (let i = 0; i < 8; i++) {
    const packet = box(
      [0.17, 0.028, 0.12],
      [-1.1 + k.range(-0.03, 0.03), 0.926 + i * 0.028, 0.15],
      m.paper,
      work,
      0.007,
    );
    packet.rotation.y = k.range(-0.12, 0.12);
  }
  for (let j = 0; j < 3; j++) {
    const tray = sub([0.2 + j * 0.28, 0.92, 0.17], 0, work);
    box([0.24, 0.035, 0.22], [0, 0, 0], m.cedar, tray);
    for (let i = 0; i < 18; i++) {
      const a = k.range(0, 6.28),
        r = k.range(0.005, 0.085);
      rod(
        [Math.cos(a) * r, 0.026, Math.sin(a) * r],
        [Math.cos(a) * r + 0.05, 0.03, Math.sin(a) * r + 0.026],
        0.005,
        j % 2 ? m.pot : m.bark,
        tray,
      );
    }
  }
  // Hanging bundles are tied sprigs rather than solid leaf blocks.
  const herbs = k.material(0x6b7044, 0.96);
  rod([-2.0, 2.9, -3.4], [2.0, 2.9, -3.4], 0.028, m.cedar);
  for (let j = 0; j < 10; j++) {
    const x = -1.8 + j * 0.4;
    if (Math.abs(x) < 0.8) continue;
    rod([x, 2.9, -3.4], [x, 2.57, -3.4], 0.003, m.linen);
    for (let i = 0; i < 13; i++) {
      const end = [
        x + k.range(-0.13, 0.13),
        k.range(2.0, 2.3),
        -3.4 + k.range(-0.1, 0.1),
      ];
      rod([x, 2.57, -3.4], end, 0.003, m.bark);
      for (let n = 0; n < 3; n++)
        sphere(
          0.025,
          [end[0] + k.range(-0.03, 0.03), end[1] + n * 0.055, end[2]],
          herbs,
          group,
          [0.45, 1.5, 0.7],
        );
    }
  }
  k.windowPanel([-2.43, 2.1, 3.2], 1.4, 1.85, Math.PI / 2, false);
  for (const z of [-2.3, 0.4, 2.9]) p.pendant([0, 3.4, z], "green");
  p.table([1.5, 0, 2.5], {
    width: 1.2,
    depth: 0.68,
    height: 0.72,
    settings: 0,
  });
  p.openBook([1.45, 0.719, 2.5]);
  p.chair([1.5, 0, 3.3]);
  p.jar([1.93, 0.77, 2.4], group, 0.85);
  p.wallPrint([2.442, 2.13, 2.65], {
    id: "herbs",
    width: 0.65,
    height: 0.975,
    angle: -Math.PI / 2,
  });
  for (let i = 0; i < 3; i++) {
    const sack = sub([-1.65 + i * 0.45, 0, 2.9]);
    k.cushion([0.37, 0.51, 0.34], [0, 0.27, 0], m.linen, sack);
    cylinder(0.12, 0.02, [0, 0.49, 0], m.soil, sack);
  }
  k.lightRoom({
    daylight: true,
    height: 3.5,
    intensity: 3.2,
    sunPosition: [-0.6, 2.9, 6.0],
  });
  return finish(
    {
      room: view(
        "Inside the herb shop",
        [0.12, 1.62, 3.85],
        [0, 1.38, -2.5],
        64,
      ),
      scale: view(
        "At the brass scale",
        [0.4, 1.48, 0.02],
        [-0.4, 1.15, -1.7],
        57,
      ),
      drawers: view(
        "Apothecary drawers",
        [0.9, 1.57, -1.6],
        [-1.3, 1.6, -4.2],
        59,
      ),
      herbs: view(
        "Herbs & ceramic jars",
        [-0.55, 1.6, 0.35],
        [2.1, 1.7, -1.0],
        62,
      ),
    },
    detailsAt(
      definition,
      [
        [/drawer|cabinet|storage/, [-1.55, 1.65, -4.06]],
        [/bundle|hang|dried/, [-1.4, 2.35, -3.4]],
        [/scale|balance/, [-0.42, 1.3, -1.74]],
        [/jar|ceramic/, [2.08, 1.8, -1.2]],
        [/paper|packet|counter|work/, [-1.23, 1.05, -1.55]],
      ],
      [-0.17, 1, -1.7],
    ),
    { exposure: 0.97, environmentIntensity: 0.28 },
  );
}

function buildBookshop(definition, k, p, finish) {
  const { m, box, sub, lathe, rod, ring } = k;
  k.room({ width: 7.2, depth: 9.4, height: 4.0, wall: m.plaster });
  for (const x of [-2.37, 2.37])
    p.shelves([x, 0, -4.4], {
      width: 2.25,
      height: 3.65,
      rows: 7,
      kind: "books",
      density: 31,
    });
  p.shelves([0, 2.82, -4.4], {
    width: 2.25,
    height: 0.83,
    rows: 2,
    kind: "books",
    density: 28,
  });
  for (const z of [-2.6, 0.0, 2.6])
    p.shelves([-3.28, 0, z], {
      width: 2.4,
      height: 3.65,
      rows: 7,
      angle: Math.PI / 2,
      kind: "books",
      density: 33,
    });
  for (const z of [-2.7, 0.0])
    p.shelves([3.27, 0, z], {
      width: 2.5,
      height: 3.4,
      rows: 6,
      angle: -Math.PI / 2,
      kind: "books",
      density: 33,
    });
  k.windowPanel([3.43, 2.1, 2.8], 2.0, 2.6, -Math.PI / 2, true);
  // Reading table has stacks, a spreading book and a small banker's lamp.
  const table = p.table([0.0, 0, 0.6], {
    width: 2.2,
    depth: 1.25,
    height: 0.79,
    settings: 0,
  });
  p.openBook([-0.18, 0.797, 0.16], table);
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 4; i++)
      p.book(
        [0.5 + j * 0.31, 0.819 + i * 0.047, -0.25],
        table,
        0.043,
        0.27,
        true,
      );
  p.chair([0, 0, 1.63]);
  p.chair([0.83, 0, 0.7], -Math.PI / 2);
  p.chair([-0.85, 0, 0.7], Math.PI / 2);
  box([1.2, 0.004, 0.76], [-0.15, 0.793, 0.02], m.jade, table, 0);
  p.oilLamp([-0.72, 0.795, -0.28], table);
  for (const x of [0.66, 0.8]) {
    lathe(
      [
        [0.027, 0],
        [0.043, 0.025],
        [0.037, 0.06],
        [0.022, 0.075],
      ],
      [x, 0.795, 0.24],
      m.glass,
      table,
    );
    rod([x, 0.845, 0.24], [x - 0.11, 1.1, 0.22], 0.002, m.paper, table);
  }
  // A rolling ladder gives the shelves a convincing human scale.
  const ladder = sub([-2.4, 0, -2.55], 0.11);
  for (const x of [-0.24, 0.24])
    rod([x, 0.09, 0.58], [x, 3.45, -0.29], 0.028, m.cedar, ladder);
  for (let i = 0; i < 11; i++) {
    const y = 0.25 + i * 0.285,
      z = 0.58 - ((y - 0.09) / 3.36) * 0.87;
    box([0.5, 0.035, 0.13], [0, y, z], m.cedar, ladder);
  }
  for (const x of [-0.24, 0.24])
    ring(0.065, 0.019, [x, 0.07, 0.59], m.iron, ladder, [0, Math.PI / 2, 0]);
  rod([-3.28, 3.48, -3.4], [-3.28, 3.48, 3.8], 0.018, m.brass);
  k.framedText(
    "NATURAL HISTORY\nTRAVEL · LITERATURE",
    [0, 3.83, -4.27],
    2.0,
    0.25,
  );
  p.armchair([2.77, 0, 2.9], -Math.PI / 2);
  p.table([1.75, 0, 2.9], {
    width: 0.56,
    depth: 0.6,
    height: 0.56,
    round: true,
    settings: 1,
  });
  for (const z of [-2.3, 0.3, 2.9]) p.lantern([0.1, 3.95, z]);
  for (const x of [-2.35, 2.35])
    k.framedText("TRAVELS\n& LETTERS", [x, 3.82, -4.27], 0.9, 0.25);
  p.wallPrint([1.8, 2.45, 4.5735], {
    id: "flowers",
    width: 0.64,
    height: 0.96,
    angle: Math.PI,
  });
  k.lightRoom({
    daylight: true,
    height: 4,
    intensity: 2.7,
    sunPosition: [7.5, 5.2, 4.5],
  });
  return finish(
    {
      room: view("Among the books", [-0.6, 1.65, 4.03], [0.22, 1.5, -2.0], 63),
      desk: view("Reading table", [0.6, 1.37, 2.2], [-0.12, 0.9, 0.4], 62),
      shelves: view(
        "Shelves & ladder",
        [0.25, 1.65, -0.45],
        [-2.4, 2.0, -3.7],
        62,
      ),
      window: view(
        "Window reading nook",
        [0.27, 1.44, 1.9],
        [2.73, 1.17, 2.9],
        60,
      ),
    },
    detailsAt(
      definition,
      [
        [/ladder/, [-2.4, 1.7, -2.4]],
        [/shelf|shelves|spine|bookcase/, [-1.5, 2.0, -4.14]],
        [/window|chair|seat|nook/, [2.76, 0.8, 2.9]],
        [/lamp/, [-0.7, 1.15, 0.35]],
        [/lantern/, [0.1, 3.25, 0.3]],
        [/panel|frame/, [0, 3.82, -4.27]],
        [/desk|table|open book|read/, [0, 0.97, 0.6]],
      ],
      [0, 0.97, 0.6],
    ),
    { exposure: 0.97, environmentIntensity: 0.3 },
  );
}

function buildWorkshop(definition, k, p, finish) {
  const { m, group, box, sub, cylinder, rod, tube, lathe } = k;
  k.room({
    width: 8.3,
    depth: 9.2,
    height: 3.65,
    floorKind: "tile",
    wall: m.plaster,
  });
  for (const z of [-2.3, 1.3])
    k.windowPanel([-3.98, 2.05, z], 2.2, 2.3, Math.PI / 2, false);
  const cloth = k.textile(
    ["#744036", "#b59257", "#364c56", "#dcc69e", "#8b5635"],
    [1, 1],
    "diamond",
  );
  const threadColors = [
    0xb77942, 0x894e40, 0xc9b485, 0x3d5b67, 0x77533d, 0xb8a67b,
  ].map((c) => k.material(c, 0.96));
  const loom = sub([-0.65, 0, -0.8], -0.12);
  // Pedal loom: structural rails, warp beam, cloth beam, heddles and treadles.
  for (const x of [-0.83, 0.83])
    for (const z of [-0.9, 0.9])
      shapedTimber(k, [x, 0, z], [x, 1.83, z], 0.11, m.cedar, loom, {
        seed: x * 4 + z,
        relief: 0.0006,
      });
  for (const y of [0.13, 1.77])
    for (const z of [-0.9, 0.9])
      shapedTimber(k, [-0.925, y, z], [0.925, y, z], 0.1, m.cedar, loom, {
        seed: y + z,
        relief: 0.0005,
      });
  for (const x of [-0.83, 0.83])
    for (const y of [0.22, 1.47])
      shapedTimber(k, [x, y, -0.955], [x, y, 0.955], 0.09, m.cedar, loom, {
        depth: 0.11,
        seed: x + y,
        relief: 0.0006,
      });
  for (const x of [-0.83, 0.83])
    for (const z of [-0.9, 0.9])
      for (const y of [0.22, 1.47, 1.77]) {
        const peg = cylinder(0.011, 0.012, [x, y, z + 0.06], m.cedar, loom);
        peg.rotation.x = Math.PI / 2;
      }
  for (const z of [-0.78, 0.84]) {
    const beam = cylinder(0.1, 1.65, [0, 0.9, z], m.cedar, loom);
    beam.rotation.z = Math.PI / 2;
    const ratchet = cylinder(
      0.142,
      0.027,
      [0.9, 0.9, z],
      m.cedar,
      loom,
      0.142,
      40,
    );
    ratchet.rotation.z = Math.PI / 2;
    for (let tooth = 0; tooth < 20; tooth++) {
      const a = (tooth * Math.PI) / 10;
      box(
        [0.035, 0.026, 0.034],
        [0.9, 0.9 + Math.cos(a) * 0.14, z + Math.sin(a) * 0.14],
        m.cedar,
        loom,
        0.002,
        [a, 0, 0],
      );
    }
    shapedTimber(
      k,
      [0.93, 1.1, z + 0.1],
      [0.93, 0.93, z + 0.15],
      0.025,
      m.cedar,
      loom,
      { depth: 0.012, relief: 0.0002 },
    );
  }
  for (const x of [-0.57, 0.57]) {
    const wheel = cylinder(0.045, 0.025, [x, 1.71, -0.19], m.cedar, loom);
    wheel.rotation.z = Math.PI / 2;
    for (const dx of [-0.018, 0.018])
      rod([x + dx, 1.77, -0.19], [x + dx, 1.71, -0.19], 0.004, m.iron, loom);
    tube(
      [
        [x, 1.61, -0.32],
        [x, 1.75, -0.22],
        [x, 1.74, -0.16],
        [x, 1.61, -0.1],
      ],
      0.0025,
      m.linen,
      loom,
    );
  }
  for (const z of [-0.32, -0.1, 0.12]) {
    const frame = sub([0, 0, z], 0, loom);
    for (const y of [1.03, 1.63])
      box([1.5, 0.027, 0.026], [0, y, 0], m.cedar, frame);
    for (let x = -0.71; x < 0.72; x += 0.025)
      tube(
        [
          [x, 1.03, 0],
          [x - 0.003, 1.16, 0],
          [x - 0.003, 1.19, 0],
          [x, 1.63, 0],
          [x + 0.003, 1.19, 0],
          [x + 0.003, 1.16, 0],
          [x, 1.03, 0],
        ],
        0.0009,
        m.linen,
        frame,
      );
  }
  for (let i = 0; i < 120; i++) {
    const x = -0.7 + (i / 119) * 1.4;
    const mat = threadColors[Math.floor(i / 10) % threadColors.length];
    tube(
      [
        [x, 0.96, -0.79],
        [x, 1.18, -0.3],
        [x, 1.15, 0.14],
        [x, 0.965, 0.85],
      ],
      0.0016,
      mat,
      loom,
    );
  }
  box([1.38, 0.008, 0.52], [0, 0.979, 0.62], cloth, loom, 0.002);
  for (let i = 0; i < 4; i++) {
    const treadle = box(
      [0.12, 0.028, 0.81],
      [-0.3 + i * 0.2, 0.13, 0.05],
      m.cedar,
      loom,
    );
    treadle.rotation.x = -0.08;
    rod(
      [-0.3 + i * 0.2, 0.15, -0.25],
      [-0.3 + i * 0.2, 1.02, -0.21],
      0.002,
      m.linen,
      loom,
    );
  }
  const shuttle = sub([0.36, 0.999, 0.7], 0.33, loom);
  const outline = new THREE.Shape();
  outline.moveTo(-0.15, 0);
  outline.bezierCurveTo(-0.09, 0.06, 0.09, 0.06, 0.15, 0);
  outline.bezierCurveTo(0.09, -0.06, -0.09, -0.06, -0.15, 0);
  const recess = new THREE.Path();
  recess.absellipse(0, 0, 0.092, 0.026, 0, Math.PI * 2, true);
  outline.holes.push(recess);
  k.mesh(
    new THREE.ExtrudeGeometry(outline, {
      depth: 0.028,
      bevelEnabled: true,
      bevelSize: 0.002,
      bevelThickness: 0.002,
      bevelSegments: 3,
      curveSegments: 24,
    }),
    m.cedar,
    [0, -0.014, 0],
    [-Math.PI / 2, 0, 0],
    shuttle,
  );
  box([0.18, 0.004, 0.05], [0, -0.013, 0], m.cedar, shuttle, 0.002);
  rod([-0.095, 0.006, 0], [0.095, 0.006, 0], 0.003, m.iron, shuttle);
  const bobbin = cylinder(
    0.015,
    0.13,
    [0, 0.006, 0],
    threadColors[2],
    shuttle,
    0.015,
    28,
  );
  bobbin.rotation.z = Math.PI / 2;
  for (let x = -0.065; x < 0.066; x += 0.002)
    k.ring(0.015, 0.0007, [x, 0.006, 0], m.linen, shuttle, [0, 0, Math.PI / 2]);
  p.stool([-0.65, 0, 0.64], 1.18, 0.35, 0.48);
  // Racks of differently dyed yarn skeins, each with separate winding.
  const yarn = sub([2.92, 0, -3.45]);
  for (const x of [-0.92, 0.92])
    box([0.07, 2.85, 0.07], [x, 1.43, 0], m.cedar, yarn);
  for (const y of [1.0, 1.83, 2.65]) {
    rod([-0.96, y, 0], [0.96, y, 0], 0.025, m.cedar, yarn);
    for (let i = 0; i < 7; i++) {
      const length = 0.45 + k.range(0, 0.19);
      const fullness = k.range(0.8, 1.24);
      for (let j = 0; j < 30; j++) {
        const x = -0.77 + i * 0.255;
        const mat = threadColors[i % threadColors.length];
        const turn = (j / 30) * Math.PI * 2;
        const dx = Math.cos(turn) * 0.028 * fullness,
          dz = Math.sin(turn) * 0.032;
        tube(
          [
            [x + dx - 0.035, y - 0.015, dz],
            [
              x + dx - 0.065 * fullness,
              y - length * 0.54,
              dz + 0.014 * Math.sin(turn),
            ],
            [x + dx * 0.7, y - length, dz],
            [
              x + dx + 0.065 * fullness,
              y - length * 0.54,
              dz - 0.014 * Math.sin(turn),
            ],
            [x + dx + 0.035, y - 0.015, dz],
            [x + dx, y + 0.03, dz],
          ],
          0.0035,
          mat,
          yarn,
          true,
        );
      }
      for (const dy of [0, 0.006, 0.012])
        tube(
          [
            [-0.77 + i * 0.255 - 0.055, y - length * 0.42 + dy, 0],
            [-0.77 + i * 0.255, y - length * 0.42 + dy, 0.049],
            [-0.77 + i * 0.255 + 0.055, y - length * 0.42 + dy, 0],
            [-0.77 + i * 0.255, y - length * 0.42 + dy, -0.049],
          ],
          0.0018,
          m.linen,
          yarn,
          true,
        );
    }
  }
  const dye = p.table([-2.72, 0, -3.5], {
    width: 1.95,
    depth: 0.81,
    height: 0.83,
    settings: 0,
  });
  for (let i = 0; i < 3; i++) {
    lathe(
      [
        [0.08, 0],
        [0.15, 0.03],
        [0.16, 0.15],
        [0.17, 0.16],
      ],
      [-0.62 + i * 0.58, 0.855, 0],
      m.bronze,
      dye,
    );
    cylinder(0.148, 0.006, [-0.62 + i * 0.58, 1.002, 0], threadColors[i], dye);
    rod(
      [-0.62 + i * 0.58, 0.9, 0],
      [-0.7 + i * 0.58, 1.24, 0.03],
      0.009,
      m.cedar,
      dye,
    );
  }
  const wetYarn = threadColors[2];
  for (let strand = 0; strand < 24; strand++) {
    const dx = strand * 0.002;
    tube(
      [
        [-0.64 + dx, 0.975, 0],
        [-0.68 + dx, 1.025, 0.14],
        [-0.58 + dx, 0.88, 0.25],
        [-0.5 + dx, 0.855, 0.36],
        [-0.45 + dx, 0.66, 0.43],
      ],
      0.0012,
      wetYarn,
      dye,
    );
  }
  for (let i = 0; i < 3; i++)
    sphereSpool(
      k,
      [0.65 + (i % 2) * 0.15, 0.842, -0.22 + Math.floor(i / 2) * 0.15],
      0.055,
      threadColors[4 + (i % 2)],
      dye,
    );
  const stackTable = p.table([2.78, 0, 0.7], {
    width: 1.55,
    depth: 2.3,
    height: 0.79,
    settings: 0,
  });
  const foldedMats = [
    cloth,
    k.textile(["#6b3b2f", "#bbaa82", "#373f47"]),
    k.textile(["#b3a480", "#68634b", "#b3a480"]),
  ];
  for (let col = 0; col < 2; col++)
    for (let i = 0; i < 6; i++)
      k.cushion(
        [0.57, 0.045, 0.75],
        [-0.35 + col * 0.7, 0.84 + i * 0.047, 0.1],
        foldedMats[i % 3],
        stackTable,
        [0, k.range(-0.045, 0.045), 0],
      );
  for (const z of [-2.7, -1.85, 2.15])
    p.jar([3.2, 0, z], group, k.range(1.8, 2.5), false);
  const sampleTable = p.table([-0.95, 0, 2.55], {
    width: 1.5,
    depth: 0.78,
    height: 0.76,
    settings: 0,
  });
  for (let i = 0; i < 4; i++) {
    const x = -0.51 + i * 0.34;
    p.plate([x, 0.773, 0], sampleTable, 0.13);
    for (let j = 0; j < 30; j++)
      k.sphere(
        0.013,
        [
          x + k.range(-0.08, 0.08),
          0.808 + k.range(0, 0.012),
          k.range(-0.07, 0.07),
        ],
        threadColors[i],
        sampleTable,
      );
  }
  p.stool([-2.04, 0, 2.53]);
  p.jar([-0.57, 0.78, 2.35], group, 0.9, false);
  for (let i = 0; i < 12; i++)
    sphereSpool(
      k,
      [2.12 + (i % 4) * 0.29, 0.15 + Math.floor(i / 4) * 0.17, 3.2],
      0.065,
      threadColors[i % 6],
    );
  const hanging = k.mesh(
    new THREE.PlaneGeometry(1.1, 2.05, 20, 30),
    cloth,
    [1.35, 1.95, -4.39],
  );
  const hp = hanging.geometry.attributes.position;
  for (let i = 0; i < hp.count; i++)
    hp.setZ(i, Math.sin(hp.getX(i) * 18) * 0.018);
  hanging.geometry.computeVertexNormals();
  k.animateFabric(hanging);
  rod([0.72, 3.02, -4.36], [1.98, 3.02, -4.36], 0.023, m.cedar);
  p.pendant([0, 3.6, -1.1]);
  p.foliage([-3.33, 0, 3.58], 0.7);
  p.wallPrint([-2.75, 2.25, -4.444], {
    id: "textile",
    width: 0.74,
    height: 1.11,
  });
  k.lightRoom({
    daylight: true,
    height: 3.65,
    intensity: 3.1,
    sunPosition: [-7, 5.5, 1.8],
  });
  return finish(
    {
      room: view(
        "Inside the workshop",
        [1.12, 1.64, 3.88],
        [-0.55, 1.25, -1.6],
        64,
      ),
      loom: view("At the loom", [-0.1, 1.45, 1.25], [-0.6, 1.18, -0.9], 60),
      dyes: view(
        "Natural dye table",
        [-0.35, 1.51, -1.55],
        [-2.7, 1.07, -3.46],
        59,
      ),
      yarn: view(
        "Skeins & finished cloth",
        [0.9, 1.59, 0.65],
        [2.63, 1.52, -2.42],
        61,
      ),
    },
    detailsAt(
      definition,
      [
        [/loom|pedal|weav|warp|shuttle/, [-0.65, 1.2, -0.8]],
        [/dye|pigment|cochineal|indigo/, [-2.72, 1.0, -3.5]],
        [/yarn|skein|thread/, [2.92, 1.85, -3.45]],
        [/fold|cloth|finished|textile stack/, [2.78, 1.03, 0.7]],
        [/pattern|sample|motif/, [1.35, 1.95, -4.37]],
      ],
      [-0.65, 1.2, -0.8],
    ),
  );
}
function sphereSpool(k, position, radius, mat, parent = k.group) {
  const g = k.sub(position, 0, parent);
  k.cylinder(radius * 0.83, radius * 1.6, [0, radius * 0.8, 0], mat, g);
  for (const y of [0, radius * 1.6])
    k.cylinder(radius, 0.016, [0, y, 0], k.m.cedar, g);
  for (let i = 0; i < 12; i++)
    k.ring(radius * 0.83, 0.002, [0, i * radius * 0.13, 0], mat, g);
  return g;
}

function buildKitchen(definition, k, p, finish) {
  const { m, group, box, sub, lathe, rod, tube, ring, sphere } = k;
  k.room({
    width: 8.6,
    depth: 9.3,
    height: 3.1,
    floorKind: "tile",
    wall: m.plaster,
    openLeft: true,
  });
  // A semi-open timber verandah; this courtyard deliberately has no riad arches.
  for (const z of [-4, -1.8, 0.4, 2.6, 4.4]) {
    box([0.18, 3.08, 0.18], [-4.0, 1.54, z], m.cedar);
    box([0.33, 0.12, 0.32], [-4, 2.98, z], m.cedar);
    rod([-4, 2.51, z], [-3.38, 3.05, z], 0.045, m.cedar);
    rod([-4, 2.52, z], [-4, 3.05, z + 0.5], 0.04, m.cedar);
  }
  // Deep garden beyond the open edge provides parallax through the posts.
  box([4, 0.12, 12], [-6.25, -0.14, 0], m.soil, group, 0);
  for (const z of [-4, -2.7, -1.4, 0, 1.6, 3, 4.4])
    p.foliage([-9.0 - k.random(), -0.05, z], k.range(1.2, 1.9), true, {
      planted: true,
    });
  for (let z = -4.4; z < 4.6; z += 0.46)
    k.lift(box([8.6, 0.13, 0.09], [0, 3.01, z], m.cedar));
  const preparation = p.table([2.78, 0, -0.18], {
    width: 1.08,
    depth: 5.2,
    height: 0.83,
    settings: 0,
  });
  for (let i = 0; i < 4; i++) {
    const z = -1.5 + i * 0.76;
    lathe(
      [
        [0.02, 0],
        [0.17, 0.01],
        [0.25, 0.05],
        [0.28, 0.1],
        [0.285, 0.12],
        [0.27, 0.13],
        [0.25, 0.09],
        [0.16, 0.035],
        [0.02, 0.027],
      ],
      [0, 0.86, z],
      m.brass,
      preparation,
    );
    for (const sign of [-1, 1])
      ring(
        0.039,
        0.009,
        [sign * 0.295, 0.98, z],
        m.brass,
        preparation,
        [0, 0, 0],
      );
  }
  p.shelves([3.97, 0, -1.8], {
    width: 3.2,
    height: 2.6,
    rows: 4,
    angle: -Math.PI / 2,
    kind: "jars",
    density: 9,
  });
  // Clay fire hearth with recessed fire mouths and blackened pots.
  const stove = p.hearth([-1.38, 0, -3.85]);
  for (const x of [-0.7, 0.65]) {
    const profile = new THREE.SplineCurve(
      [
        [0, 0.009],
        [0.18, 0.01],
        [0.225, 0.065],
        [0.237, 0.16],
        [0.2, 0.285],
        [0.185, 0.33],
        [0.195, 0.345],
        [0.175, 0.347],
        [0.168, 0.317],
        [0.184, 0.27],
        [0.213, 0.15],
        [0.19, 0.062],
        [0, 0.038],
      ].map((point) => new THREE.Vector2(...point)),
    );
    lathe(
      profile.getPoints(64).map((point) => point.toArray()),
      [x, 0.652, 0],
      m.bronze,
      stove,
      64,
    );
    k.cylinder(0.177, 0.005, [x, 0.908, 0], m.dark, stove);
    for (const sign of [-1, 1])
      tube(
        [
          [x + sign * 0.215, 0.85, 0],
          [x + sign * 0.285, 0.9, 0],
          [x + sign * 0.25, 0.965, 0],
          [x + sign * 0.19, 0.955, 0],
        ],
        0.014,
        m.bronze,
        stove,
      );
    for (let i = 0; i < 3; i++) {
      const start = [x - 0.12 + i * 0.1, 0.085, 0.17 + i * 0.04];
      const end = [x - 0.1 + i * 0.095, 0.09, 0.95 + i * 0.07];
      const charEnd = [start[0], start[1], start[2] + 0.16];
      shapedTimber(k, charEnd, end, 0.065, i === 1 ? m.cedar : m.bark, stove, {
        round: i !== 1,
        taper: 0.22,
        bend: 0.015,
        relief: 0.002,
        seed: i + x * 4,
      });
      shapedTimber(k, start, charEnd, 0.065, m.dark, stove, {
        round: i !== 1,
        taper: 0,
        relief: 0.002,
        seed: i + x * 4,
      });
    }
  }
  const sootMap = k.texture((c, s) => {
    c.clearRect(0, 0, s, s);
    const g = c.createRadialGradient(
      s * 0.5,
      s * 0.8,
      0,
      s * 0.5,
      s * 0.8,
      s * 0.7,
    );
    g.addColorStop(0, "#302b22d0");
    g.addColorStop(0.45, "#443c2b80");
    g.addColorStop(1, "#403a2500");
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  });
  const soot = k.material(0xffffff, 1);
  soot.map = sootMap;
  soot.transparent = true;
  soot.depthWrite = false;
  k.mesh(new THREE.PlaneGeometry(3.2, 2.7), soot, [-1.35, 1.56, -4.5]);
  const spiceTable = p.table([-0.45, 0, 0.45], {
    width: 1.65,
    depth: 0.94,
    height: 0.7,
    settings: 0,
  });
  const spiceColors = [0xc18d28, 0x9b4226, 0x423728, 0x546542].map((c) =>
    k.material(c, 0.98),
  );
  for (let i = 0; i < 4; i++) {
    const x = -0.54 + i * 0.36;
    lathe(
      [
        [0, 0],
        [0.12, 0.008],
        [0.15, 0.05],
        [0.145, 0.06],
        [0.11, 0.03],
      ],
      [x, 0.73, 0],
      m.cedar,
      spiceTable,
    );
    sphere(0.105, [x, 0.766, 0], spiceColors[i], spiceTable, [1, 0.25, 1]);
  }
  box([0.8, 0.035, 0.38], [0.15, 0.749, 0.3], m.cedar, spiceTable, 0.015);
  for (let i = 0; i < 5; i++)
    sphere(
      0.033,
      [0.03 + i * 0.068, 0.79, 0.29],
      m.jade,
      spiceTable,
      [1, 0.6, 1.5],
    );
  const coconut = sub([-2.28, 0, 1.83]);
  p.stool([-2.26, 0, 1.9], 1.3, 0.45, 0.48);
  for (const x of [-0.32, 0.12]) {
    sphere(0.13, [x, 0.55, 0], m.bark, coconut, [1, 0.8, 1]);
    k.mesh(
      new THREE.CircleGeometry(0.1, 32),
      p.porcelain,
      [x, 0.634, 0],
      [-Math.PI / 2, 0, 0],
      coconut,
    );
  }
  box([0.32, 0.035, 0.44], [0.35, 0.5, 0], m.cedar, coconut);
  rod([0.4, 0.52, 0.14], [0.4, 0.67, -0.1], 0.013, m.iron, coconut);
  lathe(
    [
      [0.18, 0],
      [0.27, 0.05],
      [0.29, 0.14],
      [0.27, 0.22],
      [0.17, 0.23],
      [0.13, 0.13],
    ],
    [-2.45, 0, 0.6],
    m.dark,
  );
  rod([-2.45, 0.11, 0.6], [-2.61, 0.5, 0.62], 0.045, m.dark);
  for (const z of [-2.2, 0.8, 3]) p.pendant([1.06, 3.06, z]);
  p.wallPrint([4.143, 2.0, 2.65], {
    id: "herbs",
    width: 0.62,
    height: 0.93,
    angle: -Math.PI / 2,
  });
  k.lightRoom({
    daylight: true,
    height: 3.1,
    intensity: 2.75,
    sunPosition: [-7, 4.1, 2],
  });
  return finish(
    {
      room: view("Kitchen courtyard", [0.23, 1.62, 3.9], [0.1, 1.1, -2.2], 64),
      hearth: view("Clay hearth", [-0.05, 1.5, -1.1], [-1.38, 0.89, -3.85], 60),
      spices: view(
        "Spices & brass vessels",
        [0.15, 1.4, 1.65],
        [2.48, 0.97, -0.6],
        63,
      ),
      verandah: view(
        "Coconut tools & garden",
        [0.4, 1.48, 2.8],
        [-2.8, 1, 1.2],
        65,
      ),
    },
    detailsAt(
      definition,
      [
        [/uruli|brass|vessel/, [2.78, 1.0, -0.9]],
        [/spice|tray|niche/, [-0.45, 0.81, 0.45]],
        [/coconut|husking|grat/, [-2.28, 0.61, 1.83]],
        [/rafter|roof|smoke/, [0, 2.98, -1.8]],
        [/floor|plaster|terracotta/, [0.2, 0.1, 1.0]],
        [/stove|hearth|fire/, [-1.38, 0.86, -3.85]],
      ],
      [-0.45, 0.8, 0.45],
    ),
  );
}
