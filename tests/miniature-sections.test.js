import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { sectionGeometry } from "../src/client/environments/shared/section-geometry.js";
import { sectionEnvironment } from "../src/client/environments/miniatures/sectioned-environment.js";
import { createOpeningShell } from "../src/client/environments/miniatures/opening-shell.js";
import {
  getMiniatureStudy,
  sceneVersions,
} from "../src/client/catalog/scene-versions.js";
import { curatedScenes } from "../src/client/catalog/scene-catalog.js";
import { outdoorScenes } from "../src/client/catalog/outdoor-catalog.js";
import { sceneMiniatureContent } from "../src/client/localization/miniature-content.js";
import { probeGeometry } from "../src/client/rendering/scene-inspection.js";

test("Alfama opts into warmer miniature sunlight without recoloring other places", () => {
  for (const scene of [...curatedScenes, ...outdoorScenes]) {
    const study = getMiniatureStudy(scene);
    if (scene.id === "alfama-hillside") {
      assert.equal(study.sunColor, 0xffc58a);
      assert.equal(study.sunIntensity, 3.8);
    } else assert.equal(study.sunColor, undefined);
  }
});

function volume(geometry) {
  const p = geometry.attributes.position;
  const index = geometry.index;
  const count = index?.count ?? p.count;
  let result = 0;
  for (let i = 0; i < count; i += 3) {
    const vertices = [0, 1, 2].map((offset) =>
      new THREE.Vector3().fromBufferAttribute(
        p,
        index ? index.getX(i + offset) : i + offset,
      ),
    );
    result += vertices[0].dot(vertices[1].cross(vertices[2])) / 6;
  }
  return result;
}

test("geometry sections close real solids with outward caps and preserve the input", () => {
  const original = new THREE.BoxGeometry(2, 2, 2);
  const geometry = sectionGeometry(original, [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
  ]);
  assert(Math.abs(volume(geometry) - 4) < 1e-6);
  assert.equal(geometry.boundingBox.min.x, 0);
  assert.equal(geometry.boundingBox.max.x, 1);
  assert.equal(original.index.count, 36);
  for (const attribute of Object.values(geometry.attributes))
    assert(attribute.array.every(Number.isFinite));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  const hits = new THREE.Raycaster(
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(1, 0, 0),
  ).intersectObject(mesh);
  assert.equal(hits[0].distance, 1);
  geometry.dispose();
  original.dispose();
  mesh.material.dispose();
});

test("section caps preserve holes rather than filling implied cavities", () => {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 1, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.45, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const source = new THREE.ExtrudeGeometry(shape, {
    depth: 2,
    bevelEnabled: false,
    curveSegments: 32,
  });
  source.translate(0, 0, -1).rotateX(Math.PI / 2);
  const geometry = sectionGeometry(source, [
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
  ]);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  const ray = (x) =>
    new THREE.Raycaster(
      new THREE.Vector3(x, -0.5, 0),
      new THREE.Vector3(0, 1, 0),
    ).intersectObject(mesh);
  assert.equal(ray(0).length, 0);
  assert(Math.abs(ray(0.75)[0].distance - 0.5) < 1e-6);
  assert(Math.abs(volume(geometry) - Math.PI * (1 - 0.45 ** 2)) < 0.01);
  geometry.dispose();
  source.dispose();
  mesh.material.dispose();
});

test("multiple cuts remain closed and completely excluded geometry stays empty", () => {
  const source = new THREE.BoxGeometry(2, 2, 2);
  const geometry = sectionGeometry(source, [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
  ]);
  assert(Math.abs(volume(geometry) - 2) < 1e-6);
  const empty = sectionGeometry(source, [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -4),
  ]);
  assert.equal(empty.attributes.position.count, 0);
  geometry.dispose();
  empty.dispose();
  source.dispose();
});

test("sectioning retains live objects and preserves the air gap between solid pieces", () => {
  const group = new THREE.Group();
  const source = new THREE.BoxGeometry(4, 1, 3),
    material = new THREE.MeshBasicMaterial();
  group.add(new THREE.Mesh(source, material));
  const fabricGeometry = new THREE.PlaneGeometry(0.5, 0.5);
  fabricGeometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  const fabric = new THREE.Mesh(fabricGeometry, material);
  fabric.position.set(1, 1, 0);
  group.add(fabric);
  const partition = sectionEnvironment({ group }, [
    { min: [-3, -2, -3], max: [0, 3, 3], name: "first" },
    { min: [0, -2, -3], max: [3, 3, 3], offset: [1, 0, 0], name: "second" },
  ]);
  assert.equal(fabric.parent, partition.sections[1].group);
  assert.equal(fabric.geometry, fabricGeometry);
  group.updateMatrixWorld(true);
  const hits = new THREE.Raycaster(
    new THREE.Vector3(0.5, 3, 0),
    new THREE.Vector3(0, -1, 0),
  ).intersectObject(group, true);
  assert.equal(hits.length, 0);
  partition.dispose();
  source.dispose();
  fabricGeometry.dispose();
  material.dispose();
});

test("shell transitions reverse continuously and reduced motion reaches exact endpoints", () => {
  const group = new THREE.Group(),
    shell = new THREE.Group();
  const material = new THREE.MeshBasicMaterial(),
    geometry = new THREE.BoxGeometry(2, 1, 2);
  shell.add(new THREE.Mesh(geometry, material));
  group.add(shell);
  const control = createOpeningShell(group, shell, [13, 7, -1.5]);
  control.setOpen(true, { now: 0 });
  control.update(500);
  const current = [...control.inspection.offset];
  control.setOpen(false, { now: 500 });
  assert.deepEqual(control.inspection.offset, current);
  control.update(1750);
  assert.deepEqual(control.inspection.offset, [0, 0, 0]);
  control.setOpen(true, { immediate: true });
  assert.deepEqual(control.inspection.offset, [13, 7, -1.5]);
  assert.throws(
    () => createOpeningShell(group, shell, undefined),
    /finite separation/,
  );
  geometry.dispose();
  material.dispose();
});

test("nested static detail levels are cut in world space without retaining hidden geometry", () => {
  const group = new THREE.Group(),
    wall = new THREE.Group(),
    lod = new THREE.LOD(),
    material = new THREE.MeshBasicMaterial(),
    near = new THREE.BoxGeometry(4, 2, 2),
    far = new THREE.BoxGeometry(40, 20, 20);
  wall.position.set(1, 0, 0);
  wall.rotation.y = Math.PI / 2;
  lod.position.z = 1;
  lod.userData.staticDetail = true;
  lod.addLevel(new THREE.Mesh(near, material), 0);
  lod.addLevel(new THREE.Mesh(far, material), 20);
  wall.add(lod);
  group.add(wall);
  const partition = sectionEnvironment({ group }, [
    { min: [2, -2, -3], max: [4, 2, 3], name: "cut stone" },
  ]);
  assert.equal(lod.parent, null);
  const meshes = partition.sections[0].group.children.filter(
    (object) => object.isMesh,
  );
  assert.equal(meshes.length, 1);
  assert(Math.abs(volume(meshes[0].geometry) - 8) < 1e-6);
  assert.equal(meshes[0].geometry.boundingBox.min.x, 2);
  assert.equal(meshes[0].geometry.boundingBox.max.x, 3);
  let disposed = 0;
  meshes[0].geometry.addEventListener("dispose", () => disposed++);
  partition.dispose();
  assert.equal(disposed, 1);
  near.dispose();
  far.dispose();
  material.dispose();
});

test("anchored vegetation keeps crown and trunk together and excludes ungrounded fragments", () => {
  const group = new THREE.Group(),
    material = new THREE.MeshBasicMaterial(),
    geometry = new THREE.BoxGeometry(1, 1, 1);
  const tree = (x) => {
    const parent = new THREE.Group();
    parent.position.set(x, 0, 0);
    parent.userData.sectionAnchor = true;
    const trunk = new THREE.Mesh(geometry, material);
    trunk.scale.set(0.1, 3, 0.1);
    trunk.position.y = 1.5;
    const leaves = new THREE.InstancedMesh(geometry, material, 1);
    leaves.setMatrixAt(0, new THREE.Matrix4().makeTranslation(-1, 3, 0));
    parent.add(trunk, leaves);
    group.add(parent);
    return { parent, leaves };
  };
  const retained = tree(0.3),
    excluded = tree(4.2);
  let disposed = 0;
  excluded.leaves.addEventListener("dispose", () => disposed++);
  const partition = sectionEnvironment({ group }, [
    { min: [-3, -1, -3], max: [0, 5, 3], name: "left" },
    {
      min: [0, -1, -3],
      max: [4, 5, 3],
      offset: [2, 0, 0],
      name: "right",
    },
  ]);
  assert.equal(retained.parent.parent, partition.sections[1].group);
  assert.equal(retained.leaves.parent, retained.parent);
  assert.equal(retained.parent.children.length, 2);
  assert.equal(retained.parent.getWorldPosition(new THREE.Vector3()).x, 2.3);
  assert.equal(excluded.parent.parent, null);
  assert.equal(disposed, 1);
  partition.dispose();
  retained.leaves.dispose();
  geometry.dispose();
  material.dispose();
});

test("roof sections require retained bearing footprints, including transformed assemblies", () => {
  const group = new THREE.Group(),
    material = new THREE.MeshBasicMaterial(),
    geometry = new THREE.BoxGeometry(4, 0.2, 4);
  const roof = (z, name) => {
    const parent = new THREE.Group();
    parent.position.set(0, 3, z);
    parent.rotation.y = Math.PI / 2;
    parent.userData.sectionFootprint = [-0.3, -1, 0.3, 1];
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    parent.add(mesh);
    group.add(parent);
    return parent;
  };
  const excluded = roof(2, "Unsupported eaves"),
    retained = roof(0.8, "Roof with retained walls");
  const partition = sectionEnvironment({ group }, [
    { min: [-2, -1, -1], max: [2, 6, 1.5], name: "Building slice" },
  ]);
  const [mesh] = partition.sections[0].group.children;
  assert.equal(partition.sections[0].group.children.length, 1);
  assert.equal(mesh.name, "Roof with retained walls");
  assert(Math.abs(volume(mesh.geometry) - 2) < 1e-5);
  assert.equal(mesh.geometry.boundingBox.max.z, 1.5);
  assert.equal(retained.parent, null);
  assert.equal(excluded.parent, null);
  partition.dispose();
  geometry.dispose();
  material.dispose();
});

test("every curated landscape and interior has an authored miniature route", () => {
  for (const definition of [...curatedScenes, ...outdoorScenes]) {
    assert(
      sceneVersions(definition).some((version) => version.id === "miniature"),
      definition.id,
    );
    assert.equal(getMiniatureStudy(definition).sceneId, definition.id);
  }
  const generated = {
    id: "generated-reading-room",
    title: "Reading room",
    details: [{ id: "books" }],
    summary: "An authored reading room.",
    blueprint: { archetype: "bookshop" },
  };
  assert.equal(sceneVersions(generated)[0].id, "interior");
  assert.deepEqual(getMiniatureStudy(generated).openOffset, [13, 7, -1.5]);
});

test("miniature narratives reuse the selected view and locale, not a repeated scene summary", () => {
  const scene = curatedScenes.find(
    (definition) => definition.id === "kissaten",
  );
  const views = {
    whole: { label: "The whole piece" },
    arrival: { label: "The room" },
    coffee: { label: "Coffee" },
    preparation: { label: "Coffee", narrationView: "coffee" },
  };
  const narration = [
    { locale: "en-US", title: "Arrival title", text: "Arrival passage." },
    {
      locale: "en-US",
      view: "coffee",
      title: "Coffee title",
      text: "Coffee passage.",
    },
    {
      locale: "pt-BR",
      view: "coffee",
      title: "Cafe title",
      text: "Cafe passage.",
    },
  ];
  const arrival = sceneMiniatureContent(
    "en-US",
    "arrival",
    scene,
    views,
    narration,
  );
  assert.equal(arrival.body, "Arrival passage.");
  assert.equal(
    sceneMiniatureContent("en-US", "coffee", scene, views, narration).body,
    "Coffee passage.",
  );
  assert.equal(
    sceneMiniatureContent("pt-BR", "coffee", scene, views, narration).body,
    "Cafe passage.",
  );
  assert.equal(
    sceneMiniatureContent("en-US", "preparation", scene, views, narration).body,
    "Coffee passage.",
  );
  assert.equal(
    sceneMiniatureContent("pt-BR", "preparation", scene, views, narration).body,
    "Cafe passage.",
  );
  const whole = sceneMiniatureContent(
    "en-US",
    "whole",
    scene,
    views,
    narration,
  );
  assert.equal(whole.heading, "Arrival title");
  assert.match(whole.body, /architectural shell/);
});

test("window sightlines see through real glazing without ignoring solid obstacles", () => {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(4, 4);
  const glass = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.19,
  });
  const wall = new THREE.MeshBasicMaterial();
  const window = new THREE.Mesh(geometry, glass);
  window.name = "Window glazing";
  const back = new THREE.Mesh(geometry, wall);
  back.position.z = -4;
  group.add(window, back);
  const ray = (options) =>
    probeGeometry(group, [0, 0, 1], [0, 0, -1], 8, options);
  assert.equal(ray(), 1);
  assert.equal(ray({ windowSightline: true }), 5);
  glass.opacity = 1;
  assert.equal(ray({ windowSightline: true }), 1);
  geometry.dispose();
  glass.dispose();
  wall.dispose();
});
