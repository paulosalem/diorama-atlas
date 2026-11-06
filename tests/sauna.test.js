import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import * as THREE from "three";
import {
  saunaScene,
  saunaViews,
  saunaTranslations,
} from "../src/client/catalog/sauna-catalog.js";
import { sceneVersions } from "../src/client/catalog/scene-versions.js";
import {
  SAUNA,
  saunaRoofGeometry,
} from "../src/client/environments/sauna/sauna-architecture.js";
import {
  saunaGroundHeight,
  saunaShore,
} from "../src/client/environments/sauna/sauna-landscape.js";
import { saunaStoneGeometry } from "../src/client/environments/sauna/sauna-furnishings.js";
import { timberSteps } from "../src/client/environments/shared/timber-steps.js";
import { mapTimberSurfaces } from "../src/client/environments/shared/timber-uv.js";
import {
  addAtmosphericParticles,
  addSteamPlume,
} from "../src/client/environments/shared/atmospheric-particles.js";

test("sauna peer experiences retain six complete bilingual views and four details", () => {
  assert.deepEqual(
    sceneVersions(saunaScene).map((v) => v.id),
    ["interior", "miniature"],
  );
  assert.equal(Object.keys(saunaViews).length, 6);
  assert.equal(saunaScene.details.length, 4);
  for (const view of Object.values(saunaViews)) {
    assert.ok(
      [...view.position, ...view.target, view.fov].every(Number.isFinite),
    );
    assert.ok(saunaTranslations[view.label]);
  }
  for (const detail of saunaScene.details) {
    assert.ok(saunaTranslations[detail.title]);
    assert.ok(saunaTranslations[detail.body]);
  }
  assert.equal(SAUNA.doorWidth, 0.88);
  assert.equal(SAUNA.doorHeight, 1.9);
});

test("sauna roof has a real chimney aperture and finite, closed-thickness faces", () => {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const geometry = saunaRoofGeometry(side);
    assert.ok(
      [
        ...geometry.attributes.position.array,
        ...geometry.attributes.normal.array,
      ].every(Number.isFinite),
    );
    const mesh = new THREE.Mesh(geometry, material);
    mesh.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(
      new THREE.Vector3(-2.05, 5, 0.1),
      new THREE.Vector3(0, -1, 0),
    );
    assert.equal(ray.intersectObject(mesh).length, 0);
    ray.ray.origin.x = side < 0 ? -2.45 : 1;
    assert.ok(ray.intersectObject(mesh).length >= 2);
    geometry.dispose();
  }
  material.dispose();
});

test("lakebed meets the full shoreline and keeps the miniature perimeter continuous", () => {
  for (let x = -80; x <= 80; x += 0.25) {
    const shore = saunaShore(x);
    for (const offset of [-0.000001, 0, 0.000001])
      assert.ok(
        Math.abs(saunaGroundHeight(x, shore + offset) + 0.15) < 0.000001,
      );
  }
  for (let x = -8; x <= 8; x += 0.125) {
    assert.ok(Math.abs(saunaGroundHeight(x, saunaShore(x)) + 0.15) < 0.000001);
    assert.ok(saunaGroundHeight(x, 12) < -0.7);
    assert.ok(
      Math.abs(saunaGroundHeight(x, -7.000001) - saunaGroundHeight(x, -7)) <
        0.000001,
    );
  }
});

test("heater stones retain fractured silhouettes without flat tiny-triangle normals", () => {
  for (let i = 0; i < 24; i++) {
    const geometry = saunaStoneGeometry(i);
    assert.ok(geometry.index);
    assert.ok(geometry.attributes.position.count > 500);
    assert.ok(
      [
        ...geometry.attributes.position.array,
        ...geometry.attributes.normal.array,
      ].every(Number.isFinite),
    );
    geometry.computeBoundingSphere();
    assert.ok(geometry.boundingSphere.radius < 0.14);
    geometry.dispose();
  }
});

test("timber stairs have full-width treads at their specified rises", () => {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const group = new THREE.Group();
  const owned = [];
  const kit = {
    sub: (position) => {
      group.position.fromArray(position);
      return group;
    },
    mesh(geometry, material, position, rotation, parent) {
      owned.push(geometry);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.fromArray(position);
      mesh.rotation.set(...rotation);
      parent.add(mesh);
      return mesh;
    },
    box(size, position, material, parent) {
      return this.mesh(
        new THREE.BoxGeometry(...size),
        material,
        position,
        [0, 0, 0],
        parent,
      );
    },
  };
  timberSteps(kit, {
    position: [0, 0, 0],
    width: 0.75,
    rise: 0.163,
    run: 0.267,
    count: 3,
    material,
  });
  group.updateMatrixWorld(true);
  for (let i = 0; i < 3; i++)
    for (const x of [-0.34, 0, 0.34]) {
      const ray = new THREE.Raycaster(
        new THREE.Vector3(x, 1, -(i + 0.5) * 0.267),
        new THREE.Vector3(0, -1, 0),
      );
      const hit = ray.intersectObject(group, true)[0];
      assert.ok(Math.abs(hit.point.y - (i + 1) * 0.163) < 0.000001);
    }
  owned.forEach((geometry) => geometry.dispose());
  material.dispose();
});

test("physical timber mapping varies phase without changing grain scale", () => {
  const material = new THREE.MeshStandardMaterial();
  const root = new THREE.Group();
  const boards = [0, 1].map((y) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.1, 0.12),
      material,
    );
    mesh.position.y = y;
    root.add(mesh);
    return mesh;
  });
  mapTimberSurfaces(root, [material]);
  assert.notDeepEqual(
    boards[0].geometry.attributes.uv.array,
    boards[1].geometry.attributes.uv.array,
  );
  for (const board of boards) {
    const { normal, uv } = board.geometry.attributes;
    const values = Array.from({ length: uv.count }, (_, i) => i)
      .filter((i) => normal.getY(i) > 0.9)
      .map((i) => uv.getX(i));
    assert.ok(
      Math.abs(Math.max(...values) - Math.min(...values) - 1) < 0.000001,
    );
    board.geometry.dispose();
  }
  material.dispose();
});

test("vapor shares owned particle rendering while preserving existing interior defaults", () => {
  const geometries = [],
    materials = [];
  const kit = {
    group: new THREE.Group(),
    animations: [],
    animated: new Set(),
    range: (a, b) => (a + b) / 2,
    random: () => 0.5,
    ownGeometry: (value) => geometries.push(value),
    ownMaterial: (value) => materials.push(value),
  };
  const existing = addAtmosphericParticles(kit, {
    position: [0, 0, 0],
    spread: [1, 1, 1],
    steam: true,
  });
  assert.equal(existing.material.uniforms.maximumSize.value, 28);
  assert.equal(existing.material.uniforms.opacity.value, 0.065);
  assert.equal(existing.material.blending, THREE.NormalBlending);
  const plume = addSteamPlume(kit, { position: [0, 1, 0] });
  assert.ok(plume.isPoints);
  assert.equal(plume.material.depthWrite, false);
  assert.equal(plume.material.blending, THREE.AdditiveBlending);
  assert.equal(plume.material.uniforms.maximumSize.value, 256);
  kit.animations.forEach((update) => update(0, 2));
  assert.equal(plume.material.uniforms.time.value, 2);
  assert.equal(kit.animated.size, 2);
  geometries.forEach((value) => value.dispose());
  materials.forEach((value) => value.dispose());
});

test("sauna photographic, timber and botanical assets retain source licenses and hashes", async () => {
  const [photographs] = JSON.parse(
    await readFile(new URL("../public/sauna/references.json", import.meta.url)),
  );
  assert.equal(photographs.references.length, 5);
  for (const reference of photographs.references) {
    const bytes = await readFile(
      new URL(`..${reference.image}`, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      reference.sha256,
    );
    assert.match(reference.license, /^CC/);
  }
  for (const category of ["materials", "forest"]) {
    const manifest = JSON.parse(
      await readFile(
        new URL(`../public/sauna/${category}/manifest.json`, import.meta.url),
      ),
    );
    for (const asset of manifest.assets) {
      assert.match(asset.license, /^CC0/);
      assert.ok(asset.author && asset.source && asset.licenseUrl);
      for (const [key, file] of Object.entries(asset.files)) {
        const bytes = await readFile(new URL(`..${file}`, import.meta.url));
        assert.equal(
          createHash("sha256").update(bytes).digest("hex"),
          asset.fileIntegrity[key].sha256,
          file,
        );
      }
    }
  }
});
