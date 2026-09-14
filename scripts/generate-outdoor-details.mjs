import OpenAI from "openai";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(
    "Generate one explicitly selected outdoor detail asset when licensed downloads are unsuitable.\nUsage: node scripts/generate-outdoor-details.mjs --model MODEL --only ID [--quality max|xhigh|high]\nUses OPENAI_API_KEY from the process environment. Existing matching results are reused; batch generation is never implicit.\nPrompts, model, quality, usage and image hashes are saved without credentials.\nExample: zsh -lic 'node scripts/generate-outdoor-details.mjs --model gpt-image-2.5-sunburst-2026-09-08 --only botanical-field-notes'",
  );
  process.exit(0);
}
const options = new Map();
for (let i = 0; i < args.length; i += 2) {
  if (!["--model", "--only", "--quality"].includes(args[i]) || !args[i + 1])
    throw new Error(`Invalid generation argument: ${args[i]}`);
  options.set(args[i], args[i + 1]);
}
const model = options.get("--model");
if (!model)
  throw new Error(
    "--model is required; generation never silently substitutes a model.",
  );
const quality = options.get("--quality") ?? "max";
if (!["high", "xhigh", "max"].includes(quality))
  throw new Error("Unsupported detail-image quality.");
const recipes = JSON.parse(
  await readFile(
    new URL("./prompts/outdoor-details.json", import.meta.url),
    "utf8",
  ),
);
const selected = options.get("--only");
if (!selected)
  throw new Error(
    "--only is required; prefer licensed downloads and select generation deliberately.",
  );
const jobs = recipes.assets.filter((asset) => asset.id === selected);
if (!jobs.length) throw new Error(`Unknown detail-image id: ${selected}`);
const directory = resolve(root, "public/outdoors/generated");
await mkdir(directory, { recursive: true });
const manifestPath = resolve(directory, "manifest.json");
let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  manifest = { kind: "generated-prop-artwork-and-decals", assets: [] };
}
let client;
const hash = (value) => createHash("sha256").update(value).digest("hex");
for (const recipe of jobs) {
  const fingerprint = hash(JSON.stringify({ recipe, model, quality }));
  const previous = manifest.assets.find((asset) => asset.id === recipe.id);
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      throw new Error(
        `Generation inputs changed for ${recipe.id}; use a new asset identifier rather than overwrite provenance.`,
      );
    const image = await readFile(resolve(directory, `${recipe.id}.png`));
    if (hash(image) !== previous.sha256)
      throw new Error(`Generated image checksum mismatch: ${recipe.id}`);
    console.error(`Reusing ${recipe.id}`);
    continue;
  }
  if (!process.env.OPENAI_API_KEY)
    throw new Error(
      "OPENAI_API_KEY is not exported; run new generation through the configured zsh environment.",
    );
  client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 600000,
    maxRetries: 0,
  });
  console.error(`Generating ${recipe.id} with ${model}, quality=${quality}`);
  let result;
  try {
    result = await client.images.generate({
      model,
      quality,
      prompt: recipe.prompt,
      size: recipe.size,
      background: recipe.background,
      output_format: "png",
      n: 1,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        asset: recipe.id,
        status: error.status,
        type: error.type,
        code: error.code,
        param: error.param,
      }),
    );
    process.exitCode = 1;
    break;
  }
  const encoded = result.data?.[0]?.b64_json;
  if (!encoded)
    throw new Error(`Image generation returned no bytes for ${recipe.id}.`);
  const bytes = Buffer.from(encoded, "base64");
  if (
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw new Error(`Image generation did not return PNG for ${recipe.id}.`);
  const path = resolve(directory, `${recipe.id}.png`);
  await writeFile(`${path}.partial`, bytes);
  await rename(`${path}.partial`, path);
  manifest.assets.push({
    id: recipe.id,
    kind: recipe.kind,
    image: `/public/outdoors/generated/${recipe.id}.png`,
    model,
    quality,
    size: recipe.size,
    background: recipe.background,
    prompt: recipe.prompt,
    fingerprint,
    sha256: hash(bytes),
    generatedAt: new Date().toISOString(),
    usage: result.usage ?? null,
    note: "Original AI-generated prop artwork or material decal, not documentary photography of a real location.",
  });
  await writeFile(
    `${manifestPath}.partial`,
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await rename(`${manifestPath}.partial`, manifestPath);
  console.log(
    JSON.stringify({
      id: recipe.id,
      image: path,
      bytes: bytes.length,
      usage: result.usage ?? null,
    }),
  );
}
