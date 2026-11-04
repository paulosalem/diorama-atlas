import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export function speechCost(usage) {
  if (
    !usage ||
    !Number.isInteger(usage.input_tokens) ||
    usage.input_tokens < 0 ||
    !Number.isInteger(usage.output_tokens) ||
    usage.output_tokens < 0
  )
    throw new Error("Speech response did not include valid token usage.");
  return (usage.input_tokens * 0.6 + usage.output_tokens * 12) / 1_000_000;
}

export function budgetCommitted(ledger) {
  return ledger.requests.reduce(
    (sum, request) => sum + (request.costUsd ?? request.reserveUsd),
    0,
  );
}

export async function narrationBudget(path, maximum, model) {
  if (!Number.isFinite(maximum) || maximum <= 0)
    throw new Error("--max-cost-usd must be a positive number.");
  if (!/^gpt-4o-mini-tts(?:-2025-12-15)?$/.test(model))
    throw new Error(
      "Token pricing must be reviewed before budgeting a different speech model.",
    );
  await mkdir(dirname(path), { recursive: true });
  const lock = `${path}.lock`;
  await writeFile(lock, `${process.pid}\n`, { flag: "wx" });
  let ledger;
  try {
    try {
      ledger = JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      ledger = {
        version: 1,
        model,
        maximumUsd: maximum,
        inputUsdPerMillion: 0.6,
        outputUsdPerMillion: 12,
        pricingSource:
          "https://developers.openai.com/api/docs/models/gpt-4o-mini-tts",
        requests: [],
      };
    }
    if (
      ledger.version !== 1 ||
      ledger.maximumUsd !== maximum ||
      ledger.model !== model ||
      !Array.isArray(ledger.requests) ||
      ledger.requests.some(
        (request) =>
          typeof request.id !== "string" ||
          !Number.isFinite(request.reserveUsd) ||
          request.reserveUsd <= 0 ||
          (request.costUsd !== undefined &&
            (!Number.isFinite(request.costUsd) ||
              request.costUsd < 0 ||
              speechCost(request.usage) !== request.costUsd)),
      )
    )
      throw new Error("The existing narration budget does not match this run.");
  } catch (error) {
    await unlink(lock);
    throw error;
  }
  let queue = Promise.resolve();
  const save = () => {
    queue = queue.then(async () => {
      await writeFile(
        `${path}.partial`,
        `${JSON.stringify(ledger, null, 2)}\n`,
      );
      await rename(`${path}.partial`, path);
    });
    return queue;
  };
  return {
    dispose: () => unlink(lock),
    async reserve(id) {
      // A dollar reserves far more than a short passage costs; unresolved calls
      // retain that reservation across restarts rather than being counted as free.
      const reserveUsd = 1;
      if (budgetCommitted(ledger) + reserveUsd > maximum)
        throw new Error(
          "Narration budget exhausted; no further request was sent.",
        );
      const request = { id, reserveUsd, startedAt: new Date().toISOString() };
      ledger.requests.push(request);
      await save();
      return request;
    },
    async settle(request, usage, requestId) {
      const costUsd = speechCost(usage);
      Object.assign(request, {
        usage,
        requestId,
        costUsd,
        completedAt: new Date().toISOString(),
      });
      await save();
      if (costUsd > request.reserveUsd || budgetCommitted(ledger) > maximum)
        throw new Error(
          "Speech usage exceeded its safety reservation; generation stopped.",
        );
      return costUsd;
    },
  };
}
