import * as THREE from "three";

/** Furniture and household objects, sized in metres and assembled from real surfaces. */
export function createInteriorProps(k) {
  const {
    m,
    group,
    sub,
    box,
    lathe,
    cylinder,
    sphere,
    rod,
    tube,
    ring,
    cushion,
    mesh,
    material,
    texture,
    range,
    random,
  } = k;
  const porcelain = material(0xe8e0cd, 0.25),
    tea = material(0x392315, 0.26),
    wine = material(0x344536, 0.23, 0.15);
  const upholstery = k.textile(["#50312e", "#563632", "#573630"], [4, 4]),
    paper = m.paper;
  const bookColors = [
    0x403a2d, 0x6b3c32, 0x284443, 0x7b6447, 0x263542, 0x4b423a, 0x78654b,
    0x3d4a37,
  ].map((c) => material(c, 0.95));
  const paperLabel = texture((c, s) => {
    c.fillStyle = "#d1be98";
    c.fillRect(0, 0, s, s);
    c.fillStyle = "#514738";
    c.font = "80px Georgia";
    c.textAlign = "center";
    c.fillText("No. 08", s / 2, s * 0.42);
    for (let y = s * 0.55; y < s * 0.8; y += 30)
      c.fillRect(s * 0.2, y, s * 0.6, 4);
  });
  const labelMat = material(0xffffff, 1);
  labelMat.map = paperLabel;
  const glazes = [0xc6c0a0, 0x6c735d, 0xa18454, 0x735441, 0xb5aa84].map((c) => {
    const mat = material(c, 0.38);
    mat.normalMap = m.pot.normalMap;
    mat.normalScale.set(0.12, 0.12);
    return mat;
  });
  const drawerLabels = Array.from({ length: 12 }, (_, i) => {
    const mat = material(0xffffff, 0.95);
    mat.map = texture(
      (c, s) => {
        c.fillStyle = "#c4b38f";
        c.fillRect(0, 0, s, s);
        c.fillStyle = "#4b4639";
        c.font = "48px Georgia";
        c.textAlign = "center";
        c.fillText(String(i + 1).padStart(2, "0"), s / 2, s * 0.61);
      },
      [1, 1],
      128,
    );
    return mat;
  });
  const bookLabel = texture((c, s) => {
    c.clearRect(0, 0, s, s);
    c.fillStyle = "#c0a776";
    c.textAlign = "center";
    c.font = "64px Georgia";
    c.fillText("COLLECTION", s / 2, s * 0.3);
    c.font = "42px Georgia";
    c.fillText("VOLUME  ·  II", s / 2, s * 0.47);
    c.fillRect(s * 0.2, s * 0.65, s * 0.6, 5);
  });
  const spineMat = material(0xffffff, 0.9);
  spineMat.map = bookLabel;
  spineMat.alphaTest = 0.4;
  const leather = upholstery;
  const cavityProbes = [];
  function cup(position, parent = group, scale = 1) {
    const g = sub(position, range(-0.5, 0.5), parent);
    g.scale.setScalar(scale);
    lathe(
      [
        [0, 0],
        [0.08, 0.003],
        [0.085, 0.009],
        [0.073, 0.014],
        [0.04, 0.017],
      ],
      [0, 0, 0],
      porcelain,
      g,
    );
    lathe(
      [
        [0.032, 0.016],
        [0.035, 0.022],
        [0.043, 0.08],
        [0.043, 0.086],
        [0.039, 0.086],
        [0.034, 0.028],
        [0.029, 0.023],
      ],
      [0, 0, 0],
      porcelain,
      g,
    );
    cylinder(0.035, 0.004, [0, 0.064, 0], tea, g);
    tube(
      [
        [0.039, 0.071, 0],
        [0.071, 0.076, 0],
        [0.079, 0.052, 0],
        [0.057, 0.032, 0],
        [0.04, 0.034, 0],
      ],
      0.006,
      porcelain,
      g,
    );
    rod([-0.071, 0.018, -0.01], [-0.032, 0.022, 0.055], 0.003, m.brass, g);
    return g;
  }
  function plate(position, parent = group, radius = 0.14, contents = false) {
    const g = sub(position, 0, parent);
    lathe(
      [
        [0, 0],
        [radius * 0.48, 0.004],
        [radius * 0.85, 0.007],
        [radius, 0.018],
        [radius, 0.025],
        [radius * 0.85, 0.018],
        [radius * 0.5, 0.013],
        [0, 0.01],
      ],
      [0, 0, 0],
      porcelain,
      g,
    );
    if (contents)
      for (let i = 0; i < 7; i++)
        sphere(
          radius * 0.16,
          [
            range(-radius * 0.55, radius * 0.55),
            0.036,
            range(-radius * 0.4, radius * 0.4),
          ],
          i % 2 ? m.jade : m.red,
          g,
          [1, 0.7, 1],
        );
    return g;
  }
  function bottle(position, parent = group, scale = 1, clear = false) {
    const g = sub(position, range(0, 6.2), parent);
    g.scale.setScalar(scale);
    lathe(
      [
        [0.045, 0],
        [0.052, 0.015],
        [0.052, 0.18],
        [0.04, 0.205],
        [0.017, 0.235],
        [0.017, 0.31],
        [0.02, 0.314],
      ],
      [0, 0, 0],
      clear ? m.glass : wine,
      g,
      32,
    );
    cylinder(0.019, 0.023, [0, 0.322, 0], m.bronze, g);
    box([0.064, 0.082, 0.004], [0, 0.125, 0.052], labelMat, g, 0.001);
    return g;
  }
  function jar(position, parent = group, scale = 1, glazed = true) {
    const g = sub(position, range(-0.25, 0.25), parent);
    g.scale.setScalar(scale);
    const glaze = glazes[Math.floor(random() * glazes.length)];
    lathe(
      [
        [0.06, 0],
        [0.086, 0.02],
        [0.095, 0.11],
        [0.08, 0.2],
        [0.063, 0.22],
        [0.064, 0.245],
      ],
      [0, 0, 0],
      glazed ? glaze : m.pot,
      g,
    );
    lathe(
      [
        [0.071, 0.244],
        [0.075, 0.256],
        [0.045, 0.27],
        [0, 0.27],
      ],
      [0, 0, 0],
      glazed ? glaze : m.cedar,
      g,
    );
    sphere(0.018, [0, 0.285, 0], glazed ? glaze : m.cedar, g);
    box([0.075, 0.095, 0.003], [0, 0.135, 0.092], labelMat, g, 0.001);
    return g;
  }
  function table(
    position,
    {
      width = 1,
      depth = 0.66,
      height = 0.74,
      angle = 0,
      round = false,
      settings = 2,
      cloth = false,
    } = {},
  ) {
    const g = sub(position, angle);
    const radius = width / 2;
    if (round) cylinder(radius, 0.045, [0, height - 0.025, 0], m.cedar, g);
    else box([width, 0.046, depth], [0, height - 0.025, 0], m.cedar, g, 0.016);
    for (const x of [-1, 1])
      for (const z of [-1, 1]) {
        lathe(
          [
            [0.036, 0],
            [0.039, 0.04],
            [0.021, 0.14],
            [0.028, 0.38],
            [0.028, height - 0.08],
          ],
          [x * width * 0.36, 0, z * depth * 0.32],
          m.cedar,
          g,
          16,
        );
      }
    box(
      [width * 0.82, 0.09, 0.04],
      [0, height - 0.1, -depth * 0.36],
      m.cedar,
      g,
    );
    box(
      [width * 0.82, 0.09, 0.04],
      [0, height - 0.1, depth * 0.36],
      m.cedar,
      g,
    );
    if (cloth) {
      const geo = new THREE.PlaneGeometry(width * 0.62, depth + 0.25, 24, 30),
        p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i),
          hang = Math.max(0, Math.abs(y) - depth / 2);
        p.setZ(i, -hang * 0.9 + 0.005 * Math.cos(p.getX(i) * 40));
      }
      geo.computeVertexNormals();
      mesh(geo, m.linen, [0, height + 0.004, 0], [-Math.PI / 2, 0, 0], g);
    }
    for (let i = 0; i < settings; i++)
      cup(
        [
          (i - (settings - 1) / 2) * width * 0.5,
          height + 0.006,
          range(-0.12, 0.12),
        ],
        g,
      );
    return g;
  }
  function chair(position, angle = 0, mat = leather, parent = group) {
    const g = sub(position, angle, parent);
    cylinder(0.23, 0.045, [0, 0.44, 0], m.cedar, g);
    cushion([0.435, 0.055, 0.415], [0, 0.48, 0], mat, g);
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        rod(
          [x * 0.18, 0, z * 0.18],
          [x * 0.145, 0.44, z * 0.15],
          0.019,
          m.cedar,
          g,
        );
    ring(0.175, 0.009, [0, 0.21, 0], m.cedar, g);
    tube(
      [
        [-0.2, 0.42, -0.13],
        [-0.225, 0.7, -0.19],
        [-0.18, 0.99, -0.19],
        [0, 1.07, -0.19],
        [0.18, 0.99, -0.19],
        [0.225, 0.7, -0.19],
        [0.2, 0.42, -0.13],
      ],
      0.021,
      m.cedar,
      g,
    );
    for (const x of [-0.11, 0, 0.11])
      tube(
        [
          [x, 0.48, -0.14],
          [x * 0.7, 0.75, -0.23],
          [x, 1.0, -0.19],
        ],
        0.01,
        m.cedar,
        g,
      );
    return g;
  }
  function bench(position, width = 2, angle = 0, mat = leather) {
    const g = sub(position, angle);
    box([width, 0.32, 0.68], [0, 0.24, 0], m.cedar, g);
    cushion([width, 0.15, 0.67], [0, 0.46, 0], mat, g);
    cushion([width, 0.68, 0.16], [0, 0.83, -0.29], mat, g, [0.08, 0, 0]);
    for (let x = -width / 2 + 0.22; x < width / 2; x += 0.37)
      for (const y of [0.73, 0.94])
        sphere(0.012, [x, y, -0.19], m.bronze, g, [1, 1, 0.45]);
    for (const x of [-width * 0.42, width * 0.42])
      box([0.065, 0.22, 0.065], [x, 0.11, 0], m.cedar, g);
    return g;
  }
  function pendant(position, style = "brass", parent = group) {
    const g = sub(position, 0, parent);
    rod([0, 0, 0], [0, -0.43, 0], 0.009, m.iron, g);
    const shadeMat = style === "green" ? m.jade : m.brass;
    lathe(
      [
        [0.04, -0.43],
        [0.06, -0.46],
        [0.11, -0.54],
        [0.22, -0.62],
        [0.225, -0.65],
        [0.21, -0.654],
        [0.09, -0.54],
      ],
      [0, 0, 0],
      shadeMat,
      g,
    );
    const glow = material(0xffe8bd, 0.4);
    glow.emissive.set(0xffbd68);
    glow.emissiveIntensity = 0.75;
    sphere(0.046, [0, -0.57, 0], glow, g);
    const light = new THREE.PointLight(0xffca89, 3.1, 5, 2);
    light.position.set(0, -0.72, 0);
    g.add(light);
    return g;
  }
  function shelves(
    position,
    {
      width = 2,
      height = 2.4,
      rows = 4,
      angle = 0,
      kind = "bottles",
      density = 9,
    } = {},
  ) {
    const g = sub(position, angle);
    box([width, height, 0.045], [0, height / 2, -0.2], m.cedar, g, 0);
    for (const x of [-width / 2, width / 2])
      box([0.055, height, 0.37], [x, height / 2, 0], m.cedar, g);
    for (let row = 0; row <= rows; row++) {
      const y = 0.14 + (row * (height - 0.2)) / rows;
      box([width, 0.045, 0.42], [0, y, 0], m.cedar, g);
      if (row === rows) continue;
      for (let i = 0; i < density; i++) {
        const x =
          -width / 2 + 0.12 + (i * (width - 0.24)) / Math.max(1, density - 1);
        if (kind === "bottles")
          bottle([x, y + 0.024, range(-0.06, 0.07)], g, range(0.75, 1.3));
        if (kind === "jars") jar([x, y + 0.024, 0], g, range(0.8, 1.2));
        if (kind === "cups") {
          cup([x, y + 0.024, 0.05], g);
          if (i % 2 === 0) cup([x, y + 0.14, 0.05], g);
        }
        if (kind === "books")
          book([x, y + 0.024, 0.05], g, range(0.025, 0.07), range(0.2, 0.35));
      }
    }
    return g;
  }
  function book(
    position,
    parent = group,
    width = 0.04,
    height = 0.28,
    flat = false,
  ) {
    const g = sub(position, range(-0.05, 0.05), parent);
    if (flat) g.rotation.z = Math.PI / 2;
    const cover = bookColors[Math.floor(random() * bookColors.length)],
      depth = range(0.15, 0.22);
    box([width, height, depth], [0, height / 2, 0], paper, g, 0);
    for (const x of [-width / 2, width / 2])
      box(
        [0.003, height + 0.007, depth + 0.008],
        [x, height / 2, 0],
        cover,
        g,
        0,
      );
    box(
      [width + 0.004, height + 0.007, 0.012],
      [0, height / 2, depth / 2],
      cover,
      g,
      0,
    );
    for (const y of [height * 0.12, height * 0.2, height * 0.82, height * 0.89])
      box([width, 0.002, 0.002], [0, y, depth / 2 + 0.007], m.brass, g, 0);
    if (width > 0.045)
      mesh(
        new THREE.PlaneGeometry(width * 0.7, height * 0.5),
        spineMat,
        [0, height * 0.58, depth / 2 + 0.009],
        [0, 0, 0],
        g,
      );
    return g;
  }
  function drawerCabinet(
    position,
    { width = 3, height = 2.6, rows = 8, cols = 8, angle = 0 } = {},
  ) {
    const g = sub(position, angle);
    g.name = "Partitioned apothecary cabinet";
    box(
      [width + 0.1, height + 0.08, 0.035],
      [0, height / 2, -0.32],
      m.cedar,
      g,
    );
    const w = width / cols,
      h = height / rows;
    for (let col = 0; col <= cols; col++)
      box(
        [0.024, height + 0.04, 0.46],
        [-width / 2 + col * w, height / 2, -0.095],
        m.cedar,
        g,
        0,
      );
    for (let row = 0; row <= rows; row++)
      box([width + 0.05, 0.019, 0.46], [0, row * h, -0.095], m.cedar, g, 0);
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const x = -width / 2 + (col + 0.5) * w,
          y = (row + 0.5) * h;
        const open = (row + col) % 7 === 2 && row < rows * 0.65;
        const z = 0.15 + (open ? 0.22 : 0);
        const front = box(
          [w - 0.013, h - 0.012, 0.045],
          [x, y, z],
          m.cedar,
          g,
          0.003,
        );
        if (open) {
          const bottom = row * h + 0.024;
          box([w - 0.045, 0.014, 0.39], [x, bottom, z - 0.215], m.cedar, g, 0);
          for (const sign of [-1, 1])
            box(
              [0.014, h * 0.64, 0.39],
              [x + sign * (w / 2 - 0.028), bottom + h * 0.32, z - 0.215],
              m.cedar,
              g,
              0,
            );
          box(
            [w - 0.045, h * 0.64, 0.014],
            [x, bottom + h * 0.32, z - 0.403],
            m.cedar,
            g,
            0,
          );
          for (let i = 0; i < 5; i++)
            rod(
              [
                x + range(-w * 0.28, w * 0.22),
                bottom + 0.018,
                z - 0.15 - i * 0.032,
              ],
              [
                x + range(-w * 0.1, w * 0.3),
                bottom + 0.024,
                z - 0.18 - i * 0.032,
              ],
              0.005,
              m.bark,
              g,
            );
          if (cavityProbes.every((probe) => probe.parent !== g))
            cavityProbes.push({
              parent: g,
              kind: "drawer",
              position: [x, (row + 1) * h + 0.03, z - 0.1],
              direction: [0, -1, 0],
              minDistance: h * 0.5,
            });
        }
        box(
          [w * 0.35, h * 0.21, 0.005],
          [x, y + h * 0.1, front.position.z + 0.026],
          drawerLabels[(row * cols + col) % 12],
          g,
          0.001,
        );
        ring(
          0.018,
          0.0035,
          [x, y - h * 0.2, front.position.z + 0.04],
          m.brass,
          g,
          [0, 0, 0],
        );
      }
    box([width + 0.18, 0.09, 0.55], [0, height + 0.06, 0], m.cedar, g);
    return g;
  }
  function hearth(position, parent = group) {
    const g = sub(position, 0, parent);
    g.name = "Clay hearth with open fire chambers";
    const lining = material(0x443b30, 1);
    box([2.65, 0.08, 1.08], [0, 0.04, 0], lining, g, 0.012);
    box([2.65, 0.53, 0.1], [0, 0.335, -0.49], lining, g, 0);
    for (const x of [-1.265, -0.025, 1.265])
      box([0.12, 0.54, 1.0], [x, 0.35, 0], m.pot, g, 0.018);
    const front = sub([0, 0, 0.485], 0, g);
    k.wallWithOpenings(
      front,
      2.65,
      0.63,
      0.11,
      [-0.7, 0.65].map((x) => ({ x, width: 0.5, bottom: 0.12, top: 0.49 })),
      m.pot,
    );
    const top = sub([0, 0.59, 0], 0, g);
    top.rotation.x = -Math.PI / 2;
    k.wallWithOpenings(
      top,
      2.65,
      1.08,
      0.08,
      [-0.7, 0.65].map((x) => ({ x, width: 0.38, bottom: -0.2, top: 0.2 })),
      m.pot,
      -0.54,
    );
    const ember = material(0x8c3f1f, 0.95);
    ember.emissive.set(0xbd3712);
    ember.emissiveIntensity = 0.65;
    for (const x of [-0.7, 0.65]) {
      for (let i = 0; i < 6; i++)
        sphere(
          0.033,
          [x + range(-0.15, 0.15), 0.1, range(-0.2, 0.3)],
          i % 3 ? lining : ember,
          g,
          [1.4, 0.45, 1],
        );
      cavityProbes.push({
        parent: g,
        kind: "hearth",
        position: [x, 0.32, 0.64],
        direction: [0, 0, -1],
        minDistance: 0.8,
      });
    }
    return g;
  }
  function openBook(position, parent = group) {
    const g = sub(position, range(-0.2, 0.2), parent);
    for (const side of [-1, 1]) {
      const page = box(
        [0.19, 0.018, 0.27],
        [side * 0.092, 0.023, 0],
        paper,
        g,
        0.002,
      );
      page.rotation.z = -side * 0.13;
      for (let i = 0; i < 14; i++)
        box(
          [0.145, 0.001, 0.001],
          [side * 0.092, 0.04 + 0.006 * (i % 2), -0.11 + i * 0.016],
          m.bronze,
          g,
          0,
        );
    }
    return g;
  }
  function scale(position, parent = group) {
    const g = sub(position, 0, parent);
    box([0.33, 0.045, 0.22], [0, 0.025, 0], m.cedar, g);
    lathe(
      [
        [0.065, 0],
        [0.055, 0.04],
        [0.024, 0.08],
        [0.021, 0.37],
        [0.032, 0.4],
      ],
      [0, 0.04, 0],
      m.brass,
      g,
    );
    rod([-0.26, 0.43, 0], [0.26, 0.43, 0], 0.009, m.brass, g);
    for (const sign of [-1, 1]) {
      const x = sign * 0.21;
      for (const a of [0, 2.094, 4.188])
        rod(
          [x, 0.42, 0],
          [x + Math.cos(a) * 0.085, 0.2, Math.sin(a) * 0.085],
          0.002,
          m.brass,
          g,
        );
      lathe(
        [
          [0, 0],
          [0.07, 0.009],
          [0.095, 0.035],
          [0.097, 0.043],
        ],
        [x, 0.177, 0],
        m.brass,
        g,
      );
    }
    return g;
  }
  function foliage(
    position,
    scale = 1,
    tropical = false,
    { planted = false } = {},
  ) {
    const g = sub(position);
    g.scale.setScalar(scale);
    if (planted) {
      rod([0, -0.05, 0], [0, 0.55, 0], 0.038, m.bark, g, 0.06);
    } else {
      lathe(
        [
          [0.16, 0],
          [0.24, 0.08],
          [0.28, 0.34],
          [0.26, 0.46],
          [0.29, 0.48],
          [0.29, 0.52],
          [0.25, 0.52],
        ],
        [0, 0, 0],
        m.pot,
        g,
      );
      cylinder(0.24, 0.016, [0, 0.46, 0], m.soil, g);
    }
    for (let i = 0; i < (tropical ? 24 : 40); i++) {
      const a = i * 2.399,
        h = range(0.65, 1.3),
        r = range(0.25, 0.7);
      const end = [Math.sin(a) * r, h, Math.cos(a) * r];
      tube(
        [[0, 0.45, 0], [end[0] * 0.3, h * 0.86, end[2] * 0.3], end],
        0.007,
        m.jade,
        g,
      );
      const geo = new THREE.PlaneGeometry(
          tropical ? 0.27 : 0.14,
          tropical ? 0.8 : 0.35,
          4,
          10,
        ),
        p = geo.attributes.position;
      for (let j = 0; j < p.count; j++)
        p.setZ(j, Math.sin((p.getY(j) + 0.4) * 4) * 0.08);
      geo.computeVertexNormals();
      mesh(geo, m.leaf, end, [range(-0.8, 0.8), a, range(-0.8, 0.8)], g);
    }
    return g;
  }
  function stool(position, width = 0.6, depth = 0.38, height = 0.48) {
    const g = sub(position);
    box([width, 0.055, depth], [0, height, 0], m.cedar, g, 0.01);
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        rod(
          [x * width * 0.42, 0, z * depth * 0.43],
          [x * width * 0.35, height, z * depth * 0.32],
          0.022,
          m.cedar,
          g,
        );
    for (const x of [-1, 1])
      rod(
        [x * width * 0.4, 0.19, -depth * 0.38],
        [x * width * 0.4, 0.19, depth * 0.38],
        0.015,
        m.cedar,
        g,
      );
    return g;
  }
  function glass(position, parent = group, milky = false) {
    const g = sub(position, 0, parent);
    lathe(
      [
        [0.03, 0],
        [0.036, 0.005],
        [0.04, 0.14],
        [0.037, 0.14],
        [0.033, 0.01],
        [0.03, 0.008],
      ],
      [0, 0, 0],
      m.glass,
      g,
      24,
    );
    cylinder(0.034, 0.095, [0, 0.053, 0], milky ? porcelain : tea, g);
    return g;
  }
  function cake(position, parent = group) {
    const g = plate(position, parent, 0.12);
    const sponge = material(0xc6a66b, 0.97),
      crust = material(0x78522c, 0.88);
    for (const x of [-0.036, 0.036]) {
      box([0.062, 0.06, 0.105], [x, 0.05, 0], sponge, g, 0.004);
      box([0.064, 0.009, 0.107], [x, 0.084, 0], crust, g, 0.002);
    }
    return g;
  }
  function armchair(position, angle = 0) {
    const g = sub(position, angle);
    box([0.87, 0.27, 0.85], [0, 0.28, 0], m.cedar, g, 0.03);
    cushion([0.73, 0.2, 0.72], [0, 0.5, 0], leather, g);
    cushion([0.85, 0.72, 0.2], [0, 0.88, -0.33], leather, g, [0.1, 0, 0]);
    for (const x of [-0.44, 0.44]) {
      cushion([0.2, 0.25, 0.84], [x, 0.72, 0], leather, g);
      for (const z of [-0.31, 0.31])
        rod([x, 0.05, z], [x, 0.65, z], 0.037, m.cedar, g);
    }
    return g;
  }
  function oilLamp(position, parent = group) {
    const g = sub(position, 0, parent);
    lathe(
      [
        [0.09, 0],
        [0.11, 0.025],
        [0.07, 0.05],
        [0.045, 0.1],
        [0.075, 0.14],
        [0.07, 0.21],
        [0.025, 0.24],
      ],
      [0, 0, 0],
      m.brass,
      g,
    );
    lathe(
      [
        [0.055, 0.24],
        [0.065, 0.3],
        [0.04, 0.4],
        [0.029, 0.53],
        [0.031, 0.55],
      ],
      [0, 0, 0],
      m.glass,
      g,
    );
    const flame = material(0xffe0a1, 0.8);
    flame.emissive.set(0xffbb55);
    flame.emissiveIntensity = 2;
    sphere(0.015, [0, 0.3, 0], flame, g, [0.7, 2, 0.7]);
    const light = new THREE.PointLight(0xffc78b, 2, 3, 2);
    light.position.set(0, 0.32, 0);
    g.add(light);
    return g;
  }
  function lantern(position, parent = group) {
    const g = sub(position, 0, parent);
    rod([0, 0, 0], [0, -0.32, 0], 0.008, m.iron, g);
    box([0.27, 0.055, 0.27], [0, -0.4, 0], m.iron, g);
    box([0.26, 0.04, 0.26], [0, -0.83, 0], m.iron, g);
    for (const x of [-0.12, 0.12])
      for (const z of [-0.12, 0.12])
        rod([x, -0.42, z], [x, -0.82, z], 0.007, m.iron, g);
    const glow = material(0xffd49a, 0.6);
    glow.emissive.set(0xffbd6d);
    glow.emissiveIntensity = 0.8;
    cylinder(0.028, 0.18, [0, -0.7, 0], m.paper, g);
    sphere(0.012, [0, -0.59, 0], glow, g, [0.7, 2, 0.7]);
    const light = new THREE.PointLight(0xffce91, 3, 5, 2);
    light.position.set(0, -0.69, 0);
    g.add(light);
    return g;
  }
  return {
    cup,
    plate,
    bottle,
    jar,
    table,
    chair,
    bench,
    pendant,
    shelves,
    book,
    drawerCabinet,
    hearth,
    cavityProbes,
    openBook,
    scale,
    foliage,
    stool,
    glass,
    cake,
    armchair,
    oilLamp,
    lantern,
    porcelain,
    leather,
  };
}
