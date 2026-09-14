import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

export function createPathConfig({
  rootDir = projectRoot,
  cacheDir = process.env.ATLAS_CACHE_DIR || ".cache",
  bundledSceneDir = "data/scenes",
} = {}) {
  const root = path.resolve(projectRoot, rootDir);
  const cache = path.resolve(root, cacheDir);
  return {
    rootDir: root,
    cacheDir: cache,
    conceptCacheDir: path.join(cache, "concepts"),
    narrationCacheDir: path.join(cache, "narration"),
    generatedSceneDir: path.join(cache, "generated-scenes"),
    textureCacheDir: path.join(cache, "textures"),
    bundledSceneDir: bundledSceneDir
      ? path.resolve(root, bundledSceneDir)
      : null,
  };
}

export function cacheFileForId(directory, id, extension) {
  if (typeof id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) {
    const error = new Error("Invalid asset identifier.");
    error.statusCode = 400;
    throw error;
  }
  return path.join(directory, `${id}${extension}`);
}
