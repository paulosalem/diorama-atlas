import * as THREE from "three";

export function inspectGeometry(group) {
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  const materials = new Set();
  let meshes = 0,
    instances = 0,
    vertices = 0,
    triangles = 0;
  let finiteGeometry = true;
  group.traverseVisible((mesh) => {
    if (!mesh.isMesh) return;
    meshes++;
    const geometry = mesh.geometry;
    const count = mesh.isInstancedMesh ? mesh.count : 1;
    instances += mesh.isInstancedMesh ? count : 0;
    vertices += geometry.attributes.position.count * count;
    triangles +=
      ((geometry.index?.count ?? geometry.attributes.position.count) / 3) *
      count;
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material])
      materials.add(material);
    const arrays = Object.values(geometry.attributes).map(
      (attribute) => attribute.array,
    );
    arrays.push(mesh.matrixWorld.elements);
    if (mesh.isInstancedMesh) arrays.push(mesh.instanceMatrix.array);
    let finiteMesh = true;
    for (const array of arrays)
      for (const value of array)
        if (!Number.isFinite(value)) finiteMesh = false;
    if (!finiteMesh) {
      finiteGeometry = false;
      return;
    }
    if (mesh.isInstancedMesh) mesh.computeBoundingBox();
    else geometry.computeBoundingBox();
    bounds.union(
      (mesh.isInstancedMesh ? mesh.boundingBox : geometry.boundingBox)
        .clone()
        .applyMatrix4(mesh.matrixWorld),
    );
  });
  const box = { min: bounds.min.toArray(), max: bounds.max.toArray() };
  finiteGeometry &&= [...box.min, ...box.max].every(Number.isFinite);
  return {
    meshes,
    instances,
    vertices,
    triangles,
    materials: materials.size,
    finiteGeometry,
    bounds: box,
  };
}

export function probeGeometry(
  group,
  origin,
  direction,
  length,
  { windowSightline = false } = {},
) {
  group.updateMatrixWorld(true);
  const meshes = [];
  group.traverseVisible((mesh) => {
    if (!mesh.isMesh) return;
    if (
      windowSightline &&
      mesh.name === "Window glazing" &&
      mesh.material.transparent &&
      mesh.material.opacity < 1
    )
      return;
    meshes.push(mesh);
  });
  const ray = new THREE.Raycaster(
    new THREE.Vector3(...origin),
    new THREE.Vector3(...direction).normalize(),
    0,
    length,
  );
  return ray.intersectObjects(meshes, false)[0]?.distance ?? null;
}
