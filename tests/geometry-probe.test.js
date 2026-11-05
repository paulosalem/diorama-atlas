import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createGeometryProbe } from "../src/client/rendering/geometry-probe.js";

test("indexed probes match original triangles, transformed instances and material groups", () => {
  const root = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const geometry = new THREE.BoxGeometry(1.7, 0.4, 2.2, 8, 3, 10);
  const group = new THREE.Group();
  group.position.set(1.3, 0.2, -2.6);
  group.rotation.y = 0.43;
  root.add(group);
  const ordinary = new THREE.Mesh(geometry, Array(6).fill(material));
  group.add(ordinary);
  const instances = new THREE.InstancedMesh(geometry, material, 3);
  for (let i = 0; i < 3; i++)
    instances.setMatrixAt(
      i,
      new THREE.Matrix4().compose(
        new THREE.Vector3(i * 2.3 - 3.2, 0.7, 1.4),
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          i * 0.3,
        ),
        new THREE.Vector3(1, 1 + i * 0.2, 1),
      ),
    );
  group.add(instances);
  const hidden = new THREE.Mesh(geometry, material);
  hidden.position.y = 2;
  hidden.visible = false;
  root.add(hidden);
  const probe = createGeometryProbe(root);
  const ray = new THREE.Raycaster();
  const visible = [];
  root.traverseVisible((object) => {
    if (object.isMesh) visible.push(object);
  });
  for (let x = -4; x < 6; x += 0.37)
    for (let z = -6; z < 3; z += 0.41)
      for (const [origin, direction] of [
        [
          [x, 3, z],
          [0, -1, 0],
        ],
        [
          [x, 0.7, z],
          [1, 0, 0],
        ],
      ]) {
        ray.set(new THREE.Vector3(...origin), new THREE.Vector3(...direction));
        ray.near = 0.002;
        ray.far = 6;
        const expected =
          ray.intersectObjects(visible, false)[0]?.distance ?? null;
        const actual = probe.probe(origin, direction, 6);
        assert.ok(
          expected === null
            ? actual === null
            : actual !== null && Math.abs(actual - expected) < 1e-6,
        );
      }
  assert.throws(() => probe.probe([0, 0, 0], [0, 0, 0], 1), RangeError);
  probe.dispose();
  probe.dispose();
  assert.throws(() => probe.probe([0, 0, 0], [0, 1, 0], 1), /disposed/);
  geometry.dispose();
  material.dispose();
});
