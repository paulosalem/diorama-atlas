import * as THREE from "three";

export function buildVineyardCrate(
  k,
  vines,
  material,
  position,
  { parent = k.group, filled = false, angle = 0 } = {},
) {
  const c = k.sub(position, angle, parent);
  k.box([0.63, 0.035, 0.42], [0, 0.024, 0], material, c, 0.003);
  for (const x of [-0.3, 0.3])
    for (const z of [-0.195, 0.195])
      k.box([0.035, 0.3, 0.035], [x, 0.17, z], material, c, 0.003);
  for (let row = 0; row < 3; row++) {
    for (const z of [-0.208, 0.208])
      k.box(
        [0.63, 0.06, 0.023],
        [0, 0.07 + row * 0.083, z],
        material,
        c,
        0.002,
      );
    for (const x of [-0.31, 0.31])
      k.box(
        [0.022, 0.06, 0.39],
        [x, 0.07 + row * 0.083, 0],
        material,
        c,
        0.002,
      );
  }
  if (filled) {
    c.updateWorldMatrix(true, false);
    for (let i = 0; i < 10; i++) {
      const point = c.localToWorld(
        new THREE.Vector3(k.range(-0.22, 0.22), 0.25, k.range(-0.13, 0.13)),
      );
      vines.bunch(point.toArray(), 0.9);
    }
  }
  return c;
}
