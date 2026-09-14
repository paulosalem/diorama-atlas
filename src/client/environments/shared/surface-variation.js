import * as THREE from "three";

export function stampSurfaceVariation(geometry, matrix) {
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const extent = geometry.boundingBox.getSize(new THREE.Vector3());
  const values = [
    ...matrix.elements.slice(12, 15),
    extent.x,
    extent.y,
    extent.z,
  ];
  let hash = 2166136261;
  for (const character of values.map((value) => value.toFixed(4)).join("/"))
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  const seeds = new Float32Array(geometry.attributes.position.count);
  seeds.fill((hash >>> 0) / 4294967296);
  geometry.setAttribute("atlasObjectSeed", new THREE.BufferAttribute(seeds, 1));
}

export function canScatterSurfaceMap(texture) {
  if (
    !texture ||
    texture.wrapS !== THREE.RepeatWrapping ||
    texture.wrapT !== THREE.RepeatWrapping
  )
    return false;
  const source = texture.image?.currentSrc ?? texture.image?.src ?? "";
  if (
    /floor_tiles|red_brick|plastered_stone_wall|\/planter-pot-clay\/|\/boulder-01\//.test(
      source,
    )
  )
    return false;
  return /wood_table_worn|plastered_wall_02|clay_plaster|\/rock_|\/ground_|worn-plaster_|weathered-wood_/.test(
    source,
  );
}

export const scatteredSampling = `
vec4 atlasScatteredSample(sampler2D surface, vec2 uv) {
  float selector=atlasAgeNoise(vec3(uv*.37,atlasPatinaSeed))*7.0;
  float index=floor(selector), blend=fract(selector);
  vec2 a=vec2(atlasAgeHash(vec3(index,3.0,atlasPatinaSeed)),atlasAgeHash(vec3(index,7.0,atlasPatinaSeed)))*3.73;
  vec2 b=vec2(atlasAgeHash(vec3(index+1.0,3.0,atlasPatinaSeed)),atlasAgeHash(vec3(index+1.0,7.0,atlasPatinaSeed)))*3.73;
  vec2 dx=dFdx(uv),dy=dFdy(uv);
  return mix(textureGrad(surface,uv+a,dx,dy),textureGrad(surface,uv+b,dx,dy),smoothstep(.15,.85,blend));
}
`;

export const tileSampling = `
vec4 atlasTileSample(sampler2D surface, vec2 uv) {
  vec2 position=uv*atlasPatinaTileGrid,cell=floor(position);
  vec2 choice=floor(vec2(atlasAgeHash(vec3(cell,atlasPatinaSeed+2.0)),
    atlasAgeHash(vec3(cell,atlasPatinaSeed+9.0)))*atlasPatinaTileGrid);
  vec2 sampleUv=(choice+fract(position))/atlasPatinaTileGrid;
  return textureGrad(surface,sampleUv,dFdx(uv),dFdy(uv));
}
`;

export function scatterSurfaceSampling(
  shader,
  material,
  { tiled = false } = {},
) {
  const channels = [
    ["map", "map_fragment", "vMapUv"],
    ["normalMap", "normal_fragment_maps", "vNormalMapUv"],
    ["roughnessMap", "roughnessmap_fragment", "vRoughnessMapUv"],
  ];
  for (const [slot, chunk, uv] of channels) {
    const texture = material[slot];
    const sourceUrl = texture?.image?.currentSrc ?? texture?.image?.src ?? "";
    if (
      !(tiled
        ? /terracotta_floor_tiles/.test(sourceUrl)
        : canScatterSurfaceMap(texture))
    )
      continue;
    const needle = `texture2D( ${slot}, ${uv} )`;
    const source = THREE.ShaderChunk[chunk];
    if (!source.includes(needle))
      throw new Error(`Unsupported Three.js surface sampler: ${slot}`);
    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <${chunk}>`,
      source.replaceAll(
        needle,
        `${tiled ? "atlasTileSample" : "atlasScatteredSample"}( ${slot}, ${uv} )`,
      ),
    );
  }
}
