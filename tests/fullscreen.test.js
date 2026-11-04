import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createFullscreenSession } from "../src/client/viewer/fullscreen-control.js";
import { getMimeType } from "../src/server/http.mjs";

function fullscreenDocument() {
  const target = new EventTarget();
  target.fullscreenEnabled = true;
  target.fullscreenElement = null;
  target.requests = [];
  target.documentElement = {
    async requestFullscreen(options) {
      target.requests.push(options);
      target.fullscreenElement = target.documentElement;
      target.dispatchEvent(new Event("fullscreenchange"));
    },
  };
  target.exitFullscreen = async () => {
    target.fullscreenElement = null;
    target.dispatchEvent(new Event("fullscreenchange"));
  };
  return target;
}

test("fullscreen is opt-in, covers the document, and follows browser exits", async () => {
  const target = fullscreenDocument();
  let updates = 0;
  const session = createFullscreenSession({
    target,
    onChange: () => updates++,
  });
  assert.equal(target.requests.length, 0);
  assert.deepEqual(session.snapshot, {
    supported: true,
    active: false,
    pending: false,
  });
  await session.toggle();
  assert.deepEqual(target.requests, [{ navigationUI: "hide" }]);
  assert.equal(target.fullscreenElement, target.documentElement);
  assert.equal(session.snapshot.active, true);
  await target.exitFullscreen();
  assert.equal(session.snapshot.active, false);
  assert.ok(updates >= 4);
  await session.toggle();
  await session.toggle();
  assert.equal(session.snapshot.active, false);
  session.dispose();
});

test("unsupported or policy-disabled fullscreen fails without pretending to enter", async () => {
  for (const unavailable of ["policy", "method"]) {
    const target = fullscreenDocument();
    if (unavailable === "policy") target.fullscreenEnabled = false;
    else delete target.documentElement.requestFullscreen;
    const session = createFullscreenSession({ target });
    assert.equal(session.snapshot.supported, false);
    await assert.rejects(session.toggle(), /not available/);
    assert.equal(session.snapshot.active, false);
    assert.equal(session.snapshot.pending, false);
    assert.equal(target.requests.length, 0);
    session.dispose();
  }
});

test("rejected entry and exit requests surface errors and remain retryable", async () => {
  const target = fullscreenDocument();
  const request = target.documentElement.requestFullscreen;
  target.documentElement.requestFullscreen = async () => {
    throw new Error("Entry denied");
  };
  const session = createFullscreenSession({ target });
  await assert.rejects(session.toggle(), /Entry denied/);
  assert.equal(session.snapshot.pending, false);
  assert.equal(session.snapshot.active, false);
  target.documentElement.requestFullscreen = request;
  await session.toggle();
  const exit = target.exitFullscreen;
  target.exitFullscreen = async () => {
    throw new Error("Exit denied");
  };
  await assert.rejects(session.toggle(), /Exit denied/);
  assert.equal(session.snapshot.pending, false);
  assert.equal(session.snapshot.active, true);
  target.exitFullscreen = exit;
  await session.toggle();
  assert.equal(session.snapshot.active, false);
  session.dispose();
});

test("pending requests are not duplicated and disposal releases notifications", async () => {
  const target = fullscreenDocument();
  let complete;
  let requests = 0;
  let updates = 0;
  target.documentElement.requestFullscreen = () => {
    requests++;
    return new Promise((resolve) => {
      complete = resolve;
    });
  };
  const session = createFullscreenSession({
    target,
    onChange: () => updates++,
  });
  const pending = session.toggle();
  await session.toggle();
  assert.equal(requests, 1);
  assert.equal(session.snapshot.pending, true);
  session.dispose();
  const before = updates;
  complete();
  await pending;
  target.dispatchEvent(new Event("fullscreenchange"));
  assert.equal(updates, before);
  await assert.rejects(session.toggle(), /disposed/);
});

test("Home Screen metadata and icons work at root and project paths", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../public/app.webmanifest", import.meta.url)),
  );
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.name, "Diorama Atlas");
  assert.match(getMimeType("app.webmanifest"), /^application\/manifest\+json/);
  for (const base of [
    "https://atlas.example/",
    "https://atlas.example/atlas/",
  ]) {
    const url = new URL("public/app.webmanifest", base);
    for (const key of ["scope", "start_url"])
      assert.equal(new URL(manifest[key], url).href, base, key);
    const start = new URL(manifest.start_url, url);
    const id = manifest.id ? new URL(manifest.id, start.origin) : start;
    assert.equal(id.href, base);
    for (const icon of manifest.icons)
      assert.ok(
        new URL(icon.src, url).href.startsWith(`${base}public/app-icons/`),
      );
  }
  for (const size of [180, 192, 512]) {
    const bytes = await readFile(
      new URL(`../public/app-icons/atlas-${size}.png`, import.meta.url),
    );
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /rel="manifest"/);
  assert.match(html, /apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /rel="apple-touch-icon"/);
  assert.match(html, /viewport-fit=cover/);
});
