import OpenAI from "openai";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    scene: { type: "string" },
    locale: { type: "string", multiple: true },
    view: { type: "string", multiple: true },
    model: { type: "string" },
    voice: { type: "string" },
    help: { type: "boolean" },
  },
});
if (values.help) {
  console.log(`Prerecord explicitly selected cultural introductions with OpenAI TTS.
Usage: node scripts/generate-opening-narration.mjs --scene ID --locale LOCALE --model MODEL --voice VOICE
Repeat --locale for bilingual recordings; repeat --view for named views (default: intro).
Matching recordings are verified and reused.
New generation requires OPENAI_API_KEY; playback never needs a key or a paid request.
Example: zsh -lic 'node scripts/generate-opening-narration.mjs --scene riad --locale en-US --locale pt-BR --model gpt-4o-mini-tts --voice cedar'
Progress goes to stderr; successful asset records go to stdout.`);
  process.exit(0);
}
for (const option of ["scene", "model", "voice"]) {
  if (!values[option]) throw new Error(`--${option} is required.`);
}
if (!values.locale?.length)
  throw new Error("At least one --locale is required.");

const root = fileURLToPath(new URL("../", import.meta.url));
const recipes = JSON.parse(
  await readFile(
    new URL("./prompts/opening-narration.json", import.meta.url),
    "utf8",
  ),
);
const jobs = [...new Set(values.locale)].flatMap((locale) =>
  [...new Set(values.view ?? ["intro"])].map((view) => {
    const recipe = recipes.assets.find(
      (asset) =>
        asset.scene === values.scene &&
        asset.locale === locale &&
        (asset.view ?? "intro") === view,
    );
    if (!recipe)
      throw new Error(
        `No narration is written for ${values.scene}/${view}/${locale}.`,
      );
    if (!/^[a-zA-Z0-9-]+$/.test(recipe.id))
      throw new Error("Invalid narration asset ID.");
    return recipe;
  }),
);
const directory = resolve(root, "public/narration");
await mkdir(directory, { recursive: true });
const manifestPath = resolve(directory, "manifest.json");
let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  manifest = { version: 1, assets: [] };
}
if (manifest.version !== 1 || !Array.isArray(manifest.assets))
  throw new Error("Unsupported opening narration manifest.");
const hash = (data) => createHash("sha256").update(data).digest("hex");
let client;
for (const recipe of jobs) {
  const request = {
    model: values.model,
    voice: values.voice,
    input: recipe.text,
    instructions: recipe.instructions ?? recipes.instructions[recipe.locale],
    response_format: "mp3",
    speed: 1,
  };
  const fingerprint = hash(JSON.stringify({ recipe, request }));
  const file = resolve(directory, `${recipe.id}.mp3`);
  const previous = manifest.assets.find((asset) => asset.id === recipe.id);
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      throw new Error(
        `Inputs changed for ${recipe.id}; use a new asset ID to preserve provenance.`,
      );
    if (hash(await readFile(file)) !== previous.sha256)
      throw new Error(`Recording checksum mismatch: ${recipe.id}`);
    console.error(`Reusing ${recipe.id}`);
    continue;
  }
  try {
    await stat(file);
    throw new Error(
      `Unregistered recording exists: ${file}. Review it before requesting another generation.`,
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!process.env.OPENAI_API_KEY)
    throw new Error(
      "OPENAI_API_KEY is not exported; use the configured zsh environment.",
    );
  client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
    timeout: 120000,
  });
  console.error(`Recording ${recipe.id} with ${values.model}/${values.voice}`);
  let response;
  try {
    response = await client.audio.speech.create(request);
  } catch (error) {
    console.error(
      `Speech generation failed for ${recipe.id}: HTTP ${error.status ?? "unavailable"}, ${error.code ?? error.name}.`,
    );
    process.exitCode = 1;
    break;
  }
  if (!response.headers.get("content-type")?.startsWith("audio/"))
    throw new Error(
      `Speech generation returned a non-audio response for ${recipe.id}.`,
    );
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1024)
    throw new Error(`Empty or truncated recording for ${recipe.id}.`);
  await writeFile(`${file}.partial`, bytes, { flag: "wx" });
  await rename(`${file}.partial`, file);
  const asset = {
    ...recipe,
    instructions: request.instructions,
    file: `/public/narration/${recipe.id}.mp3`,
    model: values.model,
    voice: values.voice,
    format: "mp3",
    speed: 1,
    generatedAt: new Date().toISOString(),
    requestId: response.headers.get("x-request-id"),
    fingerprint,
    sha256: hash(bytes),
    bytes: bytes.length,
    creator: "Original Atlas narration; AI-generated voice by OpenAI",
    sourceUrl: "https://developers.openai.com/api/docs/guides/text-to-speech",
    termsUrl: "https://openai.com/policies/terms-of-use/",
    disclosure: "AI-generated voice, not a human recording.",
  };
  manifest.assets.push(asset);
  await writeFile(
    `${manifestPath}.partial`,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await rename(`${manifestPath}.partial`, manifestPath);
  console.log(
    JSON.stringify({ id: asset.id, file: asset.file, bytes: asset.bytes }),
  );
}
