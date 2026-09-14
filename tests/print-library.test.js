import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import {
  printCatalog,
  printThemes,
} from "../src/client/environments/shared/print-catalog.js";
import { createPrintMaterials } from "../src/client/environments/shared/print-materials.js";
import { surfacePatinaProfile } from "../src/client/environments/shared/surface-patina.js";

test("every book face, label, record and poster has a real published image", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/print-library/manifest.json", import.meta.url),
    ),
  );
  const expected = [
    ...printCatalog.books.flatMap((book) =>
      ["front", "back", "spine", "page-left", "page-right"].map(
        (part) => `book-${book.id}-${part}`,
      ),
    ),
    ...printCatalog.labels.flatMap((label) => [
      `label-${label.id}`,
      `drawer-${label.id}`,
    ]),
    ...printCatalog.posters.map((poster) => `poster-${poster.id}`),
    ...printCatalog.records.flatMap((record) => [
      `record-${record.id}`,
      `record-spine-${record.id}`,
    ]),
  ];
  assert.deepEqual(
    manifest.assets.map((asset) => asset.id).sort(),
    expected.sort(),
  );
  for (const asset of manifest.assets) {
    const bytes = await readFile(new URL(`..${asset.image}`, import.meta.url));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      asset.sha256,
    );
    assert.ok(
      asset.sourceImage &&
        asset.sourceUrl &&
        asset.sourceAuthor &&
        asset.sourceLicense,
    );
    assert.ok(bytes.length > 3000);
  }
});

test("printed material images are cached and protected from surface grunge", () => {
  const owned = new Set(),
    paths = [];
  const library = createPrintMaterials({
    imageTexture(path) {
      paths.push(path);
      return new THREE.Texture({ src: path });
    },
    ownMaterial(material) {
      owned.add(material);
    },
  });
  const first = library.book("flora", "front");
  assert.equal(first, library.book("flora", "front"));
  assert.equal(paths.length, 1);
  assert.equal(surfacePatinaProfile(first), null);
  assert.match(library.label("mint").userData.artwork, /label-mint\.jpg$/);
  assert.match(
    library.drawer("ginger").userData.artwork,
    /drawer-ginger\.jpg$/,
  );
  assert.throws(() => library.book("missing"), /Unknown book image/);
  assert.throws(() => library.label("missing"), /Unknown labels print/);
  for (const material of owned) {
    material.map.dispose();
    material.dispose();
  }
});

test("every print theme references real, context-specific imagery", () => {
  for (const theme of Object.values(printThemes)) {
    assert.ok(printCatalog.posters.some((entry) => entry.id === theme.poster));
    assert.ok(printCatalog.books.some((entry) => entry.id === theme.book));
    for (const id of theme.labels)
      assert.ok(printCatalog.labels.some((entry) => entry.id === id));
  }
  assert.notDeepEqual(printThemes.herbshop.labels, printThemes.lisbon.labels);
  assert.notEqual(printThemes.workshop.poster, printThemes.cafe.poster);
});
