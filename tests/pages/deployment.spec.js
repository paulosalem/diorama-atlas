import { expect, test } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { curatedScenes } from "../../src/client/catalog/scene-catalog.js";
import { outdoorScenes } from "../../src/client/catalog/outdoor-catalog.js";
import { waitForViewer } from "../../scripts/helpers/browser-viewer.mjs";

const directory = new URL("../../data/scenes/", import.meta.url);
const saved = await Promise.all(
  (await readdir(directory))
    .filter((name) => name.endsWith(".json"))
    .map(
      async (name) =>
        JSON.parse(await readFile(new URL(name, directory), "utf8")).scene,
    ),
);
const scenes = [...curatedScenes, ...saved, ...outdoorScenes];
const narration = JSON.parse(
  await readFile(
    new URL("../../public/narration/manifest.json", import.meta.url),
  ),
).assets;
const credits = JSON.parse(
  await readFile(new URL("../../public/credits.json", import.meta.url)),
).entries;

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    await route.abort();
    throw new Error(
      `A static site must not request an API: ${route.request().url()}`,
    );
  });
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.atlasTestPlayers = [];
    window.Audio = class extends NativeAudio {
      constructor(...args) {
        super(...args);
        window.atlasTestPlayers.push(this);
      }
    };
  });
});

test("the public artifact contains the collection but no private/server files", async ({
  request,
}) => {
  const catalog = await request.get("public/scenes.json");
  expect(catalog.ok()).toBe(true);
  expect((await catalog.json()).scenes).toHaveLength(7);
  for (const path of [
    ".env",
    ".git/config",
    "src/server/app.mjs",
    "data/scenes",
    "cache",
    "outputs",
    "public/atlas-models/teacup.glb",
    "node_modules/openai/package.json",
    "api/generated-scenes",
  ])
    expect((await request.get(path)).status(), path).toBeGreaterThanOrEqual(
      400,
    );
  const index = await request.get("./");
  expect(await index.text()).toContain('name="atlas-hosting" content="static"');
});

test("static hosting rejects unfinished local previews", async ({ page }) => {
  await page.goto("?scene=unfinished-outdoor&inspect=1&draft=1");
  await expect(
    page.getByText(
      "Unfinished places are only available on the local development server.",
    ),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("Home Screen metadata and icons resolve within the project path", async ({
  request,
  baseURL,
}) => {
  const response = await request.get("public/app.webmanifest");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toMatch(
    /^application\/manifest\+json/,
  );
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  for (const key of ["start_url", "scope"])
    expect(new URL(manifest[key], response.url()).href).toBe(baseURL);
  const start = new URL(manifest.start_url, response.url());
  expect((manifest.id ? new URL(manifest.id, start.origin) : start).href).toBe(
    baseURL,
  );
  for (const icon of manifest.icons) {
    const url = new URL(icon.src, response.url()).href;
    expect(url.startsWith(`${baseURL}public/app-icons/`)).toBe(true);
    const image = await request.get(url);
    expect(image.ok()).toBe(true);
    expect(image.headers()["content-type"]).toBe("image/png");
  }
  expect((await request.get("public/app-icons/atlas-180.png")).ok()).toBe(true);
  const html = await (await request.get("./")).text();
  expect(html).toContain('rel="manifest" href="./public/app.webmanifest"');
  expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
});

test("the Three.js Miniature loads directly beneath a project path", async ({
  page,
  baseURL,
}) => {
  const errors = [];
  const obsolete = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  page.on("request", (request) => {
    if (/babylon|public\/dioramas/.test(request.url()))
      obsolete.push(request.url());
  });
  await page.goto("?scene=douro-vineyard&version=miniature&view=whole");
  await waitForViewer(page, { timeout: 180_000 });
  const state = await page.evaluate(async (base) => {
    const { getActiveViewer } = await import(
      `${base}src/client/viewer/panorama-viewer.js`
    );
    const viewer = getActiveViewer();
    return {
      ...viewer.inspection,
      three: viewer.renderer.isWebGLRenderer,
      views: Object.keys(viewer.runtime.views),
    };
  }, baseURL);
  expect(state.three).toBe(true);
  expect(state.finiteGeometry).toBe(true);
  expect(state.views).toHaveLength(11);
  expect(state.audio.contextState).toBe("closed");
  await page.locator('[data-view="quinta"]').click();
  await expect(page).toHaveURL(/\/diorama-atlas\/\?.*view=quinta/);
  await page.getByRole("link", { name: "Landscape", exact: true }).click();
  await waitForViewer(page, { timeout: 180_000 });
  await expect(page).toHaveURL(/\/diorama-atlas\/\?.*version=landscape/);
  expect(errors).toEqual([]);
  expect(obsolete).toEqual([]);
});

test("the globe, preview and return navigation remain inside the project path", async ({
  page,
  baseURL,
}) => {
  await page.goto("./");
  await expect(page.locator(".world")).toBeVisible();
  await expect(page.locator("#worldLoading")).toBeHidden({ timeout: 120_000 });
  await page.locator("#fullscreenButton").click();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.fullscreenElement === document.documentElement,
      ),
    )
    .toBe(true);
  await expect(page.locator(".place-pin")).toHaveCount(19);
  await page.locator("#placesButton").click();
  await page
    .locator("#placesPanel button")
    .filter({ hasText: "Marrakech" })
    .click();
  const link = page.locator(".preview-main");
  await expect(link).toHaveAttribute(
    "href",
    "/diorama-atlas/?scene=riad&inspect=1",
  );
  await expect
    .poll(() =>
      page.locator(".preview-main img").evaluate((image) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  await link.click();
  await waitForViewer(page, { timeout: 120_000 });
  await page.locator("#riadExpand").click();
  await expect(page.locator("#worldLoading")).toBeHidden();
  await expect(page).toHaveURL(baseURL);
  await expect(page.locator("#fullscreenButton")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#fullscreenButton").click();
  expect(
    await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    ),
  ).toBe(1);
});

for (const id of ["textile", "naxi-canal-quarter"]) {
  test(`${id}: collection miniature navigation and narration use the project path`, async ({
    page,
    baseURL,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(`?scene=${id}&version=miniature`);
    await waitForViewer(page, { timeout: 180_000 });
    await expect(
      page.getByRole("link", { name: "Miniature", exact: true }),
    ).toHaveAttribute("aria-current", "true");
    await page.locator("#miniatureViews [data-view]").last().click();
    await expect(page).toHaveURL(
      /\/diorama-atlas\/\?.*version=miniature.*view=/,
    );
    const state = await page.evaluate(async (base) => {
      const { getActiveViewer } = await import(
        `${base}src/client/viewer/panorama-viewer.js`
      );
      return getActiveViewer().inspection;
    }, baseURL);
    expect(state.finiteGeometry).toBe(true);
    expect(state.audio.contextState).toBe("closed");
    if (id === "textile") expect(state.shell.open).toBe(true);
    await page
      .getByRole("link", {
        name: id === "textile" ? "Interior" : "Landscape",
        exact: true,
      })
      .click();
    await waitForViewer(page, { timeout: 180_000 });
    await expect(page.locator(".scene-narration")).toHaveAttribute(
      "data-state",
      "ready",
    );
    expect(errors).toEqual([]);
  });
}

for (const scene of scenes.filter((scene) => scene.narration !== "browser")) {
  test(`${scene.id}: all static assets, viewpoints and bilingual playback`, async ({
    page,
    baseURL,
  }) => {
    const errors = [];
    const recordings = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`);
    });
    page.on("request", (request) => {
      if (
        request.url().includes("/public/narration/") &&
        request.url().endsWith(".mp3")
      )
        recordings.push(request.url());
    });
    await page.goto(`?scene=${scene.id}&inspect=1`);
    await waitForViewer(page, { timeout: 120_000 });
    const panel = page.locator(".scene-narration");
    await expect(panel).toHaveAttribute("data-state", "ready");
    expect(recordings).toEqual([]);
    const views = page.locator("[data-view]");
    const first = await views.first().getAttribute("data-view");
    const unrecordedViews = await page.evaluate(async (base) => {
      const { getActiveViewer } = await import(
        `${base}src/client/viewer/panorama-viewer.js`
      );
      return Object.entries(getActiveViewer().runtime.views)
        .filter(([, view]) => view.narration === false)
        .map(([key]) => key);
    }, baseURL);
    for (const locale of ["en-US", "pt-BR"]) {
      await page.locator("#atlasLanguage").selectOption(locale);
      for (const view of await views.all()) {
        const key = await view.getAttribute("data-view");
        await view.click();
        if (unrecordedViews.includes(key)) {
          await expect(panel).toBeHidden();
          continue;
        }
        const asset = narration.find(
          (asset) =>
            asset.scene === scene.id &&
            asset.locale === locale &&
            (asset.view ?? first) === key,
        );
        expect(asset).toBeDefined();
        await expect(page.locator(".narration-text")).toHaveText(asset.text);
      }
    }
    await views.first().click();
    for (const locale of ["pt-BR", "en-US"]) {
      await page.locator("#atlasLanguage").selectOption(locale);
      await page.locator("#narrationPlay").click();
      await expect(panel).toHaveAttribute("data-state", "playing");
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              window.atlasTestPlayers.filter(
                (player) => !player.paused && player.currentTime > 0,
              ).length,
          ),
        )
        .toBe(1);
      expect(recordings.at(-1)).toContain(`${baseURL}public/narration/`);
      await page.locator("#narrationPlay").click();
      await expect(panel).toHaveAttribute("data-state", "paused");
    }
    await page.screenshot({ path: test.info().outputPath("scene.png") });
    await page.locator("#riadDetails").click();
    await expect(panel).toBeHidden();
    await expect(page.locator(".riad-detail-caption")).toBeVisible();
    await page.locator("#riadExpand").click();
    await expect(page.locator("#worldLoading")).toBeHidden();
    expect(
      await page.evaluate(() =>
        window.atlasTestPlayers.every(
          (player) => player.paused && !player.getAttribute("src"),
        ),
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("static references, credits, soundscapes and English detail recordings need no API", async ({
  page,
  baseURL,
}) => {
  await page.goto("?scene=newar-potters-square");
  await waitForViewer(page, { timeout: 120_000 });
  await page.getByRole("button", { name: "References", exact: true }).click();
  const photograph = page.locator("#outdoorReferences img").first();
  await expect
    .poll(() => photograph.evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0);
  expect(await photograph.getAttribute("src")).toMatch(
    /^\/diorama-atlas\/public\//,
  );
  await page
    .getByRole("button", { name: "Close photographic references" })
    .click();
  await page
    .getByRole("button", { name: "About Atlas and asset credits" })
    .click();
  await expect(page.locator(".about-author")).toHaveText(
    "Created by Dr. Paulo Salem.",
  );
  await expect(
    page.getByRole("link", { name: "Dr. Paulo Salem", exact: true }),
  ).toHaveAttribute("href", "https://www.paulosalem.com/");
  await expect(page.locator(".credit-entry")).toHaveCount(credits.length);
  await page.locator("#creditSearch").fill("Kloofendal");
  await expect(page.locator(".credit-entry")).toHaveCount(1);
  await expect(page.locator(".credit-note")).toContainText("South Africa");
  await expect(page.locator(".credit-license")).toHaveAttribute(
    "href",
    "https://creativecommons.org/publicdomain/zero/1.0/",
  );
  const skyResponse = await page.request.get(
    new URL("public/outdoors/detail-assets/daylight-summer-sky_2k.hdr", baseURL)
      .href,
  );
  expect(skyResponse.ok()).toBe(true);
  const skyBytes = await skyResponse.body();
  expect(skyBytes.length).toBe(4624289);
  expect(skyBytes.subarray(0, 30).toString()).toMatch(/#\?(RADIANCE|RGBE)/);
  await page.locator("#creditSearch").fill("");
  expect(
    await page.locator(".credit-image-link").first().getAttribute("href"),
  ).toMatch(/^\/diorama-atlas\/public\//);
  await page.getByRole("button", { name: "Close About and credits" }).click();
  await page.locator("#atlasLanguage").selectOption("pt-BR");
  await page.locator(".about-button").click();
  await expect(page.locator(".about-author")).toHaveText(
    "Criado por Dr. Paulo Salem.",
  );
  await page.locator("#creditSearch").fill("folha verde");
  await expect(page.locator(".credit-entry")).toHaveCount(1);
  await expect(page.locator(".credit-note")).toContainText("Marrocos");
  await expect(page.locator(".credit-license")).toHaveAttribute(
    "href",
    "https://creativecommons.org/licenses/by-sa/4.0/",
  );
  await expect(
    page.getByRole("link", { name: "Estudo de folha verde de videira" }),
  ).toHaveAttribute("href", /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  expect(
    await page.evaluate(async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    }, new URL("public/outdoors/detail-assets/douro/leaf-green-detail.png", baseURL).href),
  ).toEqual([512, 512]);
  await page.keyboard.press("Escape");
  await page.locator("#atlasLanguage").selectOption("en-US");
  await page.locator("#soundscapeButton").click();
  await page.locator("#ambientSound").click();
  await expect(page.locator("#ambientSound")).toHaveText("Mute ambience");
  await page.getByRole("button", { name: "Mute all", exact: true }).click();
  await page.getByRole("button", { name: "Close soundscape" }).click();
  await page.goto("?scene=kissaten");
  await waitForViewer(page, { timeout: 120_000 });
  await page.evaluate(() => {
    window.speechSynthesis.speak = () => {
      throw new Error("Static narration must use the OpenAI recording.");
    };
  });
  await page.locator("#riadDetails").click();
  const recordedSpeech = page.waitForResponse(
    (response) =>
      response.url().startsWith(new URL("public/narration/", baseURL).href) &&
      response.url().endsWith(".mp3"),
  );
  await page.locator("#listenButton").click();
  expect((await recordedSpeech).ok()).toBe(true);
  await expect(page.locator("#listenButton")).toHaveText("Pause");
  await page.locator("#listenButton").click();
  await page.goto("?scene=missing-place");
  await page.getByRole("link", { name: "Return to the world" }).click();
  await expect(page).toHaveURL(baseURL);
});
