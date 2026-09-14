import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createMiniature } from "./world-miniatures.js";
import { locateScenes } from "../catalog/place-locations.js";
const RADIUS = 2.5;
export function geographicPosition(lat, lon, radius = RADIUS) {
  const p = (lat * Math.PI) / 180,
    l = (lon * Math.PI) / 180;
  return new THREE.Vector3(
    radius * Math.cos(p) * Math.cos(l),
    radius * Math.sin(p),
    -radius * Math.cos(p) * Math.sin(l),
  );
}
export async function createWorld(app, scenes) {
  const events = new AbortController();
  let disposed = false;
  app.innerHTML = `<section class="world" aria-label="Explore the world"><div id="globeCanvas"></div><div class="marker-layer" id="markers"></div><header class="world-header"><a class="brand" href="/" aria-label="Diorama Atlas home"><svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="11"/><ellipse cx="14" cy="14" rx="5" ry="11"/><path d="M3 14h22M5 8h18M5 20h18"/></svg>Diorama Atlas</a><button id="placesButton" aria-expanded="false" aria-controls="placesPanel">Places <span aria-hidden="true">↗</span></button></header><nav id="placesPanel" class="places-panel" aria-label="Places around the world" hidden></nav><div class="world-tools"><button id="zoomIn" aria-label="Zoom in">+</button><button id="zoomOut" aria-label="Zoom out">−</button><button id="resetWorld" aria-label="Reset globe view">↺</button></div><footer class="world-footer"><p><span class="desktop-hint">Drag to wander &nbsp;·&nbsp; Scroll to get closer</span><span class="mobile-hint">Drag to explore · Tap a place</span></p><a class="credits" href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/" target="_blank" rel="noreferrer">Earth imagery · NASA</a></footer><aside id="placePreview" class="preview" aria-label="Place preview" hidden></aside><div id="worldLoading" class="initial-loading" role="status">Opening the world<span></span></div></section>`;
  const world = app.querySelector(".world"),
    mount = app.querySelector("#globeCanvas"),
    layer = app.querySelector("#markers"),
    preview = app.querySelector("#placePreview"),
    panel = app.querySelector("#placesPanel"),
    placesButton = app.querySelector("#placesButton");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  mount.append(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    "aria-label",
    "Interactive Earth. Drag or use arrow keys to rotate. Plus and minus zoom.",
  );
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  const initial = geographicPosition(24, 35, 9.1);
  camera.position.copy(initial);
  try {
    const saved = JSON.parse(sessionStorage.getItem("atlas-globe-camera"));
    if (
      Array.isArray(saved) &&
      saved.length === 3 &&
      saved.every(Number.isFinite) &&
      Math.hypot(...saved) > 3.4 &&
      Math.hypot(...saved) < 13
    )
      camera.position.fromArray(saved);
  } catch {}
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.enablePan = false;
  controls.minDistance = 3.65;
  controls.maxDistance = 12.7;
  controls.rotateSpeed = 0.48;
  controls.zoomSpeed = 0.6;
  controls.minPolarAngle = 0.13;
  controls.maxPolarAngle = Math.PI - 0.13;
  scene.add(new THREE.AmbientLight(0xcbdfee, 1.25));
  scene.add(camera);
  const sun = new THREE.DirectionalLight(0xffefd7, 2.1);
  sun.position.set(-3, 4, 6);
  camera.add(sun);
  const fill = new THREE.DirectionalLight(0x8aafdc, 0.7);
  fill.position.set(4, -1, 2);
  camera.add(fill);
  const map = await new THREE.TextureLoader().loadAsync(
    "/public/earth/blue-marble.jpg",
  );
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS, 128, 96),
    new THREE.MeshStandardMaterial({ map, roughness: 0.88, metalness: 0.02 }),
  );
  scene.add(earth);
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS * 1.017, 96, 64),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { tint: { value: new THREE.Color(0x4d8daa) } },
      vertexShader:
        "varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
      fragmentShader:
        "varying vec3 n;varying vec3 v;uniform vec3 tint;void main(){float rim=pow(max(0.,1.-abs(dot(n,v))),3.);gl_FragColor=vec4(tint,rim*.38);}",
    }),
  );
  scene.add(atmosphere);
  const places = locateScenes(scenes),
    entries = [],
    normal = new THREE.Vector3(),
    projected = new THREE.Vector3();
  let active = null,
    hideTimer = null,
    flying = null;
  const save = () => {
    try {
      sessionStorage.setItem(
        "atlas-globe-camera",
        JSON.stringify(camera.position.toArray()),
      );
    } catch {}
  };
  function closePreview() {
    clearTimeout(hideTimer);
    preview.hidden = true;
    entries.forEach((e) => e.button.classList.remove("is-active"));
    active = null;
  }
  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(closePreview, 240);
  }
  function positionPreview(entry) {
    const w = world.clientWidth,
      h = world.clientHeight;
    preview.style.left = `${Math.max(18, Math.min(w - 326, entry.screen.x + 30))}px`;
    preview.style.top = `${Math.max(85, Math.min(h - preview.offsetHeight - 22, entry.screen.y - 90))}px`;
  }
  function showPreview(entry, index = 0) {
    clearTimeout(hideTimer);
    active = entry;
    entries.forEach((e) => e.button.classList.toggle("is-active", e === entry));
    const definition = entry.place.scenes[index];
    preview.replaceChildren();
    const link = document.createElement("a");
    link.className = "preview-main";
    link.href = `/?scene=${encodeURIComponent(definition.id)}&inspect=1`;
    link.addEventListener("click", save);
    const img = document.createElement("img");
    img.src = `/public/previews/${encodeURIComponent(definition.id)}.png`;
    img.alt = definition.title;
    img.onerror = () => {
      img.onerror = null;
      img.src = `/api/concepts/${encodeURIComponent(definition.id)}/hero?v=${encodeURIComponent(definition.concept?.imageVersion ?? "openai-photo-v2")}`;
    };
    const copy = document.createElement("div");
    copy.className = "preview-copy";
    const label = document.createElement("p");
    label.className = "preview-place";
    label.textContent = `${entry.place.name} · ${entry.place.country}`;
    const title = document.createElement("h2");
    title.textContent = definition.title;
    const enter = document.createElement("span");
    enter.className = "preview-enter";
    enter.innerHTML = 'Step inside <span aria-hidden="true">↗</span>';
    copy.append(label, title, enter);
    link.append(img, copy);
    preview.append(link);
    if (entry.place.scenes.length > 1) {
      const row = document.createElement("div");
      row.className = "preview-variants";
      entry.place.scenes.forEach((d, i) => {
        const b = document.createElement("button");
        b.textContent = `${i + 1}`;
        b.setAttribute("aria-label", d.title);
        b.setAttribute("aria-pressed", String(i === index));
        b.onclick = () => showPreview(entry, i);
        row.append(b);
      });
      preview.append(row);
    }
    const close = document.createElement("button");
    close.className = "preview-close";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close preview");
    close.onclick = closePreview;
    preview.append(close);
    preview.hidden = false;
    positionPreview(entry);
  }
  preview.addEventListener("pointerenter", () => clearTimeout(hideTimer));
  preview.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") scheduleHide();
  });
  preview.addEventListener("focusin", () => clearTimeout(hideTimer));
  function fly(entry) {
    closePreview();
    const start = camera.position.clone();
    const end = geographicPosition(entry.place.lat, entry.place.lon, 6.7);
    flying = { start, end, time: performance.now(), entry };
    panel.hidden = true;
    placesButton.setAttribute("aria-expanded", "false");
  }
  for (const place of places) {
    const position = geographicPosition(place.lat, place.lon, RADIUS + 0.018);
    const model = createMiniature(place.type);
    model.position.copy(position);
    model.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      position.clone().normalize(),
    );
    scene.add(model);
    const button = document.createElement("button");
    button.className = "place-pin";
    button.dataset.name = place.name;
    button.dataset.location = place.id;
    button.setAttribute(
      "aria-label",
      `${place.name}: preview ${place.scenes.length} ${place.scenes.length === 1 ? "place" : "places"}`,
    );
    layer.append(button);
    const entry = { place, position, model, button, screen: { x: 0, y: 0 } };
    entries.push(entry);
    button.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") showPreview(entry);
    });
    button.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") scheduleHide();
    });
    button.addEventListener("focus", () => showPreview(entry));
    button.addEventListener("click", (e) => {
      if (e.pointerType === "touch") {
        showPreview(entry);
        return;
      }
      save();
      location.href = `/?scene=${encodeURIComponent(place.scenes[0].id)}&inspect=1`;
    });
    const item = document.createElement("button");
    const name = document.createElement("span");
    name.textContent = place.name;
    const count = document.createElement("small");
    count.textContent = `${place.scenes.length} ${place.scenes.length === 1 ? "place" : "places"}`;
    item.append(name, count);
    item.dataset.destination = place.id;
    item.onclick = () => fly(entry);
    panel.append(item);
  }
  placesButton.onclick = () => {
    panel.hidden = !panel.hidden;
    placesButton.setAttribute("aria-expanded", String(!panel.hidden));
    closePreview();
  };
  const zoom = (factor) => {
    flying = null;
    camera.position.multiplyScalar(
      THREE.MathUtils.clamp(
        camera.position.length() * factor,
        controls.minDistance,
        controls.maxDistance,
      ) / camera.position.length(),
    );
    controls.update();
    save();
  };
  app.querySelector("#zoomIn").onclick = () => zoom(0.85);
  app.querySelector("#zoomOut").onclick = () => zoom(1.15);
  app.querySelector("#resetWorld").onclick = () => {
    flying = null;
    closePreview();
    camera.position.copy(initial);
    controls.target.set(0, 0, 0);
    controls.update();
    save();
  };
  renderer.domElement.addEventListener("pointerdown", () => {
    closePreview();
    panel.hidden = true;
    placesButton.setAttribute("aria-expanded", "false");
    flying = null;
  });
  window.addEventListener(
    "pointerup",
    () => {
      save();
    },
    { signal: events.signal },
  );
  renderer.domElement.addEventListener("keydown", (e) => {
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "=",
        "-",
      ].includes(e.key)
    ) {
      e.preventDefault();
      closePreview();
      if (["+", "=", "-"].includes(e.key)) {
        zoom(e.key === "-" ? 1.1 : 0.9);
        return;
      }
      const spherical = new THREE.Spherical().setFromVector3(camera.position);
      if (e.key === "ArrowLeft") spherical.theta -= 0.09;
      if (e.key === "ArrowRight") spherical.theta += 0.09;
      if (e.key === "ArrowUp") spherical.phi -= 0.07;
      if (e.key === "ArrowDown") spherical.phi += 0.07;
      spherical.makeSafe();
      camera.position.setFromSpherical(spherical);
      controls.update();
      save();
    }
  });
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") {
        closePreview();
        panel.hidden = true;
        placesButton.setAttribute("aria-expanded", "false");
      }
    },
    { signal: events.signal },
  );
  function resize() {
    const w = world.clientWidth,
      h = world.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = THREE.MathUtils.radToDeg(
      2 *
        Math.atan(Math.tan(THREE.MathUtils.degToRad(18)) / Math.min(1, w / h)),
    );
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize, { signal: events.signal });
  function tick(now) {
    if (flying) {
      const t = Math.min(
        1,
        (now - flying.time) /
          (matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 1100),
      );
      const ease = t * t * (3 - 2 * t);
      const a = flying.start.clone().normalize(),
        b = flying.end.clone().normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(a, b);
      a.applyQuaternion(new THREE.Quaternion().slerp(q, ease));
      camera.position.copy(
        a.multiplyScalar(
          THREE.MathUtils.lerp(
            flying.start.length(),
            flying.end.length(),
            ease,
          ),
        ),
      );
      if (t === 1) {
        const e = flying.entry;
        flying = null;
        save();
        showPreview(e);
      }
    }
    controls.update();
    camera.updateMatrixWorld();
    for (const entry of entries) {
      normal.copy(entry.position).normalize();
      const visible = normal.dot(camera.position) > RADIUS + 0.08;
      projected
        .copy(entry.position)
        .addScaledVector(normal, 0.145)
        .project(camera);
      entry.screen.x = (projected.x * 0.5 + 0.5) * world.clientWidth;
      entry.screen.y = (-projected.y * 0.5 + 0.5) * world.clientHeight;
      entry.button.hidden =
        !visible ||
        projected.z > 1 ||
        Math.abs(projected.x) > 1.05 ||
        Math.abs(projected.y) > 1.05;
      entry.button.style.left = `${entry.screen.x}px`;
      entry.button.style.top = `${entry.screen.y}px`;
      entry.model.scale.setScalar(0.105 * (entry === active ? 1.13 : 1));
      if (entry === active && !visible) closePreview();
    }
    // Keep nearby geographic markers from covering one another's tap centers.
    const visibleEntries = entries.filter((entry) => !entry.button.hidden);
    for (const entry of visibleEntries) {
      let nearest = Infinity;
      for (const other of visibleEntries) {
        if (entry === other) continue;
        nearest = Math.min(
          nearest,
          Math.hypot(
            entry.screen.x - other.screen.x,
            entry.screen.y - other.screen.y,
          ),
        );
      }
      const size = Math.min(50, nearest * 1.35);
      entry.button.style.width = `${size}px`;
      entry.button.style.height = `${size}px`;
    }
    if (active && !preview.hidden) positionPreview(active);
    renderer.render(scene, camera);
  }
  app.querySelector("#worldLoading").remove();
  controls.update();
  renderer.setAnimationLoop(tick);
  function dispose() {
    if (disposed) return;
    disposed = true;
    events.abort();
    save();
    clearTimeout(hideTimer);
    renderer.setAnimationLoop(null);
    controls.dispose();
    const geometries = new Set(),
      materials = new Set();
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    map.dispose();
    renderer.dispose();
  }
  window.addEventListener("pagehide", dispose, { signal: events.signal });
  return { camera, entries, renderer, controls, geographicPosition, dispose };
}
