import * as THREE from "three";
import { buildCutawayTerrain } from "../shared/cutaway-terrain.js";
import { shapedTimber } from "../shared/natural-forms.js";

function foundationOutline({ width, depth }, portal = 0, garden = false) {
  const half = width / 2 + 0.28;
  const rear = -depth / 2;
  return [
    [-half, garden ? 8.7 : depth / 2 + 2.5],
    [half, depth / 2 + 2.5],
    [half, rear - 0.3],
    [portal + 2.12, rear - 0.3],
    [portal + 2.12, rear - 4.7],
    [portal + 1.61, rear - 4.7],
    [portal + 1.61, rear - 8.05],
    [portal + 0.05, rear - 8.05],
    [portal + 0.05, rear - 4.7],
    [portal - 2.12, rear - 4.7],
    [portal - 2.12, garden ? -8.7 : rear - 1.6],
    [garden ? -12.2 : -half - 3.9, garden ? -8.7 : rear - 1.6],
    [garden ? -12.2 : -half - 3.9, garden ? 8.7 : depth / 2 + 0.7],
    [-half, garden ? 8.7 : depth / 2 + 0.7],
  ];
}

export function miniatureSurroundings(k, p, theme, portal = 0) {
  const { width, depth } = k.layout;
  const left = -width / 2;
  const earthen = k.material(0xa99b7d, 0.98);
  earthen.map = k.m.plaster.map;
  earthen.normalMap = k.m.plaster.normalMap;
  earthen.normalScale.set(0.34, 0.34);
  const outline = foundationOutline(k.layout, portal, theme === "tropical");
  const top = new THREE.ShapeGeometry(
    new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z))),
  );
  top.rotateX(-Math.PI / 2);
  k.mesh(top, earthen, [0, -0.09, 0]);
  const cutStone = k.material(0x8f8370, 0.98);
  cutStone.map = k.m.plaster.map;
  cutStone.normalMap = k.m.plaster.normalMap;
  buildCutawayTerrain(k, {
    boundary: outline.map(([x, z]) => [x, -0.09, z]).reverse(),
    bottom: -1.3,
    soilDepth: 0.28,
    soil: earthen,
    rock: cutStone,
    relief: (x, y, z) => 0.018 * Math.sin(x * 13 + z * 9 + y * 17),
  });
  const paving = k.ownMaterial(k.m.marble.clone());
  paving.color.set(0xb3a589);
  for (let x = -width / 2 + 0.25; x < width / 2; x += 0.53)
    for (let row = 0; row < 3; row++)
      k.box(
        [0.51, k.range(0.075, 0.085), 0.46],
        [x, -0.035, depth / 2 + 0.3 + row * 0.48],
        paving,
        k.group,
        0.01,
        [0, k.range(-0.017, 0.017), 0],
      );
  p.foliage([left - 2.5, -0.07, -3.1], 1.25);
  p.foliage([left - 2.7, -0.07, 3.2], 0.85);
  p.foliage([3.4, 0, depth / 2 + 1.7], 0.82);
  p.jar([left - 0.75, -0.05, -3.3], k.group, 1.3, false);
  p.jar([left - 1.26, -0.05, -3.55], k.group, 0.95, false);
  p.stool([-2.6, -0.03, depth / 2 + 1.5]);
  if (theme !== "courtyard") {
    streetLife(k, p, theme);
    return;
  }
  const rail = k.sub([left - 1.7, 0, -2]);
  for (const x of [-0.9, 0.9])
    shapedTimber(k, [x, 0, 0], [x, 2.08, 0], 0.045, k.m.cedar, rail);
  k.tube(
    [
      [-0.95, 1.97, 0],
      [0, 1.93, 0.025],
      [0.95, 1.97, 0],
    ],
    0.006,
    k.m.linen,
    rail,
  );
  const dyed = k.textile(["#536d74", "#b98b63", "#743c38"], [1, 1]);
  for (const x of [-0.49, 0.36])
    k.animateFabric(
      k.mesh(
        new THREE.PlaneGeometry(0.62, 1.1, 12, 18),
        dyed,
        [x, 1.38, 0],
        [0, 0, 0],
        rail,
      ),
      0.008,
    );
  const lint = k.material(0xcbb99a, 0.98);
  for (let i = 0; i < 24; i++) {
    const x = left - k.range(0.4, 3.6);
    const z = k.range(-4.2, 3.7);
    k.rod(
      [x, -0.077, z],
      [x + k.range(0.02, 0.07), -0.074, z + 0.06],
      0.003,
      lint,
    );
  }
}

function barrelTileGeometry() {
  const profile = new THREE.Shape();
  profile.absarc(0, 0, 0.15, 0, Math.PI, false);
  profile.absarc(0, 0, 0.128, Math.PI, 0, true);
  profile.closePath();
  return new THREE.ExtrudeGeometry(profile, {
    depth: 0.46,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 10,
  });
}

function clayRoof(k, { width, depth, height }, dark = false) {
  const roof = k.lift(k.sub());
  roof.name = "Clay tile roof, rafters and gables";
  const half = width / 2 + 0.38;
  const rise = 1.25;
  const pitch = Math.atan2(rise, half);
  const span = Math.hypot(half, rise);
  const tile = barrelTileGeometry();
  const colors = (
    dark
      ? [0x565957, 0x666964, 0x71706a, 0x55554f]
      : [0xa77959, 0xb4805c, 0x936b52, 0xb28a6b]
  ).map((color) => {
    const mat = k.ownMaterial(k.m.plaster.clone());
    mat.color.set(color);
    mat.roughness = 0.95;
    mat.normalScale.set(0.2, 0.2);
    return mat;
  });
  for (const side of [-1, 1]) {
    const slope = k.sub([0, height + 0.2 + rise, 0], 0, roof);
    slope.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(
        new THREE.Vector3(0, 0, -side),
        new THREE.Vector3(side * Math.sin(pitch), Math.cos(pitch), 0),
        new THREE.Vector3(side * Math.cos(pitch), -Math.sin(pitch), 0),
      ),
    );
    for (
      let across = -depth / 2 - 0.22;
      across <= depth / 2 + 0.22;
      across += 0.276
    )
      for (let down = 0; down < span - 0.18; down += 0.37)
        k.mesh(
          tile,
          colors[Math.floor(k.random() * colors.length)],
          [across, k.range(-0.008, 0.008), down],
          [0, 0, 0],
          slope,
        );
    for (let z = -depth / 2; z <= depth / 2; z += 0.76)
      shapedTimber(
        k,
        [0, height + rise + 0.13, z],
        [side * half, height + 0.13, z],
        0.095,
        k.m.cedar,
        roof,
        { depth: 0.13, relief: 0.001 },
      );
  }
  const gable = new THREE.Shape();
  gable.moveTo(-width / 2, 0);
  gable.lineTo(width / 2, 0);
  gable.lineTo(0, rise);
  gable.closePath();
  const clay = k.ownMaterial(k.m.plaster.clone());
  clay.color.set(0xb6a083);
  for (const z of [-depth / 2, depth / 2 - 0.18])
    k.mesh(
      new THREE.ExtrudeGeometry(gable, { depth: 0.18, bevelEnabled: false }),
      clay,
      [0, height + 0.2, z],
      [0, 0, 0],
      roof,
    );
  for (let z = -depth / 2 - 0.27; z <= depth / 2 + 0.1; z += 0.38)
    k.mesh(tile, colors[1], [0, height + rise + 0.22, z], [0, 0, 0], roof);
}

export function completeInteriorMiniature(k, p, type, definition) {
  if (type !== "workshop") {
    completeStreetExterior(k, p, type, definition);
    return;
  }
  clayRoof(k, k.layout);
  const { width, depth, height } = k.layout;
  k.lift(k.box([3.85, 0.81, 0.16], [0, 3.445, -depth / 2 - 0.04], k.m.cedar));
  k.lift(k.box([1.4, 0.47, 0.16], [0.82, 2.925, -depth / 2 - 4.43], k.m.cedar));
  const front = k.lift(k.sub([0, 0, depth / 2 + 0.11]));
  front.name = "Oaxacan workshop entrance facade";
  for (const side of [-1, 1]) {
    shapedTimber(
      k,
      [side * 0.84, 0, 0],
      [side * 0.84, 2.65, 0],
      0.105,
      k.m.cedar,
      front,
      { depth: 0.19, relief: 0.0008 },
    );
    const leaf = k.sub([side * 0.78, 0, 0.015], 0, front);
    for (let plank = 0; plank < 6; plank++)
      shapedTimber(
        k,
        [-side * (plank * 0.127 + 0.062), 0.055, 0],
        [-side * (plank * 0.127 + 0.062), 2.52, 0],
        0.123,
        k.m.cedar,
        leaf,
        { depth: 0.055, relief: 0.0005 },
      );
    for (const y of [0.46, 1.96])
      k.box(
        [0.63, 0.045, 0.016],
        [-side * 0.39, y, 0.04],
        k.m.iron,
        leaf,
        0.003,
      );
    k.ring(
      0.034,
      0.006,
      [-side * 0.63, 1.12, 0.062],
      k.m.iron,
      leaf,
      [0, 0, 0],
    );
    for (let x = 0.98; x < width / 2; x += 0.39)
      k.box(
        [0.37, k.range(0.27, 0.31), 0.07],
        [side * x, 0.16, 0.035],
        k.m.marble,
        front,
        0.012,
      );
  }
  shapedTimber(k, [-0.94, 2.68, 0], [0.94, 2.68, 0], 0.15, k.m.cedar, front, {
    depth: 0.22,
  });
  const sign = k.framedText(
    "TELAR",
    [0, height - 0.34, depth / 2 + 0.18],
    1.26,
    0.38,
  );
  k.lift(sign);
  p.jar([2.85, -0.025, depth / 2 + 1.25], k.group, 0.75, false);
}

function streetLife(k, p, theme) {
  const { width, depth } = k.layout;
  const z = depth / 2 + 1.2;
  const work = k.sub([-width / 2 + 0.95, 0, z], 0.07);
  work.add(p.stool([0, 0, 0]));
  if (theme === "europe") {
    for (let i = 0; i < 5; i++)
      p.book([-0.22 + i * 0.085, 0.5, 0], work, 0.065, 0.27);
    k.framedText("BOOKS", [-width / 2 + 0.95, 0.91, z - 0.23], 0.7, 0.23);
  } else if (theme === "kyoto") {
    p.cup([0.05, 0.52, 0], work);
    p.jar([-0.38, 0, 0.25], work, 0.65, false);
  } else if (theme === "hanoi") {
    for (let i = 0; i < 5; i++)
      p.jar(
        [-0.23 + (i % 3) * 0.22, i < 3 ? 0.51 : 0, i < 3 ? 0 : 0.38],
        work,
        0.55,
      );
  } else if (theme === "istanbul" || theme === "lisbon") {
    p.bottle([0, 0.51, 0], work, 0.7);
    p.cup([0.18, 0.51, 0.08], work);
    const crate = k.sub([width / 2 - 1, 0, z]);
    k.box([0.85, 0.04, 0.6], [0, 0.025, 0], k.m.cedar, crate);
    for (const side of [-1, 1])
      for (const y of [0.12, 0.27])
        k.box([0.85, 0.11, 0.026], [0, y, side * 0.3], k.m.cedar, crate);
    for (const x of [-0.4, 0.4])
      k.box([0.025, 0.34, 0.6], [x, 0.17, 0], k.m.cedar, crate);
    for (let i = 0; i < 6; i++)
      p.bottle(
        [-0.26 + (i % 3) * 0.25, 0.05, i < 3 ? -0.13 : 0.13],
        crate,
        0.72,
      );
  } else if (theme !== "tropical") {
    throw new Error(`No miniature street life for ${theme}.`);
  }
}

function completeStreetExterior(k, p, type, definition) {
  const { width, depth, height } = k.layout;
  const lisbon = /lisbon|tasca/i.test(definition.id);
  const styles = {
    cafe: { sign: "珈琲", color: 0x655345, roof: "tile", dark: true },
    herbshop: { sign: "THUỐC BẮC", color: 0x789084, roof: "tile", dark: true },
    bookshop: { sign: "BOOKS", color: 0x74634f, roof: "section" },
    tavern: {
      sign: lisbon ? "TASCA" : "MEYHANE",
      color: lisbon ? 0xc9cfbe : 0xb6a28a,
      roof: "section",
    },
    kitchen: { sign: "", color: 0xb1a184, roof: "tile", dark: false },
  };
  const style = styles[type];
  if (!style) throw new Error(`No miniature exterior for ${type}.`);
  const portal =
    type === "cafe"
      ? width / 2 - 1.05
      : type === "tavern"
        ? 1.65
        : type === "kitchen"
          ? 1.35
          : 0;
  const front = k.lift(k.sub([0, 0, depth / 2 + 0.12]));
  front.name = `${definition.title} entrance and joinery`;
  const paint = k.ownMaterial(k.m.plaster.clone());
  paint.color.set(style.color);
  const trim = k.ownMaterial(k.m.cedar.clone());
  trim.color.set(
    type === "herbshop"
      ? 0x445e50
      : type === "tavern" && lisbon
        ? 0x345a6e
        : 0x66503b,
  );
  for (const side of [-1, 1]) {
    const leaf = k.sub([side * 0.4, 1.31, 0], 0, front);
    k.box([0.79, 2.6, 0.065], [0, 0, 0], trim, leaf);
    for (const y of [-0.88, 0, 0.88]) {
      k.box([0.64, 0.7, 0.035], [0, y, 0.043], trim, leaf);
      for (const x of [-0.33, 0.33])
        k.box([0.025, 0.72, 0.018], [x, y, 0.066], k.m.cedar, leaf);
    }
    k.ring(
      0.032,
      0.005,
      [-side * 0.25, -0.12, 0.073],
      k.m.brass,
      leaf,
      [0, 0, 0],
    );
    for (const x of [0.85, width / 2 - 0.11])
      k.box([0.14, height, 0.2], [side * x, height / 2, 0.015], trim, front);
    if (type === "cafe" || type === "herbshop") {
      for (let x = 1.02; x < width / 2 - 0.25; x += 0.17)
        shapedTimber(
          k,
          [side * x, 0.24, 0.05],
          [side * x, height - 0.36, 0.05],
          0.065,
          trim,
          front,
          { depth: 0.055 },
        );
    } else {
      for (let x = 1.02; x < width / 2 - 0.2; x += 0.3)
        for (let y = 0.15; y < (lisbon ? 1.35 : 0.7); y += 0.3) {
          const tile = k.box(
            [0.287, 0.287, 0.027],
            [side * x, y, 0.055],
            paint,
            front,
            0.003,
          );
          if (lisbon && Math.round((x + y) * 10) % 3 === 0)
            k.box([0.15, 0.15, 0.008], [side * x, y, 0.074], trim, front, 0, [
              0,
              0,
              Math.PI / 4,
            ]);
          tile.name = lisbon ? "Glazed facade tile" : "Masonry plinth";
        }
    }
  }
  k.box([width + 0.25, 0.16, 0.36], [0, height - 0.06, 0.04], trim, front);
  if (style.sign)
    k.lift(
      k.framedText(style.sign, [0, height - 0.34, depth / 2 + 0.25], 1.4, 0.36),
    );
  if (style.roof === "tile") clayRoof(k, k.layout, style.dark);
  else {
    const roof = k.lift(k.sub());
    roof.name = "Upper-floor architectural section";
    k.box(
      [width + 0.3, 0.21, depth + 0.25],
      [0, height + 0.19, 0],
      paint,
      roof,
    );
    for (let z = -depth / 2; z < depth / 2; z += 0.62)
      k.box([width + 0.32, 0.16, 0.13], [0, height + 0.06, z], k.m.cedar, roof);
    for (let x = -width / 2; x < width / 2; x += 0.24)
      k.box(
        [0.23, 0.04, depth + 0.24],
        [x, height + 0.31, 0],
        k.m.woodFloor,
        roof,
        0.001,
      );
  }
  const shoulderHeight = Math.max(0.1, height + 0.22 - 3.12);
  k.lift(
    k.box(
      [3.6, shoulderHeight, 0.18],
      [portal, 3.12 + shoulderHeight / 2, -depth / 2 - 0.04],
      paint,
    ),
  );
  k.lift(
    k.box([1.4, 0.47, 0.16], [portal + 0.82, 2.925, -depth / 2 - 4.43], paint),
  );
  if (type === "kitchen") {
    for (let z = -depth / 2; z <= depth / 2; z += 1.5) {
      if (Math.abs(z - 1.35) < 0.2) continue;
      shapedTimber(
        k,
        [-width / 2 - 0.5, 0, z],
        [-width / 2 - 0.5, height, z],
        0.1,
        k.m.cedar,
      );
    }
    p.jar([2.7, 0, depth / 2 + 1.25], k.group, 1.1, false);
  }
}
