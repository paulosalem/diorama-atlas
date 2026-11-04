import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  inspectGeometry,
  probeGeometry,
} from "../src/client/rendering/scene-inspection.js";
import { createMiniatureWater } from "../src/client/environments/outdoors/miniature-water.js";
import { miniatureCamera } from "../src/client/rendering/miniature-camera.js";

test("the first eye-level miniature view preserves its authored orientation", () => {
  for (const target of [
    [-4, 6, 1],
    [7, -2, -3],
    [0, 1.65, -5],
  ]) {
    const camera = new THREE.PerspectiveCamera();
    const controller = miniatureCamera(camera, new EventTarget());
    const view = { position: [3, 2, 5], target, fov: 59 };
    controller.view(view);
    const expected = new THREE.Vector3(...target)
      .sub(camera.position)
      .normalize();
    assert(
      camera.getWorldDirection(new THREE.Vector3()).distanceTo(expected) <
        1e-10,
    );
    controller.reset();
    assert(
      camera.getWorldDirection(new THREE.Vector3()).distanceTo(expected) <
        1e-10,
    );
    controller.dispose();
  }
});

test("Three inspection includes transformed instances, excludes hidden LODs, and probes real geometry", () => {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.InstancedMesh(geometry, material, 2);
  mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(3, 0, 0));
  mesh.setMatrixAt(1, new THREE.Matrix4().makeTranslation(-3, 0, 0));
  group.add(mesh);
  const hidden = new THREE.Mesh(geometry, material);
  hidden.position.x = 100;
  hidden.visible = false;
  group.add(hidden);
  group.position.y = 4;
  const report = inspectGeometry(group);
  assert.equal(report.meshes, 1);
  assert.equal(report.instances, 2);
  assert.equal(report.triangles, 24);
  assert.deepEqual(report.bounds, { min: [-3.5, 3, -0.5], max: [3.5, 5, 0.5] });
  assert.equal(report.finiteGeometry, true);
  assert.equal(probeGeometry(group, [0, 10, 0], [0, -1, 0], 20), null);
  assert.equal(probeGeometry(group, [3, 10, 0], [0, -1, 0], 20), 5);
  mesh.instanceMatrix.array[12] = NaN;
  // Matrix validation must not silently report successful geometry.
  assert.equal(inspectGeometry(group).finiteGeometry, false);
  mesh.dispose();
  geometry.dispose();
  material.dispose();
});

test("native river reflection preserves the footprint and follows the open hull", () => {
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  scene.add(group);
  const geometry = new THREE.PlaneGeometry(10, 4).rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({ color: 0x557c70 });
  material.userData.nativeWater = true;
  const original = new THREE.Mesh(geometry, material);
  original.position.set(2, -5.3, -8);
  group.add(original);
  const boat = new THREE.Group();
  boat.name = "boat";
  boat.position.set(2, -5.26, -8);
  group.add(boat);
  const runtime = {
    group,
    waterExclusion: {
      name: "boat",
      halfLength: 2.25,
      halfWidth: 0.69,
      floor: -0.14,
      sideHeight: 0.46,
    },
  };
  const before = new THREE.Box3().setFromObject(original);
  const water = createMiniatureWater(runtime, scene, null);
  assert.equal(water.surfaces.length, 1);
  const surface = water.surfaces[0];
  const after = new THREE.Box3().setFromObject(surface);
  assert(before.min.distanceTo(after.min) < 1e-6);
  assert(before.max.distanceTo(after.max) < 1e-6);
  assert.equal(original.parent, null);
  boat.position.x += 1;
  boat.rotation.z = 0.007;
  water.update(3);
  const uniforms = surface.material.uniforms;
  assert.equal(uniforms.waterTime.value, 3);
  assert.deepEqual(
    uniforms.hullProfile.value.toArray(),
    [2.25, 0.69, -0.14, 0.46],
  );
  assert(
    new THREE.Vector3()
      .setFromMatrixPosition(boat.matrixWorld)
      .applyMatrix4(uniforms.hullInverse.value)
      .length() < 1e-6,
  );
  water.dispose();
  assert.equal(surface.parent, null);
  geometry.dispose();
  material.dispose();
});
