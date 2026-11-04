import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { createNarrationTriggers } from "../src/client/viewer/narration-triggers.js";
import {
  curatedScenes,
  interiorDraftScenes,
} from "../src/client/catalog/scene-catalog.js";
import { domusViews } from "../src/client/environments/domus/domus-layout.js";
import {
  findNarrationRecording,
  isSceneNarration,
} from "../src/client/viewer/narration-library.js";
import { supplementalNarration } from "../scripts/helpers/narration-coverage.mjs";
import {
  outdoorDraftScenes,
  outdoorScenes,
} from "../src/client/catalog/outdoor-catalog.js";

test("every prerecorded scene has immutable bilingual recordings matching its written scripts", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/narration/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(manifest.version, 1);
  const recipes = JSON.parse(
    await readFile(
      new URL("../scripts/prompts/opening-narration.json", import.meta.url),
      "utf8",
    ),
  );
  const directory = new URL("../data/scenes/", import.meta.url);
  const saved = await Promise.all(
    (await readdir(directory))
      .filter((file) => file.endsWith(".json"))
      .map(
        async (file) =>
          JSON.parse(await readFile(new URL(file, directory), "utf8")).scene,
      ),
  );
  const scenes = [
    ...curatedScenes,
    ...saved,
    ...outdoorScenes,
    ...interiorDraftScenes,
  ];
  const bundledRecipes = recipes.assets.filter((asset) =>
    scenes.some((scene) => scene.id === asset.scene),
  );
  assert.equal(manifest.assets.length, bundledRecipes.length);
  for (const recipe of recipes.assets)
    assert.ok(
      [...scenes, ...outdoorDraftScenes].some(
        (scene) => scene.id === recipe.scene,
      ),
      `${recipe.id}: recipe must belong to a bundled scene or an explicit local draft`,
    );
  assert.equal(manifest.assets.filter(isSceneNarration).length, 250);
  for (const passage of supplementalNarration(
    scenes.filter((scene) => !scene.draft),
    recipes.assets,
  ))
    assert.ok(
      findNarrationRecording(manifest.assets, passage.locale, passage.text),
      `${passage.id}: missing OpenAI recording`,
    );
  assert.equal(
    new Set(manifest.assets.map((asset) => asset.id)).size,
    manifest.assets.length,
  );
  assert.equal(
    new Set(recipes.assets.map((asset) => asset.id)).size,
    recipes.assets.length,
  );
  const keys = new Set();
  for (const asset of manifest.assets) {
    const scene = scenes.find((scene) => scene.id === asset.scene);
    assert.ok(scene, asset.scene);
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
    const recipe = recipes.assets.find((recipe) => recipe.id === asset.id);
    assert.ok(recipe, asset.id);
    for (const [key, value] of Object.entries(recipe))
      assert.deepEqual(asset[key], value, `${asset.id}/${key}`);
    const request = {
      model: asset.model,
      voice: asset.voice,
      input: recipe.text,
      instructions: recipe.instructions ?? recipes.instructions[recipe.locale],
      response_format: "mp3",
      speed: 1,
    };
    assert.equal(
      createHash("sha256")
        .update(JSON.stringify({ recipe, request }))
        .digest("hex"),
      asset.fingerprint,
      `${asset.id}: changed generation inputs`,
    );
    const key = `${asset.scene}/${asset.view ?? "intro"}/${asset.locale}`;
    assert.ok(!keys.has(key), `Duplicate narration: ${key}`);
    keys.add(key);
  }
  for (const scene of scenes) {
    const assets = manifest.assets.filter(
      (asset) => asset.scene === scene.id && isSceneNarration(asset),
    );
    if (scene.narration === "browser") {
      assert.equal(
        assets.length,
        0,
        "Browser narration must not imply a recording",
      );
      assert.equal(scene.environment, "outdoor");
      assert(scene.details.every(({ body }) => body.trim().length > 0));
      continue;
    }
    const views = new Set(assets.map((asset) => asset.view ?? "intro"));
    assert.equal(
      views.size,
      scene.environment === "domus"
        ? Object.keys(domusViews).length
        : scene.id === "riad"
          ? 6
          : scene.environment === "outdoor"
            ? 4
            : 5,
      scene.id,
    );
    assert.ok(views.has("intro"), `${scene.id}: missing arrival`);
    for (const view of views)
      for (const locale of ["en-US", "pt-BR"])
        assert.ok(
          keys.has(`${scene.id}/${view}/${locale}`),
          `${scene.id}/${view}/${locale}`,
        );
    for (const scene of outdoorDraftScenes) {
      const drafts = recipes.assets.filter((asset) => asset.scene === scene.id);
      assert.equal(
        drafts.length,
        8,
        `${scene.id}: four bilingual draft passages`,
      );
      const views = new Set(drafts.map((asset) => asset.view ?? "intro"));
      assert.equal(views.size, 4);
      assert.ok(views.has("intro"));
      for (const view of views)
        for (const locale of ["en-US", "pt-BR"])
          assert.equal(
            drafts.filter(
              (asset) =>
                (asset.view ?? "intro") === view && asset.locale === locale,
            ).length,
            1,
          );
    }
  }
  const files = await readdir(new URL("../public/narration/", import.meta.url));
  assert.deepEqual(
    files.filter((file) => file.endsWith(".mp3")).sort(),
    manifest.assets.map((asset) => asset.file.split("/").at(-1)).sort(),
  );
  assert.ok(
    !files.some((file) => file.endsWith(".partial")),
    "Unfinished audio writes",
  );
});

test("the generation command validates selections and reuses recordings without credentials", () => {
  const run = (...args) =>
    spawnSync(
      process.execPath,
      [
        "scripts/generate-opening-narration.mjs",
        "--model",
        "gpt-4o-mini-tts",
        "--voice",
        "cedar",
        ...args,
      ],
      { encoding: "utf8", env: { ...process.env, OPENAI_API_KEY: "" } },
    );
  const result = run(
    "--scene",
    "textile",
    "--scene",
    "newar-potters-square",
    "--all-views",
    "--locale",
    "en-US",
    "--locale",
    "pt-BR",
    "--dry-run",
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /\d+ selected; \d+ cached; 0 new/);
  const cached = run("--scene", "riad", "--locale", "en-US");
  assert.equal(cached.status, 0, cached.stderr);
  assert.match(cached.stderr, /1 selected; 1 cached; 0 new/);
  for (const args of [
    ["--scene", "missing", "--locale", "en-US", "--all-views"],
    ["--scene", "riad", "--locale", "fr-FR"],
    [
      "--scene",
      "riad",
      "--locale",
      "en-US",
      "--all-views",
      "--view",
      "fountain",
    ],
    ["--scene", "riad", "--locale", "en-US", "--concurrency", "0"],
    ["--scene", "riad", "--locale", "en-US", "--concurrency", "5"],
  ]) {
    const invalid = run(...args, "--dry-run");
    assert.notEqual(invalid.status, 0, args.join(" "));
    assert.doesNotMatch(invalid.stderr, /Recording .* with/);
  }
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
