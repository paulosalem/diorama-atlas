import { chromium } from "@playwright/test";
import { waitForViewer } from "./helpers/browser-viewer.mjs";
import { linkGalleryToApp } from "./helpers/gallery-links.mjs";
import { mkdir, readFile, readdir, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { outdoorScenes } from "../src/client/catalog/outdoor-catalog.js";

const base = process.env.ATLAS_URL ?? "http://127.0.0.1:4183";
const selected = new Set(process.argv.slice(2));
for (const id of selected)
  assert.ok(
    outdoorScenes.some((scene) => scene.id === id),
    `Unknown outdoor scene: ${id}`,
  );
const scenes = selected.size
  ? outdoorScenes.filter((scene) => selected.has(scene.id))
  : outdoorScenes;
async function sourceFiles(directory) {
  const entries = await readdir(new URL(`../${directory}/`, import.meta.url), {
    withFileTypes: true,
  });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = `${directory}/${entry.name}`;
        if (entry.isDirectory()) return sourceFiles(path);
        if (!entry.isFile())
          throw new Error(`Source must be a regular file: ${path}`);
        return path;
      }),
    )
  ).flat();
}
async function sourceHashes() {
  const sources = [
    ...(await sourceFiles("src")),
    ...(await sourceFiles("data")),
    ...(await sourceFiles("scripts")),
    "index.html",
    "package.json",
    "package-lock.json",
    "public/print-library/manifest.json",
    "public/print-library/sources.json",
    "public/previews/credits.json",
    "public/outdoors/references.json",
    "public/outdoors/materials/manifest.json",
    "public/outdoors/detail-assets/manifest.json",
    "public/outdoors/generated/manifest.json",
    "public/audio/manifest.json",
    "public/credits.json",
  ].sort();
  return Object.fromEntries(
    await Promise.all(
      sources.map(async (file) => [
        file,
        createHash("sha256")
          .update(await readFile(new URL(`../${file}`, import.meta.url)))
          .digest("hex"),
      ]),
    ),
  );
}
const capturedSources = await sourceHashes();
const output = resolve("outputs/outdoor-review");
await mkdir(output, { recursive: true });
await mkdir(resolve("public/outdoors/previews"), { recursive: true });
const browser = await chromium.launch({
  headless: true,
  channel: "chromium",
  args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
const results = [];
let errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("response", (response) => {
  if (response.status() >= 400)
    errors.push(`${response.status()} ${response.url()}`);
});
try {
  for (const definition of scenes) {
    errors = [];
    console.log(`Inspecting ${definition.title}`);
    await page.goto(`${base}/?scene=${definition.id}&inspect=1`);
    await waitForViewer(page);
    const evidence = await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const { runtime, renderer, camera } = getActiveViewer();
      let triangles = 0,
        meshes = 0,
        invalid = 0,
        materials = new Set();
      runtime.group.traverse((object) => {
        if (!object.isMesh) return;
        meshes++;
        const geometry = object.geometry;
        const count =
          geometry.index?.count ?? geometry.attributes.position.count;
        triangles += (count / 3) * (object.isInstancedMesh ? object.count : 1);
        for (const value of geometry.attributes.position.array)
          if (!Number.isFinite(value)) invalid++;
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material])
          materials.add(material.uuid);
      });
      const sun = runtime.group.children.find(
        (object) => object.isDirectionalLight && object.castShadow,
      );
      return {
        triangles,
        meshes,
        materials: materials.size,
        invalid,
        views: Object.keys(runtime.views),
        camera: camera.position.toArray(),
        viewLabels: Object.fromEntries(
          Object.entries(runtime.views).map(([key, view]) => [key, view.label]),
        ),
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        shadowCoverage: sun
          ? {
              width: sun.shadow.camera.right - sun.shadow.camera.left,
              projectionScale: sun.shadow.camera.projectionMatrix.elements[0],
              resolution: sun.shadow.mapSize.x,
            }
          : null,
        environmentIntensity: runtime.group.parent.environmentIntensity,
      };
    });
    assert.equal(evidence.invalid, 0, definition.id);
    assert.ok(evidence.views.length >= 4, definition.id);
    assert.ok(
      evidence.shadowCoverage,
      `${definition.id} needs directional shadows`,
    );
    assert.ok(
      Math.abs(
        evidence.shadowCoverage.projectionScale *
          evidence.shadowCoverage.width -
          2,
      ) < 0.00001,
    );
    assert.ok(
      evidence.environmentIntensity <= 0.25,
      `${definition.id} sky fill must preserve sun/shadow contrast`,
    );
    assert.ok(
      evidence.triangles > 15000,
      `${definition.id} must contain substantial actual geometry`,
    );
    const directory = resolve(output, definition.id);
    await mkdir(directory, { recursive: true });
    for (const [index, key] of evidence.views.entries()) {
      await page.locator(`[data-view="${key}"]`).click();
      await page.evaluate(
        () =>
          new Promise((done) =>
            requestAnimationFrame(() => requestAnimationFrame(done)),
          ),
      );
      await page.screenshot({ path: resolve(directory, `${key}.png`) });
      if (index === 0)
        await page.locator("#canvasMount").screenshot({
          path: resolve(`public/outdoors/previews/${definition.id}.png`),
        });
    }
    await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const viewer = getActiveViewer();
      const { runtime, camera } = viewer;
      const arrival = Object.values(runtime.views)[0];
      viewer.selectView(Object.keys(runtime.views)[0]);
      viewer.lookAt([
        camera.position.x * 2 - arrival.target[0],
        arrival.target[1],
        camera.position.z * 2 - arrival.target[2],
      ]);
    });
    await page.screenshot({ path: resolve(directory, "look-behind.png") });
    await page.getByRole("button", { name: "Reset view", exact: true }).click();
    await page
      .getByRole("button", { name: "Show details", exact: true })
      .click();
    await page.evaluate(() => new Promise(requestAnimationFrame));
    assert.equal(await page.locator(".hotspot").count(), 4);
    const visibleHotspots = page.locator(".hotspot:not([hidden])");
    assert.ok((await visibleHotspots.count()) > 0);
    await visibleHotspots.first().click({ force: true });
    assert.ok(await page.locator("#riadDetailBody").textContent());
    await page
      .getByRole("button", { name: "Hide details", exact: true })
      .click();
    await page.getByRole("button", { name: "References", exact: true }).click();
    await page.locator("#outdoorReferences figure").first().waitFor();
    assert.ok((await page.locator("#outdoorReferences figure").count()) >= 2);
    await page
      .getByRole("button", {
        name: "Close photographic references",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "Reset view", exact: true }).click();
    const before = await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      return getActiveViewer().camera.quaternion.toArray();
    });
    await page.locator("#canvasMount canvas").focus();
    await page.keyboard.press("ArrowRight");
    const after = await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      return getActiveViewer().camera.quaternion.toArray();
    });
    assert.notDeepEqual(after, before);
    await page
      .locator("#canvasMount canvas")
      .dispatchEvent("wheel", { deltaY: -10000, cancelable: true });
    assert.equal(
      await page.evaluate(async () => {
        const { getActiveViewer } =
          await import("/src/client/viewer/panorama-viewer.js");
        return getActiveViewer().camera.fov;
      }),
      18,
    );
    await page
      .locator("#canvasMount canvas")
      .dispatchEvent("wheel", { deltaY: 10000, cancelable: true });
    assert.equal(
      await page.evaluate(async () => {
        const { getActiveViewer } =
          await import("/src/client/viewer/panorama-viewer.js");
        return getActiveViewer().camera.fov;
      }),
      85,
    );
    await page.getByRole("button", { name: "Reset view", exact: true }).click();
    const audioBefore = await page.evaluate(async () => {
      const { getAtlasAudio } = await import("/src/client/main.js");
      return {
        snapshot: getAtlasAudio().snapshot,
        inspection: getAtlasAudio().inspection,
      };
    });
    assert.equal(
      audioBefore.snapshot.ambienceEnabled,
      false,
      "Ambience must remain opt-in.",
    );
    assert.equal(audioBefore.inspection.ambience.sources, 0);
    await page.locator("#soundscapeButton").click();
    await page
      .getByRole("button", { name: "Enable ambience", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Mute ambience", exact: true })
      .waitFor({ timeout: 30_000 });
    const playing = await page.evaluate(async () => {
      const { getAtlasAudio } = await import("/src/client/main.js");
      return getAtlasAudio().inspection.ambience;
    });
    assert.equal(playing.state, "playing");
    assert.ok(playing.sources > 0);
    await page
      .getByRole("button", { name: "Mute ambience", exact: true })
      .click();
    const audioAfter = await page.evaluate(async () => {
      const { getAtlasAudio } = await import("/src/client/main.js");
      return {
        snapshot: getAtlasAudio().snapshot,
        inspection: getAtlasAudio().inspection,
      };
    });
    assert.equal(audioAfter.snapshot.ambienceEnabled, false);
    assert.equal(audioAfter.inspection.ambience.sources, 0);
    assert.equal(audioAfter.inspection.ambience.bufferBytes, 0);
    await page
      .getByRole("button", { name: "Close soundscape", exact: true })
      .click();
    assert.deepEqual(errors, [], `${definition.id}: ${errors.join("; ")}`);
    results.push({
      id: definition.id,
      title: definition.title,
      ...evidence,
      errors: [...errors],
    });
  }
  await page.goto(base);
  await page.locator("#worldLoading").waitFor({ state: "hidden" });
  await page
    .getByRole("button", { name: "About Atlas and asset credits", exact: true })
    .click();
  await page.locator(".credit-entry").first().waitFor();
  await page
    .getByPlaceholder("Filter by asset, author or license")
    .fill("NASA");
  assert.equal(await page.locator(".credit-entry").count(), 1);
  await page
    .getByRole("button", { name: "Close About and credits", exact: true })
    .click();
  await page.getByRole("button", { name: "Places", exact: true }).click();
  assert.equal(await page.locator("[data-destination]").count(), 19);
  for (const definition of outdoorScenes)
    assert.equal(
      await page.locator(`[data-destination="${definition.location}"]`).count(),
      1,
    );
  await page.locator('[data-destination="kathmandu-valley"]').click();
  await page.locator("#placePreview:not([hidden]) .preview-main").waitFor();
  await page.locator("#placePreview .preview-main").click();
  await waitForViewer(page);
  assert.ok(page.url().includes("newar-potters-square"));
  await page.setViewportSize({ width: 390, height: 844 });
  const sceneUrl = page.url();
  await page
    .getByRole("button", { name: "About Atlas and asset credits", exact: true })
    .click();
  await page.locator(".credit-entry").first().waitFor();
  await page.keyboard.press("Escape");
  assert.equal(page.url(), sceneUrl);
  await page.screenshot({ path: resolve(output, "mobile.png") });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.getByRole("button", { name: "References", exact: true }).click();
  await page.locator("#outdoorReferences figure").first().waitFor();
  await page.screenshot({ path: resolve(output, "mobile-references.png") });
  await page
    .getByRole("button", { name: "Close photographic references" })
    .click();
  await page.keyboard.press("Escape");
  await page.waitForURL(`${base}/`);
  for (const id of ["riad", "kissaten"]) {
    await page.goto(`${base}/?scene=${id}&inspect=1`);
    await waitForViewer(page);
    assert.ok((await page.locator(".riad-viewpoints button").count()) >= 4);
  }
  assert.deepEqual(
    await sourceHashes(),
    capturedSources,
    "Source changed during inspection; capture the updated collection again.",
  );
  await writeFile(
    resolve(output, "validation.json"),
    JSON.stringify(
      {
        status: "passed",
        scope: selected.size ? "selected" : "complete-collection",
        verifiedAt: new Date().toISOString(),
        sources: capturedSources,
        results,
      },
      null,
      2,
    ),
  );
  const escape = (text) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll('"', "&quot;");
  const cards = results
    .map(
      (result) =>
        `<article><a href="/?scene=${result.id}&inspect=1"><img src="/public/outdoors/previews/${result.id}.png" alt="${escape(result.title)}"><h2>${escape(result.title)}</h2></a><nav>${result.views.map((view) => `<a href="/?scene=${result.id}&inspect=1&view=${view}">${escape(result.viewLabels[view])}</a>`).join("")}</nav></article>`,
    )
    .join("");
  const template = await readFile(
    new URL("./templates/outdoor-gallery.html", import.meta.url),
    "utf8",
  );
  assert.ok(
    template.includes("{{cards}}"),
    "The review template must contain its card slot.",
  );
  await writeFile(
    resolve(output, "index.html"),
    linkGalleryToApp(template.replace("{{cards}}", cards), base),
  );
  console.log(
    `Verified ${results.length} outdoor environments. Review: ${resolve(output, "index.html")} (serve outputs separately; scene links target ${base}).`,
  );
  await unlink(resolve(output, "failure.png")).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
} catch (error) {
  console.error(error);
  console.error("Browser failure evidence:", {
    url: page.url(),
    errors,
    visibleText: await page.locator("body").allTextContents(),
  });
  await page.screenshot({
    path: resolve(output, "failure.png"),
    timeout: 5000,
  });
  throw error;
} finally {
  await browser.close();
}
