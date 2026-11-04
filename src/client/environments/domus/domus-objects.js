import * as THREE from "three";

/** Roman domestic forms; dimensions are metres and vessel profiles include interiors. */
export function createDomusObjects(kit, m, architecture) {
  const { box, sub, lathe, cylinder, sphere, rod, tube, ring } = kit;
  function furniture(position, width, depth, angle = 0) {
    const group = sub(position, angle);
    const cosine = Math.abs(Math.cos(angle)),
      sine = Math.abs(Math.sin(angle));
    architecture.obstacle(
      position[0],
      position[2],
      width * cosine + depth * sine,
      width * sine + depth * cosine,
    );
    return group;
  }
  function bowl(
    position,
    radius = 0.16,
    height = 0.09,
    material = m.glazed,
    parent,
  ) {
    return lathe(
      [
        [0, 0],
        [radius * 0.5, 0],
        [radius * 0.58, 0.02],
        [radius * 0.82, height * 0.4],
        [radius, height],
        [radius - 0.012, height],
        [radius * 0.73, height * 0.4],
        [radius * 0.38, 0.025],
        [0, 0.025],
      ],
      position,
      material,
      parent,
      28,
    );
  }
  function jar(
    position,
    {
      height = 0.55,
      radius = 0.22,
      material = m.clay,
      handles = true,
      closed = false,
    } = {},
    parent,
  ) {
    const g = sub(position, 0, parent);
    lathe(
      [
        [0, 0],
        [radius * 0.5, 0],
        [radius * 0.74, height * 0.1],
        [radius, height * 0.45],
        [radius * 0.88, height * 0.7],
        [radius * 0.48, height * 0.84],
        [radius * 0.48, height * 0.98],
        [radius * 0.58, height],
        [radius * 0.42, height],
        [radius * 0.39, height * 0.84],
        [radius * 0.78, height * 0.69],
        [radius * 0.88, height * 0.45],
        [radius * 0.59, height * 0.15],
        [0, height * 0.08],
      ],
      [0, 0, 0],
      material,
      g,
    );
    if (handles)
      for (const sign of [-1, 1])
        tube(
          [
            [sign * radius * 0.48, height * 0.91, 0],
            [sign * radius * 1.15, height * 0.83, 0],
            [sign * radius * 1.25, height * 0.58, 0],
            [sign * radius * 0.95, height * 0.49, 0],
          ],
          radius * 0.085,
          material,
          g,
        );
    if (closed) cylinder(radius * 0.47, 0.045, [0, height, 0], m.wood, g);
    return g;
  }
  function amphora(position, angle = 0, closed = true, parent) {
    const g = sub(position, angle, parent);
    lathe(
      [
        [0, 0.05],
        [0.055, 0.07],
        [0.1, 0.22],
        [0.21, 0.55],
        [0.22, 0.76],
        [0.11, 0.9],
        [0.095, 1.17],
        [0.12, 1.19],
        [0.075, 1.19],
        [0.065, 0.9],
        [0.17, 0.74],
        [0.16, 0.55],
        [0, 0.15],
      ],
      [0, 0, 0],
      m.clay,
      g,
    );
    for (const sign of [-1, 1])
      tube(
        [
          [sign * 0.095, 1.12, 0],
          [sign * 0.23, 1.07, 0],
          [sign * 0.25, 0.87, 0],
          [sign * 0.19, 0.78, 0],
        ],
        0.025,
        m.clay,
        g,
      );
    ring(0.12, 0.04, [0, 0.18, 0], m.wood, g);
    for (const x of [-0.17, 0.17])
      box([0.08, 0.22, 0.34], [x, 0.11, 0], m.wood, g);
    if (closed) cylinder(0.084, 0.055, [0, 1.18, 0], m.wood, g);
    return g;
  }
  function cloth(
    position,
    width,
    depth,
    material = m.linen,
    parent,
    { drape = 0 } = {},
  ) {
    const geo = new THREE.PlaneGeometry(width, depth, 28, 22);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i);
      const edge = Math.max(0, (Math.abs(x) / width) * 2 - 0.94);
      p.setY(
        i,
        0.025 +
          0.012 * Math.sin(x * 19 + z * 3) +
          0.008 * Math.sin(z * 31) -
          (drape * edge) / 0.06,
      );
    }
    geo.computeVertexNormals();
    return kit.mesh(geo, material, position, [0, 0, 0], parent);
  }
  function table(
    position,
    width = 1.25,
    depth = 0.7,
    height = 0.76,
    material = m.wood,
    parent,
  ) {
    const g = parent
      ? sub(position, 0, parent)
      : furniture(position, width, depth);
    box([width, 0.07, depth], [0, height, 0], material, g);
    for (const x of [-width * 0.4, width * 0.4])
      for (const z of [-depth * 0.35, depth * 0.35]) {
        lathe(
          [
            [0.055, 0],
            [0.045, 0.07],
            [0.036, 0.19],
            [0.055, 0.24],
            [0.035, height * 0.7],
            [0.06, height - 0.035],
          ],
          [x, 0, z],
          material,
          g,
          16,
        );
      }
    box(
      [width * 0.85, 0.1, 0.055],
      [0, height - 0.11, -depth * 0.35],
      material,
      g,
    );
    return g;
  }
  function stool(position, parent) {
    const g = sub(position, 0, parent);
    cylinder(0.23, 0.055, [0, 0.43, 0], m.wood, g);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      rod(
        [Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18],
        [Math.cos(a) * 0.12, 0.41, Math.sin(a) * 0.12],
        0.027,
        m.wood,
        g,
      );
    }
    return g;
  }
  function couch(
    position,
    angle = 0,
    { width = 2.1, depth = 0.95, plain = false } = {},
  ) {
    const g = furniture(position, width + 0.14, depth + 0.1, angle);
    for (const x of [-width / 2, width / 2])
      for (const z of [-depth * 0.44, depth * 0.44]) {
        lathe(
          [
            [0.065, 0],
            [0.05, 0.08],
            [0.035, 0.18],
            [0.055, 0.23],
            [0.04, 0.36],
            [0.062, 0.48],
          ],
          [x, 0, z],
          m.wood,
          g,
          20,
        );
        if (!plain) ring(0.055, 0.008, [x, 0.23, z], m.bronze, g);
      }
    for (const z of [-depth / 2, depth / 2])
      box([width + 0.1, 0.12, 0.07], [0, 0.43, z], m.wood, g);
    for (const x of [-width / 2, width / 2])
      box([0.07, 0.12, depth], [x, 0.43, 0], m.wood, g);
    for (let x = -width / 2; x <= width / 2; x += 0.12)
      rod([x, 0.48, -depth / 2], [x, 0.48, depth / 2], 0.009, m.linen, g);
    kit.cushion([width - 0.04, 0.16, depth - 0.04], [0, 0.58, 0], m.linen, g);
    cloth([0, 0.675, 0], width + 0.1, depth, plain ? m.linen : m.wineCloth, g, {
      drape: 0.22,
    });
    kit.cushion(
      [0.48, 0.2, depth * 0.73],
      [-width * 0.33, 0.77, 0],
      plain ? m.linen : m.blueCloth,
      g,
      [0, 0, -0.16],
    );
    if (!plain) {
      for (const z of [-depth * 0.45, depth * 0.45])
        tube(
          [
            [-width / 2, 0.49, z],
            [-width / 2 - 0.06, 0.76, z],
            [-width / 2 + 0.1, 0.96, z],
          ],
          0.04,
          m.wood,
          g,
        );
      rod(
        [-width / 2 + 0.1, 0.96, -depth * 0.45],
        [-width / 2 + 0.1, 0.96, depth * 0.45],
        0.033,
        m.wood,
        g,
      );
    }
    return g;
  }
  function chest(position, angle = 0, open = false, width = 0.95) {
    const g = furniture(position, width, 0.55, angle);
    box([width, 0.06, 0.55], [0, 0.09, 0], m.wood, g);
    for (const x of [-width / 2, width / 2])
      box([0.045, 0.43, 0.55], [x, 0.31, 0], m.wood, g);
    for (const z of [-0.26, 0.26])
      box([width, 0.43, 0.045], [0, 0.31, z], m.wood, g);
    const lid = sub([0, 0.55, -0.28], 0, g);
    lid.rotation.x = open ? -1.1 : 0;
    box([width + 0.06, 0.055, 0.6], [0, 0, 0.29], m.wood, lid);
    for (const x of [-width * 0.32, width * 0.32]) {
      box([0.043, 0.4, 0.01], [x, 0.32, 0.29], m.iron, g);
      box([0.043, 0.01, 0.57], [x, 0.035, 0.29], m.iron, lid);
    }
    box([0.085, 0.1, 0.02], [0, 0.45, 0.3], m.bronze, g);
    if (open)
      for (let i = 0; i < 3; i++)
        kit.cushion(
          [width * 0.8, 0.07, 0.4],
          [0, 0.18 + i * 0.075, 0],
          i === 1 ? m.blueCloth : m.linen,
          g,
        );
    return g;
  }
  function lamp(position, parent, lit = false) {
    const g = sub(position, 0, parent);
    lathe(
      [
        [0, 0],
        [0.08, 0],
        [0.11, 0.025],
        [0.105, 0.055],
        [0.046, 0.08],
        [0.024, 0.08],
        [0.024, 0.047],
        [0, 0.03],
      ],
      [0, 0, 0],
      m.bronze,
      g,
      24,
    );
    const nozzle = bowl([0.115, 0.035, 0], 0.055, 0.027, m.bronze, g);
    nozzle.scale.z = 0.65;
    rod([0.14, 0.055, 0], [0.16, 0.078, 0], 0.006, m.linen, g);
    ring(0.048, 0.013, [-0.1, 0.08, 0], m.bronze, g, [
      Math.PI / 2,
      Math.PI / 2,
      0,
    ]);
    if (lit) {
      const glow = kit.material(0xffcf78, 0.8);
      glow.emissive.set(0xffb94b);
      glow.emissiveIntensity = 1.8;
      const flame = sphere(0.018, [0.16, 0.098, 0], glow, g, [0.7, 1.8, 0.6]);
      kit.animated.add(flame);
      kit.animations.push((_, time) => {
        flame.scale.y = 1.7 + Math.sin(time * 3.7) * 0.12;
      });
      const light = new THREE.PointLight(0xffbd69, 1.4, 3.5, 2);
      light.position.set(0.16, 0.15, 0);
      g.add(light);
    }
    return g;
  }
  function scroll(position, parent, unrolled = false) {
    const g = sub(position, 0, parent);
    const roll = cylinder(0.045, 0.34, [0, 0.05, 0], m.linen, g, 0.045, 24);
    roll.rotation.z = Math.PI / 2;
    for (const x of [-0.19, 0.19]) {
      const end = cylinder(0.018, 0.045, [x, 0.05, 0], m.wood, g);
      end.rotation.z = Math.PI / 2;
    }
    if (unrolled) cloth([0, 0.009, 0.18], 0.33, 0.28, m.linen, g, { drape: 0 });
    else ring(0.047, 0.004, [0, 0.05, 0], m.clay, g, [0, Math.PI / 2, 0]);
    return g;
  }
  function tablets(position, parent) {
    const g = sub(position, -0.18, parent);
    for (const x of [-0.115, 0.115]) {
      box([0.22, 0.016, 0.28], [x, 0.01, 0], m.wood, g);
      box([0.19, 0.004, 0.245], [x, 0.021, 0], m.wax, g, 0);
      for (let i = 0; i < 6; i++)
        box(
          [0.09 + (i % 3) * 0.02, 0.001, 0.002],
          [x - 0.015, 0.024, -0.085 + i * 0.03],
          m.clay,
          g,
          0,
        );
    }
    for (const z of [-0.09, 0.09])
      tube(
        [
          [-0.02, 0.025, z],
          [0, 0.05, z],
          [0.02, 0.025, z],
        ],
        0.004,
        m.linen,
        g,
      );
    rod([0.26, 0.023, -0.13], [0.2, 0.023, 0.13], 0.004, m.bronze, g);
    return g;
  }
  function bread(position, parent) {
    const g = sub(position, 0, parent);
    sphere(0.2, [0, 0.065, 0], m.bread, g, [1, 0.42, 1]);
    ring(0.195, 0.006, [0, 0.055, 0], m.clay, g);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      tube(
        [
          [0, 0.145, 0],
          [Math.cos(a) * 0.11, 0.13, Math.sin(a) * 0.11],
          [Math.cos(a) * 0.19, 0.084, Math.sin(a) * 0.19],
        ],
        0.004,
        m.clay,
        g,
      );
    }
    return g;
  }
  function fruit(position, kind, count, parent) {
    const g = sub(position, 0, parent);
    for (let i = 0; i < count; i++) {
      const a = i * 2.4,
        r = Math.sqrt(i) * (kind === "grape" ? 0.012 : 0.027);
      const p = [Math.cos(a) * r, 0.035 + (i > 5 ? 0.016 : 0), Math.sin(a) * r];
      const color =
        kind === "olive" ? m.leaf : kind === "grape" ? m.blueCloth : m.ochre;
      sphere(
        kind === "grape" ? 0.019 : 0.032,
        p,
        color,
        g,
        kind === "olive" ? [0.65, 1, 0.65] : [1, 1.1, 1],
      );
      if (kind === "fig")
        rod(
          [p[0], p[1] + 0.028, p[2]],
          [p[0] + 0.006, p[1] + 0.048, p[2]],
          0.003,
          m.wood,
          g,
        );
    }
    return g;
  }
  function basket(position, radius = 0.23, height = 0.25, parent) {
    const g = sub(position, 0, parent);
    for (let y = 0.025; y < height; y += 0.018)
      ring(radius * (0.72 + (0.28 * y) / height), 0.012, [0, y, 0], m.wood, g);
    for (let i = 0; i < 20; i++) {
      const a = (i * Math.PI) / 10;
      rod(
        [Math.cos(a) * radius * 0.72, 0.02, Math.sin(a) * radius * 0.72],
        [Math.cos(a) * radius, height, Math.sin(a) * radius],
        0.009,
        m.clay,
        g,
      );
    }
    cylinder(radius * 0.72, 0.02, [0, 0.012, 0], m.wood, g);
    return g;
  }
  function painting(position, width, height, material, angle = 0) {
    const g = sub(position, angle, architecture.walls);
    box([width + 0.1, height + 0.1, 0.016], [0, 0, 0], m.ochre, g, 0);
    kit.mesh(
      new THREE.PlaneGeometry(width, height),
      material,
      [0, 0, 0.012],
      [0, 0, 0],
      g,
    );
    return g;
  }
  function plant(position, scale = 1, parent) {
    const g = sub(position, 0, parent);
    const geo = kit.ownGeometry(new THREE.PlaneGeometry(0.075, 0.16, 2, 4));
    const vertices = geo.attributes.position;
    for (let i = 0; i < vertices.count; i++)
      vertices.setZ(i, Math.sin(vertices.getY(i) * 18) * 0.012);
    geo.computeVertexNormals();
    const leaves = new THREE.InstancedMesh(geo, kit.m.leaf, 9 * 24);
    const transform = new THREE.Object3D();
    let index = 0;
    for (let stem = 0; stem < 9; stem++) {
      const a = stem * 2.4;
      const height = scale * kit.range(0.65, 1.25);
      const x = Math.cos(a) * 0.38 * scale;
      const z = Math.sin(a) * 0.38 * scale;
      rod([0, 0, 0], [x, height, z], 0.008 * scale, m.wood, g);
      for (let j = 0; j < 24; j++) {
        const fraction = 0.25 + j / 32;
        const angle = a + j * 2.4;
        const reach = scale * 0.12 * Math.sin(fraction * Math.PI);
        transform.position.set(
          x * fraction + Math.cos(angle) * reach,
          height * fraction,
          z * fraction + Math.sin(angle) * reach,
        );
        transform.rotation.set(
          kit.range(-0.9, 0.5),
          angle,
          kit.range(-1.2, 1.2),
        );
        transform.scale.setScalar(scale * kit.range(0.65, 1.05));
        transform.updateMatrix();
        leaves.setMatrixAt(index++, transform.matrix);
      }
    }
    leaves.castShadow = leaves.receiveShadow = true;
    g.add(leaves);
    kit.animated.add(leaves);
    kit.animations.push((_, time) => {
      leaves.rotation.z = Math.sin(time * 0.43 + position[0]) * 0.005;
    });
    return g;
  }
  return {
    furniture,
    bowl,
    jar,
    amphora,
    cloth,
    table,
    stool,
    couch,
    chest,
    lamp,
    scroll,
    tablets,
    bread,
    fruit,
    basket,
    painting,
    plant,
  };
}
