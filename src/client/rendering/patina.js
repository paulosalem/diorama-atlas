import { portableSurfacePatinaShader } from "../environments/shared/surface-patina.js";

const scalar = (value) => Number(value).toFixed(8);
const vector = (values) =>
  `vec${values.length}(${values.map(scalar).join(",")})`;

function argumentsFor(data) {
  return [data.profileIndex, data.strength, data.seed, data.floor]
    .map(scalar)
    .concat(vector(data.tileGrid), scalar(data.microStrength))
    .join(", ");
}

export function babylonPatina(B, material, data) {
  class Patina extends B.MaterialPluginBase {
    constructor() {
      super(material, "AtlasPatina", 200, { ATLAS_PATINA_PROFILE: 0 });
      this._enable(true);
    }
    getClassName() {
      return "AtlasPatina";
    }
    prepareDefines(defines) {
      defines.ATLAS_PATINA_PROFILE = data.profileIndex;
    }
    getUniforms() {
      return {
        ubo: [
          { name: "atlasPatinaParameters", size: 4, type: "vec4" },
          { name: "atlasPatinaDetail", size: 4, type: "vec4" },
        ],
        fragment: `#ifndef UNIFORMBUFFERS
          uniform vec4 atlasPatinaParameters;
          uniform vec4 atlasPatinaDetail;
        #endif`,
      };
    }
    bindForSubMesh(buffer) {
      buffer.updateFloat4(
        "atlasPatinaParameters",
        data.profileIndex,
        data.strength,
        data.seed,
        data.floor,
      );
      buffer.updateFloat4(
        "atlasPatinaDetail",
        ...data.tileGrid,
        data.microStrength,
        0,
      );
    }
    getAttributes(attributes) {
      if (!attributes.includes("uv2")) attributes.push("uv2");
    }
    getCustomCode(stage) {
      if (stage === "vertex")
        return {
          CUSTOM_VERTEX_DEFINITIONS:
            "#ifndef UV2\nattribute vec2 uv2;\n#endif\nvarying float atlasObjectSeed;",
          CUSTOM_VERTEX_MAIN_END: "atlasObjectSeed = uv2.x;",
        };
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `varying float atlasObjectSeed;\n${portableSurfacePatinaShader()}\nfloat atlasRoughnessChange;\nfloat atlasMetalnessScale;`,
        CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
          vec2 atlasMapUv = vPositionW.xz;
          #ifdef ALBEDO
            atlasMapUv = vAlbedoUV;
          #endif
          atlasSurfacePatina(vPositionW, geometricNormalW, atlasObjectSeed, atlasMapUv,
            float(ATLAS_PATINA_PROFILE), atlasPatinaParameters.y, atlasPatinaParameters.z,
            atlasPatinaParameters.w, atlasPatinaDetail.xy, atlasPatinaDetail.z,
            surfaceAlbedo, atlasRoughnessChange, atlasMetalnessScale, normalW);
        `,
        CUSTOM_FRAGMENT_UPDATE_METALLICROUGHNESS: `
          metallicRoughness.g = clamp(metallicRoughness.g + atlasRoughnessChange, .08, 1.0);
          metallicRoughness.r *= atlasMetalnessScale;
        `,
      };
    }
  }
  return new Patina();
}

export function playcanvasPatina(pc, device, material, data) {
  material.forceUv1 = true;
  const chunks = material.shaderChunks.glsl;
  const original = pc.ShaderChunks.get(device, pc.SHADERLANGUAGE_GLSL).get(
    "stdFrontEndPS",
  );
  if (!original)
    throw new Error(
      "PlayCanvas standard surface extension point is unavailable",
    );
  const hook = `
    #ifdef FORWARD_PASS
      float atlasRoughnessChange, atlasMetalnessScale;
      atlasSurfacePatina(vPositionW, normalize(vNormalW), vUv1.x,
        vPositionW.xz, ${argumentsFor(data)},
        litArgs_albedo, atlasRoughnessChange, atlasMetalnessScale, litArgs_worldNormal);
      litArgs_gloss = 1.0 - clamp(1.0 - litArgs_gloss + atlasRoughnessChange, .08, 1.0);
      litArgs_metalness *= atlasMetalnessScale;
    #endif
  `;
  const mappedHook = material.diffuseMap
    ? hook.replace("vPositionW.xz,", `{STD_DIFFUSE_TEXTURE_UV},`)
    : hook;
  chunks.set(
    "stdFrontEndPS",
    portableSurfacePatinaShader() +
      original.replace(/\n\t}\s*$/, `${mappedHook}\n}`),
  );
  material.update();
}
