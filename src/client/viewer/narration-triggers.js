export function createNarrationTriggers(
  views,
  {
    radius = 1.1,
    gazeCosine = 0.94,
    dwellMs = 1100,
    zoomGazeCosine = 0.99,
    zoomFootprintRatio = 0.85,
  } = {},
) {
  let current = null;
  let candidate = null;
  let enteredAt = 0;
  const targets = Object.entries(views).map(([key, view]) => ({
    key,
    position: view.position,
    target: view.target,
    fov: view.fov ?? 61,
  }));
  return {
    select(key) {
      current = key;
      candidate = null;
    },
    update(position, direction, now, fov) {
      let closest = null;
      let closestDistance = Infinity;
      let bestAlignment = -1;
      for (const view of targets) {
        const distance = Math.hypot(
          ...position.map((value, i) => value - view.position[i]),
        );
        const toward = view.target.map((value, i) => value - position[i]);
        const length = Math.hypot(...toward);
        const alignment =
          toward.reduce((sum, value, i) => sum + value * direction[i], 0) /
          length;
        const referenceDistance = Math.hypot(
          ...view.target.map((value, i) => value - view.position[i]),
        );
        const zoomedClose =
          Number.isFinite(fov) &&
          fov <= 45 &&
          Math.abs(position[1] - view.position[1]) <= radius &&
          length * Math.tan((fov * Math.PI) / 360) <=
            referenceDistance *
              Math.tan((view.fov * Math.PI) / 360) *
              zoomFootprintRatio;
        const nearby = distance <= radius;
        if (!nearby && !zoomedClose) continue;
        if (
          !Number.isFinite(alignment) ||
          alignment < (nearby ? gazeCosine : zoomGazeCosine) ||
          alignment < bestAlignment ||
          (alignment === bestAlignment && distance >= closestDistance)
        )
          continue;
        closest = view.key;
        closestDistance = distance;
        bestAlignment = alignment;
      }
      if (closest === null || closest === current) {
        candidate = null;
        return null;
      }
      if (candidate !== closest) {
        candidate = closest;
        enteredAt = now;
        return null;
      }
      if (now - enteredAt < dwellMs) return null;
      current = closest;
      candidate = null;
      return current;
    },
  };
}
