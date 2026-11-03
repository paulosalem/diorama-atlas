import * as THREE from "three";
import { buildTerrainStrip } from "../shared/cutaway-terrain.js";

export function vineyardYardGrowth(x, z) {
  if (x < -15 || x > 0.4 || z < -4.5 || z > 9.5) return 0;
  if (x > -11.65 && x < -4.3 && z < 1.94) return 0;
  const doorway = THREE.MathUtils.smoothstep(Math.abs(x + 6.65), 0.72, 1.15);
  const drive = THREE.MathUtils.smoothstep(Math.abs(x + 2.8), 1.15, 1.7);
  const route = z > 1.6 ? Math.min(doorway, drive) : 1;
  const patches = [
    [-13.1, 3.7, 2.2, 3.5],
    [-11.4, 7.8, 2.7, 1.8],
    [-7.3, 8.3, 3.2, 1.3],
    [-4.7, 7.6, 1.5, 2.0],
    [-12.4, -1.4, 1.1, 3.0],
    [-4.0, -0.5, 0.5, 2.6],
  ];
  let cover = 0;
  for (const [cx, cz, rx, rz] of patches)
    cover = Math.max(
      cover,
      Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2)),
    );
  const detail =
    0.74 + 0.16 * Math.sin(x * 3.1 + z * 1.7) + 0.1 * Math.sin(z * 4.3 - x);
  return THREE.MathUtils.clamp(cover * detail * route, 0, 1);
}

export function buildVineyardYard(
  k,
  soil,
  { front, back, left = -15, right = 15 },
) {
  const ground = k.ownMaterial(soil.clone());
  ground.color.set(0xcccccc);
  ground.vertexColors = true;
  const dry = soil.color.clone().multiplyScalar(1 / ground.color.r);
  const green = new THREE.Color(0x6d9658).multiplyScalar(1 / ground.color.r);
  const color = new THREE.Color();
  for (let row = 0; row < 40; row++) {
    const boundary = (fraction) => (x) => {
      const a = front(x),
        b = back(x);
      return [
        THREE.MathUtils.lerp(a[0], b[0], fraction),
        THREE.MathUtils.lerp(a[1], b[1], fraction),
      ];
    };
    const mesh = buildTerrainStrip(
      k,
      ground,
      boundary(row / 40),
      boundary((row + 1) / 40),
      { left, right, samples: right - left > 40 ? 360 : 120 },
    );
    const positions = mesh.geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        z = positions.getZ(i);
      color
        .copy(dry)
        .lerp(
          green,
          THREE.MathUtils.smoothstep(vineyardYardGrowth(x, z), 0.08, 0.75),
        );
      if (z > 2 && z < 9 && Math.abs(x + 2.8) < 1.1) {
        const rut = Math.exp(-(((Math.abs(x + 2.8) - 0.76) / 0.11) ** 2));
        color.multiplyScalar(1 - rut * 0.13);
      }
      color.toArray(colors, i * 3);
    }
    mesh.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }
}
