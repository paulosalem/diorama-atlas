import { sitePath } from "../site.js";

export function findNarrationRecording(assets, locale, text) {
  return (
    assets.find((asset) => asset.locale === locale && asset.text === text) ??
    null
  );
}

export function isSceneNarration(asset) {
  return (
    !asset.view?.startsWith("detail-") && !asset.view?.startsWith("miniature-")
  );
}

let library;
export async function loadNarrationLibrary() {
  if (!library) {
    library = fetch(sitePath("/public/narration/manifest.json"))
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Narration manifest: HTTP ${response.status}`);
        const manifest = await response.json();
        if (manifest.version !== 1 || !Array.isArray(manifest.assets))
          throw new Error("Invalid narration manifest.");
        const ids = new Set();
        const keys = new Set();
        for (const asset of manifest.assets) {
          const key = `${asset.scene}/${asset.view ?? "intro"}/${asset.locale}`;
          if (
            typeof asset.id !== "string" ||
            typeof asset.scene !== "string" ||
            !asset.scene.trim() ||
            (asset.view !== undefined &&
              (typeof asset.view !== "string" || !asset.view.trim())) ||
            !["en-US", "pt-BR"].includes(asset.locale) ||
            !/^\/public\/narration\/[a-zA-Z0-9-]+\.mp3$/.test(asset.file) ||
            typeof asset.text !== "string" ||
            !asset.text.trim() ||
            typeof asset.title !== "string" ||
            !asset.title.trim() ||
            ids.has(asset.id) ||
            keys.has(key)
          )
            throw new Error(`Invalid narration asset: ${asset.id}`);
          ids.add(asset.id);
          keys.add(key);
        }
        return manifest.assets.map((asset) => ({
          ...asset,
          file: sitePath(asset.file),
        }));
      })
      .catch((error) => {
        library = null;
        throw error;
      });
  }
  return library;
}
