import * as THREE from "three";
import {
  domusRooms,
  domusWalls,
  wallSegments,
  DOMUS_WALL_HEIGHT,
} from "./domus-layout.js";

export function buildDomusArchitecture(kit, m) {
  const walls = kit.sub();
  walls.name = "domus-walls";
  walls.userData.batchRoot = true;
  const roofs = kit.sub();
  roofs.name = "domus-roofs";
  roofs.userData.batchRoot = true;
  const obstacles = [];
  const obstacle = (x, z, width, depth) =>
    obstacles.push([
      x - width / 2,
      x + width / 2,
      z - depth / 2,
      z + depth / 2,
    ]);
  const floor = (x1, x2, z1, z2, mat, y = 0) => {
    const thickness = y > 0 ? y : y + 0.3;
    const geometry = new THREE.BoxGeometry(x2 - x1, thickness, z2 - z1);
    const { position, normal, uv } = geometry.attributes;
    for (let i = 0; i < uv.count; i++) {
      const side = Math.abs(normal.getX(i)) > 0.5;
      const horizontal = Math.abs(normal.getY(i)) > 0.5;
      uv.setXY(
        i,
        ((side ? position.getZ(i) : position.getX(i)) +
          (side ? (z1 + z2) / 2 : (x1 + x2) / 2)) /
          4,
        (horizontal
          ? position.getZ(i) + (z1 + z2) / 2
          : position.getY(i) + y - thickness / 2) / 4,
      );
    }
    return kit.mesh(geometry, mat, [
      (x1 + x2) / 2,
      y - thickness / 2,
      (z1 + z2) / 2,
    ]);
  };
  kit.box([32.2, 0.2, 45.2], [1, -0.4, 1], m.stone, undefined, 0);
  for (const room of domusRooms) {
    const [x1, x2, z1, z2] = room.bounds;
    const mat = room.floor === "red" ? m.signinum : m.mosaic;
    if (room.id === "atrium") {
      floor(x1, -1.65, z1, z2, mat);
      floor(1.65, x2, z1, z2, mat);
      floor(-1.65, 1.65, z1, 4, mat);
      floor(-1.65, 1.65, 8, z2, mat);
    } else if (room.id === "garden") {
      floor(x1, -4.45, z1, z2, mat);
      floor(4.45, x2, z1, z2, mat);
      floor(-4.45, 4.45, -7, z2, mat);
      floor(-4.45, 4.45, z1, -15, mat);
    } else {
      floor(x1, x2, z1, z2, mat);
    }
    if (room.floor === "mosaic") {
      for (const inset of [0.24, 0.43]) {
        const width = inset < 0.3 ? 0.075 : 0.025;
        for (const x of [x1 + inset, x2 - inset - width])
          floor(x, x + width, z1 + inset, z2 - inset, m.mosaicBorder, 0.006);
        for (const z of [z1 + inset, z2 - inset - width])
          floor(
            x1 + inset + width,
            x2 - inset - width,
            z,
            z + width,
            m.mosaicBorder,
            0.006,
          );
      }
    }
    if (!["atrium", "garden"].includes(room.id)) {
      kit.box(
        [x2 - x1, 0.15, z2 - z1],
        [(x1 + x2) / 2, 3.86, (z1 + z2) / 2],
        m.cream,
        roofs,
        0,
      );
      for (let z = z1 + 0.4; z < z2; z += 0.82)
        kit.box(
          [x2 - x1, 0.18, 0.14],
          [(x1 + x2) / 2, 3.67, z],
          m.wood,
          roofs,
          0.01,
        );
    }
  }

  for (const wall of domusWalls) {
    const center = (wall.start + wall.end) / 2;
    const xAxis = wall.axis === "x";
    const group = kit.sub(
      xAxis ? [center, 0, wall.fixed] : [wall.fixed, 0, center],
      xAxis ? 0 : -Math.PI / 2,
      walls,
    );
    const holes = wall.openings.map((o) => ({
      x: o.center - center,
      width: o.width,
      bottom: 0,
      top: o.height,
    }));
    const service = (xAxis && wall.start >= 7) || (!xAxis && wall.fixed >= 7);
    const mat = service ? m.cream : m.red;
    kit.wallWithOpenings(
      group,
      wall.end - wall.start,
      DOMUS_WALL_HEIGHT,
      0.3,
      holes,
      mat,
    );
    for (const side of [-1, 1]) {
      const dado = kit.sub([0, 0, side * 0.153], 0, group);
      kit.wallWithOpenings(
        dado,
        wall.end - wall.start,
        0.62,
        0.009,
        holes,
        service ? m.signinum : m.black,
      );
      const cornice = kit.sub([0, 3.2, side * 0.153], 0, group);
      kit.box(
        [wall.end - wall.start, 0.055, 0.065],
        [0, 0, 0],
        m.ochre,
        cornice,
      );
      kit.box(
        [wall.end - wall.start, 0.08, 0.09],
        [0, 0.36, 0],
        m.cream,
        cornice,
      );
    }
    for (const [start, end] of wallSegments(wall)) {
      const mid = (start + end) / 2;
      obstacle(
        xAxis ? mid : wall.fixed,
        xAxis ? wall.fixed : mid,
        xAxis ? end - start : 0.3,
        xAxis ? 0.3 : end - start,
      );
      if (!service && end - start > 1.2)
        for (const side of [-1, 1]) {
          const count = Math.max(1, Math.floor((end - start) / 2.6));
          for (let i = 0; i < count; i++) {
            const x = start - center + ((i + 0.5) * (end - start)) / count;
            const w = (end - start) / count - 0.55;
            for (const sign of [-1, 1])
              kit.box(
                [0.021, 2.25, 0.005],
                [x + (sign * w) / 2, 1.85, side * 0.159],
                m.ochre,
                group,
                0,
              );
            for (const y of [0.735, 2.975])
              kit.box(
                [w, 0.021, 0.005],
                [x, y, side * 0.159],
                m.ochre,
                group,
                0,
              );
          }
        }
    }
    for (const opening of wall.openings) {
      const x = opening.center - center;
      for (const sign of [-1, 1])
        kit.box(
          [0.1, opening.height, 0.38],
          [x + sign * (opening.width / 2 + 0.04), opening.height / 2, 0],
          m.stone,
          group,
        );
      kit.box(
        [opening.width + 0.24, 0.14, 0.4],
        [x, opening.height + 0.07, 0],
        m.stone,
        group,
      );
      kit.box([opening.width, 0.024, 0.4], [x, 0.012, 0], m.stone, group);
      if (wall.axis === "z" && [-7, 9].includes(wall.fixed)) {
        const width = opening.width - 0.1,
          height = opening.height - 0.09;
        const leaf = kit.sub(
          [x - opening.width / 2 + 0.04, 0.04, 0],
          wall.fixed === 9 ? Math.PI / 2 : -Math.PI / 2,
          group,
        );
        for (let i = 0; i < 6; i++)
          kit.box(
            [width / 6 - 0.004, height, 0.055],
            [((i + 0.5) * width) / 6, height / 2, 0],
            m.wood,
            leaf,
            0.003,
          );
        for (const y of [0.3, height - 0.3])
          kit.box(
            [width, 0.085, 0.045],
            [width / 2, y, -0.045],
            m.wood,
            leaf,
            0.005,
          );
        kit.ring(
          0.045,
          0.008,
          [width - 0.15, 1.05, 0.045],
          m.bronze,
          leaf,
          [0, 0, 0],
        );
        leaf.updateWorldMatrix(true, true);
        const bounds = new THREE.Box3().setFromObject(leaf);
        obstacle(
          (bounds.min.x + bounds.max.x) / 2,
          (bounds.min.z + bounds.max.z) / 2,
          bounds.max.x - bounds.min.x,
          bounds.max.z - bounds.min.z,
        );
      }
    }
  }

  const sightWalls = obstacles.slice();
  // Roof openings and basins are holes in the construction, not dark overlays.
  const roofStrip = (bounds, y, slope, axis = "x") => {
    const [x1, x2, z1, z2] = bounds;
    const g = kit.sub([(x1 + x2) / 2, y, (z1 + z2) / 2], 0, roofs);
    g.rotation[axis] = slope;
    kit.box([x2 - x1, 0.14, z2 - z1], [0, 0, 0], m.clay, g, 0);
    for (let x = x1 + 0.2; x < x2; x += 0.55)
      kit.box(
        [0.13, 0.2, z2 - z1],
        [x - (x1 + x2) / 2, -0.13, 0],
        m.wood,
        g,
        0,
      );
    for (let z = z1 + 0.25; z < z2; z += 0.52)
      kit.box(
        [x2 - x1, 0.05, 0.025],
        [0, 0.09, z - (z1 + z2) / 2],
        m.ochre,
        g,
        0,
      );
  };
  roofStrip([-7, -2.15, 0, 12], 4.55, -0.17, "z");
  roofStrip([2.15, 7, 0, 12], 4.55, 0.17, "z");
  roofStrip([-2.15, 2.15, 0, 3.65], 4.38, -0.17);
  roofStrip([-2.15, 2.15, 8.35, 12], 4.38, 0.17);
  for (const x of [-2.15, 2.15])
    kit.box([0.22, 0.25, 12], [x, 4.05, 6], m.wood, roofs);
  for (const z of [3.65, 8.35])
    kit.box([4.5, 0.25, 0.22], [0, 4.05, z], m.wood, roofs);
  // High perimeter carries the atrium roof above the surrounding rooms.
  for (const x of [-7, 7])
    kit.box([0.3, 0.95, 12], [x, 4.25, 6], m.cream, roofs);
  for (const z of [0, 12])
    kit.box([14, 0.95, 0.3], [0, 4.25, z], m.cream, roofs);
  roofStrip([-13.2, -7, -21.2, 17.2], 4.42, 0.12, "z");
  roofStrip([7, 15.2, -21.2, 17.2], 4.5, -0.1, "z");
  roofStrip([-7, 7, 12, 17.2], 4.25, 0.12);
  roofStrip([-7, 7, -21.2, -17], 4.18, 0.1);
  roofStrip([-7, 7, -5, 0], 4.16, 0.02);
  for (const bounds of [
    [-7, -4.35, -17, -5],
    [4.35, 7, -17, -5],
    [-4.35, 4.35, -7, -5],
    [-4.35, 4.35, -17, -15],
  ])
    roofStrip(bounds, 3.63, 0);
  const column = (x, z) => {
    kit.box([0.58, 0.14, 0.58], [x, 0.07, z], m.stone);
    const shaft = kit.lathe(
      [
        [0.28, 0],
        [0.28, 0.08],
        [0.21, 0.16],
        [0.18, 0.25],
        [0.165, 2.98],
        [0.22, 3.06],
        [0.28, 3.13],
      ],
      [x, 0.14, z],
      m.cream,
      undefined,
      96,
    );
    const vertices = shaft.geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const y = vertices.getY(i);
      if (y < 0.25 || y > 2.98) continue;
      const x = vertices.getX(i),
        z = vertices.getZ(i);
      const radius = Math.hypot(x, z);
      const angle = Math.atan2(z, x);
      const flute = (0.008 * (1 + Math.cos(angle * 16))) / 2;
      vertices.setXYZ(i, x * (1 - flute / radius), y, z * (1 - flute / radius));
    }
    shaft.geometry.computeVertexNormals();
    kit.cylinder(0.185, 0.9, [x, 0.85, z], m.red);
    kit.box([0.57, 0.14, 0.57], [x, 3.34, z], m.cream);
    obstacle(x, z, 0.6, 0.6);
  };
  for (const x of [-4.35, 4.35])
    for (const z of [-7, -9.7, -12.3, -15]) column(x, z);
  for (const x of [-1.45, 1.45]) for (const z of [-7, -15]) column(x, z);
  for (const x of [-4.35, 4.35])
    kit.box([0.34, 0.26, 8.6], [x, 3.49, -11], m.cream, roofs);
  for (const z of [-7, -15])
    kit.box([9.2, 0.26, 0.34], [0, 3.49, z], m.cream, roofs);

  for (const x of [-1.7, 1.7])
    kit.box([0.18, 0.31, 4.3], [x, -0.07, 6], m.stone);
  for (const z of [3.95, 8.05])
    kit.box([3.6, 0.31, 0.18], [0, -0.07, z], m.stone);
  floor(-1.65, 1.65, 4, 8, m.signinum, -0.29);
  obstacle(0, 6, 3.7, 4.4);
  // Garden paths separate beds; a visitor can cross without walking through planting.
  floor(-4.35, 4.35, -15, -7, m.signinum, -0.035);
  for (const x of [-2.5, 2.5])
    for (const z of [-8.85, -13.15]) {
      kit.box([2.7, 0.14, 2.7], [x, 0.015, z], m.soil);
      obstacle(x, z, 2.75, 2.75);
      for (const dx of [-1.4, 1.4])
        kit.box([0.1, 0.15, 2.9], [x + dx, 0.07, z], m.clay);
      for (const dz of [-1.4, 1.4])
        kit.box([2.9, 0.15, 0.1], [x, 0.07, z + dz], m.clay);
    }
  floor(-14.8, -13, -21, 17, m.signinum);
  floor(15, 16.8, -21, 17, m.signinum);
  for (const x of [-14.85, 16.85])
    kit.box([0.22, 3.8, 39], [x, 1.9, -2], m.cream, walls, 0);
  floor(-15, 17, 17, 18.275, m.signinum, -0.04);
  floor(-15, 17, 18.275, 23.4, m.signinum, -0.185);
  for (let x = -15; x < 17; x += 0.75)
    for (let z = 18.4; z < 23; z += 0.85) {
      const left = x + 0.005,
        right = Math.min(17, x + 0.715),
        back = Math.max(18.275, z + (Math.floor(x) % 2) * 0.06 - 0.4),
        front = z + (Math.floor(x) % 2) * 0.06 + 0.4;
      kit.box(
        [right - left, 0.13, front - back],
        [(left + right) / 2, -0.12, (back + front) / 2],
        m.black,
        undefined,
        0.045,
      );
    }
  kit.box([32, 0.2, 0.25], [1, -0.05, 18.15], m.stone);
  for (const x of [-1.25, 1.25]) {
    const sign = Math.sign(x);
    const door = kit.sub([x, 0, 17], (sign * Math.PI) / 2, walls);
    kit.box([1.18, 2.48, 0.08], [-sign * 0.59, 1.24, 0], m.wood, door);
    for (const y of [0.4, 1.1, 2.08]) {
      kit.box([1.1, 0.085, 0.025], [-sign * 0.59, y, -0.053], m.iron, door);
      for (let i = 0; i < 5; i++)
        kit.sphere(
          0.025,
          [-sign * (0.14 + i * 0.22), y, -0.07],
          m.bronze,
          door,
          [1, 1, 0.35],
        );
    }
    kit.ring(
      0.09,
      0.014,
      [-sign * 0.86, 1.18, -0.07],
      m.bronze,
      door,
      [0, 0, 0],
    );
    obstacle(x, 17 - sign * -sign * 0.59, 0.12, 1.18);
  }
  return {
    obstacle,
    obstacles,
    sightWalls,
    floor,
    bounds: [-14.6, 16.6, -20.7, 22.6],
    walls,
    roofs,
  };
}
