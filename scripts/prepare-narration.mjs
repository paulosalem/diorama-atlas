import { readFile, writeFile, rename } from "node:fs/promises";
import { parseArgs } from "node:util";
import {
  bundledNarrationScenes,
  supplementalNarration,
} from "./helpers/narration-coverage.mjs";

const { values } = parseArgs({
  options: { write: { type: "boolean" }, help: { type: "boolean" } },
});
if (values.help) {
  console.log(`Prepare missing bilingual miniature and object-detail narration.
Usage: node scripts/prepare-narration.mjs [--write]
Without --write, reports the missing passages without changing anything.
Exact existing text in the same language is reused across views and places.
--write appends missing recipes; it never requests paid audio or replaces recordings.
Then run generate-opening-narration.mjs --all-scenes --all-views with explicit
model, voice, languages, --max-cost-usd and --budget-file.`);
  process.exit(0);
}
const path = new URL("./prompts/opening-narration.json", import.meta.url);
const recipes = JSON.parse(await readFile(path, "utf8"));
const known = new Set(
  recipes.assets.map((asset) => `${asset.locale}\0${asset.text}`),
);
const passages = supplementalNarration(
  await bundledNarrationScenes(),
  recipes.assets,
);
const additions = [];
for (const passage of passages) {
  const key = `${passage.locale}\0${passage.text}`;
  if (known.has(key)) continue;
  if (recipes.assets.some((asset) => asset.id === passage.id))
    throw new Error(
      `Changed narration ${passage.id}; preserve its earlier provenance before replacing it.`,
    );
  additions.push(passage);
  known.add(key);
}
console.log(
  JSON.stringify(
    {
      passages: passages.length,
      existingRecipes: recipes.assets.length,
      newRecordings: additions.length,
      newTextCharacters: additions.reduce(
        (sum, asset) => sum + asset.text.length,
        0,
      ),
    },
    null,
    2,
  ),
);
if (values.write && additions.length) {
  recipes.assets.push(...additions);
  const temporary = new URL(
    "./prompts/opening-narration.json.partial",
    import.meta.url,
  );
  await writeFile(temporary, `${JSON.stringify(recipes, null, 2)}\n`, {
    flag: "wx",
  });
  await rename(temporary, path);
}
