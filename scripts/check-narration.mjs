import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium, expect } from "@playwright/test";
import { curatedScenes } from "../src/client/catalog/scene-catalog.js";
import { outdoorScenes } from "../src/client/catalog/outdoor-catalog.js";
import { waitForViewer } from "./helpers/browser-viewer.mjs";
import {
  findNarrationRecording,
  isSceneNarration,
} from "../src/client/viewer/narration-library.js";

const { values } = parseArgs({
  options: {
    "base-url": { type: "string", default: "http://127.0.0.1:4183" },
    "output-dir": { type: "string", default: "outputs/narration-collection" },
    scene: { type: "string", multiple: true },
    help: { type: "boolean" },
  },
});
if (values.help) {
  console.log(`Verify bundled narration against every actual runtime view.
Usage: node scripts/check-narration.mjs [--base-url URL] [--output-dir PATH] [--scene ID ...]
The default selects all prerecorded scenes. Explicit scene IDs select a subset.
Uses isolated browser preferences, blocks paid API requests, decodes every selected
MP3, and exercises both languages in full-scale views, object details and Miniatures.
Writes report.json and rendered screenshots under the output directory.
Example: node scripts/check-narration.mjs --scene textile --scene newar-potters-square
Example: node scripts/check-narration.mjs --output-dir outputs/narration-review
Progress goes to stderr; the final summary goes to stdout.`);
  process.exit(0);
}
const base = values["base-url"];
const response = await fetch(`${base}/api/generated-scenes`);
assert.ok(response.ok, `Scene catalog: HTTP ${response.status}`);
const collection = [
  ...curatedScenes,
  ...(await response.json()).scenes,
  ...outdoorScenes,
];
for (const id of values.scene ?? [])
  assert.ok(
    collection.some((scene) => scene.id === id),
    `Unknown scene ${id}`,
  );
for (const id of values.scene ?? [])
  assert.notEqual(
    collection.find((scene) => scene.id === id).narration,
    "browser",
    `${id} uses browser speech, not prerecorded narration.`,
  );
const scenes = collection.filter(
  (scene) =>
    scene.narration !== "browser" &&
    (!values.scene || values.scene.includes(scene.id)),
);
const manifest = JSON.parse(
  await readFile(new URL("../public/narration/manifest.json", import.meta.url)),
);
const assets = manifest.assets.filter((asset) =>
  scenes.some((scene) => scene.id === asset.scene),
);
const output = resolve(values["output-dir"]);
await mkdir(output, { recursive: true });
const startedAt = new Date().toISOString();
const viewport = { width: 1280, height: 900 };
const report = { startedAt, viewport, motion: "reduce", audio: [], scenes: [] };
const browser = await chromium.launch({
  args:
    process.platform === "darwin"
      ? ["--use-angle=metal"]
      : ["--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
  locale: "en-US",
});
await context.route("**/api/**", async (route) => {
  const request = route.request();
  if (
    request.method() === "GET" &&
    new URL(request.url()).pathname === "/api/generated-scenes"
  )
    await route.continue();
  else {
    await route.abort("blockedbyclient");
    throw new Error(`Unexpected API request: ${request.url()}`);
  }
});
await context.addInitScript(() => {
  window.speechSynthesis.speak = () => {
    throw new Error("The collection must use its OpenAI recordings.");
  };
  const NativeAudio = window.Audio;
  window.narrationPlayers = [];
  window.Audio = class extends NativeAudio {
    constructor(...args) {
      super(...args);
      window.narrationPlayers.push(this);
    }
  };
});
async function playing(page, asset) {
  await page.waitForFunction(
    (file) =>
      window.narrationPlayers.some(
        (player) =>
          player.getAttribute("src") === file &&
          !player.paused &&
          player.currentTime > 0.12,
      ),
    asset.file,
  );
  assert.equal(
    await page.evaluate(
      () => window.narrationPlayers.filter((player) => !player.paused).length,
    ),
    1,
    `${asset.id}: overlapping narration`,
  );
}
const save = () =>
  writeFile(
    resolve(output, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
try {
  for (const scene of scenes) {
    await context.clearCookies();
    const page = await context.newPage();
    const errors = [];
    const audioRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("response", (res) => {
      if (res.status() >= 400) errors.push(`${res.status()}: ${res.url()}`);
    });
    page.on("request", (request) => {
      if (/\/public\/narration\/.*\.mp3$/.test(request.url()))
        audioRequests.push(request.url());
    });
    const start = performance.now();
    await page.goto(`${base}/?scene=${encodeURIComponent(scene.id)}&inspect=1`);
    await waitForViewer(page, { timeout: 120_000 });
    const panel = page.locator(".scene-narration");
    await expect(panel).toHaveAttribute("data-state", "ready");
    assert.deepEqual(audioRequests, [], `${scene.id}: audio before consent`);
    const initial = await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const v = getActiveViewer();
      let meshes = 0;
      const invalid = [];
      v.runtime.group.traverse((object) => {
        if (!object.isMesh) return;
        meshes++;
        if (!object.matrixWorld.elements.every(Number.isFinite))
          invalid.push(object.name || object.type);
        const attribute = object.geometry.getAttribute("position");
        if (attribute && !attribute.array.every(Number.isFinite))
          invalid.push(object.name || object.type);
      });
      return {
        views: v.runtime.views,
        meshes,
        invalid,
        lastRenderPassTriangles: v.renderer.info.render.triangles,
        geometries: v.renderer.info.memory.geometries,
        textures: v.renderer.info.memory.textures,
      };
    });
    assert.deepEqual(initial.invalid, [], `${scene.id}: non-finite geometry`);
    const entry = {
      id: scene.id,
      readyMs: Math.round(performance.now() - start),
      ...initial,
      playback: [],
      details: [],
      miniature: [],
    };
    const keys = Object.keys(initial.views).filter(
      (key) => initial.views[key].narration !== false,
    );
    const sceneAssets = assets.filter((asset) => asset.scene === scene.id);
    const viewAssets = sceneAssets.filter(isSceneNarration);
    assert.equal(viewAssets.length, keys.length * 2, scene.id);
    for (const locale of ["en-US", "pt-BR"]) {
      await page.locator("#atlasLanguage").selectOption(locale);
      for (const key of keys) {
        const asset = viewAssets.find(
          (item) => item.locale === locale && (item.view ?? keys[0]) === key,
        );
        assert.ok(asset, `${scene.id}/${key}/${locale}`);
        await page.locator(`[data-view="${key}"]`).click();
        await expect(page.locator(".narration-text")).toHaveText(asset.text);
        await expect(page.locator("#narrationTitle")).toHaveText(asset.title);
        await expect(panel).toHaveAttribute("lang", locale);
        if ((await panel.getAttribute("data-state")) === "ready")
          await page.locator("#narrationPlay").click();
        await expect(panel).toHaveAttribute("data-state", "playing");
        await page.waitForFunction(
          (file) =>
            window.narrationPlayers.some(
              (player) =>
                player.getAttribute("src") === file &&
                !player.paused &&
                player.currentTime > 0.12,
            ),
          asset.file,
        );
        assert.equal(
          await page.evaluate(
            () =>
              window.narrationPlayers.filter((player) => !player.paused).length,
          ),
          1,
          `${asset.id}: overlapping narration`,
        );
        await page.locator("#narrationPlay").click();
        await expect(panel).toHaveAttribute("data-state", "paused");
        entry.playback.push(asset.id);
        if (locale === "en-US" || key === keys[0])
          await page.screenshot({
            path: resolve(output, `${scene.id}--${key}--${locale}.png`),
          });
        if (locale === "en-US")
          await page.locator("#canvasMount").screenshot({
            path: resolve(output, `${scene.id}--${key}--scene.png`),
            style: ".scene-narration { visibility: hidden !important; }",
          });
      }
      await page.locator("#riadDetails").click();
      for (let index = 0; index < scene.details.length; index++) {
        await page
          .locator(".hotspot-layer button")
          .nth(index)
          .evaluate((button) => button.click());
        const text = await page.locator("#riadDetailBody").textContent();
        const asset = findNarrationRecording(manifest.assets, locale, text);
        assert.ok(asset, `${scene.id}: missing ${locale} detail ${index}`);
        await page.locator("#listenButton").click();
        await playing(page, asset);
        await page.locator("#listenButton").click();
        entry.details.push(asset.id);
      }
      await page.locator("#riadDetails").click();
    }
    report.audio.push(
      ...(await page.evaluate(async (tracks) => {
        const decoder = new OfflineAudioContext(1, 1, 24000);
        const result = [];
        for (const track of tracks) {
          const res = await fetch(track.file);
          if (!res.ok) throw new Error(`${track.id}: HTTP ${res.status}`);
          const buffer = await decoder.decodeAudioData(await res.arrayBuffer());
          let sum = 0;
          let peak = 0;
          let clipped = 0;
          let samples = 0;
          for (let channel = 0; channel < buffer.numberOfChannels; channel++)
            for (const sample of buffer.getChannelData(channel)) {
              sum += sample * sample;
              peak = Math.max(peak, Math.abs(sample));
              clipped += Number(Math.abs(sample) >= 0.999);
              samples++;
            }
          result.push({
            id: track.id,
            duration: buffer.duration,
            rms: Math.sqrt(sum / samples),
            peak,
            clippingRatio: clipped / samples,
          });
        }
        return result;
      }, sceneAssets)),
    );
    entry.frameDurations = await page.evaluate(async () => {
      const v = (
        await import("/src/client/viewer/panorama-viewer.js")
      ).getActiveViewer();
      return v.frameDurations;
    });
    const narrator = await page.evaluateHandle(
      async () =>
        (
          await import("/src/client/viewer/panorama-viewer.js")
        ).getActiveViewer().narration,
    );
    await page.locator("#riadExpand").click();
    await expect(page.locator("#placesButton")).toBeVisible();
    assert.equal(await narrator.evaluate((n) => n.snapshot.state), "disposed");
    assert.ok(
      await page.evaluate(() =>
        window.narrationPlayers.every(
          (player) => player.paused && !player.getAttribute("src"),
        ),
      ),
      `${scene.id}: media retained after disposal`,
    );
    await narrator.dispose();
    await context.clearCookies();
    audioRequests.length = 0;
    await page.goto(
      `${base}/?scene=${encodeURIComponent(scene.id)}&version=miniature`,
    );
    await waitForViewer(page, { timeout: 120_000 });
    assert.deepEqual(
      audioRequests,
      [],
      `${scene.id}: miniature audio before consent`,
    );
    const miniatureViews = await page
      .locator("#miniatureViews button")
      .evaluateAll((buttons) => buttons.map((button) => button.dataset.view));
    for (const locale of ["en-US", "pt-BR"]) {
      await page.locator("#atlasLanguage").selectOption(locale);
      for (const key of miniatureViews) {
        await page.locator(`#miniatureViews [data-view="${key}"]`).click();
        const text = await page.locator("#miniatureStoryText").textContent();
        const asset = findNarrationRecording(manifest.assets, locale, text);
        assert.ok(
          asset,
          `${scene.id}/${key}/${locale}: missing miniature recording`,
        );
        await page.locator("#miniatureListen").click();
        await playing(page, asset);
        await page.locator("#miniatureListen").click();
        entry.miniature.push({ view: key, locale, asset: asset.id });
        if (key === "whole")
          await page.screenshot({
            path: resolve(output, `${scene.id}--miniature--${locale}.png`),
          });
      }
    }
    await page.locator("#riadExpand").click();
    assert.ok(
      await page.evaluate(() =>
        window.narrationPlayers.every(
          (player) => player.paused && !player.getAttribute("src"),
        ),
      ),
      `${scene.id}: miniature audio retained after disposal`,
    );
    assert.deepEqual(errors, [], scene.id);
    report.scenes.push(entry);
    await save();
    console.error(
      `${scene.id}: ${entry.playback.length} guided views, ${entry.details.length} details and ${entry.miniature.length} miniature passages played`,
    );
    await page.close();
  }
  for (const audio of report.audio) {
    assert.ok(audio.duration >= 5 && audio.duration <= 65, audio.id);
    assert.ok(audio.rms > 0.006 && audio.rms < 0.3, audio.id);
    assert.ok(audio.peak <= 1 && audio.clippingRatio < 0.001, audio.id);
  }
  report.completedAt = new Date().toISOString();
  await save();
  console.log(
    `${report.scenes.length} scenes; ${report.audio.length} decoded recordings; all playback and cleanup checks passed.`,
  );
} finally {
  await browser.close();
}
