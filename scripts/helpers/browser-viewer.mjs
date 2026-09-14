export async function waitForViewer(page, { timeout = 90_000 } = {}) {
  await page
    .locator('#viewer[aria-busy="false"], .initial-loading a')
    .first()
    .waitFor({ state: "visible", timeout });
  if (await page.locator(".initial-loading a").count())
    throw new Error(await page.locator(".initial-loading").innerText());
}
