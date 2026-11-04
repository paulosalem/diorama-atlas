import * as THREE from "three";
import { miniatureSurroundings } from "../miniatures/interior-miniature.js";

const passageLabels = {
  cafe: "Behind the coffee bar",
  tavern: "The service room",
  herbshop: "The dispensary",
  bookshop: "The reading room",
  workshop: "The dye room",
  kitchen: "Pantry & garden passage",
};

function attach(parent, object) {
  parent.add(object);
  return object;
}

function probe(id, kind, origin, direction, minDistance = 3) {
  return { id, kind, origin, direction, minDistance };
}

/** Connected spaces share the main room's floor level and genuinely open walls. */
export function deepenSurroundings(k, p, type, definition) {
  const { width, depth } = k.layout;
  const portalX = {
    cafe: width / 2 - 1.05,
    tavern: 1.65,
    herbshop: 0,
    bookshop: 0,
    workshop: 0,
    kitchen: 1.35,
  }[type];
  const portalWidth = type === "bookshop" ? 1.42 : 1.22;
  const rear = -depth / 2;
  k.doorOpening([portalX, 1.31, rear + 0.14], portalWidth, 2.62);

  const shade = k.material(
    type === "kitchen" || type === "workshop" ? 0xa99c82 : 0xb8a68b,
    0.98,
  );
  shade.map = k.m.plaster.map;
  shade.normalMap = k.m.plaster.normalMap;
  shade.normalScale.set(0.26, 0.26);
  const room = buildSecondaryRoom(k, p, type, portalX, rear, shade);
  const depthProbes = [
    ...[0.14, 1.35, 2.3].map((y, index) =>
      probe(
        `rear-door-${index + 1}`,
        "doorway",
        [portalX, y, rear + 0.24],
        [0, 0, -1],
      ),
    ),
    probe(
      "continued-passage",
      "passage",
      [portalX + 0.82, 1.35, room.back + 0.1],
      [0, 0, -1],
    ),
  ];

  const theme =
    type === "kitchen"
      ? "tropical"
      : type === "workshop"
        ? "courtyard"
        : type === "cafe"
          ? "kyoto"
          : type === "herbshop"
            ? "hanoi"
            : /lisbon|tasca/i.test(definition.title)
              ? "lisbon"
              : type === "tavern"
                ? "istanbul"
                : "europe";
  const streetSides = new Set(
    k.windows.map((window) => Math.sign(window.position[0])),
  );
  if (k.miniature) miniatureSurroundings(k, p, theme, portalX);
  else for (const side of streetSides) buildSideStreet(k, p, side, theme);
  for (const [index, window] of k.windows.entries()) {
    const rotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      window.angle,
    );
    const origin = new THREE.Vector3(
      window.width * 0.18,
      window.height * 0.09,
      0.1,
    )
      .applyQuaternion(rotation)
      .add(new THREE.Vector3(...window.position));
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(rotation);
    depthProbes.push(
      probe(
        `window-${index + 1}`,
        "window",
        origin.toArray(),
        direction.toArray(),
      ),
    );
  }
  if (!k.miniature) buildEntrance(k, p, shade, theme);
  depthProbes.push(
    probe("front-entry", "entrance", [0, 1.35, depth / 2 - 0.1], [0, 0, 1]),
  );
  if (type === "kitchen") {
    buildGarden(k, p);
    depthProbes.push(
      probe("verandah-garden", "garden", [-4.2, 1.35, 1.35], [-1, 0, 0]),
    );
  }

  k.group.updateMatrixWorld(true);
  for (const [index, cavity] of p.cavityProbes.entries()) {
    const origin = cavity.parent.localToWorld(
      new THREE.Vector3(...cavity.position),
    );
    const direction = new THREE.Vector3(...cavity.direction).transformDirection(
      cavity.parent.matrixWorld,
    );
    depthProbes.push(
      probe(
        `${cavity.kind}-${index + 1}`,
        cavity.kind,
        origin.toArray(),
        direction.toArray(),
        cavity.minDistance,
      ),
    );
  }
  return {
    views: {
      passage: {
        label: passageLabels[type],
        position: [portalX, 1.62, rear + 1.15],
        target: [portalX - 0.06, 1.35, rear - 2.8],
        fov: 59,
      },
    },
    depthProbes,
  };
}

function buildSecondaryRoom(k, p, type, portalX, rear, shade) {
  const { m, box, sub, rod } = k;
  const width = type === "workshop" ? 3.55 : 3.25;
  const depth = 4.35;
  const origin = sub([portalX, 0, rear - 0.12]);
  origin.name = `Connected ${passageLabels[type].toLowerCase()}`;
  box(
    [width, 0.12, depth],
    [0, -0.06, -depth / 2],
    type === "cafe" || type === "bookshop" ? m.woodFloor : m.floor,
    origin,
    0,
  );
  k.lift(
    box([width + 0.3, 0.16, depth], [0, 3.04, -depth / 2], m.cedar, origin, 0),
  );
  for (const side of [-1, 1]) {
    box(
      [0.2, 3, depth],
      [side * (width / 2 + 0.1), 1.5, -depth / 2],
      shade,
      origin,
      0,
    );
    box(
      [0.045, 0.16, depth],
      [side * (width / 2 - 0.015), 0.08, -depth / 2],
      m.cedar,
      origin,
      0,
    );
  }
  // The near wall closes the shoulders around the original doorway, not its aperture.
  k.wallWithOpenings(
    origin,
    width,
    3,
    0.08,
    [{ x: 0, width: type === "bookshop" ? 1.42 : 1.22, bottom: 0, top: 2.62 }],
    shade,
  );
  const far = sub([0, 0, -depth], 0, origin);
  k.wallWithOpenings(
    far,
    width,
    3,
    0.24,
    [{ x: 0.82, width: 0.96, bottom: 0, top: 2.4 }],
    shade,
  );
  for (const side of [-1, 1])
    box(
      [0.07, 2.44, 0.29],
      [0.82 + side * 0.495, 1.22, 0.025],
      m.cedar,
      far,
      0,
    );
  box([1.1, 0.08, 0.29], [0.82, 2.44, 0.025], m.cedar, far, 0);
  box([0.98, 0.03, 0.42], [0.82, 0.006, 0], m.marble, far, 0);
  const passage = sub([0.82, 0, -0.12], 0, far);
  box([1.15, 0.1, 3.5], [0, -0.05, -1.75], m.floor, passage, 0);
  for (const side of [-1, 1])
    box([0.12, 2.65, 3.5], [side * 0.635, 1.325, -1.75], shade, passage, 0);
  k.lift(box([1.4, 0.12, 3.5], [0, 2.65, -1.75], m.cedar, passage, 0));
  box([1.4, 2.65, 0.16], [0, 1.325, -3.5], shade, passage, 0);
  box([0.4, 0.055, 0.26], [0.22, 0.94, -3.31], m.cedar, passage);
  p.jar([0.22, 0.97, -3.27], passage, 0.8);
  for (let z = -0.3; z > -depth; z -= 0.75)
    k.lift(box([width, 0.1, 0.07], [0, 2.92, z], m.cedar, origin, 0));

  const contents = {
    cafe: "cups",
    tavern: "bottles",
    herbshop: "jars",
    bookshop: "books",
    workshop: "jars",
    kitchen: "jars",
  }[type];
  attach(
    origin,
    p.shelves([-0.9, 0, -4.04], {
      width: 1.1,
      height: 2.42,
      rows: 4,
      kind: contents,
      density: type === "bookshop" ? 14 : 4,
    }),
  );
  const work = attach(
    origin,
    p.table([-0.62, 0, -2.42], {
      width: 1.3,
      depth: 0.66,
      height: 0.82,
      settings: 0,
    }),
  );
  if (type === "cafe") {
    p.cup([-0.4, 0.83, 0.08], work);
    p.jar([0.38, 0.83, -0.05], work);
    attach(origin, p.stool([-0.58, 0, -1.54]));
    const rack = sub([1.37, 0, -2.5], -Math.PI / 2, origin);
    box([1.7, 0.07, 0.45], [0, 0.87, 0], m.cedar, rack);
    for (const x of [-0.62, 0.62]) {
      box([0.035, 0.45, 0.055], [x, 0.61, -0.15], m.iron, rack);
      rod([x, 0.41, -0.15], [x, 0.83, 0.18], 0.018, m.iron, rack);
    }
    for (const x of [-0.58, 0, 0.58]) p.cup([x, 0.91, 0], rack);
    rod([-0.78, 1.8, -0.03], [0.78, 1.8, -0.03], 0.012, m.brass, rack);
    for (const x of [-0.5, 0.45]) {
      k.ring(0.035, 0.006, [x, 1.74, -0.03], m.brass, rack, [0, 0, 0]);
      rod([x, 1.7, -0.03], [x, 1.45, -0.03], 0.009, m.brass, rack);
    }
  } else if (type === "tavern") {
    for (let i = 0; i < 8; i++) p.plate([-0.35, 0.83 + i * 0.017, 0], work);
    p.bottle([0.29, 0.83, -0.03], work);
    attach(origin, p.stool([0.78, 0, -2.1]));
    box([0.44, 0.024, 0.32], [0.15, 0.835, 0.03], m.linen, work);
  } else if (type === "herbshop") {
    p.scale([-0.28, 0.83, 0], work);
    p.openBook([0.33, 0.819, 0.04], work);
    attach(
      origin,
      p.drawerCabinet([-1.38, 0, -1.3], {
        width: 1.5,
        height: 1.85,
        rows: 6,
        cols: 4,
        angle: Math.PI / 2,
      }),
    );
  } else if (type === "bookshop") {
    p.openBook([-0.24, 0.819, 0.04], work);
    p.book([0.33, 0.847, 0], work, 0.05, 0.27, true);
    attach(origin, p.chair([-0.52, 0, -1.58], 0.08));
    attach(
      origin,
      p.shelves([1.37, 0, -2.15], {
        width: 2.4,
        height: 2.62,
        rows: 5,
        angle: -Math.PI / 2,
        kind: "books",
        density: 17,
      }),
    );
    p.oilLamp([-0.53, 0.83, -0.15], work);
  } else if (type === "workshop") {
    for (let i = 0; i < 3; i++)
      p.jar([-0.42 + i * 0.4, 0.83, 0], work, 0.9, false);
    attach(origin, p.stool([-0.56, 0, -1.56]));
    const drying = sub([-1.54, 0, -1.35], Math.PI / 2, origin);
    for (const x of [-0.62, 0.62])
      rod([x, 0, 0], [x, 2.45, 0], 0.025, m.cedar, drying);
    rod([-0.68, 2.35, 0], [0.68, 2.35, 0], 0.027, m.cedar, drying);
    const textile = k.textile(["#86684f", "#6b3c33", "#b7a27d"], [1, 1]);
    k.animateFabric(
      k.mesh(
        new THREE.PlaneGeometry(1.1, 1.32, 10, 16),
        textile,
        [0, 1.65, 0.035],
        [0, 0, 0],
        drying,
      ),
    );
  } else {
    for (const x of [-0.4, 0.3]) p.jar([x, 0.83, 0], work, 1.15, false);
    attach(
      origin,
      p.shelves([1.37, 0, -2.15], {
        width: 2.35,
        height: 2.45,
        rows: 4,
        angle: -Math.PI / 2,
        kind: "jars",
        density: 5,
      }),
    );
  }
  attach(
    origin,
    p.pendant([-0.35, 2.96, -2.25], type === "cafe" ? "green" : "brass"),
  );
  const bounce = new THREE.PointLight(0xffd0a4, 1.9, 5.2, 2);
  bounce.position.set(0.65, 1.9, -0.65);
  origin.add(bounce);
  const farLight = new THREE.PointLight(0xd2dacb, 1.2, 4.5, 2);
  farLight.position.set(0, 2.1, -2.6);
  passage.add(farLight);
  return { back: rear - 0.12 - depth };
}

function buildSideStreet(k, p, side, theme) {
  const { width, depth } = k.layout;
  const outside = k.sub(
    [side * (width / 2 + 0.2), 0, 0],
    side < 0 ? Math.PI / 2 : -Math.PI / 2,
  );
  outside.name = `${theme} side street`;
  k.box([depth + 5, 0.14, 5.1], [0, -0.08, -2.4], k.m.floor, outside, 0);
  for (let x = -depth / 2 - 1; x < depth / 2 + 1; x += 0.58)
    k.box([0.014, 0.006, 4.9], [x, -0.006, -2.4], k.m.grout, outside, 0);
  k.box([depth + 4, 0.07, 0.13], [0, 0.02, -0.75], k.m.marble, outside, 0);
  const facade = k.sub([0, 0, -4.8], 0, outside);
  buildFacade(k, p, facade, depth + 5, theme);
  for (const x of [-depth / 2 - 0.45, depth / 2 + 0.45])
    attach(
      outside,
      p.foliage([x, 0, -3.7], theme === "courtyard" ? 1.1 : 0.72),
    );
}

function buildFacade(k, p, parent, width, theme) {
  const { m, box, sub, rod } = k;
  const facade = k.material(
    {
      kyoto: 0xaaa28b,
      hanoi: 0xaaa891,
      lisbon: 0xc6bba2,
      istanbul: 0xb4a995,
      europe: 0xa6a28e,
      courtyard: 0xb9a087,
      tropical: 0xa1a48b,
    }[theme],
    0.96,
  );
  facade.normalMap = m.plaster.normalMap;
  facade.normalScale.set(0.3, 0.3);
  const holes = [-3, 0, 3]
    .filter((x) => Math.abs(x) + 0.7 < width / 2)
    .map((x) => ({ x, width: 1.2, bottom: 1.1, top: 2.85 }));
  k.wallWithOpenings(parent, width, 4.9, 0.32, holes, facade);
  for (const hole of holes) {
    const alcove = sub([hole.x, 0, -0.16], 0, parent);
    box([1.85, 0.1, 1.85], [0, 1.05, -0.9], m.cedar, alcove, 0);
    box([1.85, 2.4, 0.18], [0, 2.2, -1.85], facade, alcove, 0);
    for (const side of [-1, 1])
      box([0.14, 2.4, 1.85], [side * 0.93, 2.2, -0.9], facade, alcove, 0);
    box([2.0, 0.12, 1.85], [0, 3.4, -0.9], m.cedar, alcove, 0);
    box([0.72, 0.045, 0.37], [-0.37, 1.54, -1.46], m.cedar, alcove, 0);
    p.jar([-0.37, 1.57, -1.45], alcove, 0.85);
    for (const side of [-1, 1]) {
      box(
        [0.075, 1.82, 0.36],
        [hole.x + side * 0.62, 1.98, 0],
        m.cedar,
        parent,
        0,
      );
      const shutter = sub(
        [hole.x + side * 0.64, 1.14, 0.18],
        side * 0.78,
        parent,
      );
      box([0.035, 1.66, 0.045], [side * 0.51, 0.83, 0], m.cedar, shutter, 0);
      for (let y = 0.05; y < 1.67; y += 0.105)
        box([0.54, 0.06, 0.045], [side * 0.27, y, 0], m.cedar, shutter, 0);
    }
    box([1.42, 0.1, 0.38], [hole.x, 1.08, 0.08], m.marble, parent, 0);
    box([1.36, 0.07, 0.34], [hole.x, 2.88, 0], m.cedar, parent, 0);
    if (theme === "lisbon" || theme === "istanbul" || theme === "europe") {
      for (let x = -0.62; x < 0.7; x += 0.18)
        rod(
          [hole.x + x, 1.03, 0.53],
          [hole.x + x, 1.57, 0.53],
          0.009,
          m.iron,
          parent,
        );
      rod(
        [hole.x - 0.68, 1.57, 0.53],
        [hole.x + 0.68, 1.57, 0.53],
        0.018,
        m.iron,
        parent,
      );
    }
  }
  box([width + 0.3, 0.12, 0.75], [0, 4.25, 0.19], m.cedar, parent, 0);
  if (theme === "kyoto") {
    for (let x = -width / 2; x < width / 2; x += 0.28)
      box([0.04, 1.0, 0.06], [x, 3.58, 0.19], m.cedar, parent, 0);
  }
  if (theme === "hanoi" || theme === "courtyard") {
    rod([-width / 2, 3.5, 0.8], [width / 2, 3.3, 0.8], 0.005, m.iron, parent);
    for (const x of [-1.8, 1.6]) {
      const cloth = k.mesh(
        new THREE.PlaneGeometry(0.65, 0.85, 8, 12),
        m.linen,
        [x, 2.95, 0.8],
        [0, 0, 0],
        parent,
      );
      k.animateFabric(cloth, 0.007);
    }
  }
}

function buildEntrance(k, p, shade, theme) {
  const { width, depth } = k.layout;
  const { m, sub, box } = k;
  const entrance = sub([0, 0, depth / 2], Math.PI);
  entrance.name = "Open entry and continuous pavement";
  for (const side of [-1, 1]) {
    box([0.075, 2.64, 0.32], [side * 0.82, 1.32, 0], m.cedar, entrance);
    box([0.15, 2.95, 1.6], [side * 1.13, 1.475, -0.76], shade, entrance, 0);
  }
  box([1.76, 0.08, 0.32], [0, 2.65, 0], m.cedar, entrance);
  box([2.42, 0.12, 1.65], [0, 2.99, -0.74], m.cedar, entrance, 0);
  box([2.12, 0.11, 2.5], [0, -0.055, -1.1], m.floor, entrance, 0);
  const leaf = sub([-0.77, 0, -0.07], 1.38, entrance);
  box([0.73, 2.52, 0.065], [0.365, 1.28, 0], m.cedar, leaf);
  for (const y of [0.65, 1.9])
    box([0.57, 0.98, 0.012], [0.365, y, 0.04], m.cedar, leaf);
  k.ring(0.025, 0.005, [0.64, 1.14, 0.055], m.brass, leaf, [0, 0, 0]);
  box(
    [width + 12, 0.12, 7.4],
    [0, -0.075, depth / 2 + 3.7],
    m.floor,
    k.group,
    0,
  );
  const street = sub([1.0, 0, depth / 2 + 6.4], Math.PI);
  buildFacade(k, p, street, width + 11, theme);
  for (const x of [-2.1, 2.8])
    p.foliage(
      [x, 0, depth / 2 + 2.8],
      theme === "tropical" ? 1.25 : 0.8,
      theme === "tropical",
    );
}

function buildGarden(k, p) {
  const { m, box } = k;
  const garden = k.sub([-7.5, 0, 0]);
  garden.name = "Backwater garden beyond the verandah";
  box([7.5, 0.15, 17], [-0.8, -0.2, 0], m.soil, garden, 0);
  box([1.65, 0.06, 14], [2.0, -0.025, 0], m.floor, garden, 0);
  const water = k.material(0x526e5a, 0.22, 0.15);
  box([1.8, 0.015, 17], [-0.1, -0.095, 0], water, garden, 0).name =
    "Backwater canal surface";
  for (const x of [-1.1, 0.9])
    box([0.16, 0.19, 17], [x, -0.08, 0], m.marble, garden, 0);
  for (const z of [-5.6, 5.8])
    attach(garden, p.foliage([1.35, 0, z], 1.55, true, { planted: true }));
  box([5.8, 0.3, 17], [-5.6, 0.03, 0], m.soil, garden, 0);
  for (const z of [-6.5, -2.8, 1.2, 5.2])
    attach(garden, p.foliage([-4.1, 0.12, z], 2.5, true, { planted: true }));
  for (const z of [-5.9, 4.8])
    attach(garden, p.gardenPalm([-4.9, 0.15, z], 5.4));
  for (let i = 0; i < 28; i++) {
    const z = -7.8 + i * 0.57;
    const stone = k.sphere(
      k.range(0.06, 0.12),
      [1.0 + k.range(-0.04, 0.05), -0.015, z],
      m.marble,
      garden,
      [1, 0.48, 1.35],
    );
    stone.rotation.y = k.range(0, Math.PI);
  }
}
