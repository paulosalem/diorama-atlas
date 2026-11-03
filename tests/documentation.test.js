import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      if (entry.isDirectory())
        return markdownFiles(new URL(`${entry.name}/`, directory));
      return entry.name.endsWith(".md") ? [new URL(entry.name, directory)] : [];
    }),
  );
  return nested.flat();
}

test("public documentation and repository skills have resolvable local links", async () => {
  const files = [
    ...["README.md", "AGENTS.md", "CONTRIBUTING.md", "CHANGELOG.md"].map(
      (path) => new URL(path, root),
    ),
    ...(await markdownFiles(new URL("docs/", root))),
    ...(await markdownFiles(new URL(".github/skills/", root))),
  ];
  for (const file of files) {
    const text = (await readFile(file, "utf8")).replace(/```[\s\S]*?```/g, "");
    const inline = [...text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)];
    const references = [...text.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gm)];
    for (const match of [...inline, ...references]) {
      const target = match[1].replace(/^<|>$/g, "");
      if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(target)) continue;
      const url = new URL(target, file);
      url.hash = "";
      url.search = "";
      assert.ok(
        url.href.startsWith(root.href),
        `${file.pathname}: link escapes the repository: ${target}`,
      );
      await assert.doesNotReject(
        stat(url),
        `${file.pathname}: missing link target ${target}`,
      );
    }
  }
});

test("repository skills have matching names and descriptive frontmatter", async () => {
  const directory = new URL(".github/skills/", root);
  const entries = await readdir(directory, { withFileTypes: true });
  assert.ok(entries.some((entry) => entry.name === "create-diorama"));
  for (const entry of entries.filter((entry) => entry.isDirectory())) {
    assert.match(entry.name, /^[a-z][a-z0-9-]*$/);
    const source = await readFile(
      new URL(`${entry.name}/SKILL.md`, directory),
      "utf8",
    );
    const header = source.match(/^---\n([\s\S]+?)\n---\n/)?.[1];
    assert.ok(header, `${entry.name}: missing frontmatter`);
    assert.match(header, new RegExp(`^name: ${entry.name}$`, "m"));
    assert.match(header, /^description: .{40,}$/m);
  }
  const creation = await readFile(
    new URL("create-diorama/SKILL.md", directory),
    "utf8",
  );
  assert.ok(creation.includes("docs/diorama-standard.md"));
  assert.ok(creation.includes("docs/history/design-decisions.md"));
});

test("the public edition agrees with both package version entries", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("package.json", root), "utf8"),
  );
  const lock = JSON.parse(
    await readFile(new URL("package-lock.json", root), "utf8"),
  );
  assert.equal(lock.version, packageJson.version);
  assert.equal(lock.packages[""].version, packageJson.version);
  for (const path of ["README.md", "CHANGELOG.md"]) {
    const source = await readFile(new URL(path, root), "utf8");
    assert.ok(source.includes(`v${packageJson.version}`), path);
  }
});
