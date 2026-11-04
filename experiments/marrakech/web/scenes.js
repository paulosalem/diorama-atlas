import { douroMiniature } from "../../../src/client/catalog/scene-versions.js";

export const studies = {
  marrakech: {
    id: "marrakech",
    sceneId: "riad",
    title: "Marrakech",
    subject: "courtyard",
    defaultView: "courtyard",
    assetRoot: "/lab/assets/",
    model: "marrakech.glb",
    unityRoot: "/lab/unity/",
    outdoor: false,
    farClip: 120,
    fogDensity: 0.006,
    fogColor: [0.72, 0.65, 0.53],
    sunPosition: [-3, 13, 8],
    sunTarget: [0, 0, -2],
    sunRotation: [52, -17, 0],
    shadowDistance: 35,
    probePosition: [0, 1.05, -0.35],
    probeSize: [14, 15, 22],
    probeFar: 60,
    steamPosition: [-3.12, 0.59, 0.18],
    minimumAnimations: 3,
    planarReflections: 2,
  },
  douro: {
    id: "douro",
    sceneId: "douro-vineyard",
    title: "Douro Valley",
    subject: "vineyard",
    defaultView: "arrival",
    assetRoot: "/lab/assets/douro/",
    model: "douro.glb",
    unityRoot: "/lab/unity/douro/",
    outdoor: true,
    farClip: 2400,
    fogDensity: 0.00065,
    fogColor: [0.68, 0.77, 0.84],
    sunPosition: [-18, 21, 13],
    sunTarget: [0, 0, 0],
    sunRotation: [52, -48, 0],
    shadowDistance: 100,
    probePosition: [0, -26.5, -166],
    probeSize: [1500, 300, 1000],
    probeFar: 2000,
    steamPosition: null,
    minimumAnimations: 2,
    planarReflections: 1,
  },
};

export const miniatureStudy = {
  ...douroMiniature,
  assetRoot: "/lab/assets/douro-miniature/",
  model: "douro-miniature.glb",
};

export function getStudy(id = "marrakech") {
  if (id === miniatureStudy.id) return miniatureStudy;
  if (!Object.hasOwn(studies, id)) throw new Error(`Unknown study: ${id}`);
  return studies[id];
}
