import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { waitForViewer } from "../../scripts/helpers/browser-viewer.mjs";

test.use({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
test.describe.configure({ timeout: 360_000 });

async function inspection(page) {
  return page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    return getActiveViewer().inspection;
  });
}

test("Douro versions preserve the visit, native views, clear space and silent lifecycle", async ({
  page,
}, info) => {
  const errors = [];
  const obsoleteRequests = [];
  page.on("request", (request) => {
    if (/babylon|public\/dioramas/.test(request.url()))
      obsoleteRequests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", (route) => {
    if (new URL(route.request().url()).pathname === "/api/generated-scenes")
      return route.continue();
    errors.push(`Unexpected provider request: ${route.request().url()}`);
    return route.abort();
  });
  await page.goto("/?scene=douro-vineyard&inspect=1");
  await waitForViewer(page, { timeout: 180_000 });
  await expect(page.locator(".scene-narration")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await expect(page.locator("#narrationTitle")).toHaveText(
    "A landscape made through work",
  );
  await expect(
    page.getByRole("link", { name: "Landscape", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  await page.screenshot({ path: info.outputPath("landscape-arrival.png") });
  await page.locator('[data-view="yard"]').click();
  await expect(page.locator(".scene-narration")).toBeHidden();
  await page.locator('[data-view="railway"]').click();
  await expect(page.locator(".scene-narration")).toBeHidden();
  await page.locator('[data-view="arrival"]').click();
  await expect(page.locator(".scene-narration")).toBeVisible();
  await page.locator('[data-view="yard"]').click();
  await page.screenshot({ path: info.outputPath("landscape-yard.png") });
  await page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    window.previousDouro = getActiveViewer();
  });
  const miniature = page.getByRole("link", { name: "Miniature", exact: true });
  await miniature.focus();
  await page.keyboard.press("Enter");
  await waitForViewer(page, { timeout: 180_000 });
  await expect(miniature).toHaveAttribute("aria-current", "true");
  await expect(miniature).toBeFocused();
  await expect(page).toHaveURL(/version=miniature.*view=whole/);
  const initial = await inspection(page);
  expect(initial.finiteGeometry).toBe(true);
  expect(initial.paused).toBe(true);
  expect(initial.audio.state).not.toBe("playing");
  expect(initial.audio.contextState).not.toBe("running");
  expect(initial.narration).toBe("idle");
  expect(initial.camera.mode).toBe("orbit");
  expect(initial.renderer).toBe("three");
  await page.waitForTimeout(300);
  expect((await inspection(page)).reflectionCaptures).toBe(
    initial.reflectionCaptures,
  );
  await page.screenshot({ path: info.outputPath("miniature-whole.png") });
  const geometry = await page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    const v = getActiveViewer(),
      ray = (...args) => v.probe(...args);
    const { miniature } = v.runtime;
    const THREE = await import("three");
    return {
      life: miniature.life,
      railway: miniature.railway,
      cavities: v.runtime.depthProbes.map((probe) => ({
        id: probe.id,
        minDistance: probe.minDistance,
        distance: ray(probe.origin, probe.direction, 8),
      })),
      doorway: [-7.12, -6.65, -6.18].flatMap((x) =>
        [0.16, 1.2, 2.05].map((y) => ray([x, y, 2.1], [0, 0, -1], 6.6)),
      ),
      gap: [-10, 0, 10].map((x) => ray([x, 20, -26.2], [0, -1, 0], 35)),
      stairs: miniature.stairs.flatMap((stair) =>
        stair.steps.map(([x, y, z]) => ray([x, y + 0.25, z], [0, -1, 0], 0.5)),
      ),
      framing: (() => {
        const points = [];
        v.camera.updateMatrixWorld();
        for (const x of [initialBound(v, "min", 0), initialBound(v, "max", 0)])
          for (const y of [
            initialBound(v, "min", 1),
            initialBound(v, "max", 1),
          ])
            for (const z of [
              initialBound(v, "min", 2),
              initialBound(v, "max", 2),
            ])
              points.push(
                new THREE.Vector3(x, y, z).project(v.camera).toArray(),
              );
        return points;
      })(),
    };
    function initialBound(viewer, bound, axis) {
      return viewer.inspection.bounds[bound][axis];
    }
  });
  expect(geometry.life.crates).toBe(5);
  expect(geometry.railway.gauge).toBe(1.668);
  expect(geometry.railway.supports.length).toBeGreaterThanOrEqual(9);
  expect(geometry.life.grassClumps).toBeGreaterThan(900);
  expect(geometry.doorway).toEqual(Array(9).fill(null));
  expect(geometry.gap).toEqual([null, null, null]);
  expect(geometry.stairs).toHaveLength(24);
  for (const distance of geometry.stairs) expect(distance).toBeCloseTo(0.25, 2);
  for (const probe of geometry.cavities) {
    if (probe.id === "quinta-door" && probe.distance === null) continue;
    expect(probe.distance, probe.id).not.toBeNull();
    expect(probe.distance, probe.id).toBeGreaterThanOrEqual(probe.minDistance);
  }
  for (const [x, y] of geometry.framing) {
    expect(Math.abs(x)).toBeLessThan(0.9);
    expect(Math.abs(y)).toBeLessThan(0.9);
  }
  for (const view of [
    "arrival",
    "vines",
    "terraces",
    "quinta",
    "yard",
    "railway",
    "river",
    "geology",
    "hills",
    "harvest",
  ]) {
    await page.locator(`[data-view="${view}"]`).click();
    await page.waitForTimeout(300);
    expect((await inspection(page)).selected).toBe(view);
    await page.screenshot({ path: info.outputPath(`miniature-${view}.png`) });
  }
  await page.locator("#wholeMiniature").click();
  const before = (await inspection(page)).camera;
  const reflectionCaptures = (await inspection(page)).reflectionCaptures;
  await page.locator("#miniatureZoomIn").click();
  expect((await inspection(page)).camera.radius).toBeLessThan(before.radius);
  await expect
    .poll(async () => (await inspection(page)).reflectionCaptures)
    .toBeGreaterThan(reflectionCaptures);
  await page.locator("#resetViewButton").click();
  await page.locator("#miniatureCanvas").focus();
  await page.keyboard.press("ArrowRight", { delay: 250 });
  expect((await inspection(page)).camera.position).not.toEqual(before.position);
  await page.locator("#resetViewButton").click();
  await page.locator("#atlasLanguage").selectOption("pt-BR");
  await expect(
    page.getByRole("link", { name: "Miniatura", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  expect((await inspection(page)).camera.position).toEqual(before.position);
  await page.locator("#atlasLanguage").selectOption("en-US");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: info.outputPath("miniature-compact.png") });
  const compactFraming = await page.evaluate(async () => {
    const THREE = await import("three");
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    const viewer = getActiveViewer(),
      { min, max } = viewer.inspection.bounds;
    viewer.camera.updateMatrixWorld();
    const points = [];
    for (const x of [min[0], max[0]])
      for (const y of [min[1], max[1]])
        for (const z of [min[2], max[2]])
          points.push(
            new THREE.Vector3(x, y, z).project(viewer.camera).toArray(),
          );
    return points;
  });
  for (const [x, y] of compactFraming) {
    expect(Math.abs(x)).toBeLessThan(0.9);
    expect(Math.abs(y)).toBeLessThan(0.9);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator("#miniatureCanvas")
      .evaluate((element) => element.clientHeight),
  ).toBeGreaterThan(190);
  expect(
    await page
      .locator("#miniatureViews")
      .evaluate((element) => getComputedStyle(element).flexWrap),
  ).toBe("nowrap");
  await page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    window.previousDouro = getActiveViewer();
  });
  await page.getByRole("link", { name: "Landscape", exact: true }).click();
  await waitForViewer(page, { timeout: 180_000 });
  expect(
    await page.evaluate(() => window.previousDouro.inspection.disposed),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      window.previousDouro.renderer.getContext().isContextLost(),
    ),
  ).toBe(true);
  await page.goBack();
  await waitForViewer(page, { timeout: 180_000 });
  expect((await inspection(page)).selected).toBe("whole");
  await writeFile(
    info.outputPath("inspection.json"),
    JSON.stringify({ initial, geometry, errors }, null, 2),
  );
  expect(errors).toEqual([]);
  expect(obsoleteRequests).toEqual([]);
});

test("native motion, narration, audio ownership, aborted navigation and missing assets are explicit", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => {
      throw new Error("Browser speech is not an OpenAI recording.");
    };
  });
  await page.goto("/?scene=douro-vineyard&version=miniature&view=yard");
  await waitForViewer(page, { timeout: 180_000 });
  await page.locator("#miniatureListen").click();
  await expect
    .poll(async () => (await inspection(page)).narration)
    .toBe("playing");
  expect(
    await page.evaluate(
      async () =>
        (
          await import("/src/client/viewer/panorama-viewer.js")
        ).getActiveViewer().narration.snapshot.file,
    ),
  ).toMatch(/\/public\/narration\/.*\.mp3$/);
  await page.locator('[data-view="harvest"]').click();
  expect((await inspection(page)).narration).toBe("idle");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const before = await inspection(page);
  await page.waitForTimeout(750);
  const moving = await inspection(page);
  expect(moving.elapsed).toBeGreaterThan(before.elapsed);
  expect(moving.deformationSamples.length).toBeGreaterThan(0);
  expect(moving.deformationSamples).not.toEqual(before.deformationSamples);
  await page.locator("#miniatureMotion").click();
  const paused = await inspection(page);
  await page.waitForTimeout(400);
  expect((await inspection(page)).elapsed).toBe(paused.elapsed);
  expect((await inspection(page)).deformationSamples).toEqual(
    paused.deformationSamples,
  );
  await page.getByRole("button", { name: /^Soundscape,/ }).click();
  await page.locator("#ambientSound").click();
  await expect
    .poll(async () => (await inspection(page)).audio.state)
    .toBe("playing");
  await page.locator("#muteSoundscape").click();
  await expect
    .poll(async () => (await inspection(page)).audio.contextState)
    .toBe("closed");
  await page.locator("#closeSoundscape").click();
  await page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    window.previousDouro = getActiveViewer();
  });
  await page.getByRole("link", { name: "Landscape", exact: true }).click();
  await waitForViewer(page);
  const delayed = "**/public/outdoors/detail-assets/douro/soil-diff.jpg";
  await page.route(delayed, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.continue();
  });
  await page.getByRole("link", { name: "Miniature", exact: true }).click();
  await page.getByRole("link", { name: "Landscape", exact: true }).click();
  await waitForViewer(page);
  await expect(
    page.getByRole("link", { name: "Landscape", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  expect(
    await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      return getActiveViewer().renderer.isWebGLRenderer;
    }),
  ).toBe(true);
  await page.unroute(delayed);
  await page.route(delayed, (route) =>
    route.fulfill({ status: 404, body: "Missing test asset" }),
  );
  await page.getByRole("link", { name: "Miniature", exact: true }).click();
  await expect(page.locator(".initial-loading")).toContainText(
    "The miniature could not be prepared",
  );
  await expect(
    page.getByRole("link", { name: "Return to the world" }),
  ).toBeVisible();
});

test("returning to Landscape cancels a cold Miniature import before mounting", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/src/client/viewer/miniature-viewer.js",
    async (route) => {
      await gate;
      await route.continue();
    },
  );
  await page.goto("/?scene=douro-vineyard&inspect=1");
  await waitForViewer(page, { timeout: 180_000 });
  await page.evaluate(() => {
    window.atlasMiniatureMounts = 0;
    const observer = new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes)
          if (
            node instanceof Element &&
            (node.matches("#miniatureCanvas") ||
              node.querySelector("#miniatureCanvas"))
          )
            window.atlasMiniatureMounts++;
    });
    observer.observe(document.querySelector("#app"), {
      childList: true,
      subtree: true,
    });
    window.atlasMountObserver = observer;
  });
  const pending = page.waitForRequest(
    "**/src/client/viewer/miniature-viewer.js",
  );
  await page.getByRole("link", { name: "Miniature", exact: true }).click();
  await pending;
  await page.goBack();
  release();
  await page.evaluate(() => import("/src/client/viewer/miniature-viewer.js"));
  await waitForViewer(page, { timeout: 180_000 });
  expect(
    await page.evaluate(() => {
      window.atlasMountObserver.disconnect();
      return window.atlasMiniatureMounts;
    }),
  ).toBe(0);
  await expect(page.locator("#miniatureCanvas")).toHaveCount(0);
  await expect(page.locator("#canvasMount canvas")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Landscape", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  expect(
    await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const viewer = getActiveViewer();
      return (
        viewer.renderer.isWebGLRenderer &&
        !viewer.renderer.getContext().isContextLost()
      );
    }),
  ).toBe(true);
  expect(errors).toEqual([]);
});
