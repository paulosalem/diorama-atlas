import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  timberGeometry,
  dressedStoneGeometry,
  laminaGeometry,
  shavingGeometry,
  staticDetailLevels,
} from "../src/client/environments/shared/natural-forms.js";

function inspect(geometry) {
  for (const name of ["position", "normal", "uv"])
    assert.ok(
      Array.from(geometry.attributes[name].array).every(Number.isFinite),
      name,
    );
  geometry.computeBoundingBox();
  if (geometry.index)
    assert.ok(
      Array.from(geometry.index.array).every(
        (n) => n < geometry.attributes.position.count,
      ),
    );
}

test("distance detail preserves aligned bounds and restores complete geometry on approach", () => {
  const points = [
    [12, 0],
    [13, 0],
    [13, 1],
    [12, 1],
  ];
  const near = dressedStoneGeometry(points, 0.18);
  const far = dressedStoneGeometry(points, 0.18, 1, {
    edgeStep: 0.24,
    rings: 4,
  });

  const material = new THREE.MeshStandardMaterial();
  const group = new THREE.Group();
  const kit = {
    group,
    animated: new Set(),
    mesh(geometry, material, position, rotation, parent) {
      const mesh = new THREE.Mesh(geometry, material);
      parent.add(mesh);
      return mesh;
    },
  };
  const lod = staticDetailLevels(kit, { near: [near], far: [far], material });
  group.updateMatrixWorld(true);
  const bounds = lod.levels.map(({ object }) =>
    new THREE.Box3().setFromObject(object),
  );
  assert.ok(bounds[0].min.distanceTo(bounds[1].min) < 0.005);
  assert.ok(bounds[0].max.distanceTo(bounds[1].max) < 0.005);
  assert.ok(bounds[0].min.x > 11.99);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(12.5, 0.5, 50);
  camera.updateMatrixWorld();
  lod.update(camera);
  assert.equal(lod.getCurrentLevel(), 1);
  camera.position.z = 3;
  camera.updateMatrixWorld();
  lod.update(camera);
  assert.equal(lod.getCurrentLevel(), 0);
  assert.ok(
    lod.levels[0].object.geometry.index.count >
      lod.levels[1].object.geometry.index.count * 2,
  );
  assert.ok(kit.animated.has(lod));
  for (const { object } of lod.levels) object.geometry.dispose();
  material.dispose();
});

test("timber preserves physical length while modeling tapered, bent cross-sections", () => {
  const g = timberGeometry({
    length: 0.7,
    width: 0.08,
    round: true,
    taper: 0.2,
    bend: 0.018,
  });
  inspect(g);
  assert.ok(Math.abs(g.boundingBox.max.y - g.boundingBox.min.y - 0.7) < 1e-6);
  const p = g.attributes.position;
  assert.ok(p.count > 800);
  assert.ok(
    g.attributes.normal.getX(14 * 33) > 0.5,
    "outside faces point outward",
  );
  assert.ok(Math.abs(p.getX(0) - p.getX(28 * 33)) > 0.004);
  const straight = timberGeometry({
    length: 0.7,
    width: 0.08,
    round: true,
    seed: 7,
  });
  inspect(straight);
  assert.notDeepEqual(
    g.attributes.position.array,
    straight.attributes.position.array,
  );
  g.dispose();
  straight.dispose();
});

test("dressed stone resolves relief within the original fitted footprint", () => {
  const g = dressedStoneGeometry(
    [
      [0, 0],
      [1, 0],
      [1.1, 0.8],
      [0.2, 1],
    ],
    0.18,
    9,
  );
  inspect(g);
  assert.ok(g.boundingBox.min.x >= 0 && g.boundingBox.max.x <= 1.1);
  assert.ok(g.boundingBox.min.y >= 0 && g.boundingBox.max.y <= 1);
  assert.ok(g.boundingBox.max.z - g.boundingBox.min.z > 0.13);
  const face = Array.from(g.attributes.position.array).filter(
    (_, i) => i % 3 === 2,
  );
  assert.ok(new Set(face.map((z) => z.toFixed(5))).size > 100);
  g.dispose();
});

test("leaves and shavings have curved geometry rather than planar or tubular proxies", () => {
  const leaf = laminaGeometry({ length: 1.2, width: 0.4, bend: 0.3 });
  const shaving = shavingGeometry();
  inspect(leaf);
  inspect(shaving);
  assert.ok(leaf.boundingBox.max.z > 0.29);
  assert.ok(leaf.boundingBox.max.x - leaf.boundingBox.min.x > 0.35);
  assert.ok(shaving.boundingBox.max.y - shaving.boundingBox.min.y > 0.025);
  assert.throws(() => timberGeometry({ length: 0, width: 1 }), /positive/);
  assert.throws(() => dressedStoneGeometry([[0, 0]], 0.2), /polygon/);
  leaf.dispose();
  shaving.dispose();
});
