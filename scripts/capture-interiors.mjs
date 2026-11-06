import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { waitForViewer } from "./helpers/browser-viewer.mjs";
import {
  captureMiniatureSurvey,
  captureState,
  restoreCaptureCamera,
  settleCapture,
} from "./helpers/miniature-survey.mjs";
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
    all: { type: "boolean", default: false },
    version: { type: "string" },
    survey: { type: "boolean", default: false },
    match: { type: "string" },
    "include-drafts": { type: "boolean", default: false },
    help: { type: "boolean", short: "h" },
  },
});
if (values.help) {
  console.log(`Capture matched views of the atlas (all released interiors by default).

Usage: node scripts/capture-interiors.mjs --phase before|after [options]
  --base-url URL       Running local atlas (default http://127.0.0.1:4195)
  --output-dir PATH    Capture directory (default outputs/collection-realism)
  --scene ID           Capture one place; merge into an existing after manifest
  --all                Capture interiors and outdoors
  --version ID         Capture an experience of --scene or --all
  --survey             Add miniature reverse/open/underside/compact/motion views
  --match PATH         Match actual cameras from a previous capture.json
  --include-drafts     Permit a specifically selected unfinished local scene

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
if (values.version && !values.scene && !values.all)
  throw new Error("--version requires --scene or --all.");
if (values.survey && values.version !== "miniature")
  throw new Error("--survey requires --version miniature.");
const matched = values.match
  ? JSON.parse(await readFile(values.match, "utf8"))
  : null;
const source = {
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  status: execFileSync("git", ["status", "--porcelain=v1"], {
    encoding: "utf8",
  }),
};
const capturedAt = new Date().toISOString();
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
if (
  previous &&
  previous.scenes.some(
    (scene) =>
      (scene.version === "miniature") !== (values.version === "miniature"),
  )
)
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
  values.scene
    ? scene.id === values.scene
    : values.all || scene.environment !== "outdoor",
);
if (!scenes.length)
  throw new Error("No matching place in the selected collection.");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
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
      `${values["base-url"]}/?scene=${encodeURIComponent(definition.id)}&inspect=1${definition.draft ? "&draft=1" : ""}${values.version ? `&version=${encodeURIComponent(values.version)}` : ""}`,
    );
    await waitForViewer(page);
    await page.evaluate(() => document.fonts.ready);
    const views = [];
    async function capture(key, label, { fullPage = false } = {}) {
      const reference = matched?.scenes
        .find((scene) => scene.id === definition.id)
        ?.views.find((view) => view.key === key);
      if (matched && !reference)
        throw new Error(`${definition.id}/${key}: missing comparison camera.`);
      if (reference) {
        const viewport = reference.viewport ?? matched.viewport;
        await page.setViewportSize(viewport);
        await restoreCaptureCamera(page, reference.camera);
      }
      await settleCapture(page);
      const file = `${definition.id}${values.version ? `-${values.version}` : ""}-${key}.png`;
      const options = {
        path: path.join(output, file),
        style:
          ".scene-narration, .walking-pad, .walking-hint, .miniature-hint { visibility: hidden !important; }",
      };
      if (fullPage) await page.screenshot(options);
      else
        await page
          .locator("#canvasMount, #miniatureCanvas")
          .screenshot(options);
      views.push({ key, label, file, ...(await captureState(page)) });
    }
    const sharedRuntimeMiniature = await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const viewer = getActiveViewer();
      return Boolean(viewer.runtime.miniature && viewer.mode === "miniature");
    });
    const selector = sharedRuntimeMiniature
      ? "[data-miniature-view]"
      : ".riad-viewpoints button";
    for (const button of await page.locator(selector).all()) {
      const key = await button.getAttribute(
        sharedRuntimeMiniature ? "data-miniature-view" : "data-view",
      );
      const label = await button.innerText();
      await button.click();
      await capture(key, label);
    }
    if (values.survey) await captureMiniatureSurvey(page, capture);
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
      ...(values.version ? { version: values.version } : {}),
      views,
    };
    const index = results.findIndex(
      (scene) => scene.id === entry.id && scene.version === entry.version,
    );
    if (index === -1) results.push(entry);
    else results[index] = entry;
    await writeFile(
      manifestFile,
      `${JSON.stringify({ phase: values.phase, capturedAt, source, matchedTo: values.match ?? null, viewport: { width: 1280, height: 900 }, scenes: results }, null, 2)}\n`,
    );
    console.error(
      `${definition.title}: ${views.length} ${values.phase} views saved`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
