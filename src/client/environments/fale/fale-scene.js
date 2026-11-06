import * as THREE from "three";
import { createEnvironmentKit } from "../shared/environment-kit.js";
import { createRecordedSoundscape } from "../shared/recorded-soundscape.js";
import { SOUNDSCAPES } from "../shared/soundscape-profiles.js";
import { mapTimberSurfaces } from "../shared/timber-uv.js";
import { createFoliageWind } from "../outdoors/foliage-wind.js";
import { addSteamPlume } from "../shared/atmospheric-particles.js";
import { faleViews } from "../../catalog/fale-catalog.js";
import { faleMaterials } from "./fale-materials.js";
import { buildFaleArchitecture } from "./fale-architecture.js";
import { furnishFale } from "./fale-furnishings.js";
import { buildFaleLandscape } from "./fale-landscape.js";

export function buildFaleEnvironment(
  definition,
  renderer,
  { miniature = false, study } = {},
) {
  const k = createEnvironmentKit(renderer, 82746, { miniature });
  const m = faleMaterials(k);
  buildFaleLandscape(k, m, miniature);
  const architecture = buildFaleArchitecture(k, m);
  furnishFale(k, m, architecture);
  addSteamPlume(k, {
    position: [6.25, 0.4, -6.5],
    width: 0.35,
    height: 0.48,
    count: 8,
  });
  mapTimberSurfaces(k.group, m.wood);
  const sun = new THREE.DirectionalLight(0xffefd5, 3.4);
  sun.position.set(-11, 17, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -17,
    right: 17,
    top: 17,
    bottom: -17,
    near: 0.1,
    far: 60,
  });
  sun.shadow.normalBias = 0.008;
  sun.shadow.bias = -0.0001;
  k.group.add(
    sun,
    sun.target,
    new THREE.HemisphereLight(0xdce9e9, 0x92967a, 0.65),
  );
  const bounce = new THREE.RectAreaLight(0xe4e9dc, 2.8, 5, 2.2);
  bounce.position.set(0, 1.6, 2.9);
  bounce.lookAt(0, 2, -2);
  k.group.add(bounce);
  const runtime = k.finish(
    definition,
    miniature
      ? {
          whole: study.whole,
          ...faleViews,
          joinery: { ...faleViews.joinery, shellOpen: false },
          grounds: { ...faleViews.grounds, shellOpen: false },
        }
      : faleViews,
    {},
    {
      environmentIntensity: 0.4,
      exposure: 1.08,
      fog: miniature ? undefined : { color: 0xcddfdd, density: 0.008 },
      soundscape: createRecordedSoundscape(SOUNDSCAPES["samoan-fale"]),
      depthProbes: [
        {
          id: "fale-front-open",
          origin: [0, 1.5, 2.7],
          direction: [0, 0, -1],
          minDistance: 5.2,
        },
        {
          id: "fale-private-door",
          origin: [-2.7, 1.3, -7.3],
          direction: [0, 0, -1],
          minDistance: 3.5,
        },
      ],
    },
  );
  runtime.sun = sun;
  runtime.motions = [];
  runtime.background = 0xcddfdd;
  const wind = miniature ? null : createFoliageWind(runtime.group);
  if (wind) k.animations.push((_, time) => wind.update(time));
  const dispose = runtime.dispose;
  let disposed = false;
  runtime.dispose = () => {
    if (disposed) return;
    disposed = true;
    wind?.dispose();
    dispose();
  };
  return runtime;
}
