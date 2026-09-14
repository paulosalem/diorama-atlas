import { expect, test } from "@playwright/test";
import { waitForViewer } from "../../scripts/helpers/browser-viewer.mjs";

test("capture tools wait for the published ready state and expose loading failures", async ({
  page,
}) => {
  await page.setContent(
    '<section id="viewer" aria-busy="true">Loading images</section>',
  );
  await page.evaluate(() => {
    setTimeout(() => {
      const viewer = document.querySelector("#viewer");
      viewer.textContent = "All images ready";
      viewer.setAttribute("aria-busy", "false");
    }, 300);
  });
  await waitForViewer(page);
  await expect(page.locator("#viewer")).toHaveText("All images ready");
  await page.setContent(
    '<div class="initial-loading"><p>The fixture could not load.</p><a href="/">Return</a></div>',
  );
  await expect(waitForViewer(page)).rejects.toThrow(
    "The fixture could not load.",
  );
});
