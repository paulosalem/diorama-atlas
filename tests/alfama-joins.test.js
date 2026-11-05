import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  alfamaBackingPieces,
  alfamaLandingExtensions,
  flightPoint,
} from "../src/client/environments/outdoors/alfama-joins.js";
import { alfamaFlights } from "../src/client/environments/outdoors/alfama-layout.js";
import {
  clipPolygon,
  polygonPrismGeometry,
  slopedPanelGeometry,
} from "../src/client/environments/shared/polygon-geometry.js";

test("Diagonal stair joins its actual oblique end to the house and terrace", () => {
  const flight = alfamaFlights.find(({ id }) => id === "middle-diagonal");
  const end = flightPoint(
    flight,
    flight.width / 2,
    Math.hypot(
      flight.end[0] - flight.start[0],
      flight.end[2] - flight.start[2],
    ),
  );
  const landing = alfamaLandingExtensions[0];
  assert.deepEqual(landing.outline[2], end);
  assert.equal(landing.height, flight.end[1]);
  assert.equal(Math.max(...landing.outline.map((p) => p[0])), 3.3);
  assert.equal(Math.min(...landing.outline.map((p) => p[1])), -5.5);
  for (const [x, z] of landing.outline)
    assert.ok(
      !(x > 1.4 && x < 3.2 && z > -5.1 && z < -3.3),
      "The new foundation must not duplicate the original landing.",
    );
});

test("Infill roof panels have outward faces and a real soffit on either slope", () => {
  const outline = [
    [0, 2, 0],
    [0, 2, 2],
    [1, 2.4, 2],
    [1, 2.4, 0],
  ];
  for (const corners of [outline, [...outline].reverse()]) {
    const geometry = slopedPanelGeometry(corners, 0.1);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    const down = new THREE.Raycaster(
      new THREE.Vector3(0.5, 3, 1),
      new THREE.Vector3(0, -1, 0),
    );
    const up = new THREE.Raycaster(
      new THREE.Vector3(0.5, 1, 1),
      new THREE.Vector3(0, 1, 0),
    );
    assert.ok(Math.abs(down.intersectObject(mesh)[0].point.y - 2.2) < 1e-6);
    assert.ok(Math.abs(up.intersectObject(mesh)[0].point.y - 2.1) < 1e-6);
    assert.ok(geometry.attributes.position.array.every(Number.isFinite));
    geometry.dispose();
    mesh.material.dispose();
  }
});

test("Stair backings follow each riser and reach the adjoining masonry", () => {
  const pieces = alfamaBackingPieces();
  assert.equal(pieces.length, 24);
  for (const piece of pieces) {
    const flight = alfamaFlights.find(({ id }) => piece.id.startsWith(id));
    const step = Number(piece.id.split("-").at(-1));
    assert.equal(
      piece.height,
      flight.start[1] +
        ((step + 1) * (flight.end[1] - flight.start[1])) / flight.count,
    );
    assert.ok(piece.outline.flat().every(Number.isFinite));
    if (flight.id === "upper-west")
      assert.equal(Math.min(...piece.outline.map((p) => p[1])), -5.5);
    if (flight.id === "back-lane-north")
      assert.equal(Math.min(...piece.outline.map((p) => p[0])), -10.9);
  }
});

test("Unequal roof parcels keep their solid deck beneath the changing tile runs", () => {
  const corners = [
    new THREE.Vector3(-5.4, 5.3, 9.4),
    new THREE.Vector3(-5.4, 5.3, 5.8),
    new THREE.Vector3(-6.2, 5.68, 6.1),
    new THREE.Vector3(-6.5, 5.68, 9.3),
  ];
  const geometry = slopedPanelGeometry(
    corners.map((p) => p.toArray()),
    0.1,
    8,
  );
  const material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  for (let u = 0.05; u < 1; u += 0.1)
    for (let v = 0.05; v < 1; v += 0.1) {
      const point = corners[0]
        .clone()
        .lerp(corners[1], u)
        .lerp(corners[3].clone().lerp(corners[2], u), v);
      const hit = new THREE.Raycaster(
        point.clone().add(new THREE.Vector3(0, 0.2, 0)),
        new THREE.Vector3(0, -1, 0),
      ).intersectObject(mesh)[0];
      assert.ok(
        hit && Math.abs(hit.distance - 0.2) < 0.002,
        "Roof support must follow the actual ruled tile surface, not one diagonal plane.",
      );
    }
  geometry.dispose();
  material.dispose();
});

test("Fitted foundation geometry is closed, grounded and clips without changing winding", () => {
  for (const { outline, height } of [
    ...alfamaLandingExtensions,
    ...alfamaBackingPieces(),
  ]) {
    const geometry = polygonPrismGeometry(outline, height + 0.15);
    geometry.computeBoundingBox();
    assert.ok(geometry.attributes.position.array.every(Number.isFinite));
    assert.ok(Math.abs(geometry.boundingBox.min.y) < 1e-6);
    assert.ok(Math.abs(geometry.boundingBox.max.y - height - 0.15) < 1e-6);
    const edges = new Map();
    const p = geometry.attributes.position;
    const key = (i) =>
      [p.getX(i), p.getY(i), p.getZ(i)]
        .map((n) => Math.round(n * 1e6))
        .join(",");
    for (let i = 0; i < p.count; i += 3)
      for (const [a, b] of [
        [i, i + 1],
        [i + 1, i + 2],
        [i + 2, i],
      ]) {
        const edge = [key(a), key(b)].sort().join("/");
        edges.set(edge, (edges.get(edge) ?? 0) + 1);
      }
    assert.ok([...edges.values()].every((count) => count === 2));
    geometry.dispose();
  }
  for (const outline of [
    [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ],
    [
      [0, 2],
      [2, 2],
      [2, 0],
      [0, 0],
    ],
  ]) {
    const clipped = clipPolygon(outline, 1, 0, 0.75);
    const area = (points) =>
      THREE.ShapeUtils.area(points.map((p) => new THREE.Vector2(...p)));
    assert.equal(Math.abs(area(clipped)), 1.5);
    assert.equal(Math.sign(area(clipped)), Math.sign(area(outline)));
  }
  assert.throws(() =>
    polygonPrismGeometry(
      [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
      0,
    ),
  );
});
