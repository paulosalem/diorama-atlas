import * as THREE from "three";
import { createOutdoorKit, outdoorView } from "./outdoor-kit.js";
import {
  alfamaHouses,
  alfamaFlights,
  alfamaTerraces,
  alfamaLocalPoint,
  alfamaConnections,
} from "./alfama-layout.js";
import {
  alfamaMaterials,
  alfamaRail,
  buildAlfamaHouse,
  tilePanel,
} from "./alfama-architecture.js";
import {
  alfamaPot,
  alfamaLaundry,
  alfamaTable,
  alfamaChair,
  alfamaWashing,
  alfamaLantern,
} from "./alfama-life.js";
import { buildAlfamaStreetLife } from "./alfama-street-life.js";
import { buildAlfamaInfills } from "./alfama-infills.js";
import { alfamaPavingGeometry } from "./alfama-detail-geometry.js";
import { buildAlfamaJoins } from "./alfama-joins.js";
import { buildAlfamaDailyLife } from "./alfama-daily-life.js";

export const alfamaViews = {
  arrival: outdoorView(
    "At the foot of the escadinhas",
    [0.1, 1.65, 9.2],
    [0, 3.8, 0.1],
    65,
  ),
  stairs: outdoorView(
    "Where the stair turns",
    [-0.1, 4.02, 1.3],
    [0.85, 6.05, -6.1],
    67,
  ),
  passage: outdoorView(
    "Through the shaded passage",
    [7.65, 4.02, 2.5],
    [7.65, 3.8, -3.2],
    62,
  ),
  courtyard: outdoorView(
    "A hidden domestic corner",
    [9.25, 4.05, -4.7],
    [6.4, 3.1, -2.6],
    65,
  ),
  tiles: outdoorView(
    "Stone, glaze and a doorstep",
    [-1.4, 3.9, 2.9],
    [-3.15, 3.15, 1.03],
    48,
  ),
  roofs: outdoorView(
    "Looking back down the hill",
    [-1.4, 6.45, -6.7],
    [0.2, 3.3, 5.2],
    68,
  ),
  upperCourt: {
    ...outdoorView(
      "Inside the upper court",
      [-7.6, 6.45, -6.8],
      [-5.7, 6.8, -8.7],
      68,
    ),
    narrationView: "courtyard",
  },
  backLane: {
    ...outdoorView(
      "Around the back-lane turn",
      [-6.3, 4.05, -1.5],
      [-9.8, 5.3, -4.8],
      65,
    ),
    narrationView: "stairs",
  },
  street: {
    ...outdoorView(
      "Along the lower street",
      [12.4, 1.75, 9.5],
      [10.65, 0.9, 4.9],
      64,
    ),
    narration: false,
  },
  daily: {
    ...outdoorView(
      "A bicycle beside the stair",
      [2.2, 3.85, 1.7],
      [-0.1, 2.95, -0.05],
      64,
    ),
    narration: false,
  },
};

function pavingTools(k, m) {
  const variants = Array.from({ length: 8 }, (_, seed) => ({
    geometry: alfamaPavingGeometry(seed + 1),
    entries: [],
  }));
  const stone = k.ownMaterial(m.stone.clone());
  stone.color.set(0xd4cbb6);
  stone.normalScale.set(0.2, 0.2);
  const paving = (x, y, z, width, depth, parent = k.group) => {
    k.box([width, 0.13, depth], [x, y - 0.075, z], m.mortar, parent, 0);
    parent.updateWorldMatrix(true, false);
    const parentRotation = parent.getWorldQuaternion(new THREE.Quaternion());
    const rows = Math.ceil(depth / 0.125);
    const boundary = (row, localX) =>
      -depth / 2 +
      (row * depth) / rows +
      (row === 0 || row === rows
        ? 0
        : 0.018 * Math.sin(row * 2.17) +
          0.009 * Math.sin(localX * 2.8 + row * 0.7));
    for (let row = 0; row < rows; row++) {
      let left = -width / 2;
      while (left < width / 2 - 0.001) {
        const dx = Math.min(
            left === -width / 2 ? k.range(0.04, 0.1) : k.range(0.085, 0.15),
            width / 2 - left,
          ),
          near = boundary(row, x + left + dx / 2),
          far = boundary(row + 1, x + left + dx / 2),
          dz = far - near;
        const position = new THREE.Vector3(
          x + left + dx / 2,
          y - 0.025 + k.range(-0.003, 0.003),
          z + (near + far) / 2,
        ).applyMatrix4(parent.matrixWorld);
        const dark =
          Math.sin(position.x * 0.45 + position.z * 0.8) > 0.88 &&
          k.random() < 0.13;
        const rotation = new THREE.Euler().setFromQuaternion(
          new THREE.Quaternion()
            .setFromAxisAngle(new THREE.Vector3(0, 1, 0), k.range(-0.04, 0.04))
            .premultiply(parentRotation),
        );
        variants[Math.floor(k.random() * variants.length)].entries.push({
          position: position.toArray(),
          rotation: rotation.toArray().slice(0, 3),
          scale: [Math.max(0.003, dx - 0.004), 0.045, dz - 0.005],
          color: new THREE.Color().setHSL(
            0.1,
            dark ? 0.04 : 0.08,
            dark ? 0.4 : k.range(0.77, 0.98),
          ),
        });
        left += dx;
      }
    }
  };
  const stairs = ({ id, start, end, width, count }) => {
    const bottom = start[1],
      top = end[1];
    const angle = Math.atan2(start[0] - end[0], start[2] - end[2]);
    const length = Math.hypot(end[0] - start[0], end[2] - start[2]);
    const tread = length / count;
    const riser = (top - bottom) / count;
    const parent = k.sub([start[0], 0, start[2]], angle);
    parent.name = `Alfama stair: ${id}`;
    for (let i = 0; i < count; i++) {
      const y = bottom + (i + 1) * riser;
      const zz = -(i + 0.5) * tread;
      k.box(
        [width, y + 0.2, tread],
        [0, (y - 0.2) / 2, zz],
        m.mortar,
        parent,
        0,
      );
      paving(0, y, zz - 0.035, width, tread - 0.07, parent);
      const pieces = Math.ceil(width / 0.65);
      for (let j = 0; j < pieces; j++) {
        const step = k.box(
          [width / pieces - 0.005, 0.12, 0.18],
          [
            -width / 2 + ((j + 0.5) * width) / pieces,
            y - 0.05,
            zz + tread / 2 - 0.07,
          ],
          m.stone,
          parent,
          0.015,
        );
        const p = step.geometry.attributes.position;
        for (let v = 0; v < p.count; v++)
          if (p.getY(v) > 0)
            p.setY(
              v,
              p.getY(v) -
                0.009 *
                  Math.exp(-((p.getX(v) / 0.21) ** 2)) *
                  (0.5 + 0.5 * Math.sin(i * 2.1 + j)),
            );
        step.geometry.computeVertexNormals();
      }
    }
    for (const side of [-1, 1]) {
      const x = side * (width / 2 - 0.055);
      const a = [x, bottom + riser, -tread / 2];
      const b = [x, top, -length + tread / 2];
      k.rod(
        [x, a[1] + 0.88, a[2]],
        [x, b[1] + 0.88, b[2]],
        0.025,
        m.iron,
        parent,
      );
      for (let n = 0; n < 4; n++) {
        const step = Math.round((n * (count - 1)) / 3);
        const y = bottom + (step + 1) * riser;
        const z = -(step + 0.5) * tread;
        k.rod([x, y, z], [x, y + 0.88, z], 0.021, m.iron, parent);
      }
    }
    return { id, start, end, angle, bottom, top, width, count, tread, riser };
  };
  const finishPaving = () => {
    for (const { geometry, entries } of variants) {
      const stones = k.instances(geometry, stone, entries);
      stones.name = "Varied limestone calcada";
    }
  };
  return { paving, stairs, finishPaving };
}

function passageArch(k, m, x, y, z, width, parent = k.group) {
  const radius = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-radius - 0.18, 0);
  shape.lineTo(-radius - 0.18, radius + 0.28);
  shape.lineTo(radius + 0.18, radius + 0.28);
  shape.lineTo(radius + 0.18, 0);
  shape.lineTo(radius, 0);
  shape.absarc(0, 0, radius, 0, Math.PI, false);
  shape.closePath();
  k.mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.4,
      bevelEnabled: false,
      curveSegments: 22,
    }),
    m.white,
    [x, y, z],
    [0, 0, 0],
    parent,
  );
}

export function buildAlfamaHillside(definition, renderer) {
  const k = createOutdoorKit(renderer, 91731, {
    sunPosition: [-14, 23, 12],
    sunColor: 0xffc58a,
    sunIntensity: 3.8,
    ambientIntensity: 0.6,
    exposure: 0.88,
    fogDensity: 0.0015,
  });
  const m = alfamaMaterials(k);
  const { paving, stairs, finishPaving } = pavingTools(k, m);
  k.box([24.8, 0.45, 24.2], [1.2, -0.3, -1.5], m.stone, k.group, 0);
  for (const { height, outline } of alfamaTerraces) {
    const shape = new THREE.Shape(
      outline.map(([x, z]) => new THREE.Vector2(x, -z)),
    );
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height + 0.12,
      bevelEnabled: false,
    });
    geometry.rotateX(-Math.PI / 2);
    k.mesh(geometry, m.stone, [0, -0.16, 0]);
  }
  const landing = (x, y, z, width, depth) => {
    k.box([width, y + 0.12, depth], [x, (y - 0.2) / 2, z], m.stone, k.group, 0);
    paving(x, y, z, width, depth);
  };
  paving(1.2, 0, 8.6, 24.8, 3.8);
  paving(-7.3, 0, 4.1, 7.8, 5.2);
  paving(10.3, 0, 4.1, 6.6, 5.2);
  landing(0, 1.2, 4, 1.6, 1.6);
  paving(-4.55, 2.4, 3.85, 2.3, 2.1);
  paving(-2.35, 2.4, 2.95, 2.1, 0.3);
  paving(1.2, 2.4, 1, 24.8, 3.6);
  paving(8.3, 2.4, -3.85, 4.6, 3.3);
  paving(10.2, 2.4, -5.9, 1.8, 0.8);
  paving(-7.5, 2.4, -2.95, 7.4, 4.3);
  landing(2.3, 3.6, -4.2, 1.8, 1.8);
  landing(-9.8, 3.6, -1.1, 1.6, 1.6);
  landing(-9.8, 4.8, -5.1, 1.6, 0.8);
  landing(-8.6, 4.8, -5.1, 0.8, 0.8);
  paving(-2.2, 4.8, -4.4, 1.8, 2.2);
  paving(-0.2, 4.8, -6.6, 18.6, 2.2);
  paving(-6.3, 4.8, -9.2, 4.8, 3);
  paving(1.2, 4.8, -12.5, 24.8, 2.2);
  paving(2.6, 4.8, -9.3, 4, 4.2);
  const flights = alfamaFlights.map(stairs);
  finishPaving();
  m.wall(
    k.sub([-11.03, 2.4, -3.55], Math.PI / 2),
    4.3,
    3.2,
    0.26,
    [],
    m.white,
    7,
  );
  k.box([0.32, 0.13, 4.3], [-11.03, 5.64, -3.55], m.stone);
  for (const [a, b] of [
    [
      [0.8, 1.2, 4.8],
      [0.8, 1.2, 3.2],
    ],
    [
      [0.8, 1.2, 3.2],
      [-0.8, 1.2, 3.2],
    ],
    [
      [-5.7, 2.4, 3],
      [-5.7, 2.4, 4.9],
    ],
    [
      [-5.7, 2.4, 4.9],
      [-3.4, 2.4, 4.9],
    ],
    [
      [-1.3, 2.4, 3.1],
      [-3.4, 2.4, 3.1],
    ],
    [
      [3.2, 3.6, -3.3],
      [3.2, 3.6, -5.1],
    ],
    [
      [3.2, 3.6, -5.1],
      [1.4, 3.6, -5.1],
    ],
    [
      [-10.6, 3.6, -0.3],
      [-10.6, 3.6, -1.9],
    ],
    [
      [-10.6, 3.6, -0.3],
      [-9, 3.6, -0.3],
    ],
  ])
    alfamaRail(k, m, a, b);
  const houses = alfamaHouses.map((spec, index) => {
    const house = buildAlfamaHouse(k, m, {
      ...spec,
      color: m[spec.color],
      seed: index + 1,
    });
    if (spec.position[1] > 0)
      k.box(
        [spec.width + 0.4, spec.position[1] + 0.1, spec.depth + 0.4],
        [0, -(spec.position[1] + 0.1) / 2 - 0.06, -spec.depth / 2],
        m.stone,
        house.group,
        0,
      );
    return { ...spec, ...house };
  });
  const infillWalls = buildAlfamaInfills(k, m);
  alfamaTable(k, m, [-0.75, 0, -1.6], houses[2].group);
  alfamaLantern(k, m, [0.9, 2.43, 0.23], houses[2].group);
  alfamaLantern(k, m, [-0.9, 2.65, 0.23], houses[7].group);
  passageArch(k, m, 0, 1.67, -0.18, 1.55, houses[7].group);
  passageArch(k, m, 0, 1.67, -3.6, 1.55, houses[7].group);
  for (const x of [-0.87, 0.87])
    k.box([0.12, 0.15, 3], [x, 2.44, -1.7], m.timber, houses[7].group);
  k.box([3.45, 0.8, 0.3], [7.575, 2.8, -5.65], m.white);
  for (let course = 0; course < 5; course++) {
    const count = course % 2 ? 8 : 9;
    for (let stone = 0; stone < count; stone++)
      k.box(
        [3.45 / count - 0.012, 0.3, 0.09],
        [5.85 + ((stone + 0.5) * 3.45) / count, 3.35 + course * 0.31, -5.455],
        m.stone,
        k.group,
        0.012,
      );
  }
  k.box([3.45, 0.13, 0.38], [7.575, 4.79, -5.56], m.stone);
  alfamaRail(k, m, [5.85, 4.85, -5.56], [9.3, 4.85, -5.56]);
  const potSizes = [1.05, 0.88, 1, 0.92, 1.08, 0.95, 0.8, 1.1];
  for (const [index, position] of [
    [6.6, 2.4, -2.8],
    [6.5, 2.4, -5.1],
    [10.3, 2.4, -3],
    [-4.7, 2.4, 1.52],
    [-2.4, 2.4, 1.52],
    [-6.4, 4.8, -8.1],
    [-7.65, 4.8, -7.3],
    [3.8, 4.8, -5.9],
  ].entries())
    alfamaPot(k, m, position, potSizes[index]);
  alfamaChair(k, m, [9.6, 2.4, -3.2], -0.75);
  alfamaChair(k, m, [7.1, 2.4, -4.8], 0.22);
  const upperChair = alfamaChair(k, m, [-5.1, 4.8, -7.8], 2.4);
  alfamaLaundry(k, m, [-8.35, 8.3, -7.5], [-4.1, 8.5, -8]);
  k.rod([-8.35, 4.8, -7.5], [-8.35, 8.35, -7.5], 0.03, m.iron);
  k.rod([-4.1, 4.8, -8], [-4.1, 8.55, -8], 0.03, m.iron);
  alfamaWashing(k, m, [6.7, 2.4, -3.35]);
  alfamaLaundry(k, m, [6.45, 5.85, -2.65], [10.4, 5.95, -2.65]);
  for (const x of [6.45, 10.4])
    k.rod([x, 2.4, -2.65], [x, 6, -2.65], 0.034, m.iron);
  const lineEnd = alfamaLocalPoint(
    houses[1].position,
    houses[1].angle,
    [-2.15, 6.7, -0.3],
  );
  alfamaLaundry(k, m, [-1.4, 6.9, 7], lineEnd);
  k.rod([-1.8, 6.9, 7], [-1.4, 6.9, 7], 0.023, m.iron);
  k.rod([-2.15, 5.1, -0.3], [-2.15, 6.7, -0.3], 0.028, m.iron, houses[1].group);
  k.rod([-1.8, 5.1, -0.3], [-2.15, 6.1, -0.3], 0.018, m.iron, houses[1].group);
  tilePanel(k, m, k.group, 7.575, 3.1, 2.48, 0.6, -5.48);
  const drain = k.sub([7.65, 2.415, -3.7]);
  k.box([0.48, 0.025, 0.38], [0, -0.018, 0], m.iron, drain);
  for (let i = 0; i < 8; i++)
    k.box(
      [0.022, 0.015, 0.34],
      [-0.21 + i * 0.06, 0.005, 0],
      m.stone,
      drain,
      0.002,
    );
  for (const x of [-10.7, 10.7])
    k.box([0.22, 0.8, 3.4], [x, 0.4, 8.6], m.white);
  const streetLife = buildAlfamaStreetLife(k, m, houses, upperChair);
  const fittedJoins = buildAlfamaJoins(k, m);
  const dailyLife = buildAlfamaDailyLife(k, m);
  k.group.updateMatrixWorld(true);
  const sharedWalls = [...infillWalls];
  k.group.traverse((object) => {
    if (!object.userData.partyWall) return;
    const center = object.getWorldPosition(new THREE.Vector3());
    center.y = center.y - object.geometry.parameters.height / 2 + 1.3;
    sharedWalls.push({
      center: center.toArray(),
      normal: new THREE.Vector3(1, 0, 0)
        .transformDirection(object.matrixWorld)
        .toArray(),
      thickness: object.geometry.parameters.width,
    });
  });
  // World-space sampling needs no random box-UV offset during construction.
  m.tile.userData.metresPerRepeat = 0.48;
  const runtime = k.finish(
    definition,
    structuredClone(alfamaViews),
    {
      stairs: [0.4, 4.6, -4.2],
      thresholds: [-3.5, 3.45, 1.05],
      domestic: [7.6, 3.3, -3.1],
      roofs: [-1.9, 10.7, -9.3],
    },
    {
      depthProbes: [
        ...streetLife.probes,
        ...dailyLife.probes,
        {
          id: "alfama-through-passage",
          kind: "doorway",
          origin: [7.65, 3.5, 1.7],
          direction: [0, 0, -1],
          minDistance: 6.2,
        },
        {
          id: "alfama-domestic-door",
          kind: "doorway",
          origin: [-3.5, 3.55, 1.5],
          direction: [0, 0, -1],
          minDistance: 2.5,
        },
      ],
    },
  );
  runtime.alfama = {
    fittedJoins,
    activity: [...streetLife.activity, ...dailyLife.activity],
    groundContacts: dailyLife.groundContacts,
    sharedWalls,
    stairs: flights,
    levels: [0, 1.2, 2.4, 3.6, 4.8],
    houses: alfamaHouses,
    connections: alfamaConnections,
    passage: {
      width: 1.55,
      springHeight: 1.67,
      crownHeight: 2.445,
      depth: 3.4,
    },
  };
  return runtime;
}
