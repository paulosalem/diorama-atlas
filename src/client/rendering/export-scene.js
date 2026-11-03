import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { buildRiadEnvironment } from "../environments/riad/riad-scene.js";
import { curatedScenes } from "../catalog/scene-catalog.js";
import { surfacePatinaParameters } from "../environments/shared/surface-patina.js";
import {
  outdoorScenes,
  outdoorDraftScenes,
} from "../catalog/outdoor-catalog.js";
import { outdoorBuilders } from "../environments/outdoors/outdoor-scenes.js";
import { buildDouroMiniature } from "../environments/outdoors/douro-miniature.js";
import {
  bakeAlphaMap,
  bakeProjectionTextures,
  bakeTintedGrain,
  download,
  extractInstances,
  selectStudyLevels,
} from "./export-geometry.js";

export async function exportScene(study) {
  const renderer = new THREE.WebGLRenderer();
  const definition = structuredClone(
    [...curatedScenes, ...outdoorScenes, ...outdoorDraftScenes].find(
      (scene) => scene.id === study.sceneId,
    ),
  );
  const builder = study.miniature
    ? buildDouroMiniature
    : study.outdoor
      ? outdoorBuilders[study.sceneId]
      : buildRiadEnvironment;
  const runtime = builder(definition, renderer);
  await runtime.ready;
  runtime.animations.forEach((animate) => animate(0, 0));
  const levels = selectStudyLevels(runtime.group, runtime.views, {
    highest: Boolean(study.miniature),
  });
  const projections = bakeProjectionTextures(renderer, runtime);
  const instances = extractInstances(runtime.group);
  const shaderWater = [];
  runtime.group.traverseVisible((object) => {
    if (object.material?.uniforms?.waterTime) shaderWater.push(object);
  });
  for (const original of shaderWater) {
    const material = new THREE.MeshStandardMaterial({
      color: original.material.uniforms.color.value,
      roughness: 0.12,
      metalness: 0.08,
    });
    material.userData = { nativeWater: true, patinaProfile: "none" };
    const water = new THREE.Mesh(original.geometry, material);
    original.matrixWorld.decompose(
      water.position,
      water.quaternion,
      water.scale,
    );
    runtime.group.add(water);
    original.removeFromParent();
  }
  const excluded = [];
  const materials = new Map();
  const bakedMaps = [];
  let nodeIndex = 0;
  const lights = [];
  runtime.group.updateMatrixWorld(true);
  runtime.group.traverseVisible((object) => {
    object.name ||= `study-${nodeIndex++}`;
    if (object.isLight) {
      lights.push({
        type: object.type,
        color: object.color.toArray(),
        intensity: object.intensity,
        position: object.getWorldPosition(new THREE.Vector3()).toArray(),
        distance: object.distance,
      });
      excluded.push(object);
    }
    if (object.isPoints || object.material?.isShaderMaterial)
      excluded.push(object);
    if (!object.isMesh || object.material?.isShaderMaterial) return;
    const material = object.material;
    if (!materials.has(material)) {
      const baked = bakeTintedGrain(material);
      if (baked) bakedMaps.push(baked);
      const alpha = bakeAlphaMap(material);
      if (alpha) bakedMaps.push(alpha);
      const water = Boolean(
        material.userData.time || material.userData.nativeWater,
      );
      const patina = surfacePatinaParameters(
        material,
        definition,
        runtime.views,
      );
      material.name = water
        ? `water-${materials.size}`
        : `material-${materials.size}`;
      materials.set(material, {
        name: material.name,
        water,
        leaf: material.customProgramCacheKey?.() === "riad-citrus-breeze",
        wind:
          material.userData.nativeWind ??
          (material.userData.photographicFoliage === "grape"
            ? {
                anchor: material.map?.image?.src?.includes("autumn")
                  ? [0.5, 0.1]
                  : [0.513, 0.31],
              }
            : null),
        unlit: Boolean(material.isMeshBasicMaterial),
        masked: Boolean(alpha),
        metresPerRepeat: material.userData.metresPerRepeat ?? null,
        patina,
      });
    }
    if (
      materials.get(material).patina &&
      object.geometry.hasAttribute("atlasObjectSeed") &&
      !object.geometry.hasAttribute("uv1")
    ) {
      const seeds = object.geometry.getAttribute("atlasObjectSeed");
      const uv = new Float32Array(seeds.count * 2);
      for (let i = 0; i < seeds.count; i++) uv[i * 2] = seeds.getX(i);
      object.geometry.setAttribute("uv1", new THREE.BufferAttribute(uv, 2));
    }
    object.userData = {};
    object.geometry.userData = {};
    for (const texture of Object.values(material).filter(
      (value) => value?.isTexture,
    )) {
      texture.userData = {};
    }
  });
  excluded.forEach((object) => object.removeFromParent());
  const clips = [];
  const moving = [];
  runtime.group.traverseVisible((object) => {
    if (
      object.isMesh &&
      object.geometry.type === "PlaneGeometry" &&
      !object.isInstancedMesh
    )
      moving.push(object);
  });
  // Sample only genuinely deforming meshes; preserve linen's authored shape/movement.
  for (const mesh of moving) {
    const original = mesh.geometry.attributes.position.array.slice();
    runtime.animations.forEach((animate) => animate(0, 2));
    const changed = mesh.geometry.attributes.position.array.some(
      (value, i) => value !== original[i],
    );
    runtime.animations.forEach((animate) => animate(0, 0));
    if (!changed) continue;
    const targets = [];
    for (let frame = 0; frame < 8; frame++) {
      runtime.animations.forEach((animate) => animate(0, frame));
      targets.push(mesh.geometry.attributes.position.clone());
    }
    runtime.animations.forEach((animate) => animate(0, 0));
    mesh.geometry.morphAttributes.position = targets;
    mesh.updateMorphTargets();
    const tracks = targets.map(
      (_, index) =>
        new THREE.NumberKeyframeTrack(
          `${mesh.name}.morphTargetInfluences[${index}]`,
          Array.from({ length: 9 }, (_, i) => i),
          Array.from({ length: 9 }, (_, i) => Number(i % 8 === index)),
        ),
    );
    clips.push(new THREE.AnimationClip(`Linen ${mesh.name}`, 8, tracks));
  }
  const exporter = new GLTFExporter();
  // Shader uniforms contain live THREE objects; glTF extras must be plain JSON.
  for (const material of materials.keys()) material.userData = {};
  const result = await exporter.parseAsync(runtime.group, {
    binary: true,
    maxTextureSize: 1024,
    animations: clips,
    onlyVisible: true,
  });
  if (instances.count)
    download(instances.binary, "instances.bin", "application/octet-stream");
  download(result, study.model, "model/gltf-binary");
  const manifest = {
    study,
    views: runtime.views,
    lights,
    materials: [...materials.values()],
    bytes: result.byteLength,
    instanceGroups: instances.groups,
    instances: instances.count,
    instanceBytes: instances.binary.byteLength,
    levels,
    lodPolicy: study.miniature
      ? "Highest authored detail throughout the bounded miniature, including freely orbitable parts."
      : "Highest authored detail required by any matched camera; viewpoints rotate in place, not free-flight.",
    projections: projections.length,
    animations: clips.map((clip) => clip.name),
    ...(runtime.miniature
      ? {
          miniature: runtime.miniature,
          motions: runtime.motions,
          waterExclusion: runtime.waterExclusion,
          depthProbes: runtime.depthProbes,
        }
      : {}),
    omitted:
      "Three.js shader effects are rebuilt in each destination engine, not exported as frozen geometry.",
  };
  runtime.dispose();
  projections.forEach((texture) => texture.dispose());
  bakedMaps.forEach((texture) => texture.dispose());
  renderer.dispose();
  return manifest;
}
