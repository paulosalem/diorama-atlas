import assert from "node:assert/strict";
import test from "node:test";
import { outdoorScenes } from "../src/client/catalog/outdoor-catalog.js";
import {
  resolveSceneVersion,
  sceneVersionUrl,
} from "../src/client/catalog/scene-versions.js";
import { vineyardYardGrowth } from "../src/client/environments/outdoors/vineyard-yard.js";

test("experience routing defaults to landscape and explicitly rejects unavailable versions", () => {
  const douro = outdoorScenes.find(({ id }) => id === "douro-vineyard");
  assert.equal(resolveSceneVersion(douro, null).id, "landscape");
  assert.equal(resolveSceneVersion(douro, "miniature").experience, "miniature");
  assert.equal(resolveSceneVersion(douro, "landscape").experience, "landscape");
  assert.throws(() => resolveSceneVersion(douro, "unknown"), /not available/);
  assert.equal(resolveSceneVersion({}, null), null);
  assert.throws(() => resolveSceneVersion({}, "miniature"), /not available/);
});

test("switching experience preserves deployment path and visit parameters, not incompatible cameras", () => {
  const url = new URL(
    "https://example.test/atlas/?scene=douro-vineyard&version=miniature&view=geology&inspect=1",
  );
  const next = sceneVersionUrl(url, "landscape");
  assert.equal(next.pathname, "/atlas/");
  assert.equal(next.searchParams.get("scene"), "douro-vineyard");
  assert.equal(next.searchParams.get("version"), "landscape");
  assert.equal(next.searchParams.get("inspect"), "1");
  assert(!next.searchParams.has("view"));
  assert.equal(url.searchParams.get("view"), "geology");
});

test("yard growth leaves the quinta, doorway and vehicle route clear", () => {
  for (let z = 2; z < 7; z += 0.2) {
    assert.equal(vineyardYardGrowth(-6.65, z), 0);
    assert.equal(vineyardYardGrowth(-2.8, z), 0);
  }
  assert.equal(vineyardYardGrowth(-8, -1), 0);
  assert(vineyardYardGrowth(-13.1, 3.7) > 0.5);
  for (let x = -16; x < 2; x += 0.25)
    for (let z = -6; z < 11; z += 0.25) {
      const cover = vineyardYardGrowth(x, z);
      assert(Number.isFinite(cover) && cover >= 0 && cover <= 1);
    }
});
