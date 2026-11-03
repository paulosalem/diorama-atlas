export const douroMiniature = Object.freeze({
  id: "douro-miniature",
  sceneId: "douro-vineyard",
  title: "Douro, in miniature",
  defaultView: "whole",
  assetRoot: "/public/dioramas/douro-miniature/",
  model: "douro-miniature.glb",
  miniature: true,
  outdoor: true,
  backdrop: "#c2cfbf",
  farClip: 300,
  fogDensity: 0,
  fogColor: [0.68, 0.77, 0.84],
  sunPosition: [-24, 35, -16],
  sunTarget: [0, -3, -8],
  shadowDistance: 100,
  minimumAnimations: 2,
  planarReflections: 1,
});

export function resolveSceneVersion(definition, requested) {
  const versions = definition.versions ?? [];
  if (!versions.length) {
    if (requested)
      throw new Error("This experience is not available for this place.");
    return null;
  }
  const version = versions.find(
    ({ id }) => id === (requested ?? versions[0].id),
  );
  if (!version)
    throw new Error("This experience is not available for this place.");
  return version;
}

export function sceneVersionUrl(url, id) {
  const next = new URL(url);
  next.searchParams.set("version", id);
  next.searchParams.delete("view");
  return next;
}
