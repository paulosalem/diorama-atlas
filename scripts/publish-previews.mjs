import { parseArgs } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

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

Replaces each captured scene's public/previews/<id>.png with its first viewpoint
and updates asset provenance, retaining records for scenes not in this capture.
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
const creditsFile = new URL("credits.json", destinations);
const previous = JSON.parse(await readFile(creditsFile, "utf8"));
const images = [];
for (const scene of manifest.scenes) {
  if (!/^[a-z0-9-]+$/.test(scene.id)) {
    throw new Error(`Invalid preview destination: ${scene.id}`);
  }
  const view = scene.views[0];
  if (!view || path.basename(view.file) !== view.file) {
    throw new Error(`Invalid capture filename for ${scene.id}.`);
  }
  const source = path.join(path.dirname(input), view.file);
  const image = await readFile(source);
  if (
    image.length < 24 ||
    !image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    throw new Error(`Not a PNG capture: ${source}`);
  }
  images.push({
    source,
    destination: new URL(`${scene.id}.png`, destinations),
    id: scene.id,
    view: view.key,
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
    bytes: image.length,
    sha256: createHash("sha256").update(image).digest("hex"),
  });
}
if (new Set(images.map((image) => image.id)).size !== images.length) {
  throw new Error("Duplicate scene IDs in capture manifest.");
}
for (const image of images) {
  await copyFile(image.source, image.destination);
}
const rendered = new Map(
  (previous.rendered ?? []).map((entry) => [
    entry.scene,
    { ...entry, viewport: entry.viewport ?? previous.viewport },
  ]),
);
for (const { id, view, width, height, bytes, sha256 } of images)
  rendered.set(id, {
    file: `${id}.png`,
    scene: id,
    view,
    width,
    height,
    bytes,
    sha256,
    viewport: manifest.viewport,
  });
await writeFile(
  creditsFile,
  `${JSON.stringify(
    {
      source:
        "Local Three.js renders of the versioned atlas environments; no image-generation service was used.",
      viewport: manifest.viewport,
      reducedMotion: true,
      capture: { target: "#canvasMount", deviceScaleFactor: 1 },
      checkedAt: new Date().toISOString(),
      rendered: [...rendered.values()],
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
