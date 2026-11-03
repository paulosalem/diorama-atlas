import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Bake three projections of the actual leaf geometry; keep that geometry for close views. */
export function createFoliageImpostor(renderer, geometry, material, lights) {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox,
    center = bounds.getCenter(new THREE.Vector3()),
    size = bounds.getSize(new THREE.Vector3()),
    width = Math.hypot(size.x, size.z) * 1.05,
    height = size.y * 1.05,
    distance = Math.max(size.length(), 1);
  if (!Number.isFinite(width + height) || width <= 0 || height <= 0)
    throw new Error("Foliage projections require nonempty finite geometry.");
  const target = new THREE.WebGLRenderTarget(384, 128, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: true,
  });
  const pieces = [];
  for (let view = 0; view < 3; view++) {
    const plane = new THREE.PlaneGeometry(width, height);
    const uv = plane.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setX(i, (view + 0.01 + uv.getX(i) * 0.98) / 3);
    plane.rotateY((view * Math.PI) / 3);
    plane.translate(...center.toArray());
    pieces.push(plane);
  }
  const farGeometry = mergeGeometries(pieces);
  pieces.forEach((piece) => piece.dispose());
  const farMaterial = new THREE.MeshBasicMaterial({
    map: target.texture,
    side: THREE.DoubleSide,
    alphaTest: 0.02,
    alphaHash: true,
  });
  farMaterial.userData.photographicFoliage = "baked-leaf-cluster";
  function prepare() {
    const scene = new THREE.Scene(),
      sourceMaterial = material.clone();
    sourceMaterial.alphaHash = false;
    sourceMaterial.alphaTest = 0.2;
    scene.add(new THREE.Mesh(geometry, sourceMaterial));
    for (const source of lights) {
      const light = source.clone();
      light.castShadow = false;
      scene.add(light);
      if (light.target) scene.add(light.target);
    }
    const previous = {
      target: renderer.getRenderTarget(),
      cubeFace: renderer.getActiveCubeFace(),
      mipLevel: renderer.getActiveMipmapLevel(),
      clear: renderer.getClearColor(new THREE.Color()),
      alpha: renderer.getClearAlpha(),
      toneMapping: renderer.toneMapping,
      autoClear: renderer.autoClear,
      shadows: renderer.shadowMap.enabled,
    };
    try {
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.shadowMap.enabled = false;
      renderer.autoClear = false;
      target.viewport.set(0, 0, target.width, target.height);
      target.scissorTest = false;
      renderer.setRenderTarget(target);
      renderer.setClearColor(0, 0);
      renderer.clear();
      for (let view = 0; view < 3; view++) {
        const angle = (view * Math.PI) / 3;
        const camera = new THREE.OrthographicCamera(
          -width / 2,
          width / 2,
          height / 2,
          -height / 2,
          distance * 0.01,
          distance * 2,
        );
        camera.position
          .copy(center)
          .add(
            new THREE.Vector3(
              Math.sin(angle) * distance,
              0,
              Math.cos(angle) * distance,
            ),
          );
        camera.lookAt(center);
        // Render-target coordinates are physical pixels, independent of display density.
        target.viewport.set(view * 128, 0, 128, 128);
        target.scissor.copy(target.viewport);
        target.scissorTest = true;
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
      }
    } finally {
      renderer.setRenderTarget(
        previous.target,
        previous.cubeFace,
        previous.mipLevel,
      );
      renderer.setClearColor(previous.clear, previous.alpha);
      renderer.toneMapping = previous.toneMapping;
      renderer.autoClear = previous.autoClear;
      renderer.shadowMap.enabled = previous.shadows;
      sourceMaterial.dispose();
    }
  }
  return { geometry: farGeometry, material: farMaterial, target, prepare };
}
