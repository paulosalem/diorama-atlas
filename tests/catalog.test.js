import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
import {
  outdoorDraftScenes,
  outdoorScenes,
} from "../src/client/catalog/outdoor-catalog.js";

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

test("the integrated collection contains twenty-five distinct, complete places", () => {
  assert.equal(curatedScenes.length, 6);
  assert.equal(bundledPackages.length, 7);
  assert.equal(outdoorScenes.length, 12);
  assert.equal(new Set(allScenes.map((scene) => scene.id)).size, 25);
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
    } else if (scene.references) {
      assert.match(scene.references, /^\/public\/[a-z-]+\/references\.json$/);
    } else {
      assert.ok(
        scene.concept.references.some((reference) => reference.id === "hero"),
      );
    }
  }
});

test("every bundled place and explicit draft has a local preview, independent of AI caches", async () => {
  for (const scene of [...allScenes, ...outdoorDraftScenes]) {
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

test("published outdoor captures and local drafts have separate, verifiable provenance", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("public/previews/credits.json", root), "utf8"),
  );
  assert.equal(manifest.drafts.length, outdoorDraftScenes.length);
  assert.ok(
    manifest.outdoors.some((preview) => preview.scene === "douro-vineyard"),
  );
  for (const preview of [...manifest.outdoors, ...manifest.drafts]) {
    const catalog = manifest.drafts.includes(preview)
      ? outdoorDraftScenes
      : outdoorScenes;
    const scene = catalog.find((scene) => scene.id === preview.scene);
    assert.ok(scene, preview.scene);
    assert.equal(scene.preview, preview.file);
    const bytes = await readFile(new URL(preview.file.slice(1), root));
    assert.equal(bytes.length, preview.bytes);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      preview.sha256,
    );
    assert.equal(bytes.readUInt32BE(16), preview.width);
    assert.equal(bytes.readUInt32BE(20), preview.height);
    assert.equal(preview.reducedMotion, true);
  }
});

test("every bundled place has an indexed brief with its narrated viewpoint keys", async () => {
  const index = await readFile(new URL("docs/scenes/README.md", root), "utf8");
  const { assets } = JSON.parse(
    await readFile(new URL("public/narration/manifest.json", root), "utf8"),
  );
  for (const scene of allScenes) {
    const brief = await readFile(
      new URL(`docs/scenes/${scene.id}.md`, root),
      "utf8",
    );
    assert.ok(brief.startsWith(`# ${scene.title}\n`), scene.id);
    assert.ok(index.includes(`(${scene.id}.md)`), scene.id);
    assert.ok(brief.includes(`?scene=${scene.id}&inspect=1`), scene.id);
    const section = brief.match(
      /## View sequence\s+([\s\S]*?)(?=\n## |$)/,
    )?.[1];
    assert.ok(section, `${scene.id}: missing viewpoint sequence`);
    const views = [...section.matchAll(/`([a-z-]+)`/g)].map(
      (match) => match[1],
    );
    const first =
      scene.defaultView ??
      (scene.id === "riad"
        ? "courtyard"
        : scene.environment === "outdoor"
          ? "arrival"
          : "room");
    const narrated = assets
      .filter(
        (asset) =>
          asset.scene === scene.id &&
          asset.locale === "en-US" &&
          isSceneNarration(asset),
      )
      .map((asset) => asset.view ?? first);
    assert.equal(views[0], first, scene.id);
    assert.equal(new Set(views).size, views.length, scene.id);
    assert.deepEqual(new Set(views), new Set(narrated), scene.id);
  }
});

test("every place belongs to exactly one of the twenty-one geographic settings", () => {
  const places = locateScenes(allScenes);
  assert.equal(places.length, 21);
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

test("Douro is one released place with landscape and miniature experiences", () => {
  const douro = allScenes.filter((scene) => scene.id === "douro-vineyard");
  assert.equal(douro.length, 1);
  assert(!douro[0].draft);
  assert.deepEqual(
    douro[0].versions.map(({ id, experience }) => [id, experience]),
    [
      ["landscape", "landscape"],
      ["miniature", "miniature"],
    ],
  );
});

test("unfinished outdoor places require explicit local preview opt-in", async (t) => {
  const draft = { ...outdoorScenes[0], id: "unfinished-outdoor", draft: true };
  outdoorDraftScenes.push(draft);
  t.after(() => outdoorDraftScenes.pop());
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify({ scenes: [] })),
  );
  const released = await loadScenes();
  const preview = await loadScenes({ includeDrafts: true });
  assert.ok(outdoorDraftScenes.length > 0);
  for (const scene of outdoorDraftScenes) {
    assert.equal(scene.draft, true);
    assert.ok(!released.some((entry) => entry.id === scene.id));
    assert.ok(preview.some((entry) => entry.id === scene.id));
  }
});
import { isSceneNarration } from "../src/client/viewer/narration-library.js";
