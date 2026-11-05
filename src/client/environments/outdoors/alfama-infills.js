import * as THREE from "three";
import {
  polygonPrismGeometry,
  slopedPanelGeometry,
} from "../shared/polygon-geometry.js";
import {
  alfamaInfills,
  alfamaHouses,
  alfamaLocalPoint,
} from "./alfama-layout.js";
import {
  alfamaDoor,
  alfamaWindow,
  tileGeometry,
} from "./alfama-architecture.js";

function polygonSlab(k, outline, bottom, thickness, material) {
  const geometry = polygonPrismGeometry(outline, thickness);
  return k.mesh(geometry, material, [0, bottom, 0]);
}

function roof(k, m, { outline, base, height }) {
  const corners = outline.map(
    ([x, z]) => new THREE.Vector3(x, base + height, z),
  );
  const front = corners[0].clone().lerp(corners[1], 0.5);
  const back = corners[3].clone().lerp(corners[2], 0.5);
  const rise = Math.min(0.38, corners[0].distanceTo(corners[1]) * 0.22);
  front.y += rise;
  back.y += rise;
  for (const [a, b] of [
    [corners[0], corners[3]],
    [corners[1], corners[2]],
  ]) {
    const geometry = slopedPanelGeometry(
      [a, b, back, front].map((p) => p.toArray()),
      0.1,
      8,
    );
    const panel = k.mesh(geometry, m.tile);
    panel.name = "Solid Alfama infill roof";
    const ridgeSpan = back.clone().sub(front);
    const eaveSpan = b.clone().sub(a);
    const columns = Math.ceil(a.distanceTo(b) / 0.205);
    const entries = [],
      channels = [];
    for (let column = 0; column < columns; column++) {
      for (const channel of [false, true]) {
        if (channel && column === columns - 1) continue;
        const u = (column + (channel ? 1 : 0.5)) / columns;
        const start = front.clone().lerp(back, u);
        const end = a.clone().lerp(b, u);
        const length = start.distanceTo(end);
        const down = end.clone().sub(start).normalize();
        for (let d = 0; d < length; d += 0.31) {
          const tileLength = Math.min(0.39, length - d);
          const across = ridgeSpan
            .clone()
            .lerp(eaveSpan, (d + tileLength / 2) / length);
          const normal = down.clone().cross(across).normalize();
          if (normal.y < 0) normal.negate();
          const along = normal.clone().cross(down).normalize();
          const rotation = new THREE.Euler()
            .setFromRotationMatrix(
              new THREE.Matrix4().makeBasis(along, normal, down),
            )
            .toArray()
            .slice(0, 3);
          const p = start
            .clone()
            .lerp(end, d / length)
            .addScaledVector(normal, 0.018);
          (channel ? channels : entries).push({
            position: p.toArray(),
            rotation,
            scale: [
              Math.abs(across.dot(along)) / columns / 0.21,
              1,
              tileLength / 0.39,
            ],
            color: new THREE.Color().setHSL(0.055, 0.28, k.range(0.5, 0.84)),
          });
        }
      }
    }
    k.group.add(k.instances(tileGeometry(), m.tile, entries));
    k.group.add(k.instances(tileGeometry({ channel: true }), m.tile, channels));
  }
  for (const [a, b] of [
    [corners[0], corners[1]],
    [corners[2], corners[3]],
  ]) {
    const width = a.distanceTo(b);
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(0, rise);
    shape.closePath();
    const center = a.clone().lerp(b, 0.5);
    const angle = Math.atan2(a.z - b.z, b.x - a.x);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.22,
      bevelEnabled: false,
    });
    geometry.translate(0, 0, -0.11);
    k.mesh(geometry, m.white, center.toArray(), [0, angle, 0]);
  }
  const ridge = back.clone().sub(front);
  const count = Math.ceil(ridge.length() / 0.31);
  const rotation = new THREE.Euler()
    .setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        ridge.clone().normalize(),
      ),
    )
    .toArray()
    .slice(0, 3);
  for (let i = 0; i < count; i++) {
    const geometry = tileGeometry();
    geometry.scale(
      1,
      1,
      Math.min(0.39, ridge.length() * (1 - i / count)) / 0.39,
    );
    const p = front.clone().addScaledVector(ridge, i / count);
    p.y += 0.09;
    k.mesh(geometry, m.tile, p.toArray(), rotation);
  }
}

export function buildAlfamaInfills(k, m) {
  for (const [index, spec] of alfamaInfills.entries()) {
    for (const [edge, [a, b]] of [
      ...spec.exposedEdges.map(([a, b]) => [spec.outline[a], spec.outline[b]]),
      ...(spec.closures ?? []),
    ].entries()) {
      const width = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const wall = k.sub(
        [(a[0] + b[0]) / 2, spec.base, (a[1] + b[1]) / 2],
        Math.atan2(b[1] - a[1], a[0] - b[0]),
      );
      wall.name = `${spec.id}: exposed masonry`;
      const holes = [];
      if (index === 0 && edge < 2 && width >= 2.1) {
        holes.push({ x: 0, width: 0.9, bottom: 2.97, top: 4.32 });
        alfamaWindow(k, m, wall, 0, 2.97, false, 37 + edge);
        if (edge === 0) {
          holes.push({ x: 0, width: 0.85, bottom: 0, top: 2.15 });
          alfamaDoor(k, m, wall, 0, 0.85, false);
        }
      }
      m.wall(
        wall,
        width,
        spec.height,
        0.4,
        holes,
        m[spec.color],
        37 + index + edge,
      );
    }
    for (const y of [0, 2.65, spec.height])
      polygonSlab(k, spec.outline, spec.base + y - 0.13, 0.13, m.stone);
    if (spec.base)
      polygonSlab(k, spec.outline, -0.1, spec.base - 0.03, m.stone);
    roof(k, m, spec);
  }
  return alfamaInfills.flatMap(({ contacts }) =>
    contacts.map(({ house, side, local }) => {
      const h = alfamaHouses[house];
      const normalAngle = h.angle + (side === "back" ? 0 : Math.PI / 2);
      return {
        center: alfamaLocalPoint(h.position, h.angle, local),
        normal: [Math.sin(normalAngle), 0, Math.cos(normalAngle)],
        thickness: 0.4,
        offset: 0.4,
      };
    }),
  );
}
