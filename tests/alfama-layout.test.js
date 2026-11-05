import test from "node:test";
import assert from "node:assert/strict";
import {
  alfamaHouses,
  alfamaFlights,
  alfamaLocalPoint,
  alfamaPartyWalls,
  alfamaInfills,
} from "../src/client/environments/outdoors/alfama-layout.js";

test("Alfama frontages differ without overlapping thick house walls", () => {
  const footprints = alfamaHouses.map(({ position, angle, width, depth }) =>
    [
      [-width / 2 - 0.2, 0.2],
      [width / 2 + 0.2, 0.2],
      [width / 2 + 0.2, -depth - 0.2],
      [-width / 2 - 0.2, -depth - 0.2],
    ].map(([x, z]) => {
      const p = alfamaLocalPoint(position, angle, [x, 0, z]);
      return [p[0], p[2]];
    }),
  );
  for (let i = 0; i < footprints.length; i++) {
    for (let j = i + 1; j < footprints.length; j++) {
      if (
        alfamaPartyWalls.some(
          ({ owner, neighbor }) => owner === i && neighbor === j,
        )
      )
        continue;
      const a = footprints[i],
        b = footprints[j];
      const separated = [a, b].some((polygon) =>
        polygon.some((point, index) => {
          const next = polygon[(index + 1) % polygon.length];
          const axis = [point[1] - next[1], next[0] - point[0]];
          const project = (shape) =>
            shape.map((p) => p[0] * axis[0] + p[1] * axis[1]);
          const aa = project(a),
            bb = project(b);
          return (
            Math.max(...aa) <= Math.min(...bb) ||
            Math.max(...bb) <= Math.min(...aa)
          );
        }),
      );
      assert.ok(separated, `House walls overlap: ${i + 1}, ${j + 1}`);
    }
  }
  assert.ok(
    new Set(
      alfamaHouses.map(({ angle }) => Math.round((angle * 180) / Math.PI)),
    ).size >= 7,
  );
});

test("Attached Alfama households share exactly one coincident, full-depth wall", () => {
  assert.equal(alfamaPartyWalls.length, 2);
  for (const { owner, neighbor, side, neighborSide } of alfamaPartyWalls) {
    const a = alfamaHouses[owner],
      b = alfamaHouses[neighbor];
    assert.equal(a.partyWalls[side], true);
    assert.equal(b.partyWalls[neighborSide], false);
    assert.equal(a.angle, b.angle);
    assert.equal(a.depth, b.depth);
    assert.equal(a.storeys, b.storeys);
    for (const z of [0, -a.depth]) {
      const pa = alfamaLocalPoint(a.position, a.angle, [
        ((side === "left" ? -1 : 1) * a.width) / 2,
        0,
        z,
      ]);
      const pb = alfamaLocalPoint(b.position, b.angle, [
        ((neighborSide === "left" ? -1 : 1) * b.width) / 2,
        0,
        z,
      ]);
      assert.ok(pa.every((value, axis) => Math.abs(value - pb[axis]) < 1e-10));
    }
  }
});

test("Alfama has short turning climbs and a separate court return", () => {
  const headings = new Set();
  for (const { id, start, end, count, width } of alfamaFlights) {
    const run = Math.hypot(end[0] - start[0], end[2] - start[2]);
    const rise = (end[1] - start[1]) / count;
    assert.ok(rise >= 0.13 && rise <= 0.19, `${id}: human-scale risers`);
    assert.ok(run / count >= 0.28, `${id}: usable treads`);
    assert.ok(width >= 1.6, `${id}: usable width`);
    headings.add(
      Math.round(
        (Math.atan2(end[0] - start[0], end[2] - start[2]) * 180) / Math.PI,
      ),
    );
  }
  assert.ok(headings.size >= 3);
  assert.equal(alfamaFlights.length, 7);
});

test("Alfama infills meet existing walls without rebuilding them", () => {
  const connected = new Set(
    alfamaPartyWalls.flatMap(({ owner, neighbor }) => [owner, neighbor]),
  );
  const onSegment = ([x, z], a, b) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1];
    const t = ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz);
    return (
      t >= 0 &&
      t <= 1 &&
      Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz) < 1e-10
    );
  };
  for (const {
    outline,
    exposedEdges,
    closures = [],
    contacts,
    base,
    height,
  } of alfamaInfills) {
    for (const { house, side, local } of contacts) {
      const h = alfamaHouses[house];
      connected.add(house);
      assert.equal(h.position[1], base);
      assert.equal(h.coveredWalls[side], height);
      assert.ok(height <= h.storeys * 2.65);
      if (side === "back") assert.equal(local[2], -h.depth);
      else assert.equal(local[0], ((side === "left" ? -1 : 1) * h.width) / 2);
      const [x, , z] = alfamaLocalPoint(h.position, h.angle, local);
      assert.ok(
        outline.some((p, i) =>
          onSegment([x, z], p, outline[(i + 1) % outline.length]),
        ),
      );
      const rebuilt = [
        ...exposedEdges.map(([a, b]) => [outline[a], outline[b]]),
        ...closures,
      ];
      assert.ok(
        !rebuilt.some(([a, b]) => onSegment([x, z], a, b)),
        "Keep one wall at each shared contact",
      );
    }
  }
  assert.ok(
    connected.size > alfamaHouses.length / 2,
    "Most households belong to attached masonry groups",
  );
});
