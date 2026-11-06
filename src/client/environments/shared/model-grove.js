import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { sitePath } from "../../site.js";

export function createModelGrove(renderer, { url, plantings, cellSize = 24 }) {
  if (
    !url.startsWith("/public/") ||
    !Number.isFinite(cellSize) ||
    cellSize <= 0 ||
    plantings.some(
      ({ position, height, angle }) =>
        position.length !== 3 ||
        !position.every(Number.isFinite) ||
        !Number.isFinite(height) ||
        height <= 0 ||
        !Number.isFinite(angle),
    )
  )
    throw new Error(
      "A model grove needs a local asset and finite, positive plantings.",
    );
  const group = new THREE.Group();
  group.name = "Instanced botanical models";
  const resources = new Set(),
    images = new Set(),
    instances = new Set();
  let disposed = false;
  const release = () => {
    resources.forEach((resource) => resource.dispose());
    images.forEach((image) => image.close());
    instances.forEach((instance) => instance.dispose());
    resources.clear();
    images.clear();
    instances.clear();
  };
  const ready = new GLTFLoader().loadAsync(sitePath(url)).then(({ scene }) => {
    scene.updateMatrixWorld(true);
    scene.traverse((object) => {
      if (!object.isMesh) return;
      resources.add(object.geometry);
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        resources.add(material);
        for (const value of Object.values(material)) {
          if (!value?.isTexture) continue;
          resources.add(value);
          value.anisotropy = Math.min(
            8,
            renderer.capabilities.getMaxAnisotropy(),
          );
          if (typeof value.image?.close === "function") images.add(value.image);
        }
      }
    });
    if (disposed) {
      release();
      return;
    }
    const variants = scene.children;
    const transform = new THREE.Object3D();
    try {
      variants.forEach((variant, variantIndex) => {
        const bounds = new THREE.Box3().setFromObject(variant);
        const height = bounds.max.y - bounds.min.y;
        if (!Number.isFinite(height) || height <= 0)
          throw new Error(`The botanical model has no physical height: ${url}`);
        const center = bounds.getCenter(new THREE.Vector3());
        const selected = plantings.filter(
          (_, i) => i % variants.length === variantIndex,
        );
        if (!selected.length) return;
        const cells = new Map();
        for (const planting of selected) {
          const [x, , z] = planting.position;
          const key = `${Math.floor(x / cellSize)}/${Math.floor(z / cellSize)}`;
          if (!cells.has(key)) cells.set(key, []);
          cells.get(key).push(planting);
        }
        variant.traverse((part) => {
          if (!part.isMesh) return;
          const geometry = part.geometry.clone();
          resources.add(geometry);
          geometry.applyMatrix4(part.matrixWorld);
          geometry.translate(-center.x, -bounds.min.y, -center.z);
          geometry.scale(1 / height, 1 / height, 1 / height);
          for (const cell of cells.values()) {
            const mesh = new THREE.InstancedMesh(
              geometry,
              part.material,
              cell.length,
            );
            instances.add(mesh);
            cell.forEach((planting, i) => {
              transform.position.set(...planting.position);
              transform.rotation.y = planting.angle;
              transform.scale.setScalar(planting.height);
              transform.updateMatrix();
              mesh.setMatrixAt(i, transform.matrix);
            });
            mesh.instanceMatrix.needsUpdate = true;
            mesh.castShadow = mesh.receiveShadow = true;
            mesh.computeBoundingSphere();
            group.add(mesh);
          }
        });
      });
    } catch (error) {
      release();
      throw error;
    }
  });
  return {
    group,
    ready,
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      group.clear();
      release();
    },
  };
}
