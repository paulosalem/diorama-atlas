import assert from "node:assert/strict";
import test from "node:test";
import {
  extendPatinaGraph,
  patinaHlsl,
} from "../experiments/marrakech/native-patina.mjs";
import { babylonPatina } from "../src/client/rendering/patina.js";
import { surfacePatinaProfiles } from "../src/client/environments/shared/surface-patina.js";
import { getStudy, studies } from "../experiments/marrakech/web/scenes.js";
import {
  decodeInstanceGroups,
  loadInstances,
} from "../src/client/rendering/instances.js";
import {
  extendInstanceGraph,
  instanceHlsl,
} from "../experiments/marrakech/native-instances.mjs";
import { waterHlsl } from "../experiments/marrakech/native-water.mjs";

test("engine studies select isolated assets and reject unknown places", () => {
  assert.equal(getStudy().id, "marrakech");
  assert.equal(getStudy("douro").sceneId, "douro-vineyard");
  assert.throws(() => getStudy("missing"), /Unknown study/);
  assert.throws(() => getStudy("constructor"), /Unknown study/);
  assert.equal(
    new Set(Object.values(studies).map((study) => study.assetRoot)).size,
    2,
  );
  assert.equal(
    new Set(Object.values(studies).map((study) => study.unityRoot)).size,
    2,
  );
  for (const study of Object.values(studies)) {
    assert(study.farClip > study.shadowDistance);
    assert(study.sunPosition.every(Number.isFinite));
    assert(study.probePosition.every(Number.isFinite));
  }
});

test("portable instances retain world matrices and linear colors without overlapping ranges", async (t) => {
  const binary = new ArrayBuffer(80);
  const floats = new Float32Array(binary);
  floats.set([
    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 3, 4, 5, 1, 0.25, 0.5, 0.75, 1,
  ]);
  const manifest = {
    study: getStudy("douro"),
    instanceBytes: 80,
    instances: 1,
    instanceGroups: [
      {
        name: "prototype",
        count: 1,
        matrixOffset: 0,
        colorOffset: 64,
        boundsCenter: [3, 4, 5],
        boundsSize: [1, 1, 1],
      },
    ],
  };
  const groups = decodeInstanceGroups(manifest, binary);
  assert.deepEqual([...groups[0].matrices], [...floats.subarray(0, 16)]);
  assert.deepEqual([...groups[0].colors], [0.25, 0.5, 0.75, 1]);
  assert.equal(groups[0].matrices.buffer, binary);
  for (const change of [
    { count: -1 },
    { count: 1.5 },
    { matrixOffset: 4 },
    { colorOffset: 32 },
    { boundsSize: [1, NaN, 1] },
  ]) {
    assert.throws(
      () =>
        decodeInstanceGroups(
          {
            ...manifest,
            instanceGroups: [{ ...manifest.instanceGroups[0], ...change }],
          },
          binary,
        ),
      /Invalid instance group/,
    );
  }
  assert.throws(
    () => decodeInstanceGroups({ ...manifest, instances: 2 }, binary),
    /counts/,
  );
  assert.throws(
    () => decodeInstanceGroups(manifest, binary.slice(0, 76)),
    /incomplete/,
  );
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "/lab/assets/douro/instances.bin");
    return new Response(binary);
  });
  assert.equal((await loadInstances(manifest))[0].count, 1);
  assert.deepEqual(await loadInstances({}), []);
  await assert.rejects(loadInstances({ instances: 1 }), /groups are missing/);
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("", { status: 404 }),
  );
  await assert.rejects(loadInstances(manifest), /unavailable \(404\)/);
});

test("Unity instance graph keeps unique identities and explicit color, UV and wind inputs", () => {
  const objects = [
    { m_ObjectId: "graph", m_Nodes: [], m_Properties: [], m_Edges: [] },
    {
      m_ObjectId: "property-node",
      m_Type: "UnityEditor.ShaderGraph.PropertyNode",
      m_Slots: [],
    },
    {
      m_ObjectId: "property",
      m_Type: "UnityEditor.ShaderGraph.Internal.Vector1ShaderProperty",
    },
    {
      m_ObjectId: "uv",
      m_Type: "UnityEditor.ShaderGraph.UVNode",
      m_OutputChannel: 0,
    },
    {
      m_ObjectId: "position",
      m_SerializedDescriptor: "VertexDescription.Position",
    },
  ];
  for (const descriptor of ["BaseColor", "Emission"]) {
    objects.push({
      m_ObjectId: descriptor,
      m_SerializedDescriptor: `SurfaceDescription.${descriptor}`,
    });
    objects[0].m_Edges.push({
      m_OutputSlot: { m_Node: { m_Id: "uv" }, m_SlotId: 0 },
      m_InputSlot: { m_Node: { m_Id: descriptor }, m_SlotId: 0 },
    });
  }
  const text = objects.map(JSON.stringify).join("\n\n");
  const output = extendInstanceGraph(text);
  assert.equal(output, extendInstanceGraph(text));
  const result = JSON.parse(`[${output.trim().replace(/}\s*\{/g, "},{")}]`);
  assert.equal(
    new Set(result.map((entry) => entry.m_ObjectId)).size,
    result.length,
  );
  const graph = result[0];
  const custom = result.filter(
    (entry) => entry.m_Type === "UnityEditor.ShaderGraph.CustomFunctionNode",
  );
  assert.deepEqual(
    custom.map((entry) => entry.m_FunctionName),
    ["StudyUV", "StudyColor", "StudyColor", "StudyWind"],
  );
  const wind = custom.at(-1);
  const uvInput = graph.m_Edges.find(
    (edge) =>
      edge.m_InputSlot.m_Node.m_Id === wind.m_ObjectId &&
      edge.m_InputSlot.m_SlotId === 1,
  );
  const rawUV = result.find(
    (entry) => entry.m_ObjectId === uvInput.m_OutputSlot.m_Node.m_Id,
  );
  assert.equal(rawUV.m_Type, "UnityEditor.ShaderGraph.UVNode");
  assert.equal(rawUV.m_OutputChannel, 0);
  assert.notEqual(rawUV.m_ObjectId, custom[0].m_ObjectId);
  const positionInput = graph.m_Edges.find(
    (edge) => edge.m_InputSlot.m_Node.m_Id === "position",
  );
  assert.equal(positionInput.m_OutputSlot.m_Node.m_Id, wind.m_ObjectId);
  assert.match(
    instanceHlsl,
    /UNITY_ACCESS_INSTANCED_PROP\(Study, _StudyColor\)/,
  );
  assert.match(instanceHlsl, /Position\.x = -Position\.x/);
});

test("native water retains anti-aliasing and the column-major wave basis", () => {
  const hlsl = waterHlsl();
  assert.match(hlsl, /mul\(p - drift \* time, basis\)/);
  assert.match(
    hlsl,
    /float2\(dot\(n\.yz, basis\[0\]\), dot\(n\.yz, basis\[1\]\)\)/,
  );
  assert.match(hlsl, /footprint \* frequency/);
  assert.match(hlsl, /ddx\(p\)/);
  assert.doesNotMatch(hlsl, /float3\(0\.0\)/);
  assert.doesNotMatch(
    hlsl,
    /\b(vec[234]|mat2|fract|mix|inversesqrt|dFdx|dFdy)\b/,
  );
});

test("cached Babylon shaders bind each material's own weathering parameters", () => {
  const B = {
    MaterialPluginBase: class {
      _enable() {}
    },
  };
  const parameters = {
    profileIndex: 2,
    strength: 0.82,
    seed: 12.5,
    floor: 0.03,
    tileGrid: [9, 9],
    microStrength: 0.18,
  };
  const first = babylonPatina(B, {}, parameters);
  const second = babylonPatina(
    B,
    {},
    { ...parameters, profileIndex: 5, seed: 38 },
  );
  assert.deepEqual(
    first.getCustomCode("fragment"),
    second.getCustomCode("fragment"),
  );
  const values = {};
  const buffer = {
    updateFloat4: (name, ...value) => {
      values[name] = value;
    },
  };
  first.bindForSubMesh(buffer);
  assert.deepEqual(values.atlasPatinaParameters, [2, 0.82, 12.5, 0.03]);
  second.bindForSubMesh(buffer);
  assert.deepEqual(values.atlasPatinaParameters, [5, 0.82, 38, 0.03]);
  assert.deepEqual(values.atlasPatinaDetail, [9, 9, 0.18, 0]);
  const defines = {};
  first.prepareDefines(defines);
  assert.equal(defines.ATLAS_PATINA_PROFILE, 2);
  second.prepareDefines(defines);
  assert.equal(defines.ATLAS_PATINA_PROFILE, 5);
});

test("native HLSL uses the shared masks and preserves Unity's mirrored coordinates", () => {
  const source = patinaHlsl();
  assert.match(source, /void AtlasPatina_float/);
  assert.match(source, /Position\.x = -Position\.x/);
  assert.match(source, /AgedNormalTS = mul\(basis, normal\)/);
  assert.match(source, /atlasOxide/);
  assert.match(source, /ddx\(surfacePosition\)/);
  assert.doesNotMatch(source, /\b(vec[234]|mat2|fract|mix|dFdx|dFdy)\b/);
  assert.match(source, /#pragma shader_feature_local_fragment ATLAS_PROFILE_/);
  surfacePatinaProfiles.forEach((profile, index) => {
    assert(
      source.includes(
        `defined(ATLAS_PROFILE_${profile.toUpperCase()})\n#define ATLAS_PROFILE_INDEX ${index}.0`,
      ),
    );
  });
});

test("Shader Graph extension preserves imported material processing and connects all weathered outputs", () => {
  const objects = [
    { m_ObjectId: "graph", m_Nodes: [], m_Properties: [], m_Edges: [] },
    {
      m_ObjectId: "property-node",
      m_Type: "UnityEditor.ShaderGraph.PropertyNode",
      m_Slots: [],
    },
    {
      m_ObjectId: "property",
      m_Type: "UnityEditor.ShaderGraph.Internal.Vector1ShaderProperty",
    },
  ];
  for (const descriptor of [
    "BaseColor",
    "Smoothness",
    "Metallic",
    "NormalTS",
  ]) {
    objects.push({
      m_ObjectId: descriptor,
      m_SerializedDescriptor: `SurfaceDescription.${descriptor}`,
    });
    objects[0].m_Edges.push({
      m_OutputSlot: { m_Node: { m_Id: `original-${descriptor}` }, m_SlotId: 7 },
      m_InputSlot: { m_Node: { m_Id: descriptor }, m_SlotId: 0 },
    });
  }
  const input = objects.map((object) => JSON.stringify(object)).join("\n\n");
  const output = extendPatinaGraph(input);
  assert.equal(output, extendPatinaGraph(input));
  const result = JSON.parse(`[${output.trim().replace(/}\s*\{/g, "},{")}]`);
  const custom = result.find(
    (object) => object.m_Type === "UnityEditor.ShaderGraph.CustomFunctionNode",
  );
  assert.equal(custom.m_Slots.length, 17);
  assert.equal(result[0].m_Properties.length, 3);
  for (const [index, kind] of [
    [4, "PositionNode"],
    [5, "NormalVectorNode"],
    [6, "TangentVectorNode"],
    [7, "BitangentVectorNode"],
    [8, "UVNode"],
    [9, "UVNode"],
  ]) {
    const edge = result[0].m_Edges.find(
      (entry) =>
        entry.m_InputSlot.m_Node.m_Id === custom.m_ObjectId &&
        entry.m_InputSlot.m_SlotId === index,
    );
    const node = result.find(
      (object) => object.m_ObjectId === edge.m_OutputSlot.m_Node.m_Id,
    );
    assert.equal(node.m_Type, `UnityEditor.ShaderGraph.${kind}`);
    assert.equal(node.m_Space, 2);
    if (kind === "UVNode")
      assert.equal(node.m_OutputChannel, index === 9 ? 1 : 0);
  }
  for (const descriptor of [
    "BaseColor",
    "Smoothness",
    "Metallic",
    "NormalTS",
  ]) {
    const incoming = result[0].m_Edges.find(
      (edge) => edge.m_OutputSlot.m_Node.m_Id === `original-${descriptor}`,
    );
    assert.equal(incoming.m_InputSlot.m_Node.m_Id, custom.m_ObjectId);
    const outgoing = result[0].m_Edges.find(
      (edge) => edge.m_InputSlot.m_Node.m_Id === descriptor,
    );
    assert.equal(outgoing.m_OutputSlot.m_Node.m_Id, custom.m_ObjectId);
  }
  objects[0].m_Edges.length = 0;
  assert.throws(
    () =>
      extendPatinaGraph(
        objects.map((object) => JSON.stringify(object)).join("\n\n"),
      ),
    /Unconnected glTF shader output/,
  );
});
