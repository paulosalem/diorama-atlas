import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { waitForViewer } from "../../scripts/helpers/browser-viewer.mjs";

test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
test.describe.configure({ timeout: 180_000 });

for (const version of ["landscape", "miniature"]) {
  test(`Alfama ${version}: physical depth, bilingual views, motion, audio and disposal`, async ({
    page,
  }, info) => {
    const errors = [],
      audioRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (/\/public\/(?:audio|narration)\/.*\.mp3$/.test(request.url()))
        audioRequests.push(request.url());
    });
    await page.route("**/api/**", async (route) => {
      if (
        route.request().method() === "GET" &&
        new URL(route.request().url()).pathname === "/api/generated-scenes"
      )
        return route.continue();
      await route.abort();
      throw new Error("Alfama must never request provider generation.");
    });
    await page.goto(`/?scene=alfama-hillside&version=${version}&inspect=1`);
    await waitForViewer(page);
    await expect(page.locator("#sceneRegion")).toHaveText(
      "An imagined hillside · Lisboa",
    );
    expect(audioRequests).toEqual([]);
    const physical = await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const THREE = await import("three");
      const v = getActiveViewer();
      v.runtime.group.updateMatrixWorld(true);
      let finite = true;
      v.runtime.group.traverse((object) => {
        if (!object.isMesh) return;
        for (const attribute of Object.values(object.geometry.attributes))
          finite &&= attribute.array.every(Number.isFinite);
        if (object.isInstancedMesh)
          finite &&= object.instanceMatrix.array.every(Number.isFinite);
      });
      const routes = [];
      const { stairs, connections } = v.runtime.alfama;
      const samples = [];
      for (const flight of stairs) {
        for (let step = 0; step < flight.count; step++) {
          const t = (step + 0.5) / flight.count;
          samples.push({
            id: `${flight.id}/${step}`,
            point: [
              flight.start[0] + (flight.end[0] - flight.start[0]) * t,
              flight.bottom + (step + 1) * flight.riser,
              flight.start[2] + (flight.end[2] - flight.start[2]) * t,
            ],
          });
        }
      }
      for (const [route, points] of connections.entries()) {
        for (let i = 1; i < points.length; i++) {
          const a = new THREE.Vector3(...points[i - 1]);
          const b = new THREE.Vector3(...points[i]);
          const count = Math.ceil(a.distanceTo(b) / 0.35);
          for (let n = 0; n <= count; n++)
            samples.push({
              id: `connection-${route}/${i}/${n}`,
              point: a
                .clone()
                .lerp(b, n / count)
                .toArray(),
            });
        }
      }
      const { createGeometryProbe } =
        await import("/src/client/rendering/geometry-probe.js");
      const geometryProbe = createGeometryProbe(v.runtime.group);
      const cast = geometryProbe.probe;
      for (const { id, point } of samples) {
        const mouth = stairs.find(({ start }) =>
          start.every((value, axis) => Math.abs(value - point[axis]) < 0.00001),
        );
        if (mouth) {
          point[0] += (mouth.end[0] - mouth.start[0]) * 0.001;
          point[1] += mouth.riser;
          point[2] += (mouth.end[2] - mouth.start[2]) * 0.001;
        }
        const section = v.runtime.sections?.findLast(({ min, max }) =>
          point.every(
            (value, axis) => value >= min[axis] && value <= max[axis],
          ),
        );
        const p = point.map(
          (value, axis) =>
            value +
            (section?.offset[axis] ?? 0) +
            (section?.offset[axis] &&
            Math.abs(value - section.min[axis]) < 0.00001
              ? 0.001
              : 0),
        );
        const ground = cast([p[0], p[1] + 0.12, p[2]], [0, -1, 0], 0.3);
        const blocked = [];
        for (const height of [0.35, 1, 1.8])
          for (const direction of [
            [1, 0, 0],
            [-1, 0, 0],
            [0, 0, 1],
            [0, 0, -1],
          ]) {
            const hit = cast([p[0], p[1] + height, p[2]], direction, 0.28);
            if (hit !== null) blocked.push({ height, direction, hit });
          }
        if (
          ground === null ||
          Math.abs(ground - 0.12) > 0.045 ||
          blocked.length
        )
          routes.push({ id, point, ground, blocked });
      }
      const sharedWalls = v.runtime.alfama.sharedWalls.map(
        ({ center, normal, thickness, offset = 0.75 }) => {
          const section = v.runtime.sections?.findLast(({ min, max }) =>
            center.every(
              (value, axis) => value >= min[axis] && value <= max[axis],
            ),
          );
          const p = center.map(
            (value, axis) => value + (section?.offset[axis] ?? 0),
          );
          return {
            thickness,
            offset,
            hits: [-1, 1].map((side) =>
              cast(
                p.map((value, axis) => value + side * normal[axis] * offset),
                normal.map((value) => -side * value),
                0.8,
              ),
            ),
          };
        },
      );
      const junction = [0.5, 1.3, 2.1, 3.5, 4.7].map((height) =>
        cast([6.39, 2.4 + height, -2.5], [-1, 0, 0], 0.1),
      );
      const pavingSurface = Array.from({ length: 60 }, (_, i) =>
        cast([-2.1 + i * 0.01, 2.52, 1.8], [0, -1, 0], 0.2),
      );
      const potWallClearance = [-4.7, -2.4].map((x) =>
        [-1, 1].map((direction) =>
          cast([x, 2.7, 1.28], [0, 0, direction], 0.15),
        ),
      );
      const fittedSurfaces = [
        [3.15, 3.6, -2.95],
        [3.25, 3.6, -4.1],
        [2.4, 3.6, -5.3],
        [0.85, 1.2, 4.1],
        [0.1, 1.2, 3.0],
        [-10.75, 3.6, -1.65],
        [-10.75, 4.8, -5.1],
        ...v.runtime.alfama.fittedJoins
          .filter(({ id }) => id.includes("-backing-"))
          .map(({ height, outline }) => [
            outline.reduce((sum, p) => sum + p[0], 0) / outline.length,
            height,
            outline.reduce((sum, p) => sum + p[1], 0) / outline.length,
          ]),
      ].map((point) => {
        const section = v.runtime.sections?.findLast(({ min, max }) =>
          point.every(
            (value, axis) => value >= min[axis] && value <= max[axis],
          ),
        );
        const p = point.map(
          (value, axis) => value + (section?.offset[axis] ?? 0),
        );
        return {
          point,
          distance: cast([p[0], p[1] + 0.1, p[2]], [0, -1, 0], 0.2),
        };
      });
      const dailyContacts = v.runtime.alfama.groundContacts.map(
        ({ id, point }) => {
          const section = v.runtime.sections?.findLast(({ min, max }) =>
            point.every(
              (value, axis) => value >= min[axis] && value <= max[axis],
            ),
          );
          const p = point.map(
            (value, axis) => value + (section?.offset[axis] ?? 0),
          );
          return {
            id,
            point,
            distance: cast([p[0], p[1] + 0.1, p[2]], [0, -1, 0], 0.2),
          };
        },
      );
      geometryProbe.dispose();
      return {
        finite,
        sun: {
          color: v.runtime.sun.color.getHex(),
          intensity: v.runtime.sun.intensity,
        },
        routeSamples: samples.length,
        routeFailures: routes,
        sharedWalls,
        junction,
        pavingSurface,
        potWallClearance,
        fittedSurfaces,
        dailyContacts,
        activity: v.runtime.alfama.activity,
        probes: v.runtime.depthProbes.map((p) => ({
          id: p.id,
          minimum: p.minDistance,
          distance:
            new THREE.Raycaster(
              new THREE.Vector3(...p.origin),
              new THREE.Vector3(...p.direction),
              0.005,
              20,
            ).intersectObject(v.runtime.group, true)[0]?.distance ?? null,
        })),
        views: Object.keys(v.runtime.views),
      };
    });
    const physicalPath = info.outputPath("physical.json");
    await writeFile(physicalPath, JSON.stringify(physical, null, 2));
    await info.attach("physical-space", {
      path: physicalPath,
      contentType: "application/json",
    });
    expect(physical.finite).toBe(true);
    expect(physical.sun).toEqual({ color: 0xffc58a, intensity: 3.8 });
    expect(physical.routeSamples).toBeGreaterThan(250);
    expect(physical.routeFailures).toEqual([]);
    expect(physical.sharedWalls).toHaveLength(6);
    expect(physical.fittedSurfaces).toHaveLength(31);
    expect(physical.dailyContacts).toHaveLength(17);
    for (const { id, distance } of physical.dailyContacts) {
      expect(distance, id).not.toBeNull();
      expect(Math.abs(distance - 0.1), id).toBeLessThan(0.015);
    }
    for (const { point, distance } of physical.fittedSurfaces) {
      expect(distance, `Fitted stair boundary ${point}`).not.toBeNull();
      expect(
        Math.abs(distance - 0.1),
        `Fitted stair boundary ${point}`,
      ).toBeLessThan(0.015);
    }
    for (const hit of physical.pavingSurface) {
      expect(hit).not.toBeNull();
      expect(hit).toBeGreaterThan(0.11);
      expect(hit).toBeLessThan(0.135);
    }
    for (const clearance of physical.potWallClearance)
      for (const hit of clearance) {
        expect(hit).not.toBeNull();
        expect(hit).toBeGreaterThan(0.005);
      }
    for (const hit of physical.junction) {
      expect(hit).not.toBeNull();
      expect(hit).toBeGreaterThan(0.025);
      expect(hit).toBeLessThan(0.05);
    }
    for (const wall of physical.sharedWalls) {
      expect(wall.thickness).toBe(0.4);
      for (const hit of wall.hits) {
        expect(hit).not.toBeNull();
        expect(Math.abs(hit - (wall.offset - wall.thickness / 2))).toBeLessThan(
          0.015,
        );
      }
    }
    expect(physical.activity.map(({ kind }) => kind)).toEqual(
      expect.arrayContaining([
        "doorstep-care",
        "outdoor-meal",
        "plant-tending",
        "laundry-sorting",
        "wall-garden",
        "parked-car",
        "parked-bicycle",
        "mixed-planter",
        "shopping-trolley",
      ]),
    );
    expect(physical.probes).toHaveLength(5);
    expect(physical.probes.map(({ id }) => id)).toEqual(
      expect.arrayContaining(["alfama-watering-can", "alfama-household-crate"]),
    );
    for (const probe of physical.probes)
      expect(
        probe.distance === null || probe.distance >= probe.minimum,
        probe.id,
      ).toBe(true);
    expect(physical.views).toEqual(
      expect.arrayContaining([
        "arrival",
        "stairs",
        "passage",
        "courtyard",
        "tiles",
        "roofs",
        "upperCourt",
        "backLane",
        "street",
        "daily",
      ]),
    );
    if (version === "landscape") {
      const body = await page.evaluate(async () => {
        const { getActiveViewer } =
          await import("/src/client/viewer/panorama-viewer.js");
        const THREE = await import("three");
        const v = getActiveViewer();
        return [-0.28, 0, 0.28].flatMap((dx) =>
          [0.12, 1, 1.8].map(
            (dy) =>
              new THREE.Raycaster(
                new THREE.Vector3(7.65 + dx, 2.4 + dy, 0.9),
                new THREE.Vector3(0, 0, -1),
                0.005,
                3.2,
              ).intersectObject(v.runtime.group, true)[0]?.distance ?? null,
          ),
        );
      });
      expect(body).toEqual(Array(9).fill(null));
    }
    const elapsed = () =>
      page.evaluate(
        async () =>
          (
            await import("/src/client/viewer/panorama-viewer.js")
          ).getActiveViewer().elapsed,
      );
    const frozen = await elapsed();
    const towelShape = () =>
      page.evaluate(async () => {
        const v = (
          await import("/src/client/viewer/panorama-viewer.js")
        ).getActiveViewer();
        const towel = v.runtime.group.getObjectByName(
          "Towel resting over the chair back",
        );
        if (!towel) throw new Error("Missing animated chair towel");
        return Array.from(towel.geometry.attributes.position.array);
      });
    const stillTowel = await towelShape();
    await page.waitForTimeout(100);
    expect(await elapsed()).toBe(frozen);
    expect(await towelShape()).toEqual(stillTowel);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect.poll(elapsed).toBeGreaterThan(frozen + 0.1);
    await expect.poll(towelShape).not.toEqual(stillTowel);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const frozenTowel = await towelShape();
    await page.waitForTimeout(100);
    expect(await towelShape()).toEqual(frozenTowel);
    for (const locale of ["en-US", "pt-BR"]) {
      await page.locator("#atlasLanguage").selectOption(locale);
      const buttons = page.locator(
        version === "miniature"
          ? "#miniatureViews [data-view]"
          : ".riad-viewpoints button",
      );
      expect(await buttons.count()).toBe(version === "miniature" ? 11 : 10);
      for (const button of await buttons.all()) {
        await button.click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
        const narrated = !["street", "daily"].includes(
          await button.getAttribute("data-view"),
        );
        if (version === "miniature") {
          await expect(page.locator("#miniatureListen")).toBeVisible({
            visible: narrated,
          });
          await expect(page.locator("#miniatureVoiceNote")).toBeVisible({
            visible: narrated,
          });
        } else {
          await expect(page.locator(".scene-narration")).toBeVisible({
            visible: narrated,
          });
        }
      }
    }
    await page.locator("#atlasLanguage").selectOption("en-US");
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 760, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`${version}-${viewport.width}.png`),
      });
    }
    await page.locator("#soundscapeButton").click();
    await page.locator("#ambientSound").click();
    await expect(page.locator("#ambientSound")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const previous = await page.evaluateHandle(async () =>
      (await import("/src/client/viewer/panorama-viewer.js")).getActiveViewer(),
    );
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect
      .poll(() =>
        previous.evaluate((v) => v.runtime.soundscape.inspection.contextState),
      )
      .toBe("closed");
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.getByRole("button", { name: "Mute all", exact: true }).click();
    await page.getByRole("button", { name: "Close soundscape" }).click();
    await page
      .getByRole("link", {
        name: version === "landscape" ? "Miniature" : "Landscape",
        exact: true,
      })
      .click();
    await waitForViewer(page);
    await expect(page).not.toHaveURL(/draft=/);
    await expect(page).toHaveURL(
      new RegExp(
        `version=${version === "landscape" ? "miniature" : "landscape"}`,
      ),
    );
    expect(
      await previous.evaluate((v) => v.runtime.soundscape.inspection.nodes),
    ).toBe(0);
    expect(
      await previous.evaluate((v) => v.renderer.getContext().isContextLost()),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}
