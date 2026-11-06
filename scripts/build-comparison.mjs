import { parseArgs } from "node:util";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { assertCaptureCamera } from "./helpers/miniature-survey.mjs";

const { values } = parseArgs({
  options: {
    "input-dir": { type: "string", default: "outputs/collection-realism" },
    "app-url": { type: "string", default: "http://127.0.0.1:4195" },
    help: { type: "boolean", short: "h" },
  },
});
if (values.help) {
  console.log(`Build a local before/after gallery from diorama captures.

Usage: node scripts/build-comparison.mjs [options]
  --input-dir PATH    Directory containing before/ and after/ capture.json
  --app-url URL       Running atlas (default http://127.0.0.1:4195)

Writes <input-dir>/index.html. Serve that directory locally to view it.
Prints the generated file path to stdout. Makes no network or provider requests.
`);
  process.exit(0);
}
const directory = path.resolve(values["input-dir"]);
const before = JSON.parse(
  await readFile(path.join(directory, "before/capture.json"), "utf8"),
);
const after = JSON.parse(
  await readFile(path.join(directory, "after/capture.json"), "utf8"),
);
if (JSON.stringify(before.viewport) !== JSON.stringify(after.viewport)) {
  throw new Error("Before and after viewports must match.");
}
const scenes = [];
for (const original of before.scenes) {
  const current = after.scenes.find(
    (scene) => scene.id === original.id && scene.version === original.version,
  );
  if (!current) throw new Error(`Missing after capture for ${original.id}.`);
  const views = [];
  for (const view of current.views) {
    const previous = original.views.find((item) => item.key === view.key);
    if (!previous) continue;
    const beforeImage = await readFile(
      path.join(directory, "before", previous.file),
    );
    const afterImage = await readFile(path.join(directory, "after", view.file));
    if (!beforeImage.subarray(16, 24).equals(afterImage.subarray(16, 24))) {
      throw new Error(`${original.id}/${view.key}: image sizes differ.`);
    }
    if (previous.camera) {
      try {
        assertCaptureCamera(view.camera, previous.camera);
      } catch (cause) {
        throw new Error(
          `${original.id}/${view.key}: comparison cameras differ.`,
          { cause },
        );
      }
    }
    views.push({
      key: view.key,
      label: view.label,
      before: `before/${previous.file}`,
      after: `after/${view.file}`,
    });
  }
  if (views.length !== original.views.length || views.length < 4) {
    throw new Error(`${original.id}: expected all original views.`);
  }
  const passage = current.views.find((view) => view.key === "passage");
  scenes.push({
    key: original.version ? `${original.id}:${original.version}` : original.id,
    id: original.id,
    ...(original.version ? { version: original.version } : {}),
    title: original.title,
    views,
    passage: passage ? { ...passage, file: `after/${passage.file}` } : null,
  });
}
const template = await readFile(
  new URL("./templates/collection-comparison.html", import.meta.url),
  "utf8",
);
const data = JSON.stringify({ scenes, appUrl: values["app-url"] }).replaceAll(
  "<",
  "\\u003c",
);
const output = path.join(directory, "index.html");
await writeFile(output, template.replace("/* CAPTURE_DATA */ null", data));
console.log(output);
