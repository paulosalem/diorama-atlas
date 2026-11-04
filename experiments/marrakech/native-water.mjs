import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { WATER_FLOW_GLSL } from "../../src/client/environments/shared/water-flow.js";

export function waterHlsl() {
  return (
    WATER_FLOW_GLSL.replace(/\bvec([234])\b/g, "float$1")
      .replace(/\bmat2\b/g, "float2x2")
      .replace(/\bfract\b/g, "frac")
      .replace(/\bmix\b/g, "lerp")
      .replace(/\binversesqrt\b/g, "rsqrt")
      .replace(/\bdFdx\b/g, "ddx")
      .replace(/\bdFdy\b/g, "ddy")
      .replace("float3(0.0)", "float3(0.0, 0.0, 0.0)")
      // GLSL constructor rows become HLSL rows: vector-on-left retains the basis.
      .replace("basis * (p - drift * time)", "mul(p - drift * time, basis)")
  );
}

export async function generateNativeWater(project) {
  await mkdir(path.join(project, "Assets/Generated"), { recursive: true });
  return writeFile(
    path.join(project, "Assets/Generated/WaterFlow.hlsl"),
    waterHlsl(),
  );
}
