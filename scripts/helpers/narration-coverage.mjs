import { readdir, readFile } from "node:fs/promises";
import {
  curatedScenes,
  interiorDraftScenes,
} from "../../src/client/catalog/scene-catalog.js";
import {
  outdoorScenes,
  outdoorDraftScenes,
} from "../../src/client/catalog/outdoor-catalog.js";
import {
  miniatureContent,
  sceneMiniatureContent,
} from "../../src/client/localization/miniature-content.js";
import {
  getLocale,
  setLocale,
  t,
  SUPPORTED_LOCALES,
} from "../../src/client/localization/locale.js";

export async function bundledNarrationScenes({ includeDrafts = false } = {}) {
  const directory = new URL("../../data/scenes/", import.meta.url);
  const saved = await Promise.all(
    (await readdir(directory))
      .filter((name) => name.endsWith(".json"))
      .map(
        async (name) =>
          JSON.parse(await readFile(new URL(name, directory), "utf8")).scene,
      ),
  );
  return [
    ...curatedScenes,
    ...saved,
    ...outdoorScenes,
    ...(includeDrafts ? [...interiorDraftScenes, ...outdoorDraftScenes] : []),
  ];
}

export function supplementalNarration(scenes, originals) {
  const previous = getLocale();
  const passages = [];
  try {
    for (const scene of scenes) {
      const narration = originals.filter((asset) => asset.scene === scene.id);
      for (const locale of SUPPORTED_LOCALES) {
        setLocale(locale);
        const add = (view, title, text) =>
          passages.push({
            id: `${scene.id}-${view}-${locale}`,
            scene: scene.id,
            view,
            locale,
            title,
            text,
          });
        for (const detail of scene.details)
          add(`detail-${detail.id}`, t(detail.title), t(detail.body));
        if (scene.miniatureNarration) {
          for (const [key, source] of Object.entries(
            scene.miniatureNarration,
          )) {
            const passage = source.startsWith("detail-")
              ? passages.find(
                  (asset) =>
                    asset.scene === scene.id &&
                    asset.locale === locale &&
                    asset.view === source,
                )
              : narration.find(
                  (asset) =>
                    asset.locale === locale &&
                    (asset.view ?? "intro") === source,
                );
            if (!passage)
              throw new Error(
                `Missing miniature passage: ${scene.id}/${key}/${locale}`,
              );
            add(`miniature-${key}`, passage.title, passage.text);
          }
        } else if (scene.id === "douro-vineyard") {
          for (const key of Object.keys(
            miniatureContent(locale, "whole").views,
          )) {
            const text = miniatureContent(locale, key);
            add(`miniature-${key}`, text.heading, text.body);
          }
        } else {
          const text = sceneMiniatureContent(
            locale,
            "whole",
            scene,
            { whole: { label: "The whole piece" } },
            narration,
          );
          add("miniature-whole", text.heading, text.body);
        }
      }
    }
  } finally {
    setLocale(previous);
  }
  return passages;
}
