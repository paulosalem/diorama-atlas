import { lookControls } from "./common.js";

export function miniatureCamera(B, scene, canvas) {
  const orbit = new B.ArcRotateCamera(
    "Hold the miniature",
    0,
    1,
    60,
    new B.Vector3(0, -2.6, -6.4),
    scene,
  );
  orbit.minZ = 0.04;
  orbit.maxZ = 300;
  orbit.lowerRadiusLimit = 3;
  orbit.upperRadiusLimit = 130;
  orbit.lowerBetaLimit = 0.12;
  orbit.upperBetaLimit = 2.12;
  orbit.wheelDeltaPercentage = 0.015;
  orbit.pinchDeltaPercentage = 0.012;
  orbit.panningSensibility = 0;
  orbit.angularSensibilityX = orbit.angularSensibilityY = 700;
  orbit.inertia = 0.72;
  const eye = new B.FreeCamera("At eye level", B.Vector3.Zero(), scene);
  eye.minZ = 0.025;
  eye.maxZ = 300;
  let finalInspection;
  let fit = 1,
    baseRadius = 60,
    bounds;
  let controls = null,
    selected = null,
    disposed = false;
  function fittedRadius() {
    if (!bounds) throw new Error("The miniature needs bounds before framing.");
    const target = orbit.getTarget();
    const direction = orbit.position.subtract(target).normalize();
    const right = B.Vector3.Cross(B.Vector3.Up(), direction).normalize();
    const up = B.Vector3.Cross(direction, right);
    const vertical = Math.tan(orbit.fov / 2);
    const horizontal = (vertical * canvas.clientWidth) / canvas.clientHeight;
    let radius = 0;
    for (const x of [bounds.min[0], bounds.max[0]])
      for (const y of [bounds.min[1], bounds.max[1]])
        for (const z of [bounds.min[2], bounds.max[2]]) {
          const offset = new B.Vector3(x, y, z).subtract(target);
          radius = Math.max(
            radius,
            B.Vector3.Dot(offset, direction) +
              Math.max(
                Math.abs(B.Vector3.Dot(offset, right)) / horizontal,
                Math.abs(B.Vector3.Dot(offset, up)) / vertical,
              ) /
                0.84,
          );
        }
    return radius;
  }
  function detach() {
    orbit.detachControl();
    controls?.dispose();
    controls = null;
    orbit.inertialAlphaOffset =
      orbit.inertialBetaOffset =
      orbit.inertialRadiusOffset =
        0;
  }
  function view(value) {
    if (disposed) throw new Error("The miniature camera has been disposed.");
    detach();
    selected = value;
    const camera = value.orbit ? orbit : eye;
    scene.activeCamera = camera;
    camera.fov = (value.fov * Math.PI) / 180;
    if (value.orbit) {
      orbit.lowerRadiusLimit = value.overview ? 14 : 3;
      orbit.setTarget(B.Vector3.FromArray(value.target));
      orbit.setPosition(B.Vector3.FromArray(value.position));
      if (value.overview) {
        baseRadius = orbit.radius;
        fit = Math.max(1, fittedRadius() / baseRadius);
        orbit.radius = baseRadius * fit;
        orbit.upperRadiusLimit = Math.max(130, orbit.radius * 1.3);
        orbit.getViewMatrix(true);
      }
      orbit.attachControl(canvas, true);
    } else {
      eye.position.copyFromFloats(...value.position);
      eye.setTarget(B.Vector3.FromArray(value.target));
      const base = eye.rotation.clone();
      controls = lookControls(canvas, (yaw, pitch) => {
        eye.rotation.copyFrom(base);
        eye.rotation.y += yaw;
        eye.rotation.x -= pitch;
      });
    }
  }
  const events = new AbortController();
  canvas.addEventListener(
    "wheel",
    (event) => {
      if (!selected || selected.orbit) return;
      event.preventDefault();
      eye.fov = B.Scalar.Clamp(eye.fov + event.deltaY * 0.0007, 0.3, 1.5);
    },
    { passive: false, signal: events.signal },
  );
  return {
    cameras: [orbit, eye],
    frameBounds(value) {
      bounds = value;
    },
    view,
    reset() {
      if (selected) view(selected);
    },
    zoom(direction) {
      if (selected?.orbit)
        orbit.radius = B.Scalar.Clamp(
          orbit.radius * Math.exp(direction * 0.14),
          orbit.lowerRadiusLimit,
          orbit.upperRadiusLimit,
        );
      else
        eye.fov = B.Scalar.Clamp(
          eye.fov * Math.exp(direction * 0.14),
          0.3,
          1.5,
        );
    },
    reducedMotion(value) {
      orbit.inertia = value ? 0 : 0.72;
      if (value)
        orbit.inertialAlphaOffset =
          orbit.inertialBetaOffset =
          orbit.inertialRadiusOffset =
            0;
    },
    resize() {
      if (!selected?.overview || disposed) return;
      const next = Math.max(1, fittedRadius() / baseRadius);
      orbit.radius *= next / fit;
      orbit.upperRadiusLimit = Math.max(130, orbit.radius * 1.3);
      fit = next;
      orbit.getViewMatrix(true);
    },
    get inspection() {
      if (disposed) return finalInspection;
      const camera = scene.activeCamera;
      return {
        mode: selected?.orbit ? "orbit" : "eye",
        position: camera.position.asArray(),
        target: camera.getTarget().asArray(),
        radius: selected?.orbit ? orbit.radius : null,
        fov: (camera.fov * 180) / Math.PI,
      };
    },
    dispose() {
      if (disposed) return;
      finalInspection = this.inspection;
      disposed = true;
      detach();
      events.abort();
    },
  };
}
