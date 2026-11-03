import test from "node:test";
import assert from "node:assert/strict";
import { lstat, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import {
  outdoorScenes,
  outdoorDraftScenes,
  outdoorLocations,
} from "../src/client/catalog/outdoor-catalog.js";
import { curatedScenes } from "../src/client/catalog/scene-catalog.js";
import { locateScenes } from "../src/client/catalog/place-locations.js";
import { outdoorBuilders } from "../src/client/environments/outdoors/outdoor-scenes.js";
import { createMiniature } from "../src/client/world/world-miniatures.js";

const registeredScenes = [...outdoorScenes, ...outdoorDraftScenes];

test("all released and explicitly staged outdoor settings have distinct builders and four details", () => {
  assert.equal(outdoorScenes.length, 11);
  assert.equal(new Set(outdoorScenes.map((scene) => scene.id)).size, 11);
  assert.deepEqual(
    Object.keys(outdoorBuilders).sort(),
    registeredScenes.map((scene) => scene.id).sort(),
  );
  for (const scene of registeredScenes) {
    assert.equal(scene.environment, "outdoor");
    assert.equal(scene.fictional, true);
    assert.equal(scene.referenceRole, "style");
    assert.ok(["urban", "rural", "coastal"].includes(scene.ambience));
    assert.equal(typeof outdoorBuilders[scene.id], "function");
    assert.equal(scene.details.length, 4);
    assert.equal(new Set(scene.details.map((detail) => detail.id)).size, 4);
    assert.ok(scene.summary.length > 150);
    assert.ok(scene.details.every((detail) => detail.body.length > 80));
    assert.ok(Math.abs(scene.lat) <= 90 && Math.abs(scene.lon) <= 180);
  }
});

test("map coordinates describe regional inspiration, never a fictional street address", () => {
  for (const location of outdoorLocations) {
    assert.equal(location.geographicScope, "regional");
    const scene = registeredScenes.find(
      (entry) => entry.id === location.sceneId,
    );
    assert.ok(scene.region.startsWith("An imagined"));
    assert.doesNotMatch(
      `${scene.title} ${scene.id}`,
      /Pelourinho|Registan|Ulugh|Trovaso|Rumiyoc|Dispensary|Kegong|Délices|Chabaane|Xieng|Jatiluwih/i,
    );
  }
});

test("outdoors are mapped once and never leak into an indoor location", () => {
  const places = locateScenes([...curatedScenes, ...outdoorScenes]);
  for (const scene of outdoorScenes) {
    const matches = places.filter((place) =>
      place.scenes.some((entry) => entry.id === scene.id),
    );
    assert.equal(matches.length, 1, scene.id);
    assert.equal(matches[0].sceneId, scene.id);
  }
  assert.equal(places.filter((place) => place.sceneId).length, 11);
  for (const place of places.filter((place) => !place.sceneId))
    assert.ok(place.scenes.every((scene) => scene.environment !== "outdoor"));
});

test("every outdoor marker has a finite, nonempty silhouette", () => {
  for (const location of outdoorLocations) {
    const model = createMiniature(location.type);
    let meshes = 0;
    model.traverse((object) => {
      if (!object.isMesh) return;
      meshes++;
      const positions = object.geometry.attributes.position.array;
      assert.ok([...positions].every(Number.isFinite), location.id);
      object.geometry.dispose();
      object.material.dispose();
    });
    assert.ok(meshes >= 3, location.id);
  }
});

test("every imagined setting retains at least two attributed style-reference photographs", async () => {
  const references = JSON.parse(
    await readFile(
      new URL("../public/outdoors/references.json", import.meta.url),
    ),
  );
  assert.equal(references.length, registeredScenes.length);
  for (const scene of registeredScenes) {
    const entry = references.find((item) => item.sceneId === scene.id);
    assert.ok(entry, scene.id);
    assert.match(entry.caveat, /style|regional references/i);
    assert.match(entry.caveat, /fictional|imagined|anonymous/i);
    assert.ok(entry.references.length >= 2, scene.id);
    for (const reference of entry.references) {
      assert.ok(
        reference.url.startsWith("https://commons.wikimedia.org/wiki/File:"),
      );
      assert.ok(
        reference.author &&
          reference.license &&
          reference.date &&
          reference.label,
      );
      if (reference.image) {
        assert.ok(reference.image.startsWith("/public/outdoors/"));
        const image = await stat(
          new URL(`..${reference.image}`, import.meta.url),
        );
        assert.ok(image.size > 1000);
        if (reference.sha256) {
          const bytes = await readFile(
            new URL(`..${reference.image}`, import.meta.url),
          );
          assert.equal(bytes.length, reference.bytes);
          assert.equal(
            createHash("sha256").update(bytes).digest("hex"),
            reference.sha256,
          );
          assert.ok(
            reference.licenseUrl.startsWith("https://creativecommons.org/"),
          );
        }
      }
    }
  }
});

test("local daylight and all material channels are present", async () => {
  for (const name of ["stone", "rock", "brick", "ground"]) {
    for (const channel of ["diff", "nor_gl", "rough"]) {
      const bytes = await readFile(
        new URL(
          `../public/outdoors/materials/${name}_${channel}.jpg`,
          import.meta.url,
        ),
      );
      assert.equal(bytes[0], 0xff);
      assert.equal(bytes[1], 0xd8);
      assert.ok(bytes.length > 1000);
    }
  }
  const hdr = await readFile(
    new URL("../public/outdoors/sky.hdr", import.meta.url),
  );
  assert.match(hdr.subarray(0, 30).toString(), /#\?(RADIANCE|RGBE)/);
});

test("central credits preserve every source photograph and generated-image provenance", async () => {
  const credits = JSON.parse(
    await readFile(new URL("../public/credits.json", import.meta.url)),
  );
  const references = JSON.parse(
    await readFile(
      new URL("../public/outdoors/references.json", import.meta.url),
    ),
  );
  for (const scene of references)
    for (const photo of scene.references) {
      const credit = credits.entries.find(
        (entry) => entry.source === photo.url,
      );
      assert.ok(credit, photo.label);
      assert.equal(credit.author, photo.author);
      assert.equal(credit.license, photo.license);
    }
  assert.ok(
    credits.entries.some((entry) => entry.author === "NASA Earth Observatory"),
  );
  assert.ok(
    credits.entries.some(
      (entry) =>
        entry.category === "Generated artwork" &&
        entry.author.includes("gpt-image-2.5-sunburst"),
    ),
  );
  assert.ok(
    credits.entries.every(
      (entry) => entry.title && entry.author && entry.source && entry.license,
    ),
  );
});

test("downloaded detail assets and generated artwork retain their verified bytes", async () => {
  const details = JSON.parse(
    await readFile(
      new URL(
        "../public/outdoors/detail-assets/manifest.json",
        import.meta.url,
      ),
    ),
  );
  const generated = JSON.parse(
    await readFile(
      new URL("../public/outdoors/generated/manifest.json", import.meta.url),
    ),
  );
  const files = [];
  for (const asset of details.assets) {
    if (asset.sourceSha256) {
      assert.ok(asset.sourceImage.startsWith("/public/"));
      const source = await readFile(
        new URL(`..${asset.sourceImage}`, import.meta.url),
      );
      assert.equal(
        createHash("sha256").update(source).digest("hex"),
        asset.sourceSha256,
        asset.id,
      );
    }
    if (asset.image) files.push({ path: asset.image, ...asset });
    for (const [key, path] of Object.entries(asset.files ?? {})) {
      const integrity = asset.fileIntegrity?.[key] ?? asset.sourceFiles?.[key];
      assert.ok(integrity, `${asset.id}/${key} requires integrity metadata`);
      files.push({ path, ...integrity });
    }
  }
  for (const asset of generated.assets)
    files.push({ path: asset.image, ...asset });
  for (const file of files) {
    assert.ok(file.path.startsWith("/public/outdoors/"));
    const bytes = await readFile(new URL(`..${file.path}`, import.meta.url));
    const algorithm = file.sha256 ? "sha256" : "md5";
    assert.ok(file[algorithm], file.path);
    assert.equal(
      createHash(algorithm).update(bytes).digest("hex"),
      file[algorithm],
      file.path,
    );
    if (file.bytes) assert.equal(bytes.length, file.bytes, file.path);
  }
});

test("central credits retain all eleven audio recordings and their source provenance", async () => {
  const [credits, audio] = await Promise.all([
    readFile(new URL("../public/credits.json", import.meta.url), "utf8").then(
      JSON.parse,
    ),
    readFile(
      new URL("../public/audio/manifest.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
  ]);
  assert.equal(audio.assets.length, 11);
  const entries = credits.entries.filter((entry) => entry.audioId);
  assert.equal(entries.length, audio.assets.length);
  assert.equal(
    new Set(entries.map((entry) => entry.audioId)).size,
    entries.length,
  );
  for (const asset of audio.assets) {
    const entry = entries.find((credit) => credit.audioId === asset.id);
    assert.ok(entry, asset.id);
    assert.equal(
      entry.category,
      asset.kind === "music" ? "Music" : "Recorded ambience",
    );
    assert.equal(entry.title, asset.title);
    assert.equal(entry.author, asset.creator);
    assert.equal(entry.source, asset.sourceUrl);
    assert.equal(entry.license, asset.license);
    assert.equal(entry.licenseUrl, asset.licenseUrl);
    assert.equal(entry.audio, asset.file);
    assert.equal(entry.sha256, asset.sha256);
    assert.equal(entry.attribution, asset.attribution);
    assert.deepEqual(entry.edits, asset.edits);
    assert.equal(entry.licenseEvidence, asset.licenseEvidence);
    assert.equal(entry.sourceMetadata, asset.sourceMetadata);
    assert.equal(entry.provenance, "/public/audio/manifest.json");
    assert.ok(entry.note.includes(asset.description), asset.id);
    const bytes = await readFile(new URL(`..${entry.audio}`, import.meta.url));
    assert.equal(bytes.length, asset.bytes, asset.id);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      entry.sha256,
      asset.id,
    );
    assert.ok(
      (await stat(new URL(`..${entry.licenseEvidence}`, import.meta.url)))
        .size > 0,
    );
    if (entry.sourceMetadata)
      assert.ok(
        (await stat(new URL(`..${entry.sourceMetadata}`, import.meta.url)))
          .size > 0,
      );
  }
});

test("central credits preserve every AI-voiced narration separately from licensed recordings", async () => {
  const [credits, narration] = await Promise.all([
    readFile(new URL("../public/credits.json", import.meta.url), "utf8").then(
      JSON.parse,
    ),
    readFile(
      new URL("../public/narration/manifest.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
  ]);
  const entries = credits.entries.filter(
    (entry) => entry.category === "AI-generated narration",
  );
  assert.equal(
    entries.length,
    narration.assets.length,
    "Shared source URLs must not collapse distinct narration tracks.",
  );
  assert.equal(
    new Set(entries.map((entry) => entry.narrationId)).size,
    narration.assets.length,
  );
  for (const locale of ["en-US", "pt-BR"]) {
    assert.deepEqual(
      narration.assets
        .filter((asset) => asset.locale === locale)
        .map((asset) => `${asset.scene}/${asset.view ?? "intro"}`)
        .sort(),
      narration.assets
        .filter((asset) => asset.locale !== locale)
        .map((asset) => `${asset.scene}/${asset.view ?? "intro"}`)
        .sort(),
    );
  }
  for (const asset of narration.assets) {
    const entry = entries.find((credit) => credit.narrationId === asset.id);
    assert.ok(entry, asset.id);
    assert.equal(
      entry.audioId,
      undefined,
      "AI voices must not be classified as licensed field recordings.",
    );
    assert.equal(entry.title, asset.title);
    assert.equal(entry.author, asset.creator);
    assert.equal(entry.source, asset.sourceUrl);
    assert.equal(entry.termsUrl, asset.termsUrl);
    assert.equal(entry.licenseUrl, asset.termsUrl);
    assert.equal(
      entry.license,
      "Original Atlas narration; generated voice subject to OpenAI terms",
    );
    assert.match(entry.licenseUrl, /^https:\/\/openai\.com\/policies\//);
    assert.doesNotMatch(
      entry.license,
      /Creative Commons|CC[- ]|public domain/i,
    );
    for (const field of [
      "model",
      "voice",
      "text",
      "locale",
      "view",
      "disclosure",
      "generatedAt",
      "sha256",
    ])
      assert.equal(entry[field], asset[field], `${asset.id}/${field}`);
    assert.equal(entry.audio, asset.file);
    assert.deepEqual(entry.usedBy, [asset.scene]);
    assert.equal(entry.provenance, "/public/narration/manifest.json");
    assert.ok(entry.note.includes(asset.model));
    assert.ok(entry.note.includes(asset.voice));
    assert.ok(entry.note.includes(asset.disclosure));
    assert.match(
      entry.note,
      /No Creative Commons or public-domain grant is asserted/,
    );
    const bytes = await readFile(new URL(`..${entry.audio}`, import.meta.url));
    assert.ok(bytes.length > 1000, asset.id);
    assert.equal(bytes.length, asset.bytes, asset.id);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      entry.sha256,
      asset.id,
    );
  }
});

test("review snapshots copy canonical source and dependencies without author-workspace links", async () => {
  const fixture = resolve("outputs", `snapshot-verification-${randomUUID()}`);
  const application = resolve(fixture, "author");
  const destination = resolve(fixture, "review");
  const directories = [
    "src",
    "scripts",
    "tests",
    "agentic-tests",
    "docs",
    "data",
  ];
  try {
    for (const directory of directories)
      await mkdir(resolve(application, directory), { recursive: true });
    const files = {
      "index.html": "<!doctype html><title>Snapshot fixture</title>",
      "package.json": '{"type":"module"}',
      "package-lock.json": "{}",
      "eslint.config.js": "export default [];",
      "playwright.config.js": "export default {};",
      ".prettierrc.json": "{}",
      ".prettierignore": "outputs/",
      "src/client/example.mjs": 'export const value = "preserved";',
      "src/server/index.mjs": [
        'import { value } from "../client/example.mjs";',
        'import dependency from "../../node_modules/example/index.mjs";',
        "console.log(value + ':' + dependency);",
      ].join("\n"),
      "scripts/snapshot-outdoor-review.mjs": await readFile(
        new URL("../scripts/snapshot-outdoor-review.mjs", import.meta.url),
        "utf8",
      ),
      "public/audio/manifest.json": '{"assets":[]}',
      "node_modules/example/index.mjs": 'export default "independent";',
      ".cache/generated-scenes/saved.json": '{"id":"saved"}',
      ".cache/textures/texture.bin": "cached-texture",
      "data/scenes/bundled.json": '{"id":"bundled"}',
      "main.js": 'throw new Error("Obsolete flat source must not be copied");',
      "server.mjs":
        'throw new Error("Obsolete flat server must not be copied");',
    };
    for (const [file, content] of Object.entries(files)) {
      const path = resolve(application, file);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content);
    }
    const run = () =>
      execFileSync(
        process.execPath,
        ["scripts/snapshot-outdoor-review.mjs", "--snapshot-dir", destination],
        { cwd: application, encoding: "utf8" },
      );
    assert.equal(JSON.parse(run()).snapshot, "ready");
    const manifest = JSON.parse(
      await readFile(resolve(destination, "review-snapshot.json"), "utf8"),
    );
    assert.equal(manifest.command, "node src/server/index.mjs");
    assert.ok(manifest.sources["src/server/index.mjs"]);
    assert.ok(manifest.sources["src/client/example.mjs"]);
    assert.ok(manifest.sources["data/scenes/bundled.json"]);
    for (const [file, hash] of Object.entries(manifest.sources)) {
      const bytes = await readFile(resolve(destination, file));
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        hash,
        file,
      );
      assert.equal(
        (await stat(resolve(destination, file))).mode & 0o222,
        0,
        file,
      );
    }
    for (const directory of ["src", "public", "node_modules"]) {
      assert.equal(
        (await lstat(resolve(destination, directory))).isSymbolicLink(),
        false,
      );
    }
    for (const file of ["main.js", "server.mjs"])
      await assert.rejects(stat(resolve(destination, file)), {
        code: "ENOENT",
      });

    assert.equal(
      await readFile(
        resolve(destination, ".cache/textures/texture.bin"),
        "utf8",
      ),
      "cached-texture",
    );
    await writeFile(
      resolve(application, "src/client/example.mjs"),
      'export const value = "changed";',
    );
    await writeFile(
      resolve(application, "node_modules/example/index.mjs"),
      'export default "changed";',
    );
    assert.equal(
      execFileSync(process.execPath, ["src/server/index.mjs"], {
        cwd: destination,
        encoding: "utf8",
      }).trim(),
      "preserved:independent",
    );
    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          [
            "scripts/snapshot-outdoor-review.mjs",
            "--snapshot-dir",
            destination,
          ],
          { cwd: application, stdio: "pipe" },
        ),
      /must not already exist/,
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("realism reports preserve three failed photographic reviews and their original findings", async () => {
  const directory = resolve("outputs", `realism-verification-${randomUUID()}`);
  const rubric = await readFile(
    new URL(
      "../agentic-tests/outdoors/outdoor-photographic-presence.yaml",
      import.meta.url,
    ),
    "utf8",
  );
  const criteria = [...rubric.matchAll(/^ {2}- id: ([a-z-]+)$/gm)].map(
    (match) => match[1],
  );
  assert.equal(criteria.length, 10);
  const inputs = new Map();
  try {
    for (const pass of [1, 2, 3]) {
      const path = resolve(directory, `pass-${pass}`, "results.json");
      const findings = {
        settings: Object.fromEntries(
          outdoorScenes.map((scene) => [
            scene.id,
            {
              rubric: Object.fromEntries(
                criteria.map((criterion) => [
                  criterion,
                  {
                    verdict:
                      criterion === "photographic-read" ? "fail" : "pass",
                    finding: `Original finding ${pass}/${scene.id}/${criterion}`,
                  },
                ]),
              ),
              overallPhotographicRead: "fail",
              overallReason: `Original photographic limitation ${pass}/${scene.id}`,
              viewInventory: {
                presetWides: [`screens/${scene.id}__view-arrival.png`],
              },
            },
          ]),
        ),
      };
      await mkdir(dirname(path), { recursive: true });
      const content = JSON.stringify(findings);
      inputs.set(path, content);
      await writeFile(path, content);
    }
    await writeFile(resolve(directory, "post-review-repair.json"), "{}");
    execFileSync(
      process.execPath,
      ["scripts/build-realism-report.mjs", directory],
      {
        encoding: "utf8",
        stdio: "pipe",
      },
    );
    const summary = JSON.parse(
      await readFile(resolve(directory, "summary.json"), "utf8"),
    );
    assert.equal(summary.inspections, outdoorScenes.length * 3);
    assert.equal(summary.criterionJudgements, outdoorScenes.length * 30);
    assert.equal(summary.finalPhotographicPasses, 0);
    for (const scene of summary.settings) {
      assert.equal(scene.passes.length, 3);
      for (const pass of scene.passes) {
        assert.equal(pass.photographicRead, "fail");
        assert.equal(
          pass.reason,
          `Original photographic limitation ${pass.pass}/${scene.id}`,
        );
      }
    }
    for (const [path, content] of inputs)
      assert.equal(await readFile(path, "utf8"), content);
    const report = await readFile(resolve(directory, "index.html"), "utf8");
    assert.match(report, /Final photographic-read result: 0\/11 pass/);
    assert.match(report, /Original review verdicts are preserved/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("all twelve interior previews have accurate rendered-capture provenance, including the riad", async () => {
  const [previews, credits] = await Promise.all([
    readFile(
      new URL("../public/previews/credits.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
    readFile(new URL("../public/credits.json", import.meta.url), "utf8").then(
      JSON.parse,
    ),
  ]);
  assert.equal(previews.rendered.length, 12);
  assert.equal(new Set(previews.rendered.map((entry) => entry.scene)).size, 12);
  assert.equal(previews.unchanged, undefined);
  assert.ok(previews.viewport.width > 0 && previews.viewport.height > 0);
  assert.equal(previews.reducedMotion, true);
  assert.deepEqual(previews.capture, {
    target: "#canvasMount",
    deviceScaleFactor: 1,
  });
  assert.equal(
    previews.rendered.find((entry) => entry.scene === "riad").view,
    "courtyard",
  );
  for (const preview of previews.rendered) {
    assert.equal(preview.file, `${preview.scene}.png`);
    const image = await readFile(
      new URL(`../public/previews/${preview.file}`, import.meta.url),
    );
    assert.ok(
      image
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    );
    assert.equal(image.readUInt32BE(16), preview.width, preview.scene);
    assert.equal(image.readUInt32BE(20), preview.height, preview.scene);
    const viewport = preview.viewport ?? previews.viewport;
    assert.ok(preview.width > 0 && preview.width <= viewport.width);
    assert.ok(preview.height > 0 && preview.height <= viewport.height);
    assert.equal(image.length, preview.bytes, preview.scene);
    assert.equal(
      createHash("sha256").update(image).digest("hex"),
      preview.sha256,
      preview.scene,
    );
  }
  const renderedCredit = credits.entries.find(
    (entry) => entry.source === "/public/previews/credits.json",
  );
  assert.ok(renderedCredit);
  assert.deepEqual(
    [...renderedCredit.usedBy].sort(),
    previews.rendered.map((preview) => preview.scene).sort(),
  );
  assert.match(renderedCredit.note, /including the riad/);
  const concepts = credits.entries.find(
    (entry) => entry.category === "Generated concepts",
  );
  assert.equal(concepts.title, "Historical interior concept imagery");
  assert.match(concepts.note, /not a description of current previews/);
});
