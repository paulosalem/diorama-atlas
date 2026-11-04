import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import path from "node:path";

const { values } = parseArgs({
  options: {
    output: { type: "string", default: "outputs/miniature-douro/inspection" },
    "capture-only": { type: "boolean", default: false },
  },
});
const output = path.resolve(values.output);
await mkdir(output, { recursive: true });
const base = process.env.ATLAS_URL ?? "http://127.0.0.1:4307";
const browser = await chromium.launch({ args: ["--use-angle=metal"] });
const report = { started: new Date().toISOString(), errors: [], views: [] };
async function guard(page) {
  await page.addInitScript(() => {
    window.__loadErrors = [];
    window.addEventListener("error", (event) =>
      window.__loadErrors.push(event.message),
    );
  });
  page.on("pageerror", (error) => report.errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") report.errors.push(message.text());
  });
  await page.route("**/api/**", (route) => {
    report.errors.push(`Unexpected provider request: ${route.request().url()}`);
    return route.abort();
  });
}
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await guard(page);
  await page.goto(`${base}/lab/miniature.html`);
  await page.waitForFunction(
    () =>
      window.__miniature ||
      document.querySelector(".loading.error") ||
      window.__loadErrors?.length,
    null,
    { timeout: 180000 },
  );
  assert.equal(
    await page.locator(".loading.error").count(),
    0,
    report.errors.join("\n"),
  );
  assert.equal(report.errors.length, 0, report.errors.join("\n"));
  console.log("Miniature ready; capturing desktop and compact views.");
  await page.waitForTimeout(3000);
  report.initial = await page.evaluate(() => window.__miniature.inspection);
  assert.equal(report.initial.finiteGeometry, true);
  assert.equal(report.initial.clothWeights.length, 1);
  assert.equal(
    report.initial.windMaterials,
    await page.evaluate(
      () =>
        window.__miniature.manifest.materials.filter(
          (material) => material.wind,
        ).length,
    ),
  );
  report.planting = await page.evaluate(
    () => window.__miniature.manifest.miniature.garden,
  );
  assert(report.planting.trees > 10 && report.planting.shrubs > 20);
  assert(report.planting.grassClumps > 800 && report.planting.flowers > 50);
  report.maskedSurfaces = await page.evaluate(() => {
    const scene = BABYLON.EngineStore.Instances[0].scenes[0];
    return window.__miniature.manifest.materials
      .filter((material) => material.masked)
      .map(({ name }) => {
        const material = scene.getMaterialByName(name);
        return {
          name,
          alpha:
            material.albedoTexture.hasAlpha &&
            material.useAlphaFromAlbedoTexture,
        };
      });
  });
  assert(report.maskedSurfaces.length >= 3);
  assert(report.maskedSurfaces.every((surface) => surface.alpha));
  async function checkFraming() {
    const projected = await page.evaluate(() => {
      const B = BABYLON,
        scene = B.EngineStore.Instances[0].scenes[0];
      const { bounds } = window.__miniature.inspection;
      const points = [];
      for (const x of [bounds.min[0], bounds.max[0]])
        for (const y of [bounds.min[1], bounds.max[1]])
          for (const z of [bounds.min[2], bounds.max[2]])
            points.push(
              B.Vector3.TransformCoordinates(
                new B.Vector3(x, y, z),
                scene.getTransformMatrix(),
              ).asArray(),
            );
      return points;
    });
    assert(
      projected.every(([x, y]) => Math.abs(x) < 0.9 && Math.abs(y) < 0.9),
      "Both floating pieces must fit in the overview without cropped edges.",
    );
    return projected;
  }
  report.desktopFraming = await checkFraming();
  const firstFrame = await page.locator("canvas").screenshot();
  report.firstFrame = await page.evaluate(
    async (source) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const surface = document.createElement("canvas");
      surface.width = surface.height = 128;
      const context = surface.getContext("2d");
      context.drawImage(image, 0, 0, 128, 128);
      const background = context.getImageData(0, 0, 1, 1).data;
      const data = context.getImageData(16, 16, 96, 80).data;
      let sum = 0,
        squares = 0,
        covered = 0;
      for (let i = 0; i < data.length; i += 4) {
        const value = (data[i] + data[i + 1] + data[i + 2]) / 3;
        sum += value;
        squares += value * value;
        if (
          Math.abs(data[i] - background[0]) +
            Math.abs(data[i + 1] - background[1]) +
            Math.abs(data[i + 2] - background[2]) >
          45
        )
          covered++;
      }
      const count = data.length / 4;
      return {
        variance: squares / count - (sum / count) ** 2,
        coverage: covered / count,
      };
    },
    `data:image/png;base64,${firstFrame.toString("base64")}`,
  );
  assert(
    report.firstFrame.variance > 100,
    "The ready canvas must contain the rendered miniature, not a blank frame.",
  );
  assert(
    report.firstFrame.coverage > 0.1,
    "The object must be visible at first load.",
  );
  assert.equal(report.initial.paused, true);
  assert.equal(report.initial.audio.state, "idle");
  assert.equal(report.initial.narration, "idle");
  await page.waitForTimeout(500);
  assert.deepEqual(
    await page.evaluate(() => window.__miniature.inspection.renderPasses),
    report.initial.renderPasses,
    "Unchanged views must reuse their shadow and reflection maps.",
  );
  await page.screenshot({ path: path.join(output, "desktop-whole.png") });
  for (const view of ["geology", "river", "quinta", "hills", "harvest"]) {
    await page.locator(`[data-view="${view}"]`).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(output, `desktop-${view}.png`) });
  }
  await page.locator('[data-view="whole"]').click();
  const canvas = page.locator("canvas");
  const before = await page.evaluate(
    () => window.__miniature.inspection.camera.position,
  );
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.63, {
    steps: 20,
  });
  await page.mouse.up();
  await page.waitForTimeout(200);
  report.orbit = await page.evaluate(
    () => window.__miniature.inspection.camera.position,
  );
  assert.notDeepEqual(before, report.orbit);
  await page.screenshot({ path: path.join(output, "desktop-rotated.png") });
  await page.locator("#reset").click();
  const reset = await page.evaluate(
    () => window.__miniature.inspection.camera.position,
  );
  assert(reset.every((value, i) => Math.abs(value - before[i]) < 1e-8));
  await page.locator("#zoomIn").click();
  assert(
    (await page.evaluate(() => window.__miniature.inspection.camera.radius)) <
      report.initial.camera.radius,
  );
  await page.locator("#reset").click();
  await canvas.focus();
  await page.keyboard.press("ArrowRight", { delay: 250 });
  await page.waitForTimeout(200);
  assert.notDeepEqual(
    await page.evaluate(() => window.__miniature.inspection.camera.position),
    before,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForFunction(() => window.__miniature, null, {
    timeout: 180000,
  });
  await page.waitForTimeout(1800);
  report.compactFraming = await checkFraming();
  await page.screenshot({ path: path.join(output, "compact-whole.png") });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.locator("#language").selectOption("pt-BR");
  await page.locator('[data-view="geology"]').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(output, "compact-geology-pt.png") });
  assert.match(await page.locator("#storyTitle").innerText(), /videiras/);
  await page.locator("#language").selectOption("en-US");
  if (!values["capture-only"]) {
    await page.locator("#sound").click();
    await page.waitForFunction(
      () => window.__miniature.soundscape.active,
      null,
      { timeout: 45000 },
    );
    report.sound = await page.evaluate(
      () => window.__miniature.soundscape.inspection,
    );
    await page.locator("#sound").click();
    assert.equal(
      await page.evaluate(() => window.__miniature.soundscape.inspection.nodes),
      0,
    );
    await page.locator("#sound").click();
    await page.waitForFunction(() => window.__miniature.soundscape.active);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    report.visibilityMethod =
      "Synthetic document.hidden and visibilitychange delivery";
    assert.equal(
      await page.evaluate(() => window.__miniature.soundscape.inspection.nodes),
      0,
    );
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    assert.equal(
      await page.evaluate(() => window.__miniature.soundscape.active),
      false,
    );
    await page.evaluate(() => {
      window.__narrationCalls = [];
      window.speechSynthesis.speak = (utterance) => {
        window.__narrationCalls.push({
          text: utterance.text,
          lang: utterance.lang,
        });
        utterance.onstart?.();
      };
      window.speechSynthesis.cancel = () => {};
    });
    await page.locator("#narration").click();
    assert.equal(
      await page.evaluate(() => window.__miniature.narration.state),
      "speaking",
    );
    report.narrationRouting = {
      method: "Mocked speech dispatch; not an audible voice-quality check",
      utterances: await page.evaluate(() => window.__narrationCalls),
    };
    assert.match(report.narrationRouting.utterances[0].text, /schist/);
    await page.locator('[data-view="quinta"]').click();
    assert.equal(
      await page.evaluate(() => window.__miniature.narration.state),
      "idle",
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(600);
    const time = await page.evaluate(
      () => window.__miniature.inspection.elapsed,
    );
    const moving = await page.evaluate(() => window.__miniature.inspection);
    await page.waitForTimeout(600);
    assert(
      (await page.evaluate(() => window.__miniature.inspection.elapsed)) > time,
    );
    const moved = await page.evaluate(() => window.__miniature.inspection);
    assert.notDeepEqual(moved.motionTransforms, moving.motionTransforms);
    assert.notDeepEqual(moved.clothWeights, moving.clothWeights);
    assert(moved.renderPasses.shadows > moving.renderPasses.shadows);
    assert(moved.renderPasses.reflections > moving.renderPasses.reflections);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => window.__miniature.inspection.paused);
    const frozen = await page.evaluate(() => ({
      elapsed: window.__miniature.inspection.elapsed,
      clothWeights: window.__miniature.inspection.clothWeights,
    }));
    await page.waitForTimeout(400);
    assert.deepEqual(
      await page.evaluate(() => ({
        elapsed: window.__miniature.inspection.elapsed,
        clothWeights: window.__miniature.inspection.clothWeights,
      })),
      frozen,
    );
  }
  report.probes = await page.evaluate(() =>
    window.__miniature.manifest.depthProbes.map((probe) => ({
      ...probe,
      distance: window.__miniature.runtime.probe(probe.origin, probe.direction),
    })),
  );
  for (const probe of report.probes)
    assert(
      probe.distance === null || probe.distance >= probe.minDistance,
      `${probe.id}: ${probe.distance}`,
    );
  report.structure = await page.evaluate(() => {
    const { runtime, manifest } = window.__miniature;
    const doorway = [];
    for (const x of [-7.12, -6.65, -6.18])
      for (const y of [0.16, 1.2, 2.05])
        doorway.push(runtime.probe([x, y, 2.1], [0, 0, -1], 6.6));
    const stairs = manifest.miniature.stairs.flatMap((flight) =>
      flight.steps.map(([x, y, z]) => ({
        width: flight.width,
        support: [-0.43, 0, 0.43].map((offset) =>
          runtime.probe([x + offset, y + 0.25, z], [0, -1, 0], 0.5),
        ),
        clearance: [-0.43, 0, 0.43].map((offset) =>
          runtime.probe([x + offset, y + 1.5, z], [0, 0, -1], 0.34),
        ),
      })),
    );
    const gap = [-12, 0, 12].map((x) =>
      runtime.probe([x, 20, -26.2], [0, -1, 0], 40),
    );
    const undersides = [-12, -47].map((z) =>
      runtime.probe([0, -9, z], [0, 1, 0], 2),
    );
    return {
      doorway,
      stairs,
      gap,
      undersides,
      pieces: manifest.miniature.pieces,
    };
  });
  assert(report.structure.doorway.every((distance) => distance === null));
  assert.equal(report.structure.stairs.length, 24);
  for (const stair of report.structure.stairs) {
    assert(stair.width >= 1.1);
    assert(
      stair.support.every(
        (distance) => distance !== null && Math.abs(distance - 0.25) < 0.03,
      ),
    );
    assert(stair.clearance.every((distance) => distance === null));
  }
  assert.equal(report.structure.pieces.length, 2);
  assert(report.structure.gap.every((distance) => distance === null));
  assert(
    report.structure.undersides.every(
      (distance) => distance !== null && Math.abs(distance - 0.7) < 0.01,
    ),
  );
  await page.evaluate(() => {
    window.__miniature.dispose();
    window.__miniature.dispose();
  });
  report.disposed = await page.evaluate(() => window.__miniature.inspection);
  assert.equal(report.disposed.disposed, true);
  assert.equal(report.disposed.audio.state, "disposed");
  assert.equal(report.disposed.audio.nodes, 0);
  assert.equal(
    await page.evaluate(() => BABYLON.EngineStore.Instances.length),
    0,
  );
  await page.close();
  for (const scene of ["douro-miniature", "douro"]) {
    const native = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
    });
    await guard(native);
    await native.goto(
      `${base}/lab/engine.html?scene=${scene}&engine=babylon&view=arrival`,
    );
    await native.waitForFunction(
      () =>
        window.__engineStudy || document.querySelector(".engine-status.error"),
      null,
      { timeout: 180000 },
    );
    assert.equal(
      await native.locator(".engine-status.error").count(),
      0,
      report.errors.join("\n"),
    );
    await native.waitForTimeout(8000);
    const samples = [];
    for (let i = 0; i < 8; i++) {
      await native.waitForTimeout(500);
      samples.push(await native.evaluate(() => window.__engineStudy.fps));
    }
    report[`${scene}-fps`] = {
      samples,
      median: samples.sort((a, b) => a - b)[4],
    };
    if (scene === "douro-miniature") {
      for (const view of [
        "whole",
        "arrival",
        "vines",
        "terraces",
        "quinta",
        "river",
        "geology",
        "hills",
        "harvest",
      ]) {
        await native.evaluate((key) => window.__engineStudy.select(key), view);
        await native.waitForTimeout(1200);
        await native.screenshot({
          path: path.join(output, `matched-${view}.png`),
        });
        report.views.push({
          view,
          ...(await native.evaluate(
            () => window.__engineStudy.inspection.camera,
          )),
        });
      }
    }
    await native.close();
  }
  assert.deepEqual(report.errors, []);
  report.finished = new Date().toISOString();
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile(
    path.join(output, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await browser.close();
}
