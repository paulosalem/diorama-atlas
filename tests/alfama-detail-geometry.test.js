import test from "node:test";
import assert from "node:assert/strict";
import {
  alfamaPavingGeometry,
  alfamaGeraniumLeafGeometry,
  alfamaPetalGeometry,
} from "../src/client/environments/outdoors/alfama-detail-geometry.js";
import { tileGeometry } from "../src/client/environments/outdoors/alfama-architecture.js";

test("Calcada stones have distinct bounded profiles and nonflat worn tops", () => {
  const profiles = new Set();
  for (let seed = 1; seed <= 8; seed++) {
    const geometry = alfamaPavingGeometry(seed);
    const p = geometry.attributes.position;
    assert.ok(
      [...p.array, ...geometry.attributes.normal.array].every(Number.isFinite),
    );
    geometry.computeBoundingBox();
    assert.ok(geometry.boundingBox.min.x >= -0.5);
    assert.ok(geometry.boundingBox.max.x <= 0.5);
    assert.ok(geometry.boundingBox.min.z >= -0.5);
    assert.ok(geometry.boundingBox.max.z <= 0.5);
    const top = new Set();
    for (let i = 0; i < p.count; i++)
      if (p.getY(i) > 0.4) top.add(p.getY(i).toFixed(5));
    assert.ok(top.size > 5);
    profiles.add(JSON.stringify([...p.array]));
    geometry.dispose();
  }
  assert.equal(profiles.size, 8);
});

test("Geranium leaves attach at their base and have scalloped, curved, zoned surfaces", () => {
  const geometry = alfamaGeraniumLeafGeometry();
  const p = geometry.attributes.position;
  assert.ok(
    [...p.array, ...geometry.attributes.normal.array].every(Number.isFinite),
  );
  assert.ok(geometry.index.count > 900);
  let attached = false;
  for (let i = 0; i < p.count; i++) {
    if (Math.hypot(p.getX(i), p.getY(i), p.getZ(i)) < 0.00001) attached = true;
    assert.ok(Math.abs(p.getX(i)) < 0.06 && p.getY(i) < 0.111);
  }
  assert.ok(attached);
  assert.ok(
    Math.max(...geometry.attributes.color.array) -
      Math.min(...geometry.attributes.color.array) >
      0.1,
  );
  geometry.computeBoundingBox();
  assert.ok(geometry.boundingBox.max.z - geometry.boundingBox.min.z > 0.005);
  geometry.dispose();
});

test("Flower petals have cupped surfaces rather than flattened spheres", () => {
  const geometry = alfamaPetalGeometry();
  assert.ok(
    [
      ...geometry.attributes.position.array,
      ...geometry.attributes.normal.array,
    ].every(Number.isFinite),
  );
  geometry.computeBoundingBox();
  assert.ok(geometry.boundingBox.min.y === 0);
  assert.ok(geometry.boundingBox.max.y < 0.028);
  assert.ok(geometry.boundingBox.max.z > 0.003);
  geometry.dispose();
});

test("Roof tiles taper so overlapping courses remain physically distinct", () => {
  const geometry = tileGeometry();
  const p = geometry.attributes.position;
  const widths = [0, 0];
  for (let i = 0; i < p.count; i++) {
    assert.ok([p.getX(i), p.getY(i), p.getZ(i)].every(Number.isFinite));
    if (p.getZ(i) < 0.001) widths[0] = Math.max(widths[0], Math.abs(p.getX(i)));
    if (p.getZ(i) > 0.389) widths[1] = Math.max(widths[1], Math.abs(p.getX(i)));
  }
  assert.ok(widths[1] - widths[0] > 0.02);
  assert.ok(widths[1] < 0.106);
  assert.ok(geometry.attributes.uv);
  geometry.dispose();
  const channel = tileGeometry({ channel: true });
  channel.computeBoundingBox();
  assert.ok(channel.boundingBox.min.y > -0.01);
  assert.ok(channel.boundingBox.min.y < 0);
  assert.ok(channel.boundingBox.max.y < 0.023);
  channel.dispose();
});
