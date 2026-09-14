import * as THREE from "three";
import { subscribeLocale, t } from "../localization/locale.js";

/** Eye-height inspection controls shared by all full-scale atlas environments. */
export function createPanoramaControls({
  camera,
  canvas,
  controls,
  viewer,
  onResize,
  onView,
  onExit,
}) {
  const events = new AbortController();
  const listen = (target, event, listener, options = {}) =>
    target.addEventListener(event, listener, {
      ...options,
      signal: events.signal,
    });
  const toolbar = document.getElementById("riadToolbar");
  const viewpoints = toolbar.querySelector(".riad-viewpoints");
  const expand = document.getElementById("riadExpand");
  const details = document.getElementById("riadDetails");
  const pointers = new Map(),
    direction = new THREE.Vector3();
  let active = false,
    views = {},
    minimumFov = 32,
    yaw = 0,
    pitch = 0,
    pinch = 0;
  let definition = null;
  let selectedKey = null;
  function localize() {
    if (!definition) return;
    for (const button of viewpoints.querySelectorAll("button"))
      button.textContent = t(views[button.dataset.view].label);
    details.textContent = t(
      viewer.classList.contains("show-riad-details")
        ? "Hide details"
        : "Show details",
    );
    expand.textContent = t(
      onExit
        ? "Back to world"
        : document.body.classList.contains("riad-expanded")
          ? "Return to atlas"
          : "Expand view",
    );
    canvas.setAttribute(
      "aria-label",
      active
        ? `${t(definition.title)}. ${t("Drag or use arrow keys to look around; scroll or press plus and minus to zoom.")}`
        : t("Interactive diorama"),
    );
    viewpoints.setAttribute(
      "aria-label",
      t("{title} viewpoints", { title: t(definition.title) }),
    );
    if (selectedKey)
      viewer.querySelector("#riadViewLabel").textContent = t(
        views[selectedKey].label,
      );
  }
  const unsubscribeLocale = subscribeLocale(localize);
  function orient() {
    direction.set(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    );
    controls.target.copy(camera.position).addScaledVector(direction, 3);
    camera.lookAt(controls.target);
  }
  function lookAt(point) {
    direction.fromArray(point).sub(camera.position).normalize();
    yaw = Math.atan2(direction.x, -direction.z);
    pitch = Math.asin(direction.y);
    orient();
  }
  function select(key = Object.keys(views)[0]) {
    const view = views[key];
    if (!view) return;
    selectedKey = key;
    camera.position.fromArray(view.position);
    camera.fov = view.fov ?? 61;
    camera.near = 0.04;
    camera.updateProjectionMatrix();
    lookAt(view.target);
    viewpoints
      .querySelectorAll("button")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.view === key)),
      );
    onView?.(view.label, key);
  }
  function setExpanded(value) {
    const expanded = active && value;
    document.body.classList.toggle("riad-expanded", expanded);
    expand.textContent = t(
      onExit ? "Back to world" : expanded ? "Return to atlas" : "Expand view",
    );
    expand.setAttribute("aria-pressed", String(expanded));
    requestAnimationFrame(onResize);
  }
  function zoom(amount) {
    camera.fov = THREE.MathUtils.clamp(camera.fov + amount, minimumFov, 85);
    camera.updateProjectionMatrix();
  }
  listen(canvas, "pointerdown", (event) => {
    if (!active || (event.pointerType === "mouse" && event.button !== 0))
      return;
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pinch = 0;
    canvas.classList.add("is-looking");
  });
  listen(canvas, "pointermove", (event) => {
    if (!active || !pointers.has(event.pointerId)) return;
    const last = pointers.get(event.pointerId);
    if (pointers.size === 1) {
      yaw -= (event.clientX - last.x) * 0.0033;
      pitch = THREE.MathUtils.clamp(
        pitch + (event.clientY - last.y) * 0.0033,
        -1.35,
        1.35,
      );
      orient();
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()],
        distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch && distance > 0) zoom(camera.fov * (pinch / distance - 1));
      pinch = distance;
    }
  });
  const release = (event) => {
    pointers.delete(event.pointerId);
    pinch = 0;
    if (!pointers.size) canvas.classList.remove("is-looking");
  };
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    listen(canvas, event, release);
  listen(
    canvas,
    "wheel",
    (event) => {
      if (active) {
        event.preventDefault();
        zoom(event.deltaY * 0.026);
      }
    },
    { passive: false },
  );
  listen(canvas, "keydown", (event) => {
    if (
      !active ||
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "=",
        "-",
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    if (event.key === "ArrowLeft") yaw -= 0.045;
    if (event.key === "ArrowRight") yaw += 0.045;
    if (event.key === "ArrowUp") pitch += 0.045;
    if (event.key === "ArrowDown") pitch -= 0.045;
    if (event.key === "+" || event.key === "=") zoom(-2);
    if (event.key === "-") zoom(2);
    pitch = THREE.MathUtils.clamp(pitch, -1.35, 1.35);
    orient();
  });
  listen(expand, "click", () =>
    onExit
      ? onExit()
      : setExpanded(!document.body.classList.contains("riad-expanded")),
  );
  listen(details, "click", () => {
    const show = viewer.classList.toggle("show-riad-details");
    details.setAttribute("aria-pressed", String(show));
    details.textContent = t(show ? "Hide details" : "Show details");
  });
  listen(window, "keydown", (event) => {
    if (
      active &&
      event.key === "Escape" &&
      !document.querySelector("dialog[open]")
    ) {
      if (onExit) onExit();
      else setExpanded(false);
    }
  });
  return {
    select,
    lookAt,
    setExpanded,
    get active() {
      return active;
    },
    dispose() {
      active = false;
      pointers.clear();
      events.abort();
      unsubscribeLocale();
      canvas.classList.remove("is-looking");
      document.body.classList.remove("riad-expanded");
    },
    activate(runtime, sceneDefinition) {
      definition = sceneDefinition;
      active = Boolean(runtime?.views);
      views = runtime?.views ?? {};
      minimumFov = definition.environment === "outdoor" ? 18 : 32;
      pointers.clear();
      pinch = 0;
      controls.enabled = !active;
      toolbar.hidden = !active;
      viewer.classList.toggle("is-riad", active);
      canvas.tabIndex = active ? 0 : -1;
      canvas.setAttribute(
        "aria-label",
        active
          ? `${definition.title}. Drag or use arrow keys to look around; scroll or press plus and minus to zoom.`
          : "Interactive diorama",
      );
      viewpoints.setAttribute("aria-label", `${definition.title} viewpoints`);
      viewpoints.replaceChildren();
      for (const [key, view] of Object.entries(views)) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.view = key;
        button.textContent = t(view.label);
        button.setAttribute("aria-pressed", "false");
        listen(button, "click", () => select(key));
        viewpoints.appendChild(button);
      }
      if (active) {
        select();
        if (new URLSearchParams(location.search).get("inspect") === "1")
          setExpanded(true);
      } else {
        setExpanded(false);
        camera.fov = 38;
        camera.near = 0.1;
        camera.updateProjectionMatrix();
      }
      localize();
    },
  };
}
