import { chromium } from "@playwright/test";
import { waitForViewer } from "./helpers/browser-viewer.mjs";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { curatedScenes } from "../src/client/catalog/scene-catalog.js";
import { outdoorScenes } from "../src/client/catalog/outdoor-catalog.js";

const phase = process.argv[2];
if (!["before", "after"].includes(phase))
  throw new Error(
    "Usage: node scripts/capture-patina.mjs before|after [SCENE_ID...]",
  );
const base = process.env.ATLAS_URL ?? "http://127.0.0.1:4183";
const saved = await fetch(`${base}/api/generated-scenes`);
if (!saved.ok) throw new Error("The saved atlas could not be loaded.");
const scenes = [
  ...curatedScenes,
  ...(await saved.json()).scenes,
  ...outdoorScenes,
];
const selected = process.argv.slice(3);
for (const id of selected)
  if (!scenes.some((scene) => scene.id === id))
    throw new Error(`Unknown scene: ${id}`);
const output = resolve(`outputs/patina/${phase}`);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: "chromium",
  headless: true,
  args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
let errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const results = [];
const previews = [];
try {
  for (const scene of scenes.filter(
    (entry) => !selected.length || selected.includes(entry.id),
  )) {
    if (!/^[a-z0-9-]+$/.test(scene.id))
      throw new Error("Unsupported scene identifier for capture.");
    errors = [];
    console.log(`${phase}: ${scene.title}`);
    await page.goto(`${base}/?scene=${encodeURIComponent(scene.id)}&inspect=1`);
    await waitForViewer(page);
    if (
      !(await page.evaluate(async () => {
        const { getActiveViewer } =
          await import("/src/client/viewer/panorama-viewer.js");
        return Boolean(getActiveViewer());
      }))
    )
      throw new Error(await page.locator("body").innerText());
    const data = await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const { runtime } = getActiveViewer();
      return {
        views: Object.keys(runtime.views),
        patina: runtime.patina ?? null,
      };
    });
    const views = [...new Set([data.views[0], data.views.at(-1)])];
    for (const view of views) {
      await page.locator(`[data-view="${view}"]`).click();
      await page.evaluate(
        () =>
          new Promise((done) =>
            requestAnimationFrame(() => requestAnimationFrame(done)),
          ),
      );
      await page
        .locator("#canvasMount")
        .screenshot({ path: resolve(output, `${scene.id}--${view}.png`) });
    }
    if (errors.length) throw new Error(`${scene.id}: ${errors.join("; ")}`);
    if (phase === "after" && !(data.patina?.materials > 0))
      throw new Error(`No patina surfaces in ${scene.id}`);
    if (phase === "after") {
      previews.push({ scene, view: views[0] });
    }
    results.push({
      id: scene.id,
      title: scene.title,
      views,
      patina: data.patina,
      errors,
    });
  }
  if (phase === "after") {
    const creditsPath = resolve("public/previews/credits.json");
    const credits = JSON.parse(await readFile(creditsPath, "utf8"));
    const rendered = new Map(
      credits.rendered.map((entry) => [entry.scene, entry]),
    );
    for (const { scene, view } of previews) {
      const source = resolve(output, `${scene.id}--${view}.png`);
      const directory = resolve(
        scene.environment === "outdoor"
          ? "public/outdoors/previews"
          : "public/previews",
      );
      await mkdir(directory, { recursive: true });
      await copyFile(source, resolve(directory, `${scene.id}.png`));
      if (scene.environment === "outdoor") continue;
      const image = await readFile(source);
      rendered.set(scene.id, {
        file: `${scene.id}.png`,
        scene: scene.id,
        view,
        width: image.readUInt32BE(16),
        height: image.readUInt32BE(20),
        bytes: image.length,
        sha256: createHash("sha256").update(image).digest("hex"),
      });
    }
    await writeFile(
      creditsPath,
      JSON.stringify(
        {
          ...credits,
          viewport: { width: 1440, height: 1000 },
          reducedMotion: true,
          capture: { target: "#canvasMount", deviceScaleFactor: 1 },
          checkedAt: new Date().toISOString(),
          rendered: [...rendered.values()],
        },
        null,
        2,
      ) + "\n",
    );
  }
  await writeFile(
    resolve(output, "capture.json"),
    JSON.stringify(
      { phase, capturedAt: new Date().toISOString(), scenes: results },
      null,
      2,
    ) + "\n",
  );
  console.log(`Captured ${results.length} scenes for ${phase}.`);
} catch (error) {
  console.error("Capture failed:", {
    url: page.url(),
    errors,
    text: await page.locator("body").allTextContents(),
  });
  throw error;
} finally {
  await browser.close();
}
