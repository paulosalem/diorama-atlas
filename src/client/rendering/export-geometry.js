import * as THREE from "three";
import { scannedGrainGain } from "../environments/outdoors/outdoor-material-scale.js";

// glTF has no separate alpha map. Preserve its green-channel mask in base color.
export function bakeAlphaMap(material) {
  const mask = material.alphaMap;
  if (!mask) return null;
  const source = material.map;
  for (const texture of [source, mask].filter(Boolean))
    if (
      texture.rotation !== 0 ||
      texture.offset.x !== 0 ||
      texture.offset.y !== 0 ||
      texture.repeat.x !== 1 ||
      texture.repeat.y !== 1 ||
      texture.channel !== 0 ||
      texture.flipY !== mask.flipY
    )
      throw new Error("Alpha-map baking requires matching, untransformed UVs.");
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const context = canvas.getContext("2d");
  context.drawImage(mask.image, 0, 0, 1024, 1024);
  const alpha = context.getImageData(0, 0, 1024, 1024).data;
  context.clearRect(0, 0, 1024, 1024);
  if (source) context.drawImage(source.image, 0, 0, 1024, 1024);
  else {
    context.fillStyle = "white";
    context.fillRect(0, 0, 1024, 1024);
  }
  const pixels = context.getImageData(0, 0, 1024, 1024);
  for (let i = 0; i < pixels.data.length; i += 4)
    pixels.data[i + 3] = Math.round((pixels.data[i + 3] * alpha[i + 1]) / 255);
  context.putImageData(pixels, 0, 0);
  const texture = source?.clone() ?? new THREE.CanvasTexture(canvas);
  texture.image = canvas;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = mask.flipY;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  material.map = texture;
  material.alphaMap = null;
  // The combined mask must retain the patch's UVs, not repeat across the world.
  delete material.userData.metresPerRepeat;
  return texture;
}

export function bakeTintedGrain(material) {
  if (material.userData.diffuseDetailMode !== "tinted-grain") return null;
  const source = material.map.image;
  const gain = scannedGrainGain(source);
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  context.drawImage(source, 0, 0);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const linear = (v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  for (let i = 0; i < image.data.length; i += 4) {
    const luminance =
      linear(image.data[i] / 255) * 0.2126 +
      linear(image.data[i + 1] / 255) * 0.7152 +
      linear(image.data[i + 2] / 255) * 0.0722;
    const value = THREE.MathUtils.clamp(luminance * gain, 0.35, 1.65) / 1.65;
    const encoded = Math.round((1.055 * value ** (1 / 2.4) - 0.055) * 255);
    image.data[i] = image.data[i + 1] = image.data[i + 2] = encoded;
  }
  context.putImageData(image, 0, 0);
  const texture = material.map.clone();
  texture.image = canvas;
  texture.needsUpdate = true;
  material.map = texture;
  material.color.multiplyScalar(1.65);
  return texture;
}

export function selectStudyLevels(group, views, { highest = false } = {}) {
  const cameras = Object.values(views).map(
    (view) => new THREE.Vector3(...view.position),
  );
  const levels = [];
  group.updateMatrixWorld(true);
  group.traverse((object) => {
    if (!object.isLOD) return;
    const position = object.getWorldPosition(new THREE.Vector3());
    const distance = Math.min(
      ...cameras.map((camera) => camera.distanceTo(position)),
    );
    let selected = 0;
    for (let i = 1; i < object.levels.length; i++) {
      if (!highest && distance >= object.levels[i].distance) selected = i;
    }
    object.levels.forEach((level, index) => {
      level.object.visible = index === selected;
    });
    levels.push({ position: position.toArray(), distance, selected });
  });
  return levels;
}

export function bakeProjectionTextures(renderer, runtime) {
  const replacements = new Map();
  for (const target of runtime.impostorTargets ?? []) {
    const pixels = new Uint16Array(target.width * target.height * 4);
    renderer.readRenderTargetPixels(
      target,
      0,
      0,
      target.width,
      target.height,
      pixels,
    );
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    const image = context.createImageData(target.width, target.height);
    for (let i = 0; i < pixels.length; i++) {
      let value = THREE.DataUtils.fromHalfFloat(pixels[i]);
      if (i % 4 !== 3)
        value =
          value <= 0.0031308
            ? value * 12.92
            : 1.055 * value ** (1 / 2.4) - 0.055;
      image.data[i] = Math.round(THREE.MathUtils.clamp(value, 0, 1) * 255);
    }
    context.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    replacements.set(target.texture, texture);
  }
  runtime.group.traverse((object) => {
    if (replacements.has(object.material?.map))
      object.material.map = replacements.get(object.material.map);
  });
  return [...replacements.values()];
}

// Keep instance transforms and colors portable without expanding hundreds of
// thousands of objects in importers that do not support GPU-instanced prefabs.
export function extractInstances(group) {
  const meshes = [];
  group.traverseVisible((object) => {
    if (object.isInstancedMesh) meshes.push(object);
  });
  const count = meshes.reduce((sum, mesh) => sum + mesh.count, 0);
  const binary = new ArrayBuffer(count * 20 * 4);
  const data = new Float32Array(binary);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  const groups = [];
  let offset = 0;
  for (const [index, original] of meshes.entries()) {
    original.computeBoundingBox();
    const bounds = original.boundingBox
      .clone()
      .applyMatrix4(original.matrixWorld);
    const name = `study-instances-${index}`;
    const matrixOffset = offset * 4;
    for (let i = 0; i < original.count; i++) {
      original.getMatrixAt(i, matrix);
      matrix.premultiply(original.matrixWorld);
      matrix.toArray(data, offset);
      offset += 16;
    }
    const colorOffset = offset * 4;
    for (let i = 0; i < original.count; i++) {
      if (original.instanceColor) original.getColorAt(i, color);
      else color.setRGB(1, 1, 1);
      data.set([color.r, color.g, color.b, 1], offset);
      offset += 4;
    }
    groups.push({
      name,
      count: original.count,
      matrixOffset,
      colorOffset,
      boundsCenter: bounds.getCenter(new THREE.Vector3()).toArray(),
      boundsSize: bounds.getSize(new THREE.Vector3()).toArray(),
    });
    const mesh = new THREE.Mesh(original.geometry, original.material);
    mesh.name = name;
    group.add(mesh);
    original.removeFromParent();
  }
  return { groups, binary, count };
}

export function download(data, name, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
