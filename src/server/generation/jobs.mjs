import { createHash } from "node:crypto";

import { generationStepTemplates } from "./constants.mjs";

function createGenerationSteps() {
  return generationStepTemplates.map((step) => ({
    ...step,
    status: "pending",
    message: "",
    stepProgress: 0,
  }));
}

function computeJobProgress(job) {
  const total = Math.max(1, job.steps.length);
  const complete = job.steps.reduce((sum, step) => {
    if (step.status === "completed") {
      return sum + 1;
    }
    if (step.status === "in_progress") {
      return sum + Math.max(0, Math.min(1, step.stepProgress ?? 0));
    }
    return sum;
  }, 0);
  return Math.round((complete / total) * 100);
}

export function jobPayload(job) {
  return {
    id: job.id,
    prompt: job.prompt,
    depth: job.depth,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    message: job.message,
    steps: job.steps.map(({ stepProgress, ...step }) => step),
    cached: Boolean(job.cached),
    scene: job.scene ?? null,
    error: job.error ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export function createJobStore() {
  const generationJobs = new Map();

  function createGenerationJob(prompt, depth, promptHash) {
    const job = {
      id: `job-${createHash("sha1")
        .update(`${promptHash}:${Date.now()}:${Math.random()}`)
        .digest("hex")
        .slice(0, 12)}`,
      prompt,
      depth,
      promptHash,
      status: "queued",
      stage: "queued",
      progress: 0,
      message: "Queued for generation.",
      steps: createGenerationSteps(),
      cached: false,
      scene: null,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    generationJobs.set(job.id, job);
    return job;
  }

  function updateGenerationJob(
    job,
    stepId,
    status,
    message,
    stepProgress = status === "completed" ? 1 : 0.12,
  ) {
    const stepIndex = job.steps.findIndex((step) => step.id === stepId);
    if (stepIndex < 0) {
      return;
    }

    job.steps.forEach((step, index) => {
      if (index < stepIndex && step.status !== "completed") {
        step.status = "completed";
        step.stepProgress = 1;
        step.message = step.message || step.label;
      } else if (index > stepIndex && step.status === "in_progress") {
        step.status = "pending";
        step.stepProgress = 0;
      }
    });

    const step = job.steps[stepIndex];
    step.status = status;
    step.stepProgress = Math.max(0, Math.min(1, stepProgress));
    step.message = message ?? step.message;

    job.status = status === "failed" ? "failed" : "in_progress";
    job.stage = stepId;
    job.message = message ?? step.label;
    job.progress = computeJobProgress(job);
    job.updatedAt = new Date().toISOString();
  }

  function completeGenerationJob(job, scene, cached = false) {
    job.steps.forEach((step) => {
      step.status = "completed";
      step.stepProgress = 1;
      step.message = step.message || step.label;
    });
    job.status = "completed";
    job.stage = "completed";
    job.progress = 100;
    job.message = cached
      ? "Loaded a cached diorama package with recursive detail data."
      : "Diorama generation completed.";
    job.cached = cached;
    job.scene = scene;
    job.error = null;
    job.updatedAt = new Date().toISOString();
  }

  function failGenerationJob(job, error, stepId = job.stage || "scene_packet") {
    updateGenerationJob(
      job,
      stepId,
      "failed",
      error.message || "Generation failed.",
      1,
    );
    job.status = "failed";
    job.error = {
      message: error.message || "Generation failed.",
      statusCode: error.statusCode ?? error.status ?? 500,
    };
    job.updatedAt = new Date().toISOString();
  }

  return {
    getJob: (id) => generationJobs.get(id),
    createGenerationJob,
    updateGenerationJob,
    completeGenerationJob,
    failGenerationJob,
  };
}
