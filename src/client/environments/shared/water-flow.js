/**
 * Shared world-space water height and analytic slope (metres, seconds).
 * Smooth gradient noise is advected, not regenerated over time. Independent
 * scales and a slowly deforming coordinate field break up long wave trains.
 * The footprint is metres per pixel; unresolved waves fade before aliasing.
 */
export const WATER_FLOW_GLSL = /* glsl */ `
  vec2 waterGradient(vec2 cell) {
    vec3 h = fract(vec3(cell.xyx) * vec3(.1031, .1030, .0973));
    h += dot(h, h.yzx + 33.33);
    vec2 g = fract((h.xx + h.yz) * h.zy) * 2.0 - 1.0;
    return g * inversesqrt(max(dot(g, g), .0001));
  }

  // Value and exact spatial derivative, with C2 interpolation at cell edges.
  vec3 waterNoise(vec2 p) {
    vec2 cell = floor(p), f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
    vec2 ga = waterGradient(cell);
    vec2 gb = waterGradient(cell + vec2(1.0, 0.0));
    vec2 gc = waterGradient(cell + vec2(0.0, 1.0));
    vec2 gd = waterGradient(cell + vec2(1.0, 1.0));
    float a = dot(ga, f), b = dot(gb, f - vec2(1.0, 0.0));
    float c = dot(gc, f - vec2(0.0, 1.0)), d = dot(gd, f - 1.0);
    float value = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    vec2 gradient = mix(mix(ga, gb, u.x), mix(gc, gd, u.x), u.y);
    gradient += du * vec2(mix(b - a, d - c, u.y), mix(c - a, d - b, u.x));
    return vec3(value, gradient);
  }

  vec3 waterBand(vec2 p, mat2 basis, vec2 drift, float time,
                 float frequency, float amplitude, float footprint) {
    vec3 n = waterNoise(basis * (p - drift * time) * frequency);
    vec2 gradient = vec2(dot(n.yz, basis[0]), dot(n.yz, basis[1])) * frequency;
    float resolved = 1.0 - smoothstep(.22, .65, footprint * frequency);
    return vec3(n.x, gradient) * amplitude * resolved;
  }

  vec3 waterSurface(vec2 p, float time, float footprint) {
    vec3 bendX = waterNoise(p * .19 - vec2(.021, .013) * time + vec2(8.3, 2.8));
    vec3 bendZ = waterNoise(p * .23 - vec2(-.017, .009) * time + vec2(-3.7, 9.1));
    bendX.yz *= .19;
    bendZ.yz *= .23;
    vec2 q = p + vec2(bendX.x, bendZ.x) * .85;
    vec3 surface = waterBand(q + vec2(-23.8, 7.1), mat2(.68, .73, -.54, .50),
      vec2(.21, .09), time, .11, .042, footprint);
    surface += waterBand(q, mat2(.94, .34, -.22, .61),
      vec2(.13, .047), time, .45, .020, footprint);
    surface += waterBand(q + vec2(17.4, -5.2), mat2(.57, -.82, .57, .40),
      vec2(.072, -.061), time, 1.47, .009, footprint);
    surface += waterBand(q + vec2(-9.1, 13.8), mat2(.81, .59, -.43, .59),
      vec2(-.034, .083), time, 4.83, .0032, footprint);
    surface += waterBand(q + vec2(4.7, 21.3), mat2(-.31, .95, -.66, -.22),
      vec2(.058, .029), time, 13.8, .0009, footprint);
    // Chain rule through the bend and its slowly varying packet envelope.
    surface.yz += .85 * vec2(dot(surface.yz, vec2(bendX.y, bendZ.y)),
                            dot(surface.yz, vec2(bendX.z, bendZ.z)));
    float envelope = .92 + .38 * bendX.x;
    surface.yz = surface.yz * envelope + surface.x * .38 * bendX.yz;
    surface.x *= envelope;
    return surface;
  }

  // Optional, local fountain impact. Its phase, envelope and centre drift;
  // it never imposes a radial pattern on an entire canal or garden channel.
  vec3 waterImpact(vec2 p, float time, float footprint, vec4 disturbance) {
    if (disturbance.w <= 0.0) return vec3(0.0);
    vec2 delta = p - disturbance.xy
      - vec2(sin(time * .37), cos(time * .29)) * .035;
    float radius = max(disturbance.z, .05);
    float r = sqrt(dot(delta, delta) + .0025);
    vec2 radial = delta / r;
    vec3 irregular = waterNoise(delta * 4.1 - vec2(.13, -.08) * time + 11.7);
    irregular.yz *= 4.1;
    float phase = r * 31.0 - time * 3.4 + irregular.x * 4.2;
    vec2 phaseGradient = radial * 31.0 + irregular.yz * 4.2;
    float falloff = exp(-dot(delta, delta) / (radius * radius));
    float amplitude = .0011 * disturbance.w * falloff * (.72 + .35 * irregular.x);
    vec2 amplitudeGradient = .0011 * disturbance.w * falloff
      * (.35 * irregular.yz - (.72 + .35 * irregular.x) * 2.0 * delta / (radius * radius));
    float resolved = 1.0 - smoothstep(.025, .10, footprint);
    return vec3(sin(phase) * amplitude,
      cos(phase) * phaseGradient * amplitude + sin(phase) * amplitudeGradient) * resolved;
  }

  float waterFootprint(vec2 p) {
    return max(length(dFdx(p)), length(dFdy(p)));
  }

  float waterFresnel(vec3 viewDirection, vec3 normal) {
    return .0204 + .9796 * pow(1.0 - clamp(dot(viewDirection, normal), 0.0, 1.0), 5.0);
  }
`;

/** Bind a physical water material (including clones) to the same live uniforms. */
export function configureWaterMaterial(material, { time, disturbance }) {
  material.userData.time = time;
  material.userData.disturbance = disturbance;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.waterTime = time;
    shader.uniforms.waterDisturbance = disturbance;
    shader.vertexShader = "varying vec3 waterPosition;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      vec4 waterVertex = vec4(transformed, 1.0);
      #ifdef USE_BATCHING
        waterVertex = batchingMatrix * waterVertex;
      #endif
      #ifdef USE_INSTANCING
        waterVertex = instanceMatrix * waterVertex;
      #endif
      waterPosition = (modelMatrix * waterVertex).xyz;`,
    );
    shader.fragmentShader =
      `uniform float waterTime;
       uniform vec4 waterDisturbance;
       varying vec3 waterPosition;
       ${WATER_FLOW_GLSL}\n` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
      float waterPixel = waterFootprint(waterPosition.xz);
      vec3 waterFlow = waterSurface(waterPosition.xz, waterTime, waterPixel) * .72
        + waterImpact(waterPosition.xz, waterTime, waterPixel, waterDisturbance);
      vec3 waterUp = mat3(viewMatrix) * vec3(0.0, 1.0, 0.0);
      float waterFacing = pow(abs(dot(normal, waterUp)), 4.0);
      normal = normalize(normal - mat3(viewMatrix)
        * vec3(waterFlow.y, 0.0, waterFlow.z) * waterFacing);`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <clearcoat_normal_fragment_maps>",
      `#include <clearcoat_normal_fragment_maps>
      #ifdef USE_CLEARCOAT
        clearcoatNormal = normal;
      #endif`,
    );
  };
  material.customProgramCacheKey = () => "advected-water-v1";
  material.needsUpdate = true;
  return material;
}
