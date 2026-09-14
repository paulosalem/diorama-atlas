import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { promises as fs } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { createAtlasServer } from "../src/server/app.mjs";
import { createPathConfig, projectRoot } from "../src/server/paths.mjs";

const bundledDirectory = path.join(projectRoot, "data/scenes");
const bundledPackages = await Promise.all(
  (await fs.readdir(bundledDirectory))
    .filter((filename) => filename.endsWith(".json"))
    .map(async (filename) => ({
      filename,
      package: JSON.parse(
        await fs.readFile(path.join(bundledDirectory, filename), "utf8"),
      ),
    })),
);
const imageBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
const audioBytes = Buffer.from("fixture narration bytes");

async function closeServer(server) {
  if (!server.listening) return;
  const closed = new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
  await closed;
}

async function createFixture(t) {
  const directory = path.join(
    projectRoot,
    ".cache",
    `server-unit-${process.pid}-${randomUUID()}`,
  );
  await fs.mkdir(directory, { recursive: true });
  const servers = [];
  t.after(async () => {
    try {
      await Promise.all(servers.map(closeServer));
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  return {
    directory,
    async start(options = {}) {
      const cacheDir = path.join(directory, "cache");
      const server = await createAtlasServer({
        cacheDir,
        apiKey: "",
        openaiClient: null,
        ...options,
      });
      assert.equal(server.listening, false);
      servers.push(server);
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const origin = `http://127.0.0.1:${server.address().port}`;
      return {
        server,
        cacheDir: options.cacheDir ?? cacheDir,
        async request(pathname, { json, ...options } = {}) {
          const response = await fetch(`${origin}${pathname}`, {
            signal: AbortSignal.timeout(5000),
            ...options,
            ...(json === undefined
              ? {}
              : {
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(json),
                }),
          });
          const body = Buffer.from(await response.arrayBuffer());
          const text = body.toString("utf8");
          return {
            status: response.status,
            headers: response.headers,
            body,
            text,
            payload:
              text &&
              response.headers.get("content-type")?.includes("application/json")
                ? JSON.parse(text)
                : null,
          };
        },
      };
    },
  };
}

function assertJson(response, status, payload) {
  assert.equal(response.status, status);
  assert.equal(
    response.headers.get("content-type"),
    "application/json; charset=utf-8",
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  if (payload !== undefined) {
    assert.deepEqual(response.payload, payload);
  }
}

async function waitForJob(client, jobId) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const response = await client.request(
      `/api/generated-scenes/jobs/${jobId}`,
    );
    assertJson(response, 200);
    const { job } = response.payload;
    if (job.status === "completed" || job.status === "failed") {
      return job;
    }
    await delay(10);
  }
  assert.fail(`Generation job ${jobId} did not finish.`);
}

test("a missing writable cache loads all seven bundled scene packages", async (t) => {
  const fixture = await createFixture(t);
  const cacheDir = path.join(fixture.directory, "cache");
  await assert.rejects(fs.access(cacheDir), { code: "ENOENT" });
  const client = await fixture.start();
  const response = await client.request("/api/generated-scenes");
  assertJson(response, 200);
  assert.deepEqual(Object.keys(response.payload), ["scenes"]);
  const { scenes } = response.payload;
  assert.equal(scenes.length, 7);
  assert.equal(new Set(scenes.map((scene) => scene.id)).size, 7);
  assert.deepEqual(
    scenes.map(({ id, title }) => ({ id, title })),
    bundledPackages
      .map(({ package: entry }) => entry.scene)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(({ id, title }) => ({ id, title })),
  );
  assert.deepEqual((await fs.readdir(cacheDir)).sort(), [
    "concepts",
    "generated-scenes",
    "narration",
    "textures",
  ]);
  assert.deepEqual(
    await fs.readdir(path.join(cacheDir, "generated-scenes")),
    [],
  );
  const head = await client.request("/api/generated-scenes", {
    method: "HEAD",
  });
  assertJson(head, 200);
  assert.equal(head.body.length, 0);
  const favicon = await client.request("/favicon.ico");
  assert.equal(favicon.status, 204);
  assert.equal(favicon.body.length, 0);
});

test("cache paths ignore cwd and an empty API key overrides inherited credentials", async (t) => {
  const fixture = await createFixture(t);
  const previousCache = process.env.ATLAS_CACHE_DIR;
  const previousKey = process.env.OPENAI_API_KEY;
  const previousCwd = process.cwd();
  const cacheDir = path.join(fixture.directory, "environment-cache");
  process.env.ATLAS_CACHE_DIR = cacheDir;
  process.env.OPENAI_API_KEY = "unused-test-value-never-sent";
  try {
    process.chdir(fixture.directory);
    assert.equal(createPathConfig().cacheDir, cacheDir);
    assert.equal(
      createPathConfig({ cacheDir: "test-results/server-cache" }).cacheDir,
      path.join(projectRoot, "test-results/server-cache"),
    );
    assert.equal(createPathConfig().bundledSceneDir, bundledDirectory);
    const client = await fixture.start({
      cacheDir: undefined,
      openaiClient: undefined,
      apiKey: "",
    });
    const response = await client.request("/api/concepts/riad/hero");
    assertJson(response, 503, {
      error: "concept_generation_failed",
      message: "OPENAI_API_KEY is not set for concept image generation.",
      scene: "riad",
      variant: "hero",
    });
    assert.deepEqual((await fs.readdir(cacheDir)).sort(), [
      "concepts",
      "generated-scenes",
      "narration",
      "textures",
    ]);
  } finally {
    process.chdir(previousCwd);
    if (previousCache === undefined) delete process.env.ATLAS_CACHE_DIR;
    else process.env.ATLAS_CACHE_DIR = previousCache;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test("HTTP static serving exposes actual browser assets but not repository internals", async (t) => {
  const fixture = await createFixture(t);
  const client = await fixture.start();
  const assets = [
    ["/", "text/html; charset=utf-8"],
    ["/index.html", "text/html; charset=utf-8"],
    ["/src/client/main.js", "text/javascript; charset=utf-8"],
    ["/src/client/styles.css", "text/css; charset=utf-8"],
    ["/public/earth/credits.json", "application/json; charset=utf-8"],
    ["/public/previews/riad.png", "image/png"],
    [
      "/node_modules/three/build/three.module.js",
      "text/javascript; charset=utf-8",
    ],
    [
      "/node_modules/three/build/three.core.js",
      "text/javascript; charset=utf-8",
    ],
    [
      "/node_modules/three/examples/jsm/controls/OrbitControls.js",
      "text/javascript; charset=utf-8",
    ],
  ];
  for (const [pathname, mimeType] of assets) {
    const response = await client.request(pathname);
    assert.equal(response.status, 200, pathname);
    assert.equal(response.headers.get("content-type"), mimeType, pathname);
    assert.equal(response.headers.get("cache-control"), "no-cache", pathname);
    assert.equal(
      Number(response.headers.get("content-length")),
      response.body.length,
    );
    assert.ok(response.body.length > 0, pathname);
    const head = await client.request(pathname, { method: "HEAD" });
    assert.equal(head.status, 200, pathname);
    assert.equal(head.body.length, 0, pathname);
    assert.equal(
      head.headers.get("content-length"),
      response.headers.get("content-length"),
    );
  }
  for (const pathname of [
    "/server.mjs",
    "/src/server/app.mjs",
    "/package.json",
    "/package-lock.json",
    "/README.md",
    "/docs/architecture.md",
    "/.git/config",
    "/.env",
    "/.cache/generated-scenes/scene.json",
    `/data/scenes/${bundledPackages[0].filename}`,
    "/node_modules/openai/index.mjs",
    "/node_modules/three/package.json",
    "/outputs/imported-assets/atlas-models/teacup.glb",
  ]) {
    assertJson(await client.request(pathname), 403, { error: "forbidden" });
  }
  for (const pathname of [
    "/public/nonexistent-test-asset.png",
    "/src/client/",
  ]) {
    assertJson(await client.request(pathname), 404, { error: "not_found" });
  }
});

test("static and asset routes reject symlink escapes, traversal, and malformed encodings", async (t) => {
  const fixture = await createFixture(t);
  const rootDir = path.join(fixture.directory, "static-root");
  await fs.mkdir(path.join(rootDir, "public"), { recursive: true });
  await fs.writeFile(path.join(rootDir, "index.html"), "<html>Fixture</html>");
  await fs.writeFile(path.join(rootDir, "package.json"), '{"private":true}');
  await fs.symlink(
    path.join(rootDir, "package.json"),
    path.join(rootDir, "public/escape.json"),
  );
  const client = await fixture.start({ rootDir, bundledSceneDir: null });
  assert.equal((await client.request("/")).status, 200);
  for (const pathname of [
    "/public/escape.json",
    "/public/%2e%2e%2fpackage.json",
    "/public/%5c..%5cpackage.json",
    "/public/.env",
    "/public/%2eenv",
  ]) {
    assertJson(await client.request(pathname), 403, { error: "forbidden" });
  }
  for (const pathname of [
    "/public/%ZZ",
    "/api/concepts/%ZZ",
    "/api/narration/%ZZ/detail",
    "/api/textures/%ZZ",
    "/api/generated-scenes/jobs/%ZZ",
  ]) {
    assertJson(await client.request(pathname), 400, { error: "bad_request" });
  }
  const texture = await client.request("/api/textures/%2e%2e%2fsecret");
  assertJson(texture, 400, {
    error: "texture_failed",
    message: "Invalid asset identifier.",
  });
  const review = await client.request(
    "/api/generated-scenes/%2e%2e%2fsecret/review",
    {
      method: "POST",
      json: {
        screenshot: `data:image/png;base64,${imageBytes.toString("base64")}`,
      },
    },
  );
  assertJson(review, 400, {
    error: "generated_scene_review_failed",
    message: "Invalid asset identifier.",
    scene: "../secret",
  });
  assertJson(await client.request("/api/generated-scenes"), 200, {
    scenes: [],
  });
});

test("local scene packages overlay bundled IDs while preserving complete stored envelopes", async (t) => {
  const fixture = await createFixture(t);
  const cacheDir = path.join(fixture.directory, "cache");
  const sceneDir = path.join(cacheDir, "generated-scenes");
  await fs.mkdir(sceneDir, { recursive: true });
  const { filename, package: original } = bundledPackages[0];
  const override = structuredClone(original);
  override.scene.title = "Local title takes precedence";
  override.importMetadata = { retained: true };
  const filePath = path.join(sceneDir, "local-override.json");
  await fs.writeFile(filePath, JSON.stringify(override));
  const client = await fixture.start();
  const response = await client.request("/api/generated-scenes");
  assertJson(response, 200);
  assert.equal(response.payload.scenes.length, 7);
  assert.equal(
    response.payload.scenes.filter((scene) => scene.id === original.scene.id)
      .length,
    1,
  );
  assert.equal(
    response.payload.scenes.find((scene) => scene.id === original.scene.id)
      .title,
    override.scene.title,
  );
  assert.deepEqual(JSON.parse(await fs.readFile(filePath, "utf8")), override);
  assert.deepEqual(
    JSON.parse(
      await fs.readFile(path.join(bundledDirectory, filename), "utf8"),
    ),
    original,
  );
});

test("malformed bundled or cached packages fail startup with a named diagnostic", async (t) => {
  const fixture = await createFixture(t);
  for (const kind of ["bundled", "cached"]) {
    for (const [filename, content] of [
      ["invalid.json", "{not-json"],
      ["missing-id.json", "{}"],
    ]) {
      const directory = path.join(fixture.directory, `${kind}-${filename}`);
      const cacheDir = path.join(directory, "cache");
      const bundledSceneDir = path.join(directory, "bundled");
      const invalidDir =
        kind === "bundled"
          ? bundledSceneDir
          : path.join(cacheDir, "generated-scenes");
      await fs.mkdir(invalidDir, { recursive: true });
      const filePath = path.join(invalidDir, filename);
      await fs.writeFile(filePath, content);
      await assert.rejects(
        createAtlasServer({
          cacheDir,
          bundledSceneDir: kind === "bundled" ? bundledSceneDir : null,
          apiKey: "",
          openaiClient: null,
        }),
        (error) => {
          assert.ok(error.message.includes(filePath), error.message);
          if (filename === "invalid.json") {
            assert.ok(error.cause instanceof SyntaxError);
          } else {
            assert.match(
              error.message,
              /Scene package must contain a scene.id/,
            );
          }
          return true;
        },
      );
    }
  }
});

test("no-key HTTP errors, generation jobs, and factory isolation preserve their contracts", async (t) => {
  const fixture = await createFixture(t);
  const client = await fixture.start({ bundledSceneDir: null });
  assertJson(await client.request("/api/concepts/missing"), 404, {
    error: "concept_generation_failed",
    message: "Unknown concept scene: missing",
    scene: "missing",
    variant: "hero",
  });
  assertJson(await client.request("/api/narration/riad/missing"), 404, {
    error: "narration_generation_failed",
    message: "Unknown narration detail: riad/missing",
    scene: "riad",
    detail: "missing",
  });
  assertJson(await client.request("/api/narration/riad/fountain"), 503, {
    error: "narration_generation_failed",
    message: "OPENAI_API_KEY is not set for narration generation.",
    scene: "riad",
    detail: "fountain",
  });
  assertJson(await client.request("/api/textures/missing"), 404, {
    error: "texture_not_found",
    message: "Unknown texture missing.",
  });
  assertJson(await client.request("/api/textures/"), 400, {
    error: "missing_texture_id",
    message: "A texture id is required.",
  });
  assertJson(await client.request("/api/generated-scenes/jobs/missing"), 404, {
    error: "job_not_found",
    message: "No generation job exists with id missing.",
  });
  for (const pathname of [
    "/",
    "/api/concepts/riad/hero",
    "/api/narration/riad/fountain",
    "/api/textures/missing",
    "/api/generated-scenes",
    "/api/generated-scenes/jobs/missing",
    "/api/generated-scenes/missing/review",
  ]) {
    assertJson(await client.request(pathname, { method: "PUT" }), 405, {
      error: "method_not_allowed",
    });
  }
  assertJson(
    await client.request("/api/generated-scenes/missing/review"),
    405,
    { error: "method_not_allowed" },
  );
  assertJson(
    await client.request("/api/generated-scenes", { method: "POST", json: {} }),
    400,
    {
      error: "missing_prompt",
      message: "A prompt describing the diorama is required.",
    },
  );
  assertJson(
    await client.request("/api/generated-scenes/missing/review", {
      method: "POST",
      json: {},
    }),
    400,
    {
      error: "missing_screenshot",
      message: "A PNG screenshot data URL is required for review.",
    },
  );
  const invalid = await client.request("/api/generated-scenes", {
    method: "POST",
    body: "{not-json",
  });
  assertJson(invalid, 400);
  assert.equal(invalid.payload.error, "generated_scene_failed");
  const queued = await client.request("/api/generated-scenes", {
    method: "POST",
    json: { prompt: "A scene without a provider", depth: 999 },
  });
  assertJson(queued, 202);
  const job = await waitForJob(client, queued.payload.job.id);
  assert.equal(job.depth, 6);
  assert.equal(job.status, "failed");
  assert.deepEqual(job.error, {
    message: "OPENAI_API_KEY is not set for generated diorama creation.",
    statusCode: 503,
  });
  assert.equal("promptHash" in job, false);
  assert.ok(job.steps.every((step) => !("stepProgress" in step)));
  const head = await client.request(`/api/generated-scenes/jobs/${job.id}`, {
    method: "HEAD",
  });
  assertJson(head, 200);
  assert.equal(head.body.length, 0);
  const independent = await fixture.start({ bundledSceneDir: null });
  assert.equal(
    (await independent.request(`/api/generated-scenes/jobs/${job.id}`)).status,
    404,
  );
  assertJson(await independent.request("/api/generated-scenes"), 200, {
    scenes: [],
  });
});

function createMockProvider() {
  const calls = [];
  const spec = {
    title: "Regression Fixture Shop",
    region: "Test region",
    period: "Contemporary",
    blurb: "A fixture interior",
    summary: "A small shop with a central counter and side shelves.",
    accent: "#c08b56",
    colorHexes: ["#c08b56", "#ffffff", "#111111", "#dddddd", "#aaaaaa"],
    archetype: "shop",
    concept: {
      hero: "A shop",
      mood: "Calm",
      layout: "Counter at back",
      references: ["hero", "detail", "overview"].map((id) => ({
        id,
        label: id,
        note: `${id} framing`,
        prompt: `Photorealistic ${id} reference`,
      })),
    },
    palette: ["wood", "plaster", "brass", "paper"],
    props: ["counter", "shelves", "jars", "packets", "scale", "baskets"],
    learning: [
      "First fixture fact",
      "Second fixture fact",
      "Third fixture fact",
    ],
    blueprint: {
      lighting: "soft_daylight",
      density: "dense",
      cameraBias: "center",
      floorMaterial: "wood_planks",
      wallMaterial: "plaster_warm",
      features: ["drawer_wall", "bundle_racks", "scale_table", "jar_shelves"],
      counts: {
        tableCount: 1,
        chairCount: 2,
        shelfCount: 3,
        plantCount: 1,
        lanternCount: 1,
        basketCount: 2,
        jarCount: 5,
        displayCount: 3,
      },
    },
    details: [
      "drawer_wall",
      "bundle_rack",
      "scale_table",
      "jar_shelf",
      "packet_counter",
    ].map((anchor, index) => ({
      id: `detail-${index + 1}`,
      title: `Detail ${index + 1}`,
      body: `Fixture context for ${anchor}.`,
      anchor,
    })),
  };
  const inventory = {
    summary: "Visible counter and shelves",
    roomLogic: "Open center",
    lightingRead: "Daylight",
    clutterNotes: ["Paper", "Vessels", "Tools", "Baskets"],
    inventory: Array.from({ length: 12 }, (_, index) => ({
      label: `Object ${index + 1}`,
      category: "fixture",
      count: 1,
      materials: ["wood"],
      zone: "back_center",
      detail: "Visible fixture object",
    })),
    materialObservations: ["Wood", "Plaster", "Ceramic", "Metal"],
    anchorObservations: spec.details.slice(0, 3).map(({ anchor }) => ({
      anchor,
      description: "Visible anchor",
      zone: "back_center",
    })),
  };
  const build = {
    summary: "Fixture recursive build",
    depth: 4,
    rootLabel: "Shop",
    camera: { position: [5, 3, 5], target: [0, 1, 0] },
    nodes: Array.from({ length: 14 }, (_, index) => ({
      id: `node-${index + 1}`,
      parentId: "root",
      depth: 2,
      label: `Counter ${index + 1}`,
      builder: "counter",
      surfaceRole: "wood",
      position: [index / 10, 0, -2],
      rotationY: 0,
      scale: [1, 1, 1],
      quantity: 1,
      anchor: "drawer_wall",
      importance: "detail",
      notes: "Fixture object",
    })),
    surfaceAssignments: ["wood", "wall", "ceramic"].map((surfaceRole) => ({
      surfaceRole,
      textureLabel: `Fixture ${surfaceRole}`,
      descriptor: `Worn ${surfaceRole} material`,
      materialHint: surfaceRole,
      repeat: [2, 2],
    })),
    anchorRefinements: [],
  };
  const review = {
    summary: "Fixture review",
    alignmentScore: 88,
    clutterMultiplier: 1.2,
    camera: { position: [4, 3, 4], target: [0, 1, 0] },
    notes: ["Better framing", "Visible counter", "Balanced shelves"],
    detailPoints: [{ anchor: "drawer_wall", point: [1, 2, -2] }],
  };
  function record(operation, args, firstModel, status) {
    calls.push({ operation, ...args });
    if (args.model === firstModel) {
      const error = new Error("Fixture model unavailable");
      error.status = status;
      throw error;
    }
  }
  const provider = {
    chat: {
      completions: {
        async create(args) {
          record("scene", args, "gpt-4.1-mini", 404);
          return { choices: [{ message: { content: JSON.stringify(spec) } }] };
        },
      },
    },
    images: {
      async generate(args) {
        record("image", args, "gpt-image-1.5", 403);
        return { data: [{ b64_json: imageBytes.toString("base64") }] };
      },
    },
    audio: {
      speech: {
        async create(args) {
          record("speech", args, "gpt-4o-mini-tts", 400);
          return new Response(audioBytes);
        },
      },
    },
    responses: {
      async create(args) {
        record("structured", args, "gpt-4.1-mini", 400);
        const outputs = {
          generated_reference_inventory: inventory,
          generated_recursive_build: build,
          generated_diorama_review: review,
        };
        assert.ok(Object.hasOwn(outputs, args.text.format.name));
        return { output_text: JSON.stringify(outputs[args.text.format.name]) };
      },
    },
  };
  return { provider, calls };
}

test("mocked generation, review, media caching, fallback models, and restart work over HTTP", async (t) => {
  const fixture = await createFixture(t);
  const { provider, calls } = createMockProvider();
  const client = await fixture.start({
    bundledSceneDir: null,
    openaiClient: provider,
  });
  const independent = await fixture.start({ bundledSceneDir: null });
  const prompt = "Fixture shop for the complete regression pipeline";
  const submitted = await client.request("/api/generated-scenes", {
    method: "POST",
    json: { prompt, depth: 4 },
  });
  assertJson(submitted, 202);
  const job = await waitForJob(client, submitted.payload.job.id);
  assert.equal(job.status, "completed", JSON.stringify(job.error));
  assert.equal(job.progress, 100);
  assert.equal(job.cached, false);
  assert.equal(job.scene.generation.depth, 4);
  assert.equal(job.scene.buildTree.nodes.length, 14);
  assert.equal(job.scene.textureLibrary.length, 3);
  assert.deepEqual(
    job.steps.map(({ id, status }) => ({ id, status })),
    [
      "scene_packet",
      "references",
      "inventory",
      "layout",
      "textures",
      "finalize",
    ].map((id) => ({ id, status: "completed" })),
  );
  const id = job.scene.id;
  const conceptPath = `/api/concepts/${id}/hero`;
  const concept = await client.request(conceptPath);
  assert.equal(concept.status, 200);
  assert.equal(concept.headers.get("content-type"), "image/png");
  assert.equal(concept.headers.get("cache-control"), "public, max-age=86400");
  assert.equal(concept.headers.get("x-concept-source"), "cache");
  assert.equal(concept.headers.get("x-concept-model"), "cache");
  assert.deepEqual(concept.body, imageBytes);
  const fallbackVariant = await client.request(`/api/concepts/${id}/unknown`);
  assert.equal(fallbackVariant.headers.get("x-concept-reference"), "unknown");
  assert.deepEqual(fallbackVariant.body, imageBytes);
  const texture = await client.request(
    `/api/textures/${job.scene.textureLibrary[0].id}`,
  );
  assert.equal(texture.status, 200);
  assert.equal(
    texture.headers.get("cache-control"),
    "public, max-age=31536000, immutable",
  );
  assert.equal(texture.headers.get("x-texture-role"), "wood");
  assert.deepEqual(texture.body, imageBytes);
  const narrationPath = `/api/narration/${id}/detail-1`;
  for (const source of ["openai", "cache"]) {
    const narration = await client.request(narrationPath);
    assert.equal(narration.status, 200);
    assert.equal(narration.headers.get("content-type"), "audio/mpeg");
    assert.equal(
      narration.headers.get("cache-control"),
      "public, max-age=86400",
    );
    assert.equal(narration.headers.get("x-narration-source"), source);
    assert.equal(
      narration.headers.get("x-narration-voice"),
      source === "cache" ? "cache" : "alloy",
    );
    assert.deepEqual(narration.body, audioBytes);
  }
  const refreshed = await client.request(`${conceptPath}?refresh=1`);
  assert.equal(refreshed.headers.get("x-concept-source"), "openai");
  assert.equal(refreshed.headers.get("x-concept-model"), "gpt-image-1");
  assert.deepEqual(refreshed.body, imageBytes);

  const priorImageCalls = calls.filter(
    ({ operation }) => operation === "image",
  ).length;
  const concurrent = await Promise.all([
    client.request("/api/concepts/riad/hero"),
    client.request("/api/concepts/riad/hero"),
  ]);
  assert.ok(concurrent.every(({ status }) => status === 200));
  assert.equal(
    calls.filter(({ operation }) => operation === "image").length -
      priorImageCalls,
    2,
    "Concurrent requests share one generation, including its fallback attempt.",
  );

  const packagePath = path.join(
    client.cacheDir,
    "generated-scenes",
    `${id}.json`,
  );
  const original = JSON.parse(await fs.readFile(packagePath, "utf8"));
  original.importMetadata = { retained: true };
  await fs.writeFile(packagePath, JSON.stringify(original));
  const reviewed = await client.request(`/api/generated-scenes/${id}/review`, {
    method: "POST",
    json: {
      screenshot: `data:image/png;base64,${imageBytes.toString("base64")}`,
    },
  });
  assertJson(reviewed, 200);
  assert.equal(reviewed.payload.reviewed, true);
  assert.equal(reviewed.payload.scene.review.status, "completed");
  assert.equal(reviewed.payload.scene.review.patch.alignmentScore, 88);
  assert.deepEqual(reviewed.payload.scene.camera.position, [4, 3, 4]);
  const stored = JSON.parse(await fs.readFile(packagePath, "utf8"));
  for (const key of [
    "createdAt",
    "requestPromptHash",
    "model",
    "conceptVariants",
    "importMetadata",
  ]) {
    assert.deepEqual(stored[key], original[key], key);
  }
  const callCount = calls.length;
  const cached = await client.request("/api/generated-scenes", {
    method: "POST",
    json: { prompt: `  ${prompt.toUpperCase()}  `, depth: 4 },
  });
  assertJson(cached, 200);
  assert.equal(cached.payload.job.cached, true);
  assert.equal(cached.payload.job.status, "completed");
  assert.equal(calls.length, callCount);

  assert.deepEqual(
    calls
      .filter(({ operation }) => operation === "scene")
      .map(({ model }) => model),
    ["gpt-4.1-mini", "gpt-4o-mini"],
  );
  assert.ok(
    calls.some(
      ({ operation, model, size }) =>
        operation === "image" &&
        model === "gpt-image-1" &&
        size === "1024x1024",
    ),
  );
  assert.ok(
    calls.some(
      ({ operation, model, size }) =>
        operation === "image" &&
        model === "gpt-image-1" &&
        size === "1536x1024",
    ),
  );
  assert.deepEqual(
    calls
      .filter(({ operation }) => operation === "speech")
      .map(({ model, voice }) => ({ model, voice })),
    [
      { model: "gpt-4o-mini-tts", voice: "sage" },
      { model: "tts-1-hd", voice: "alloy" },
    ],
  );
  assert.deepEqual(
    calls
      .filter(
        ({ operation, model }) =>
          operation === "structured" && model === "gpt-4o-mini",
      )
      .map(({ text }) => text.format.name),
    [
      "generated_reference_inventory",
      "generated_recursive_build",
      "generated_diorama_review",
    ],
  );

  assertJson(await independent.request("/api/generated-scenes"), 200, {
    scenes: [],
  });
  assert.equal((await independent.request(conceptPath)).status, 404);
  assert.equal(
    (await independent.request(`/api/generated-scenes/jobs/${job.id}`)).status,
    404,
  );
  await closeServer(client.server);
  const restarted = await fixture.start({ bundledSceneDir: null });
  const reloaded = await restarted.request("/api/generated-scenes");
  assert.equal(reloaded.payload.scenes.length, 1);
  assert.equal(reloaded.payload.scenes[0].review.status, "completed");
  const offline = await restarted.request("/api/generated-scenes", {
    method: "POST",
    json: { prompt, depth: 4 },
  });
  assertJson(offline, 200);
  assert.equal(offline.payload.job.cached, true);
  for (const pathname of [
    conceptPath,
    narrationPath,
    `/api/textures/${job.scene.textureLibrary[0].id}`,
  ]) {
    const head = await restarted.request(pathname, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
    assert.ok(Number(head.headers.get("content-length")) > 0);
  }
  assert.equal(calls.length, callCount);
});
