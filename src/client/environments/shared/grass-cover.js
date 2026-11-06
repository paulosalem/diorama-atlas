import * as THREE from "three";

export function grassCover(k, { positions, color = 0x71834d }) {
  const vertices = [],
    uv = [],
    indices = [];
  for (let blade = 0; blade < 5; blade++) {
    const a = blade * 2.399;
    for (let row = 0; row <= 4; row++) {
      const t = row / 4;
      for (const side of [-1, 1]) {
        const x = side * 0.008 * (1 - t) + t * t * 0.035;
        vertices.push(
          Math.cos(a) * x,
          t * (0.055 + blade * 0.008),
          Math.sin(a) * x,
        );
        uv.push(0.5, t * 0.5);
      }
      if (row < 4) {
        const p = blade * 10 + row * 2;
        indices.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
      }
    }
  }
  const geometry = k.ownGeometry(new THREE.BufferGeometry());
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = k.material(color, 0.95);
  material.side = THREE.DoubleSide;
  material.userData.patinaProfile = "none";
  material.userData.nativeWind = { anchor: [0.5, 0] };
  const grass = new THREE.InstancedMesh(geometry, material, positions.length);
  const transform = new THREE.Object3D();
  positions.forEach((position, i) => {
    transform.position.fromArray(position);
    transform.rotation.y = i * 2.399;
    transform.scale.setScalar(0.65 + ((i * 73) % 101) / 140);
    transform.updateMatrix();
    grass.setMatrixAt(i, transform.matrix);
    grass.setColorAt(
      i,
      new THREE.Color().setHSL(
        0.2 + (i % 7) * 0.006,
        0.25,
        0.58 + (i % 9) * 0.028,
      ),
    );
  });
  grass.receiveShadow = true;
  grass.name = "Rooted short grass";
  grass.computeBoundingSphere();
  k.group.add(grass);
  return grass;
}
