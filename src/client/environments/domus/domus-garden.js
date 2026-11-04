import * as THREE from "three";
import { laminaGeometry } from "../shared/natural-forms.js";

export const domusGardenBasin = Object.freeze({
  position: [0, 0, -11],
  waterHeight: 0.81,
  waterRadius: 0.635,
  impact: [0.31, -11, 0.28, 0.65],
});

export function furnishDomusGarden(kit, m, objects) {
  const { sub, box, cylinder, lathe, rod, tube, sphere, ring } = kit;
  const { furniture, bowl, jar, cloth, table, scroll, basket, painting } =
    objects;
  const leaves = [];
  const petals = [];
  const stems = sub();
  stems.name = "domus-garden-planting";
  const green = kit.material(0x52723d, 0.72);
  green.side = THREE.DoubleSide;
  green.alphaTest = 0.4;
  green.alphaToCoverage = true;
  green.userData.patinaProfile = "none";
  green.userData.nativeWind = { anchor: [0.5, 0] };
  green.map = kit.texture(
    (ctx, size) => {
      ctx.beginPath();
      ctx.moveTo(size * 0.5, 0);
      ctx.bezierCurveTo(
        size * 0.95,
        size * 0.24,
        size,
        size * 0.64,
        size * 0.5,
        size,
      );
      ctx.bezierCurveTo(
        0,
        size * 0.64,
        size * 0.05,
        size * 0.24,
        size * 0.5,
        0,
      );
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = "#d5d8c0";
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = "#a7b491";
      ctx.lineWidth = 1;
      for (let i = 1; i < 9; i++)
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(size / 2, (i * size) / 10);
          ctx.quadraticCurveTo(
            size * (0.5 + side * 0.13),
            ((i + 0.6) * size) / 10,
            size * (0.5 + side * 0.48),
            ((i + 1.5) * size) / 10,
          );
          ctx.stroke();
        }
      ctx.strokeStyle = "#e3dfba";
      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      ctx.stroke();
    },
    [1, 1],
    256,
  );
  const blossom = kit.material(0xffffff, 0.8);
  blossom.side = THREE.DoubleSide;
  blossom.userData.patinaProfile = "none";
  const pollen = kit.material(0xc7a74c, 0.8);
  const marble = kit.ownMaterial(m.stone.clone());
  marble.color.set(0xe5ddc6);
  marble.roughness = 0.38;
  const leafGeometry = kit.ownGeometry(new THREE.PlaneGeometry(0.43, 1, 1, 2));
  const leafVertices = leafGeometry.attributes.position;
  for (let i = 0; i < leafVertices.count; i++) {
    const y = leafVertices.getY(i) + 0.5;
    leafVertices.setY(i, y);
    leafVertices.setZ(i, y * y * 0.13);
  }
  leafGeometry.computeVertexNormals();
  const petalGeometry = kit.ownGeometry(
    laminaGeometry({
      length: 1,
      width: 0.85,
      bend: 0.3,
      segments: 6,
      columns: 4,
    }),
  );
  const transform = new THREE.Object3D();
  const tint = new THREE.Color();
  function leaf(position, length, angle, tilt, shade = 1) {
    transform.position.fromArray(position);
    transform.rotation.set(tilt, angle, kit.range(-0.7, 0.7));
    transform.scale.setScalar(length);
    transform.updateMatrix();
    leaves.push({
      matrix: transform.matrix.clone(),
      color: tint
        .setRGB(shade * kit.range(0.88, 1.12), shade, shade * 0.94)
        .clone(),
    });
  }
  function crown(position, radius, height, count, leafSize, shade = 1) {
    for (let i = 0; i < count; i++) {
      const azimuth = kit.random() * Math.PI * 2;
      const vertical = kit.range(-1, 1);
      const reach = Math.sqrt(1 - vertical * vertical);
      const fill = kit.range(0.65, 1);
      leaf(
        [
          position[0] + Math.cos(azimuth) * reach * radius * fill,
          position[1] + vertical * height * fill,
          position[2] + Math.sin(azimuth) * reach * radius * fill,
        ],
        leafSize * kit.range(0.75, 1.2),
        azimuth,
        kit.range(-0.8, 1.8),
        shade * kit.range(0.78, 1.12),
      );
    }
  }
  function flower(position, size, color, count = 5) {
    const phase = kit.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      transform.position.fromArray(position);
      transform.rotation.set(
        -Math.PI / 2 + kit.range(-0.18, 0.18),
        0,
        phase + (i * Math.PI * 2) / count,
      );
      transform.scale.set(size, size, size);
      transform.updateMatrix();
      petals.push({
        matrix: transform.matrix.clone(),
        color: new THREE.Color(color).multiplyScalar(kit.range(0.87, 1.04)),
      });
    }
    sphere(size * 0.22, position, pollen, stems, [1, 0.4, 1]);
  }
  function rose(x, z, height, color) {
    const base = [x, 0.12, z];
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4;
      const top = [
        x + Math.cos(angle) * 0.18,
        height + kit.range(-0.12, 0.12),
        z + Math.sin(angle) * 0.18,
      ];
      rod(base, top, 0.0035, m.leaf, stems, 0.0015);
      for (let j = 1; j <= 5; j++) {
        const t = j / 6;
        leaf(
          [
            x + (top[0] - x) * t,
            0.12 + (top[1] - 0.12) * t,
            z + (top[2] - z) * t,
          ],
          0.07,
          angle + j * 2.4,
          0.9,
          0.9,
        );
      }
      flower(top, kit.range(0.043, 0.055), color);
    }
    crown([x, height * 0.5, z], 0.2, height * 0.25, 250, 0.065, 0.83);
  }
  function laurel(x, z, height) {
    tube(
      [
        [x, 0.09, z],
        [x + 0.04, 0.65, z - 0.03],
        [x - 0.05, 1.25, z + 0.025],
        [x + 0.09, height - 0.25, z - 0.05],
      ],
      0.043,
      m.wood,
      stems,
    );
    for (let i = 0; i < 18; i++) {
      const a = i * 2.4;
      const reach = kit.range(0.34, 0.7);
      const start = [x, 0.88 + (i / 18) * 0.86, z];
      const end = [
        x + Math.cos(a) * reach,
        height - 0.55 + kit.range(-0.35, 0.3),
        z + Math.sin(a) * reach,
      ];
      rod(start, end, 0.012, m.wood, stems, 0.003);
      crown(end, 0.29, 0.27, 76, 0.145, 0.92);
    }
  }
  for (const x of [-2.5, 2.5])
    for (const z of [-8.85, -13.15]) {
      // A clipped outline with individual leaves, not a green solid box.
      for (const side of [-1, 1])
        for (let step = 0; step < 20; step++) {
          const along = -1.18 + (step / 19) * 2.36;
          for (const [dx, dz] of [
            [along, side * 1.17],
            [side * 1.17, along],
          ])
            crown([x + dx, 0.29, z + dz], 0.16, 0.16, 100, 0.057, 0.85);
        }
      if (z < -10) laurel(x, z, x < 0 ? 2.35 : 2.1);
      else crown([x, 0.59, z], 0.47, 0.45, 2400, 0.075, 0.93);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4;
        const dx = Math.cos(a) * 0.77,
          dz = Math.sin(a) * 0.77;
        rose(x + dx, z + dz, kit.range(0.42, 0.7), i % 3 ? 0xc37986 : 0xe4bbb0);
      }
      for (let i = 0; i < 5; i++) {
        const px = x + (i - 2) * 0.16,
          pz = z - 0.62;
        const height = kit.range(0.73, 1.02);
        rod([px, 0.12, pz], [px, height, pz], 0.003, m.leaf, stems);
        for (let j = 0; j < 5; j++)
          leaf([px, 0.2 + j * 0.09, pz], 0.17, j * 2.4, 0.85, 1.06);
        flower([px, height, pz], 0.074, 0xf3e9ce, 6);
      }
    }
  for (const [x, z] of [
    [-5.65, -6.25],
    [5.65, -15.8],
  ]) {
    const pot = furniture([x, 0, z], 0.65, 0.65);
    jar([0, 0, 0], { radius: 0.28, height: 0.5, handles: false }, pot);
    crown([x, 0.77, z], 0.32, 0.34, 420, 0.075);
  }
  function instances(name, geometry, material, entries, parent = stems) {
    const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
    mesh.name = name;
    entries.forEach(({ matrix, color }, index) => {
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, color);
    });
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    parent.add(mesh);
    return mesh;
  }
  const distantLeaf = kit.ownGeometry(new THREE.PlaneGeometry(0.43, 1));
  distantLeaf.translate(0, 0.5, 0);
  const distantVertices = distantLeaf.attributes.position;
  for (let i = 0; i < distantVertices.count; i++)
    distantVertices.setZ(i, distantVertices.getY(i) * 0.13);
  distantLeaf.computeVertexNormals();
  const clusters = [
    [-2.5, 0.8, -8.85],
    [2.5, 0.8, -8.85],
    [-2.5, 1.1, -13.15],
    [2.5, 1.1, -13.15],
    [-5.65, 0.77, -6.25],
    [5.65, 0.77, -15.8],
  ].map((position) => ({ position, entries: [] }));
  const point = new THREE.Vector3();
  for (const entry of leaves) {
    point.setFromMatrixPosition(entry.matrix);
    let nearest = clusters[0];
    let distance = Infinity;
    for (const cluster of clusters) {
      const [x, y, z] = cluster.position;
      const next = (point.x - x) ** 2 + (point.y - y) ** 2 + (point.z - z) ** 2;
      if (next < distance) {
        nearest = cluster;
        distance = next;
      }
    }
    entry.matrix.setPosition(
      point.x - nearest.position[0],
      point.y - nearest.position[1],
      point.z - nearest.position[2],
    );
    nearest.entries.push(entry);
  }
  clusters.forEach(({ position, entries }, index) => {
    const lod = new THREE.LOD();
    lod.position.fromArray(position);
    lod.name = `domus-garden-foliage-${index}`;
    stems.add(lod);
    // Only subpixel curvature changes at distance; every leaf remains present.
    lod.addLevel(
      instances(
        `garden-leaves-near-${index}`,
        leafGeometry,
        green,
        entries,
        lod,
      ),
      0,
    );
    lod.addLevel(
      instances(`garden-leaves-far-${index}`, distantLeaf, green, entries, lod),
      6,
      0.12,
    );
  });
  instances("domus-garden-blossoms", petalGeometry, blossom, petals);

  const basin = furniture(domusGardenBasin.position, 1.48, 1.48);
  basin.name = "domus-garden-labrum";
  cylinder(0.39, 0.08, [0, 0.04, 0], marble, basin, 0.43, 8);
  lathe(
    [
      [0.29, 0],
      [0.29, 0.05],
      [0.2, 0.1],
      [0.14, 0.2],
      [0.17, 0.38],
      [0.28, 0.45],
      [0.3, 0.48],
    ],
    [0, 0.08, 0],
    marble,
    basin,
  );
  lathe(
    [
      [0, 0],
      [0.26, 0],
      [0.46, 0.065],
      [0.64, 0.18],
      [0.72, 0.27],
      [0.72, 0.3],
      [0.66, 0.3],
      [0.64, 0.235],
      [0.44, 0.105],
      [0.22, 0.065],
      [0, 0.065],
    ],
    [0, 0.56, 0],
    marble,
    basin,
    64,
  );
  ring(0.71, 0.018, [0, 0.855, 0], marble, basin);
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    tube(
      [
        [Math.cos(a) * 0.34, 0.596, Math.sin(a) * 0.34],
        [Math.cos(a) * 0.52, 0.66, Math.sin(a) * 0.52],
        [Math.cos(a) * 0.67, 0.77, Math.sin(a) * 0.67],
      ],
      0.009,
      marble,
      basin,
    );
  }
  cylinder(0.09, 0.27, [0, 0.78, 0], m.bronze, basin, 0.12);
  sphere(0.085, [0, 1, 0], m.bronze, basin, [1.6, 0.82, 0.8]);
  for (const z of [-0.07, 0.07]) {
    const wing = sphere(
      0.055,
      [-0.018, 1.013, z],
      m.bronze,
      basin,
      [1.8, 0.62, 0.24],
    );
    wing.rotation.z = 0.15;
    rod([-0.01, 0.93, z * 0.5], [0, 0.97, z * 0.5], 0.008, m.bronze, basin);
  }
  tube(
    [
      [0.085, 1.02, 0],
      [0.13, 1.07, 0],
      [0.135, 1.115, 0],
    ],
    0.027,
    m.bronze,
    basin,
  );
  sphere(0.039, [0.15, 1.115, 0], m.bronze, basin);
  rod([0.178, 1.115, 0], [0.23, 1.105, 0], 0.012, m.bronze, basin, 0.005);
  for (const z of [-0.032, 0.032])
    sphere(0.005, [0.169, 1.127, z], m.black, basin);
  const tail = sphere(0.04, [-0.14, 1.03, 0], m.bronze, basin, [2.2, 0.25, 1]);
  tail.rotation.z = -0.22;
  const fallingWater = kit.ownMaterial(
    new THREE.MeshPhysicalMaterial({
      color: 0xb4d5cf,
      roughness: 0.15,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    }),
  );
  const stream = tube(
    [
      [0.231, 1.104, 0],
      [0.285, 1.06, 0],
      [0.309, 0.96, 0],
      [0.31, domusGardenBasin.waterHeight, 0],
    ],
    0.005,
    fallingWater,
    basin,
  );
  stream.castShadow = false;
  const drain = cylinder(0.024, 0.008, [0.49, 0.742, 0.17], m.bronze, basin);
  drain.rotation.z = -0.5;

  for (const [x, z, angle] of [
    [-5.85, -13.1, Math.PI / 2],
    [5.85, -8.4, -Math.PI / 2],
  ]) {
    const seat = furniture([x, 0, z], 1.75, 0.52, angle);
    box([1.8, 0.08, 0.53], [0, 0.47, 0], marble, seat);
    for (const sx of [-0.62, 0.62]) {
      box([0.22, 0.39, 0.43], [sx, 0.22, 0], marble, seat);
      box([0.32, 0.08, 0.5], [sx, 0.04, 0], marble, seat);
    }
    kit.cushion([0.61, 0.1, 0.43], [0.36, 0.56, 0], m.wineCloth, seat);
    cloth([-0.35, 0.535, 0], 0.55, 0.42, m.linen, seat, { drape: 0.09 });
  }
  const reading = table([-5.75, 0, -11.5], 0.62, 0.56, 0.6);
  scroll([-0.1, 0.64, 0], reading);
  bowl([0.17, 0.64, 0.12], 0.06, 0.07, m.glass, reading);
  jar([5.7, 0, -14.8], { height: 0.55, radius: 0.22 });
  basket([6.35, 0, -15.35], 0.24, 0.18);
  rod([6.5, 0, -14.4], [6.3, 1.35, -14.6], 0.022, m.wood);
  box([0.16, 0.25, 0.025], [6.49, 0.15, -14.4], m.iron);
  for (let i = 0; i < 8; i++)
    rod(
      [6.2 + i * 0.02, 0.19, -15.47],
      [6.28 + i * 0.02, 0.25, -15.18],
      0.004,
      m.leaf,
    );
  painting([-4.7, 1.96, -16.83], 3.35, 2.36, m.gardenArt, 0, [0, 0, 0.5, 1]);
  painting([4.7, 1.96, -16.83], 3.35, 2.36, m.gardenArt, 0, [0.5, 0, 0.5, 1]);
  return {
    garden: [0, 1.04, -11],
    "garden-work": [6.2, 0.7, -14.6],
  };
}
