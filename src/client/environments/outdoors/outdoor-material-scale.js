const configured = new WeakSet();
const grainGains = new WeakMap();

export function scannedGrainGain(image) {
  if (!grainGains.has(image)) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, 32, 32);
    const pixels = context.getImageData(0, 0, 32, 32).data;
    const linear = (channel) => {
      const value = channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    };
    let total = 0;
    for (let i = 0; i < pixels.length; i += 4)
      total +=
        linear(pixels[i]) * 0.2126 +
        linear(pixels[i + 1]) * 0.7152 +
        linear(pixels[i + 2]) * 0.0722;
    const mean = total / (pixels.length / 4);
    if (mean <= 0)
      throw new Error(
        "A scanned wood surface has no measurable diffuse signal.",
      );
    grainGains.set(image, 1 / mean);
  }
  return grainGains.get(image);
}

/** Keep scanned grain at physical scale, including on shared/instanced geometry. */
export function configureOutdoorMaterialScale(material) {
  const scale = material.userData.metresPerRepeat;
  if (
    !material.isMeshStandardMaterial ||
    !material.map ||
    scale === undefined ||
    configured.has(material)
  )
    return;
  if (!Number.isFinite(scale) || scale <= 0)
    throw new Error(
      `Invalid physical texture scale on ${material.name || "an outdoor material"}.`,
    );
  const compile = material.onBeforeCompile;
  const cacheKey = material.customProgramCacheKey();
  const normalizeGrain = material.userData.diffuseDetailMode === "tinted-grain";
  const grainStrength = material.userData.diffuseDetailStrength ?? 1;
  if (!Number.isFinite(grainStrength) || grainStrength < 0 || grainStrength > 1)
    throw new Error(
      "Outdoor diffuse detail strength must be between zero and one.",
    );
  configured.add(material);
  const gain = { value: 1 };
  material.onBeforeCompile = (shader, renderer) => {
    compile.call(material, shader, renderer);
    shader.uniforms.outdoorMaterialScale = { value: scale };
    shader.uniforms.outdoorGrainGain = gain;
    shader.vertexShader =
      "uniform float outdoorMaterialScale;\nvarying vec3 outdoorSurfacePosition;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `
      #include <project_vertex>
      vec4 outdoorPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        outdoorPosition = instanceMatrix * outdoorPosition;
      #endif
      outdoorPosition = modelMatrix * outdoorPosition;
      outdoorSurfacePosition = outdoorPosition.xyz;
      vec3 outdoorNormal = abs(inverseTransformDirection(transformedNormal, viewMatrix));
      vec2 outdoorUv = outdoorNormal.y >= max(outdoorNormal.x, outdoorNormal.z)
        ? outdoorPosition.xz
        : outdoorNormal.x > outdoorNormal.z ? outdoorPosition.zy : outdoorPosition.xy;
      outdoorUv /= outdoorMaterialScale;
      #ifdef USE_MAP
        vMapUv = outdoorUv;
      #endif
      #ifdef USE_NORMALMAP
        vNormalMapUv = outdoorUv;
      #endif
      #ifdef USE_ROUGHNESSMAP
        vRoughnessMapUv = outdoorUv;
      #endif
      #ifdef USE_BUMPMAP
        vBumpMapUv = outdoorUv;
      #endif
    `,
    );
    shader.fragmentShader =
      `
      uniform float outdoorGrainGain;
      varying vec3 outdoorSurfacePosition;
      float outdoorGrainHash(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      float outdoorBroadVariation(vec3 p) {
        vec3 cell = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = mix(outdoorGrainHash(cell), outdoorGrainHash(cell + vec3(1,0,0)), f.x);
        float b = mix(outdoorGrainHash(cell + vec3(0,1,0)), outdoorGrainHash(cell + vec3(1,1,0)), f.x);
        float c = mix(outdoorGrainHash(cell + vec3(0,0,1)), outdoorGrainHash(cell + vec3(1,0,1)), f.x);
        float d = mix(outdoorGrainHash(cell + vec3(0,1,1)), outdoorGrainHash(cell + vec3(1,1,1)), f.x);
        return mix(mix(a,b,f.y), mix(c,d,f.y), f.z);
      }
    ` + shader.fragmentShader;
    if (normalizeGrain)
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `
      vec3 outdoorPigment = diffuseColor.rgb;
      #include <map_fragment>
      #ifdef USE_MAP
        float grain = dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)) * outdoorGrainGain;
        diffuseColor.rgb = min(outdoorPigment * mix(1.0, clamp(grain, 0.35, 1.65), ${grainStrength.toFixed(5)}), vec3(0.88));
      #endif
    `,
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `
      #include <color_fragment>
      float outdoorVariation = outdoorBroadVariation(outdoorSurfacePosition * 0.43);
      diffuseColor.rgb *= mix(0.91, 1.035, outdoorVariation);
    `,
    );
  };
  material.customProgramCacheKey = () =>
    `${cacheKey}/outdoor-world-material-${scale}/${normalizeGrain}/${grainStrength}`;
  material.needsUpdate = true;
  if (normalizeGrain)
    return () => {
      gain.value = scannedGrainGain(material.map.image);
    };
}
