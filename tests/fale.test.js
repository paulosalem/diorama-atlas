import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import * as THREE from "three";
import {
  faleScene,
  faleViews,
  faleTranslations,
} from "../src/client/catalog/fale-catalog.js";
import { sceneVersions } from "../src/client/catalog/scene-versions.js";
import {
  falePerimeter,
  faleRoofGeometry,
  faleRoofPoint,
} from "../src/client/environments/fale/fale-architecture.js";
import {
  faleGroundHeight,
  faleRouteDistance,
} from "../src/client/environments/fale/fale-landscape.js";
import { wovenPanel } from "../src/client/environments/shared/woven-panel.js";
import { sceneMiniatureContent } from "../src/client/localization/miniature-content.js";
import { saunaScene } from "../src/client/catalog/sauna-catalog.js";
import { gerScene } from "../src/client/catalog/ger-catalog.js";

test("fale has two peer experiences and complete bilingual interpretation", () => {
  assert.deepEqual(
    sceneVersions(faleScene).map((v) => v.id),
    ["interior", "miniature"],
  );
  assert.equal(Object.keys(faleViews).length, 6);
  assert.equal(faleScene.details.length, 4);
  for (const view of Object.values(faleViews)) {
    assert.ok(
      [...view.position, ...view.target, view.fov].every(Number.isFinite),
    );
    assert.ok(faleTranslations[view.label]);
  }
  for (const detail of faleScene.details) {
    assert.ok(faleTranslations[detail.title]);
    assert.ok(faleTranslations[detail.body]);
  }
});

test("fale roof is continuous, finite and has real sheet thickness", () => {
  const geometry = faleRoofGeometry();
  for (const attribute of Object.values(geometry.attributes))
    assert.ok([...attribute.array].every(Number.isFinite));
  const positions = geometry.attributes.position;
  assert.ok(positions.count > 100000);
  assert.ok(
    Math.abs(positions.getY(0) - positions.getY(positions.count / 2) - 0.007) <
      0.00001,
  );
  for (const u of [0, 0.25, 0.5, 0.75, 1]) {
    const a = falePerimeter(u - 0.000001),
      b = falePerimeter(u + 0.000001);
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.0001);
    assert.ok(faleRoofPoint(u, 1)[1] > faleRoofPoint(u, 0)[1] + 2.9);
  }
  geometry.dispose();
});

test("woven strips alternate over and under with actual gaps and supported deformation", () => {
  const group = new THREE.Group(),
    material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const kit = {
    group,
    mesh(geometry, material, position, rotation, parent) {
      const mesh = new THREE.Mesh(geometry, material);
      parent.add(mesh);
      return mesh;
    },
  };
  wovenPanel(kit, {
    width: 0.4,
    height: 0.4,
    spacing: 0.04,
    angle: 0,
    material,
  });
  group.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  );
  const hits = ray.intersectObject(group, true);
  assert.ok(hits.some((hit) => hit.point.z > 0.001));
  assert.ok(hits.some((hit) => hit.point.z < -0.001));
  ray.ray.origin.set(0.02, 0.02, 1);
  assert.equal(ray.intersectObject(group, true).length, 0);
  wovenPanel(kit, {
    width: 0.4,
    height: 0.4,
    material,
    surface: (x, y, z) => [x, z + y * y, y],
  });
  group.traverse((mesh) => {
    if (!mesh.isMesh) return;
    for (const attribute of Object.values(mesh.geometry.attributes))
      assert.ok([...attribute.array].every(Number.isFinite));
    mesh.geometry.dispose();
  });
  assert.throws(() => wovenPanel(kit, { width: 0, height: 1, material }));
  assert.throws(() =>
    wovenPanel(kit, { width: 1, height: 1, angle: NaN, material }),
  );
  material.dispose();
});

test("household paths reach both connected buildings and stay on level ground", () => {
  for (const [x, z] of [
    [0, 3.8],
    [0, -3.8],
    [-2.7, -6.8],
    [-2.7, -7.5],
    [5.3, -4.5],
  ]) {
    assert.equal(faleRouteDistance(x, z), 0);
    assert.equal(faleGroundHeight(x, z), 0);
  }
});

test("each new miniature story is top-level and keeps its matching recorded text", async () => {
  const recipes = JSON.parse(
    await readFile(
      new URL("../scripts/prompts/opening-narration.json", import.meta.url),
    ),
  ).assets;
  for (const scene of [gerScene, saunaScene, faleScene])
    for (const locale of ["en-US", "pt-BR"]) {
      const story = sceneMiniatureContent(locale, "whole", scene, {
        whole: { label: "The whole piece" },
      });
      assert.ok(story.body.length > 200);
      assert.ok(
        recipes.some(
          (asset) =>
            asset.scene === scene.id &&
            asset.locale === locale &&
            asset.view === "miniature-whole" &&
            asset.text === story.body,
        ),
      );
    }
});

test("fale photographs retain source licenses and exact bundled bytes", async () => {
  const [entry] = JSON.parse(
    await readFile(new URL("../public/fale/references.json", import.meta.url)),
  );
  assert.equal(entry.sceneId, faleScene.id);
  assert.equal(entry.references.length, 4);
  for (const source of entry.references) {
    assert.ok(
      source.author && source.license && source.licenseUrl && source.url,
    );
    const bytes = await readFile(new URL(`..${source.image}`, import.meta.url));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      source.sha256,
    );
  }
});
