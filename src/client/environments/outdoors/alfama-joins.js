import * as THREE from "three";
import {
  clipPolygon,
  polygonPrismGeometry,
} from "../shared/polygon-geometry.js";
import { alfamaFlights, alfamaLocalPoint } from "./alfama-layout.js";

export function flightPoint(flight, across, along) {
  const angle = Math.atan2(
    flight.start[0] - flight.end[0],
    flight.start[2] - flight.end[2],
  );
  const [x, , z] = alfamaLocalPoint(flight.start, angle, [across, 0, -along]);
  return [x, z];
}

const diagonal = alfamaFlights.find(({ id }) => id === "middle-diagonal");
const corner = flightPoint(
  diagonal,
  diagonal.width / 2,
  Math.hypot(
    diagonal.end[0] - diagonal.start[0],
    diagonal.end[2] - diagonal.start[2],
  ),
);

export const alfamaLandingExtensions = [
  {
    id: "diagonal-house-junction",
    height: 3.6,
    outline: [
      [3.2, -3.3],
      [2.3, -3.3],
      corner,
      [3.3, corner[1]],
      [3.3, -5.5],
      [1.4, -5.5],
      [1.4, -5.1],
      [3.2, -5.1],
    ],
  },
  {
    id: "lower-landing-return",
    height: 1.2,
    outline: [
      [-0.8, 2.8],
      [0.9, 2.8],
      [0.9, 4.8],
      [0.8, 4.8],
      [0.8, 3.2],
      [-0.8, 3.2],
    ],
  },
  {
    id: "back-landing-wall",
    height: 3.6,
    outline: [
      [-10.9, -1.9],
      [-10.6, -1.9],
      [-10.6, -1.4],
      [-10.9, -1.4],
    ],
  },
  {
    id: "back-upper-wall",
    height: 4.8,
    outline: [
      [-10.9, -5.5],
      [-10.6, -5.5],
      [-10.6, -4.7],
      [-10.9, -4.7],
    ],
  },
];

export const alfamaStairBackings = [
  { flight: "upper-west", side: 1, outer: 1.3, from: 0, to: 2.7 },
  { flight: "lower-west", side: 1, outer: 1.2, from: 0, to: 0.5 },
  { flight: "lower-west", side: 1, outer: 0.9, from: 0.5, to: 2.6 },
  { flight: "back-lane-north", side: -1, outer: 1.1, from: 0, to: 2.8 },
];

export function alfamaBackingPieces() {
  return alfamaStairBackings.flatMap(
    ({ flight: id, side, outer, from, to }) => {
      const flight = alfamaFlights.find(({ id: key }) => key === id);
      const length = Math.hypot(
        flight.end[0] - flight.start[0],
        flight.end[2] - flight.start[2],
      );
      return Array.from({ length: flight.count }, (_, step) => {
        const start = Math.max(from, (step * length) / flight.count);
        const end = Math.min(to, ((step + 1) * length) / flight.count);
        if (end - start < 1e-8) return null;
        return {
          id: `${id}-backing-${step}`,
          height:
            flight.start[1] +
            ((step + 1) * (flight.end[1] - flight.start[1])) / flight.count,
          outline: [
            flightPoint(flight, (side * flight.width) / 2, start),
            flightPoint(flight, side * outer, start),
            flightPoint(flight, side * outer, end),
            flightPoint(flight, (side * flight.width) / 2, end),
          ],
        };
      }).filter(Boolean);
    },
  );
}

function fittedPaving(k, stone, outline, height) {
  const minX = Math.min(...outline.map((p) => p[0])),
    maxX = Math.max(...outline.map((p) => p[0])),
    minZ = Math.min(...outline.map((p) => p[1])),
    maxZ = Math.max(...outline.map((p) => p[1]));
  for (let row = 0, z = minZ; z < maxZ; row++) {
    const dz = 0.115 + 0.03 * (0.5 + 0.5 * Math.sin(row * 2.17 + minZ));
    for (let column = 0, x = minX - (row % 2) * 0.065; x < maxX; column++) {
      const phase = row * 19.7 + column * 31.3 + minX * 7.1 + minZ;
      const dx = 0.1 + 0.05 * (0.5 + 0.5 * Math.sin(phase));
      const cut = 0.004 + 0.01 * (0.5 + 0.5 * Math.sin(phase * 2.9));
      let polygon = outline;
      for (const [a, b, limit] of [
        [-1, 0, -x - 0.002],
        [1, 0, x + dx - 0.002],
        [0, -1, -z - 0.002],
        [0, 1, z + dz - 0.002],
        [-1, -1, -x - z - cut],
        [1, 1, x + dx + z + dz - cut],
      ])
        polygon = clipPolygon(polygon, a, b, limit);
      x += dx;
      if (
        polygon.length < 3 ||
        Math.abs(
          THREE.ShapeUtils.area(polygon.map((p) => new THREE.Vector2(...p))),
        ) < 0.00005
      )
        continue;
      const geometry = polygonPrismGeometry(polygon, 0.035, 0.0015);
      const positions = geometry.attributes.position;
      const color = new THREE.Color().setHSL(
        0.1,
        0.08,
        0.74 + 0.12 * (0.5 + 0.5 * Math.sin(phase * 1.7)),
      );
      const colors = new Float32Array(positions.count * 3);
      for (let i = 0; i < positions.count; i++) {
        color.toArray(colors, i * 3);
        if (positions.getY(i) > 0.02)
          positions.setY(
            i,
            positions.getY(i) +
              0.0015 *
                Math.sin(positions.getX(i) * 71 + positions.getZ(i) * 53),
          );
      }
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometry.computeVertexNormals();
      k.mesh(geometry, stone, [0, height - 0.036, 0]);
    }
    z += dz;
  }
}

export function buildAlfamaJoins(k, m) {
  const stone = k.ownMaterial(m.stone.clone());
  stone.color.set(0xd4cbb6);
  stone.normalScale.set(0.2, 0.2);
  stone.vertexColors = true;
  const pieces = [...alfamaLandingExtensions, ...alfamaBackingPieces()];
  for (const { id, outline, height } of pieces) {
    const foundation = k.mesh(
      polygonPrismGeometry(outline, height + 0.15),
      m.mortar,
      [0, -0.16, 0],
    );
    foundation.name = `Fitted masonry: ${id}`;
    fittedPaving(k, stone, outline, height);
  }
  return pieces;
}
