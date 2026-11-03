import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

function vineLeafGeometry(near, anchor) {
  const geometry = new THREE.PlaneGeometry(1, 1, near ? 5 : 2, near ? 5 : 3);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i);
    p.setXYZ(
      i,
      x + 0.5 - anchor[0],
      y + 0.5 - anchor[1],
      0.03 * Math.sin(x * 4) * Math.sin(y * 3) + 0.04 * y * y,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

function shootCurve(sign, index, habit) {
  const x = sign * (0.16 + index * 0.2);
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(x, 0.86, 0),
    new THREE.Vector3(x + 0.08 * sign, 1.15, 0.07),
    new THREE.Vector3(
      x + 0.05 * sign,
      1.5 + 0.09 * Math.sin(index + habit),
      -0.02,
    ),
  ]);
}

function vineWoodGeometry(habit, detailed = true) {
  const pieces = [];
  const branches = [
    [
      [0, 0, 0],
      [0.025, 0.27, -0.025],
      [-0.035, 0.5, 0.018],
      [0.025, 0.8, 0],
    ],
    [
      [0, 0.68, 0],
      [-0.19, 0.87, 0.025],
      [-0.48, 0.85, 0.012],
      [-0.72, 0.99, 0.02],
    ],
    [
      [0, 0.76, 0],
      [0.22, 0.87, -0.04],
      [0.47, 0.85, -0.018],
      [0.69, 1.04, 0.01],
    ],
  ];
  branches.forEach((points, index) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(
        ([x, y, z]) =>
          new THREE.Vector3(
            x + Math.sin(y * 7 + habit) * 0.025,
            y,
            z + habit * 0.012 * y,
          ),
      ),
    );
    const rings = detailed ? 18 : 7,
      sides = detailed ? 12 : 5;
    const tube = new THREE.TubeGeometry(
      curve,
      rings,
      index ? 0.016 : 0.04,
      sides,
      false,
    );
    const p = tube.attributes.position;
    for (let ring = 0; ring <= rings; ring++) {
      const t = ring / rings,
        center = curve.getPointAt(t);
      for (let side = 0; side <= sides; side++) {
        const n = ring * (sides + 1) + side,
          angle = (side / sides) * Math.PI * 2,
          taper =
            (index ? 1 - t * 0.48 : 1.24 - t * 0.4) *
            (1 +
              0.13 * Math.sin(angle * 5 + t * 3 + habit) +
              0.07 * Math.sin(angle * 9 - t * 5));
        p.setXYZ(
          n,
          center.x + (p.getX(n) - center.x) * taper,
          center.y + (p.getY(n) - center.y) * taper,
          center.z + (p.getZ(n) - center.z) * taper,
        );
        tube.attributes.uv.setXY(n, side / sides, t * curve.getLength() * 3.5);
      }
    }
    tube.computeVertexNormals();
    pieces.push(tube);
  });
  for (const sign of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const curve = shootCurve(sign, i, habit);
      pieces.push(
        new THREE.TubeGeometry(
          curve,
          detailed ? 5 : 3,
          0.0045,
          detailed ? 5 : 3,
          false,
        ),
      );
    }
  }
  const result = mergeGeometries(pieces);
  pieces.forEach((p) => p.dispose());
  return result;
}

export function createVineyardVines(k) {
  const leaves = [
      { near: [], far: [] },
      { near: [], far: [] },
    ],
    berries = [],
    trunks = [[], [], []],
    stakes = [],
    petioles = [];
  const ties = [];
  const shoots = Array.from({ length: 3 }, (_, habit) =>
    Array.from({ length: 6 }, (_, branch) =>
      shootCurve(branch < 3 ? -1 : 1, branch % 3, habit),
    ),
  );
  const leaf = k.material(0xd3f5b5, 0.72);
  leaf.side = THREE.DoubleSide;
  leaf.name = "Photographic grape leaves with palmate veins";
  leaf.userData.patinaProfile = "none";
  leaf.userData.photographicFoliage = "grape";
  leaf.userData.leafAnchor = [0.513, 0.31];
  leaf.map = k.imageTexture(
    "/public/outdoors/detail-assets/douro/leaf-green-detail.png",
  );
  leaf.alphaTest = 0.4;
  leaf.alphaToCoverage = true;
  leaf.bumpMap = leaf.map;
  leaf.bumpScale = 0.0007;
  const time = { value: 0 };
  leaf.onBeforeCompile = function (shader) {
    shader.uniforms.vineTime = time;
    shader.uniforms.vineAnchor = {
      value: new THREE.Vector2(...this.userData.leafAnchor),
    };
    shader.vertexShader =
      "uniform float vineTime;\nuniform vec2 vineAnchor;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      vec3 root = instanceMatrix[3].xyz;
      float breeze = sin(vineTime * .9 + root.x * 1.3 + root.z * .7)
        + .32 * sin(vineTime * 1.7 + root.y * 7.0 + root.x * .8);
      float flex = length(uv - vineAnchor);
      transformed.z += breeze * .027 * flex * flex;
    `,
    );
  };
  leaf.customProgramCacheKey = () => "vineyard-leaf-breeze-v2";
  const autumn = k.ownMaterial(leaf.clone());
  autumn.map = k.imageTexture(
    "/public/outdoors/detail-assets/douro/leaf-autumn.png",
  );
  autumn.bumpMap = autumn.map;
  autumn.userData.leafAnchor = [0.5, 0.1];
  autumn.onBeforeCompile = leaf.onBeforeCompile;
  autumn.customProgramCacheKey = leaf.customProgramCacheKey;
  k.animations.push((_, elapsed) => {
    time.value = elapsed;
  });
  const fruit = k.material(0xffffff, 0.62);
  fruit.name = "Dark grapes with restrained waxy bloom";
  fruit.map = k.texture(
    (c, s) => {
      c.fillStyle = "#a5a3ac";
      c.fillRect(0, 0, s, s);
      for (let i = 0; i < 3000; i++) {
        c.fillStyle = i % 3 ? "#e6dbed20" : "#4e435740";
        c.beginPath();
        c.arc(k.random() * s, k.random() * s, k.range(0.5, 3), 0, Math.PI * 2);
        c.fill();
      }
    },
    [1, 1],
    128,
  );
  const wood = k.surfaceMaterial("weathered-wood", {
    color: 0xf5d9b0,
    scale: 0.22,
    normalStrength: 0.55,
  });
  delete wood.userData.metresPerRepeat;
  const stake = k.ownMaterial(k.m.cedar.clone());
  stake.color.set(0x8b8067);
  const greens = [
    0xffffff, 0xe7f5bf, 0xe4f0ce, 0xc9e3ac, 0xf1f5cc, 0xd4eabb, 0xe3f4bf,
  ];
  const purples = [0x34313f, 0x3e354a, 0x494256, 0x3d3e54, 0x514359];
  function stem(start, end, radius = 0.0016) {
    const vector = end.clone().sub(start);
    const rotation = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        vector.clone().normalize(),
      ),
    );
    petioles.push({
      position: start.clone().add(end).multiplyScalar(0.5).toArray(),
      rotation: [rotation.x, rotation.y, rotation.z],
      scale: [radius, vector.length(), radius],
    });
  }

  function bunch(position, scale = 1) {
    const lean = k.range(-0.035, 0.035),
      tiers = 10;
    for (let tier = 0; tier < tiers; tier++) {
      const radius =
        0.06 * Math.sin(((tier + 2) / (tiers + 3)) * Math.PI) * scale;
      const count = Math.max(3, Math.round((radius * 6.28) / (0.022 * scale)));
      for (let n = 0; n < count; n++) {
        const a = (n / count) * Math.PI * 2 + tier * 0.71;
        const r = k.range(0.009, 0.0125) * scale;
        berries.push({
          position: [
            position[0] + Math.cos(a) * radius + (lean * tier) / tiers,
            position[1] - tier * 0.023 * scale + k.range(-0.005, 0.005),
            position[2] + Math.sin(a) * radius,
          ],
          scale: [r, r * k.range(1, 1.22), r],
          color: purples[Math.floor(k.random() * purples.length)],
        });
      }
    }
  }
  function vine(x, y, z, { detail = true, angle = 0, scale = 1 } = {}) {
    const variant = Math.floor(k.random() * 3);
    const rotation = new THREE.Euler(0, angle, k.range(-0.045, 0.045));
    const transform = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(rotation),
      new THREE.Vector3(scale, scale, scale),
    );
    trunks[variant].push({
      position: [x, y, z],
      rotation: [rotation.x, rotation.y, rotation.z],
      scale: [scale, scale, scale],
    });
    const count = detail ? 144 : 42;
    for (let i = 0; i < count; i++) {
      const branch = i % 6,
        level = Math.floor(i / 6) / (count / 6);
      const root = shoots[variant][branch].getPoint(0.08 + level * 0.88);
      const tip = root
        .clone()
        .add(
          new THREE.Vector3(
            k.range(-0.16, 0.16),
            k.range(-0.03, 0.07),
            (i % 2 ? -1 : 1) * k.range(0.08, 0.22),
          ),
        );
      root.applyMatrix4(transform);
      tip.applyMatrix4(transform);
      stem(root, tip);
      const size = k.range(0.14, 0.23) * scale;
      leaves[k.random() < 0.025 ? 1 : 0][detail ? "near" : "far"].push({
        position: tip.toArray(),
        rotation: [
          k.range(-1.25, 1.1),
          angle + k.range(-2.7, 2.7),
          k.range(-1.7, 1.7),
        ],
        scale: [size, size, size],
        color: greens[Math.floor(k.random() * greens.length)],
      });
    }
    if (detail) {
      for (const offset of [-0.52, -0.22, 0.19, 0.5]) {
        const px = x + offset * Math.cos(angle) * scale,
          pz = z - offset * Math.sin(angle) * scale,
          h = y + k.range(0.83, 0.96) * scale;
        bunch([px, h, pz + 0.09], scale * k.range(0.8, 1.13));
        stem(
          new THREE.Vector3(px, y + 0.91 * scale, pz),
          new THREE.Vector3(px, h, pz + 0.09),
          0.002,
        );
        ties.push({
          position: [px, y + 0.87 * scale, pz],
          rotation: [Math.PI / 2, 0, 0],
          scale: [0.012, 0.014, 0.012],
        });
      }
    }
  }
  function post(x, y, z, height = 1.75) {
    stakes.push({
      position: [x, y + height / 2, z],
      scale: [0.06, height, 0.055],
      rotation: [0, 0, k.range(-0.035, 0.035)],
    });
  }
  function finish() {
    trunks.forEach((entries, i) =>
      k.instanceCells(vineWoodGeometry(i), wood, entries, {
        cellSize: 8,
        farGeometry: vineWoodGeometry(i, false),
        farDistance: 22,
      }),
    );
    for (const [index, material] of [leaf, autumn].entries())
      for (const key of ["near", "far"]) {
        const foliage = k.instanceCells(
          vineLeafGeometry(key === "near", material.userData.leafAnchor),
          material,
          leaves[index][key],
          { cellSize: 12 },
        );
        foliage.name = `Individual grape leaves — ${index ? "autumn" : "green"} ${key}`;
      }
    k.instanceCells(
      new THREE.CylinderGeometry(1, 1, 1, 4),
      k.material(0x807d42, 1),
      petioles,
      { cellSize: 12 },
    );
    k.instanceCells(new THREE.SphereGeometry(1, 8, 5), fruit, berries, {
      cellSize: 6,
      farGeometry: new THREE.IcosahedronGeometry(1, 0),
      farDistance: 16,
    });
    k.instanceCells(new THREE.BoxGeometry(1, 1, 1), stake, stakes, {
      cellSize: 12,
    });
    k.instanceCells(new THREE.TorusGeometry(1, 0.12, 4, 10), k.m.iron, ties, {
      cellSize: 12,
    });
    return {
      vines: trunks.reduce((sum, a) => sum + a.length, 0),
      leaves: leaves.reduce(
        (sum, group) => sum + group.near.length + group.far.length,
        0,
      ),
      berries: berries.length,
    };
  }
  return { vine, post, bunch, finish };
}
