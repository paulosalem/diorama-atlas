/** Keep a moving open hull dry without lifting its keel above the river. */
export function babylonHullWater(B, material, node, profile) {
  const inverse = B.Matrix.Identity();
  class HullWater extends B.MaterialPluginBase {
    constructor() {
      super(material, "HullWater", 230);
      this._enable(true);
    }
    getClassName() {
      return "HullWater";
    }
    getUniforms() {
      return {
        ubo: [
          { name: "hullInverse", size: 16, type: "mat4" },
          { name: "hullProfile", size: 4, type: "vec4" },
        ],
        fragment:
          "#ifndef UNIFORMBUFFERS\nuniform mat4 hullInverse;\nuniform vec4 hullProfile;\n#endif",
      };
    }
    bindForSubMesh(buffer) {
      node.computeWorldMatrix(true).invertToRef(inverse);
      buffer.updateMatrix("hullInverse", inverse);
      buffer.updateFloat4(
        "hullProfile",
        profile.halfLength,
        profile.halfWidth,
        profile.floor,
        profile.sideHeight,
      );
    }
    getCustomCode(stage) {
      return stage === "fragment"
        ? {
            CUSTOM_FRAGMENT_MAIN_BEGIN: `
          vec3 hullPoint = (hullInverse * vec4(vPositionW, 1.0)).xyz;
          if (abs(hullPoint.z) < hullProfile.x && hullPoint.y > hullProfile.z && hullPoint.y < hullProfile.z + hullProfile.w) {
            float hullT = hullPoint.z / (2.0 * hullProfile.x) + 0.5;
            float hullWidth = hullProfile.y * pow(max(0.0, sin(hullT * 3.14159265)), 0.58);
            float hullHeight = clamp((hullPoint.y - hullProfile.z) / hullProfile.w, 0.0, 1.0);
            if (abs(hullPoint.x) < hullWidth * (0.53 + 0.47 * hullHeight)) discard;
          }
        `,
          }
        : null;
    }
  }
  return new HullWater();
}
