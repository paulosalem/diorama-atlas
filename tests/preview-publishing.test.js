import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

test("preview publishing includes Marrakech and retains unselected capture provenance", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "atlas-preview-publisher-"));
  try {
    await Promise.all(
      ["scripts", "public/previews", "captures"].map((name) =>
        mkdir(path.join(root, name), { recursive: true }),
      ),
    );
    await copyFile(
      new URL("../scripts/publish-previews.mjs", import.meta.url),
      path.join(root, "scripts/publish-previews.mjs"),
    );
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    );
    await writeFile(path.join(root, "captures/riad-courtyard.png"), png);
    await writeFile(path.join(root, "captures/unfinished-interior.png"), png);
    await writeFile(
      path.join(root, "captures/capture.json"),
      JSON.stringify({
        phase: "after",
        viewport: { width: 1280, height: 900 },
        scenes: [
          {
            id: "riad",
            views: [{ key: "courtyard", file: "riad-courtyard.png" }],
          },
          {
            id: "unfinished-interior",
            draft: true,
            views: [{ key: "arrival", file: "unfinished-interior.png" }],
          },
        ],
      }),
    );
    const prior = {
      file: "kissaten.png",
      scene: "kissaten",
      view: "room",
      width: 1,
      height: 1,
    };
    const draft = {
      file: "/public/outdoors/previews/unfinished-landscape.png",
      scene: "unfinished-landscape",
      view: "arrival",
      viewport: { width: 1280, height: 900 },
    };
    const outdoor = { ...draft, scene: "released-landscape" };
    await writeFile(
      path.join(root, "public/previews/credits.json"),
      JSON.stringify({
        viewport: { width: 1440, height: 1000 },
        rendered: [prior],
        outdoors: [outdoor],
        drafts: [draft],
        unchanged: [
          { file: "riad.png", source: "Obsolete imported reference." },
        ],
      }),
    );
    await promisify(execFile)(process.execPath, [
      path.join(root, "scripts/publish-previews.mjs"),
      "--input",
      path.join(root, "captures/capture.json"),
    ]);
    const credits = JSON.parse(
      await readFile(path.join(root, "public/previews/credits.json"), "utf8"),
    );
    assert.equal(credits.unchanged, undefined);
    assert.deepEqual(credits.drafts, [draft]);
    assert.deepEqual(credits.outdoors, [outdoor]);
    assert.equal(credits.rendered.length, 3);
    assert.equal(
      credits.rendered.find((entry) => entry.scene === "unfinished-interior")
        .draft,
      true,
    );
    assert.deepEqual(
      credits.rendered.find((entry) => entry.scene === "kissaten"),
      {
        ...prior,
        viewport: { width: 1440, height: 1000 },
      },
    );
    assert.deepEqual(
      credits.rendered.find((entry) => entry.scene === "riad"),
      {
        file: "riad.png",
        scene: "riad",
        view: "courtyard",
        width: 1,
        height: 1,
        viewport: { width: 1280, height: 900 },
        bytes: png.length,
        sha256: createHash("sha256").update(png).digest("hex"),
      },
    );
    assert.deepEqual(
      await readFile(path.join(root, "public/previews/riad.png")),
      png,
    );
    const publishedCredits = await readFile(
      path.join(root, "public/previews/credits.json"),
    );
    for (const miniature of [
      {
        mode: "miniature",
        scenes: [
          {
            id: "riad",
            views: [{ key: "overview", file: "riad-courtyard.png" }],
          },
        ],
      },
      {
        scenes: [
          {
            id: "riad",
            representation: "miniature",
            views: [{ key: "overview", file: "riad-courtyard.png" }],
          },
        ],
      },
    ]) {
      await writeFile(
        path.join(root, "captures/capture.json"),
        JSON.stringify({ phase: "after", ...miniature }),
      );
      await assert.rejects(
        promisify(execFile)(process.execPath, [
          path.join(root, "scripts/publish-previews.mjs"),
          "--input",
          path.join(root, "captures/capture.json"),
        ]),
        /Miniature captures must not replace/,
      );
      assert.deepEqual(
        await readFile(path.join(root, "public/previews/credits.json")),
        publishedCredits,
      );
      assert.deepEqual(
        await readFile(path.join(root, "public/previews/riad.png")),
        png,
      );
    }
    const indoorRecords = credits.rendered;
    await writeFile(
      path.join(root, "captures/capture.json"),
      JSON.stringify({
        phase: "after",
        viewport: { width: 1280, height: 900 },
        scenes: [
          {
            id: "released-landscape",
            views: [{ key: "arrival", file: "riad-courtyard.png" }],
          },
        ],
      }),
    );
    await promisify(execFile)(process.execPath, [
      path.join(root, "scripts/publish-previews.mjs"),
      "--input",
      path.join(root, "captures/capture.json"),
      "--environment",
      "outdoor",
    ]);
    const updated = JSON.parse(
      await readFile(path.join(root, "public/previews/credits.json"), "utf8"),
    );
    assert.deepEqual(updated.rendered, indoorRecords);
    assert.deepEqual(updated.drafts, [draft]);
    assert.equal(updated.outdoors.length, 1);
    assert.equal(updated.outdoors[0].reducedMotion, true);
    assert.equal(
      updated.outdoors[0].file,
      "/public/outdoors/previews/released-landscape.png",
    );
    assert.equal(
      updated.outdoors[0].sha256,
      createHash("sha256").update(png).digest("hex"),
    );
    assert.deepEqual(
      await readFile(
        path.join(root, "public/outdoors/previews/released-landscape.png"),
      ),
      png,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
