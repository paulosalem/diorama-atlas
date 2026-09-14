import { parseArgs } from "node:util";
import path from "node:path";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { waitForViewer } from "./helpers/browser-viewer.mjs";
import { curatedScenes } from "../src/client/catalog/scene-catalog.js";

const { values } = parseArgs({
  options: {
    phase: { type: "string" },
    "base-url": { type: "string", default: "http://127.0.0.1:4195" },
    "output-dir": { type: "string", default: "outputs/collection-realism" },
    scene: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});
if (values.help) {
  console.log(`Capture matched views of all twelve interiors, including Marrakech.

Usage: node scripts/capture-interiors.mjs --phase before|after [options]
  --base-url URL       Running local atlas (default http://127.0.0.1:4195)
  --output-dir PATH    Capture directory (default outputs/collection-realism)
  --scene ID           Capture one place; merge into an existing after manifest

Before captures are immutable: choose a new directory for another baseline.
Screenshots and capture.json are written under <output-dir>/<phase>/.
AI requests are blocked. Progress is printed to stderr.
`);
  process.exit(0);
}
if (!["before", "after"].includes(values.phase)) {
  throw new Error("Use --phase before or --phase after.");
}
const output = path.resolve(values["output-dir"], values.phase);
const manifestFile = path.join(output, "capture.json");
let previous = null;
try {
  previous = JSON.parse(await readFile(manifestFile, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (values.phase === "before" && previous) {
  throw new Error("This baseline already exists. Choose a new --output-dir.");
}
const directory = new URL("../data/scenes/", import.meta.url);
const saved = await Promise.all(
  (await readdir(directory))
    .filter((file) => file.endsWith(".json"))
    .map(async (file) =>
      JSON.parse(await readFile(new URL(file, directory), "utf8")),
    ),
);
const scenes = [...curatedScenes, ...saved.map((entry) => entry.scene)].filter(
  (scene) => !values.scene || scene.id === values.scene,
);
if (!scenes.length) throw new Error("No matching interior.");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: "chromium",
  args:
    process.platform === "darwin"
      ? ["--use-angle=metal"]
      : ["--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
await context.route("**/api/**", async (route) => {
  const request = route.request();
  if (
    request.method() === "GET" &&
    new URL(request.url()).pathname === "/api/generated-scenes"
  ) {
    await route.continue();
  } else {
    await route.abort("blockedbyclient");
    throw new Error(`Unexpected API request: ${request.url()}`);
  }
});
const results = values.scene && previous ? [...previous.scenes] : [];
try {
  for (const definition of scenes) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        errors.push(`${response.status()}: ${response.url()}`);
      }
    });
    await page.goto(
      `${values["base-url"]}/?scene=${encodeURIComponent(definition.id)}&inspect=1`,
    );
    await waitForViewer(page);
    await page.evaluate(() => document.fonts.ready);
    const views = [];
    for (const button of await page.locator(".riad-viewpoints button").all()) {
      const key = await button.getAttribute("data-view");
      const label = await button.innerText();
      await button.click();
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      const file = `${definition.id}-${key}.png`;
      await page.locator("#canvasMount").screenshot({
        path: path.join(output, file),
        style: ".scene-narration { visibility: hidden !important; }",
      });
      const view = await page.evaluate(async (key) => {
        const { getActiveViewer } =
          await import("/src/client/viewer/panorama-viewer.js");
        return getActiveViewer().runtime.views[key];
      }, key);
      views.push({ key, label, file, camera: view });
    }
    if (views.length < 4) {
      throw new Error(
        `${definition.title}: expected at least four viewpoints, found ${views.length}`,
      );
    }
    if (errors.length)
      throw new Error(`${definition.title}: ${errors.join("\n")}`);
    const entry = { id: definition.id, title: definition.title, views };
    const index = results.findIndex((scene) => scene.id === entry.id);
    if (index === -1) results.push(entry);
    else results[index] = entry;
    await writeFile(
      manifestFile,
      `${JSON.stringify({ phase: values.phase, viewport: { width: 1280, height: 900 }, scenes: results }, null, 2)}\n`,
    );
    console.error(
      `${definition.title}: ${views.length} ${values.phase} views saved`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
