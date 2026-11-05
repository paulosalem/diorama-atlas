import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  alfamaDailyPlacements,
  alfamaPlanterProfiles,
  alfamaPlanterGeometry,
} from "../src/client/environments/outdoors/alfama-daily-life.js";

test("Alfama's different round planters have thick walls and actual empty interiors", () => {
  for (const [kind, profile] of Object.entries(alfamaPlanterProfiles)) {
    const geometry = alfamaPlanterGeometry(kind);
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.updateMatrixWorld(true);
    assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
    const top = Math.max(...profile.map((p) => p[1]));
    const hit = new THREE.Raycaster(
      new THREE.Vector3(0.04, top + 0.02, 0),
      new THREE.Vector3(0, -1, 0),
    ).intersectObject(mesh)[0];
    assert.ok(hit, kind);
    assert.ok(hit.distance > top - 0.04, `${kind} must have an open cavity`);
    geometry.dispose();
    material.dispose();
  }
});

test("The parked car has level lower-street access and stays clear of the miniature cut", () => {
  const {
    position: [x, y, z],
    angle,
  } = alfamaDailyPlacements.car;
  assert.equal(angle, 0);
  assert.equal(y, -0.004);
  assert.ok(z - 1.82 > 3.1);
  assert.ok(x - 0.96 > 10.81);
  assert.ok(x + 0.96 < 13.6);
  assert.ok(z + 1.82 < 6.9);
  assert.equal(alfamaDailyPlacements.bicycles.length, 2);
  assert.equal(
    new Set(alfamaDailyPlacements.planters.map(({ kind }) => kind)).size,
    4,
  );
});
