import * as THREE from "three";
import { createEnvironmentKit } from "../shared/environment-kit.js";
import { createRecordedSoundscape } from "../shared/recorded-soundscape.js";
import { SOUNDSCAPES } from "../shared/soundscape-profiles.js";
import { createFoliageWind } from "../outdoors/foliage-wind.js";
import { saunaViews } from "../../catalog/sauna-catalog.js";
import { saunaMaterials } from "./sauna-materials.js";
import { mapTimberSurfaces } from "../shared/timber-uv.js";
import { addSteamPlume } from "../shared/atmospheric-particles.js";
import { createModelGrove } from "../shared/model-grove.js";
import { buildSaunaArchitecture } from "./sauna-architecture.js";
import { furnishSauna } from "./sauna-furnishings.js";
import { buildSaunaLandscape } from "./sauna-landscape.js";

export function buildSaunaEnvironment(
  definition,
  renderer,
  { miniature = false, study } = {},
) {
  const k = createEnvironmentKit(renderer, 8195, { miniature });
  const m = saunaMaterials(k);
  const { water, forest } = buildSaunaLandscape(k, m, miniature);
  const { roof } = buildSaunaArchitecture(k, m);
  furnishSauna(k, m, roof);
  addSteamPlume(k, {
    position: [-2.05, 1.45, 0.35],
    width: 0.22,
    height: 0.68,
    count: 16,
  });
  mapTimberSurfaces(k.group, [...m.wood, ...m.outside]);
  k.group.add(new THREE.HemisphereLight(0xd2dfe8, 0x827661, 0.5));
  const sun = new THREE.DirectionalLight(0xffefd3, 3.4);
  sun.position.set(-7, 9, 14);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -12,
    right: 12,
    top: 12,
    bottom: -12,
    near: 0.1,
    far: 50,
  });
  sun.shadow.normalBias = 0.008;
  sun.shadow.bias = -0.0001;
  k.group.add(sun, sun.target);
  const window = new THREE.RectAreaLight(0xe4eff1, 2.6, 1.1, 0.6);
  window.position.set(-1.1, 1.8, 1.35);
  window.lookAt(-1.1, 1.2, -1.5);
  k.group.add(window);
  const door = new THREE.RectAreaLight(0xffe6c6, 2.4, 0.85, 1.8);
  door.position.set(1.9, 1.3, 1.35);
  door.lookAt(1.9, 1.1, -2);
  k.group.add(door);
  const runtime = k.finish(
    definition,
    miniature
      ? {
          whole: study.whole,
          ...saunaViews,
          passage: { ...saunaViews.passage, shellOpen: false },
          shore: { ...saunaViews.shore, shellOpen: false },
        }
      : saunaViews,
    {},
    {
      environmentIntensity: 0.25,
      exposure: 1.08,
      fog: miniature ? undefined : { color: 0xc6d8df, density: 0.004 },
      soundscape: createRecordedSoundscape(
        SOUNDSCAPES["finnish-lakeside-sauna"],
      ),
      depthProbes: [
        {
          id: "sauna-changing-door",
          origin: [0.2, 1.3, 0.5],
          direction: [1, 0, 0],
          minDistance: 1.8,
        },
        {
          id: "sauna-porch-door",
          origin: [1.9, 1.3, 0.8],
          direction: [0, 0, 1],
          minDistance: 6,
        },
      ],
    },
  );
  runtime.group.add(water);
  const grove = miniature
    ? null
    : createModelGrove(renderer, {
        url: "/public/sauna/forest/model.gltf",
        plantings: forest,
      });
  if (grove) {
    runtime.group.add(grove.group);
    runtime.ready = Promise.all([runtime.ready, grove.ready]);
  }
  runtime.background = 0xc6d8df;
  runtime.sun = sun;
  runtime.motions = [];
  const wind = miniature ? null : createFoliageWind(runtime.group);
  if (wind) k.animations.push((_, time) => wind.update(time));
  const dispose = runtime.dispose;
  let disposed = false;
  runtime.dispose = () => {
    if (disposed) return;
    disposed = true;
    wind?.dispose();
    grove?.dispose();
    if (water.isReflector) {
      water.geometry.dispose();
      water.dispose();
    }
    dispose();
  };
  return runtime;
}
