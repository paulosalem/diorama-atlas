import * as THREE from "three";

export function timberSteps(
  k,
  { position, width, rise, run, count, material },
) {
  const group = k.sub(position);
  const side = new THREE.Shape()
    .moveTo(0, 0)
    .lineTo(count * run, 0)
    .lineTo(count * run, count * rise - 0.025);
  for (let i = count; i > 0; i--)
    side
      .lineTo((i - 1) * run, i * rise - 0.025)
      .lineTo((i - 1) * run, Math.max(0, (i - 1) * rise - 0.025));
  side.closePath();
  for (const x of [-width / 2 + 0.03, width / 2 - 0.03]) {
    const geometry = new THREE.ExtrudeGeometry(side, {
      depth: 0.035,
      bevelEnabled: false,
    });
    geometry.rotateY(Math.PI / 2);
    geometry.translate(-0.0175, 0, 0);
    k.mesh(geometry, material, [x, 0, 0], [0, 0, 0], group);
  }
  for (let i = 0; i < count; i++) {
    k.box(
      [width, 0.025, run + 0.012],
      [0, (i + 1) * rise - 0.0125, -(i + 0.5) * run],
      material,
      group,
      0.004,
    );
    k.box(
      [width - 0.06, rise - 0.025, 0.025],
      [0, i * rise + (rise - 0.025) / 2, -i * run - 0.0125],
      material,
      group,
      0.003,
    );
  }
  return group;
}
