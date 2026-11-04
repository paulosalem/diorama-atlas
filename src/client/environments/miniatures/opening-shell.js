import * as THREE from "three";

export function createOpeningShell(group, shell, offset) {
  if (
    !shell?.isGroup ||
    !Array.isArray(offset) ||
    offset.length !== 3 ||
    !offset.every(Number.isFinite)
  )
    throw new Error(
      "An opening miniature needs an authored shell and finite separation.",
    );
  const destination = new THREE.Vector3(...offset);
  const closed = shell.position.clone();
  const ease = (n) => n * n * (3 - 2 * n);
  let progress = 0,
    from = 0,
    target = 0,
    started = 0,
    moving = false;
  const bounds = () => {
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    return { min: box.min.toArray(), max: box.max.toArray() };
  };
  const position = () => {
    const vertical = ease(THREE.MathUtils.clamp(progress / 0.65, 0, 1));
    const lateral = ease(THREE.MathUtils.clamp((progress - 0.25) / 0.75, 0, 1));
    shell.position
      .copy(closed)
      .add(
        new THREE.Vector3(
          destination.x * lateral,
          destination.y * vertical,
          destination.z * lateral,
        ),
      );
    group.updateMatrixWorld(true);
  };
  const closedBounds = bounds();
  progress = 1;
  position();
  const openBounds = bounds();
  progress = 0;
  position();
  const sweptBounds = {
    min: closedBounds.min.map((n, i) => Math.min(n, openBounds.min[i])),
    max: closedBounds.max.map((n, i) => Math.max(n, openBounds.max[i])),
  };
  function update(now) {
    if (!moving) return false;
    const time = THREE.MathUtils.clamp((now - started) / 1250, 0, 1);
    progress = THREE.MathUtils.lerp(from, target, ease(time));
    moving = time < 1;
    position();
    return true;
  }
  return {
    sweptBounds,
    bounds,
    setOpen(open, { immediate = false, now = performance.now() } = {}) {
      update(now);
      target = open ? 1 : 0;
      from = progress;
      started = now;
      moving = !immediate && from !== target;
      if (immediate) {
        progress = target;
        position();
      }
    },
    update,
    get inspection() {
      return {
        open: target === 1,
        progress,
        moving,
        offset: shell.position.toArray(),
      };
    },
  };
}
