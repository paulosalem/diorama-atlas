export async function captureState(page) {
  return page.evaluate(async () => {
    const THREE = await import("three");
    const { getActiveViewer } = await import(
      new URL("src/client/viewer/panorama-viewer.js", location.href).href
    );
    const viewer = getActiveViewer();
    const shared = viewer.runtime.miniature && viewer.mode === "miniature";
    const key = shared
      ? document.querySelector("[data-miniature-view][aria-pressed=true]")
          ?.dataset.miniatureView
      : viewer.inspection?.selected;
    const view = shared ? viewer.runtime.miniature.views[key] : null;
    const target = shared
      ? !viewer.runtime.miniature.cutaway && view.closedTarget
        ? view.closedTarget
        : view.target
      : (viewer.inspection?.camera?.target ??
        viewer.camera
          .getWorldDirection(new THREE.Vector3())
          .add(viewer.camera.position)
          .toArray());
    const gl = viewer.renderer.getContext();
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      camera: {
        position: viewer.camera.position.toArray(),
        quaternion: viewer.camera.quaternion.toArray(),
        target,
        fov: viewer.camera.fov,
      },
      viewport: { width: innerWidth, height: innerHeight },
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      renderer: debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
      memory: { ...viewer.renderer.info.memory },
      elapsed: viewer.elapsed,
      shellOpen:
        viewer.runtime.miniature?.cutaway ??
        viewer.inspection?.shell?.open ??
        null,
    };
  });
}

export async function restoreCaptureCamera(page, pose) {
  await page.evaluate(async (pose) => {
    const { getActiveViewer } = await import(
      new URL("src/client/viewer/panorama-viewer.js", location.href).href
    );
    const viewer = getActiveViewer();
    if (viewer.runtime.miniature && viewer.mode === "miniature") {
      const key = document.querySelector(
        "[data-miniature-view][aria-pressed=true]",
      ).dataset.miniatureView;
      const view = viewer.runtime.miniature.views[key];
      viewer.runtime.miniature.views[key] = {
        ...view,
        position: pose.position,
        target: pose.target,
        closedTarget: pose.target,
      };
      viewer.selectMiniatureView(key);
    } else if (viewer.inspection?.camera) {
      const key = viewer.inspection.selected;
      viewer.runtime.views[key] = {
        ...viewer.runtime.views[key],
        position: pose.position,
        target: pose.target,
        fov: pose.fov,
        adaptiveBounds: false,
      };
      viewer.selectView(key);
    } else {
      viewer.lookAt(pose.target);
    }
    viewer.camera.position.fromArray(pose.position);
    viewer.camera.fov = pose.fov;
    viewer.camera.lookAt(...pose.target);
    viewer.camera.updateProjectionMatrix();
    viewer.camera.updateMatrixWorld();
  }, pose);
  await settleCapture(page);
  const actual = (await captureState(page)).camera;
  assertCaptureCamera(actual, pose);
}

export function assertCaptureCamera(actual, pose) {
  const error = Math.max(
    ...actual.position.map((value, i) => Math.abs(value - pose.position[i])),
    ...actual.target.map((value, i) => Math.abs(value - pose.target[i])),
    Math.abs(actual.fov - pose.fov),
    pose.quaternion
      ? 1 -
          Math.abs(
            actual.quaternion.reduce(
              (sum, value, i) => sum + value * pose.quaternion[i],
              0,
            ),
          )
      : 0,
  );
  if (!Number.isFinite(error) || error > 0.00001)
    throw new Error(`Controls changed the requested capture camera: ${error}`);
}

export async function restoreCaptureState(page, state) {
  await page.setViewportSize(state.viewport);
  await page.emulateMedia({
    reducedMotion: state.reducedMotion ? "reduce" : "no-preference",
  });
  if (typeof state.shellOpen === "boolean") {
    const shared = await page.locator("[data-miniature-view]").count();
    const shell = page.locator(shared ? ".miniature-roof" : "#miniatureShell");
    if (!(await shell.isVisible()))
      throw new Error("The reference capture requires a shell control.");
    const attribute = shared ? "aria-pressed" : "aria-expanded";
    if ((await shell.getAttribute(attribute)) !== String(state.shellOpen))
      await shell.click();
  }
  await restoreCaptureCamera(page, state.camera);
}

export async function settleCapture(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

export function orbitCapturePose(pose, angle, elevation = null) {
  const offset = pose.position.map((value, i) => value - pose.target[i]);
  const radius = Math.hypot(...offset);
  const horizontal = Math.hypot(offset[0], offset[2]);
  const azimuth = Math.atan2(offset[0], offset[2]) + angle;
  const y = elevation === null ? offset[1] : Math.sin(elevation) * radius;
  const span = elevation === null ? horizontal : Math.cos(elevation) * radius;
  return {
    target: [...pose.target],
    fov: pose.fov,
    position: [
      pose.target[0] + Math.sin(azimuth) * span,
      pose.target[1] + y,
      pose.target[2] + Math.cos(azimuth) * span,
    ],
  };
}

export async function captureMiniatureSurvey(page, capture) {
  const shared = await page.locator("[data-miniature-view]").count();
  const whole = page.locator(
    shared ? '[data-miniature-view="overview"]' : '[data-view="whole"]',
  );
  const shell = page.locator(shared ? ".miniature-roof" : "#miniatureShell");
  const hasShell = await shell.isVisible();
  const attribute = shared ? "aria-pressed" : "aria-expanded";
  const original = await page.evaluate(async (shared) => {
    const { getActiveViewer } = await import(
      new URL("src/client/viewer/panorama-viewer.js", location.href).href
    );
    const runtime = getActiveViewer().runtime;
    return shared ? runtime.miniature.views.overview : runtime.views.whole;
  }, Boolean(shared));
  async function resetWhole() {
    await page.evaluate(
      async ({ shared, original }) => {
        const { getActiveViewer } = await import(
          new URL("src/client/viewer/panorama-viewer.js", location.href).href
        );
        const runtime = getActiveViewer().runtime;
        if (shared) runtime.miniature.views.overview = original;
        else runtime.views.whole = original;
      },
      { shared: Boolean(shared), original },
    );
    await whole.click();
  }
  for (const open of hasShell ? [false, true] : [false]) {
    await resetWhole();
    if (hasShell && (await shell.getAttribute(attribute)) !== String(open))
      await shell.click();
    await settleCapture(page);
    const pose = (await captureState(page)).camera;
    const state = open ? "open" : "closed";
    for (let side = 0; side < 4; side++) {
      await restoreCaptureCamera(
        page,
        orbitCapturePose(pose, (side * Math.PI) / 2),
      );
      await capture(
        `survey-${state}-${side}`,
        `${state}: quarter turn ${side}`,
      );
    }
    if (!shared) {
      await restoreCaptureCamera(page, orbitCapturePose(pose, Math.PI, -0.3));
      await capture(`survey-${state}-underside`, `${state}: underside`);
    }
  }
  await resetWhole();
  if (hasShell && (await shell.getAttribute(attribute)) !== "false")
    await shell.click();
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await settleCapture(page);
    await capture(
      `survey-${viewport.width}x${viewport.height}`,
      `${viewport.width} x ${viewport.height}`,
      { fullPage: true },
    );
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await resetWhole();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(500);
  await capture("survey-motion-0", "Motion, first instant");
  await page.waitForTimeout(1600);
  await capture("survey-motion-1", "Motion, later instant");
  await page.emulateMedia({ reducedMotion: "reduce" });
}
