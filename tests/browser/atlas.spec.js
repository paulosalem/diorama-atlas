import { expect, test } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { curatedScenes } from "../../src/client/catalog/scene-catalog.js";
import { outdoorScenes } from "../../src/client/catalog/outdoor-catalog.js";

test.describe.configure({ timeout: 180_000 });

const sceneDirectory = new URL("../../data/scenes/", import.meta.url);
const bundledScenes = await Promise.all(
  (await readdir(sceneDirectory))
    .filter((name) => name.endsWith(".json"))
    .map(async (name) => {
      const saved = JSON.parse(
        await readFile(new URL(name, sceneDirectory), "utf8"),
      );
      return saved.scene;
    }),
);

test.beforeEach(async ({ page }) => {
  // A browser regression must never trigger a paid generation request.
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    if (
      request.method() === "GET" &&
      new URL(request.url()).pathname === "/api/generated-scenes"
    ) {
      await route.continue();
    } else {
      await route.abort("blockedbyclient");
      throw new Error(
        `Unexpected API request: ${request.method()} ${request.url()}`,
      );
    }
  });
});

test("the globe offers eighteen locations and opens an interior", async ({
  page,
}) => {
  await page.goto("/");
  const brand = page.getByRole("link", {
    name: "Diorama Atlas home",
    exact: true,
  });
  await expect(brand).toHaveText("Diorama Atlas");
  await expect(page).toHaveTitle("Diorama Atlas — a world of small places");
  await expect(page.locator("#worldLoading")).toBeHidden();
  await expect(page.locator(".place-pin")).toHaveCount(18);
  await page.getByRole("button", { name: "Places", exact: true }).click();
  await expect(page.locator("#placesPanel")).toBeVisible();
  await expect(page.locator("#placesPanel button")).toHaveCount(18);
  await page
    .locator("#placesPanel button")
    .filter({ hasText: "Marrakech" })
    .click();
  await expect(page.locator("#placePreview")).toBeVisible();
  await expect(page.locator("#placePreview .preview-main")).toHaveAttribute(
    "href",
    "/?scene=riad&inspect=1",
  );
  await page.locator("#placePreview .preview-main").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Marrakech Riad Courtyard",
  );
  await expect(page.locator("#riadLoading")).toBeHidden({ timeout: 90_000 });
  await page.getByRole("button", { name: "Back to world" }).click();
  await expect(page.locator("#worldLoading")).toBeHidden();
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(brand).toBeVisible();
  const [brandBox, placesBox] = await Promise.all([
    brand.boundingBox(),
    page.getByRole("button", { name: "Places", exact: true }).boundingBox(),
  ]);
  expect(brandBox).not.toBeNull();
  expect(placesBox).not.toBeNull();
  expect(
    brandBox.x + brandBox.width <= placesBox.x ||
      brandBox.y + brandBox.height <= placesBox.y,
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

for (const scene of [...curatedScenes, ...bundledScenes, ...outdoorScenes]) {
  test(`${scene.title}: assets, viewpoints, and details survive the reorganization`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        errors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(`/?scene=${encodeURIComponent(scene.id)}&inspect=1`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      scene.title,
    );
    await expect(page.locator("#riadLoading")).toBeHidden({ timeout: 90_000 });
    await expect(page.locator("canvas")).toBeVisible();
    const viewpoints = page.locator(".riad-viewpoints button");
    await expect(viewpoints).toHaveCount(
      scene.environment === "outdoor" ? 4 : scene.id === "riad" ? 6 : 5,
    );
    for (const viewpoint of await viewpoints.all()) {
      await viewpoint.click();
      await expect(viewpoint).toHaveAttribute("aria-pressed", "true");
    }
    await page.getByRole("button", { name: "Show details" }).click();
    await expect(page.locator("#viewer")).toHaveClass(/show-riad-details/);
    await expect(page.locator(".hotspot")).toHaveCount(scene.details.length);
    await page.getByRole("button", { name: "Reset view" }).click();
    await expect(viewpoints.first()).toHaveAttribute("aria-pressed", "true");
    await page.locator("#soundscapeButton").click();
    await page
      .getByRole("button", { name: "Enable ambience", exact: true })
      .click();
    await expect(page.locator("#ambientSound")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator("#ambientSound")).toHaveText("Mute ambience");
    await page.getByRole("button", { name: "Close soundscape" }).click();
    await viewpoints.last().click();
    await page.locator("#soundscapeButton").click();
    await page.getByRole("button", { name: "Mute all", exact: true }).click();
    const audio = await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      return getActiveViewer().runtime.soundscape.inspection;
    });
    expect(audio.nodes).toBe(0);
    expect(audio.contextState).toBe("closed");
    expect(errors).toEqual([]);
  });
}

test("a narrow viewport keeps navigation usable and Escape returns to the globe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?scene=kissaten&inspect=1");
  await expect(page.locator("#riadLoading")).toBeHidden({ timeout: 90_000 });
  await expect(
    page.getByRole("button", { name: "Back to world" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("canvas").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("+");
  await page.keyboard.press("Escape");
  await expect(page.locator("#worldLoading")).toBeHidden();
});

test("an unknown place has a visible recovery path", async ({ page }) => {
  await page.goto("/?scene=not-a-place");
  await expect(page.getByText("This place could not be found.")).toBeVisible();
  await page.getByRole("link", { name: "Return to the world" }).click();
  await expect(page.locator("#worldLoading")).toBeHidden();
});
