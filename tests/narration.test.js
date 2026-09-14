import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createNarrationTriggers } from "../src/client/viewer/narration-triggers.js";

test("Marrakech has verified prerecorded English and Portuguese for all six views", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/narration/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(manifest.version, 1);
  assert.equal(manifest.assets.length, 12);
  const keys = new Set();
  for (const asset of manifest.assets) {
    assert.equal(asset.scene, "riad");
    assert.ok(["en-US", "pt-BR"].includes(asset.locale));
    assert.ok(asset.text.length > 100);
    assert.ok(asset.text.length < 750);
    assert.match(asset.disclosure, /AI-generated voice/);
    assert.equal(asset.voice, "cedar");
    assert.equal(asset.model, "gpt-4o-mini-tts");
    assert.match(asset.file, /^\/public\/narration\/[a-zA-Z0-9-]+\.mp3$/);
    const bytes = await readFile(new URL(`..${asset.file}`, import.meta.url));
    assert.equal(bytes.length, asset.bytes);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      asset.sha256,
    );
    keys.add(`${asset.view ?? "courtyard"}/${asset.locale}`);
  }
  for (const view of [
    "courtyard",
    "fountain",
    "tea",
    "cedar",
    "doorway",
    "upstairs",
  ])
    for (const locale of ["en-US", "pt-BR"])
      assert.ok(keys.has(`${view}/${locale}`), `${view}/${locale}`);
});

test("proximity narration requires both a close position and sustained gaze", () => {
  const trigger = createNarrationTriggers({
    fountain: { position: [0, 1, 0], target: [0, 1, -3] },
    tea: { position: [4, 1, 0], target: [4, 1, -3] },
  });

  assert.equal(trigger.update([1.101, 1, 0], [0, 0, -1], 0), null);
  assert.equal(trigger.update([1.101, 1, 0], [0, 0, -1], 2000), null);
  assert.equal(trigger.update([0, 1, 0], [1, 0, 0], 2100), null);
  assert.equal(trigger.update([0, 1, 0], [1, 0, 0], 4000), null);
  assert.equal(trigger.update([0, 1, 0], [0, 0, -1], 4100), null);
  assert.equal(trigger.update([0, 1, 0], [0, 0, -1], 5199), null);
  assert.equal(trigger.update([0, 1, 0], [0, 0, -1], 5200), "fountain");
  assert.equal(trigger.update([0, 1, 0], [0, 0, -1], 10000), null);
  trigger.select("tea");
  assert.equal(trigger.update([4, 1, 0], [0, 0, -1], 11000), null);
  assert.equal(trigger.update([4, 1, 0], [0, 0, -1], 13000), null);
});

test("deliberate zoom and focused gaze reach narration without moving to a named viewpoint", () => {
  const trigger = createNarrationTriggers({
    fountain: { position: [0, 1, 0], target: [0, 1, -3], fov: 60 },
  });
  const position = [0, 1, 1.3];
  assert.equal(trigger.update(position, [0, 0, -1], 0, 57), null);
  assert.equal(trigger.update(position, [0, 0, -1], 2000, 57), null);
  assert.equal(trigger.update(position, [1, 0, 0], 3000, 32), null);
  assert.equal(trigger.update(position, [1, 0, 0], 5000, 32), null);
  assert.equal(trigger.update(position, [0, 0, -1], 6000, 32), null);
  assert.equal(trigger.update(position, [0, 0, -1], 7100, 32), "fountain");
  assert.equal(trigger.update(position, [0, 0, -1], 10000, 32), null);
});
