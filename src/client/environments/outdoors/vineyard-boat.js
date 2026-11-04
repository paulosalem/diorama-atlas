import * as THREE from "three";

export function buildVineyardBoat(k, position) {
  const boat = k.sub(position, -0.22);
  boat.name = "Douro wooden boat";
  k.animated.add(boat);
  const timber = k.ownMaterial(k.m.cedar.clone());
  timber.color.set(0x765136);
  timber.userData.metresPerRepeat = 0.6;
  const inside = k.ownMaterial(timber.clone());
  inside.color.set(0xc29d69);
  function halfWidth(t) {
    return 0.69 * Math.pow(Math.sin(Math.PI * t), 0.58);
  }
  for (const sign of [-1, 1]) {
    for (const inner of [false, true]) {
      const points = [],
        uvs = [],
        indices = [];
      for (let i = 0; i <= 36; i++) {
        const t = i / 36,
          width = halfWidth(t),
          z = (t - 0.5) * 4.5;
        for (let row = 0; row <= 5; row++) {
          const r = row / 5;
          points.push(
            sign * Math.max(0, width * (0.53 + 0.47 * r) - (inner ? 0.035 : 0)),
            -0.14 + r * 0.46 + 0.13 * Math.pow(Math.abs(2 * t - 1), 4),
            z,
          );
          uvs.push(t * 3, r);
          if (i < 36 && row < 5) {
            const a = i * 6 + row;
            const face = [a, a + 6, a + 1, a + 1, a + 6, a + 7];
            if ((sign === -1) !== inner) face.reverse();
            indices.push(...face);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(points, 3),
      );
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      k.mesh(geometry, inner ? inside : timber, [0, 0, 0], [0, 0, 0], boat);
    }
    const rim = [];
    for (let i = 0; i <= 36; i++) {
      const t = i / 36;
      rim.push([
        sign * halfWidth(t),
        0.32 + 0.13 * Math.pow(Math.abs(2 * t - 1), 4),
        (t - 0.5) * 4.5,
      ]);
    }
    k.tube(rim, 0.032, timber, boat);
  }
  for (let i = 1; i < 22; i++) {
    const t = i / 22,
      z = (t - 0.5) * 4.5;
    k.box(
      [halfWidth(t) * 1.07, 0.045, 0.19],
      [0, -0.12, z],
      inside,
      boat,
      0.004,
    );
    if (i % 3 === 0)
      k.tube(
        [
          [-halfWidth(t) + 0.05, 0.28, z],
          [-halfWidth(t) * 0.53, -0.08, z],
          [halfWidth(t) * 0.53, -0.08, z],
          [halfWidth(t) - 0.05, 0.28, z],
        ],
        0.025,
        timber,
        boat,
      );
  }
  for (const z of [-0.95, 0.65])
    k.box([1.13, 0.055, 0.26], [0, 0.24, z], inside, boat, 0.01);
  for (const sign of [-1, 1]) {
    k.rod(
      [sign * 0.3, 0.29, -1.2],
      [sign * 0.33, 0.3, 1.4],
      0.018,
      inside,
      boat,
    );
    k.box([0.13, 0.025, 0.55], [sign * 0.33, 0.3, 1.4], inside, boat, 0.015);
  }
  const rope = k.material(0xa59c79, 1);
  for (let loop = 0; loop < 5; loop++)
    k.ring(
      0.13 + loop * 0.015,
      0.008,
      [0.08, -0.082 + loop * 0.003, -0.2],
      rope,
      boat,
      [Math.PI / 2, 0, 0],
    );
  return boat;
}
