import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  portableSurfacePatinaShader,
  surfacePatinaProfiles,
} from "../../src/client/environments/shared/surface-patina.js";

const id = (name) =>
  createHash("sha256")
    .update(`atlas-patina/${name}`)
    .digest("hex")
    .slice(0, 32);
const type = (name) => `UnityEditor.ShaderGraph.${name}`;
const reference = (object) => ({ m_Id: object.m_ObjectId });

async function save(file, content) {
  let existing;
  try {
    existing = await readFile(file, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (existing !== content) await writeFile(file, content);
}

export function patinaHlsl() {
  const keywords = surfacePatinaProfiles.map(
    (profile) => `ATLAS_PROFILE_${profile.toUpperCase()}`,
  );
  const kernel = portableSurfacePatinaShader()
    .replace(
      /vec([234])\(([.\d]+)\)/g,
      (_, n, v) => `vec${n}(${Array(Number(n)).fill(v).join(",")})`,
    )
    .replaceAll(
      "mat2(.72,-.69,.69,.72)*atlasDirection",
      "mul(float2x2(.72,.69,-.69,.72),atlasDirection)",
    )
    .replace(/\bvec([234])\b/g, "float$1")
    .replace(/\bfract\b/g, "frac")
    .replace(/\bmix\b/g, "lerp")
    .replace(/\bdFdx\b/g, "ddx")
    .replace(/\bdFdy\b/g, "ddy");
  return `#ifndef ATLAS_NATIVE_PATINA
#define ATLAS_NATIVE_PATINA
#pragma shader_feature_local_fragment ${keywords.join(" ")}
${keywords.map((keyword, index) => `${index ? "#elif" : "#if"} defined(${keyword})\n#define ATLAS_PROFILE_INDEX ${index}.0`).join("\n")}
#else
#define ATLAS_PROFILE_INDEX Parameters.x
#endif
${kernel}
void AtlasPatina_float(float3 Color, float Smoothness, float Metallic, float3 NormalTS,
  float3 Position, float3 GeometricNormal, float3 Tangent, float3 Bitangent,
  float2 UV, float2 SeedUV, float4 Parameters, float4 Detail, float4 MapTransform,
  out float3 AgedColor, out float AgedSmoothness, out float AgedMetallic, out float3 AgedNormalTS) {
  float3x3 basis = float3x3(normalize(Tangent), normalize(Bitangent), normalize(GeometricNormal));
  float3 normal = normalize(mul(NormalTS, basis));
  Position.x = -Position.x;
  GeometricNormal.x = -GeometricNormal.x;
  normal.x = -normal.x;
  AgedColor = Color;
  float roughnessChange, metalnessScale;
  atlasSurfacePatina(Position, GeometricNormal, SeedUV.x, UV * MapTransform.xy + MapTransform.zw,
    ATLAS_PROFILE_INDEX, Parameters.y, Parameters.z, Parameters.w, Detail.xy, Detail.z,
    AgedColor, roughnessChange, metalnessScale, normal);
  AgedSmoothness = 1.0 - clamp(1.0 - Smoothness + roughnessChange, .08, 1.0);
  AgedMetallic = Metallic * metalnessScale;
  normal.x = -normal.x;
  AgedNormalTS = mul(basis, normal);
}
#endif
`;
}

export function extendPatinaGraph(text) {
  const objects = JSON.parse(`[${text.trim().replace(/}\s*\{/g, "},{")}]`);
  const graph = objects[0];
  const nodeTemplate = objects.find(
    (object) => object.m_Type === type("PropertyNode"),
  );
  const propertyTemplate = objects.find(
    (object) => object.m_Type === type("Internal.Vector1ShaderProperty"),
  );
  const add = (object) => {
    objects.push(object);
    return object;
  };
  const node = (name, kind, extra) => {
    const result = add({
      ...structuredClone(nodeTemplate),
      m_ObjectId: id(name),
      m_Type: type(kind),
      m_Name: name,
      m_Precision: 1,
      m_Slots: [],
      ...extra,
    });
    delete result.m_Property;
    graph.m_Nodes.push(reference(result));
    return result;
  };
  const slot = (
    owner,
    number,
    name,
    kind,
    dimensions,
    output = false,
    extra = {},
  ) => {
    const zero =
      dimensions === 1
        ? 0
        : Object.fromEntries(
            ["x", "y", "z", "w"].slice(0, dimensions).map((key) => [key, 0]),
          );
    const result = add({
      m_SGVersion: 0,
      m_Type: type(`${kind}MaterialSlot`),
      m_ObjectId: id(`${owner.m_ObjectId}/${number}`),
      m_Id: number,
      m_DisplayName: name,
      m_ShaderOutputName: name,
      m_SlotType: Number(output),
      m_Hidden: false,
      m_StageCapability: 2,
      m_Value: zero,
      m_DefaultValue: zero,
      m_Labels: [],
      ...extra,
    });
    owner.m_Slots.push(reference(result));
    return number;
  };
  const connect = (from, fromSlot, to, toSlot) =>
    graph.m_Edges.push({
      m_OutputSlot: { m_Node: reference(from), m_SlotId: fromSlot },
      m_InputSlot: { m_Node: reference(to), m_SlotId: toSlot },
    });
  const custom = node("AtlasPatina", "CustomFunctionNode", {
    m_SGVersion: 1,
    m_SourceType: 0,
    m_FunctionName: "AtlasPatina",
    m_FunctionSource: id("Patina.hlsl"),
    m_FunctionSourceUsePragmas: true,
    m_FunctionBody: "",
  });
  const inputs = [
    ["Color", "Vector3", 3],
    ["Smoothness", "Vector1", 1],
    ["Metallic", "Vector1", 1],
    ["NormalTS", "Vector3", 3],
    ["Position", "Vector3", 3],
    ["GeometricNormal", "Vector3", 3],
    ["Tangent", "Vector3", 3],
    ["Bitangent", "Vector3", 3],
    ["UV", "Vector2", 2],
    ["SeedUV", "Vector2", 2],
    ["Parameters", "Vector4", 4],
    ["Detail", "Vector4", 4],
    ["MapTransform", "Vector4", 4],
  ];
  inputs.forEach(([name, kind, dimensions], index) =>
    slot(custom, index, name, kind, dimensions),
  );
  // Custom functions do not declare interpolator requirements from bound slots.
  for (const [index, kind] of [
    [4, "PositionNode"],
    [5, "NormalVectorNode"],
    [6, "TangentVectorNode"],
    [7, "BitangentVectorNode"],
    [8, "UVNode"],
    [9, "UVNode"],
  ]) {
    const geometry = node(`Geometry/${index}`, kind, {
      m_SGVersion: kind === "PositionNode" ? 1 : 0,
      m_Space: 2,
      m_OutputChannel: index === 9 ? 1 : 0,
    });
    const dimensions = kind === "UVNode" ? 4 : 3;
    slot(geometry, 0, "Out", `Vector${dimensions}`, dimensions, true);
    connect(geometry, 0, custom, index);
  }
  for (const [index, descriptor, name, dimensions] of [
    [0, "BaseColor", "AgedColor", 3],
    [1, "Smoothness", "AgedSmoothness", 1],
    [2, "Metallic", "AgedMetallic", 1],
    [3, "NormalTS", "AgedNormalTS", 3],
  ]) {
    slot(custom, 13 + index, name, `Vector${dimensions}`, dimensions, true);
    const block = objects.find(
      (object) =>
        object.m_SerializedDescriptor === `SurfaceDescription.${descriptor}`,
    );
    if (!block) throw new Error(`Missing glTF shader output: ${descriptor}`);
    const edge = graph.m_Edges.find(
      (entry) => entry.m_InputSlot.m_Node.m_Id === block.m_ObjectId,
    );
    if (!edge) throw new Error(`Unconnected glTF shader output: ${descriptor}`);
    const blockSlot = edge.m_InputSlot.m_SlotId;
    edge.m_InputSlot = { m_Node: reference(custom), m_SlotId: index };
    connect(custom, 13 + index, block, blockSlot);
  }
  for (const [index, name] of [
    [10, "_AtlasPatina"],
    [11, "_AtlasPatinaDetail"],
    [12, "_AtlasPatinaUv"],
  ]) {
    const property = add({
      ...structuredClone(propertyTemplate),
      m_Type: type("Internal.Vector4ShaderProperty"),
      m_ObjectId: id(name),
      m_Guid: { m_GuidSerialized: id(`${name}/guid`) },
      m_Name: name,
      m_DefaultReferenceName: name,
      m_OverrideReferenceName: name,
      m_Value: { x: 0, y: 0, z: 0, w: 0 },
      m_Hidden: true,
    });
    graph.m_Properties.push(reference(property));
    const propertyNode = node(`${name}/node`, "PropertyNode", {});
    propertyNode.m_Property = reference(property);
    slot(propertyNode, 0, "Out", "Vector4", 4, true);
    connect(propertyNode, 0, custom, index);
  }
  graph.m_Path = "Marrakech/Patina";
  return (
    objects.map((object) => JSON.stringify(object, null, 2)).join("\n\n") + "\n"
  );
}

export async function generateNativePatina(project) {
  const packages = path.join(project, "Library/PackageCache");
  const gltf = (await readdir(packages)).filter((name) =>
    name.startsWith("com.unity.cloud.gltfast@"),
  );
  if (gltf.length !== 1)
    throw new Error("Expected one resolved glTFast package");
  const source = path.join(packages, gltf[0], "Runtime/Shader");
  const output = path.join(project, "Assets/Generated/Patina");
  await mkdir(output, { recursive: true });
  await save(path.join(output, "Patina.hlsl"), patinaHlsl());
  await save(
    path.join(output, "Patina.hlsl.meta"),
    `fileFormatVersion: 2\nguid: ${id("Patina.hlsl")}\nShaderIncludeImporter:\n  externalObjects: {}\n  userData:\n  assetBundleName:\n  assetBundleVariant:\n`,
  );
  for (const file of (await readdir(source, { recursive: true })).filter(
    (name) =>
      !name.startsWith(`HDRP${path.sep}`) &&
      /^glTF-pbrMetallicRoughness.*\.shadergraph$/.test(path.basename(name)),
  )) {
    await save(
      path.join(output, path.basename(file)),
      extendPatinaGraph(await readFile(path.join(source, file), "utf8")),
    );
  }
}
