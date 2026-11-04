import { landscapeSections } from "./miniature-compositions.js";

export const douroMiniature = Object.freeze({
  id: "douro-miniature",
  sceneId: "douro-vineyard",
  title: "Douro, in miniature",
  defaultView: "whole",
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
  floorY: -10.6,
  bounce: { position: [-7.5, 2.2, -0.8], intensity: 4, distance: 5 },
});

export const interiorVersions = Object.freeze([
  {
    id: "interior",
    label: "Interior",
    description: "Step inside",
    experience: "interior",
  },
  {
    id: "miniature",
    label: "Miniature",
    description: "Turn a little world in your hands",
    experience: "miniature",
  },
]);

export const landscapeVersions = Object.freeze([
  {
    id: "landscape",
    label: "Landscape",
    description: "Step into the landscape",
    experience: "landscape",
  },
  {
    id: "miniature",
    label: "Miniature",
    description: "Turn a little world in your hands",
    experience: "miniature",
  },
]);

const miniatureStudies = {
  "douro-vineyard": douroMiniature,
  textile: {
    id: "textile-miniature",
    sceneId: "textile",
    defaultView: "whole",
    farClip: 180,
    sunPosition: [-22, 34, 18],
    sunTarget: [0, 0, -2],
    sunIntensity: 2.8,
    environmentIntensity: 0.4,
    exposure: 1.2,
    floorY: -2.9,
    planarReflections: 0,
    openOffset: [13, 7, -1.5],
    whole: {
      label: "The whole piece",
      position: [22, 21, 28],
      target: [-1, 1, -2],
      fov: 40,
      orbit: true,
      overview: true,
      adaptiveBounds: true,
    },
  },
  "balinese-subak-terraces": {
    id: "subak-miniature",
    sceneId: "balinese-subak-terraces",
    defaultView: "whole",
    farClip: 220,
    sunPosition: [-30, 42, 8],
    sunTarget: [0, -2, -5],
    sunIntensity: 2.5,
    environmentIntensity: 0.3,
    exposure: 1.1,
    floorY: -11,
    planarReflections: 6,
    whole: {
      label: "The whole piece",
      position: [40, 32, 35],
      target: [0, -1, -5],
      fov: 40,
      orbit: true,
      overview: true,
      adaptiveBounds: true,
    },
  },
};

export function getMiniatureStudy(definition) {
  const study = miniatureStudies[definition.id];
  if (study) return study;
  if (!definition.id || !definition.details?.length)
    throw new Error("A miniature needs a complete place definition.");
  const landscape = landscapeSections[definition.id];
  if (!landscape && definition.environment === "outdoor")
    throw new Error(`No authored miniature for ${definition.id}.`);
  const riad = definition.id === "riad";
  return {
    id: `${definition.id}-miniature`,
    sceneId: definition.id,
    defaultView: "whole",
    farClip: 350,
    sunPosition: [-24, 38, 24],
    sunTarget: [0, 0, -4],
    sunIntensity: riad ? 4.4 : 3,
    environmentIntensity: 0.35,
    exposure: landscape ? 1.12 : 1.2,
    floorY: landscape ? landscape.bottom - 1.5 : -3.5,
    planarReflections: 0,
    ...(landscape ? {} : { openOffset: riad ? [20, 11, -2] : [13, 7, -1.5] }),
    whole: {
      label: "The whole piece",
      position: landscape
        ? (landscape.overview ?? [30, 36, 43])
        : riad
          ? [34, 34, 38]
          : [22, 21, 28],
      target: [0, 1, -3],
      fov: 40,
      orbit: true,
      overview: true,
      adaptiveBounds: true,
    },
  };
}

export function sceneVersions(definition) {
  if (definition.versions) return definition.versions;
  if (!definition.id || !definition.details?.length) return [];
  if (definition.environment === "outdoor")
    return landscapeSections[definition.id] ? landscapeVersions : [];
  return interiorVersions;
}

export function resolveSceneVersion(definition, requested) {
  const versions = sceneVersions(definition);
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
  next.searchParams.delete("open");
  return next;
}
