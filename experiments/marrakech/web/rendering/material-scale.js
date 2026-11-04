function projection(position, normal, scale) {
  return `
    vec3 studyNormal = abs(${normal});
    vec2 studyUv = studyNormal.y >= max(studyNormal.x, studyNormal.z)
      ? ${position}.xz
      : studyNormal.x > studyNormal.z ? ${position}.zy : ${position}.xy;
    studyUv /= ${scale};
  `;
}

export function babylonMaterialScale(B, material, scale) {
  class Scale extends B.MaterialPluginBase {
    constructor() {
      super(material, "StudyMaterialScale", 220);
      this._enable(true);
    }
    getClassName() {
      return "StudyMaterialScale";
    }
    getUniforms() {
      return {
        ubo: [{ name: "studyMaterialScale", size: 1, type: "float" }],
        vertex:
          "#ifndef UNIFORMBUFFERS\nuniform float studyMaterialScale;\n#endif",
      };
    }
    bindForSubMesh(buffer) {
      buffer.updateFloat("studyMaterialScale", scale);
    }
    getCustomCode(stage) {
      if (stage !== "vertex") return null;
      return {
        CUSTOM_VERTEX_MAIN_END: `
        ${projection("vPositionW", "vNormalW", "studyMaterialScale")}
        #ifdef MAINUV1
        vMainUV1 = studyUv;
        #endif
        #if defined(ALBEDO) && ALBEDODIRECTUV == 0
        vAlbedoUV = studyUv;
        #endif
        #if defined(BUMP) && BUMPDIRECTUV == 0
        vBumpUV = studyUv;
        #endif
        #if defined(REFLECTIVITY) && REFLECTIVITYDIRECTUV == 0
        vReflectivityUV = studyUv;
        #endif
      `,
      };
    }
  }
  return new Scale();
}

export function playcanvasMaterialScale(material, scale) {
  material.shaderChunks.glsl.set(
    "uv0VS",
    `
    uniform float studyMaterialScale;
    #ifndef NORMALS
    attribute vec3 vertex_normal;
    #endif
    vec2 getUv0() {
      #ifdef NORMALS
      vec3 studyGeometryNormal = vNormalW;
      #else
      vec3 studyGeometryNormal = normalize(transpose(inverse(mat3(dModelMatrix))) * vertex_normal);
      #endif
      ${projection("vPositionW", "studyGeometryNormal", "studyMaterialScale")}
      return studyUv;
    }
  `,
  );
  material.setParameter("studyMaterialScale", scale);
  material.update();
}
