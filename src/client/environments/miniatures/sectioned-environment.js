import * as THREE from "three";
import { sectionGeometry, boxPlanes } from "../shared/section-geometry.js";

/** Physically cut static solids; keep living assemblies and their animation owners intact. */
export function sectionEnvironment(
  runtime,
  definitions,
  { convertWater = true, placement = () => null } = {},
) {
  const owned = new Set();
  const sections = definitions.map(({ min, max, offset = [0, 0, 0], name }) => {
    const group = new THREE.Group();
    group.name = name;
    const box = new THREE.Box3(
      new THREE.Vector3(...min),
      new THREE.Vector3(...max),
    );
    return { group, box, planes: boxPlanes(box), offset };
  });
  const root = runtime.group;
  root.updateMatrixWorld(true);
  const drawables = [];
  root.traverse((object) => {
    if (object.isLOD)
      object.levels.forEach((level, index) => {
        level.object.visible = index === 0;
      });
  });
  root.traverseVisible((object) => {
    if (
      object.isMesh &&
      (object.parent === root ||
        object.isInstancedMesh ||
        object.isReflector ||
        placement(object) !== null)
    )
      drawables.push(object);
  });
  const center = new THREE.Vector3(),
    matrix = new THREE.Matrix4(),
    color = new THREE.Color();
  function cut(geometry, material, world, section, source, tint) {
    const transformed = geometry.clone().applyMatrix4(world);
    transformed.computeBoundingBox();
    if (!section.box.intersectsBox(transformed.boundingBox)) {
      transformed.dispose();
      return;
    }
    let result;
    if (section.box.containsBox(transformed.boundingBox)) result = transformed;
    else {
      result = sectionGeometry(transformed, section.planes);
      transformed.dispose();
    }
    if (!result.attributes.position.count) {
      result.dispose();
      return;
    }
    if (tint) {
      const original = material;
      material = original.clone();
      material.onBeforeCompile = original.onBeforeCompile;
      material.customProgramCacheKey = original.customProgramCacheKey;
      material.color.multiply(tint);
      owned.add(material);
    }
    const mesh = new THREE.Mesh(result, material);
    mesh.name = source.name;
    mesh.castShadow = source.castShadow;
    mesh.receiveShadow = source.receiveShadow;
    mesh.renderOrder = source.renderOrder;
    owned.add(result);
    section.group.add(mesh);
  }
  for (const object of drawables) {
    const assigned = placement(object);
    if (assigned !== null) {
      sections[assigned].group.attach(object);
      continue;
    }
    if (object.isReflector && !convertWater) continue;
    if (object.geometry.attributes.position.usage === THREE.DynamicDrawUsage)
      continue;
    if (object.isInstancedMesh) {
      object.geometry.computeBoundingBox();
      for (const section of sections) {
        const entries = [],
          colors = [];
        for (let i = 0; i < object.count; i++) {
          object.getMatrixAt(i, matrix);
          matrix.premultiply(object.matrixWorld);
          const bounds = object.geometry.boundingBox
            .clone()
            .applyMatrix4(matrix);
          if (!section.box.intersectsBox(bounds)) continue;
          const tint = object.instanceColor
            ? (object.getColorAt(i, color), color.clone())
            : null;
          if (section.box.containsBox(bounds)) {
            entries.push(matrix.clone());
            colors.push(tint);
          } else
            cut(
              object.geometry,
              object.material,
              matrix,
              section,
              object,
              tint,
            );
        }
        if (entries.length) {
          const mesh = new THREE.InstancedMesh(
            object.geometry,
            object.material,
            entries.length,
          );
          entries.forEach((entry, index) => {
            mesh.setMatrixAt(index, entry);
            if (colors[index]) mesh.setColorAt(index, colors[index]);
          });
          mesh.castShadow = object.castShadow;
          mesh.receiveShadow = object.receiveShadow;
          mesh.name = object.name;
          section.group.add(mesh);
          owned.add(mesh);
        }
      }
    } else {
      let material = object.material;
      if (object.isReflector) {
        material = new THREE.MeshStandardMaterial({
          color: object.material.uniforms.color?.value ?? 0x536f69,
          roughness: 0.2,
          metalness: 0.15,
        });
        material.userData.nativeWater = true;
        owned.add(material);
      }
      if (Array.isArray(material)) {
        for (const group of object.geometry.groups) {
          const geometry = object.geometry.clone();
          const indices = Array.from({ length: group.count }, (_, i) =>
            geometry.index
              ? geometry.index.getX(group.start + i)
              : group.start + i,
          );
          geometry.setIndex(indices);
          geometry.clearGroups();
          for (const section of sections)
            cut(
              geometry,
              material[group.materialIndex],
              object.matrixWorld,
              section,
              object,
            );
          geometry.dispose();
        }
      } else {
        for (const section of sections)
          cut(object.geometry, material, object.matrixWorld, section, object);
      }
    }
    object.removeFromParent();
    if (object.isInstancedMesh) object.dispose();
  }
  for (const object of [...root.children]) {
    if (object.isLight || (!object.isGroup && !object.isMesh)) continue;
    const bounds = new THREE.Box3().setFromObject(object);
    if (bounds.isEmpty()) continue;
    bounds.getCenter(center);
    const section = sections.find(({ box }) => box.containsPoint(center));
    if (section) section.group.attach(object);
    else object.removeFromParent();
  }
  for (const section of sections) {
    root.add(section.group);
    section.group.position.fromArray(section.offset);
  }
  root.updateMatrixWorld(true);
  return {
    sections,
    own(resource) {
      owned.add(resource);
      return resource;
    },
    dispose() {
      owned.forEach((resource) => resource.dispose());
    },
  };
}
