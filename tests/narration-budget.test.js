import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  narrationBudget,
  speechCost,
  budgetCommitted,
} from "../scripts/helpers/narration-budget.mjs";

test("speech budgets charge returned usage and preserve unresolved calls across resumes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "atlas-narration-budget-"));
  const path = join(directory, "budget.json");
  const model = "gpt-4o-mini-tts";
  try {
    const budget = await narrationBudget(path, 2, model);
    const first = await budget.reserve("first");
    await budget.reserve("uncertain");
    await assert.rejects(budget.reserve("too-much"), /budget exhausted/);
    await assert.rejects(narrationBudget(path, 2, model), /EEXIST/);
    const usage = { input_tokens: 100, output_tokens: 1000 };
    assert.equal(await budget.settle(first, usage, "request-one"), 0.01206);
    await budget.dispose();
    const ledger = JSON.parse(await readFile(path, "utf8"));
    assert.equal(budgetCommitted(ledger), 1.01206);
    const resumed = await narrationBudget(path, 2, model);
    await assert.rejects(resumed.reserve("still-reserved"), /budget exhausted/);
    await resumed.dispose();
    await assert.rejects(narrationBudget(path, 20, model), /does not match/);
    await assert.rejects(narrationBudget(path, 2, "unknown"), /pricing/);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("missing, negative and non-finite speech usage cannot be reported as free", () => {
  for (const usage of [
    null,
    {},
    { input_tokens: -1, output_tokens: 2 },
    { input_tokens: 2, output_tokens: NaN },
  ])
    assert.throws(() => speechCost(usage), /valid token usage/);
});
