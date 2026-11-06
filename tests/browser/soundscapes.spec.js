import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function inspect(page) {
  return page.evaluate(async () => {
    const { getAtlasAudio } = await import("/src/client/main.js");
    return getAtlasAudio().inspection;
  });
}

async function panel(page, scene = "") {
  await page.goto(scene ? `/?scene=${scene}&inspect=1` : "/");
  await page.locator("#soundscapeButton").click();
  await expect(page.locator("#soundscapeDialog")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    if (
      route.request().method() === "GET" &&
      new URL(route.request().url()).pathname === "/api/generated-scenes"
    )
      await route.continue();
    else {
      await route.abort("blockedbyclient");
      throw new Error(`Unexpected API request: ${route.request().url()}`);
    }
  });
  await page.addInitScript(() => {
    window.audioMeters = [];
    window.audioContexts = [];
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(...args) {
        super(...args);
        window.audioContexts.push(this);
      }
      createDynamicsCompressor() {
        const compressor = super.createDynamicsCompressor();
        const meter = this.createAnalyser();
        compressor.connect(meter);
        window.audioMeters.push(meter);
        return compressor;
      }
    };
  });
});

test("looping stays bounded and spatial audio follows the camera without a frame-time regression", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await panel(page, "riad");
  await page.getByRole("button", { name: "Close soundscape" }).click();
  async function sampleFrames() {
    return page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const samples = [];
      let previous = await new Promise(requestAnimationFrame);
      for (let i = 0; i < 120; i++) {
        const now = await new Promise(requestAnimationFrame);
        samples.push(now - previous);
        previous = now;
      }
      const viewer = getActiveViewer();
      return {
        median: samples.sort((a, b) => a - b)[60],
        elapsed: viewer.elapsed,
        geometries: viewer.renderer.info.memory.geometries,
        textures: viewer.renderer.info.memory.textures,
      };
    });
  }
  const baseline = await sampleFrames();
  await page.locator("#soundscapeButton").click();
  await page.locator("#ambientSound").click();
  await expect(page.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#musicSound").click();
  await expect(page.locator("#musicSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Close soundscape" }).click();
  const listening = await sampleFrames();
  expect(listening.elapsed).toBe(baseline.elapsed);
  expect(listening.geometries).toBe(baseline.geometries);
  expect(listening.textures).toBe(baseline.textures);
  expect(listening.median).toBeLessThanOrEqual(baseline.median * 1.5 + 8);
  await page
    .getByRole("button", { name: "Through the doorway", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => window.audioContexts[0].listener.positionZ.value),
    )
    .toBeCloseTo(-3.4, 1);
  await page.getByRole("button", { name: "Upstairs", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.audioContexts[0].listener.positionY.value),
    )
    .toBeCloseTo(6.48, 1);
  // The longest environmental loop is twenty-eight seconds; cross a seam.
  await page.waitForTimeout(29_000);
  const running = await inspect(page);
  expect(running.ambience.sources).toBeGreaterThan(0);
  expect(running.ambience.sources).toBeLessThanOrEqual(6);
  expect(running.ambience.nodes).toBeLessThanOrEqual(24);
  await page.locator("#soundscapeButton").click();
  await page.locator("#muteSoundscape").click();
  expect((await inspect(page)).ambience.bufferBytes).toBe(0);
  await testInfo.attach("audio-performance", {
    body: JSON.stringify({ baseline, listening, running }, null, 2),
    contentType: "application/json",
  });
});

for (const scene of ["riad", "finnish-lakeside-sauna", "samoan-fale"])
  test(`${scene}: default-on channels wait for explicit playback, then mix independently and release`, async ({
    page,
  }) => {
    const audioRequests = [];
    page.on("request", (request) => {
      if (/\.(mp3|ogg|wav)$/.test(request.url()))
        audioRequests.push(request.url());
    });
    await panel(page, scene);
    expect(audioRequests).toEqual([]);
    expect(await page.evaluate(() => window.audioContexts.length)).toBe(0);
    expect(
      await page.evaluate(
        async () =>
          (await import("/src/client/main.js")).getAtlasAudio().snapshot,
      ),
    ).toMatchObject({
      ambienceEnabled: true,
      musicEnabled: true,
      narrationEnabled: false,
    });
    await page
      .getByRole("button", { name: "Resume ambience", exact: true })
      .click();
    await expect(page.locator("#ambientSound")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page
      .getByRole("button", { name: "Resume music", exact: true })
      .click();
    await expect(page.locator("#musicSound")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.audioMeters
            .map((meter) => {
              const values = new Float32Array(meter.fftSize);
              meter.getFloatTimeDomainData(values);
              return Math.sqrt(
                values.reduce((sum, value) => sum + value * value, 0) /
                  values.length,
              );
            })
            .every((rms) => rms > 0.0001),
        ),
      )
      .toBe(true);
    const playing = await inspect(page);
    expect(playing.ambience.contextState).toBe("running");
    expect(playing.music.contextState).toBe("running");
    expect(playing.ambience.bufferBytes).toBeGreaterThan(1000);
    expect(
      playing.ambience.bufferBytes + playing.music.bufferBytes,
    ).toBeLessThan(130 * 1024 * 1024);
    await page.locator("#musicVolume").fill("10");
    await expect(page.locator("output[for=musicVolume]")).toHaveText("10%");
    await page.getByText("About the sound & credits", { exact: true }).click();
    await expect(page.locator("#audioCredits a")).not.toHaveCount(0);
    await expect(page.locator("#audioCredits")).toContainText("CC");
    await page
      .getByRole("button", { name: "Mute ambience", exact: true })
      .click();
    expect((await inspect(page)).ambience.nodes).toBe(0);
    expect((await inspect(page)).music.state).toBe("playing");
    await page.getByRole("button", { name: "Mute all", exact: true }).click();
    const stopped = await inspect(page);
    expect(stopped.ambience.bufferBytes).toBe(0);
    expect(stopped.music.sources).toBe(0);
    expect(stopped.ownsPlayback).toBe(false);
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.audioContexts.every((c) => c.state === "closed"),
        ),
      )
      .toBe(true);
  });

test("the shared theme survives internal navigation and reload preserves choices", async ({
  page,
}) => {
  await panel(page);
  await expect(page.locator("#ambientSound")).toHaveText("Disable ambience");
  await page.locator("#ambientSound").click();
  await page.locator("#musicMode").selectOption("theme");
  await page.getByRole("button", { name: "Resume music", exact: true }).click();
  await expect(page.locator("#musicSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.evaluate(() => {
    window.sameAudioDocument = true;
  });
  await page.getByRole("button", { name: "Close soundscape" }).click();
  await page.getByRole("button", { name: "Places", exact: true }).click();
  await page
    .locator("#placesPanel button")
    .filter({ hasText: "Marrakech" })
    .click();
  await page.locator("#placePreview .preview-main").click();
  await expect(page.locator("#soundscapeButton")).toBeVisible();
  expect(await page.evaluate(() => window.sameAudioDocument)).toBe(true);
  expect((await inspect(page)).music.state).toBe("playing");
  expect(await page.evaluate(() => window.audioContexts.length)).toBe(1);
  await page.getByRole("button", { name: "Back to world" }).click();
  await expect(page.locator("#placesButton")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#riadLoading")).toBeHidden();
  expect((await inspect(page)).music.state).toBe("playing");
  await page.reload();
  await page.locator("#soundscapeButton").click();
  const saved = await page.evaluate(async () => {
    const { getAtlasAudio } = await import("/src/client/main.js");
    return getAtlasAudio().snapshot;
  });
  expect(saved.musicEnabled).toBe(true);
  expect(saved.mode).toBe("theme");
  await expect(page.locator("#musicMode")).toHaveValue("theme");
});

test("page hiding cancels sound and never resumes without another gesture", async ({
  page,
}) => {
  await panel(page, "riad");
  await page.locator("#ambientSound").click();
  await expect(page.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#musicSound").click();
  await expect(page.locator("#musicSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect((await inspect(page)).ambience.contextState).toBe("closed");
  expect((await inspect(page)).music.contextState).toBe("closed");
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#ambientSound")).toHaveText("Resume ambience");
  await expect(page.locator("#musicSound")).toHaveText("Resume music");
  await page.locator("#ambientSound").click();
  await expect(page.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect((await inspect(page)).music.state).toBe("paused");
});

test("failed assets report an error and can be retried without leaked contexts", async ({
  page,
}) => {
  await page.route("**/public/audio/**/*.mp3", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await panel(page, "riad");
  await page.locator("#ambientSound").click();
  await expect(page.locator("#ambienceStatus")).toContainText("could not load");
  expect((await inspect(page)).ambience.nodes).toBe(0);
  await page.unroute("**/public/audio/**/*.mp3");
  await page.locator("#ambientSound").click();
  await expect(page.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#muteSoundscape").click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.audioContexts.every((c) => c.state === "closed"),
      ),
    )
    .toBe(true);
});

test("mute during loading cannot bring back late audio", async ({ page }) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/public/audio/**/*.mp3", async (route) => {
    await gate;
    await route.continue();
  });
  await panel(page, "riad");
  await page.locator("#ambientSound").click();
  await expect(page.locator("#ambientSound")).toHaveText("Cancel loading");
  await page.locator("#muteSoundscape").click();
  release();
  await page.waitForTimeout(700);
  expect((await inspect(page)).ambience.state).toBe("idle");
  expect((await inspect(page)).ambience.sources).toBe(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.audioContexts.every((c) => c.state === "closed"),
      ),
    )
    .toBe(true);
});

test("compact keyboard controls close only the dialog, not the interior", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await panel(page, "riad");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const bounds = await page.locator("#soundscapeDialog").boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  await page.keyboard.press("Escape");
  await expect(page.locator("#soundscapeDialog")).not.toBeVisible();
  await expect(page.locator("#sceneTitle")).toHaveText(
    "Marrakech Riad Courtyard",
  );
  await expect(page.locator("#soundscapeButton")).toBeFocused();
});

test("narration ducks both channels and restores them on pause", async ({
  page,
}) => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../../public/audio/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  const fixture = manifest.assets.find((asset) => asset.id === "room-murmur");
  await page.route("**/api/narration/**", (route) =>
    route.fulfill({
      path: new URL(`../..${fixture.file}`, import.meta.url).pathname,
      contentType: "audio/mpeg",
    }),
  );
  await panel(page, "riad");
  await page.locator("#ambientSound").click();
  await expect(page.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#musicSound").click();
  await expect(page.locator("#musicSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Close soundscape" }).click();
  await page.getByRole("button", { name: "Show details" }).click();
  await page.locator("#listenButton").click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { getAtlasAudio } = await import("/src/client/main.js");
        const { ambience, music } = getAtlasAudio().snapshot;
        return ambience.ducked && music.ducked;
      }),
    )
    .toBe(true);
  await page.locator("#listenButton").click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { getAtlasAudio } = await import("/src/client/main.js");
        return getAtlasAudio().snapshot.music.ducked;
      }),
    )
    .toBe(false);
  await page.locator("#listenButton").click();
  await expect(page.locator("#listenButton")).toHaveText("Pause");
  await page.locator("#soundscapeButton").click();
  await page.locator("#muteSoundscape").click();
  await page.locator("#closeSoundscape").click();
  await expect(page.locator("#listenButton")).toHaveText("Listen");
});
