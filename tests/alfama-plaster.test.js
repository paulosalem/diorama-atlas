import test from "node:test";
import assert from "node:assert/strict";
import {
  alfamaPlasterGeometry,
  alfamaPlasterPigment,
} from "../src/client/environments/outdoors/alfama-plaster.js";

test("Alfama plaster has bounded physical relief and coherent pigment loss", () => {
  const geometry = alfamaPlasterGeometry(4, 2.65, 0.4, [0, 1.325], 5, 4);
  const positions = geometry.attributes.position;
  const colors = geometry.attributes.color;
  const surfaceDepths = new Set();
  for (let i = 0; i < positions.count; i++) {
    assert.ok(
      [positions.getX(i), positions.getY(i), positions.getZ(i)].every(
        Number.isFinite,
      ),
    );
    if (positions.getZ(i) > 0) {
      assert.ok(positions.getZ(i) >= 0.195 && positions.getZ(i) <= 0.21);
      surfaceDepths.add(Math.round(positions.getZ(i) * 100000));
    }
    assert.ok(colors.getX(i) >= 0.35 && colors.getX(i) <= 1.32);
  }
  assert.ok(
    surfaceDepths.size > 100,
    "The surface must change shape, not merely subdivide a box.",
  );
  assert.ok(Math.max(...colors.array) - Math.min(...colors.array) > 0.2);
  geometry.dispose();
});

test("Alfama weathering follows the local ground and actual sill ends", () => {
  const holes = [{ x: 0, width: 0.9, bottom: 3, top: 4.35 }];
  const sample = (x, y, openings = []) =>
    alfamaPlasterPigment(x, y, 5, 4, 5.3, openings);
  const underSill = sample(0.54, 2.85, holes);
  const withoutSill = sample(0.54, 2.85);
  assert.ok(withoutSill[0] - underSill[0] > 0.04);
  assert.deepEqual(sample(0.54, 3.2, holes), sample(0.54, 3.2));
  assert.ok(sample(0, 0)[0] < sample(0, 1)[0]);
  assert.deepEqual(sample(0.1, 1.1, holes), sample(0.1, 1.1, holes));
});
