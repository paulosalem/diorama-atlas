import * as THREE from "three";
// Architectural silhouettes for the globe. Actual interiors load only on entry.
export function createMiniature(type) {
  const group = new THREE.Group();
  const cream = new THREE.MeshStandardMaterial({
    color: 0xeadcbb,
    roughness: 0.85,
  });
  const roof = new THREE.MeshStandardMaterial({
    color: 0x994f35,
    roughness: 0.9,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: 0x4b3429,
    roughness: 0.85,
  });
  const green = new THREE.MeshStandardMaterial({
    color: 0x456341,
    roughness: 0.9,
  });
  const water = new THREE.MeshStandardMaterial({
    color: 0x3d9fa3,
    roughness: 0.22,
    metalness: 0.35,
  });
  const glow = new THREE.MeshStandardMaterial({
    color: 0xffdc96,
    emissive: 0xffba55,
    emissiveIntensity: 0.4,
  });
  function add(geo, mat, pos, rotation = [0, 0, 0]) {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(...pos);
    o.rotation.set(...rotation);
    group.add(o);
    return o;
  }
  const box = (size, pos, mat = cream) =>
    add(new THREE.BoxGeometry(...size), mat, pos);
  const tree = (x, z, h = 0.7) => {
    add(new THREE.CylinderGeometry(0.024, 0.04, h, 7), wood, [x, h / 2, z]);
    add(new THREE.IcosahedronGeometry(0.23, 1), green, [x, h, z]);
  };
  add(
    new THREE.CylinderGeometry(0.84, 0.78, 0.07, 48),
    new THREE.MeshStandardMaterial({ color: 0xcfb989, roughness: 0.75 }),
    [0, 0.01, 0],
  );
  if (type === "riad") {
    for (const x of [-0.5, 0.5]) box([0.2, 0.45, 1.1], [x, 0.27, 0]);
    for (const z of [-0.5, 0.5]) box([1.2, 0.45, 0.2], [0, 0.27, z]);
    for (const x of [-0.38, 0.38])
      for (const z of [-0.32, 0, 0.32])
        add(new THREE.CylinderGeometry(0.027, 0.036, 0.43, 8), cream, [
          x,
          0.24,
          z,
        ]);
    add(new THREE.CylinderGeometry(0.19, 0.21, 0.08, 16), cream, [0, 0.11, 0]);
    add(
      new THREE.CircleGeometry(0.17, 24),
      water,
      [0, 0.155, 0],
      [-Math.PI / 2, 0, 0],
    );
    tree(-0.58, 0.58, 0.5);
    tree(0.58, -0.58, 0.6);
  } else if (type === "tropical") {
    box([0.9, 0.45, 0.6], [0.05, 0.29, -0.12]);
    for (const x of [-0.54, -0.22, 0.12, 0.46])
      box([0.045, 0.52, 0.045], [x, 0.28, 0.34], wood);
    add(
      new THREE.ConeGeometry(0.86, 0.36, 4),
      roof,
      [0, 0.72, 0],
      [0, Math.PI / 4, 0],
    );
    for (const x of [-0.62, 0.65]) {
      add(new THREE.CylinderGeometry(0.018, 0.035, 0.95, 8), wood, [
        x,
        0.48,
        0.2,
      ]);
      for (let i = 0; i < 6; i++) {
        const leaf = add(new THREE.SphereGeometry(0.16, 8, 5), green, [
          x + Math.cos(i) * 0.15,
          1.02,
          0.2 + Math.sin(i) * 0.15,
        ]);
        leaf.scale.set(1.6, 0.15, 0.6);
        leaf.rotation.y = -i;
      }
    }
  } else {
    const japan = type === "japanese",
      tall = type === "bookshop";
    box([0.92, tall ? 0.93 : 0.55, 0.66], [0, tall ? 0.51 : 0.33, 0]);
    box([0.96, 0.08, 0.72], [0, 0.12, 0], wood);
    for (const x of [-0.3, 0, 0.3]) {
      box([0.18, 0.24, 0.012], [x, 0.32, 0.34], glow);
      box([0.02, 0.28, 0.03], [x, 0.32, 0.36], wood);
    }
    if (tall)
      for (const x of [-0.3, 0, 0.3])
        box([0.17, 0.24, 0.018], [x, 0.76, 0.34], glow);
    const roofY = tall ? 1.07 : 0.7;
    const g = new THREE.BufferGeometry();
    const w = japan ? 0.66 : 0.56,
      d = 0.45;
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          -w,
          0,
          -d,
          w,
          0,
          -d,
          0,
          0.35,
          -d,
          -w,
          0,
          d,
          0,
          0.35,
          d,
          w,
          0,
          d,
          -w,
          0,
          -d,
          0,
          0.35,
          -d,
          -w,
          0,
          d,
          -w,
          0,
          d,
          0,
          0.35,
          -d,
          0,
          0.35,
          d,
          w,
          0,
          -d,
          w,
          0,
          d,
          0,
          0.35,
          -d,
          w,
          0,
          d,
          0,
          0.35,
          d,
          0,
          0.35,
          -d,
        ],
        3,
      ),
    );
    g.computeVertexNormals();
    add(g, japan ? wood : roof, [0, roofY, 0]);
    if (japan) {
      for (const z of [-0.42, 0.42])
        box([1.35, 0.045, 0.05], [0, roofY, z], wood);
      box(
        [0.52, 0.12, 0.07],
        [0, 0.5, 0.4],
        new THREE.MeshStandardMaterial({ color: 0x304b58 }),
      );
    } else {
      box([0.48, 0.08, 0.23], [0, 0.57, 0.47], roof);
      box([0.12, 0.29, 0.13], [0.32, roofY + 0.15, -0.13], cream);
    }
    tree(-0.62, -0.2, tall ? 0.68 : 0.7);
    box([0.2, 0.16, 0.15], [0.61, 0.14, 0.35], wood);
  }
  group.scale.setScalar(0.105);
  return group;
}
