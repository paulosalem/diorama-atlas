import * as THREE from "three";
// Architectural silhouettes for the globe. Full environments load only on entry.
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
  if (type === "fale") {
    const metal = new THREE.MeshStandardMaterial({
      color: 0x7d9392,
      roughness: 0.65,
      metalness: 0.25,
    });
    add(
      new THREE.CylinderGeometry(0.52, 0.52, 0.07, 32),
      cream,
      [0, 0.08, 0],
    ).scale.set(1.3, 1, 0.8);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      add(new THREE.CylinderGeometry(0.017, 0.02, 0.38, 8), wood, [
        Math.cos(a) * 0.59,
        0.3,
        Math.sin(a) * 0.35,
      ]);
    }
    const canopy = add(
      new THREE.SphereGeometry(0.6, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      metal,
      [0, 0.49, 0],
    );
    canopy.scale.set(1.2, 0.65, 0.75);
    metal.side = THREE.DoubleSide;
    box([0.24, 0.04, 0.16], [0, 0.07, 0.46]);
    add(
      new THREE.CylinderGeometry(0.018, 0.028, 0.9, 8),
      wood,
      [-0.55, 0.49, -0.42],
    );
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const frond = add(
        new THREE.SphereGeometry(0.22, 8, 6),
        green,
        [-0.55 + Math.cos(a) * 0.14, 0.95, -0.42 + Math.sin(a) * 0.14],
        [0, Math.PI / 2 - a, 0],
      );
      frond.scale.set(0.3, 0.08, 1.15);
    }
  } else if (type === "sauna") {
    box([1.2, 0.025, 0.55], [0, 0.06, 0.38], water);
    box([0.75, 0.37, 0.64], [-0.08, 0.25, -0.15], wood);
    for (const sign of [-1, 1])
      add(
        new THREE.BoxGeometry(0.48, 0.035, 0.78),
        roof,
        [-0.08 + sign * 0.205, 0.5, -0.15],
        [0, 0, -sign * 0.42],
      );
    box([0.075, 0.28, 0.075], [-0.24, 0.66, -0.2], cream);
    box([0.2, 0.03, 0.5], [0.2, 0.09, 0.46], wood);
    tree(-0.57, -0.3, 0.7);
    tree(0.5, -0.3, 0.65);
  } else if (type === "ger") {
    add(new THREE.CylinderGeometry(0.58, 0.58, 0.37, 48), cream, [0, 0.23, 0]);
    add(new THREE.CylinderGeometry(0.12, 0.61, 0.25, 48), cream, [0, 0.54, 0]);
    add(
      new THREE.TorusGeometry(0.585, 0.009, 6, 48),
      wood,
      [0, 0.3, 0],
      [Math.PI / 2, 0, 0],
    );
    box([0.19, 0.3, 0.04], [0, 0.21, 0.58], roof);
    add(
      new THREE.CylinderGeometry(0.015, 0.015, 0.2, 12),
      wood,
      [0, 0.69, 0.03],
    );
  } else if (type === "domus") {
    box([1.12, 0.04, 1.3], [0, 0.075, 0]);
    for (const x of [-0.47, 0.47]) {
      box([0.18, 0.32, 1.3], [x, 0.25, 0]);
      box([0.26, 0.05, 1.36], [x, 0.435, 0], roof);
    }
    for (const z of [-0.56, 0, 0.56]) {
      box([0.78, 0.28, 0.14], [0, 0.23, z]);
      box([0.8, 0.05, 0.22], [0, 0.405, z], roof);
    }
    box([0.27, 0.02, 0.3], [0, 0.11, 0.3], water);
    box([0.48, 0.02, 0.32], [0, 0.11, -0.3], green);
    for (const x of [-0.3, 0.3])
      for (const z of [-0.44, -0.18])
        add(new THREE.CylinderGeometry(0.022, 0.028, 0.25, 12), cream, [
          x,
          0.24,
          z,
        ]);
  } else if (type === "vineyard") {
    for (let row = 0; row < 4; row++) {
      box([1.2, 0.13, 0.23], [0, 0.12 + row * 0.12, 0.48 - row * 0.28], cream);
      for (let x = -0.47; x < 0.5; x += 0.18)
        box(
          [0.12, 0.11, 0.1],
          [x, 0.23 + row * 0.12, 0.46 - row * 0.28],
          green,
        );
    }
    box([0.36, 0.29, 0.27], [-0.28, 0.67, -0.34], cream);
    add(
      new THREE.ConeGeometry(0.3, 0.15, 4),
      roof,
      [-0.28, 0.88, -0.34],
      [0, Math.PI / 4, 0],
    );
  } else if (type === "terraces") {
    for (let i = 0; i < 5; i++) {
      const r = 0.75 - i * 0.105;
      const field = add(
        new THREE.CylinderGeometry(
          r,
          r + 0.035,
          0.13,
          40,
          1,
          false,
          0,
          Math.PI * 1.65,
        ),
        green,
        [0, 0.12 + i * 0.12, 0],
      );
      field.rotation.y = -0.45;
    }
    tree(-0.52, -0.38, 0.8);
  } else if (type === "boatyard" || type === "bridge") {
    box([1.2, 0.015, 0.64], [0, 0.055, 0.23], water);
    box(
      [0.85, 0.4, 0.42],
      [-0.08, 0.25, -0.27],
      type === "boatyard" ? wood : cream,
    );
    add(
      new THREE.ConeGeometry(0.61, 0.3, 4),
      roof,
      [-0.08, 0.59, -0.27],
      [0, Math.PI / 4, 0],
    );
    if (type === "bridge") {
      const arc = add(
        new THREE.TorusGeometry(0.28, 0.08, 5, 16, Math.PI),
        cream,
        [0.32, 0.08, 0.2],
        [0, Math.PI / 2, 0],
      );
      arc.scale.z = 1.8;
    } else {
      const hull = add(
        new THREE.SphereGeometry(0.3, 16, 8),
        wood,
        [0.03, 0.105, 0.32],
      );
      hull.scale.set(1.7, 0.16, 0.28);
    }
  } else if (type === "madrasa" || type === "balcony") {
    box([1.18, 0.74, 0.28], [0, 0.42, -0.29]);
    box([0.28, 0.74, 0.93], [-0.45, 0.42, 0.1]);
    for (let i = -2; i <= 2; i++)
      for (const y of [0.28, 0.61]) {
        box(
          [0.14, 0.21, 0.035],
          [i * 0.22, y, -0.135],
          type === "madrasa" ? water : wood,
        );
        if (type === "balcony")
          box([0.2, 0.025, 0.12], [i * 0.22, y - 0.13, -0.09], water);
      }
  } else if (type === "neighborhood") {
    box([0.54, 0.58, 0.45], [0, 0.34, -0.13]);
    box([0.17, 0.18, 0.1], [0, 0.74, 0.04]);
    box([0.07, 0.11, 0.02], [0, 0.74, 0.1], wood);
    for (const x of [-0.48, 0.48]) {
      box([0.3, 0.47, 0.7], [x, 0.29, 0.08], x < 0 ? water : cream);
      add(
        new THREE.ConeGeometry(0.27, 0.17, 4),
        roof,
        [x, 0.61, 0.08],
        [0, Math.PI / 4, 0],
      );
      box([0.12, 0.18, 0.02], [x, 0.32, 0.44], wood);
    }
    box([0.16, 0.27, 0.02], [0, 0.22, 0.105], wood);
  } else if (type === "temple") {
    box([0.66, 0.43, 0.9], [0, 0.28, 0]);
    for (let i = 0; i < 3; i++)
      add(
        new THREE.ConeGeometry(0.78 - i * 0.14, 0.25, 4),
        roof,
        [0, 0.46 + i * 0.2, -i * 0.09],
        [0, Math.PI / 4, 0],
      );
  } else if (type === "terrace") {
    for (let i = 0; i < 3; i++) {
      box(
        [1.15, 0.13 + i * 0.15, 0.38],
        [0, 0.13 + i * 0.075, 0.42 - i * 0.36],
      );
      for (const x of [-0.48, 0.48])
        box([0.035, 0.24, 0.035], [x, 0.31 + i * 0.15, 0.56 - i * 0.36], water);
    }
    add(new THREE.ConeGeometry(0.34, 0.17, 12), water, [-0.2, 0.9, -0.17]);
    box([0.02, 0.5, 0.02], [-0.2, 0.61, -0.17], wood);
  } else if (type === "pottery" || type === "stone-lane") {
    for (const x of [-0.5, 0.5])
      box([0.3, 0.62, 1], [x, 0.36, 0], type === "pottery" ? roof : cream);
    if (type === "pottery")
      for (let i = 0; i < 12; i++)
        add(new THREE.SphereGeometry(0.06, 8, 6), roof, [
          -0.23 + (i % 3) * 0.17,
          0.11,
          -0.38 + Math.floor(i / 3) * 0.2,
        ]);
    else
      for (let z = -0.4; z <= 0.4; z += 0.2)
        box([0.68, 0.025, 0.17], [0, 0.07, z]);
  } else if (type === "riad") {
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
