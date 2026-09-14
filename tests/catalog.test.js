import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { test } from "node:test";
import {
  curatedScenes,
  loadScenes,
} from "../src/client/catalog/scene-catalog.js";
import {
  locations,
  locateScenes,
} from "../src/client/catalog/place-locations.js";
import { geographicPosition } from "../src/client/world/world-globe.js";
import { outdoorScenes } from "../src/client/catalog/outdoor-catalog.js";

const root = new URL("../", import.meta.url);
const sceneDirectory = new URL("data/scenes/", root);
const bundledPackages = await Promise.all(
  (await readdir(sceneDirectory))
    .filter((name) => name.endsWith(".json"))
    .map(async (name) =>
      JSON.parse(await readFile(new URL(name, sceneDirectory), "utf8")),
    ),
);
const allScenes = [
  ...curatedScenes,
  ...bundledPackages.map((entry) => entry.scene),
  ...outdoorScenes,
];

test("the integrated collection contains twenty-two distinct, complete places", () => {
  assert.equal(curatedScenes.length, 5);
  assert.equal(bundledPackages.length, 7);
  assert.equal(outdoorScenes.length, 10);
  assert.equal(new Set(allScenes.map((scene) => scene.id)).size, 22);
  for (const scene of allScenes) {
    assert.match(scene.id, /^[a-z0-9-]+$/);
    for (const field of ["title", "region", "blurb", "summary"]) {
      assert.ok(scene[field]?.trim(), `${scene.id}: missing ${field}`);
    }
    assert.ok(scene.details.length > 0, `${scene.id}: missing details`);
    assert.equal(
      new Set(scene.details.map((detail) => detail.id)).size,
      scene.details.length,
    );
    for (const detail of scene.details) {
      assert.ok(detail.title && detail.body);
      assert.equal(detail.point.length, 3);
      assert.ok(detail.point.every(Number.isFinite));
    }
    if (scene.environment === "outdoor") {
      assert.equal(scene.fictional, true);
      assert.equal(scene.referenceRole, "style");
    } else {
      assert.ok(
        scene.concept.references.some((reference) => reference.id === "hero"),
      );
    }
  }
});

test("every bundled place has a local preview, independent of AI caches", async () => {
  for (const scene of allScenes) {
    const preview = new URL(
      scene.preview?.slice(1) ?? `public/previews/${scene.id}.png`,
      root,
    );
    assert.ok((await stat(preview)).size > 0, scene.id);
    assert.deepEqual(
      (await readFile(preview)).subarray(0, 8),
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
  }
});

test("every place belongs to exactly one of the eighteen geographic settings", () => {
  const places = locateScenes(allScenes);
  assert.equal(places.length, 18);
  const locatedIds = places.flatMap((place) =>
    place.scenes.map((scene) => scene.id),
  );
  assert.equal(locatedIds.length, allScenes.length);
  assert.equal(new Set(locatedIds).size, allScenes.length);
  for (const location of locations) {
    assert.ok(location.lat >= -90 && location.lat <= 90);
    assert.ok(location.lon >= -180 && location.lon <= 180);
  }
  assert.deepEqual(locateScenes([]), []);
});

test("globe positions retain latitude, longitude, and radius conventions", () => {
  assert.deepEqual(geographicPosition(0, 0, 3).toArray(), [3, 0, -0]);
  const east = geographicPosition(0, 90, 3);
  assert.ok(Math.abs(east.x) < 1e-10);
  assert.equal(east.z, -3);
  assert.equal(geographicPosition(90, 0, 3).y, 3);
  for (const location of locations) {
    assert.ok(
      Math.abs(geographicPosition(location.lat, location.lon).length() - 2.5) <
        1e-10,
    );
  }
});

test("catalog loading preserves curated places and appends saved places", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "/api/generated-scenes");
    return new Response(
      JSON.stringify({ scenes: bundledPackages.map((entry) => entry.scene) }),
      { headers: { "Content-Type": "application/json" } },
    );
  });
  const loaded = await loadScenes();
  assert.deepEqual(loaded, allScenes);
});

test("catalog loading reports server failures instead of hiding missing places", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("", { status: 500 }),
  );
  await assert.rejects(loadScenes, /saved places could not be loaded/);
});
