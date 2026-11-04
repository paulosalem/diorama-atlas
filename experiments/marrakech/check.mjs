import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { getStudy } from "./web/scenes.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const allEngines = ["current", "babylon", "playcanvas", "unity"];
const { values } = parseArgs({
  options: {
    scene: { type: "string", default: "marrakech" },
    engines: { type: "string", default: allEngines.join(",") },
    output: {
      type: "string",
    },
  },
});
const engines = values.engines.split(",");
const study = getStudy(values.scene);
assert(
  engines.length > 0 && engines.every((engine) => allEngines.includes(engine)),
  "Unknown engine selection",
);
const output = path.resolve(
  directory,
  values.output ??
    `../../outputs/engine-comparison/${study.outdoor ? `${study.sceneId}/` : ""}inspection`,
);
const base = process.env.ATLAS_URL ?? "http://127.0.0.1:4307";
await mkdir(output, { recursive: true });
const manifest = JSON.parse(
  await readFile(
    path.join(directory, study.assetRoot.slice("/lab/".length), "scene.json"),
    "utf8",
  ),
);
const browser = await chromium.launch({ args: ["--use-angle=metal"] });
const report = {
  scene: study.id,
  started: new Date().toISOString(),
  viewport: { width: 1280, height: 900 },
  warmupMs: 8000,
  engines: [],
};
try {
  for (const engine of engines) {
    const page = await browser.newPage({
      viewport: report.viewport,
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`);
    });
    const started = performance.now();
    await page.goto(
      `${base}/lab/engine.html?scene=${study.id}&engine=${engine}`,
    );
    await page.waitForFunction(
      () =>
        window.__engineStudy || document.querySelector(".engine-status.error"),
      null,
      { timeout: 240000 },
    );
    assert.equal(
      await page.locator(".engine-status.error").count(),
      0,
      await page.locator(".engine-status").innerText(),
    );
    const readyMs = performance.now() - started;
    await page.waitForTimeout(report.warmupMs);
    await page.waitForFunction(() => window.__engineStudy.fps > 0, null, {
      timeout: 120000,
    });
    const fpsSamples = [];
    for (let sample = 0; sample < 8; sample++) {
      await page.waitForTimeout(500);
      fpsSamples.push(await page.evaluate(() => window.__engineStudy.fps));
    }
    const inspection = await page.evaluate(
      () => window.__engineStudy.inspection,
    );
    assert(inspection.meshes > 100, `${engine}: architecture is missing`);
    assert(
      inspection.animations >= study.minimumAnimations,
      `${engine}: native animation is missing`,
    );
    assert.equal(inspection.paused, true);
    if (engine === "babylon")
      assert.equal(inspection.reflections, study.planarReflections);
    if (engine === "playcanvas") assert.equal(inspection.reflections, 1);
    if (engine !== "current")
      assert.equal(
        inspection.patinaMaterials,
        manifest.materials.filter((material) => material.patina).length,
        `${engine}: weathering was not preserved on every eligible material`,
      );
    if (study.outdoor && engine !== "current") {
      assert.equal(
        inspection.instances,
        manifest.instances,
        `${engine}: vegetation instances were lost`,
      );
      assert.equal(
        inspection.windMaterials,
        manifest.materials.filter((material) => material.wind).length,
      );
    }
    const views = [];
    for (const key of Object.keys(manifest.views)) {
      await page.evaluate((view) => window.__engineStudy.select(view), key);
      await page.waitForTimeout(engine === "unity" ? 2500 : 1000);
      const file = `${engine}-${key}.png`;
      const image = await page.screenshot({ path: path.join(output, file) });
      if (study.outdoor) {
        const pixels = await page.evaluate(async (encoded) => {
          const bytes = Uint8Array.from(atob(encoded), (character) =>
            character.charCodeAt(0),
          );
          const bitmap = await createImageBitmap(
            new Blob([bytes], { type: "image/png" }),
          );
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 180;
          const context = canvas.getContext("2d");
          context.drawImage(bitmap, 0, 0, 256, 180);
          bitmap.close();
          const { data } = context.getImageData(0, 36, 256, 144);
          let sum = 0,
            squares = 0,
            green = 0;
          for (let i = 0; i < data.length; i += 4) {
            const value = (data[i] + data[i + 1] + data[i + 2]) / 3;
            sum += value;
            squares += value * value;
            if (data[i + 1] > data[i] * 1.05 && data[i + 1] > data[i + 2] * 1.1)
              green++;
          }
          const count = data.length / 4;
          return {
            mean: sum / count,
            variance: squares / count - (sum / count) ** 2,
            green: green / count,
          };
        }, image.toString("base64"));
        assert(
          pixels.mean > 25 && pixels.variance > 200,
          `${engine}/${key}: expected a lit, detailed scene, not a flat or black render (${JSON.stringify(pixels)})`,
        );
        if (key === "vines")
          assert(
            pixels.green > 0.06,
            `${engine}: the close vine foliage is missing`,
          );
        views.push({ key, file, pixels });
      }
      if (key === "courtyard") {
        // A live controller and thousands of meshes can still render only sky.
        const stoneWarmth = await page.evaluate(async (encoded) => {
          const bytes = Uint8Array.from(atob(encoded), (character) =>
            character.charCodeAt(0),
          );
          const bitmap = await createImageBitmap(
            new Blob([bytes], { type: "image/png" }),
          );
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 180;
          const context = canvas.getContext("2d");
          context.drawImage(bitmap, 0, 0, 256, 180);
          bitmap.close();
          const { data } = context.getImageData(0, 0, 256, 180);
          let sum = 0,
            count = 0;
          for (let y = 18; y < 65; y++)
            for (let x = 76; x < 230; x++) {
              const index = (y * 256 + x) * 4;
              sum += data[index] - data[index + 2];
              count++;
            }
          return sum / count;
        }, image.toString("base64"));
        assert(
          stoneWarmth > 8,
          `${engine}: expected warm carved architecture, not empty sky (${stoneWarmth.toFixed(1)})`,
        );
      }
      if (!study.outdoor) views.push({ key, file });
    }
    if (engine === "babylon") {
      const profiles = await page.evaluate((materials) => {
        const scene = window.BABYLON.EngineStore.LastCreatedScene;
        return materials
          .filter((material) => material.patina)
          .map((material) => {
            const mesh = scene.meshes.find(
              (entry) =>
                entry.material?.name === material.name &&
                entry.subMeshes?.some((part) => part.effect),
            );
            const effect = mesh?.subMeshes.find((part) => part.effect).effect;
            return Number(
              effect?.defines.match(/#define ATLAS_PATINA_PROFILE (\d+)/)?.[1],
            );
          });
      }, manifest.materials);
      assert.deepEqual(
        profiles,
        manifest.materials
          .filter((material) => material.patina)
          .map((material) => material.patina.profileIndex),
        "Babylon's cached programs must preserve each material's own profile",
      );
    }
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForFunction(
      (previous) => window.__engineStudy.inspection.animationTime > previous,
      inspection.animationTime,
      { timeout: 30000 },
    );
    const moving = await page.evaluate(() => window.__engineStudy.inspection);
    assert.equal(moving.paused, false);
    assert(
      moving.animationTime > inspection.animationTime,
      `${engine}: native animation did not advance`,
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(engine === "unity" ? 3000 : 1100);
    const stopped = await page.evaluate(
      () => window.__engineStudy.inspection.animationTime,
    );
    await page.waitForTimeout(600);
    assert.equal(
      await page.evaluate(() => window.__engineStudy.inspection.animationTime),
      stopped,
      `${engine}: reduced motion did not stop animation`,
    );
    await page.setViewportSize({ width: 390, height: 720 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(output, `${engine}-compact.png`) });
    assert.deepEqual(errors, [], `${engine} browser errors`);
    await page.evaluate(() => window.__engineStudy.dispose());
    assert.equal(
      await page.evaluate(() => window.__engineStudy.inspection.disposed),
      true,
    );
    assert.deepEqual(errors, [], `${engine} disposal errors`);
    const ordered = [...fpsSamples].sort((a, b) => a - b);
    const fps = {
      median: (ordered[3] + ordered[4]) / 2,
      min: ordered[0],
      max: ordered.at(-1),
      samples: fpsSamples,
    };
    report.engines.push({ engine, readyMs, fps, inspection, views, errors });
    console.log(
      `${engine}: ${views.length} views captured; motion, reduced motion and disposal passed; median ${fps.median.toFixed(1)} fps`,
    );
    await page.close();
  }
  if (allEngines.every((engine) => engines.includes(engine))) {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1100 },
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/lab/?scene=${study.id}`);
    await page.waitForFunction(
      () =>
        window.__study?.frames.every(
          ({ frame }) => frame.contentWindow.__engineStudy,
        ),
      null,
      { timeout: 240000 },
    );
    assert.equal(
      await page.evaluate(() => window.__study.soundscape.active),
      false,
    );
    await page
      .getByRole("button", {
        name: manifest.views[study.outdoor ? "quinta" : "doorway"].label,
        exact: true,
      })
      .click();
    await page.waitForTimeout(1000);
    assert.deepEqual(
      await page.evaluate(() =>
        window.__study.frames.map(
          ({ frame }) => frame.contentWindow.__engineStudy.inspection.view,
        ),
      ),
      allEngines.map(() => (study.outdoor ? "quinta" : "doorway")),
    );
    await page
      .getByRole("button", {
        name: manifest.views[study.defaultView].label,
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Resume motion", exact: true })
      .click();
    await page.waitForTimeout(1200);
    assert(
      await page.evaluate(() =>
        window.__study.frames.every(
          ({ frame }) => !frame.contentWindow.__engineStudy.inspection.paused,
        ),
      ),
    );
    await page
      .getByRole("button", { name: "Pause motion", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: `Enable ${study.subject} sound`,
        exact: true,
      })
      .click();
    await page.waitForFunction(() => window.__study.soundscape.active);
    await page
      .getByRole("button", { name: `Mute ${study.subject} sound`, exact: true })
      .click();
    assert.equal(
      await page.evaluate(
        () => window.__study.soundscape.inspection.contextState,
      ),
      "closed",
    );
    await page
      .getByRole("button", {
        name: `Enable ${study.subject} sound`,
        exact: true,
      })
      .click();
    await page.waitForFunction(() => window.__study.soundscape.active);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    assert.equal(
      await page.evaluate(() => window.__study.soundscape.active),
      false,
    );
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    assert.equal(
      await page.evaluate(() => window.__study.soundscape.active),
      false,
    );
    await page.screenshot({ path: path.join(output, "comparison.png") });
    assert(
      await page.evaluate(() =>
        [...document.querySelectorAll("iframe")].every(
          (frame) => frame.getBoundingClientRect().bottom <= innerHeight,
        ),
      ),
      "All four views should fit on the desktop",
    );
    await page.setViewportSize({ width: 390, height: 720 });
    await page.waitForTimeout(600);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Compact controls overflow horizontally",
    );
    await page.screenshot({
      path: path.join(output, "comparison-compact.png"),
      fullPage: true,
    });
    await page.evaluate(() => window.__study.soundscape.dispose());
    assert.equal(
      await page.evaluate(
        () => window.__study.soundscape.inspection.contextState,
      ),
      "closed",
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  report.finished = new Date().toISOString();
  await writeFile(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
