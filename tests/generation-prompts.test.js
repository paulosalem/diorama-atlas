import assert from "node:assert/strict";
import { test } from "node:test";
import {
  enrichReferencePrompt,
  inventoryAnalysisInstructions,
  layoutAnalysisInstructions,
  reviewAnalysisInstructions,
  sceneGenerationMessages,
  texturePromptForPlan,
} from "../src/server/generation/prompts.mjs";

const scene = {
  title: "An imagined workshop",
  region: "A regional study",
  period: "Contemporary",
  summary: "A paused working task",
  blueprint: { archetype: "workshop" },
  generation: { depth: 5 },
  concept: {
    hero: "An open working room",
    mood: "Quiet daylight",
    layout: "Connected work areas",
    palette: ["timber", "linen"],
    props: ["loom", "shears"],
  },
  details: [{ anchor: "loom", title: "The working loom" }],
};
const scenePackage = { scene };
const inventory = {
  summary: "A loom and work table",
  roomLogic: "Clear circulation",
  lightingRead: "Daylight through openings",
  clutterNotes: ["Loose fibre by the loom"],
  inventory: [],
  anchorObservations: [],
};

test("scene, reference and layout prompts share the physical realism direction", () => {
  const messages = sceneGenerationMessages("  A quiet workshop  ", 5);
  assert.deepEqual(
    messages.map(({ role }) => role),
    ["system", "user"],
  );
  assert.match(messages[0].content, /depth is 5 on a 2-6 scale/);
  assert.match(messages[1].content, /^User request: A quiet workshop\n/);
  assert.match(sceneGenerationMessages("A workshop")[0].content, /depth is 4/);
  for (const source of [
    messages[0].content,
    enrichReferencePrompt(scene, "View through the working threshold"),
    layoutAnalysisInstructions(scenePackage, inventory),
  ]) {
    assert.match(source, /anonymous, culturally coherent/);
    assert.match(source, /furnished connected spaces/);
    assert.match(source, /actual container cavities/);
    assert.match(source, /Do not treat primitives as finished forms/);
    assert.match(source, /polygon density for fine relief/);
    assert.match(source, /grain at physical scale/);
    assert.match(source, /purposeful disorder/);
    assert.match(source, /actual imagery and physical paper/);
    assert.match(source, /water and reflections coherent and irregular/);
  }
});

test("generated plans and reviews distinguish instructions from builder capabilities", () => {
  const generation = sceneGenerationMessages("A workshop")[0].content;
  assert.match(
    generation,
    /only supported schema fields, features and anchors/,
  );
  assert.match(generation, /description does not implement bespoke geometry/);
  assert.match(generation, /not simply more clutter/);
  const layout = layoutAnalysisInstructions(scenePackage, inventory);
  assert.match(layout, /builder labels only from the allowed enum/);
  assert.match(layout, /unsupported construction in existing node notes/);
  assert.match(layout, /schema's bounds/);
  const review = reviewAnalysisInstructions(scenePackage);
  assert.match(review, /previous approval/);
  assert.match(review, /only the existing review schema/);
  assert.match(review, /notes to identify deeper defects/);
  assert.match(review, /Do not hide defects by moving the camera/);
  assert.match(
    inventoryAnalysisInstructions(scenePackage),
    /design aids, not documentary proof/,
  );
  assert.match(
    inventoryAnalysisInstructions(scenePackage),
    /additional close-up, oblique or grazing-light photographic evidence/,
  );
});

test("material prompts preserve neutral samples without blanket weathering", () => {
  const prompt = texturePromptForPlan(scene, {
    textureLabel: "Maintained timber",
    surfaceRole: "wood",
    descriptor: "Fine longitudinal grain",
    materialHint: "Matte",
  });
  assert.match(prompt, /Surface role: wood/);
  assert.match(prompt, /even neutral lighting/);
  assert.match(prompt, /natural pigment variation/);
  assert.match(
    prompt,
    /do not bake blanket dirt, cast shadows or scene lighting/,
  );
  assert.match(prompt, /Preserve intentional joints and ornament/);
});
