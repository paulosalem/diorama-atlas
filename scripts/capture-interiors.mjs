import { parseArgs } from "node:util";
import path from "node:path";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { waitForViewer } from "./helpers/browser-viewer.mjs";
import {
  curatedScenes,
  interiorDraftScenes,
} from "../src/client/catalog/scene-catalog.js";
import {
  outdoorScenes,
  outdoorDraftScenes,
} from "../src/client/catalog/outdoor-catalog.js";

const { values } = parseArgs({
  options: {
    phase: { type: "string" },
    "base-url": { type: "string", default: "http://127.0.0.1:4195" },
    "output-dir": { type: "string", default: "outputs/collection-realism" },
    scene: { type: "string" },
    mode: { type: "string", default: "environment" },
    "include-drafts": { type: "boolean", default: false },
    help: { type: "boolean", short: "h" },
  },
});
if (values.help) {
  console.log(`Capture matched views of the atlas (all twelve interiors by default).

Usage: node scripts/capture-interiors.mjs --phase before|after [options]
  --base-url URL       Running local atlas (default http://127.0.0.1:4195)
  --output-dir PATH    Capture directory (default outputs/collection-realism)
  --scene ID           Capture one place; merge into an existing after manifest
  --include-drafts     Permit a specifically selected unfinished local scene
  --mode MODE          environment (default) or miniature; use separate directories

Before captures are immutable: choose a new directory for another baseline.
Screenshots and capture.json are written under <output-dir>/<phase>/.
AI requests are blocked. Progress is printed to stderr.
`);
  process.exit(0);
}
if (!["before", "after"].includes(values.phase)) {
  throw new Error("Use --phase before or --phase after.");
}
if (values["include-drafts"] && !values.scene)
  throw new Error("--include-drafts requires an explicit --scene.");
if (!["environment", "miniature"].includes(values.mode))
  throw new Error("--mode must be environment or miniature.");
if (values.mode === "miniature" && !values.scene)
  throw new Error("--mode miniature requires an explicit --scene.");
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
if (previous && (previous.mode ?? "environment") !== values.mode)
  throw new Error(
    "Use separate output directories for environments and miniatures.",
  );
const directory = new URL("../data/scenes/", import.meta.url);
const saved = await Promise.all(
  (await readdir(directory))
    .filter((file) => file.endsWith(".json"))
    .map(async (file) =>
      JSON.parse(await readFile(new URL(file, directory), "utf8")),
    ),
);
const scenes = [
  ...curatedScenes,
  ...saved.map((entry) => entry.scene),
  ...outdoorScenes,
  ...(values["include-drafts"] ? outdoorDraftScenes : []),
  ...(values["include-drafts"] ? interiorDraftScenes : []),
].filter((scene) =>
  values.scene ? scene.id === values.scene : scene.environment !== "outdoor",
);
if (!scenes.length)
  throw new Error("No matching place in the selected collection.");
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
      `${values["base-url"]}/?scene=${encodeURIComponent(definition.id)}&inspect=1${definition.draft ? "&draft=1" : ""}${values.mode === "miniature" ? "&mode=miniature" : ""}`,
    );
    await waitForViewer(page);
    await page.evaluate(() => document.fonts.ready);
    const views = [];
    const miniature = values.mode === "miniature";
    const selector = miniature
      ? "[data-miniature-view]"
      : ".riad-viewpoints button";
    for (const button of await page.locator(selector).all()) {
      const key = await button.getAttribute(
        miniature ? "data-miniature-view" : "data-view",
      );
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
        style:
          ".scene-narration, .walking-pad, .walking-hint, .miniature-hint { visibility: hidden !important; }",
      });
      const view = await page.evaluate(
        async ({ key, miniature }) => {
          const { getActiveViewer } =
            await import("/src/client/viewer/panorama-viewer.js");
          const viewer = getActiveViewer();
          if (!miniature) return viewer.runtime.views[key];
          return {
            label: viewer.runtime.miniature.views[key].label,
            position: viewer.camera.position.toArray(),
            fov: viewer.camera.fov,
            target: viewer.runtime.miniature.views[key].target,
            cutaway: viewer.runtime.miniature.cutaway,
          };
        },
        { key, miniature },
      );
      views.push({ key, label, file, camera: view });
    }
    if (views.length < 4) {
      throw new Error(
        `${definition.title}: expected at least four viewpoints, found ${views.length}`,
      );
    }
    if (errors.length)
      throw new Error(`${definition.title}: ${errors.join("\n")}`);
    const entry = {
      id: definition.id,
      title: definition.title,
      ...(definition.draft ? { draft: true } : {}),
      ...(miniature ? { representation: "miniature" } : {}),
      views,
    };
    const index = results.findIndex((scene) => scene.id === entry.id);
    if (index === -1) results.push(entry);
    else results[index] = entry;
    await writeFile(
      manifestFile,
      `${JSON.stringify({ phase: values.phase, mode: values.mode, viewport: { width: 1280, height: 900 }, scenes: results }, null, 2)}\n`,
    );
    console.error(
      `${definition.title}: ${views.length} ${values.phase} views saved`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
