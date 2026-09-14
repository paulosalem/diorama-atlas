import { TranslatableError } from "../../localization/errors.js";

let library;

export async function loadAudioLibrary() {
  if (!library) {
    library = fetch("/public/audio/manifest.json", {
      signal: AbortSignal.timeout(20_000),
    })
      .then(async (response) => {
        if (!response.ok)
          throw new TranslatableError(
            "Audio credits could not load ({status}).",
            { status: response.status },
          );
        const manifest = await response.json();
        if (!Array.isArray(manifest.assets))
          throw new Error("The audio library has no asset list.");
        const ids = new Set();
        for (const asset of manifest.assets) {
          if (
            !asset.id ||
            ids.has(asset.id) ||
            !asset.file?.startsWith("/public/audio/") ||
            !asset.title ||
            !asset.creator ||
            !asset.license ||
            !asset.sourceUrl ||
            !asset.licenseUrl
          )
            throw new Error(
              "The audio library has incomplete or duplicate credits.",
            );
          ids.add(asset.id);
        }
        return manifest.assets;
      })
      .catch((error) => {
        library = null;
        throw error;
      });
  }
  return library;
}
