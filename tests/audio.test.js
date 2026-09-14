import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";
import {
  SOUNDSCAPES,
  getSoundscapeProfile,
  musicProfile,
} from "../src/client/environments/shared/soundscape-profiles.js";
import { createRecordedSoundscape } from "../src/client/environments/shared/recorded-soundscape.js";
import { outdoorScenes } from "../src/client/catalog/outdoor-catalog.js";
import { getMimeType } from "../src/server/http.mjs";
import {
  AUDIO_COOKIE,
  DEFAULT_AUDIO_PREFERENCES,
  readAudioPreferences,
  saveAudioPreferences,
  validateAudioPreferences,
} from "../src/client/environments/shared/audio-preferences.js";

test("every composed sound has a bundled file and redistributable credit", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/audio/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  const assets = new Map(manifest.assets.map((asset) => [asset.id, asset]));
  assert.equal(assets.size, manifest.assets.length);
  let bytes = 0;
  for (const asset of assets.values()) {
    for (const key of [
      "title",
      "creator",
      "sourceUrl",
      "licenseUrl",
      "license",
      "sha256",
    ])
      assert.ok(asset[key], `${asset.id}: ${key}`);
    assert.match(
      asset.license,
      /^(CC0|CC BY|Public domain \(author dedication\))/,
    );
    assert.match(asset.sourceUrl, /^https:\/\//);
    assert.match(asset.licenseUrl, /^https:\/\//);
    assert.match(
      asset.file,
      /^\/public\/audio\/[a-zA-Z0-9_./-]+\.(mp3|ogg|wav)$/,
    );
    assert.ok(!asset.file.includes(".."));
    const file = new URL(`..${asset.file}`, import.meta.url);
    const contents = await readFile(file);
    assert.equal(
      createHash("sha256").update(contents).digest("hex"),
      asset.sha256,
      asset.id,
    );
    assert.match(getMimeType(asset.file), /^audio\//);
    bytes += (await stat(file)).size;
  }
  assert.ok(
    bytes < 30 * 1024 * 1024,
    `Compressed audio budget: ${bytes} bytes`,
  );
  const profiles = Object.values(SOUNDSCAPES);
  profiles.push(musicProfile(null, "theme"));
  for (const profile of Object.values(SOUNDSCAPES))
    profiles.push(musicProfile(profile, "place"));
  for (const profile of profiles) {
    for (const layer of profile.layers) {
      assert.ok(assets.has(layer.asset), `Missing ${layer.asset}`);
      assert.ok(layer.level > 0 && layer.level <= 1);
      if (layer.position) {
        assert.equal(layer.position.length, 3);
        assert.ok(layer.position.every(Number.isFinite));
      }
      if (layer.mode === "event") {
        assert.ok(layer.interval[0] >= 4);
        assert.ok(layer.interval[1] >= layer.interval[0]);
      } else assert.equal(layer.mode, "loop");
      if (layer.portalZ !== undefined) assert.ok(layer.position);
    }
  }
});

test("every outdoor environment has an explicit recorded sound profile", () => {
  for (const scene of outdoorScenes) {
    const profile = getSoundscapeProfile(scene.id);
    assert.ok(profile.label);
    assert.ok(profile.layers.length >= 2);
    assert.equal(
      musicProfile(profile, "place").layers[0].asset,
      "music-atlas-theme",
    );
  }
});

test("music assignment is explicit and defaults to the common theme", () => {
  assert.equal(
    musicProfile(null, "place").layers[0].asset,
    "music-atlas-theme",
  );
  assert.equal(
    musicProfile(SOUNDSCAPES.riad, "theme").layers[0].asset,
    "music-atlas-theme",
  );
  assert.equal(
    musicProfile(SOUNDSCAPES.riad, "place").layers[0].asset,
    "music-marrakech",
  );
  assert.ok(musicProfile(SOUNDSCAPES.cafe, "place").layers[0].position);
  assert.throws(() => getSoundscapeProfile("missing"), RangeError);
});

test("unused soundscapes allocate no browser resources and dispose idempotently", async () => {
  const soundscape = createRecordedSoundscape(SOUNDSCAPES.riad);
  assert.deepEqual(soundscape.inspection, {
    state: "idle",
    sources: 0,
    nodes: 0,
    contextState: "closed",
    bufferBytes: 0,
  });
  for (const volume of [-1, 2, NaN, Infinity])
    assert.throws(() => soundscape.setVolume(volume), RangeError);
  soundscape.setVolume(0);
  assert.equal(soundscape.status.volume, 0);
  soundscape.dispose();
  soundscape.dispose();
  await assert.rejects(soundscape.start(), /disposed/);
  assert.equal(soundscape.inspection.nodes, 0);
});

test("sound preference cookies round-trip with explicit consent and safe attributes", () => {
  let stored = "";
  let header = "";
  const browser = {
    get cookie() {
      return stored;
    },
    set cookie(value) {
      header = value;
      stored = value.split(";")[0];
    },
  };
  assert.deepEqual(
    readAudioPreferences("unrelated=value"),
    DEFAULT_AUDIO_PREFERENCES,
  );
  const preferences = {
    ...DEFAULT_AUDIO_PREFERENCES,
    ambienceEnabled: true,
    musicVolume: 0.23,
  };
  saveAudioPreferences(preferences, browser);
  assert.deepEqual(
    readAudioPreferences(`unrelated=value; ${stored}`),
    preferences,
  );
  assert.ok(header.startsWith(`${AUDIO_COOKIE}=`));
  assert.match(header, /Path=\/; Max-Age=31536000; SameSite=Lax/);
  assert.throws(() => readAudioPreferences(`${AUDIO_COOKIE}=%invalid`));
  assert.throws(() => validateAudioPreferences({ ...preferences, version: 2 }));
  assert.throws(() =>
    validateAudioPreferences({ ...preferences, ambienceEnabled: "true" }),
  );
  assert.throws(() =>
    validateAudioPreferences({ ...preferences, musicVolume: 1.1 }),
  );
  assert.throws(() =>
    validateAudioPreferences({ ...preferences, musicVolume: NaN }),
  );
  assert.throws(() =>
    validateAudioPreferences({ ...preferences, narrationEnabled: "true" }),
  );
  assert.throws(() =>
    validateAudioPreferences({ ...preferences, mode: "missing" }),
  );
  assert.throws(
    () =>
      saveAudioPreferences(preferences, {
        get cookie() {
          return "";
        },
        set cookie(value) {},
      }),
    /could not be saved/,
  );
});

test("adding narration preserves existing one-year sound consent and volumes", () => {
  const existing = {
    version: 1,
    ambienceEnabled: true,
    musicEnabled: true,
    ambienceVolume: 0.67,
    musicVolume: 0.23,
    mode: "theme",
  };
  const cookie = `${AUDIO_COOKIE}=${encodeURIComponent(JSON.stringify(existing))}`;
  assert.deepEqual(readAudioPreferences(cookie), {
    ...existing,
    narrationEnabled: false,
  });
});
