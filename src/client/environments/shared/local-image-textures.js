import * as THREE from "three";

/** Local image assets share readiness, color management and lifetime with their scene. */
export function createLocalImageTextures(renderer, pending, resources) {
  const loader = new THREE.TextureLoader(),
    textures = new Map();
  const anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  return (url, { data = false, repeat = false } = {}) => {
    if (
      typeof url !== "string" ||
      !url.startsWith("/public/") ||
      url.includes("..")
    )
      throw new Error(
        "Scene image textures must use a published local asset path.",
      );
    const key = `${url}/${data}/${repeat}`;
    if (!textures.has(key)) {
      let resolve, reject;
      pending.push(
        new Promise((yes, no) => {
          resolve = yes;
          reject = no;
        }),
      );
      const texture = loader.load(url, resolve, undefined, () =>
        reject(new Error(`Image asset could not be loaded: ${url}`)),
      );
      texture.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      texture.anisotropy = anisotropy;
      if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      resources.add(texture);
      textures.set(key, texture);
    }
    return textures.get(key);
  };
}
