import * as THREE from "three";
import { outdoorView } from "./outdoor-kit.js";

export const railwayGauge = 1.668;

export function buildRiversideRailway(
  k,
  { center, height, bottom, left, right, trainX = 0 },
) {
  const tangent = (x) =>
    -Math.atan((center(x + 0.05) - center(x - 0.05)) / 0.1);
  const concrete = k.ownMaterial(k.m.stone.clone());
  concrete.color.set(0xa6a08b);
  const ballast = k.ownMaterial(k.m.stone.clone());
  ballast.color.set(0x9c9482);
  const timber = k.ownMaterial(k.m.cedar.clone());
  timber.color.set(0x776a51);
  const rust = k.material(0x715b46, 0.82, 0.4);
  const steel = k.material(0xa6a59a, 0.35, 0.82);
  const rubber = k.material(0x333735, 0.94);
  const supports = [],
    deck = [],
    bed = [],
    ties = [],
    rails = [],
    heads = [],
    clips = [],
    stones = [];
  for (let x = left + 0.3; x < right; x += 0.6) {
    const yaw = tangent(x),
      z = center(x);
    deck.push({
      position: [x, height - 0.2, z],
      scale: [Math.min(0.61, right - x + 0.3), 0.3, 3.65],
      rotation: [0, yaw, 0],
    });
    bed.push({
      position: [x, height - 0.015, z],
      scale: [0.61, 0.09, 3.05],
      rotation: [0, yaw, 0],
    });
    ties.push({
      position: [x, height + 0.08, z],
      scale: [0.22, 0.12, 2.65],
      rotation: [0, yaw, 0],
    });
    for (const side of [-1, 1]) {
      const offset = (side * railwayGauge) / 2;
      const rx = x + Math.sin(yaw) * offset,
        rz = z + Math.cos(yaw) * offset;
      rails.push({
        position: [rx, height + 0.205, rz],
        scale: [0.61, 0.13, 0.045],
        rotation: [0, yaw, 0],
      });
      heads.push({
        position: [rx, height + 0.295, rz],
        scale: [0.61, 0.03, 0.072],
        rotation: [0, yaw, 0],
      });
      for (const edge of [-0.08, 0.08])
        clips.push({
          position: [
            rx + Math.sin(yaw) * edge,
            height + 0.15,
            rz + Math.cos(yaw) * edge,
          ],
          scale: [0.1, 0.025, 0.05],
          rotation: [0, yaw, 0],
        });
    }
    for (let n = 0; n < 14; n++) {
      const px = x + k.range(-0.25, 0.25),
        offset = k.range(-1.48, 1.48);
      stones.push({
        position: [px, height + 0.05, center(px) + offset],
        scale: [
          k.range(0.025, 0.055),
          k.range(0.015, 0.035),
          k.range(0.025, 0.055),
        ],
        rotation: [0, k.random() * Math.PI, 0],
        color: n % 3 ? 0xb7af97 : 0x7d7e72,
      });
    }
  }
  for (let x = left + 0.8; x < right - 0.4; x += 3.2) {
    const pierHeight = height - 0.35 - bottom;
    k.box(
      [0.75, pierHeight, 3.25],
      [x, bottom + pierHeight / 2, center(x)],
      concrete,
      k.group,
      0.035,
      [0, tangent(x), 0],
    );
    k.box(
      [1.05, 0.25, 3.5],
      [x, bottom + 0.125, center(x)],
      concrete,
      k.group,
      0.025,
      [0, tangent(x), 0],
    );
    supports.push([x, height - 0.35, center(x)]);
  }
  for (const [entries, material] of [
    [deck, concrete],
    [bed, ballast],
    [ties, timber],
    [rails, rust],
    [heads, steel],
    [clips, steel],
  ])
    k.instances(new THREE.BoxGeometry(1, 1, 1), material, entries);
  k.instances(
    new THREE.IcosahedronGeometry(1, 0),
    k.material(0xffffff, 1),
    stones,
  );

  const car = k.sub([trainX, height, center(trainX)], tangent(trainX));
  const red = k.material(0x9b493b, 0.55, 0.28);
  const cream = k.material(0xd9cfaf, 0.75, 0.12);
  const roof = k.material(0x8e968f, 0.64, 0.45);
  const seat = k.material(0x6a7968, 0.96);
  const glass = k.material(0xb4c4bd, 0.16, 0.08);
  glass.transparent = true;
  glass.opacity = 0.28;
  glass.depthWrite = false;
  glass.side = THREE.DoubleSide;
  glass.userData.patinaProfile = "none";
  k.box([13.15, 0.16, 2.5], [0, 1.05, 0], rubber, car, 0.04);
  k.box([11.8, 0.3, 1.4], [0, 0.79, 0], rubber, car, 0.04);
  for (const side of [-1, 1]) {
    k.box([13.15, 0.86, 0.055], [0, 1.57, side * 1.29], red, car, 0.015);
    k.box([13.15, 0.14, 0.06], [0, 2.02, side * 1.29], cream, car, 0.01);
    k.box([13.15, 0.14, 0.06], [0, 3.05, side * 1.29], cream, car, 0.01);
    for (let window = 0; window < 8; window++) {
      const x = -4.55 + window * 1.3;
      k.box([1.19, 0.85, 0.014], [x, 2.55, side * 1.293], glass, car, 0.015);
      k.box(
        [0.085, 0.9, 0.07],
        [x - 0.65, 2.55, side * 1.29],
        cream,
        car,
        0.008,
      );
      k.box([1.16, 0.025, 0.026], [x, 2.87, side * 1.309], steel, car, 0.003);
    }
    for (const end of [-1, 1]) {
      k.box(
        [0.6, 0.9, 0.04],
        [end * 5.85, 2.55, side * 1.29],
        glass,
        car,
        0.008,
      );
      for (const x of [end * 5.36, end * 6.42])
        k.box([0.14, 1.1, 0.07], [x, 2.55, side * 1.29], cream, car, 0.008);
      k.box(
        [0.025, 0.3, 0.04],
        [end * 5.55, 1.84, side * 1.35],
        steel,
        car,
        0.004,
      );
      for (const step of [0, 1])
        k.box(
          [0.85, 0.045, 0.19],
          [end * 5.83, 0.66 + step * 0.2, side * (1.51 - step * 0.09)],
          steel,
          car,
          0.01,
        );
    }
    for (let row = 0; row < 7; row++) {
      const x = -3.9 + row * 1.3;
      k.box([0.5, 0.14, 0.84], [x, 1.47, side * 0.73], seat, car, 0.04);
      k.box([0.1, 0.65, 0.84], [x - 0.22, 1.78, side * 0.73], seat, car, 0.035);
      k.rod([x, 1.13, side * 0.73], [x, 1.4, side * 0.73], 0.03, steel, car);
    }
  }
  const profile = new THREE.Shape();
  profile.moveTo(-1.33, 3.14);
  for (let i = 0; i <= 20; i++) {
    const a = (i * Math.PI) / 20;
    profile.lineTo(-1.33 * Math.cos(a), 3.14 + 0.28 * Math.sin(a));
  }
  for (let i = 20; i >= 0; i--) {
    const a = (i * Math.PI) / 20;
    profile.lineTo(-1.33 * Math.cos(a), 3.09 + 0.28 * Math.sin(a));
  }
  profile.closePath();
  const roofGeometry = new THREE.ExtrudeGeometry(profile, {
    depth: 13.35,
    bevelEnabled: false,
    steps: 1,
  });
  roofGeometry.rotateY(Math.PI / 2);
  roofGeometry.translate(-6.675, 0, 0);
  k.mesh(roofGeometry, roof, [0, 0, 0], [0, 0, 0], car);
  for (const x of [-3.6, 0, 3.6]) {
    k.box([0.6, 0.1, 0.65], [x, 3.45, 0], roof, car, 0.04);
    for (let slat = 0; slat < 6; slat++)
      k.box(
        [0.5, 0.012, 0.035],
        [x, 3.51, -0.25 + slat * 0.1],
        rubber,
        car,
        0.003,
      );
  }
  const lamp = k.ownMaterial(
    new THREE.MeshStandardMaterial({
      color: 0xe9ddb2,
      emissive: 0x8b6c35,
      emissiveIntensity: 0.18,
      roughness: 0.25,
    }),
  );
  for (const end of [-1, 1]) {
    k.box([0.07, 0.88, 2.58], [end * 6.54, 1.58, 0], red, car, 0.025);
    k.box([0.06, 0.15, 2.58], [end * 6.54, 3.04, 0], cream, car, 0.01);
    for (const side of [-1, 1]) {
      k.box(
        [0.018, 0.87, 1.1],
        [end * 6.56, 2.54, side * 0.62],
        glass,
        car,
        0.015,
      );
      k.box(
        [0.09, 0.97, 0.12],
        [end * 6.54, 2.54, side * 1.23],
        cream,
        car,
        0.01,
      );
      k.rod(
        [end * 6.62, 2.16, side * 0.7],
        [end * 6.62, 2.65, side * 0.45],
        0.009,
        rubber,
        car,
      );
      k.mesh(
        new THREE.CylinderGeometry(0.105, 0.105, 0.045, 20),
        lamp,
        [end * 6.61, 1.65, side * 0.95],
        [0, 0, Math.PI / 2],
        car,
      );
      k.box(
        [0.1, 0.25, 0.28],
        [end * 6.74, 0.93, side * 0.86],
        rubber,
        car,
        0.045,
      );
    }
    k.box([0.1, 0.97, 0.1], [end * 6.54, 2.54, 0], cream, car, 0.008);
    k.box([0.22, 0.11, 0.16], [end * 6.89, 0.87, 0], steel, car, 0.02);
    k.box([0.22, 0.24, 2.3], [end * 5.9, 2.03, 0], rubber, car, 0.03);
  }
  for (const offset of [-4.3, 4.3]) {
    const x = trainX + offset;
    const bogie = k.sub([x, height, center(x)], tangent(x));
    k.box([1.65, 0.24, 1.8], [0, 0.72, 0], rubber, bogie, 0.035);
    for (const axle of [-0.58, 0.58]) {
      k.rod([axle, 0.63, -1.02], [axle, 0.63, 1.02], 0.06, steel, bogie);
      for (const side of [-1, 1]) {
        k.mesh(
          new THREE.CylinderGeometry(0.32, 0.32, 0.12, 28),
          steel,
          [axle, 0.63, (side * railwayGauge) / 2],
          [Math.PI / 2, 0, 0],
          bogie,
        );
        k.mesh(
          new THREE.TorusGeometry(0.26, 0.028, 6, 28),
          rubber,
          [axle, 0.63, side * 0.91],
          [0, 0, 0],
          bogie,
        );
      }
    }
  }
  const signalX = right - 2;
  k.rod(
    [signalX, height + 0.02, center(signalX) + 1.52],
    [signalX, height + 2.2, center(signalX) + 1.52],
    0.035,
    steel,
  );
  k.box(
    [0.08, 0.43, 0.23],
    [signalX, height + 2.17, center(signalX) + 1.52],
    rubber,
    k.group,
    0.025,
  );
  k.mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.09, 16),
    k.material(0x9a4935, 0.45),
    [signalX, height + 2.22, center(signalX) + 1.52],
    [0, 0, Math.PI / 2],
  );
  return {
    gauge: railwayGauge,
    supports,
    railTop: height + 0.31,
    train: [trainX, height, center(trainX)],
    span: [left, right],
    view: outdoorView(
      "Along the riverside railway",
      [trainX + 10, height + 5.2, center(trainX) + 13],
      [trainX, height + 1.6, center(trainX)],
      58,
    ),
  };
}
