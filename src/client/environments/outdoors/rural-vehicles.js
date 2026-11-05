import * as THREE from "three";

export function buildWorkCar(
  k,
  position,
  angle = 0,
  { hatchback = false, registration } = {},
) {
  const g = k.sub(position, angle);
  const paint = k.material(0x688477, 0.48, 0.35);
  const rubber = k.material(0x252825, 0.92);
  const trim = k.material(0x92968d, 0.35, 0.75);
  const upholstery = k.material(0x756b56, 0.97);
  const glass = k.material(0xb8c9c4, 0.12, 0.1);
  glass.transparent = true;
  glass.opacity = 0.24;
  glass.depthWrite = false;
  glass.side = THREE.DoubleSide;
  glass.userData.patinaProfile = "none";
  k.box([1.37, 0.12, 3.35], [0, 0.38, 0], rubber, g, 0.04);
  k.box([1.52, 0.26, 0.94], [0, 0.79, -1.22], paint, g, 0.07);
  k.box(
    [1.5, hatchback ? 0.48 : 0.18, hatchback ? 0.1 : 0.48],
    [0, hatchback ? 0.7 : 0.76, hatchback ? 1.69 : 1.48],
    paint,
    g,
    0.045,
  );
  if (hatchback) k.box([1.48, 0.23, 0.1], [0, 0.55, -1.65], paint, g, 0.035);
  for (const x of [-0.76, 0.76]) {
    k.box([0.06, 0.43, 1.48], [x, 0.67, 0], paint, g, 0.018);
    for (const z of [-1.12, 1.12]) {
      k.box([0.075, 0.14, 0.76], [x, 0.75, z], paint, g, 0.018);
      k.box(
        [0.06, 0.38, 0.23],
        [x, 0.64, Math.sign(z) * 1.62],
        paint,
        g,
        0.018,
      );
      k.mesh(
        new THREE.TorusGeometry(0.245, 0.055, 12, 36),
        rubber,
        [x, 0.3, z],
        [0, Math.PI / 2, 0],
        g,
      );
      k.mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.13, 32),
        trim,
        [x, 0.3, z],
        [0, 0, Math.PI / 2],
        g,
      );
      k.mesh(
        new THREE.CylinderGeometry(0.067, 0.067, 0.15, 20),
        rubber,
        [x, 0.3, z],
        [0, 0, Math.PI / 2],
        g,
      );
      for (let bolt = 0; bolt < 5; bolt++) {
        const a = bolt * Math.PI * 0.4;
        k.sphere(
          0.013,
          [
            x + Math.sign(x) * 0.081,
            0.3 + Math.sin(a) * 0.11,
            z + Math.cos(a) * 0.11,
          ],
          trim,
          g,
        );
      }
      k.tube(
        Array.from({ length: 13 }, (_, i) => {
          const a = (i * Math.PI) / 12;
          return [
            x + Math.sign(x) * 0.025,
            0.3 + Math.sin(a) * 0.34,
            z + Math.cos(a) * 0.34,
          ];
        }),
        0.018,
        paint,
        g,
      );
    }
    for (const z of [-0.84, 0.08, hatchback ? 1.64 : 1.03])
      k.rod(
        [x, 0.9, z],
        [x * 0.88, 1.5, z === -0.84 ? -0.55 : z * 0.95],
        0.028,
        paint,
        g,
      );
    k.rod([x, 0.91, -0.84], [x, 0.91, hatchback ? 1.64 : 1.07], 0.019, trim, g);
    if (hatchback) {
      k.box([0.06, 0.17, 0.83], [x, 0.84, 1.12], paint, g, 0.025);
      k.tube(
        [
          [x * 1.01, 0.48, -0.72],
          [x * 1.01, 0.9, -0.72],
          [x * 1.01, 0.9, 0.07],
          [x * 1.01, 0.48, 0.07],
        ],
        0.003,
        rubber,
        g,
      );
      k.tube(
        [
          [x * 1.01, 0.48, 0.1],
          [x * 1.01, 0.9, 0.1],
          [x * 1.01, 0.9, 0.72],
        ],
        0.003,
        rubber,
        g,
      );
    }
    for (const z of [-0.36, 0.63])
      k.box(
        [0.024, 0.04, 0.14],
        [x + Math.sign(x) * 0.035, 0.85, z],
        trim,
        g,
        0.008,
      );
    k.box(
      [0.025, 0.04, 2.9],
      [x + Math.sign(x) * 0.04, 0.48, 0.02],
      rubber,
      g,
      0.008,
    );
    k.rod([x, 1.02, -0.74], [x * 1.23, 1.03, -0.68], 0.018, trim, g);
    k.box([0.15, 0.11, 0.05], [x * 1.26, 1.04, -0.68], trim, g, 0.025);
  }
  const roof = k.box(
    [1.38, 0.085, hatchback ? 2.3 : 1.92],
    [0, 1.53, hatchback ? 0.38 : 0.2],
    paint,
    g,
    0.06,
  );
  if (hatchback) {
    const p = roof.geometry.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setY(i, p.getY(i) + 0.04 * (1 - (p.getX(i) / 0.69) ** 2));
    roof.geometry.computeVertexNormals();
  }
  function pane(points) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points.flat(), 3),
    );
    geometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2),
    );
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    const mesh = k.mesh(geometry, glass, [0, 0, 0], [0, 0, 0], g);
    mesh.castShadow = false;
    if (hatchback)
      for (let i = 0; i < points.length; i++)
        k.rod(points[i], points[(i + 1) % points.length], 0.015, rubber, g);
  }
  pane([
    [-0.72, 0.94, -0.84],
    [0.72, 0.94, -0.84],
    [0.65, 1.49, -0.55],
    [-0.65, 1.49, -0.55],
  ]);
  pane([
    [-0.72, 0.94, hatchback ? 1.64 : 1.04],
    [0.72, 0.94, hatchback ? 1.64 : 1.04],
    [0.65, 1.49, hatchback ? 1.558 : 0.98],
    [-0.65, 1.49, hatchback ? 1.558 : 0.98],
  ]);
  for (const side of [-1, 1]) {
    pane([
      [side * 0.75, 0.94, -0.8],
      [side * 0.75, 0.94, 0.04],
      [side * 0.67, 1.48, 0.04],
      [side * 0.67, 1.48, -0.53],
    ]);
    pane([
      [side * 0.75, 0.94, 0.13],
      [side * 0.75, 0.94, hatchback ? 1.6 : 1.0],
      [side * 0.67, 1.48, hatchback ? 1.52 : 0.94],
      [side * 0.67, 1.48, 0.13],
    ]);
    for (const z of [-0.19, 0.62]) {
      k.box([0.51, 0.12, 0.45], [side * 0.32, 0.63, z], upholstery, g, 0.045);
      k.box(
        [0.51, 0.45, 0.1],
        [side * 0.32, 0.85, z + 0.19],
        upholstery,
        g,
        0.035,
        [-0.12, 0, 0],
      );
    }
  }
  k.box([1.25, 0.12, 0.21], [0, 0.91, -0.65], rubber, g, 0.025);
  k.mesh(
    new THREE.TorusGeometry(0.15, 0.017, 8, 24),
    rubber,
    [-0.33, 1.02, -0.43],
    [-0.5, 0, 0],
    g,
  );
  k.rod([-0.33, 1.02, -0.43], [-0.33, 0.86, -0.68], 0.022, rubber, g);
  for (const z of [-1.77, 1.77])
    k.box([1.58, 0.09, 0.1], [0, 0.46, z], rubber, g, 0.025);
  const lamp = k.material(0xe4ddbb, 0.24);
  const tail = k.material(0x9d4435, 0.25);
  for (const x of [-0.55, 0.55]) {
    k.box([0.23, 0.13, 0.025], [x, 0.74, -1.7], lamp, g, 0.025);
    k.box([0.16, 0.17, 0.025], [x, 0.69, 1.73], tail, g, 0.018);
  }
  k.box([0.67, 0.12, 0.023], [0, 0.73, -1.705], rubber, g, 0.008);
  for (let i = 0; i < 9; i++)
    k.box(
      [0.025, 0.1, 0.026],
      [-0.29 + i * 0.073, 0.73, -1.72],
      trim,
      g,
      0.002,
    );
  for (const x of [-0.31, 0.25])
    k.rod([x, 0.96, -0.85], [x + 0.2, 1.15, -0.75], 0.007, rubber, g);
  for (const x of [-0.51, 0.51])
    k.box([0.04, 0.04, 1.6], [x, 1.61, 0.22], trim, g, 0.01);
  for (const z of [-0.35, 0.85])
    k.box([1.16, 0.04, 0.045], [0, 1.62, z], trim, g, 0.01);
  if (hatchback) {
    k.box([0.13, 0.035, 0.035], [0, 0.86, 1.75], rubber, g, 0.006);
    k.rod([0.02, 1.0, 1.648], [0.29, 1.23, 1.615], 0.008, rubber, g);
    for (const x of [-0.51, 0.51])
      for (const z of [-0.35, 0.85])
        k.box([0.05, 0.055, 0.08], [x, 1.579, z], rubber, g, 0.008);
    k.tube(
      [
        [-0.67, 0.51, 1.746],
        [-0.67, 0.89, 1.746],
        [0.67, 0.89, 1.746],
        [0.67, 0.51, 1.746],
      ],
      0.0025,
      rubber,
      g,
    );
    for (const x of [-0.55, 0.55])
      for (let rib = 0; rib < 5; rib++)
        k.box(
          [0.12, 0.004, 0.004],
          [x, 0.635 + rib * 0.025, 1.745],
          lamp,
          g,
          0.001,
        );
  }
  if (registration) {
    const plate = k.material(0xffffff, 0.52);
    plate.name = "Original fictional vehicle registration";
    plate.userData.patinaProfile = "none";
    plate.map = k.texture(
      (c, size) => {
        c.fillStyle = "#eceadf";
        c.fillRect(0, 0, size, size);
        c.fillStyle = "#294e77";
        c.fillRect(0, 0, size * 0.1, size);
        c.fillStyle = "#ffffff";
        c.font = `bold ${size * 0.3}px sans-serif`;
        c.fillText(registration.country, size * 0.02, size * 0.8, size * 0.06);
        c.fillStyle = "#202320";
        c.font = `bold ${size * 0.68}px monospace`;
        c.fillText(registration.number, size * 0.14, size * 0.76, size * 0.82);
      },
      [1, 1],
      512,
    );
    for (const side of [-1, 1]) {
      const z = side < 0 ? -1.712 : 1.748;
      k.box([0.53, 0.12, 0.015], [0, 0.58, z], rubber, g, 0.008);
      k.mesh(
        new THREE.PlaneGeometry(0.51, 0.105),
        plate,
        [0, 0.58, z + side * 0.009],
        [0, side < 0 ? Math.PI : 0, 0],
        g,
      );
      for (const x of [-0.225, 0.225])
        k.sphere(0.004, [x, 0.58, z + side * 0.011], trim, g, [1, 1, 0.5]);
    }
  }
  return g;
}

export function buildBicycle(k, position, angle = 0) {
  const g = k.sub(position, angle);
  const paint = k.material(0x8b5647, 0.48, 0.4);
  const rubber = k.material(0x302f2a, 0.95);
  const metal = k.material(0x9a9d92, 0.35, 0.72);
  const rear = [0, 0.34, 0.63],
    front = [0, 0.34, -0.63];
  for (const center of [rear, front]) {
    k.mesh(
      new THREE.TorusGeometry(0.315, 0.025, 8, 40),
      rubber,
      center,
      [0, Math.PI / 2, 0],
      g,
    );
    k.mesh(
      new THREE.TorusGeometry(0.285, 0.009, 6, 40),
      metal,
      center,
      [0, Math.PI / 2, 0],
      g,
    );
    k.rod(
      [-0.055, center[1], center[2]],
      [0.055, center[1], center[2]],
      0.018,
      metal,
      g,
    );
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12;
      k.rod(
        [i % 2 ? 0.035 : -0.035, center[1], center[2]],
        [0, center[1] + Math.sin(a) * 0.285, center[2] + Math.cos(a) * 0.285],
        0.0015,
        metal,
        g,
      );
    }
  }
  const crank = [0, 0.34, 0.13],
    seat = [0, 0.86, 0.26],
    head = [0, 0.87, -0.42];
  for (const [a, b] of [
    [rear, seat],
    [seat, crank],
    [crank, rear],
    [seat, head],
    [head, crank],
    [head, front],
  ])
    k.rod(a, b, 0.016, paint, g);
  for (const x of [-0.055, 0.055]) {
    k.rod([x, 0.85, -0.42], [x, 0.34, -0.63], 0.012, metal, g);
    k.rod([x, 0.34, 0.13], [x, 0.34, 0.63], 0.009, paint, g);
  }
  k.rod(seat, [0, 0.98, 0.28], 0.015, metal, g);
  k.box([0.2, 0.05, 0.28], [0, 0.99, 0.28], rubber, g, 0.04);
  k.rod(head, [0, 1.05, -0.45], 0.014, metal, g);
  k.tube(
    [
      [-0.27, 1.03, -0.34],
      [-0.22, 1.07, -0.45],
      [0.22, 1.07, -0.45],
      [0.27, 1.03, -0.34],
    ],
    0.013,
    metal,
    g,
  );
  for (const x of [-0.27, 0.27])
    k.rod([x, 1.03, -0.34], [x, 1.03, -0.23], 0.021, rubber, g);
  k.mesh(
    new THREE.TorusGeometry(0.08, 0.008, 6, 28),
    metal,
    [0.055, 0.34, 0.13],
    [0, Math.PI / 2, 0],
    g,
  );
  k.tube(
    [
      [0.07, 0.41, 0.13],
      [0.07, 0.37, 0.63],
      [0.07, 0.31, 0.63],
      [0.07, 0.27, 0.13],
    ],
    0.003,
    rubber,
    g,
    true,
  );
  for (const side of [-1, 1]) {
    k.rod(
      [side * 0.055, 0.34, 0.13],
      [side * 0.13, 0.34 + side * 0.12, 0.16],
      0.01,
      metal,
      g,
    );
    k.box(
      [0.12, 0.025, 0.08],
      [side * 0.17, 0.34 + side * 0.12, 0.16],
      rubber,
      g,
      0.008,
    );
  }
  k.rod([0, 0.36, 0.24], [0.2, 0.01, 0.33], 0.009, metal, g);
  k.box([0.27, 0.025, 0.39], [0, 0.72, 0.64], metal, g, 0.008);
  for (const side of [-1, 1])
    k.rod(
      [side * 0.11, 0.72, 0.77],
      [side * 0.045, 0.34, 0.63],
      0.007,
      metal,
      g,
    );
  k.tube(
    [
      [0.18, 1.04, -0.3],
      [0.12, 0.85, -0.67],
      [0.055, 0.48, -0.64],
    ],
    0.003,
    rubber,
    g,
  );
  return g;
}
