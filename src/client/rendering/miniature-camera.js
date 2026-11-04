import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { lookControls } from "./common.js";

export function miniatureCamera(camera, canvas) {
  const events = new AbortController();
  const target = new THREE.Vector3();
  let controls, selected, bounds, snapshot;
  let disposed = false,
    reduced = false,
    fit = 1,
    baseRadius = 60,
    maxRadius = 130;

  function fittedRadius() {
    if (!bounds) throw new Error("The miniature needs bounds before framing.");
    const direction = camera.position.clone().sub(target).normalize();
    const right = new THREE.Vector3()
      .crossVectors(camera.up, direction)
      .normalize();
    const up = new THREE.Vector3().crossVectors(direction, right);
    const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const horizontal = vertical * camera.aspect;
    let radius = 0;
    for (const x of [bounds.min[0], bounds.max[0]])
      for (const y of [bounds.min[1], bounds.max[1]])
        for (const z of [bounds.min[2], bounds.max[2]]) {
          const offset = new THREE.Vector3(x, y, z).sub(target);
          radius = Math.max(
            radius,
            offset.dot(direction) +
              Math.max(
                Math.abs(offset.dot(right)) / horizontal,
                Math.abs(offset.dot(up)) / vertical,
              ) /
                0.84,
          );
        }
    return radius;
  }
  function setRadius(radius) {
    camera.position.sub(target).setLength(radius).add(target);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    controls?.update?.();
  }
  function view(value) {
    if (disposed) throw new Error("The miniature camera has been disposed.");
    controls?.dispose();
    selected = value;
    camera.fov = value.fov;
    camera.position.fromArray(value.position);
    target.fromArray(value.target);
    if (value.adaptiveBounds && bounds) {
      const center = new THREE.Vector3()
        .fromArray(bounds.min)
        .add(new THREE.Vector3().fromArray(bounds.max))
        .multiplyScalar(0.5);
      camera.position.add(center.clone().sub(target));
      target.copy(center);
    }
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    controls = null;
    maxRadius = 130;
    if (value.overview) {
      baseRadius = camera.position.distanceTo(target);
      fit = Math.max(value.adaptiveBounds ? 0 : 1, fittedRadius() / baseRadius);
      setRadius(baseRadius * fit);
      maxRadius = Math.max(130, baseRadius * fit * 1.3);
    }
    if (value.orbit) {
      controls = new OrbitControls(camera, canvas);
      controls.target.copy(target);
      controls.enablePan = false;
      controls.enableDamping = !reduced;
      controls.dampingFactor = 0.28;
      controls.minDistance = value.overview ? 14 : 3;
      controls.maxDistance = maxRadius;
      controls.minPolarAngle = 0.12;
      controls.maxPolarAngle = 2.12;
      controls.update();
    } else {
      camera.rotation.reorder("YXZ");
      const base = camera.rotation.clone();
      controls = lookControls(canvas, (yaw, pitch) => {
        camera.rotation.copy(base);
        camera.rotation.y += yaw;
        camera.rotation.x += pitch;
        camera.updateMatrixWorld();
      });
    }
  }
  canvas.addEventListener(
    "wheel",
    (event) => {
      if (!selected || selected.orbit) return;
      event.preventDefault();
      camera.fov = THREE.MathUtils.clamp(
        camera.fov + event.deltaY * 0.04,
        17,
        86,
      );
      camera.updateProjectionMatrix();
    },
    { passive: false, signal: events.signal },
  );
  canvas.addEventListener(
    "keydown",
    (event) => {
      if (
        !selected?.orbit ||
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      event.preventDefault();
      const sphere = new THREE.Spherical().setFromVector3(
        camera.position.clone().sub(target),
      );
      if (event.key === "ArrowLeft") sphere.theta += 0.06;
      if (event.key === "ArrowRight") sphere.theta -= 0.06;
      if (event.key === "ArrowUp") sphere.phi -= 0.06;
      if (event.key === "ArrowDown") sphere.phi += 0.06;
      sphere.phi = THREE.MathUtils.clamp(sphere.phi, 0.12, 2.12);
      camera.position.setFromSpherical(sphere).add(target);
      controls.update();
    },
    { signal: events.signal },
  );
  return {
    frameBounds(value) {
      bounds = value;
      if (selected?.adaptiveBounds) {
        const center = new THREE.Vector3()
          .fromArray(bounds.min)
          .add(new THREE.Vector3().fromArray(bounds.max))
          .multiplyScalar(0.5);
        camera.position.add(center.clone().sub(target));
        target.copy(center);
        controls.target.copy(target);
      }
    },
    view,
    reset() {
      if (selected) view(selected);
    },
    update() {
      controls?.update?.();
    },
    zoom(direction) {
      if (selected?.orbit)
        setRadius(
          THREE.MathUtils.clamp(
            camera.position.distanceTo(target) * Math.exp(direction * 0.14),
            selected.overview ? 14 : 3,
            maxRadius,
          ),
        );
      else {
        camera.fov = THREE.MathUtils.clamp(
          camera.fov * Math.exp(direction * 0.14),
          17,
          86,
        );
        camera.updateProjectionMatrix();
      }
    },
    reducedMotion(value) {
      if (reduced === value) return;
      reduced = value;
      if (selected?.orbit) {
        controls.enableDamping = false;
        controls.update();
        controls.enableDamping = !value;
      }
    },
    resize() {
      if (!selected?.overview || disposed) return;
      const next = Math.max(
        selected.adaptiveBounds ? 0 : 1,
        fittedRadius() / baseRadius,
      );
      maxRadius = Math.max(130, baseRadius * next * 1.3);
      controls.maxDistance = maxRadius;
      setRadius((camera.position.distanceTo(target) * next) / fit);
      fit = next;
    },
    get inspection() {
      if (disposed) return snapshot;
      return {
        mode: selected?.orbit ? "orbit" : "eye",
        position: camera.position.toArray(),
        target: selected?.orbit
          ? target.toArray()
          : camera
              .getWorldDirection(new THREE.Vector3())
              .add(camera.position)
              .toArray(),
        radius: selected?.orbit ? camera.position.distanceTo(target) : null,
        fov: camera.fov,
      };
    },
    dispose() {
      if (disposed) return;
      snapshot = this.inspection;
      disposed = true;
      controls?.dispose();
      events.abort();
    },
  };
}
