import * as THREE from "three";
import { buildCutawayTerrain } from "../shared/cutaway-terrain.js";

export function createVineyardGeologyMaterials(k, soil) {
  const schist = k.material(0xf0e3c9, 0.9, 0.04);
  schist.userData.patinaProfile = "none";
  schist.map = k.texture(
    (c, size) => {
      c.fillStyle = "#aaa38f";
      c.fillRect(0, 0, size, size);
      for (let i = 0; i < 1450; i++) {
        const x = k.random() * size;
        const y = k.random() * size;
        c.strokeStyle = ["#d9cdb150", "#efe2c340", "#484c4355", "#9d958035"][
          i % 4
        ];
        c.lineWidth = k.range(0.5, 3.4);
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + 25, y - 17);
        c.lineTo(x + k.range(45, 190), y - k.range(38, 95));
        c.stroke();
      }
      for (let i = 0; i < 22000; i++) {
        c.fillStyle = i % 2 ? "#e5ddc420" : "#161e1c20";
        c.fillRect(k.random() * size, k.random() * size, 1, 1);
      }
    },
    [1, 1],
    1024,
  );
  schist.normalMap = k.m.stone.normalMap;
  schist.normalScale.set(0.65, 0.65);
  schist.userData.metresPerRepeat = 3.2;
  const subsoil = k.ownMaterial(soil.clone());
  subsoil.color.set(0x756048);
  const quartz = k.material(0xd0c6ae, 0.48, 0.05);
  quartz.userData.patinaProfile = "none";
  quartz.side = THREE.DoubleSide;
  const root = k.material(0xa58b5e, 0.96);
  root.userData.patinaProfile = "none";
  return { schist, subsoil, quartz, root };
}

export function buildVineyardCutaway(
  k,
  { width, back, front, profile, rootStations, materials },
) {
  const { schist, subsoil, quartz, root } = materials;
  const boundary = [];
  function side(x, reverse) {
    const points = [];
    const breaks = profile(x);
    for (let n = 0; n < breaks.length - 1; n++) {
      const [z0, y0] = breaks[n],
        [z1, y1] = breaks[n + 1];
      const steps = Math.max(1, Math.ceil(Math.abs(z1 - z0) / 0.25));
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        points.push([x, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t]);
      }
    }
    points.push([x, breaks.at(-1)[1], front]);
    return reverse ? points.reverse() : points;
  }
  boundary.push(...side(-width / 2, false));
  for (let x = -width / 2 + 0.25; x < width / 2; x += 0.25)
    boundary.push([x, profile(x).at(-1)[1], front]);
  boundary.push(...side(width / 2, true));
  for (let x = width / 2 - 0.25; x > -width / 2; x -= 0.25)
    boundary.push([x, profile(x)[0][1], back]);
  buildCutawayTerrain(k, {
    boundary,
    bottom: -8.3,
    soil: subsoil,
    rock: schist,
    relief: (x, y, z) => {
      const foliation = y + z * 0.47 + x * 0.18 + 0.08 * Math.sin(z * 0.7);
      return -0.035 * ((Math.sin(foliation * 12) + 1) / 2) ** 10;
    },
  });
  for (const sign of [-1, 1]) {
    const breaks = profile((sign * width) / 2);
    for (let vein = 0; vein < Math.floor((back - front - 3.5) / 4.3); vein++) {
      const z = front + 0.7 + vein * 4.3 + k.range(-0.3, 0.3);
      const interval = breaks.findIndex(([level]) => level <= z);
      const ceiling =
        Math.min(
          breaks[Math.max(0, interval - 1)][1],
          breaks[Math.max(0, interval)][1],
        ) - 0.65;
      const y = Math.max(-7.95, ceiling - k.range(1.7, 3.1));
      const positions = [],
        uv = [],
        indices = [];
      for (let i = 0; i <= 8; i++) {
        const along = i * 0.36;
        const thickness = i === 0 || i === 8 ? 0.003 : k.range(0.012, 0.047);
        const level = Math.min(
          ceiling - 0.25,
          y + along * 0.42 + k.range(-0.07, 0.07),
        );
        for (const side of [-1, 1]) {
          positions.push(
            sign * (width / 2 + 0.004),
            level + side * thickness,
            z + along,
          );
          uv.push(along, side);
        }
        if (i < 8) {
          const a = i * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      k.mesh(geometry, quartz);
    }
  }
  for (const { z, y } of rootStations) {
    const x = width / 2 + 0.045;
    k.tube(
      [
        [14.1, y + 0.01, z],
        [14.6, y - 0.19, z],
        [x, y - 0.45, z + 0.08],
        [x + 0.01, y - 1.1, z - 0.05],
        [x, y - 1.9, z + 0.22],
      ],
      0.027,
      root,
    );
    for (let branch = 0; branch < 11; branch++) {
      const down = 0.35 + branch * 0.13;
      const sign = branch % 2 ? 1 : -1;
      const end = z + sign * k.range(0.35, 0.9);
      k.tube(
        [
          [x, y - down, z + 0.03],
          [x + 0.02, y - down - 0.22, (z + end) / 2],
          [x, y - down - 0.6, end],
          [x, y - down - 0.9, end + sign * 0.14],
        ],
        0.0035 + (11 - branch) * 0.0007,
        root,
      );
    }
  }
  return { bottom: -8.3, boundary, rootStations, interpretive: true };
}
