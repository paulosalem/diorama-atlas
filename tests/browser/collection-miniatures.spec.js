import { expect, test } from "@playwright/test";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { curatedScenes } from "../../src/client/catalog/scene-catalog.js";
import { outdoorScenes } from "../../src/client/catalog/outdoor-catalog.js";
import { waitForViewer } from "../../scripts/helpers/browser-viewer.mjs";

test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
test.describe.configure({ timeout: 180_000 });

const directory = new URL("../../data/scenes/", import.meta.url);
const saved = await Promise.all(
  (await readdir(directory))
    .filter((name) => name.endsWith(".json"))
    .map(
      async (name) =>
        JSON.parse(await readFile(new URL(name, directory), "utf8")).scene,
    ),
);
const narrations = JSON.parse(
  await readFile(
    new URL("../../public/narration/manifest.json", import.meta.url),
    "utf8",
  ),
).assets;
const scenes = [...curatedScenes, ...saved, ...outdoorScenes];

async function inspection(page) {
  return page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    return getActiveViewer().inspection;
  });
}

async function settled(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    if (
      request.method() === "GET" &&
      new URL(request.url()).pathname === "/api/generated-scenes"
    )
      return route.continue();
    await route.abort("blockedbyclient");
    throw new Error(`Unexpected provider request: ${request.url()}`);
  });
});

for (const scene of scenes.filter(
  (scene) => scene.id !== "douro-vineyard" && !scene.miniatureNarration,
)) {
  test(`${scene.id}: miniature sections, every view, compact controls and lifecycle`, async ({
    page,
  }, info) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(
      `/?scene=${encodeURIComponent(scene.id)}&version=miniature`,
    );
    await waitForViewer(page);
    await expect(
      page.getByRole("link", { name: "Miniature", exact: true }),
    ).toHaveAttribute("aria-current", "true");
    const initial = await inspection(page);
    expect(initial.finiteGeometry).toBe(true);
    expect(initial.renderer).toBe("three");
    expect(initial.audio.contextState).toBe("closed");
    expect(initial.narration).toBe("idle");
    expect(initial.elapsed).toBe(0);
    await page.screenshot({ path: info.outputPath("whole-closed.png") });
    const interior = scene.environment !== "outdoor";
    const shell = page.locator("#miniatureShell");
    if (interior) {
      await expect(shell).toHaveAttribute("aria-expanded", "false");
      await shell.click();
      expect((await inspection(page)).shell.progress).toBe(1);
      await expect(page).toHaveURL(/open=1/);
      await page.screenshot({ path: info.outputPath("whole-open.png") });
    } else {
      await expect(shell).toBeHidden();
    }
    const space = await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const v = getActiveViewer();
      const gaps =
        (v.runtime.sections ?? []).length === 2
          ? (() => {
              const [first, second] = v.runtime.sections;
              const axis = second.offset.findIndex((value) => value !== 0);
              const across = axis === 0 ? 2 : 0;
              return [0.25, 0.5, 0.75].map((fraction) => {
                const origin = [0, first.max[1] + 2, 0];
                origin[axis] = first.max[axis] + second.offset[axis] / 2;
                origin[across] =
                  first.min[across] +
                  (first.max[across] - first.min[across]) * fraction;
                return v.probe(
                  origin,
                  [0, -1, 0],
                  origin[1] - first.min[1] + 2,
                );
              });
            })()
          : [];
      return {
        gaps,
        probes: (v.runtime.depthProbes ?? []).map((probe) => ({
          id: probe.id,
          minimum: probe.minDistance,
          distance: v.probe(probe.origin, probe.direction, 12, {
            windowSightline: probe.kind === "window",
          }),
        })),
        doors: (v.runtime.openings ?? [])
          .filter((opening) => opening.kind === "door")
          .map((opening) =>
            v.probe(
              opening.center.map(
                (value, axis) =>
                  value +
                  opening.normal[axis] * 0.9 -
                  (axis === 0 ? Math.sign(opening.center[0]) * 0.38 : 0),
              ),
              opening.normal.map((value) => -value),
              8,
            ),
          ),
      };
    });
    for (const gap of space.gaps)
      expect(gap, "clear air between complete sections").toBeNull();
    for (const probe of space.probes)
      expect(
        probe.distance === null || probe.distance >= probe.minimum,
        probe.id,
      ).toBe(true);
    for (const distance of space.doors)
      expect(
        distance === null || distance >= 1.6,
        "thick doorway continues into the room",
      ).toBe(true);
    const buttons = page.locator("#miniatureViews [data-view]");
    const keys = await buttons.evaluateAll((elements) =>
      elements.map((element) => element.dataset.view),
    );
    expect(keys.length).toBeGreaterThanOrEqual(5);
    for (const key of keys.slice(1)) {
      await page.locator(`[data-view="${key}"]`).click();
      await settled(page);
      const state = await inspection(page);
      expect(state.selected).toBe(key);
      if (interior) expect(state.shell.progress).toBe(1);
      const alignment = await page.evaluate(async (key) => {
        const THREE = await import("three");
        const { getActiveViewer } =
          await import("/src/client/viewer/panorama-viewer.js");
        const viewer = getActiveViewer();
        const target = new THREE.Vector3(...viewer.runtime.views[key].target);
        return viewer.camera
          .getWorldDirection(new THREE.Vector3())
          .dot(target.sub(viewer.camera.position).normalize());
      }, key);
      expect(
        alignment,
        `${key}: the actual camera faces its authored target`,
      ).toBeCloseTo(1, 8);
      const transcript = narrations.find(
        (asset) =>
          asset.scene === scene.id &&
          asset.locale === "en-US" &&
          (asset.view ?? keys[1]) === key,
      );
      if (
        transcript &&
        !["textile", "balinese-subak-terraces"].includes(scene.id)
      )
        await expect(page.locator("#miniatureStoryText")).toHaveText(
          transcript.text,
        );
      await page.screenshot({ path: info.outputPath(`view-${key}.png`) });
    }
    await page.locator("#atlasLanguage").selectOption("pt-BR");
    await expect(
      page.getByRole("link", { name: "Miniatura", exact: true }),
    ).toHaveAttribute("aria-current", "true");
    const translated = narrations.find(
      (asset) =>
        asset.scene === scene.id &&
        asset.locale === "pt-BR" &&
        asset.view === keys.at(-1),
    );
    if (
      translated &&
      !["textile", "balinese-subak-terraces"].includes(scene.id)
    )
      await expect(page.locator("#miniatureStoryText")).toHaveText(
        translated.text,
      );
    await page.locator("#atlasLanguage").selectOption("en-US");
    await page.locator("#wholeMiniature").click();
    if (interior) {
      await shell.click();
      expect((await inspection(page)).shell.offset).toEqual([0, 0, 0]);
      await page.locator(`[data-view="${keys.at(-1)}"]`).click();
      expect((await inspection(page)).shell.open).toBe(true);
      await shell.click();
      expect((await inspection(page)).selected).toBe("whole");
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await settled(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator("#wholeMiniature")).toBeVisible();
    await page.screenshot({ path: info.outputPath("compact.png") });
    if (interior) {
      await shell.click();
      expect((await inspection(page)).shell.progress).toBe(1);
      await page.screenshot({ path: info.outputPath("compact-open.png") });
    }
    await page.locator("#soundscapeButton").click();
    await page.locator("#ambientSound").click();
    await expect(page.locator("#ambientSound")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByRole("button", { name: "Mute all", exact: true }).click();
    expect((await inspection(page)).audio.contextState).toBe("closed");
    await page.getByRole("button", { name: "Close soundscape" }).click();
    await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      window.previousMiniature = getActiveViewer();
    });
    await page
      .getByRole("link", {
        name: interior ? "Interior" : "Landscape",
        exact: true,
      })
      .click();
    await waitForViewer(page);
    expect(
      await page.evaluate(() => window.previousMiniature.inspection.disposed),
    ).toBe(true);
    expect(
      await page.evaluate(() =>
        window.previousMiniature.renderer.getContext().isContextLost(),
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await writeFile(
      info.outputPath("physical-space.json"),
      JSON.stringify(space, null, 2),
    );
  });
}

for (const scene of scenes.filter((scene) => scene.miniatureNarration)) {
  test(`${scene.id}: shared-runtime miniature plays every bilingual view and restores its envelope`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(`/?scene=${scene.id}&version=miniature&view=garden&open=1`);
    await waitForViewer(page);
    await expect(
      page.locator('[data-miniature-view="garden"]'),
    ).toHaveAttribute("aria-pressed", "true");
    const keys = Object.keys(scene.miniatureNarration);
    await expect(page.locator("[data-miniature-view]")).toHaveCount(
      keys.length,
    );
    for (const locale of ["en-US", "pt-BR"]) {
      await page.locator("#atlasLanguage").selectOption(locale);
      for (const key of keys) {
        await page.locator(`[data-miniature-view="${key}"]`).click();
        const asset = narrations.find(
          (item) =>
            item.scene === scene.id &&
            item.locale === locale &&
            (item.view ?? "intro") === scene.miniatureNarration[key],
        );
        expect(asset).toBeTruthy();
        await expect(page.locator(".narration-text")).toHaveText(asset.text);
        await expect(page.locator(".scene-narration")).not.toHaveAttribute(
          "data-state",
          "loading",
        );
        if (
          (await page
            .locator(".scene-narration")
            .getAttribute("data-state")) !== "playing"
        )
          await page.locator("#narrationPlay").click();
        await expect(page.locator(".scene-narration")).toHaveAttribute(
          "data-state",
          "playing",
        );
        await page.locator("#narrationPlay").click();
      }
    }
    await page.locator(".miniature-roof").click();
    await expect(page).toHaveURL(/open=0/);
    await page.reload();
    await waitForViewer(page);
    expect(
      await page.evaluate(async () => {
        const { getActiveViewer } =
          await import("/src/client/viewer/panorama-viewer.js");
        const viewer = getActiveViewer();
        return {
          roof: viewer.runtime.group
            .getObjectByName("domus-roofs")
            .position.toArray(),
          upper: viewer.runtime.group.getObjectByName("domus-lifted-envelope")
            .visible,
        };
      }),
    ).toEqual({ roof: [0, 0, 0], upper: false });
    await page.locator('[data-mode="interior"]').click();
    await expect(page.locator(".walking-pad")).toBeVisible();
    await expect(page.locator(".scene-narration")).not.toHaveAttribute(
      "data-state",
      "error",
    );
    expect(errors).toEqual([]);
  });
}

test("opening reverses, restores its URL and keeps reflection memory stable", async ({
  page,
}) => {
  await page.goto("/?scene=riad&version=miniature&open=1");
  await waitForViewer(page);
  expect((await inspection(page)).shell.progress).toBe(1);
  await page.reload();
  await waitForViewer(page);
  expect((await inspection(page)).shell.progress).toBe(1);
  const samples = [];
  for (let index = 0; index < 6; index++) {
    await page.locator("#miniatureShell").click();
    await settled(page);
    samples.push(
      await page.evaluate(async () => {
        const { getActiveViewer } =
          await import("/src/client/viewer/panorama-viewer.js");
        return { ...getActiveViewer().renderer.info.memory };
      }),
    );
  }
  expect(samples.slice(1)).toEqual(Array(5).fill(samples[0]));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator("#miniatureMotion").click();
  const before = (await inspection(page)).elapsed;
  await page.locator("#miniatureShell").click();
  await expect
    .poll(async () => (await inspection(page)).shell.moving)
    .toBe(true);
  const middle = (await inspection(page)).shell.progress;
  expect(middle).toBeGreaterThan(0);
  expect(middle).toBeLessThan(1);
  await page.locator("#miniatureShell").click();
  await expect
    .poll(async () => (await inspection(page)).shell.progress)
    .toBe(1);
  expect((await inspection(page)).elapsed).toBe(before);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#miniatureShell").click();
  expect((await inspection(page)).shell.offset).toEqual([0, 0, 0]);
});

test("a direct detail link preserves its camera and mirrors never reflect a black studio void", async ({
  page,
}, info) => {
  await page.goto("/?scene=meyhane&version=miniature&view=tiles");
  await waitForViewer(page);
  await settled(page);
  const result = await page.evaluate(async () => {
    const THREE = await import("three");
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    const viewer = getActiveViewer();
    const target = new THREE.Vector3(...viewer.runtime.views.tiles.target);
    const mirrors = [];
    viewer.runtime.group.traverse((object) => {
      if (!object.isReflector) return;
      const renderTarget = object.getRenderTarget();
      const length = renderTarget.width * renderTarget.height * 4;
      const pixels =
        renderTarget.texture.type === THREE.HalfFloatType
          ? new Uint16Array(length)
          : new Uint8Array(length);
      viewer.renderer.readRenderTargetPixels(
        renderTarget,
        0,
        0,
        renderTarget.width,
        renderTarget.height,
        pixels,
      );
      let black = 0;
      for (let index = 0; index < length; index += 4)
        if (
          pixels[index] === 0 &&
          pixels[index + 1] === 0 &&
          pixels[index + 2] === 0
        )
          black++;
      mirrors.push(black / (length / 4));
    });
    return {
      alignment: viewer.camera
        .getWorldDirection(new THREE.Vector3())
        .dot(target.sub(viewer.camera.position).normalize()),
      mirrors,
      backgroundRestored: viewer.scene.background === null,
    };
  });
  expect(result.alignment).toBeCloseTo(1, 8);
  expect(result.backgroundRestored).toBe(true);
  expect(result.mirrors).toHaveLength(1);
  expect(result.mirrors[0]).toBeLessThan(0.01);
  await page.screenshot({ path: info.outputPath("opened-mirror.png") });
});
