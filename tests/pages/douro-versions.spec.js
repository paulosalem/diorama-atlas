import { expect, test } from "@playwright/test";
import { waitForViewer } from "../../scripts/helpers/browser-viewer.mjs";

test("Douro's two experiences load beneath the static project path without API or lab dependencies", async ({
  page,
}) => {
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push(`${response.status()} ${response.url()}`);
  });
  await page.route("**/api/**", (route) => {
    failures.push(`Unexpected API request: ${route.request().url()}`);
    return route.abort();
  });
  await page.goto("?scene=douro-vineyard&version=miniature&view=railway");
  await waitForViewer(page, { timeout: 150_000 });
  await expect(page.locator("#miniatureStoryTitle")).toHaveText(
    "The railway beside the river",
  );
  await expect(
    page.getByRole("link", { name: "Landscape", exact: true }),
  ).toHaveAttribute(
    "href",
    /\/diorama-atlas\/\?scene=douro-vineyard&version=landscape$/,
  );
  await page.locator("#atlasLanguage").selectOption("pt-BR");
  await expect(page.locator("#miniatureStoryTitle")).toHaveText(
    "A ferrovia junto ao rio",
  );
  await page.locator("#atlasLanguage").selectOption("en-US");
  await page.screenshot({ path: test.info().outputPath("static-railway.png") });
  await page.getByRole("link", { name: "Landscape", exact: true }).click();
  await waitForViewer(page, { timeout: 150_000 });
  await page.locator('[data-view="railway"]').click();
  await page.screenshot({
    path: test.info().outputPath("static-landscape-railway.png"),
  });
  const urls = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((url) => new URL(url).origin === location.origin),
  );
  expect(
    urls.every((url) => new URL(url).pathname.startsWith("/diorama-atlas/")),
  ).toBe(true);
  expect(urls.some((url) => url.includes("/lab/"))).toBe(false);
  expect(failures).toEqual([]);
});
