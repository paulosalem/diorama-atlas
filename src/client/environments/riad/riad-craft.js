import * as THREE from "three";

/** Craft at centimetre scale, built with the same batching helpers as the shell. */
export function addRiadCraft({
  m,
  detail,
  group,
  box,
  object,
  lathe,
  rod,
  curve,
  torus,
  sphere,
  subgroup,
  rand,
  range,
  pot,
}) {
  // A dense carved frieze follows each gallery. The relief catches the grazing sun.
  for (const [position, angle] of [
    [[0, 0, -3.65], 0],
    [[-4.42, 0, 0.76], Math.PI / 2],
    [[4.42, 0, 0.76], -Math.PI / 2],
    [[0, 0, 5.17], Math.PI],
  ]) {
    const wall = subgroup(position, angle);
    for (let x = -4.28; x < 4.3; x += 0.125) {
      for (const y of [4.1, 4.22, 4.34]) {
        const loop = [];
        for (let k = 0; k <= 24; k++) {
          const a = (k / 24) * Math.PI * 2;
          loop.push([
            x + Math.cos(a) * 0.061,
            y + Math.sin(a) * 0.053,
            0.154 + 0.003 * Math.sin(a * 2),
          ]);
        }
        curve(loop, 0.0045, m.plaster, wall, true);
        for (const sign of [-1, 1])
          curve(
            [
              [x, y, 0.154],
              [x + sign * 0.025, y + 0.025, 0.16],
              [x + sign * 0.047, y + 0.049, 0.154],
            ],
            0.0035,
            m.plaster,
            wall,
          );
      }
    }
    for (let bay = -1; bay <= 1; bay++) {
      for (let x = -1.34; x < 1.35; x += 0.115)
        for (let y = 2.82; y < 4.0; y += 0.115) {
          const archHeight =
            2.65 + 1.33 * Math.sqrt(Math.max(0, 1 - (x / 1.24) ** 2));
          if (Math.abs(x) < 1.28 && y < archHeight + 0.13) continue;
          const cx = x + bay * 2.94;
          for (const sign of [-1, 1])
            curve(
              [
                [cx, y - 0.052, 0.154],
                [cx + sign * 0.051, y - 0.008, 0.158],
                [cx + sign * 0.022, y + 0.039, 0.158],
                [cx, y + 0.06, 0.154],
              ],
              0.0038,
              m.plaster,
              wall,
            );
        }
    }
    // Tiny dentils and shadow gaps at the cedar / plaster junction.
    for (let x = -4.35; x < 4.4; x += 0.095)
      box([0.045, 0.048, 0.044], [x, 4.47, 0.215], m.plaster, 0.003, wall);
  }
  // Fine inlaid panels on the main door, including diamond rosettes and bronze nails.
  for (const side of [-1, 1]) {
    const door = subgroup([side * 0.67, 0, -4.92], side * 1.05),
      cx = -side * 0.31;
    for (const y of [0.54, 1.47, 2.37]) {
      for (let i = 0; i < 3; i++) {
        const r = 0.185 - i * 0.039;
        const points = [];
        for (let k = 0; k <= 16; k++) {
          const a = (k * Math.PI) / 8,
            rr = r * (k % 2 ? 0.64 : 1);
          points.push([
            cx + Math.sin(a) * rr,
            y + Math.cos(a) * rr * 1.45,
            0.094,
          ]);
        }
        curve(points, 0.0045, i === 1 ? m.brass : m.cedar, door, true);
      }
      for (const x of [-0.218, 0.218])
        for (let dy = -0.29; dy <= 0.3; dy += 0.12)
          sphere(0.007, [cx + x, y + dy, 0.102], m.bronze, door, [1, 1, 0.45]);
    }
  }
  // Hand-stitched leather poufs, with seams close to the leather surface.
  for (const [x, z, r] of [
    [-2.12, 1.25, 0.36],
    [-3.52, 1.7, 0.3],
  ]) {
    const pouf = subgroup([x, 0.035, z]);
    lathe(
      [
        [r * 0.73, 0],
        [r * 0.96, 0.08],
        [r, 0.21],
        [r * 0.86, 0.36],
        [r * 0.52, 0.39],
        [0, 0.397],
      ],
      detail.leather,
      [0, 0, 0],
      pouf,
      48,
    );
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6,
        points = [];
      for (const [rr, y] of [
        [r * 0.17, 0.398],
        [r * 0.6, 0.388],
        [r * 0.85, 0.36],
        [r, 0.21],
        [r * 0.95, 0.08],
      ])
        points.push([Math.cos(a) * rr, y, Math.sin(a) * rr]);
      curve(points, 0.0018, detail.stitch, pouf);
    }
    torus(
      r * 0.16,
      0.002,
      [0, 0.4, 0],
      detail.stitch,
      [Math.PI / 2, 0, 0],
      pouf,
    );
  }
  // A second little tray: dates, bread, a folded napkin, hand-thrown ceramics.
  const tray = subgroup([-3.15, 0.46, 0.1]);
  const plate = subgroup([0.3, 0, -0.13], 0, tray);
  lathe(
    [
      [0, 0],
      [0.085, 0],
      [0.13, 0.01],
      [0.145, 0.033],
      [0.143, 0.04],
      [0.125, 0.03],
      [0.07, 0.008],
      [0, 0.008],
    ],
    detail.ceramic,
    [0, 0, 0],
    plate,
  );
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4,
      r = range(0.01, 0.09);
    const d = sphere(
      0.026,
      [Math.cos(a) * r, 0.047 + Math.floor(i / 5) * 0.025, Math.sin(a) * r],
      detail.date,
      plate,
      [0.7, 0.65, 1.4],
    );
    d.rotation.y = a;
  }
  const bowl = subgroup([-3.64, 0.028, 1.03]);
  lathe(
    [
      [0, 0],
      [0.16, 0.015],
      [0.23, 0.11],
      [0.24, 0.13],
      [0.225, 0.132],
      [0.205, 0.1],
      [0.13, 0.04],
      [0, 0.035],
    ],
    detail.ceramic,
    [0, 0, 0],
    bowl,
  );
  for (let i = 0; i < 3; i++)
    sphere(
      0.1,
      [range(-0.1, 0.1), 0.12 + i * 0.035, range(-0.08, 0.08)],
      detail.bread,
      bowl,
      [1, 0.3, 0.8],
    );
  // An orange just dropped from the tree, a few curled leaves and blossoms.
  for (let i = 0; i < 44; i++) {
    const side = i % 2 ? -1 : 1,
      x = side * 3.2 + range(-0.68, 0.68),
      z = -2.55 + range(-0.58, 0.7);
    const leaf = object(
      new THREE.PlaneGeometry(0.055, 0.13, 1, 3),
      m.leaf,
      [x, 0.017 + rand() * 0.009, z],
      [-Math.PI / 2, 0, rand() * 6.28],
    );
    const p = leaf.geometry.attributes.position;
    for (let j = 0; j < p.count; j++)
      p.setZ(j, Math.sin(p.getY(j) * 23) * 0.008);
    leaf.geometry.computeVertexNormals();
    leaf.castShadow = false;
  }
  sphere(0.065, [-2.75, 0.083, -1.99], detail.bread, group, [1, 0.93, 1]);
  for (let i = 0; i < 22; i++) {
    const a = rand() * 6.28,
      r = range(0.45, 0.95);
    sphere(
      0.012,
      [-3.17 + Math.cos(a) * r, 0.027, -2.59 + Math.sin(a) * r],
      m.cream,
      group,
      [1, 0.13, 0.55],
    );
  }
  // Fountain stone has a wet inner band and a darkened waterline.
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      segment = subgroup([0, 0, -0.35], a);
    box([0.965, 0.1, 0.018], [0, 0.12, 1.14], detail.dampStone, 0.002, segment);
  }
  // Climbing jasmine on the left gallery: visible stems, irregular leaves and white flowers.
  const jasmine = subgroup([-4.14, 0, -2.13]);
  for (let branch = 0; branch < 7; branch++) {
    const pts = [];
    for (let k = 0; k <= 12; k++)
      pts.push([
        Math.sin(k * 0.58 + branch) * (0.08 + k * 0.018),
        0.3 + k * 0.29,
        Math.cos(k * 0.52 + branch) * 0.08,
      ]);
    curve(pts, 0.008, m.bark, jasmine);
    for (let k = 1; k < 12; k++) {
      const p = pts[k];
      for (const sign of [-1, 1]) {
        object(
          new THREE.PlaneGeometry(0.075, 0.145, 1, 2),
          m.leaf,
          [p[0] + sign * 0.07, p[1] + 0.035, p[2] + 0.03],
          [0.2, sign * 0.8, sign * 0.95],
          jasmine,
        );
        if (rand() > 0.66)
          for (let petal = 0; petal < 5; petal++) {
            const a = (petal * 6.28) / 5;
            sphere(
              0.014,
              [
                p[0] + 0.04 + Math.cos(a) * 0.018,
                p[1] + Math.sin(a) * 0.018,
                p[2] + 0.06,
              ],
              m.cream,
              jasmine,
              [1, 0.55, 0.35],
            );
          }
      }
    }
  }

  // A book put down open, with a few naturally bowed leaves and a cloth bookmark.
  const book = subgroup([-4.04, 0.637, 0.82], -0.17);
  box([0.31, 0.019, 0.23], [0, 0, 0], m.cedar, 0.003, book);
  for (const side of [-1, 1])
    for (let page = 0; page < 4; page++) {
      const geo = new THREE.PlaneGeometry(0.146, 0.214, 12, 1),
        pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = (pos.getX(i) + 0.073) / 0.146;
        pos.setXYZ(
          i,
          side * (0.006 + u * 0.146),
          0.014 + page * 0.002 + Math.sin(u * Math.PI) * 0.013,
          -pos.getY(i),
        );
        if (side < 0) geo.attributes.uv.setX(i, 1 - u);
      }
      geo.computeVertexNormals();
      object(
        geo,
        page === 3
          ? detail.prints.book("flora", side < 0 ? "page-left" : "page-right")
          : detail.paper,
        [0, 0, 0],
        [0, 0, 0],
        book,
      );
    }
  box(
    [0.014, 0.002, 0.11],
    [0.048, 0.022, 0.136],
    detail.cushions[0],
    0,
    book,
    [0.06, 0, 0.02],
  );
  // Rumpled linen crosses the seat edge and drops toward the rug.
  const throwGeo = new THREE.PlaneGeometry(0.68, 1, 35, 50),
    throwPos = throwGeo.attributes.position;
  for (let i = 0; i < throwPos.count; i++) {
    const u = throwPos.getX(i),
      v = throwPos.getY(i) + 0.5;
    const drop =
      v > 0.56 ? Math.sin((((v - 0.56) / 0.44) * Math.PI) / 2) * 0.52 : 0;
    throwPos.setXYZ(
      i,
      -4.84 + v * 1.02,
      0.635 - drop + Math.sin(u * 31 + v * 7) * (0.008 + v * 0.009),
      1.73 + u + 0.06 * Math.sin(v * 4),
    );
  }
  throwGeo.computeVertexNormals();
  object(throwGeo, detail.linen);
  // A folded napkin catches crumbs beside the brass tray.
  const napkinGeo = new THREE.PlaneGeometry(0.24, 0.29, 16, 20),
    np = napkinGeo.attributes.position;
  for (let i = 0; i < np.count; i++)
    np.setZ(
      i,
      0.004 * Math.sin(np.getX(i) * 43) +
        0.008 * Math.exp(-(((np.getY(i) - 0.12) * 45) ** 2)),
    );
  napkinGeo.computeVertexNormals();
  object(
    napkinGeo,
    detail.linen,
    [-3.33, 0.449, 0.28],
    [-Math.PI / 2, 0, 0.35],
  );
  for (let i = 0; i < 16; i++) {
    const onTray = i < 6;
    sphere(
      range(0.0025, 0.006),
      onTray
        ? [-2.81 + range(-0.13, 0.13), 0.465, 0.0 + range(-0.11, 0.12)]
        : [-3.4 + range(-0.18, 0.18), 0.043, 0.9 + range(-0.2, 0.16)],
      detail.bread,
      group,
      [1, 0.42, range(0.6, 1.4)],
    );
  }
  // Unpaired angles and a softened upper keep the slippers from looking staged.
  for (const [x, z, angle] of [
    [-4.06, 1.09, 0.36],
    [-3.84, 1.24, -0.24],
  ]) {
    const slipper = subgroup([x, 0.029, z], angle),
      sole = new THREE.Shape();
    sole.moveTo(-0.05, 0.05);
    sole.bezierCurveTo(-0.08, -0.07, -0.052, -0.22, 0, -0.265);
    sole.bezierCurveTo(0.052, -0.22, 0.08, -0.07, 0.05, 0.05);
    sole.quadraticCurveTo(0, 0.08, -0.05, 0.05);
    const sg = new THREE.ExtrudeGeometry(sole, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 1,
      steps: 1,
    });
    sg.rotateX(Math.PI / 2);
    object(sg, m.bronze, [0, 0.014, 0], [0, 0, 0], slipper);
    const upper = new THREE.PlaneGeometry(0.12, 0.22, 18, 24),
      p = upper.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / 0.06,
        v = (p.getY(i) + 0.11) / 0.22,
        width =
          Math.sqrt(Math.max(0, 1 - v)) * (1 + 0.3 * Math.sin(v * Math.PI));
      p.setXYZ(
        i,
        u * 0.06 * width,
        0.016 +
          Math.sqrt(Math.max(0, 1 - u * u)) *
            0.043 *
            Math.sin((v * 0.85 + 0.1) * Math.PI),
        0.005 + v * 0.255,
      );
    }
    upper.computeVertexNormals();
    object(upper, detail.leather, [0, 0, 0], [0, 0, 0], slipper);
  }

  // Copper watering vessel under the bench, with an open spout and loop handle.
  const can = subgroup([-4.07, 0.03, 1.74], 0.4);
  lathe(
    [
      [0.13, 0],
      [0.15, 0.03],
      [0.145, 0.26],
      [0.115, 0.29],
      [0.107, 0.28],
      [0.13, 0.245],
    ],
    m.bronze,
    [0, 0, 0],
    can,
  );
  curve(
    [
      [0.11, 0.08, 0],
      [0.25, 0.13, 0],
      [0.36, 0.28, 0],
    ],
    0.026,
    m.bronze,
    can,
  );
  curve(
    [
      [-0.1, 0.23, 0],
      [-0.24, 0.3, 0],
      [-0.26, 0.11, 0],
      [-0.12, 0.05, 0],
    ],
    0.016,
    m.bronze,
    can,
  );
}
