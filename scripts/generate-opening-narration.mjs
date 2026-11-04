import OpenAI from "openai";
import { Stream } from "openai/core/streaming";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { narrationBudget } from "./helpers/narration-budget.mjs";

const { values } = parseArgs({
  options: {
    scene: { type: "string", multiple: true },
    "all-scenes": { type: "boolean" },
    locale: { type: "string", multiple: true },
    view: { type: "string", multiple: true },
    "all-views": { type: "boolean" },
    "dry-run": { type: "boolean" },
    concurrency: { type: "string", default: "1" },
    model: { type: "string" },
    voice: { type: "string" },
    "max-cost-usd": { type: "string" },
    "budget-file": { type: "string" },
    help: { type: "boolean" },
  },
});
if (values.help) {
  console.log(`Prerecord explicitly selected cultural introductions with OpenAI TTS.
Usage: node scripts/generate-opening-narration.mjs --scene ID --locale LOCALE --model MODEL --voice VOICE
Repeat --locale for bilingual recordings; repeat --view for named views (default: intro).
Repeat --scene to select several places; --all-views selects every written view.
--all-scenes selects every scene in the recipe library instead of --scene.
--dry-run validates the selection and cache without requesting or writing audio.
--concurrency N bounds simultaneous requests (1–4, default 1); one writer checkpoints the manifest.
Matching recordings are verified and reused.
New generation requires OPENAI_API_KEY; playback never needs a key or a paid request.
Paid requests also require --max-cost-usd N --budget-file PATH.
The durable budget retains unresolved requests and records returned token usage.
Example: zsh -lic 'node scripts/generate-opening-narration.mjs --scene riad --locale en-US --locale pt-BR --model gpt-4o-mini-tts --voice cedar --max-cost-usd 20 --budget-file outputs/narration-budget.json'
Example: node scripts/generate-opening-narration.mjs --scene textile --scene kissaten --all-views --locale en-US --locale pt-BR --model gpt-4o-mini-tts --voice cedar --dry-run
Progress goes to stderr; successful asset records go to stdout.`);
  process.exit(0);
}
for (const option of ["model", "voice"]) {
  if (!values[option]) throw new Error(`--${option} is required.`);
}
if (Boolean(values.scene?.length) === Boolean(values["all-scenes"]))
  throw new Error("Choose --scene or --all-scenes.");
if (!values.locale?.length)
  throw new Error("At least one --locale is required.");
if (values["all-views"] && values.view)
  throw new Error("Choose --all-views or --view, not both.");
const concurrency = Number(values.concurrency);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4)
  throw new Error("--concurrency must be an integer from 1 to 4.");

const root = fileURLToPath(new URL("../", import.meta.url));
const recipes = JSON.parse(
  await readFile(
    new URL("./prompts/opening-narration.json", import.meta.url),
    "utf8",
  ),
);
const selectedScenes = values["all-scenes"]
  ? recipes.assets.map((asset) => asset.scene)
  : values.scene;
const jobs = [...new Set(selectedScenes)].flatMap((scene) =>
  [...new Set(values.locale)].flatMap((locale) => {
    const views = values["all-views"]
      ? recipes.assets
          .filter((asset) => asset.scene === scene && asset.locale === locale)
          .map((asset) => asset.view ?? "intro")
      : (values.view ?? ["intro"]);
    if (!views.length) throw new Error(`No narration is written for ${scene}.`);
    return [...new Set(views)].map((view) => {
      const matches = recipes.assets.filter(
        (asset) =>
          asset.scene === scene &&
          asset.locale === locale &&
          (asset.view ?? "intro") === view,
      );
      if (matches.length !== 1)
        throw new Error(
          `Expected one narration for ${scene}/${view}/${locale}, found ${matches.length}.`,
        );
      const recipe = matches[0];
      if (
        !/^[a-zA-Z0-9-]+$/.test(recipe.id) ||
        typeof recipe.text !== "string" ||
        !recipe.text.trim() ||
        !(recipe.instructions ?? recipes.instructions[locale])
      )
        throw new Error(`Invalid narration recipe: ${recipe.id}`);
      return recipe;
    });
  }),
);
const directory = resolve(root, "public/narration");
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
const pending = [];
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
  pending.push({ recipe, request, fingerprint, file });
}
console.error(
  `${jobs.length} selected; ${jobs.length - pending.length} cached; ${pending.length} new recordings (${pending.reduce((sum, job) => sum + job.recipe.text.length, 0)} text characters).`,
);
if (values["dry-run"] || !pending.length) process.exit(0);
if (!values["max-cost-usd"] || !values["budget-file"])
  throw new Error("Paid generation requires --max-cost-usd and --budget-file.");
if (!process.env.OPENAI_API_KEY)
  throw new Error(
    "OPENAI_API_KEY is not exported; use the configured zsh environment.",
  );
await mkdir(directory, { recursive: true });
const budget = await narrationBudget(
  resolve(values["budget-file"]),
  Number(values["max-cost-usd"]),
  values.model,
);
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 0,
  timeout: 120000,
});
let saveQueue = Promise.resolve();
async function record({ recipe, request, fingerprint, file }) {
  const reservation = await budget.reserve(recipe.id);
  console.error(`Recording ${recipe.id} with ${values.model}/${values.voice}`);
  let response, bytes, usage, costUsd;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    response = await client.audio.speech.create(
      { ...request, stream_format: "sse" },
      { signal: controller.signal },
    );
    if (!response.headers.get("content-type")?.startsWith("text/event-stream"))
      throw new Error(
        "Speech generation did not return its usage-bearing stream.",
      );
    const chunks = [];
    let done = false;
    for await (const event of Stream.fromSSEResponse(
      response,
      controller,
      client,
    )) {
      if (done) throw new Error("Speech data arrived after completion.");
      if (
        event.type === "speech.audio.delta" &&
        typeof event.audio === "string"
      ) {
        chunks.push(Buffer.from(event.audio, "base64"));
      } else if (event.type === "speech.audio.done") {
        usage = event.usage;
        done = true;
      } else {
        throw new Error(`Unexpected speech event: ${event.type}`);
      }
    }
    if (!done)
      throw new Error("Speech generation ended before its final usage event.");
    costUsd = await budget.settle(
      reservation,
      usage,
      response.headers.get("x-request-id"),
    );
    bytes = Buffer.concat(chunks);
  } catch (error) {
    const detail = error instanceof OpenAI.APIError ? undefined : error.message;
    console.error(
      `Speech generation failed for ${recipe.id}: HTTP ${error.status ?? "unavailable"}, ${error.code ?? error.name}.`,
      detail ?? "",
    );
    throw new Error(`Recording failed: ${recipe.id}`, {
      // eslint-disable-next-line preserve-caught-error -- Provider errors may contain credential-bearing request metadata.
      cause: { status: error.status, type: error.code ?? error.name, detail },
    });
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
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
    usage,
    costUsd,
    fingerprint,
    sha256: hash(bytes),
    bytes: bytes.length,
    creator: "Original Atlas narration; AI-generated voice by OpenAI",
    sourceUrl: "https://developers.openai.com/api/docs/guides/text-to-speech",
    termsUrl: "https://openai.com/policies/terms-of-use/",
    disclosure: "AI-generated voice, not a human recording.",
  };
  saveQueue = saveQueue.then(async () => {
    manifest.assets.push(asset);
    await writeFile(
      `${manifestPath}.partial`,
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await rename(`${manifestPath}.partial`, manifestPath);
  });
  await saveQueue;
  console.log(
    JSON.stringify({
      id: asset.id,
      file: asset.file,
      bytes: asset.bytes,
      costUsd,
    }),
  );
}
let next = 0;
let failure = null;
try {
  await Promise.all(
    Array.from({ length: Math.min(concurrency, pending.length) }, async () => {
      while (!failure && next < pending.length) {
        const job = pending[next++];
        try {
          await record(job);
        } catch (error) {
          failure ??= error;
        }
      }
    }),
  );
} finally {
  await budget.dispose();
}
if (failure) throw failure;
