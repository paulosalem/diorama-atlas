import * as THREE from "three";

/** Keep a fixed forward-light budget; retain every fixture and its original settings. */
export function createCameraLightCulling(group, maximum) {
  if (!Number.isInteger(maximum) || maximum < 1)
    throw new RangeError("The local light budget must be a positive integer.");
  group.updateWorldMatrix(true, true);
  const sources = [];
  group.traverse((light) => {
    if (light.isPointLight && !light.castShadow)
      sources.push({
        light,
        position: light.getWorldPosition(new THREE.Vector3()),
        score: 0,
      });
  });
  const previous = new THREE.Vector3(Infinity, Infinity, Infinity);
  return (position) => {
    if (previous.distanceToSquared(position) < 0.0025) return;
    previous.copy(position);
    for (const source of sources) {
      const distance = source.position.distanceTo(position);
      // A visible lamp must still illuminate its table when the visitor is outside its radius.
      source.score = source.light.intensity / Math.max(1, distance ** 2);
    }
    sources.sort((a, b) => b.score - a.score);
    for (let i = 0; i < sources.length; i++)
      sources[i].light.visible = i < maximum;
  };
}
