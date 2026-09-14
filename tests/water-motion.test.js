import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { createOutdoorWater } from "../src/client/environments/outdoors/outdoor-water.js";
import {
  WATER_FLOW_GLSL,
  configureWaterMaterial,
} from "../src/client/environments/shared/water-flow.js";

test("outdoor water preserves its capture, fog, clock and geometry-replacement API", () => {
  const water = createOutdoorWater({ width: 8, depth: 12, color: 0x526e64 });
  assert.equal(water.isReflector, true);
  assert.equal(water.material.uniforms.waterTime.value, 0);
  assert.equal(water.material.fog, true);
  assert.equal(water.rotation.x, -Math.PI / 2);
  assert.ok(water.material.uniforms.fogColor.value.isColor);
  assert.match(water.material.fragmentShader, /texture2DProj\(tDiffuse, uv\)/);
  assert.match(water.material.vertexShader, /textureMatrix \* vec4\(position/);
  assert.ok(water.material.fragmentShader.includes(WATER_FLOW_GLSL));
  assert.equal(water.material.uniforms.waterScale.value, 1);
  assert.match(water.material.fragmentShader, /waterFootprint\(flowPosition\)/);
  assert.doesNotThrow(() =>
    water.onBeforeRender(null, { overrideMaterial: {} }, null),
  );

  water.geometry.dispose();
  water.geometry = new THREE.CircleGeometry(2, 32);
  const paddy = new THREE.Mesh(new THREE.PlaneGeometry(5, 6), water.material);
  water.material.uniforms.waterTime.value = 7.25;
  assert.equal(paddy.material.uniforms.waterTime.value, 7.25);
  let disposed = 0;
  water.getRenderTarget().addEventListener("dispose", () => disposed++);
  water.dispose();
  assert.equal(disposed, 1);
  water.geometry.dispose();
  paddy.geometry.dispose();
});

test("open sea retains resolved swell without enlarging sheltered canal waves", () => {
  for (const [width, depth, scale] of [
    [6400, 5600, 24],
    [140, 6, 1],
    [5, 74, 1],
  ]) {
    const surface = createOutdoorWater({ width, depth, color: 0x526e64 });
    assert.equal(surface.material.uniforms.waterScale.value, scale);
    assert.match(
      surface.material.fragmentShader,
      /waterTime \* inversesqrt\(waterScale\)/,
    );
    surface.geometry.dispose();
    surface.dispose();
  }
});

test("physical surfaces and basin clones keep one clock and optional local disturbance", () => {
  const time = { value: 0 };
  const disturbance = { value: new THREE.Vector4(0, 0, 0.45, 0) };
  const original = configureWaterMaterial(new THREE.MeshPhysicalMaterial(), {
    time,
    disturbance,
  });
  const clone = configureWaterMaterial(original.clone(), { time, disturbance });
  for (const material of [original, clone]) {
    const shader = {
      uniforms: {},
      vertexShader: THREE.ShaderLib.physical.vertexShader,
      fragmentShader: THREE.ShaderLib.physical.fragmentShader,
    };
    material.onBeforeCompile(shader);
    assert.equal(shader.uniforms.waterTime, time);
    assert.equal(shader.uniforms.waterDisturbance, disturbance);
    assert.equal(material.userData.time, time);
    assert.ok(shader.fragmentShader.includes(WATER_FLOW_GLSL));
    assert.match(
      shader.vertexShader,
      /waterPosition = \(modelMatrix \* waterVertex\).xyz/,
    );
    assert.match(
      shader.vertexShader,
      /waterVertex = instanceMatrix \* waterVertex/,
    );
    assert.match(shader.fragmentShader, /clearcoatNormal = normal/);
    assert.equal(
      material.customProgramCacheKey(),
      original.customProgramCacheKey(),
    );
    material.dispose();
  }
  time.value = 4.8;
  disturbance.value.set(0, -0.35, 0.45, 1);
  assert.equal(clone.userData.time.value, 4.8);
  assert.equal(clone.userData.disturbance.value.w, 1);
});

test("flow is coherent, footprint-filtered and independent of captures or wall clocks", () => {
  assert.doesNotMatch(WATER_FLOW_GLSL, /sampler|texture2D|Date|random\(/);
  assert.match(WATER_FLOW_GLSL, /waterNoise\(basis \* \(p - drift \* time\)/);
  assert.match(WATER_FLOW_GLSL, /footprint \* frequency/);
  assert.match(
    WATER_FLOW_GLSL,
    /if \(disturbance.w <= 0.0\) return vec3\(0.0\)/,
  );
  assert.match(WATER_FLOW_GLSL, /exp\(-dot\(delta, delta\)/);
});

test("riad reflections, caustics and physical water all use the shared flow", async () => {
  const atmosphere = await readFile(
    new URL(
      "../src/client/environments/riad/riad-atmosphere.js",
      import.meta.url,
    ),
    "utf8",
  );
  const materials = await readFile(
    new URL("../src/client/environments/shared/materials.js", import.meta.url),
    "utf8",
  );
  assert.match(materials, /configureWaterMaterial\(\s*mats\.water\b/);
  assert.match(
    atmosphere,
    /configureWaterMaterial\(\s*material,\s*\{\s*time:\s*waterTime,\s*disturbance,?\s*\},?\s*\)/,
  );
  assert.equal((atmosphere.match(/waterSurface\(/g) ?? []).length, 2);
  assert.match(atmosphere, /mirror.material.uniforms.time = waterTime/);
  assert.match(
    atmosphere,
    /mirror.material.uniforms.waterDisturbance = disturbance/,
  );
  assert.doesNotMatch(
    atmosphere,
    /sin\(r\*46|sin\(p.x\*32|radial and crossing ripples/,
  );
});
