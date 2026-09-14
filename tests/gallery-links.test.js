import assert from "node:assert/strict";
import { test } from "node:test";
import { linkGalleryToApp } from "../scripts/helpers/gallery-links.mjs";

test("separately served galleries link scenes and public assets to the app, not the report server", () => {
  const html =
    '<a href="/">World</a><a href="/?scene=riad&amp;view=tea">Tea</a><img src="/public/previews/riad.png"><img src="after/riad.png"><a href="https://example.org/source">Source</a>';
  const result = linkGalleryToApp(html, "http://127.0.0.1:4183/");
  assert.ok(result.includes('href="http://127.0.0.1:4183/"'));
  assert.ok(
    result.includes('href="http://127.0.0.1:4183/?scene=riad&amp;view=tea"'),
  );
  assert.ok(
    result.includes('src="http://127.0.0.1:4183/public/previews/riad.png"'),
  );
  assert.ok(result.includes('src="after/riad.png"'));
  assert.ok(result.includes('href="https://example.org/source"'));
  assert.equal(linkGalleryToApp(result, "http://127.0.0.1:4183/"), result);
  assert.throws(() => linkGalleryToApp(html, "file:///private"));
  assert.throws(() => linkGalleryToApp(html, "http://secret@example.org/"));
});
