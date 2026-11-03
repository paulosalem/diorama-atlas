import * as THREE from "three";

export function schistGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.49, -0.43);
  shape.lineTo(0.31, -0.5);
  shape.lineTo(0.5, -0.25);
  shape.lineTo(0.44, 0.38);
  shape.lineTo(-0.19, 0.49);
  shape.lineTo(-0.5, 0.25);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 1,
    steps: 1,
  });
  geometry.translate(0, 0, -0.5);
  return geometry;
}
