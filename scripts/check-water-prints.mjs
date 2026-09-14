import { chromium } from "@playwright/test";
import { waitForViewer } from "./helpers/browser-viewer.mjs";
import { linkGalleryToApp } from "./helpers/gallery-links.mjs";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { curatedScenes } from "../src/client/catalog/scene-catalog.js";
import { outdoorScenes } from "../src/client/catalog/outdoor-catalog.js";

const base = process.env.ATLAS_URL ?? "http://127.0.0.1:4183";
const response = await fetch(`${base}/api/generated-scenes`);
if (!response.ok) throw new Error("Cannot load the saved scene list.");
const scenes = [
  ...curatedScenes,
  ...(await response.json()).scenes,
  ...outdoorScenes,
];
const output = resolve("outputs/water-prints");
const viewport = { width: 1440, height: 1000 };
const captureStyle = ".scene-narration { visibility: hidden !important; }";
const previousPreviewCredits = JSON.parse(
  await readFile(resolve("public/previews/credits.json"), "utf8"),
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  channel: "chromium",
  args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
});
const page = await browser.newPage({
  viewport,
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
const waterViews = {
  riad: "fountain",
  "venetian-boatyard": "canal",
  "naxi-canal-quarter": "stream",
  "tunisian-terrace-cafe": "outlook",
  "balinese-subak-terraces": "rice",
  "kerala-backwater-kitchen-courtyard-aadf7c": "verandah",
};
try {
  for (const scene of scenes) {
    errors = [];
    console.log(`Inspecting images and water: ${scene.title}`);
    await page.goto(`${base}/?scene=${scene.id}&inspect=1`);
    await waitForViewer(page, { timeout: 120_000 });
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
      const art = new Map();
      runtime.group.traverse((object) => {
        if (!object.isMesh) return;
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          if (material.userData.artwork)
            art.set(material.userData.artwork, {
              image: material.userData.artwork,
              role: material.userData.artworkRole ?? "artwork",
              loaded: Boolean(material.map?.image?.width > 0),
            });
        }
      });
      return { views: Object.keys(runtime.views), artwork: [...art.values()] };
    });
    assert.ok(
      data.artwork.every((entry) => entry.loaded),
      scene.id,
    );
    if (scene.environment !== "outdoor")
      assert.ok(
        data.artwork.length >= 3,
        `Missing printed imagery in ${scene.id}`,
      );
    const arrival = `${scene.id}--arrival.png`;
    const image = await page
      .locator("#canvasMount")
      .screenshot({ path: resolve(output, arrival), style: captureStyle });
    assert.ok(
      image
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      `Invalid PNG capture for ${scene.id}`,
    );
    previews.push({
      file: `${scene.id}.png`,
      scene: scene.id,
      view: data.views[0],
      width: image.readUInt32BE(16),
      height: image.readUInt32BE(20),
      bytes: image.length,
      sha256: createHash("sha256").update(image).digest("hex"),
    });
    const focus =
      [
        "desk",
        "herbs",
        "records",
        "bar",
        "dyes",
        "spices",
        "tea",
        "workshop",
        "pavilion",
      ].find((key) => data.views.includes(key)) ?? data.views.at(-1);
    await page.evaluate(async (key) => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const viewer = getActiveViewer();
      viewer.selectView(key);
      viewer.camera.fov = 36;
      viewer.camera.updateProjectionMatrix();
    }, focus);
    const detail = `${scene.id}--print-detail.png`;
    await page
      .locator("#canvasMount")
      .screenshot({ path: resolve(output, detail), style: captureStyle });
    const waterView = waterViews[scene.id];
    if (waterView)
      assert.ok(
        data.views.includes(waterView),
        `${scene.id}: missing water viewpoint`,
      );
    if (waterView)
      for (const time of [0, 7]) {
        await page.evaluate(
          async ({ key, time }) => {
            const { getActiveViewer } =
              await import("/src/client/viewer/panorama-viewer.js");
            const viewer = getActiveViewer();
            viewer.selectView(key);
            viewer.runtime.animations.forEach((animate) => animate(0, time));
          },
          { key: waterView, time },
        );
        await page.locator("#canvasMount").screenshot({
          path: resolve(output, `${scene.id}--water-${time}.png`),
          style: captureStyle,
        });
      }
    assert.deepEqual(errors, [], scene.id);
    results.push({
      id: scene.id,
      title: scene.title,
      detail,
      arrival,
      focus,
      ...data,
      errors: [...errors],
    });
  }
  const checkedAt = new Date().toISOString();
  for (const [index, scene] of scenes.entries()) {
    const previewDirectory = resolve(
      scene.environment === "outdoor"
        ? "public/outdoors/previews"
        : "public/previews",
    );
    await mkdir(previewDirectory, { recursive: true });
    await copyFile(
      resolve(output, results[index].arrival),
      resolve(previewDirectory, previews[index].file),
    );
  }
  await writeFile(
    resolve("public/previews/credits.json"),
    JSON.stringify(
      {
        source:
          "Local Three.js renders of the atlas environments; no image-generation service was used to capture these previews.",
        viewport,
        reducedMotion: true,
        capture: { target: "#canvasMount", deviceScaleFactor: 1 },
        checkedAt,
        rendered: previews.filter(
          (preview) =>
            scenes.find((scene) => scene.id === preview.scene).environment !==
            "outdoor",
        ),
        materials: [
          "../riad/materials/manifest.json",
          "../interiors/materials/manifest.json",
        ],
        history: previousPreviewCredits.history ?? [],
      },
      null,
      2,
    ) + "\n",
  );
  await writeFile(
    resolve(output, "validation.json"),
    JSON.stringify(
      {
        checkedAt,
        viewport,
        reducedMotion: true,
        capture: { target: "#canvasMount", deviceScaleFactor: 1 },
        scenes: results,
      },
      null,
      2,
    ) + "\n",
  );
  const esc = (text) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll('"', "&quot;");
  const cards = results
    .map(
      (scene) =>
        `<article><a href="/?scene=${scene.id}&inspect=1&view=${scene.focus}"><img loading="lazy" src="${scene.detail}" alt="${esc(scene.title)}"><h2>${esc(scene.title)}</h2></a><p>${scene.artwork.length} image-based material${scene.artwork.length === 1 ? "" : "s"} in the scene</p><nav><a href="/?scene=${scene.id}&inspect=1">Enter the place</a>${waterViews[scene.id] ? `<a href="${scene.id}--water-0.png">Water at 0 s</a><a href="${scene.id}--water-7.png">Water at 7 s</a>` : ""}</nav></article>`,
    )
    .join("");
  await writeFile(
    resolve(output, "index.html"),
    linkGalleryToApp(
      `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Atlas · Water and printed details</title><style>*{box-sizing:border-box}body{margin:0;background:#142126;color:#eae5d8;font:14px system-ui}header,main{max-width:1450px;margin:auto;padding:35px 25px}h1{font:42px Georgia}p{color:#b9c9c2;line-height:1.8}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(380px,100%),1fr));gap:25px;padding-top:0}article{background:#1c2f33;border-radius:10px;overflow:hidden}img{width:100%;display:block}a{color:#d9c194;text-decoration:none}h2{font:24px Georgia;margin:18px}article p,nav{font-size:11px;margin:15px 18px}nav{display:flex;gap:15px;flex-wrap:wrap;padding-bottom:5px}</style><header><a href="/">Return to the world</a><h1>Water, paper and small signs of life.</h1><p>Image-based book covers, illustrated pages, curved container labels and appropriate wall prints, together with less regular water flow and reflections. All previews are captured from the running environments.</p></header><main>${cards}</main></html>`,
      base,
    ),
  );
  console.log(`Verified ${results.length} scenes.`);
} catch (error) {
  console.error({
    url: page.url(),
    errors,
    body: await page.locator("body").allTextContents(),
  });
  throw error;
} finally {
  await browser.close();
}
