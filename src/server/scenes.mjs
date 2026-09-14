import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { fileToDataUrl } from "./http.mjs";
import { cacheFileForId } from "./paths.mjs";
import {
  canFallbackModel,
  createStructuredResponder,
} from "./generation/ai.mjs";
import {
  referenceAnalysisCandidates,
  sceneGenerationCandidates,
} from "./generation/constants.mjs";
import { createJobStore } from "./generation/jobs.mjs";
import {
  sceneGenerationMessages,
  inventoryAnalysisInstructions,
  buildInventoryAnalysisInput,
  layoutAnalysisInstructions,
  buildLayoutAnalysisInput,
  reviewAnalysisInstructions,
} from "./generation/prompts.mjs";
import {
  sanitizeDepth,
  ensureGeneratedSceneMetadata,
  packageNeedsUpgrade,
  toGeneratedScenePackage,
  mergeReferenceAnalysis,
  applyReviewToScenePackage,
} from "./generation/scene-package.mjs";
import {
  generatedSceneSchema,
  generatedReviewSchema,
  referenceInventorySchema,
  recursiveBuildSchema,
} from "./generation/schema.mjs";

export function createSceneService({
  openai,
  generatedSceneDir,
  bundledSceneDir,
  conceptScenes,
  narrationScenes,
  concepts,
  textures,
}) {
  const generatedSceneDefinitions = new Map();
  const inflightGeneratedScenes = new Map();
  const { getConcept, getConceptVariant, conceptCacheFile } = concepts;
  const { ensureTextureLibrary } = textures;
  const requestStructuredResponse = createStructuredResponder(openai);
  const {
    getJob: getGenerationJob,
    createGenerationJob,
    updateGenerationJob,
    completeGenerationJob,
    failGenerationJob,
  } = createJobStore();

  function scenePackageFile(sceneId) {
    return cacheFileForId(generatedSceneDir, sceneId, ".json");
  }

  function hydrateGeneratedScenePackage(scenePackage) {
    ensureGeneratedSceneMetadata(scenePackage);
    const { scene, conceptVariants } = scenePackage;
    generatedSceneDefinitions.set(scene.id, scene);
    conceptScenes[scene.id] = {
      id: scene.id,
      title: scene.title,
      version: `${scene.concept.imageVersion}:${scenePackage.requestPromptHash}`,
      variants: conceptVariants,
    };
    narrationScenes[scene.id] = {
      id: scene.id,
      title: scene.title,
      version: `generated-openai-voice-v1:${scenePackage.requestPromptHash}`,
      details: scene.details.map(({ id, title, body }) => ({
        id,
        title,
        body,
      })),
    };
  }

  function unhydrateGeneratedScenePackage(sceneId) {
    generatedSceneDefinitions.delete(sceneId);
    delete conceptScenes[sceneId];
    delete narrationScenes[sceneId];
  }

  async function ensureGeneratedConceptImages(scenePackage) {
    ensureGeneratedSceneMetadata(scenePackage);
    const sceneId = scenePackage.scene.id;
    const referenceIds = scenePackage.scene.concept.references.map(
      (reference) => reference.id,
    );
    await Promise.all(
      referenceIds.map((referenceId) =>
        getConcept(sceneId, referenceId, false),
      ),
    );
  }

  async function loadGeneratedScenePackages() {
    for (const directory of [bundledSceneDir, generatedSceneDir].filter(
      Boolean,
    )) {
      let entries;
      try {
        entries = await fs.readdir(directory, { withFileTypes: true });
      } catch (error) {
        if (directory === generatedSceneDir && error.code === "ENOENT") {
          continue;
        }
        throw error;
      }
      const jsonFiles = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => entry.name)
        .sort();

      for (const filename of jsonFiles) {
        const filePath = path.join(directory, filename);
        try {
          const payload = JSON.parse(await fs.readFile(filePath, "utf8"));
          if (typeof payload?.scene?.id !== "string" || !payload.scene.id) {
            throw new Error("Scene package must contain a scene.id.");
          }
          hydrateGeneratedScenePackage(payload);
        } catch (error) {
          throw new Error(
            `Could not load scene package ${filePath}: ${error.message}`,
            { cause: error },
          );
        }
      }
    }
  }

  async function loadGeneratedReferenceInputs(scenePackage) {
    const conceptScene = conceptScenes[scenePackage.scene.id];
    if (!conceptScene) {
      const error = new Error(
        `No concept metadata is registered for ${scenePackage.scene.id}.`,
      );
      error.statusCode = 404;
      throw error;
    }

    return Promise.all(
      scenePackage.scene.concept.references.map(async (reference) => {
        const variant = getConceptVariant(conceptScene, reference.id);
        const dataUrl = await fileToDataUrl(
          conceptCacheFile(conceptScene, variant),
        );
        return {
          reference,
          variant,
          dataUrl,
        };
      }),
    );
  }

  async function analyzeReferenceInventory(scenePackage) {
    const referenceInputs = await loadGeneratedReferenceInputs(scenePackage);
    const { parsed, model } = await requestStructuredResponse({
      candidates: referenceAnalysisCandidates,
      instructions: inventoryAnalysisInstructions(scenePackage),
      input: buildInventoryAnalysisInput(scenePackage, referenceInputs),
      schema: referenceInventorySchema,
      maxOutputTokens: 4200,
    });
    return { analysis: parsed, model };
  }

  async function analyzeRecursiveBuild(scenePackage, inventoryAnalysis) {
    const referenceInputs = await loadGeneratedReferenceInputs(scenePackage);
    const { parsed, model } = await requestStructuredResponse({
      candidates: referenceAnalysisCandidates,
      instructions: layoutAnalysisInstructions(scenePackage, inventoryAnalysis),
      input: buildLayoutAnalysisInput(
        scenePackage,
        inventoryAnalysis,
        referenceInputs,
      ),
      schema: recursiveBuildSchema,
      maxOutputTokens: 5200,
    });
    return { buildTree: parsed, model };
  }

  async function generateScenePackage(prompt, requestedDepth) {
    if (!openai) {
      const error = new Error(
        "OPENAI_API_KEY is not set for generated diorama creation.",
      );
      error.statusCode = 503;
      throw error;
    }

    let lastError = null;

    for (const model of sceneGenerationCandidates) {
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages: sceneGenerationMessages(prompt, requestedDepth),
          response_format: {
            type: "json_schema",
            json_schema: generatedSceneSchema,
          },
        });

        const content = completion.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("OpenAI returned no structured scene payload.");
        }

        const spec = JSON.parse(content);
        return toGeneratedScenePackage(spec, prompt, model, requestedDepth);
      } catch (error) {
        lastError = error;
        if (!canFallbackModel(error)) {
          break;
        }
      }
    }

    throw lastError;
  }

  async function maybeLoadExistingScenePackage(prompt, requestedDepth) {
    const promptHash = createHash("sha1")
      .update(
        String(prompt ?? "")
          .trim()
          .toLowerCase(),
      )
      .digest("hex")
      .slice(0, 10);
    const existing = [...generatedSceneDefinitions.values()].find((scene) => {
      const sceneHash = createHash("sha1")
        .update(
          String(scene.requestPrompt ?? "")
            .trim()
            .toLowerCase(),
        )
        .digest("hex")
        .slice(0, 10);
      return sceneHash === promptHash;
    });

    if (!existing) {
      return null;
    }

    const packagePath = scenePackageFile(existing.id);
    const scenePackage = await loadGeneratedScenePackage(existing.id);

    const needsDepthUpgrade =
      sanitizeDepth(scenePackage.scene?.generation?.depth ?? 4) <
      requestedDepth;
    if (!packageNeedsUpgrade(scenePackage) && !needsDepthUpgrade) {
      await ensureGeneratedConceptImages(scenePackage);
      if (
        !scenePackage.scene.textureLibrary.length &&
        scenePackage.scene.buildTree.surfaceAssignments.length
      ) {
        await ensureTextureLibrary(scenePackage);
        await fs.writeFile(packagePath, JSON.stringify(scenePackage, null, 2));
      }
      return scenePackage;
    }

    return null;
  }

  async function runGeneratedSceneJob(job) {
    let hydratedSceneId = null;
    try {
      const cachedScenePackage = await maybeLoadExistingScenePackage(
        job.prompt,
        job.depth,
      );
      if (cachedScenePackage) {
        hydrateGeneratedScenePackage(cachedScenePackage);
        hydratedSceneId = cachedScenePackage.scene.id;
        completeGenerationJob(job, cachedScenePackage.scene, true);
        return;
      }

      updateGenerationJob(
        job,
        "scene_packet",
        "in_progress",
        "Planning the scene packet from your prompt...",
        0.18,
      );
      const scenePackage = await generateScenePackage(job.prompt, job.depth);
      hydrateGeneratedScenePackage(scenePackage);
      hydratedSceneId = scenePackage.scene.id;

      updateGenerationJob(
        job,
        "scene_packet",
        "completed",
        "Scene packet planned.",
        1,
      );
      updateGenerationJob(
        job,
        "references",
        "in_progress",
        "Generating the photorealistic concept references...",
        0.12,
      );
      await ensureGeneratedConceptImages(scenePackage);
      updateGenerationJob(
        job,
        "references",
        "completed",
        "Photorealistic references generated.",
        1,
      );

      updateGenerationJob(
        job,
        "inventory",
        "in_progress",
        "Analyzing every visible object and material in the references...",
        0.16,
      );
      const { analysis: inventoryAnalysis, model: inventoryModel } =
        await analyzeReferenceInventory(scenePackage);
      updateGenerationJob(
        job,
        "inventory",
        "completed",
        "Reference object inventory captured.",
        1,
      );

      updateGenerationJob(
        job,
        "layout",
        "in_progress",
        "Converting the references into a recursive spatial build tree...",
        0.16,
      );
      const { buildTree, model: buildModel } = await analyzeRecursiveBuild(
        scenePackage,
        inventoryAnalysis,
      );
      mergeReferenceAnalysis(
        scenePackage,
        inventoryAnalysis,
        inventoryModel,
        buildTree,
        buildModel,
      );
      updateGenerationJob(
        job,
        "layout",
        "completed",
        "Recursive build hierarchy created.",
        1,
      );

      updateGenerationJob(
        job,
        "textures",
        "in_progress",
        "Generating reusable textures for the main surfaces...",
        0.16,
      );
      await ensureTextureLibrary(scenePackage);
      updateGenerationJob(
        job,
        "textures",
        "completed",
        "Reusable textures cached.",
        1,
      );

      updateGenerationJob(
        job,
        "finalize",
        "in_progress",
        "Saving the diorama package for the browser renderer...",
        0.18,
      );
      ensureGeneratedSceneMetadata(scenePackage);
      await fs.writeFile(
        scenePackageFile(scenePackage.scene.id),
        JSON.stringify(scenePackage, null, 2),
      );
      updateGenerationJob(
        job,
        "finalize",
        "completed",
        "Diorama package saved.",
        1,
      );

      hydrateGeneratedScenePackage(scenePackage);
      completeGenerationJob(job, scenePackage.scene, false);
      console.log(
        `Generated recursive scene packet, references, and textures for ${scenePackage.scene.id} at depth ${job.depth}.`,
      );
    } catch (error) {
      console.error(
        `Generated scene job failed for "${job.prompt}":`,
        error.message,
      );
      if (hydratedSceneId) {
        unhydrateGeneratedScenePackage(hydratedSceneId);
      }
      failGenerationJob(
        job,
        error,
        job.stage === "queued" ? "scene_packet" : job.stage,
      );
    } finally {
      inflightGeneratedScenes.delete(job.promptHash);
    }
  }

  async function enqueueGeneratedSceneJob(prompt, requestedDepth) {
    const normalizedPrompt = String(prompt ?? "").trim();
    if (!normalizedPrompt) {
      const error = new Error("A scene prompt is required.");
      error.statusCode = 400;
      throw error;
    }

    const depth = sanitizeDepth(requestedDepth);
    const promptHash = createHash("sha1")
      .update(normalizedPrompt.toLowerCase())
      .digest("hex")
      .slice(0, 10);

    const existingJobId = inflightGeneratedScenes.get(promptHash);
    if (existingJobId) {
      const job = getGenerationJob(existingJobId);
      if (job) {
        return job;
      }
    }

    const cachedScenePackage = await maybeLoadExistingScenePackage(
      normalizedPrompt,
      depth,
    );
    if (cachedScenePackage) {
      const job = createGenerationJob(normalizedPrompt, depth, promptHash);
      hydrateGeneratedScenePackage(cachedScenePackage);
      completeGenerationJob(job, cachedScenePackage.scene, true);
      return job;
    }

    const job = createGenerationJob(normalizedPrompt, depth, promptHash);
    inflightGeneratedScenes.set(promptHash, job.id);
    void runGeneratedSceneJob(job);
    return job;
  }

  function listGeneratedScenes() {
    return [...generatedSceneDefinitions.values()].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
  }

  async function loadGeneratedScenePackage(sceneId) {
    try {
      let source;
      try {
        source = await fs.readFile(scenePackageFile(sceneId), "utf8");
      } catch (error) {
        if (error.code !== "ENOENT" || !bundledSceneDir) {
          throw error;
        }
        source = await fs.readFile(
          cacheFileForId(bundledSceneDir, sceneId, ".json"),
          "utf8",
        );
      }
      const payload = JSON.parse(source);
      ensureGeneratedSceneMetadata(payload);
      return payload;
    } catch (error) {
      if (error.code === "ENOENT") {
        const notFound = new Error(`Unknown generated scene: ${sceneId}`);
        notFound.statusCode = 404;
        throw notFound;
      }
      throw error;
    }
  }

  async function reviewGeneratedScene(scenePackage, screenshotDataUrl) {
    const referenceInputs = await loadGeneratedReferenceInputs(scenePackage);
    const { parsed, model } = await requestStructuredResponse({
      candidates: referenceAnalysisCandidates,
      instructions: reviewAnalysisInstructions(scenePackage),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Compare the current render to the references and propose the smallest useful patch.",
                "Keep the patch realistic for a procedural scene: camera framing, density multiplier, and refined hotspot points only.",
              ].join("\n"),
            },
            {
              type: "input_text",
              text: "Current 3D render.",
            },
            {
              type: "input_image",
              detail: "high",
              image_url: screenshotDataUrl,
            },
            ...referenceInputs.flatMap(({ reference, dataUrl }) => [
              {
                type: "input_text",
                text: `${reference.id.toUpperCase()} reference.`,
              },
              {
                type: "input_image",
                detail: "high",
                image_url: dataUrl,
              },
            ]),
          ],
        },
      ],
      schema: generatedReviewSchema,
      maxOutputTokens: 2600,
    });
    return { review: parsed, model };
  }

  async function reviewScene(sceneId, screenshot) {
    const scenePackage = await loadGeneratedScenePackage(sceneId);
    const { review, model } = await reviewGeneratedScene(
      scenePackage,
      screenshot,
    );
    applyReviewToScenePackage(scenePackage, review, model);
    await fs.writeFile(
      scenePackageFile(sceneId),
      JSON.stringify(scenePackage, null, 2),
    );
    hydrateGeneratedScenePackage(scenePackage);
    return scenePackage.scene;
  }

  return {
    loadGeneratedScenePackages,
    listGeneratedScenes,
    enqueueGeneratedSceneJob,
    getGenerationJob,
    reviewScene,
  };
}
