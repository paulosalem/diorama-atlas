import * as THREE from "three";
import { subscribeLocale, t } from "../localization/locale.js";

export function miniatureFitDistance(
  camera,
  target,
  bounds,
  aspect = camera.aspect,
) {
  const back = camera.position.clone().sub(target).normalize();
  const right = new THREE.Vector3().crossVectors(camera.up, back).normalize();
  const up = new THREE.Vector3().crossVectors(back, right);
  const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * 0.88;
  const offset = new THREE.Vector3();
  let distance = camera.near;
  for (const x of [bounds[0][0], bounds[1][0]])
    for (const y of [bounds[0][1], bounds[1][1]])
      for (const z of [bounds[0][2], bounds[1][2]]) {
        offset.set(x, y, z).sub(target);
        distance = Math.max(
          distance,
          offset.dot(back) + Math.abs(offset.dot(right)) / (tangent * aspect),
          offset.dot(back) + Math.abs(offset.dot(up)) / tangent,
        );
      }
  return distance;
}

/** A peer camera presentation of an existing environment, not another scene. */
export function createMiniatureControls({
  runtime,
  camera,
  controls,
  canvas,
  viewer,
  panorama,
  onChange,
  onExit,
}) {
  const miniature = runtime.miniature;
  const events = new AbortController();
  const listen = (element, event, handler) =>
    element.addEventListener(event, handler, { signal: events.signal });
  let active = false;
  let savedInterior = null;
  let savedMiniature = null;
  let selected = "overview";
  let aspect = camera.aspect;
  const pointers = new Set();
  const modes = document.createElement("nav");
  modes.className = "representation-controls";
  modes.innerHTML =
    '<button type="button" data-mode="miniature"></button><button type="button" data-mode="interior" aria-pressed="true"></button>';
  modes.inert = true;
  viewer.querySelector(".viewer-header-actions").prepend(modes);
  const toolbar = document.createElement("div");
  toolbar.className = "miniature-viewpoints";
  toolbar.hidden = true;
  for (const key of Object.keys(miniature.views)) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.miniatureView = key;
    listen(button, "click", () => select(key));
    toolbar.append(button);
  }
  const roofButton = document.createElement("button");
  roofButton.type = "button";
  roofButton.className = "miniature-roof";
  toolbar.append(roofButton);
  viewer.querySelector("#riadToolbar").prepend(toolbar);
  const hint = document.createElement("p");
  hint.className = "miniature-hint";
  hint.hidden = true;
  viewer.querySelector(".canvas-mount").append(hint);
  const labels = { miniature: "Miniature", interior: "Interior" };
  function localize() {
    modes.setAttribute("aria-label", t("View mode"));
    for (const button of modes.querySelectorAll("button")) {
      button.textContent = t(labels[button.dataset.mode]);
      button.setAttribute(
        "aria-pressed",
        String((button.dataset.mode === "miniature") === active),
      );
    }
    for (const button of toolbar.querySelectorAll("[data-miniature-view]")) {
      button.textContent = t(
        miniature.views[button.dataset.miniatureView].label,
      );
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.miniatureView === selected),
      );
    }
    roofButton.textContent = t("Cutaway");
    roofButton.setAttribute("aria-pressed", String(miniature.cutaway));
    hint.textContent = t(
      miniature.cutaway
        ? "Architectural cutaway · Drag to orbit · Scroll or pinch to zoom"
        : "Roof on · Drag to orbit · Scroll or pinch to zoom",
    );
    if (active) {
      canvas.setAttribute(
        "aria-label",
        t(
          "Interactive miniature. Drag to orbit, scroll or pinch to zoom. Arrow keys pan; Shift and arrows rotate. Plus and minus zoom.",
        ),
      );
      viewer.querySelector("#riadViewLabel").textContent = t(
        miniature.views[selected].label,
      );
    }
  }
  const unsubscribeLocale = subscribeLocale(localize);
  const savePose = () => ({
    position: camera.position.clone(),
    target: controls.target.clone(),
    fov: camera.fov,
    near: camera.near,
    far: camera.far,
  });
  function restorePose(pose) {
    camera.position.copy(pose.position);
    controls.target.copy(pose.target);
    Object.assign(camera, { fov: pose.fov, near: pose.near, far: pose.far });
    camera.updateProjectionMatrix();
    camera.lookAt(controls.target);
  }
  const framingBounds = () =>
    miniature.views[selected].bounds ?? miniature.bounds;
  function select(key = "overview") {
    const view = miniature.views[key];
    if (!view) throw new RangeError(`Unknown miniature viewpoint: ${key}`);
    selected = key;
    controls.target.fromArray(view.target);
    camera.position.fromArray(view.position);
    camera.fov = 45;
    camera.near = 0.1;
    camera.far = 600;
    const distance = miniatureFitDistance(
      camera,
      controls.target,
      framingBounds(),
    );
    camera.position
      .sub(controls.target)
      .setLength(distance)
      .add(controls.target);
    camera.updateProjectionMatrix();
    controls.update();
    aspect = camera.aspect;
    localize();
  }
  function setMode(mode, { updateUrl = true } = {}) {
    if (!Object.hasOwn(labels, mode))
      throw new RangeError("Choose Miniature or Interior.");
    const next = mode === "miniature";
    if (active === next) return;
    for (const id of pointers) {
      canvas.dispatchEvent(
        new PointerEvent("pointercancel", { pointerId: id }),
      );
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    }
    pointers.clear();
    if (next) savedInterior = savePose();
    else savedMiniature = savePose();
    active = next;
    panorama.setEnabled(!active);
    miniature.setActive(active);
    toolbar.hidden = hint.hidden = !active;
    viewer.classList.toggle("is-miniature", active);
    if (active) {
      controls.minDistance = 6;
      controls.maxDistance = 400;
      controls.minPolarAngle = 0.035;
      controls.maxPolarAngle = Math.PI * 0.44;
      controls.screenSpacePanning = false;
      controls.maxTargetRadius = 45;
      controls.cursor.set(1, 0, 1);
      if (savedMiniature) {
        restorePose(savedMiniature);
        resize();
      } else select();
      controls.update();
    } else {
      restorePose(savedInterior);
      panorama.lookAt(savedInterior.target.toArray());
    }
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set("mode", mode);
      history.replaceState(history.state, "", url);
    }
    localize();
    onChange(active);
  }
  function resize() {
    if (!active || aspect === camera.aspect) return;
    const before = miniatureFitDistance(
      camera,
      controls.target,
      framingBounds(),
      aspect,
    );
    const after = miniatureFitDistance(
      camera,
      controls.target,
      framingBounds(),
    );
    camera.position
      .sub(controls.target)
      .multiplyScalar(after / before)
      .add(controls.target);
    aspect = camera.aspect;
    controls.update();
  }
  for (const button of modes.querySelectorAll("button"))
    listen(button, "click", () => setMode(button.dataset.mode));
  listen(roofButton, "click", () => {
    miniature.setCutaway(!miniature.cutaway);
    localize();
    onChange(active);
  });
  controls.listenToKeyEvents(canvas);
  listen(canvas, "pointerdown", (event) => {
    if (!active) return;
    pointers.add(event.pointerId);
    canvas.focus({ preventScroll: true });
  });
  for (const event of ["pointerup", "pointercancel"])
    listen(canvas, event, (event) => pointers.delete(event.pointerId));
  listen(canvas, "keydown", (event) => {
    if (!active || !["+", "=", "-"].includes(event.key)) return;
    event.preventDefault();
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(
      THREE.MathUtils.clamp(
        offset.length() * (event.key === "-" ? 1.15 : 1 / 1.15),
        controls.minDistance,
        controls.maxDistance,
      ),
    );
    camera.position.copy(controls.target).add(offset);
    controls.update();
  });
  listen(window, "keydown", (event) => {
    if (
      active &&
      event.key === "Escape" &&
      !document.querySelector("dialog[open]")
    )
      onExit();
  });
  localize();
  return {
    setMode,
    select,
    resize,
    get active() {
      return active;
    },
    ready() {
      modes.inert = false;
    },
    dispose() {
      events.abort();
      unsubscribeLocale();
      controls.stopListenToKeyEvents();
      modes.remove();
      toolbar.remove();
      hint.remove();
    },
  };
}
