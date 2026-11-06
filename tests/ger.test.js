import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  gerScene,
  gerViews,
  gerTranslations,
} from "../src/client/catalog/ger-catalog.js";
import {
  GER,
  gerCoverGeometry,
} from "../src/client/environments/ger/ger-architecture.js";
import { sceneVersions } from "../src/client/catalog/scene-versions.js";
import * as THREE from "three";
import { gerStoveTopGeometry } from "../src/client/environments/ger/ger-household.js";

test("the ger has peer experiences, distinct views and complete bilingual interpretation", () => {
  assert.deepEqual(
    sceneVersions(gerScene).map((v) => v.id),
    ["interior", "miniature"],
  );
  assert.equal(Object.keys(gerViews).length, 6);
  assert.equal(gerScene.details.length, 4);
  for (const view of Object.values(gerViews)) {
    assert.ok(
      [...view.position, ...view.target, view.fov].every(Number.isFinite),
    );
    assert.ok(gerTranslations[view.label]);
  }
  for (const detail of gerScene.details) {
    assert.ok(gerTranslations[detail.title]);
    assert.ok(gerTranslations[detail.body]);
  }
  assert.ok(GER.doorWidth > 1);
  assert.equal(GER.doorHeight, 1.5);
  assert.ok(GER.crown > GER.wall);
});

test("ger textile sections resolve folds and close their cut ends", () => {
  const profile = [
    [3.1, 0.14],
    [3.175, 0.14],
    [3.175, 1.78],
    [3.1, 1.78],
    [3.1, 0.14],
  ];
  const geometry = gerCoverGeometry(profile, 0.3, 1.1, 64);
  const p = geometry.attributes.position;
  assert.ok(p.count > 3000);
  assert.ok(
    [...p.array, ...geometry.attributes.normal.array].every(Number.isFinite),
  );
  geometry.computeBoundingBox();
  assert.ok(geometry.boundingBox.max.y > 1.7);
  const edges = new Map();
  const vertex = (i) =>
    [p.getX(i), p.getY(i), p.getZ(i)].map((n) => n.toFixed(5)).join(",");
  const index = geometry.index.array;
  for (let i = 0; i < index.length; i += 3) {
    const triangle = [
      vertex(index[i]),
      vertex(index[i + 1]),
      vertex(index[i + 2]),
    ];
    for (let j = 0; j < 3; j++) {
      const edge = [triangle[j], triangle[(j + 1) % 3]].sort().join("/");
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  assert.ok(
    [...edges.values()].every((count) => count === 2),
    "Each welded edge must have two adjacent faces",
  );
  geometry.dispose();
});

test("ger reference photographs retain verified bytes and explicit reusable licenses", async () => {
  const [entry] = JSON.parse(
    await readFile(new URL("../public/ger/references.json", import.meta.url)),
  );
  assert.equal(entry.sceneId, gerScene.id);
  assert.equal(entry.references.length, 4);
  for (const reference of entry.references) {
    assert.match(reference.license, /^CC(?:0| BY-SA)/);
    assert.match(
      reference.url,
      /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/,
    );
    const bytes = await readFile(
      new URL(`..${reference.image}`, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      reference.sha256,
    );
  }
});

test("the stove's flue passes through a real aperture in its top plate", () => {
  const geometry = gerStoveTopGeometry();
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0, 1, -0.23),
    new THREE.Vector3(0, -1, 0),
  );
  assert.equal(ray.intersectObject(mesh).length, 0);
  ray.ray.origin.x = 0.1;
  assert.ok(ray.intersectObject(mesh).length > 0);
  geometry.dispose();
  material.dispose();
});
