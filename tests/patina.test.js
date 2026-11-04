import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  surfacePatinaProfile,
  applySurfacePatina,
  surfacePatinaParameters,
  portableSurfacePatinaShader,
} from "../src/client/environments/shared/surface-patina.js";
import {
  stampSurfaceVariation,
  canScatterSurfaceMap,
} from "../src/client/environments/shared/surface-variation.js";

test("native material parameters match the original renderer's aging uniforms", () => {
  for (const profile of [
    "plaster",
    "stone",
    "tile",
    "terracotta",
    "clay",
    "wood",
    "metal",
    "fabric",
    "leather",
    "earth",
  ]) {
    const material = new THREE.MeshStandardMaterial({ color: 0xc9a577 });
    material.name = "Preserved material identity";
    material.userData.patinaProfile = profile;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const group = new THREE.Group();
    group.add(new THREE.Mesh(geometry, material));
    const definition = { id: "riad" };
    const views = { courtyard: { position: [2, 1.65, 3] } };
    const parameters = surfacePatinaParameters(material, definition, views);
    applySurfacePatina(group, definition, views);
    const shader = {
      uniforms: {},
      vertexShader: "#include <project_vertex>",
      fragmentShader: "#include <color_fragment>",
    };
    material.onBeforeCompile(shader, null);
    for (const [parameter, uniform] of [
      ["seed", "atlasPatinaSeed"],
      ["strength", "atlasPatinaStrength"],
      ["floor", "atlasPatinaFloor"],
      ["tileGrid", "atlasPatinaTileGrid"],
      ["microStrength", "atlasPatinaMicroStrength"],
    ])
      assert.deepEqual(parameters[parameter], shader.uniforms[uniform].value);
    assert(parameters.profileIndex >= 0);
    material.dispose();
    geometry.dispose();
  }
  const protectedMaterial = new THREE.MeshStandardMaterial({
    transparent: true,
  });
  assert.equal(
    surfacePatinaParameters(protectedMaterial, { id: "riad" }),
    null,
  );
  protectedMaterial.dispose();
});

test("portable weathering retains color, roughness, oxidation and geometric relief", () => {
  const shader = portableSurfacePatinaShader();
  assert.match(shader, /atlasSurfacePatina/);
  assert.match(shader, /atlasCrack/);
  assert.match(shader, /atlasRing/);
  assert.match(shader, /atlasTileInside/);
  assert.match(shader, /roughnessChange/);
  assert.match(shader, /metalnessScale/);
  assert.match(shader, /shadingNormal = atlasReliefNormal/);
  assert.doesNotMatch(shader, /\b(uniform|varying|USE_MAP)\b/);
});

test("material meaning survives clones and copied scan textures", () => {
  const texture = new THREE.Texture();
  texture.userData.patinaProfile = "wood";
  const material = new THREE.MeshStandardMaterial({ map: texture });
  assert.equal(surfacePatinaProfile(material), "wood");
  material.userData.patinaProfile = "plaster";
  assert.equal(surfacePatinaProfile(material.clone()), "plaster");
  material.userData.patinaProfile = "invalid";
  assert.throws(() => surfacePatinaProfile(material), /Unknown patina profile/);
});

test("artwork, foliage, glass and luminous surfaces are protected", () => {
  for (const setup of [
    (m) => {
      m.userData.artwork = "/public/art.png";
    },
    (m) => {
      m.alphaTest = 0.4;
    },
    (m) => {
      m.transparent = true;
    },
    (m) => {
      m.emissive.set(0xffaa33);
      m.emissiveIntensity = 1;
    },
    (m) => {
      m.userData.patinaProfile = "none";
    },
  ]) {
    const material = new THREE.MeshStandardMaterial({ metalness: 0.8 });
    setup(material);
    assert.equal(surfacePatinaProfile(material), null);
  }
});

test("different physical pieces retain their variation through batching", () => {
  const first = new THREE.BoxGeometry(0.4, 0.08, 0.4),
    second = first.clone();
  stampSurfaceVariation(first, new THREE.Matrix4());
  stampSurfaceVariation(
    second,
    new THREE.Matrix4().makeTranslation(0.42, 0, 0),
  );
  const a = first.getAttribute("atlasObjectSeed").getX(0),
    b = second.getAttribute("atlasObjectSeed").getX(0);
  assert.notEqual(a, b);
  const merged = mergeGeometries([first, second]);
  assert.equal(merged.getAttribute("atlasObjectSeed").getX(0), a);
  assert.equal(
    merged
      .getAttribute("atlasObjectSeed")
      .getX(first.attributes.position.count),
    b,
  );
  const repeat = new THREE.BoxGeometry(0.4, 0.08, 0.4);
  stampSurfaceVariation(
    repeat,
    new THREE.Matrix4().makeTranslation(0.42, 0, 0),
  );
  assert.equal(repeat.getAttribute("atlasObjectSeed").getX(0), b);
  for (const geometry of [first, second, merged, repeat]) geometry.dispose();
});

test("only unstructured repeating scans use stochastic sampling", () => {
  const map = new THREE.Texture({
    src: "/public/riad/materials/wood_table_worn_diff.jpg",
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  assert.equal(canScatterSurfaceMap(map), true);
  map.image.src = "/public/riad/materials/terracotta_floor_tiles_diff.jpg";
  assert.equal(canScatterSurfaceMap(map), false);
  map.image.src =
    "/public/outdoors/detail-assets/planter-pot-clay/textures/planter_pot_clay_diff_2k.jpg";
  assert.equal(canScatterSurfaceMap(map), false);
});

test("patina preserves existing shader hooks and exposes safe comparison strength", () => {
  const map = new THREE.Texture({
    src: "/public/riad/materials/wood_table_worn_diff.jpg",
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const material = new THREE.MeshStandardMaterial({ map });
  material.userData.patinaProfile = "wood";
  let previousHookCalled = false;
  material.onBeforeCompile = () => {
    previousHookCalled = true;
  };
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
  const treatment = applySurfacePatina(group, { id: "test-room" });
  const shader = {
    uniforms: {},
    vertexShader: "#include <project_vertex>",
    fragmentShader: [
      "#include <map_fragment>",
      "#include <color_fragment>",
      "#include <roughnessmap_fragment>",
      "#include <metalnessmap_fragment>",
      "#include <normal_fragment_maps>",
    ].join("\n"),
  };
  material.onBeforeCompile(shader, null);
  assert.equal(previousHookCalled, true);
  assert.equal(treatment.stats.materials, 1);
  assert.match(shader.vertexShader, /atlasObjectSeed/);
  assert.match(shader.fragmentShader, /atlasScatteredSample\( map, vMapUv \)/);
  assert.match(shader.fragmentShader, /atlasRing/);
  treatment.setStrength(0);
  assert.equal(shader.uniforms.atlasPatinaStrength.value, 0);
  assert.throws(() => treatment.setStrength(-1), /between 0 and 1/);
  assert.throws(() => treatment.setStrength(Number.NaN), /between 0 and 1/);
});

test("plain terracotta floors shuffle photographed tiles without moving grout", () => {
  const map = new THREE.Texture({
    src: "/public/riad/materials/terracotta_floor_tiles_diff.jpg",
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.userData.patinaProfile = "terracotta";
  map.userData.tileGrid = [9, 9];
  const material = new THREE.MeshStandardMaterial({ map });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(8, 0.1, 10), material));
  applySurfacePatina(group, { id: "tile-room" });
  const shader = {
    uniforms: {},
    vertexShader: "#include <project_vertex>",
    fragmentShader:
      "#include <map_fragment>\n#include <color_fragment>\n#include <normal_fragment_maps>",
  };
  material.onBeforeCompile(shader, null);
  assert.deepEqual(shader.uniforms.atlasPatinaTileGrid.value, [9, 9]);
  assert.match(shader.fragmentShader, /atlasTileSample\( map, vMapUv \)/);
  assert.match(shader.fragmentShader, /choice\+fract\(position\)/);
  assert.doesNotMatch(
    shader.fragmentShader,
    /atlasScatteredSample\( map, vMapUv \)/,
  );
});
