import * as THREE from "three";
import { createOutdoorKit, outdoorView } from "../outdoors/outdoor-kit.js";
import {
  buildCutawayTerrain,
  buildTerrainStrip,
} from "../shared/cutaway-terrain.js";
import { tropicalVegetation } from "../shared/tropical-vegetation.js";
import {
  cultivatedBank,
  riceBladeGeometry,
  ricePanicleGeometry,
  windMaterial,
  createRiceMaterial,
  fieldShelter,
  shelterRestingPlace,
} from "../outdoors/outdoor-landscapes.js";

const drop = 1.18;
const contour = (level, x) =>
  12 -
  level * 6 +
  7 * Math.sin(x * 0.05 + level * 0.16) +
  3.3 * Math.sin(x * 0.1 + level * 0.21) +
  0.001 * x * x;
const half = 18;

function sectionBoundary(first, end) {
  const boundary = [];
  for (let x = -half; x <= half; x += 0.3)
    boundary.push([x, -first * drop, contour(first, x) + 1.1]);
  boundary.push([half, -first * drop, contour(first, half) + 1.1]);
  for (let level = first; level < end; level++) {
    boundary.push([half, -level * drop, contour(level + 1, half) + 1.1]);
    boundary.push([
      half,
      -(level + 1) * drop + 0.08,
      contour(level + 1, half) + 0.25,
    ]);
  }
  for (let x = half; x >= -half; x -= 0.3)
    boundary.push([x, -end * drop + 0.08, contour(end, x) + 0.25]);
  boundary.push([-half, -end * drop + 0.08, contour(end, -half) + 0.25]);
  for (let level = end - 1; level >= first; level--) {
    boundary.push([-half, -level * drop, contour(level + 1, -half) + 1.1]);
    boundary.push([-half, -level * drop, contour(level, -half) + 1.1]);
  }
  return boundary.reverse();
}

export function buildSubakMiniature(definition, renderer, study) {
  const k = createOutdoorKit(renderer, 281947);
  const tropical = tropicalVegetation(k);
  const soil = k.ownMaterial(k.m.ground.clone());
  soil.color.set(0x968768);
  const wetSoil = k.ownMaterial(soil.clone());
  wetSoil.color.set(0x5d6545);
  const bank = k.ownMaterial(soil.clone());
  bank.color.set(0x849368);
  bank.side = THREE.DoubleSide;
  const rock = k.ownMaterial(k.m.stone.clone());
  rock.color.set(0x706957);
  const roots = k.material(0x8e7450, 0.98);
  const rice = createRiceMaterial(k, 0.04);
  const grain = windMaterial(k, 0xb5b875, 0.018);
  const blades = [[], [], []],
    panicles = [],
    grass = [];
  const sections = [];
  for (const [first, end, gap, bottom] of [
    [0, 3, 0, -6.1],
    [3, 6, -2.3, -9.4],
  ]) {
    const piece = k.sub([0, 0, gap]);
    piece.name =
      first === 0
        ? "Upper paddies and field shelter"
        : "Lower paddies and tropical edge";
    sections.push(piece);
    const strip = (material, back, front) => {
      const mesh = buildTerrainStrip(k, material, back, front, {
        left: -half,
        right: half,
        samples: 144,
      });
      piece.add(mesh);
      return mesh;
    };
    buildCutawayTerrain(k, {
      boundary: sectionBoundary(first, end),
      bottom,
      soilDepth: 0.45,
      soil,
      rock,
      relief: (x, y, z) =>
        0.035 * Math.sin(x * 7 + y * 11 + z * 6) * Math.sin(y * 17 - x),
    }).forEach((mesh) => piece.add(mesh));
    for (let level = first; level < end; level++) {
      const height = -level * drop;
      strip(
        wetSoil,
        (x) => [height, contour(level, x) - 0.38],
        (x) => [height, contour(level + 1, x) + 1.1],
      );
      strip(
        bank,
        (x) => [height, contour(level, x) + 1.1],
        (x) => [height, contour(level, x) - 0.38],
      );
      strip(
        soil,
        (x) => [height + 0.09, contour(level, x) + 0.18],
        (x) => [height + 0.09, contour(level, x) - 0.18],
      );
      const face = cultivatedBank((x) => contour(level + 1, x), height, drop, {
        start: -half,
        end: half,
        samples: 144,
      });
      k.mesh(face, bank, [0, 0, 0], [0, 0, 0], piece);
      const water = k.material(0x658273, 0.1, 0.06);
      water.userData.nativeWater = true;
      water.userData.patinaProfile = "none";
      strip(
        water,
        (x) => [height + 0.037, contour(level, x) - 0.43],
        (x) => [height + 0.037, contour(level + 1, x) + 1.14],
      );
      for (let x = -half + 0.5; x < half - 0.4; x += 0.46) {
        const near = contour(level, x) - 0.72;
        const far = contour(level + 1, x) + 1.55;
        for (let z = far; z < near; z += 0.46) {
          if (
            level === 0 &&
            x > -15.4 &&
            x < -10.6 &&
            z < contour(1, -13) + 3.3
          )
            continue;
          const center = [
            x + k.range(-0.11, 0.11),
            height + 0.043,
            z + gap + k.range(-0.1, 0.1),
          ];
          const vigor = k.range(0.63, 0.87);
          for (let blade = 0; blade < 15; blade++)
            blades[(blade + level) % 3].push({
              position: [
                center[0] + k.range(-0.045, 0.045),
                center[1],
                center[2] + k.range(-0.045, 0.045),
              ],
              rotation: [
                0,
                blade * 2.39996 + k.range(-0.4, 0.4),
                k.range(-0.08, 0.08),
              ],
              scale: [vigor, vigor, vigor],
              color: new THREE.Color().setHSL(
                k.range(0.21, 0.25),
                k.range(0.35, 0.53),
                k.range(0.28, 0.43),
              ),
            });
          if (k.random() > 0.46)
            panicles.push({
              position: [center[0], height + vigor * 0.71, center[2]],
              rotation: [0, k.range(0, Math.PI * 2), k.range(-0.22, 0.22)],
              scale: [vigor, vigor, vigor],
            });
        }
        for (const offset of [-0.55, 0.53])
          grass.push({
            position: [x, height + 0.02, contour(level, x) + offset + gap],
            rotation: [0, k.range(0, Math.PI * 2), 0],
            scale: [k.range(0.18, 0.34), k.range(0.12, 0.27), 1],
            color: 0xa6b58a,
          });
      }
    }
    for (let x = -17; x < 17; x += 0.84) {
      const z = contour(end, x) + 0.25;
      const y = -end * drop + 0.065;
      for (let i = 0; i < 3; i++)
        k.tube(
          [
            [x + i * 0.05, y, z + gap - 0.01],
            [x + k.range(-0.1, 0.1), y - 0.19, z + gap - 0.022],
            [x + k.range(-0.2, 0.2), y - k.range(0.3, 0.6), z + gap - 0.012],
          ],
          k.range(0.003, 0.007),
          roots,
        );
    }
  }
  blades.forEach((entries, habit) =>
    k.instances(riceBladeGeometry(habit), rice, entries, { shadow: false }),
  );
  k.instances(ricePanicleGeometry(), grain, panicles, { shadow: false });
  const grassMaterial = k.leafMaterial("grass");
  grassMaterial.userData.nativeWind = { anchor: [0.5, 0] };
  k.instances(
    new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0),
    grassMaterial,
    grass,
    { shadow: false },
  );
  const shelter = fieldShelter(k, [-13, 0.08, contour(1, -13) + 1.1]);
  shelterRestingPlace(k, shelter);
  for (const [x, level, gap, height] of [
    [-16, 0, 0, 6.5],
    [15, 4, -2.3, 7.2],
    [-15, 5, -2.3, 5.8],
  ]) {
    const z = contour(level, x) + 0.72 + gap;
    tropical.palm([x, -level * drop + 0.1, z], {
      height,
      radius: height * 0.38,
    });
    for (const dx of [-0.55, 0.6])
      tropical.understory([x + dx, -level * drop + 0.06, z + 0.05], {
        height: 1.15,
      });
  }
  const waterChannel = k.sub([-3.7, 0.07, contour(0, -3.7) - 2.3]);
  for (const side of [-1, 1])
    k.box([0.095, 0.12, 3.7], [side * 0.2, 0, 0], rock, waterChannel, 0.007);
  const views = {
    whole: study.whole,
    arrival: outdoorView(
      "Along a Balinese bund",
      [17, 1.83, contour(0, 17) - 0.07],
      [-11, -5, -8],
      62,
    ),
    rice: outdoorView(
      "Rice, water & wet earth",
      [1.1, 1.05, contour(0, 1.1)],
      [-0.25, 0.36, contour(0, 1.1) - 2.5],
      57,
    ),
    contours: {
      ...outdoorView(
        "Across the subak terraces",
        [29, 14, -6],
        [0, -3, -6],
        50,
      ),
      orbit: true,
    },
    shelter: outdoorView(
      "A pause in the field shelter",
      [-12.14, 2.08, contour(1, -13) + 1.35],
      [-13.58, 0.98, contour(1, -13) + 0.38],
      61,
    ),
  };
  const runtime = k.finish(definition, views, [
    [-7, -2.3, contour(2, -7)],
    [-0.3, 0.48, contour(0, -0.3) - 1.7],
    [-4.6, 0.23, contour(0, -4.6)],
    [-3.7, 0.13, contour(0, -3.7) - 2],
  ]);
  runtime.motions = [];
  runtime.miniature = {
    pieces: sections.length,
    separation: 1.45,
    terraceCount: 6,
  };
  return runtime;
}
