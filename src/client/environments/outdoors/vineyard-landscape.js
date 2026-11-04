import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

function noise(x, y) {
  const hash = (a, b) => {
    const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const a = Math.floor(x),
    b = Math.floor(y),
    u = x - a,
    v = y - b;
  const smooth = (t) => t * t * (3 - 2 * t);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(hash(a, b), hash(a + 1, b), smooth(u)),
    THREE.MathUtils.lerp(hash(a, b + 1), hash(a + 1, b + 1), smooth(u)),
    smooth(v),
  );
}

function leafCluster(k, count, radius) {
  const pieces = [],
    matrix = new THREE.Matrix4(),
    rotation = new THREE.Quaternion();
  for (let i = 0; i < count; i++) {
    const leaf = new THREE.PlaneGeometry(radius * 0.78, radius);
    const uv = leaf.attributes.uv;
    for (let n = 0; n < uv.count; n++)
      uv.setXY(n, 0.038 + uv.getX(n) * 0.431, 0.13 + uv.getY(n) * 0.773);
    rotation.setFromEuler(
      new THREE.Euler(k.range(-1.5, 1.5), k.range(0, 6.28), k.range(-2, 2)),
    );
    matrix.compose(
      new THREE.Vector3(
        k.range(-0.5, 0.5),
        k.range(-0.32, 0.38),
        k.range(-0.3, 0.3),
      ),
      rotation,
      new THREE.Vector3(1, 1, 1),
    );
    leaf.applyMatrix4(matrix);
    pieces.push(leaf);
  }
  const geometry = mergeGeometries(pieces);
  pieces.forEach((piece) => piece.dispose());
  return geometry;
}

/** Contoured parcels, uncultivated drainage folds and a wooded river margin. */
export const vineyardRiverBank = (x) =>
  -242 + 27 * Math.sin(x * 0.008) + 11 * Math.sin(x * 0.022 + 0.8);

export function buildVineyardLandscape(k, earth, { railwayBounds } = {}) {
  const bank = vineyardRiverBank;
  const height = (x, d) => {
    const ridge =
      0.48 +
      0.84 * Math.exp(-(((x + 310) / 240) ** 2)) +
      0.95 * Math.exp(-(((x - 430) / 290) ** 2)) +
      noise(x * 0.0036, d * 0.0025 + 4) * 0.4;
    const fold = noise(x * 0.014, d * 0.011) - 0.5;
    return (
      -27.3 +
      (d * 0.57 * ridge) / (1 + (d / 360) ** 2) +
      Math.min(d / 35, 1) *
        (fold * 10 + (noise(x * 0.058, d * 0.046) - 0.5) * 2)
    );
  };
  const point = (x, d) => [x, height(x, d), bank(x) - d];
  const woodland = (x, d) =>
    noise(x * 0.012 + 30, d * 0.022 + 11) > 0.64 ||
    (d < 12 && noise(x * 0.026, 15) > 0.28);
  const p = [],
    uv = [],
    colors = [],
    index = [],
    color = new THREE.Color();
  const columns = 420,
    rows = 170;
  for (let row = 0; row <= rows; row++) {
    const d = (row / rows) * 390;
    for (let column = 0; column <= columns; column++) {
      const x = -840 + (column / columns) * 1680;
      p.push(...point(x, d));
      uv.push(x / 3, d / 3);
      color.set(woodland(x, d) ? 0x699947 : 0xa5ad71);
      color.multiplyScalar(0.82 + noise(x * 0.065, d * 0.07) * 0.3);
      colors.push(color.r, color.g, color.b);
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column;
        index.push(
          a,
          a + 1,
          a + columns + 1,
          a + 1,
          a + columns + 2,
          a + columns + 1,
        );
      }
    }
  }
  const ground = new THREE.BufferGeometry();
  ground.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  ground.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  ground.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  ground.setIndex(index);
  ground.computeVertexNormals();
  const soil = k.ownMaterial(earth.clone());
  soil.color.set(0x9c906a);
  soil.vertexColors = true;
  soil.normalScale.set(0.32, 0.32);
  soil.userData.metresPerRepeat = 3.6;
  k.mesh(ground, soil).name = "Continuous Douro hillside";

  const planting = [],
    treeLeaves = [],
    branches = [];
  const foliage = k.ownMaterial(
    new THREE.MeshLambertMaterial({
      map: k.leafMaterial("broadleaf").map,
      side: THREE.DoubleSide,
      alphaTest: 0.02,
      alphaHash: true,
    }),
  );
  foliage.userData.photographicFoliage = "broadleaf";
  const bark = k.surfaceMaterial("weathered-wood", {
    color: 0x77715a,
    scale: 0.7,
  });
  const wallPieces = [],
    wall = k.ownMaterial(k.m.stone.clone());
  wall.color.set(0x958d70);
  function branch(a, b, radius) {
    const from = new THREE.Vector3(...a),
      to = new THREE.Vector3(...b),
      delta = to.clone().sub(from);
    const rotation = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        delta.clone().normalize(),
      ),
    );
    branches.push({
      position: from.add(to).multiplyScalar(0.5).toArray(),
      rotation: [rotation.x, rotation.y, rotation.z],
      scale: [radius, delta.length(), radius],
    });
  }
  for (let band = 0; band < 6; band++) {
    const near = 14 + band * 57;
    let left = -780;
    while (left < 780) {
      const width = k.range(66, 145),
        end = Math.min(left + width, 800),
        spacing = k.range(2.7, 3.5),
        phase = k.range(0, 2),
        pigment = new THREE.Color().setHSL(
          k.range(0.2, 0.25),
          k.range(0.28, 0.43),
          k.range(0.68, 0.86),
        );
      for (let row = near + phase; row < near + 50; row += spacing) {
        for (let x = left + 4; x < end - 3; x += 1.25) {
          const d =
            row +
            1.5 * Math.sin(x * 0.024 + band) +
            noise(x * 0.04, row * 0.03) * 2;
          if (woodland(x, d)) continue;
          const position = point(x + k.range(-0.16, 0.16), d);
          position[1] += 0.78;
          planting.push({
            position,
            rotation: [k.range(-0.1, 0.1), k.range(-0.35, 0.35), 0],
            scale: [k.range(1.2, 1.5), k.range(1, 1.3), 1.5],
            color: pigment.clone().multiplyScalar(k.range(0.82, 1.14)),
          });
          if (Math.round((row - near) / spacing) % 3 === 0) {
            const base = point(x, d - 0.7);
            base[1] += 0.15;
            wallPieces.push({
              position: base,
              rotation: [
                0,
                0,
                Math.atan(height(x + 0.5, d - 0.7) - height(x - 0.5, d - 0.7)),
              ],
              scale: [1.3, 0.32, 0.34],
              color: 0xb7ad93,
            });
          }
        }
      }
      left = end;
    }
  }
  for (let d = 4; d < 365; d += 6.4)
    for (let x = -760; x < 780; x += 7.6) {
      if (!woodland(x, d) || k.random() < 0.38) continue;
      const px = x + k.range(-3.6, 3.6),
        pd = d + k.range(-2.8, 2.8),
        [tx, ty, tz] = point(px, pd),
        h = k.range(5.2, 9.5),
        spread = h * k.range(0.35, 0.48);
      const firstBranch = branches.length,
        firstLeaf = treeLeaves.length;
      branch([tx, ty - 0.15, tz], [tx + 0.12, ty + h * 0.78, tz], h * 0.017);
      for (let limb = 0; limb < 7; limb++) {
        const a = limb * 2.4 + k.range(-0.3, 0.3),
          reach = spread * k.range(0.4, 0.87),
          end = [
            tx + Math.cos(a) * reach,
            ty + h * k.range(0.55, 0.9),
            tz + Math.sin(a) * reach,
          ];
        branch([tx, ty + h * 0.4, tz], end, h * 0.009);
        for (let clump = 0; clump < 9; clump++)
          treeLeaves.push({
            position: [
              end[0] + k.range(-spread * 0.45, spread * 0.45),
              end[1] + k.range(-spread * 0.28, spread * 0.35),
              end[2] + k.range(-spread * 0.45, spread * 0.45),
            ],
            scale: [spread * 0.65, spread * 0.65, spread * 0.65],
            rotation: [k.range(-0.3, 0.3), k.range(0, 6.28), 0],
            color: new THREE.Color(0xb4ca87).multiplyScalar(
              k.range(0.76, 1.12),
            ),
          });
      }
      // Keep other seeded planting unchanged while clearing the whole crown.
      if (
        railwayBounds &&
        px + spread * 1.8 > railwayBounds.left &&
        px - spread * 1.8 < railwayBounds.right &&
        pd - spread * 1.8 < 2.7
      ) {
        branches.length = firstBranch;
        treeLeaves.length = firstLeaf;
      }
    }
  const vineCluster = leafCluster(k, 44, 0.42),
    treeCluster = leafCluster(k, 18, 0.34);
  k.instanceCells(vineCluster, foliage, planting, {
    shadow: false,
    ...k.foliageImpostor(vineCluster, foliage),
    farDistance: 130,
  }).name = "Contoured vineyard parcels";
  k.instanceCells(treeCluster, foliage, treeLeaves, {
    shadow: false,
    ...k.foliageImpostor(treeCluster, foliage),
    farDistance: 130,
  }).name = "Woodland leaves and open crown silhouettes";
  k.instanceCells(new THREE.CylinderGeometry(0.4, 1, 1, 5), bark, branches, {
    shadow: false,
  });
  k.instanceCells(new THREE.BoxGeometry(1, 1, 1), wall, wallPieces, {
    shadow: false,
  });
  return { plants: planting.length, woodlandClusters: treeLeaves.length };
}
