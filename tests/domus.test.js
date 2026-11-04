import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { createCameraLightCulling } from "../src/client/environments/shared/camera-light-culling.js";
import {
  canStandAt,
  hasClearSightline,
  moveInWalkingSpace,
} from "../src/client/viewer/walking-space.js";
import {
  domusRooms,
  domusWalls,
  domusViews,
  wallSegments,
} from "../src/client/environments/domus/domus-layout.js";
import {
  domusScene,
  domusPassages,
} from "../src/client/catalog/domus-catalog.js";
import { translations } from "../src/client/localization/locale.js";
import { miniatureFitDistance } from "../src/client/viewer/miniature-controls.js";
import { createDomusMiniature } from "../src/client/environments/domus/domus-miniature.js";

test("miniature sections only architectural materials and fits every composition on compact screens", () => {
  const group = new THREE.Group();
  const materials = [];
  const geometries = [];
  const original = new THREE.MeshStandardMaterial({ color: 0xa24a32 });
  const walls = new THREE.Group();
  const roofs = new THREE.Group();
  const wallGeometry = new THREE.BoxGeometry(3, 4, 0.3);
  walls.add(new THREE.Mesh(wallGeometry, original));
  const sun = new THREE.DirectionalLight();
  const kit = {
    sub() {
      const child = new THREE.Group();
      group.add(child);
      return child;
    },
    ownMaterial(material) {
      materials.push(material);
      return material;
    },
    box(size, position, material, parent) {
      const geometry = new THREE.BoxGeometry(...size);
      geometries.push(geometry);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.fromArray(position);
      parent.add(mesh);
      return mesh;
    },
  };
  try {
    const miniature = createDomusMiniature(kit, { walls, roofs }, sun);
    const base = group.getObjectByName("domus-miniature-base");
    const caps = group.getObjectByName("domus-section-caps");
    assert.equal(base.visible, false);
    miniature.setActive(true);
    assert.equal(roofs.visible, false);
    assert.equal(caps.visible, true);
    assert.equal(base.visible, true);
    assert.equal(walls.children[0].material.clippingPlanes.length, 1);
    assert.equal(original.clippingPlanes, null);
    miniature.setCutaway(false);
    assert.equal(roofs.visible, true);
    assert.equal(caps.visible, false);
    assert.equal(walls.children[0].material.clippingPlanes, null);
    miniature.setActive(false);
    assert.equal(base.visible, false);
    assert.equal(roofs.visible, true);
    for (const view of Object.values(miniature.views)) {
      assert.ok(Object.hasOwn(translations["pt-BR"], view.label), view.label);
      for (const aspect of [1280 / 760, 366 / 533, 796 / 210, 0.4]) {
        const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 600);
        camera.position.fromArray(view.position);
        const target = new THREE.Vector3(...view.target);
        const bounds = view.bounds ?? miniature.bounds;
        const distance = miniatureFitDistance(camera, target, bounds);
        camera.position.sub(target).setLength(distance).add(target);
        camera.lookAt(target);
        camera.updateMatrixWorld();
        for (const x of [bounds[0][0], bounds[1][0]])
          for (const y of [bounds[0][1], bounds[1][1]])
            for (const z of [bounds[0][2], bounds[1][2]]) {
              const point = new THREE.Vector3(x, y, z).project(camera);
              assert.ok(Math.abs(point.x) <= 0.88001, view.label);
              assert.ok(Math.abs(point.y) <= 0.88001, view.label);
              assert.ok(point.z > -1 && point.z < 1, view.label);
            }
      }
    }
  } finally {
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
    original.dispose();
    wallGeometry.dispose();
    sun.dispose();
  }
});

test("local lighting retains fixtures while following the visitor with a fixed budget", () => {
  const group = new THREE.Group();
  for (const x of [0, 5, 10, 15]) {
    const light = new THREE.PointLight(0xffffff, 2, 9);
    light.position.set(x, 2, 0);
    group.add(light);
  }
  const update = createCameraLightCulling(group, 2);
  update(new THREE.Vector3(0, 1.62, 0));
  assert.deepEqual(
    group.children.map((light) => light.visible),
    [true, true, false, false],
  );
  update(new THREE.Vector3(15, 1.62, 0));
  assert.deepEqual(
    group.children.map((light) => light.visible),
    [false, false, true, true],
  );
  assert.ok(
    group.children.every(
      (light) => light.intensity === 2 && light.distance === 9,
    ),
  );
  assert.throws(() => createCameraLightCulling(group, 0), RangeError);
});

test("Roman house remains an explicit local draft with every room and bilingual view", () => {
  assert.equal(domusScene.draft, true);
  assert.equal(domusRooms.length, 21);
  assert.equal(Object.keys(domusViews).length, 20);
  assert.equal(new Set(domusPassages.map((p) => p.id)).size, 25);
  for (const view of Object.values(domusViews)) {
    assert.equal(view.position[1], 1.62);
    assert.ok(
      [...view.position, ...view.target, view.fov].every(Number.isFinite),
    );
    assert.ok(Object.hasOwn(translations["pt-BR"], view.label), view.label);
  }
  for (const detail of domusScene.details) {
    assert.ok(Object.hasOwn(translations["pt-BR"], detail.title), detail.title);
    assert.ok(Object.hasOwn(translations["pt-BR"], detail.body), detail.id);
  }
});

test("wall segments leave every specified human-scale doorway genuinely open", () => {
  for (const wall of domusWalls) {
    const segments = wallSegments(wall);
    for (const opening of wall.openings) {
      assert.ok(opening.width >= 1.25);
      assert.ok(opening.height >= 2.5);
      for (const [start, end] of segments)
        assert.ok(
          end <= opening.center - opening.width / 2 ||
            start >= opening.center + opening.width / 2,
        );
    }
    const solid = segments.reduce((n, [a, b]) => n + b - a, 0);
    assert.ok(
      Math.abs(
        solid +
          wall.openings.reduce((n, o) => n + o.width, 0) -
          (wall.end - wall.start),
      ) < 1e-8,
    );
  }
});

test("walking enforces body clearance, bounded motion, wall sliding and no tunneling", () => {
  const space = { bounds: [-5, 5, -5, 5], obstacles: [[-1, 1, -0.1, 0.1]] };
  assert.equal(canStandAt(space, 0, 0), false);
  assert.equal(canStandAt(space, NaN, 2), false);
  assert.equal(canStandAt(space, 4.9, 2), false);
  const position = { x: 0, z: 3 };
  moveInWalkingSpace(space, position, 0, -7);
  assert.ok(position.z >= 0.31, JSON.stringify(position));
  moveInWalkingSpace(space, position, 2.5, -0.5);
  assert.ok(position.x > 2);
  assert.ok(canStandAt(space, position.x, position.z));
});

test("inspection does not reveal objects through walls but respects door openings", () => {
  const walls = [
    [-3, -0.7, -0.15, 0.15],
    [0.7, 3, -0.15, 0.15],
  ];
  assert.equal(hasClearSightline(walls, { x: 0, z: 2 }, { x: 0, z: -2 }), true);
  assert.equal(
    hasClearSightline(walls, { x: 2, z: 2 }, { x: 2, z: -2 }),
    false,
  );
  assert.equal(hasClearSightline(walls, { x: 2, z: 2 }, { x: 2, z: 1 }), true);
  assert.equal(
    hasClearSightline(walls, { x: -2, z: -2 }, { x: 2, z: 2 }),
    true,
  );
});

test("domus photographic sources preserve license evidence and exact local bytes", async () => {
  const root = new URL("../", import.meta.url);
  const previews = JSON.parse(
    await readFile(new URL("public/previews/credits.json", root)),
  );
  assert.equal(
    previews.rendered.find((entry) => entry.scene === domusScene.id)?.draft,
    true,
  );
  const [entry] = JSON.parse(
    await readFile(new URL("public/domus/references.json", root)),
  );
  assert.equal(entry.sceneId, domusScene.id);
  assert.equal(entry.references.length, 11);
  for (const reference of entry.references) {
    assert.match(
      reference.url,
      /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/,
    );
    assert.match(reference.license, /^(CC BY|CC0|Public domain)/);
    assert.ok(reference.author);
    assert.ok(reference.licenseUrl);
    const bytes = await readFile(new URL(reference.image.slice(1), root));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      reference.sha256,
    );
  }
});
