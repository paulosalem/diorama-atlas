import { expect, test } from "@playwright/test";
import { waitForViewer } from "../../scripts/helpers/browser-viewer.mjs";
import { gerViews } from "../../src/client/catalog/ger-catalog.js";

test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });

test("ger: actual doorway clearance, firebox depth, every view and silent lifecycle", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?scene=mongolian-ger");
  await waitForViewer(page);
  const result = await page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    const { probeGeometry, inspectGeometry } =
      await import("/src/client/rendering/scene-inspection.js");
    const v = getActiveViewer();
    const rays = [];
    for (const x of [-0.5, 0, 0.5])
      for (const y of [0.2, 0.9, 1.6])
        rays.push(probeGeometry(v.runtime.group, [x, y, 2.7], [0, 0, 1], 3));
    return {
      rays,
      cavity: probeGeometry(v.runtime.group, [0, 0.6, 0.85], [0, 0, -1], 1),
      lintel: probeGeometry(v.runtime.group, [0, 1.66, 2.7], [0, 0, 1], 1),
      flue: probeGeometry(v.runtime.group, [0, 3.5, 0.17], [0, -1, 0], 4),
      finite: inspectGeometry(v.runtime.group).finiteGeometry,
      elapsed: v.elapsed,
      audio: v.runtime.soundscape.inspection,
    };
  });
  expect(result.finite).toBe(true);
  expect(result.rays.every((value) => value === null)).toBe(true);
  expect(result.cavity).toBeGreaterThan(0.65);
  expect(result.lintel).toBeGreaterThan(0);
  expect(result.lintel).toBeLessThan(0.4);
  expect(result.flue).toBeGreaterThan(3);
  expect(result.elapsed).toBe(0);
  expect(result.audio.contextState).toBe("closed");
  for (const view of Object.keys(gerViews))
    await page.evaluate(async (key) => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      getActiveViewer().selectView(key);
    }, view);
  const cloth = () =>
    page.evaluate(async () => {
      const THREE = await import("three");
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const values = [];
      getActiveViewer().runtime.group.traverse((mesh) => {
        const positions = mesh.geometry?.attributes.position;
        if (positions?.usage === THREE.DynamicDrawUsage)
          values.push(...positions.array);
      });
      return values;
    });
  const still = await cloth();
  expect(still.length).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(cloth).not.toEqual(still);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const paused = await cloth();
  await page.waitForTimeout(200);
  expect(await cloth()).toEqual(paused);
  await page
    .getByRole("button", { name: "Back to world", exact: true })
    .click();
  await expect(page.locator("#viewer")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("ger: miniature closes for architectural views and preserves exact opening endpoints", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?scene=mongolian-ger&version=miniature");
  await waitForViewer(page);
  const inspect = () =>
    page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      return getActiveViewer().inspection;
    });
  await page.locator("#miniatureShell").click();
  expect((await inspect()).shell.progress).toBe(1);
  await page.screenshot({ path: info.outputPath("whole-open.png") });
  const underside = await page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    const v = getActiveViewer();
    return [0, 4].map((x) => v.probe([x, -0.9, 0], [0, 1, 0], 1));
  });
  for (const distance of underside) expect(distance).toBeCloseTo(0.25, 4);
  for (const [name, position, target] of [
    ["reverse-open", [-14, 8, -15], [2, 1.5, 0]],
    ["underside", [9, -1.2, 9], [0, -0.4, 0]],
  ]) {
    await page.evaluate(
      async ({ position, target }) => {
        const { getActiveViewer } =
          await import("/src/client/viewer/panorama-viewer.js");
        const v = getActiveViewer();
        const whole = v.runtime.views.whole;
        v.runtime.views.whole = {
          ...whole,
          position,
          target,
          overview: false,
          adaptiveBounds: false,
          orbit: false,
        };
        v.selectView("whole");
        v.runtime.views.whole = whole;
      },
      { position, target },
    );
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  for (const key of [
    "room",
    "framework",
    "hearth",
    "passage",
    "hospitality",
    "camp",
  ]) {
    await page.evaluate(async (key) => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      getActiveViewer().selectView(key);
    }, key);
    const expected = ["framework", "passage", "camp"].includes(key) ? 0 : 1;
    expect((await inspect()).shell.progress).toBe(expected);
    if (expected === 0) await expect(page).not.toHaveURL(/open=1/);
  }
  await page.locator("#wholeMiniature").click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator("#miniatureShell").click();
  await expect.poll(async () => (await inspect()).shell.moving).toBe(true);
  await page.locator("#miniatureShell").click();
  await expect.poll(async () => (await inspect()).shell.progress).toBe(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const pausedTime = (await inspect()).elapsed;
  expect(pausedTime).toBeGreaterThan(0);
  await page.locator('[data-view="camp"]').click();
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.screenshot({
      path: info.outputPath(`compact-${viewport.width}.png`),
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect((await inspect()).finiteGeometry).toBe(true);
  expect((await inspect()).elapsed).toBe(pausedTime);
  expect((await inspect()).audio.contextState).toBe("closed");
  expect(errors).toEqual([]);
});
