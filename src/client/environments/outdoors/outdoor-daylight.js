import * as THREE from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";

export async function loadOutdoorDaylight(generator) {
  const texture = await new HDRLoader().loadAsync(
    "/public/outdoors/detail-assets/daylight-pure-sky_2k.hdr",
  );
  texture.mapping = THREE.EquirectangularReflectionMapping;
  const { data, width, height } = texture.image;
  const value =
    texture.type === THREE.HalfFloatType
      ? THREE.DataUtils.fromHalfFloat
      : (number) => number;
  let brightest = -Infinity,
    sunX = 0,
    sunY = 0;
  for (let y = 0; y < height / 2; y += 2)
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const luminance =
        value(data[i]) * 0.2126 +
        value(data[i + 1]) * 0.7152 +
        value(data[i + 2]) * 0.0722;
      if (luminance > brightest) {
        brightest = luminance;
        sunX = x;
        sunY = y;
      }
    }
  if (!Number.isFinite(brightest) || brightest <= 0) {
    texture.dispose();
    throw new Error("The photographic sky has no usable daylight signal.");
  }
  try {
    return {
      texture,
      environment: generator.fromEquirectangular(texture),
      // AgX calibration for this HDRI; the scene's own exposure remains an adjustment.
      exposureGain: 1.55,
      sunAzimuth: ((sunX + 0.5) / width - 0.5) * Math.PI * 2,
      sunElevation: (0.5 - (sunY + 0.5) / height) * Math.PI,
    };
  } catch (error) {
    texture.dispose();
    throw error;
  }
}

export function applyOutdoorDaylight(scene, runtime, daylight) {
  const sun = runtime.sun;
  const direction = sun.position.clone().sub(sun.target.position);
  const azimuth = Math.atan2(direction.z, direction.x);
  const distance = Math.max(20, direction.length());
  scene.background = daylight.texture;
  scene.backgroundIntensity = 1;
  scene.backgroundRotation.y = daylight.sunAzimuth - azimuth;
  scene.environmentRotation.copy(scene.backgroundRotation);
  sun.position
    .copy(sun.target.position)
    .add(
      new THREE.Vector3(
        Math.cos(azimuth) * Math.cos(daylight.sunElevation),
        Math.sin(daylight.sunElevation),
        Math.sin(azimuth) * Math.cos(daylight.sunElevation),
      ).multiplyScalar(distance),
    );
  sun.shadow.needsUpdate = true;
}
