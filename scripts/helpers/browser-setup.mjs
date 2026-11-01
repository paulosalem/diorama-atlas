import { chromium } from "@playwright/test";

export default async function checkBrowserRenderer(config) {
  const { channel, launchOptions } = config.projects[0].use;
  const browser = await chromium.launch({ channel, ...launchOptions });
  try {
    const page = await browser.newPage();
    const renderer = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2");
      if (!gl) throw new Error("WebGL 2 is unavailable.");
      try {
        const info = gl.getExtension("WEBGL_debug_renderer_info");
        if (!info) throw new Error("The WebGL renderer cannot be identified.");
        return gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
      } finally {
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    });
    console.log(`Browser renderer: ${renderer}`);
    if (
      process.env.CI &&
      /swiftshader|llvmpipe|softpipe|software/i.test(renderer)
    )
      throw new Error(
        "The full-detail browser suites require a hardware GPU in CI. " +
          `This runner uses software rendering: ${renderer}`,
      );
  } finally {
    await browser.close();
  }
}
