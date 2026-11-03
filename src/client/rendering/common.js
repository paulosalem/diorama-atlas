const scripts = new Map();
export function script(url) {
  if (scripts.has(url)) return scripts.get(url);
  const pending = new Promise((resolve, reject) => {
    const element = document.createElement("script");
    element.src = url;
    element.onload = resolve;
    element.onerror = () => {
      scripts.delete(url);
      element.remove();
      reject(new Error(`Unable to load ${url}`));
    };
    document.head.append(element);
  });
  scripts.set(url, pending);
  return pending;
}

export function lookControls(canvas, apply) {
  const events = new AbortController();
  let yaw = 0,
    pitch = 0,
    dragging = false,
    x = 0,
    y = 0;
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      dragging = true;
      x = event.clientX;
      y = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "pointerup",
    () => {
      dragging = false;
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "pointercancel",
    () => {
      dragging = false;
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "lostpointercapture",
    () => {
      dragging = false;
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "pointermove",
    (event) => {
      if (!dragging) return;
      yaw -= (event.clientX - x) * 0.003;
      pitch = Math.max(
        -1.3,
        Math.min(1.3, pitch - (event.clientY - y) * 0.003),
      );
      x = event.clientX;
      y = event.clientY;
      apply(yaw, pitch);
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "keydown",
    (event) => {
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      event.preventDefault();
      yaw +=
        event.key === "ArrowLeft"
          ? 0.06
          : event.key === "ArrowRight"
            ? -0.06
            : 0;
      pitch = Math.max(
        -1.3,
        Math.min(
          1.3,
          pitch +
            (event.key === "ArrowUp"
              ? 0.06
              : event.key === "ArrowDown"
                ? -0.06
                : 0),
        ),
      );
      apply(yaw, pitch);
    },
    { signal: events.signal },
  );
  return {
    reset() {
      yaw = pitch = 0;
    },
    dispose() {
      events.abort();
    },
  };
}

export function waterNormal() {
  const image = document.createElement("canvas");
  image.width = image.height = 256;
  const context = image.getContext("2d");
  const pixels = context.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const u = (x / 256) * Math.PI * 2,
        v = (y / 256) * Math.PI * 2;
      const dx =
        Math.cos(3 * u + 2 * v) * 0.12 + Math.cos(7 * u - 5 * v) * 0.04;
      const dy =
        Math.cos(3 * u + 2 * v) * 0.08 - Math.cos(7 * u - 5 * v) * 0.03;
      const i = (y * 256 + x) * 4;
      pixels.data.set([128 + dx * 127, 128 + dy * 127, 252, 255], i);
    }
  context.putImageData(pixels, 0, 0);
  return image;
}
