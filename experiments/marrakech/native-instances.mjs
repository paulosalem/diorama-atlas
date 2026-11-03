import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const id = (name) =>
  createHash("sha256")
    .update(`study-instances/${name}`)
    .digest("hex")
    .slice(0, 32);
const type = (name) => `UnityEditor.ShaderGraph.${name}`;
const ref = (object) => ({ m_Id: object.m_ObjectId });

export const instanceHlsl = `#ifndef STUDY_INSTANCES
#define STUDY_INSTANCES
#ifdef UNITY_INSTANCING_ENABLED
UNITY_INSTANCING_BUFFER_START(Study)
UNITY_DEFINE_INSTANCED_PROP(float4, _StudyColor)
UNITY_INSTANCING_BUFFER_END(Study)
#endif
float _StudyClock;
void StudyColor_float(float3 Color, out float3 Result) {
  Result = Color;
  #ifdef UNITY_INSTANCING_ENABLED
  Result *= UNITY_ACCESS_INSTANCED_PROP(Study, _StudyColor).rgb;
  #endif
}
void StudyWind_float(float3 Position, float2 UV, float4 Wind, out float3 Result) {
  float3 world = TransformObjectToWorld(Position);
  float flex = length(UV - Wind.yz);
  float breeze = sin(_StudyClock * .9 - world.x * 1.3 + world.z * .7)
    + .32 * sin(_StudyClock * 1.7 + world.y * 7.0 - world.x * .8);
  world.xz += float2(-.021, .014) * breeze * flex * flex * Wind.x;
  Result = TransformWorldToObject(world);
}
void StudyUV_float(float4 UV, float3 Position, float3 Normal, float Scale, out float4 Result) {
  Result = UV;
  if (Scale > 0) {
    Position.x = -Position.x;
    float3 n = abs(Normal);
    Result.xy = (n.y >= max(n.x, n.z) ? Position.xz : n.x > n.z ? Position.zy : Position.xy) / Scale;
  }
}
#endif
`;

export function extendInstanceGraph(text) {
  const objects = JSON.parse(`[${text.trim().replace(/}\s*\{/g, "},{")}]`);
  const graph = objects[0];
  const template = objects.find(
    (object) => object.m_Type === type("PropertyNode"),
  );
  const propertyTemplate = objects.find(
    (object) => object.m_Type === type("Internal.Vector1ShaderProperty"),
  );
  function node(name, kind, extra = {}) {
    const value = {
      ...structuredClone(template),
      m_ObjectId: id(name),
      m_Type: type(kind),
      m_Name: name,
      m_Precision: 1,
      m_Slots: [],
      ...extra,
    };
    delete value.m_Property;
    objects.push(value);
    graph.m_Nodes.push(ref(value));
    return value;
  }
  function slot(owner, number, name, size, output = false) {
    const zero =
      size === 1
        ? 0
        : Object.fromEntries(
            ["x", "y", "z", "w"].slice(0, size).map((key) => [key, 0]),
          );
    const value = {
      m_SGVersion: 0,
      m_Type: type(`Vector${size}MaterialSlot`),
      m_ObjectId: id(`${owner.m_ObjectId}/${number}`),
      m_Id: number,
      m_DisplayName: name,
      m_ShaderOutputName: name,
      m_SlotType: Number(output),
      m_Hidden: false,
      m_StageCapability: 3,
      m_Value: zero,
      m_DefaultValue: zero,
      m_Labels: [],
    };
    objects.push(value);
    owner.m_Slots.push(ref(value));
  }
  function connect(from, fromSlot, to, toSlot) {
    graph.m_Edges.push({
      m_OutputSlot: { m_Node: ref(from), m_SlotId: fromSlot },
      m_InputSlot: { m_Node: ref(to), m_SlotId: toSlot },
    });
  }
  function custom(name) {
    return node(name, "CustomFunctionNode", {
      m_SGVersion: 1,
      m_SourceType: 0,
      m_FunctionName: name,
      m_FunctionSource: id("Instances.hlsl"),
      m_FunctionSourceUsePragmas: true,
      m_FunctionBody: "",
    });
  }
  const originalUV = objects.find(
    (object) =>
      object.m_Type === type("UVNode") && object.m_OutputChannel === 0,
  );
  if (!originalUV) throw new Error("Missing glTF UV0 source");
  const projected = custom("StudyUV");
  slot(projected, 0, "UV", 4);
  slot(projected, 1, "Position", 3);
  slot(projected, 2, "Normal", 3);
  slot(projected, 3, "Scale", 1);
  slot(projected, 4, "Result", 4, true);
  for (const edge of graph.m_Edges)
    if (edge.m_OutputSlot.m_Node.m_Id === originalUV.m_ObjectId)
      edge.m_OutputSlot = { m_Node: ref(projected), m_SlotId: 4 };
  connect(originalUV, 0, projected, 0);
  for (const [index, kind] of [
    [1, "PositionNode"],
    [2, "NormalVectorNode"],
  ]) {
    const nodeValue = node(`StudyProjection/${index}`, kind, {
      m_SGVersion: kind === "PositionNode" ? 1 : 0,
      m_Space: 2,
    });
    slot(nodeValue, 0, "Out", 3, true);
    connect(nodeValue, 0, projected, index);
  }
  const scaleProperty = {
    ...structuredClone(propertyTemplate),
    m_ObjectId: id("_StudyScale"),
    m_Guid: { m_GuidSerialized: id("_StudyScale/guid") },
    m_Name: "_StudyScale",
    m_DefaultReferenceName: "_StudyScale",
    m_OverrideReferenceName: "_StudyScale",
    m_Value: 0,
    m_Hidden: true,
  };
  objects.push(scaleProperty);
  graph.m_Properties.push(ref(scaleProperty));
  const scaleNode = node("StudyScaleParameter", "PropertyNode");
  scaleNode.m_Property = ref(scaleProperty);
  slot(scaleNode, 0, "Out", 1, true);
  connect(scaleNode, 0, projected, 3);
  for (const descriptor of ["BaseColor", "Emission"]) {
    const block = objects.find(
      (object) =>
        object.m_SerializedDescriptor === `SurfaceDescription.${descriptor}`,
    );
    const edge =
      block &&
      graph.m_Edges.find(
        (entry) => entry.m_InputSlot.m_Node.m_Id === block.m_ObjectId,
      );
    if (!edge) continue;
    const color = custom("StudyColor");
    // Both surface outputs need independent nodes and slots.
    color.m_ObjectId = id(`StudyColor/${descriptor}`);
    graph.m_Nodes.at(-1).m_Id = color.m_ObjectId;
    slot(color, 0, "Color", 3);
    slot(color, 1, "Result", 3, true);
    const target = edge.m_InputSlot.m_SlotId;
    edge.m_InputSlot = { m_Node: ref(color), m_SlotId: 0 };
    connect(color, 1, block, target);
  }
  const positionBlock = objects.find(
    (object) => object.m_SerializedDescriptor === "VertexDescription.Position",
  );
  if (!positionBlock) throw new Error("Missing vertex position block");
  const wind = custom("StudyWind");
  slot(wind, 0, "Position", 3);
  slot(wind, 1, "UV", 2);
  slot(wind, 2, "Wind", 4);
  slot(wind, 3, "Result", 3, true);
  const position = node("StudyPosition", "PositionNode", {
    m_SGVersion: 1,
    m_Space: 0,
  });
  slot(position, 0, "Out", 3, true);
  const uv = node("StudyWindUV", "UVNode", { m_OutputChannel: 0 });
  slot(uv, 0, "Out", 4, true);
  const property = {
    ...structuredClone(propertyTemplate),
    m_Type: type("Internal.Vector4ShaderProperty"),
    m_ObjectId: id("_StudyWind"),
    m_Guid: { m_GuidSerialized: id("_StudyWind/guid") },
    m_Name: "_StudyWind",
    m_DefaultReferenceName: "_StudyWind",
    m_OverrideReferenceName: "_StudyWind",
    m_Value: { x: 0, y: 0, z: 0, w: 0 },
    m_Hidden: true,
  };
  objects.push(property);
  graph.m_Properties.push(ref(property));
  const parameter = node("StudyWindParameter", "PropertyNode");
  parameter.m_Property = ref(property);
  slot(parameter, 0, "Out", 4, true);
  connect(position, 0, wind, 0);
  connect(uv, 0, wind, 1);
  connect(parameter, 0, wind, 2);
  graph.m_Edges = graph.m_Edges.filter(
    (edge) => edge.m_InputSlot.m_Node.m_Id !== positionBlock.m_ObjectId,
  );
  connect(wind, 3, positionBlock, 0);
  graph.m_Path = "Study/Instanced";
  return (
    objects.map((object) => JSON.stringify(object, null, 2)).join("\n\n") + "\n"
  );
}

export async function generateNativeInstances(project) {
  const packages = path.join(project, "Library/PackageCache");
  const gltf = (await readdir(packages)).filter((name) =>
    name.startsWith("com.unity.cloud.gltfast@"),
  );
  if (gltf.length !== 1)
    throw new Error("Expected one resolved glTFast package");
  const source = path.join(packages, gltf[0], "Runtime/Shader");
  const output = path.join(project, "Assets/Generated/Instances");
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "Instances.hlsl"), instanceHlsl);
  await writeFile(
    path.join(output, "Instances.hlsl.meta"),
    `fileFormatVersion: 2\nguid: ${id("Instances.hlsl")}\nShaderIncludeImporter:\n  externalObjects: {}\n`,
  );
  for (const name of [
    "glTF-pbrMetallicRoughness.shadergraph",
    "glTF-unlit.shadergraph",
  ]) {
    const file = (await readdir(source, { recursive: true })).find(
      (file) =>
        !file.startsWith(`HDRP${path.sep}`) && path.basename(file) === name,
    );
    if (!file) throw new Error(`Missing glTFast shader: ${name}`);
    await writeFile(
      path.join(output, name),
      extendInstanceGraph(await readFile(path.join(source, file), "utf8")),
    );
    if (name.includes("pbr"))
      await writeFile(
        path.join(output, `Patina-${name}`),
        extendInstanceGraph(
          await readFile(
            path.join(project, "Assets/Generated/Patina", name),
            "utf8",
          ),
        ),
      );
  }
}
