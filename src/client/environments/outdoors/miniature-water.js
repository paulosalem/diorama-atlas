import * as THREE from "three";
import { createOutdoorWater } from "./outdoor-water.js";

const sameMatrix = (a, b) =>
  a.elements.every(
    (value, index) => Math.abs(value - b.elements[index]) < 1e-8,
  );

/** Reflect authored water footprints, including an optional dry, moving boat hull. */
export function createMiniatureWater(runtime, scene, background) {
  runtime.group.updateMatrixWorld(true);
  const originals = [];
  runtime.group.traverse((mesh) => {
    if (mesh.material?.userData.nativeWater) originals.push(mesh);
  });
  const hull = runtime.waterExclusion;
  const boat = hull && runtime.group.getObjectByName(hull.name);
  if (hull && !boat) throw new Error("The river's boat hull is missing.");
  let time = 0,
    captures = 0;
  const surfaces = originals.map((original) => {
    const world = original.geometry.clone().applyMatrix4(original.matrixWorld);
    world.computeBoundingBox();
    const bounds = world.boundingBox;
    const size = bounds.getSize(new THREE.Vector3());
    if (size.y > 0.02) {
      world.dispose();
      throw new Error(
        "A miniature reflection needs a horizontal water surface.",
      );
    }
    const height = bounds.min.y;
    world.translate(0, -height, 0).rotateX(Math.PI / 2);
    const surface = createOutdoorWater({
      width: size.x,
      depth: size.z,
      color: original.material.color,
      geometry: world,
      hull,
    });
    surface.name = "Miniature water reflection";
    surface.position.y = height;
    const reflect = surface.onBeforeRender;
    const cameraWorld = new THREE.Matrix4(),
      projection = new THREE.Matrix4();
    let capturedTick = -1;
    surface.onBeforeRender = (renderer, renderedScene, camera) => {
      if (renderedScene.overrideMaterial) return;
      const tick = Math.floor(time * 30);
      if (
        tick === capturedTick &&
        sameMatrix(cameraWorld, camera.matrixWorld) &&
        sameMatrix(projection, camera.projectionMatrix)
      )
        return;
      const previous = scene.background;
      // Terraces at different elevations must not recursively capture each other.
      const visible = surfaces.map((water) => water.visible);
      surfaces.forEach((water) => {
        water.visible = false;
      });
      scene.background = background;
      try {
        reflect(renderer, renderedScene, camera);
        cameraWorld.copy(camera.matrixWorld);
        projection.copy(camera.projectionMatrix);
        capturedTick = tick;
        captures++;
      } finally {
        scene.background = previous;
        surfaces.forEach((water, index) => {
          water.visible = visible[index];
        });
      }
    };
    original.removeFromParent();
    runtime.group.add(surface);
    return surface;
  });
  return {
    surfaces,
    get captures() {
      return captures;
    },
    update(value) {
      time = value;
      boat?.updateWorldMatrix(true, false);
      for (const surface of surfaces) {
        const uniforms = surface.material.uniforms;
        uniforms.waterTime.value = time;
        if (boat) uniforms.hullInverse.value.copy(boat.matrixWorld).invert();
      }
    },
    dispose() {
      for (const surface of surfaces) {
        surface.removeFromParent();
        surface.geometry.dispose();
        surface.dispose();
      }
    },
  };
}
