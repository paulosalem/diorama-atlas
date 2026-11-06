import { expect, test } from "@playwright/test";
import { waitForViewer } from "../../scripts/helpers/browser-viewer.mjs";
import { saunaViews } from "../../src/client/catalog/sauna-catalog.js";

test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });

test("sauna: real openings, supported steps, finite models and complete silent lifecycle", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?scene=finnish-lakeside-sauna");
  await waitForViewer(page);
  const result = await page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    const { probeGeometry, inspectGeometry } =
      await import("/src/client/rendering/scene-inspection.js");
    const v = getActiveViewer(),
      group = v.runtime.group;
    const doors = [];
    for (const offset of [-0.34, 0, 0.34])
      for (const y of [0.43, 1.3, 2.2]) {
        doors.push(probeGeometry(group, [0.5, y, 0.5 + offset], [1, 0, 0], 1));
        doors.push(
          probeGeometry(group, [1.9 + offset, y, 0.9], [0, 0, 1], 1.1),
        );
      }
    const steps = [];
    for (let i = 0; i < 3; i++)
      for (const x of [-0.68, -0.38, -0.08])
        steps.push(
          probeGeometry(
            group,
            [x, 0.95, -0.04 - (i + 0.5) * 0.267],
            [0, -1, 0],
            0.7,
          ),
        );
    const grove = group.getObjectByName("Instanced botanical models");
    const resources = new Set();
    grove.traverse((object) => {
      if (!object.isMesh) return;
      resources.add(object);
      resources.add(object.geometry);
      resources.add(object.material);
      for (const value of Object.values(object.material))
        if (value?.isTexture) resources.add(value);
    });
    window.saunaReleased = { expected: resources.size, disposed: 0 };
    for (const resource of resources)
      resource.addEventListener(
        "dispose",
        () => window.saunaReleased.disposed++,
      );
    return {
      doors,
      steps,
      models: grove.children.length,
      instances: grove.children.reduce((sum, mesh) => sum + mesh.count, 0),
      finite: inspectGeometry(group).finiteGeometry,
      elapsed: v.elapsed,
      audio: v.runtime.soundscape.inspection,
      lintel: probeGeometry(group, [0.5, 2.3, 0.5], [1, 0, 0], 1),
    };
  });
  expect(result.doors.every((hit) => hit === null)).toBe(true);
  expect(result.finite).toBe(true);
  expect(result.models).toBeGreaterThan(6);
  expect(result.instances).toBe(172);
  expect(result.elapsed).toBe(0);
  expect(result.audio.contextState).toBe("closed");
  expect(result.lintel).toBeGreaterThan(0.1);
  expect(result.lintel).toBeLessThan(0.4);
  result.steps.forEach((distance, i) =>
    expect(distance).toBeCloseTo(
      0.95 - 0.35 - (Math.floor(i / 3) + 1) * 0.163,
      3,
    ),
  );
  for (const view of Object.keys(saunaViews)) {
    await page.evaluate(async (key) => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      getActiveViewer().selectView(key);
    }, view);
  }
  for (const [name, position, target, fov] of [
    ["firebox-close", [-1.72, 0.92, 0.95], [-2.05, 0.81, 0.1], 43],
    ["bench-contact", [-1.3, 1.62, -0.38], [-1.7, 1.46, -1.65], 48],
    ["reverse-building", [-6, 2.5, -6], [0, 1.5, -0.5], 62],
  ]) {
    await page.evaluate(
      async ({ position, target, fov }) => {
        const { getActiveViewer } =
          await import("/src/client/viewer/panorama-viewer.js");
        const v = getActiveViewer(),
          original = v.runtime.views.room;
        v.runtime.views.room = { ...original, position, target, fov };
        v.selectView("room");
        v.runtime.views.room = original;
      },
      { position, target, fov },
    );
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { getActiveViewer } =
          await import("/src/client/viewer/panorama-viewer.js");
        return getActiveViewer().elapsed;
      }),
    )
    .toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const time = await page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    return getActiveViewer().elapsed;
  });
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      return getActiveViewer().elapsed;
    }),
  ).toBe(time);
  await page
    .getByRole("button", { name: "Back to world", exact: true })
    .click();
  await expect(page.locator("#viewer")).toHaveCount(0);
  const released = await page.evaluate(() => window.saunaReleased);
  expect(released.disposed).toBe(released.expected);
  expect(errors).toEqual([]);
});

test("sauna: peer miniature, closed architectural views, underside and compact controls", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?scene=finnish-lakeside-sauna&version=miniature");
  await waitForViewer(page);
  const inspect = () =>
    page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      return getActiveViewer().inspection;
    });
  const camera = () =>
    page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const v = getActiveViewer();
      return [...v.camera.position.toArray(), v.camera.fov];
    });
  const originalCamera = await camera();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  expect(await camera()).not.toEqual(originalCamera);
  const zoomedCamera = await camera();
  const canvas = page.locator("#miniatureCanvas");
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  expect(await camera()).not.toEqual(zoomedCamera);
  await page.locator('[data-view="whole"]').click();
  await page.locator("#miniatureShell").click();
  expect((await inspect()).shell.progress).toBe(1);
  await page.screenshot({ path: info.outputPath("whole-open.png") });
  for (const view of Object.keys(saunaViews)) {
    await page.locator(`[data-view="${view}"]`).click();
    expect((await inspect()).shell.progress).toBe(
      ["passage", "shore"].includes(view) ? 0 : 1,
    );
  }
  const underneath = await page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    const v = getActiveViewer();
    return [-6, 0, 6].map((x) => v.probe([x, -2, 0], [0, 1, 0], 1));
  });
  underneath.forEach((distance) => expect(distance).toBeCloseTo(0.35, 3));
  await page.locator('[data-view="whole"]').click();
  await page.locator("#miniatureShell").click();
  expect((await inspect()).shell.progress).toBe(1);
  for (const [name, position, target] of [
    ["reverse-open", [-16, 11, -18], [0, 1, 1]],
    ["underside", [15, -5, 18], [0, -1, 2]],
  ]) {
    await page.evaluate(
      async ({ position, target }) => {
        const { getActiveViewer } =
          await import("/src/client/viewer/panorama-viewer.js");
        const v = getActiveViewer(),
          whole = v.runtime.views.whole;
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
  await page.locator('[data-view="shore"]').click();
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
  expect((await inspect()).audio.contextState).toBe("closed");
  await page.getByRole("link", { name: "Interior", exact: true }).click();
  await waitForViewer(page);
  await expect(
    page.getByRole("link", { name: "Interior", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  await page.getByRole("link", { name: "Miniature", exact: true }).click();
  await waitForViewer(page);
  await expect(page.locator("#miniatureShell")).toBeVisible();
  expect(errors).toEqual([]);
});
