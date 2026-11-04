const breeze = (position, uv, anchor, time) => `
  float studyFlex = length(${uv} - ${anchor});
  float studyBreeze = sin(${time} * .9 + ${position}.x * 1.3 + ${position}.z * .7)
    + .32 * sin(${time} * 1.7 + ${position}.y * 7.0 + ${position}.x * .8);
  ${position}.xz += vec2(.021, .014) * studyBreeze * studyFlex * studyFlex;
`;

export function babylonFoliage(B, material, data) {
  let time = 0;
  class Foliage extends B.MaterialPluginBase {
    constructor() {
      super(material, "StudyFoliage", 210);
      this._enable(true);
    }
    getClassName() {
      return "StudyFoliage";
    }
    getUniforms() {
      return {
        ubo: [{ name: "studyWind", size: 4, type: "vec4" }],
        vertex: "#ifndef UNIFORMBUFFERS\nuniform vec4 studyWind;\n#endif",
      };
    }
    bindForSubMesh(buffer) {
      buffer.updateFloat4("studyWind", time, ...data.anchor, 0);
    }
    getCustomCode(stage) {
      return stage === "vertex"
        ? {
            CUSTOM_VERTEX_UPDATE_WORLDPOS: breeze(
              "worldPos",
              "uv",
              "studyWind.yz",
              "studyWind.x",
            ),
          }
        : null;
    }
  }
  new Foliage();
  material.twoSidedLighting = true;
  material.subSurface.isTranslucencyEnabled = true;
  material.subSurface.translucencyIntensity = 0.3;
  material.subSurface.useAlbedoToTintTranslucency = true;
  material.subSurface.minimumThickness = 0;
  material.subSurface.maximumThickness = 0.025;
  return (value) => {
    time = value;
  };
}

export function playcanvasFoliage(pc, device, material, data) {
  const chunks = material.shaderChunks.glsl;
  const original =
    chunks.get("transformVS") ??
    pc.ShaderChunks.get(device, pc.SHADERLANGUAGE_GLSL).get("transformVS");
  if (!original?.includes("dPositionW = posW.xyz;"))
    throw new Error("PlayCanvas foliage extension point is unavailable");
  chunks.set(
    "transformVS",
    `
    uniform vec4 studyWind;
    ${original.replace(
      "dPositionW = posW.xyz;",
      `
      ${breeze("posW", "vertex_texCoord0", "studyWind.yz", "studyWind.x")}
      dPositionW = posW.xyz;
    `,
    )}
  `,
  );
  material.twoSidedLighting = true;
  material.setParameter("studyWind", [0, ...data.anchor, 0]);
  material.update();
  return (time) =>
    material.setParameter("studyWind", [time, ...data.anchor, 0]);
}
