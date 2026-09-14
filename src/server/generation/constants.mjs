export const modelCandidates = ["gpt-image-1.5", "gpt-image-1"];
export const sceneGenerationCandidates = ["gpt-4.1-mini", "gpt-4o-mini"];
export const referenceAnalysisCandidates = ["gpt-4.1-mini", "gpt-4o-mini"];

export const speechCandidates = [
  {
    model: "gpt-4o-mini-tts",
    voice: "sage",
    instructions:
      "Narrate this like a knowledgeable museum audio guide. Warm, clear, measured, and culturally respectful. Avoid exaggerated drama.",
  },
  {
    model: "tts-1-hd",
    voice: "alloy",
  },
];

export const generatedPipelineVersion = "generated-recursive-v2";

export const generationStepTemplates = [
  { id: "scene_packet", label: "Planning scene packet" },
  { id: "references", label: "Generating photorealistic references" },
  { id: "inventory", label: "Analyzing object inventory from references" },
  { id: "layout", label: "Building recursive spatial hierarchy" },
  { id: "textures", label: "Generating reusable textures" },
  { id: "finalize", label: "Finalizing diorama package" },
];
