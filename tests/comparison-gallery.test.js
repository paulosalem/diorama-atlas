import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

test("mixed scene comparisons retain every camera without requiring a passage", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "atlas-comparison-"));
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  const scenes = [
    {
      id: "outdoor",
      title: "Outdoor",
      views: ["arrival", "water", "hill", "yard"],
    },
    {
      id: "interior",
      title: "Interior",
      views: ["room", "table", "window", "passage"],
    },
    {
      id: "outdoor",
      version: "miniature",
      title: "Outdoor",
      views: ["whole", "river", "hill", "yard"],
    },
  ].map((scene) => ({
    ...scene,
    views: scene.views.map((key) => ({
      key,
      label: key,
      file: "view.png",
      camera: {
        position: [1, 2, 3],
        target: [1, 2, 2],
        quaternion: [0, 0, 0, 1],
        fov: 40,
      },
    })),
  }));
  const capture = { viewport: { width: 1280, height: 900 }, scenes };
  const command = [
    new URL("../scripts/build-comparison.mjs", import.meta.url).pathname,
    "--input-dir",
    root,
    "--app-url",
    "http://127.0.0.1:4183",
  ];
  try {
    for (const phase of ["before", "after"]) {
      await mkdir(path.join(root, phase));
      await writeFile(path.join(root, phase, "view.png"), png);
      await writeFile(
        path.join(root, phase, "capture.json"),
        JSON.stringify(capture),
      );
    }
    await promisify(execFile)(process.execPath, command);
    const html = await readFile(path.join(root, "index.html"), "utf8");
    assert.ok(html.includes('"passage":null'));
    assert.ok(html.includes('"file":"after/view.png"'));
    assert.ok(
      html.includes(
        'document.querySelector(".connected").hidden = !scene.passage',
      ),
    );
    assert.ok(!html.includes("Eleven interiors"));
    assert.ok(!html.includes("movement paused for comparison"));
    const data = JSON.parse(html.match(/const data = (.+);/)[1]);
    assert.deepEqual(
      data.scenes.map(({ key }) => key),
      ["outdoor", "interior", "outdoor:miniature"],
    );
    assert.equal(data.scenes[2].version, "miniature");
    capture.scenes[0].views[0].camera.quaternion[3] = -1;
    capture.scenes[0].views[0].camera.position[0] += 1e-14;
    await writeFile(
      path.join(root, "after/capture.json"),
      JSON.stringify(capture),
    );
    await promisify(execFile)(process.execPath, command);
    capture.scenes[0].views[0].camera.position[0] = 9;
    await writeFile(
      path.join(root, "after/capture.json"),
      JSON.stringify(capture),
    );
    await assert.rejects(
      promisify(execFile)(process.execPath, command),
      /comparison cameras differ/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
