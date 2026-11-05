import * as THREE from "three";

function noise(x, y, seed) {
  const hash = (a, b) => {
    const n = Math.sin(a * 127.1 + b * 311.7 + seed * 74.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const ix = Math.floor(x),
    iy = Math.floor(y);
  const smooth = (t) => t * t * (3 - 2 * t);
  const u = smooth(x - ix),
    v = smooth(y - iy);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), u),
    THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u),
    v,
  );
}

function finishAt(x, y, seed, width) {
  const age = seed % 4 === 0 ? 0.12 : 0.45 + (seed % 3) * 0.22;
  const cx = (seed % 2 ? -1 : 1) * width * 0.34;
  const dx = (x - cx) / (0.32 + (seed % 3) * 0.09);
  const dy = (y - (0.65 + (seed % 3) * 0.38)) / 0.47;
  const angle = Math.atan2(dy, dx);
  const edge =
    1 + 0.15 * Math.sin(angle * 7 + seed) + 0.09 * Math.cos(angle * 13);
  const loss = Math.max(0, Math.min(1, (edge - Math.hypot(dx, dy)) * 7)) * age;
  const trowel = noise(x * 5, y * 7, seed) * 2 - 1;
  return {
    relief:
      0.005 +
      0.0025 * trowel +
      0.001 * (noise(x * 29, y * 23, seed + 3) * 2 - 1) -
      loss * 0.005,
    loss,
  };
}

export function alfamaPlasterPigment(x, y, seed, width, height, holes = []) {
  const { loss } = finishAt(x, y, seed, width);
  const age = seed % 4 === 0 ? 0.35 : 0.7 + (seed % 3) * 0.15;
  const broad = noise(x * 0.83, y * 0.61, seed + 17);
  const fleck = noise(x * 11, y * 9, seed + 9);
  const chalk = THREE.MathUtils.smoothstep(
    broad * 0.7 + noise(x * 3.1, y * 2.7, seed + 13) * 0.3,
    0.42,
    0.72,
  );
  const streak = noise(x * 18, y * 0.4, seed + 7);
  const splash =
    Math.exp(-Math.max(0, y) / (0.17 + broad * 0.32)) * (0.25 + fleck * 0.75);
  const eaves = Math.exp(-Math.max(0, height - y) / 0.38) * streak;
  let runoff = 0;
  for (const hole of holes) {
    if (hole.bottom <= 0 || y > hole.bottom) continue;
    const below = hole.bottom - y;
    for (const side of [-1, 1]) {
      const dx = x - (hole.x + side * (hole.width / 2 + 0.09));
      runoff +=
        Math.exp(-((dx / (0.065 + below * 0.06)) ** 2)) *
        Math.exp(-below / (0.55 + broad * 0.7)) *
        (0.4 + streak * 0.6);
    }
  }
  const repairX = (seed % 2 ? -1 : 1) * width * 0.24;
  const edge = (noise(x * 9, y * 7, seed + 31) - 0.5) * 0.1;
  const repair =
    seed % 3 === 1
      ? 1 -
        THREE.MathUtils.smoothstep(
          Math.max(
            Math.abs(x - repairX) / 0.47,
            Math.abs(y - (1.45 + (seed % 3) * 0.25)) / 0.6,
          ) + edge,
          0.9,
          1.02,
        )
      : 0;
  const tone =
    0.94 +
    (broad - 0.5) * 0.3 * age +
    (chalk - 0.3) * 0.32 * age +
    (fleck - 0.5) * 0.07;
  const stain = Math.min(1, splash * 0.75 + eaves * 0.4 + runoff * 0.6) * age;
  return [0.2, 0.24, 0.29].map((wear, channel) =>
    THREE.MathUtils.lerp(
      tone - loss * wear - stain * (0.32 + channel * 0.045),
      1.08 - channel * 0.012,
      repair * 0.65,
    ),
  );
}

export function alfamaPlasterGeometry(
  width,
  height,
  thickness,
  center,
  seed,
  wallWidth,
  wallHeight = height,
  holes = [],
) {
  const geometry = new THREE.BoxGeometry(
    width,
    height,
    thickness,
    Math.max(1, Math.ceil(width / 0.08)),
    Math.max(1, Math.ceil(height / 0.08)),
    1,
  );
  const p = geometry.attributes.position;
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + center[0],
      y = p.getY(i) + center[1];
    const { relief } = finishAt(x, y, seed, wallWidth);
    if (p.getZ(i) > 0) p.setZ(i, p.getZ(i) + relief);
    colors.set(
      alfamaPlasterPigment(x, y, seed, wallWidth, wallHeight, holes),
      i * 3,
    );
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function createAlfamaMasonry(k) {
  const finishes = new Map();
  const crackMaterial = k.material(0x918a7a, 1);
  const grain = k.imageTexture(
    "/public/outdoors/detail-assets/worn-plaster_nor_gl_2k.jpg",
    { data: true, repeat: true },
  );
  return (parent, width, height, thickness, holes, color, seed) => {
    if (!finishes.has(color)) {
      const finish = k.ownMaterial(color.clone());
      finish.name = "Alfama varied limewash";
      finish.vertexColors = true;
      finish.normalMap = grain;
      finish.normalScale.set(0.27, 0.27);
      finish.userData = { ...color.userData, metresPerRepeat: 1.4 };
      finishes.set(color, finish);
    }
    const start = parent.children.length;
    // Reserve the stone reveals; coincident reveal faces flicker after tessellation.
    const reveals = holes.map((hole) => ({
      ...hole,
      width: hole.width + 0.02,
      bottom: Math.max(0, hole.bottom - 0.01),
      top: hole.top + 0.01,
    }));
    k.wallWithOpenings(
      parent,
      width,
      height,
      thickness,
      reveals,
      finishes.get(color),
    );
    for (const piece of parent.children.slice(start)) {
      const dimensions = piece.geometry.parameters;
      piece.geometry = k.ownGeometry(
        alfamaPlasterGeometry(
          dimensions.width,
          dimensions.height,
          dimensions.depth,
          [piece.position.x, piece.position.y],
          seed,
          width,
          height,
          holes,
        ),
      );
    }
    if (width < 2.6 || seed % 4 === 0) return;
    const side = seed % 2 ? -1 : 1;
    const x = side * width * 0.36;
    const startY = 1.75 + (seed % 5) * 0.12;
    const length = 0.38 + (seed % 3) * 0.19;
    const points = Array.from({ length: 8 }, (_, i) => [
      x + side * (0.025 * i + (noise(i * 3.7, 0, seed) - 0.5) * 0.075),
      startY - (i * length) / 7,
    ]);
    const branch = [
      points[3],
      [points[3][0] - side * 0.06, points[3][1] - 0.03],
      [points[3][0] - side * 0.13, points[3][1] - 0.095],
    ];
    for (const line of [points, branch]) {
      const vertices = [];
      for (let i = 1; i < line.length; i++) {
        const [ax, ay] = line[i - 1],
          [bx, by] = line[i];
        const w = 0.0015 + (line.length - i) * 0.00025;
        const z = thickness / 2 + 0.009;
        vertices.push(
          ax - w,
          ay,
          z,
          bx - w,
          by,
          z,
          ax + w,
          ay,
          z,
          bx - w,
          by,
          z,
          bx + w,
          by,
          z,
          ax + w,
          ay,
          z,
        );
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      geometry.computeVertexNormals();
      const crack = k.mesh(
        geometry,
        crackMaterial,
        [0, 0, 0],
        [0, 0, 0],
        parent,
      );
      crack.name = "Fine branching paint fracture";
      crack.castShadow = false;
    }
    k.wearPatch([x, 0.74, thickness / 2 + 0.01], {
      parent,
      width: 0.75,
      height: 1.08,
      strength: 0.42,
      scale: 0.8,
      surface: seed % 3 === 0 ? "peeling-paint" : "worn-plaster",
    });
  };
}
