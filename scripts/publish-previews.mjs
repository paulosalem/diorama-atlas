import { parseArgs } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyFile, readFile, writeFile } from "node:fs/promises";

const { values } = parseArgs({
  options: {
    input: {
      type: "string",
      default: "outputs/collection-realism/after/capture.json",
    },
    help: { type: "boolean", short: "h" },
  },
});
if (values.help) {
  console.log(`Publish rendered interior captures as the globe's place previews.

Usage: node scripts/publish-previews.mjs [--input PATH]
  --input PATH    An after/capture.json manifest

Replaces each captured non-riad scene's public/previews/<id>.png with its
first viewpoint and writes asset provenance. Marrakech is never replaced.
Existing images should be backed up before running this command.
`);
  process.exit(0);
}
const input = path.resolve(values.input);
const manifest = JSON.parse(await readFile(input, "utf8"));
if (manifest.phase !== "after" || !manifest.scenes?.length) {
  throw new Error("Expected a nonempty after-capture manifest.");
}
const destinations = new URL("../public/previews/", import.meta.url);
const images = [];
for (const scene of manifest.scenes) {
  if (!/^[a-z0-9-]+$/.test(scene.id) || scene.id === "riad") {
    throw new Error(`Invalid preview destination: ${scene.id}`);
  }
  const view = scene.views[0];
  if (!view || path.basename(view.file) !== view.file) {
    throw new Error(`Invalid capture filename for ${scene.id}.`);
  }
  const source = path.join(path.dirname(input), view.file);
  const image = await readFile(source);
  if (
    !image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    throw new Error(`Not a PNG capture: ${source}`);
  }
  images.push({
    source,
    destination: new URL(`${scene.id}.png`, destinations),
    id: scene.id,
    view: view.key,
  });
}
if (new Set(images.map((image) => image.id)).size !== images.length) {
  throw new Error("Duplicate scene IDs in capture manifest.");
}
for (const image of images) {
  await copyFile(image.source, image.destination);
}
await writeFile(
  new URL("credits.json", destinations),
  `${JSON.stringify(
    {
      source:
        "Local Three.js renders of the versioned atlas environments; no image-generation service was used.",
      viewport: manifest.viewport,
      reducedMotion: true,
      rendered: images.map(({ id, view }) => ({
        file: `${id}.png`,
        scene: id,
        view,
      })),
      unchanged: [
        {
          file: "riad.png",
          source:
            "Imported generated reference image. No independent per-image provenance manifest was supplied.",
        },
      ],
      materials: [
        "../riad/materials/manifest.json",
        "../interiors/materials/manifest.json",
      ],
    },
    null,
    2,
  )}\n`,
);
console.log(
  `${images.length} rendered previews published to ${fileURLToPath(destinations)}`,
);
