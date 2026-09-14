export function createNarrationTriggers(
  views,
  { radius = 1.1, gazeCosine = 0.94, dwellMs = 1100 } = {},
) {
  let current = null;
  let candidate = null;
  let enteredAt = 0;
  const targets = Object.entries(views).map(([key, view]) => ({
    key,
    position: view.position,
    target: view.target,
  }));
  return {
    select(key) {
      current = key;
      candidate = null;
    },
    update(position, direction, now) {
      let closest = null;
      let closestDistance = Infinity;
      for (const view of targets) {
        const distance = Math.hypot(
          ...position.map((value, i) => value - view.position[i]),
        );
        if (distance > radius || distance >= closestDistance) continue;
        const toward = view.target.map((value, i) => value - position[i]);
        const length = Math.hypot(...toward);
        const alignment =
          toward.reduce((sum, value, i) => sum + value * direction[i], 0) /
          length;
        if (!Number.isFinite(alignment) || alignment < gazeCosine) continue;
        closest = view.key;
        closestDistance = distance;
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
