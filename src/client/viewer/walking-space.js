/** Collision against architectural/furniture footprints, in metres. */
export function canStandAt({ bounds, obstacles }, x, z, radius = 0.22) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (
    x - radius < bounds[0] ||
    x + radius > bounds[1] ||
    z - radius < bounds[2] ||
    z + radius > bounds[3]
  )
    return false;
  return !obstacles.some(([left, right, back, front]) => {
    const nearX = Math.max(left, Math.min(right, x));
    const nearZ = Math.max(back, Math.min(front, z));
    return (x - nearX) ** 2 + (z - nearZ) ** 2 < radius ** 2;
  });
}

export function moveInWalkingSpace(space, position, dx, dz) {
  if (!Number.isFinite(dx) || !Number.isFinite(dz))
    throw new RangeError("Walking displacement must be finite.");
  // Substeps prevent tunneling even after a stalled frame; axis sliding follows walls.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
  for (let i = 0; i < steps; i++) {
    if (canStandAt(space, position.x + dx / steps, position.z))
      position.x += dx / steps;
    if (canStandAt(space, position.x, position.z + dz / steps))
      position.z += dz / steps;
  }
}

export function hasClearSightline(walls, from, to) {
  return !walls.some(([left, right, back, front]) => {
    let near = 0,
      far = 1;
    for (const [start, delta, low, high] of [
      [from.x, to.x - from.x, left, right],
      [from.z, to.z - from.z, back, front],
    ]) {
      if (Math.abs(delta) < 1e-8) {
        if (start < low || start > high) return false;
      } else {
        const a = (low - start) / delta,
          b = (high - start) / delta;
        near = Math.max(near, Math.min(a, b));
        far = Math.min(far, Math.max(a, b));
        if (near > far) return false;
      }
    }
    return far > 0.001 && near < 0.999;
  });
}
