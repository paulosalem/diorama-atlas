import * as THREE from "three";

/** Place a joint-free board sample along each member, at a consistent physical scale. */
export function mapTimberSurfaces(
  root,
  materials,
  { length = 2.4, width = 0.15 } = {},
) {
  const wood = new Set(materials);
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (!object.isMesh || !wood.has(object.material)) return;
    const geometry = object.geometry;
    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new THREE.Vector3()).toArray();
    const axis = object.userData.timberAxis ?? size.indexOf(Math.max(...size));
    const across = [0, 1, 2].filter((value) => value !== axis);
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    const offset = new THREE.Vector3().setFromMatrixPosition(
      object.matrixWorld,
    );
    const phase =
      Math.sin(offset.x * 17.3 + offset.y * 31.7 + offset.z * 11.1) * 2.71;
    for (let i = 0; i < position.count; i++) {
      const end = Math.abs(normal.getComponent(i, axis)) > 0.85;
      const cross =
        Math.abs(normal.getComponent(i, across[0])) > 0.7
          ? across[1]
          : across[0];
      uv.setXY(
        i,
        position.getComponent(i, end ? across[0] : axis) / length + phase,
        position.getComponent(i, end ? across[1] : cross) / width + 0.5,
      );
    }
    uv.needsUpdate = true;
  });
}
