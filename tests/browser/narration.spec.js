import { expect, test } from "@playwright/test";
import { curatedScenes } from "../../src/client/catalog/scene-catalog.js";

test.describe.configure({ timeout: 180_000 });
test.use({ locale: "en-US", reducedMotion: "reduce" });

async function state(page) {
  return page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    return getActiveViewer().narration.snapshot;
  });
}

async function open(page, scene = "riad", view) {
  await page.goto(`/?scene=${scene}&inspect=1${view ? `&view=${view}` : ""}`);
  await expect(page.locator(".scene-narration")).toHaveAttribute(
    "data-state",
    /ready|playing|blocked/,
    { timeout: 120_000 },
  );
}

async function expectUnclippedControl(page, selector, panel) {
  const control = page.locator(selector);
  await expect(control).toBeVisible();
  expect(
    await control.evaluate((element, panel) => {
      const rect = element.getBoundingClientRect();
      const inside = [
        element.closest(panel),
        document.querySelector("#canvasMount"),
      ].every((container) => {
        const bounds = container.getBoundingClientRect();
        return (
          rect.left >= bounds.left &&
          rect.right <= bounds.right &&
          rect.top >= bounds.top &&
          rect.bottom <= bounds.bottom
        );
      });
      return (
        inside &&
        element.contains(
          document.elementFromPoint(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2,
          ),
        )
      );
    }, panel),
  ).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    if (
      route.request().method() === "GET" &&
      new URL(route.request().url()).pathname === "/api/generated-scenes"
    )
      await route.continue();
    else
      throw new Error(`Unexpected paid API request: ${route.request().url()}`);
  });

  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => {
      throw new Error(
        "Bundled narration must use OpenAI recordings, not browser speech.",
      );
    };
    const NativeAudio = window.Audio;
    window.narrationElements = [];
    window.Audio = class extends NativeAudio {
      constructor(...args) {
        super(...args);
        window.narrationElements.push(this);
      }
    };
  });
});

for (const scene of [
  "riad",
  "textile",
  "balinese-subak-terraces",
  "douro-vineyard",
  "finnish-lakeside-sauna",
  "samoan-fale",
]) {
  test(`${scene}: miniature recordings are bilingual, opt-in and released on mute and navigation`, async ({
    page,
  }, info) => {
    const requested = [];
    page.on("request", (request) => {
      if (/\/public\/narration\/.*\.mp3$/.test(request.url()))
        requested.push(request.url());
    });
    await page.goto(`/?scene=${scene}&version=miniature`);
    await expect(page.locator("#viewer")).toHaveAttribute(
      "aria-busy",
      "false",
      { timeout: 120_000 },
    );
    expect(requested).toEqual([]);
    for (const locale of ["en-US", "pt-BR"]) {
      await page.locator("#atlasLanguage").selectOption(locale);
      expect((await state(page)).state).toBe("idle");
      await page.locator("#miniatureListen").click();
      await expect.poll(async () => (await state(page)).state).toBe("playing");
      const playing = await state(page);
      expect(playing.locale).toBe(locale);
      expect(playing.file).toMatch(/\/public\/narration\/.*\.mp3$/);
      await page.waitForFunction(
        (file) =>
          window.narrationElements.some(
            (element) =>
              element.getAttribute("src") === file &&
              !element.paused &&
              element.currentTime > 0.1,
          ),
        playing.file,
      );
      await page.locator("#miniatureListen").click();
      expect((await state(page)).state).toBe("idle");
    }
    await page.locator("#atlasLanguage").selectOption("en-US");
    await page.locator("#miniatureListen").click();
    await expect.poll(async () => (await state(page)).state).toBe("playing");
    await page.screenshot({ path: info.outputPath("openai-narration.png") });
    await page.getByRole("button", { name: /^Soundscape,/ }).click();
    await page.locator("#muteSoundscape").click();
    await expect.poll(async () => (await state(page)).state).toBe("idle");
    await page.locator("#closeSoundscape").click();
    await page.locator("#miniatureListen").click();
    await expect.poll(async () => (await state(page)).state).toBe("playing");
    await page.locator("#riadExpand").click();
    expect(
      await page.evaluate(() =>
        window.narrationElements.every(
          (element) => element.paused && !element.getAttribute("src"),
        ),
      ),
    ).toBe(true);
  });
}

test("missing miniature audio is explicit and retryable without browser speech", async ({
  page,
}) => {
  await page.route("**/public/narration/*.mp3", (route) =>
    route.fulfill({ status: 404, body: "Missing" }),
  );
  await page.goto("/?scene=riad&version=miniature");
  await expect(page.locator("#viewer")).toHaveAttribute("aria-busy", "false", {
    timeout: 120_000,
  });
  await page.locator("#miniatureListen").click();
  await expect.poll(async () => (await state(page)).state).toBe("unavailable");
  await expect(page.locator("#miniatureNotice")).toContainText(
    "recording could not play",
  );
  await page.unroute("**/public/narration/*.mp3");
  await page.locator("#miniatureListen").click();
  await expect.poll(async () => (await state(page)).state).toBe("playing");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(async () => (await state(page)).state).toBe("idle");
});

for (const [scene, initialView, target] of [
  ["textile", "loom", "yarn"],
  ["newar-potters-square", "arrival", "pottery"],
  ["douro-vineyard", "arrival", "vines"],
]) {
  test(`${scene}: ordinary look and zoom select a localized focused narration`, async ({
    page,
  }) => {
    await open(page, scene, initialView);
    await page.locator("#atlasLanguage").selectOption("pt-BR");
    await page.locator("#narrationPlay").click();
    await expect.poll(async () => (await state(page)).state).toBe("playing");
    const movement = await page.evaluate(async (key) => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const { Vector3 } = await import("three");
      const v = getActiveViewer();
      const direction = v.camera.getWorldDirection(new Vector3());
      const toward = new Vector3(...v.runtime.views[key].target)
        .sub(v.camera.position)
        .normalize();
      const yaw =
        Math.atan2(toward.x, -toward.z) - Math.atan2(direction.x, -direction.z);
      return {
        x: -Math.atan2(Math.sin(yaw), Math.cos(yaw)) / 0.0033,
        y: (Math.asin(toward.y) - Math.asin(direction.y)) / 0.0033,
        position: v.camera.position.toArray(),
      };
    }, target);
    const canvas = await page.locator("#canvasMount canvas").boundingBox();
    const x = canvas.x + canvas.width / 2;
    const y = canvas.y + canvas.height / 3;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + movement.x, y + movement.y, { steps: 8 });
    await page.mouse.up();
    await page.mouse.wheel(0, -1800);
    await expect
      .poll(async () => (await state(page)).asset)
      .toBe(`${scene}-${target}-pt-BR`);
    await expect(page.locator(`[data-view="${initialView}"]`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      await page.evaluate(async () =>
        (await import("/src/client/viewer/panorama-viewer.js"))
          .getActiveViewer()
          .camera.position.toArray(),
      ),
    ).toEqual(movement.position);
  });
}

for (const [scene, detailView] of [
  ["textile", "dyes"],
  ["douro-vineyard", "quinta"],
  ["finnish-lakeside-sauna", "heater"],
  ["samoan-fale", "weaving"],
])
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    test(`${scene}: narration and detail captions stay usable at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await open(page, scene);
      await page.locator("#atlasLanguage").selectOption("pt-BR");
      await expectUnclippedControl(page, "#narrationPlay", ".scene-narration");
      await expectUnclippedControl(
        page,
        ".narration-minimize",
        ".scene-narration",
      );
      await page.locator("#narrationPlay").click();
      await expect.poll(async () => (await state(page)).state).toBe("playing");
      await page.locator("#riadDetails").click();
      await expect(page.locator(".scene-narration")).toBeHidden();
      await expect(page.locator(".riad-detail-caption")).toBeVisible();
      await expect.poll(async () => (await state(page)).state).toBe("paused");
      await expectUnclippedControl(
        page,
        "#listenButton",
        ".riad-detail-caption",
      );
      await page.locator(`[data-view="${detailView}"]`).click();
      expect((await state(page)).state).toBe("ready");
      expect(
        await page.evaluate(() =>
          window.narrationElements.every((a) => a.paused),
        ),
      ).toBe(true);
      await page.locator("#riadDetails").click();
      await expect(page.locator(".scene-narration")).toBeVisible();
      await expectUnclippedControl(page, "#narrationPlay", ".scene-narration");
      await page.locator("#narrationPlay").click();
      await expect.poll(async () => (await state(page)).state).toBe("playing");
      await page.locator(".narration-minimize").click();
      await expect(page.locator(".narration-text")).toBeHidden();
      await expect(page.locator("#narrationPlay")).toBeVisible();
      await page.locator("#narrationPlay").click();
      await expect.poll(async () => (await state(page)).state).toBe("paused");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const [panel, canvas] = await Promise.all([
        page.locator(".scene-narration").boundingBox(),
        page.locator("#canvasMount").boundingBox(),
      ]);
      expect(panel.x).toBeGreaterThanOrEqual(canvas.x);
      expect(panel.x + panel.width).toBeLessThanOrEqual(
        canvas.x + canvas.width,
      );
    });
  }

test("a failed manifest can be retried without losing the rendered scene", async ({
  page,
}) => {
  let first = true;
  await page.route("**/public/narration/manifest.json", async (route) => {
    if (first) {
      first = false;
      await route.fulfill({ status: 503, body: "Temporarily unavailable" });
    } else await route.continue();
  });
  await page.goto("/?scene=textile&inspect=1");
  await expect(page.locator(".scene-narration")).toHaveAttribute(
    "data-state",
    "error",
    { timeout: 120_000 },
  );
  await expect(page.locator("#viewer")).toHaveAttribute("aria-busy", "false");
  await page.locator("#narrationPlay").click();
  await expect(page.locator(".scene-narration")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await expect(page.locator(".narration-text")).toContainText("In Oaxaca");
});

test("an unrecorded custom scene stays usable without a broken narration panel", async ({
  page,
}) => {
  const scene = {
    ...curatedScenes.find((scene) => scene.id === "kissaten"),
    id: "unrecorded-kyoto",
    generated: true,
  };
  await page.route("**/api/generated-scenes", (route) =>
    route.fulfill({ json: { scenes: [scene] } }),
  );
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/?scene=unrecorded-kyoto&inspect=1");
  await expect(page.locator("#viewer")).toHaveAttribute("aria-busy", "false", {
    timeout: 120_000,
  });
  await expect.poll(async () => (await state(page)).state).toBe("unavailable");
  await expect(page.locator(".scene-narration")).toHaveCount(0);
  await page.locator("#atlasLanguage").selectOption("pt-BR");
  await page.locator('[data-view="coffee"]').click();
  expect((await state(page)).state).toBe("unavailable");
  await expect(page.locator('[data-view="coffee"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(errors).toEqual([]);
});
test("the floating narration is opt-in, bilingual and shares one actual player", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (request) => {
    if (/\/public\/narration\/.*\.mp3$/.test(request.url()))
      requests.push(request.url());
  });
  await open(page);
  expect(requests).toEqual([]);
  await expect(page.locator(".narration-text")).toContainText("In Marrakech");
  const [panel, view] = await Promise.all([
    page.locator(".scene-narration").boundingBox(),
    page.locator("#canvasMount").boundingBox(),
  ]);
  expect(
    (panel.width * panel.height) / (view.width * view.height),
  ).toBeLessThan(0.14);
  expect(panel.x).toBeGreaterThan(view.x + view.width / 2);
  const pose = await page.evaluate(async () => {
    const v = (
      await import("/src/client/viewer/panorama-viewer.js")
    ).getActiveViewer();
    return [v.camera.position.toArray(), v.camera.quaternion.toArray()];
  });
  await page.locator("#narrationPlay").click();
  await expect.poll(async () => (await state(page)).state).toBe("playing");
  await expect
    .poll(() => page.evaluate(() => window.narrationElements[0].currentTime))
    .toBeGreaterThan(0);
  await page.locator("#atlasLanguage").selectOption("pt-BR");
  await expect.poll(async () => (await state(page)).asset).toBe("riad-pt-BR");
  await expect.poll(async () => (await state(page)).state).toBe("playing");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.locator(".narration-text")).toContainText("Em Marrakech");
  await expect(page.locator(".narration-disclosure")).toContainText("gerada");
  await expect(page.locator("#sceneTitle")).toContainText("Pátio");
  expect(await page.evaluate(() => window.narrationElements.length)).toBe(1);
  expect(
    await page.evaluate(async () => {
      const v = (
        await import("/src/client/viewer/panorama-viewer.js")
      ).getActiveViewer();
      return [v.camera.position.toArray(), v.camera.quaternion.toArray()];
    }),
  ).toEqual(pose);
  await page.locator("#narrationPlay").click();
  await expect.poll(async () => (await state(page)).state).toBe("paused");
  await page.locator(".narration-minimize").click();
  await expect(page.locator(".narration-text")).toBeHidden();
  await expect(page.locator("#narrationPlay")).toBeVisible();
});

test("view buttons and a sustained close look select their own narration", async ({
  page,
}) => {
  await open(page);
  await page.locator("#narrationPlay").click();
  await expect.poll(async () => (await state(page)).state).toBe("playing");
  await page.locator('[data-view="fountain"]').click();
  await expect
    .poll(async () => (await state(page)).asset)
    .toBe("riad-fountain-en-US");
  await expect.poll(async () => (await state(page)).state).toBe("playing");
  await page.evaluate(async () => {
    const v = (
      await import("/src/client/viewer/panorama-viewer.js")
    ).getActiveViewer();
    v.camera.position.fromArray(v.runtime.views.cedar.position);
    v.lookAt(v.runtime.views.cedar.target);
  });

  await expect
    .poll(async () => (await state(page)).asset)
    .toBe("riad-cedar-en-US");
  await expect(page.locator(".narration-text")).toContainText("cedar screen");
  expect(
    await page.evaluate(
      () => window.narrationElements.filter((a) => !a.paused).length,
    ),
  ).toBe(1);
  await page.locator("#narrationPlay").click();
  await expect.poll(async () => (await state(page)).state).toBe("paused");
  await page.locator('[data-view="tea"]').click();
  await expect
    .poll(async () => (await state(page)).asset)
    .toBe("riad-tea-en-US");
  await expect.poll(async () => (await state(page)).state).toBe("playing");
});

test("looking and zooming with the actual camera controls triggers a focused narration", async ({
  page,
}) => {
  await open(page);
  await page.locator("#narrationPlay").click();
  await expect.poll(async () => (await state(page)).state).toBe("playing");
  const canvas = await page.locator("#canvasMount canvas").boundingBox();
  const x = canvas.x + canvas.width / 2;
  const y = canvas.y + canvas.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 19, y - 50, { steps: 5 });
  await page.mouse.up();
  await page.mouse.wheel(0, -950);
  await expect
    .poll(async () => (await state(page)).asset)
    .toBe("riad-fountain-en-US");
  await expect(page.locator('[data-view="courtyard"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".narration-text")).toContainText(
    "water offers relief",
  );
});

test("saved narration consent survives blocked autoplay without changing existing sound choices", async ({
  page,
  context,
  baseURL,
}) => {
  const preferences = {
    version: 1,
    ambienceEnabled: false,
    musicEnabled: false,
    ambienceVolume: 0.67,
    musicVolume: 0.23,
    mode: "theme",
    narrationEnabled: true,
  };
  await context.addCookies([
    {
      name: "atlas-audio-preferences",
      value: encodeURIComponent(JSON.stringify(preferences)),
      url: baseURL,
    },
  ]);
  await page.addInitScript(() => {
    const nativePlay = HTMLMediaElement.prototype.play;
    let block = true;
    document.hasFocus = () => true;
    HTMLMediaElement.prototype.play = function () {
      if (block && this.src.includes("/public/narration/")) {
        block = false;
        return Promise.reject(
          new DOMException("A gesture is required.", "NotAllowedError"),
        );
      }
      return nativePlay.call(this);
    };
  });
  await open(page);
  await expect.poll(async () => (await state(page)).state).toBe("blocked");
  await expect(page.locator(".narration-status")).toContainText("Select Play");
  const cookie = (await context.cookies()).find(
    (c) => c.name === "atlas-audio-preferences",
  );
  expect(JSON.parse(decodeURIComponent(cookie.value))).toMatchObject(
    preferences,
  );
  await page.locator("#narrationPlay").click();
  await expect.poll(async () => (await state(page)).state).toBe("playing");
});

for (const scene of ["riad", "finnish-lakeside-sauna", "samoan-fale"])
  test(`${scene}: ownership, page hiding, mute and leaving the scene stop the narrator`, async ({
    page,
    context,
  }) => {
    await open(page, scene);
    await page.locator("#narrationPlay").click();
    await expect.poll(async () => (await state(page)).state).toBe("playing");
    await page.evaluate(() => {
      const other = new BroadcastChannel("diorama-atlas-audio");
      other.postMessage({
        type: "claim",
        time: Date.now() + 1,
        id: "narration-handover",
      });
      other.close();
    });
    await expect.poll(async () => (await state(page)).state).toBe("paused");
    await page.locator("#narrationPlay").click();
    await expect.poll(async () => (await state(page)).state).toBe("playing");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(async () => (await state(page)).state).toBe("paused");
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect((await state(page)).state).toBe("paused");
    await page.locator("#narrationPlay").click();
    await expect.poll(async () => (await state(page)).state).toBe("playing");
    await page.locator("#soundscapeButton").click();
    await page.locator("#muteSoundscape").click();
    await expect.poll(async () => (await state(page)).state).toBe("paused");
    const cookie = (await context.cookies()).find(
      (c) => c.name === "atlas-audio-preferences",
    );
    expect(JSON.parse(decodeURIComponent(cookie.value)).narrationEnabled).toBe(
      false,
    );
    await page.locator("#closeSoundscape").click();
    const narrator = await page.evaluateHandle(
      async () =>
        (
          await import("/src/client/viewer/panorama-viewer.js")
        ).getActiveViewer().narration,
    );
    await page.locator("#riadExpand").click();
    await expect(page.locator("#placesButton")).toBeVisible();
    expect(await narrator.evaluate((n) => n.snapshot.state)).toBe("disposed");
    expect(
      await page.evaluate(() =>
        window.narrationElements[0].getAttribute("src"),
      ),
    ).toBeNull();
    await narrator.dispose();
  });
