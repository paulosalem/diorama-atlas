import {
  stampSurfaceVariation,
  canScatterSurfaceMap,
  scatteredSampling,
  tileSampling,
  scatterSurfaceSampling,
} from "./surface-variation.js";

const profiles = new Set([
  "plaster",
  "stone",
  "tile",
  "terracotta",
  "clay",
  "wood",
  "metal",
  "fabric",
  "leather",
  "earth",
]);

export function surfacePatinaProfile(material) {
  if (
    !material.isMeshStandardMaterial ||
    material.transparent ||
    material.alphaTest > 0 ||
    material.transmission > 0 ||
    material.userData.artwork ||
    material.userData.photographicFoliage ||
    (material.emissiveIntensity > 0 && material.emissive?.getHex() !== 0)
  )
    return null;
  const explicit = material.userData.patinaProfile;
  if (explicit === "none") return null;
  if (explicit !== undefined) {
    if (!profiles.has(explicit))
      throw new Error(`Unknown patina profile: ${explicit}`);
    return explicit;
  }
  for (const texture of [material.map, material.normalMap]) {
    const profile = texture?.userData.patinaProfile;
    if (profile === "none") return null;
    if (profile) {
      if (!profiles.has(profile))
        throw new Error(`Unknown texture patina profile: ${profile}`);
      return profile;
    }
  }
  const source =
    `${material.map?.image?.currentSrc ?? material.map?.image?.src ?? ""}`.toLowerCase();
  if (
    /foliage|leaf|grass|generated\/|references\/|botanical|etching|collotype|art-plate/.test(
      source,
    )
  )
    return null;
  if (/plaster|peeling.paint/.test(source)) return "plaster";
  if (/wood|cedar|timber/.test(source)) return "wood";
  if (/floor.tiles/.test(source)) return "terracotta";
  if (/clay|terracotta|planter.pot/.test(source)) return "clay";
  if (/stone|marble|boulder|rock|brick/.test(source)) return "stone";
  if (/mud|ground/.test(source)) return "earth";
  if (material.metalness >= 0.45 && !material.metalnessMap) return "metal";
  return null;
}

function seedFor(text) {
  let seed = 2166136261;
  for (const character of text)
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return ((seed >>> 0) / 4294967296) * 79;
}

const shaderLibrary = `
varying vec3 atlasPatinaPosition;
varying vec3 atlasPatinaNormal;
varying float atlasPatinaObjectSeed;
uniform float atlasPatinaStrength;
uniform float atlasPatinaSeed;
uniform float atlasPatinaFloor;
uniform vec2 atlasPatinaTileGrid;
uniform float atlasPatinaMicroStrength;

float atlasAgeHash(vec3 p) {
  p = fract(p * .1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float atlasAgeNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(
    mix(mix(atlasAgeHash(i), atlasAgeHash(i+vec3(1,0,0)),f.x),
        mix(atlasAgeHash(i+vec3(0,1,0)),atlasAgeHash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(atlasAgeHash(i+vec3(0,0,1)),atlasAgeHash(i+vec3(1,0,1)),f.x),
        mix(atlasAgeHash(i+vec3(0,1,1)),atlasAgeHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float atlasAgeField(vec3 p) {
  return atlasAgeNoise(p)*.61 + atlasAgeNoise(p*2.13+7.7)*.27 + atlasAgeNoise(p*4.37+19.1)*.12;
}
vec3 atlasReliefNormal(vec3 surfacePosition, vec3 surfaceNormal, float relief) {
  vec3 dx=dFdx(surfacePosition),dy=dFdy(surfacePosition);
  vec3 r1=cross(dy,surfaceNormal),r2=cross(surfaceNormal,dx);
  float determinant=dot(dx,r1);
  vec3 gradient=sign(determinant)*(dFdx(relief)*r1+dFdy(relief)*r2);
  return normalize(max(abs(determinant),1e-8)*surfaceNormal-gradient);
}
`;

const commonMasks = `
vec3 atlasP=atlasPatinaPosition+vec3(atlasPatinaSeed,0.0,atlasPatinaSeed*.731);
vec3 atlasN=normalize(atlasPatinaNormal);
vec3 atlasAbsN=abs(atlasN);
float atlasUp=smoothstep(.45,.88,atlasN.y);
vec2 atlasUv=atlasAbsN.y>=max(atlasAbsN.x,atlasAbsN.z)?atlasP.xz:
  (atlasAbsN.x>atlasAbsN.z?atlasP.zy:atlasP.xy);
float atlasHeight=atlasPatinaPosition.y-atlasPatinaFloor;
float atlasLow=(1.0-smoothstep(.08,.88,max(0.0,atlasHeight)))*smoothstep(-.3,.02,atlasHeight);
float atlasBroad=atlasAgeField(atlasP*.53);
float atlasPatch=smoothstep(.50,.70,atlasAgeField(atlasP*1.45+3.4));
float atlasDrip=smoothstep(.58,.78,atlasAgeField(vec3(atlasUv.x*5.7,atlasUv.y*.26,atlasPatinaSeed)));
float atlasFine=atlasAgeNoise(atlasP*43.0);
float atlasSoil=(1.0-atlasUp)*atlasLow*(.35+.65*atlasPatch)+atlasPatch*.22;
float atlasWear=0.0;
float atlasCrack=0.0;
float atlasFlake=0.0;
float atlasRelief=0.0;
float atlasOxide=0.0;
float atlasPolish=0.0;
float atlasComponent=fract(atlasPatinaObjectSeed+atlasPatinaSeed*.017)-.5;
`;

const mineralMasks = `
vec2 atlasCell=floor(atlasUv*.56),atlasLocal=fract(atlasUv*.56)-.5;
float atlasAngle=atlasAgeHash(vec3(atlasCell,atlasPatinaSeed))*6.283185;
vec2 atlasDirection=vec2(cos(atlasAngle),sin(atlasAngle));
vec2 atlasAcross=vec2(-atlasDirection.y,atlasDirection.x);
float atlasAlong=dot(atlasLocal,atlasDirection);
float atlasJagged=(atlasAgeNoise(vec3(atlasAlong*28.0,atlasCell))-.5)*.025+
  (atlasAgeNoise(vec3(atlasAlong*91.0,atlasCell+9.0))-.5)*.005;
float atlasDistance=abs(dot(atlasLocal,atlasAcross)-atlasJagged);
float atlasAntialias=max(fwidth(atlasDistance),.0008);
float atlasTrace=(1.0-smoothstep(.0009,.0009+atlasAntialias,atlasDistance))*
  (1.0-smoothstep(.18,.38,abs(atlasAlong)));
vec2 atlasBranch=mat2(.72,-.69,.69,.72)*atlasDirection;
float atlasBranchAlong=dot(atlasLocal-atlasDirection*.02,atlasBranch);
float atlasBranchDistance=abs(dot(atlasLocal-atlasDirection*.02,vec2(-atlasBranch.y,atlasBranch.x))+
  (atlasAgeNoise(vec3(atlasBranchAlong*43.0,atlasCell+3.0))-.5)*.010);
atlasTrace=max(atlasTrace,(1.0-smoothstep(.0007,.0007+max(fwidth(atlasBranchDistance),.0008),atlasBranchDistance))*
  smoothstep(0.0,.025,atlasBranchAlong)*(1.0-smoothstep(.10,.21,atlasBranchAlong)));
atlasCrack=atlasTrace*step(.63,atlasAgeHash(vec3(atlasCell,17.0)))*
  smoothstep(.43,.64,atlasAgeField(atlasP*.73+27.0));
atlasFlake=smoothstep(.63,.77,atlasAgeField(atlasP*8.6))*
  smoothstep(.48,.66,atlasAgeField(atlasP*.91+5.0));
`;

const treatments = {
  plaster: `${mineralMasks}
    atlasSoil += atlasDrip*(.16+.35*atlasLow);
    float atlasGrainVisibility=1.0-smoothstep(.003,.018,max(length(dFdx(atlasP)),length(dFdy(atlasP))));
    float atlasPlasterGrain=atlasAgeNoise(atlasP*190.0)-.5;
    diffuseColor.rgb *= 1.0+((atlasBroad-.52)*.60+atlasPlasterGrain*atlasPatinaMicroStrength*atlasGrainVisibility)*atlasPatinaStrength;
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.54,.49,.42),clamp(atlasSoil*.55,0.0,.5)*atlasPatinaStrength);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.37,.31,.23),atlasFlake*.62*atlasPatinaStrength);
    diffuseColor.rgb*=1.0-atlasCrack*.48*atlasPatinaStrength;
    atlasRelief=(-atlasCrack*.0015-atlasFlake*.0024+atlasPlasterGrain*.00045*atlasGrainVisibility)*atlasPatinaStrength;
  `,
  stone: `${mineralMasks}
    atlasCrack*=smoothstep(.08,.35,atlasComponent);
    atlasWear=atlasPatch*atlasUp;
    diffuseColor.rgb*=1.0+(atlasBroad-.5)*.35*atlasPatinaStrength;
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.60,.55,.46),atlasSoil*.38*atlasPatinaStrength);
    diffuseColor.rgb*=1.0-atlasCrack*.30*atlasPatinaStrength;
    atlasRelief=(-atlasCrack*.0011-atlasFlake*.0007)*atlasPatinaStrength;
    atlasPolish=atlasWear*.09;
  `,
  tile: `${mineralMasks}
    atlasCrack*=smoothstep(.02,.34,atlasComponent);
    diffuseColor.rgb*=1.0+(atlasBroad-.5)*.25*atlasPatinaStrength;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.31,.25,.17),atlasFlake*.45*atlasPatinaStrength);
    diffuseColor.rgb*=1.0-atlasCrack*.36*atlasPatinaStrength;
    atlasRelief=(-atlasCrack*.0008-atlasFlake*.0014)*atlasPatinaStrength;
    atlasPolish=atlasUp*atlasPatch*.12;
  `,
  terracotta: `${mineralMasks}
    #ifdef USE_MAP
      vec2 atlasTilePosition=vMapUv*atlasPatinaTileGrid;
      vec2 atlasTileCell=floor(atlasTilePosition), atlasTileLocal=fract(atlasTilePosition);
      float atlasTileTone=atlasAgeHash(vec3(atlasTileCell,atlasPatinaSeed));
      float atlasTileInside=smoothstep(.025,.09,min(min(atlasTileLocal.x,1.0-atlasTileLocal.x),
        min(atlasTileLocal.y,1.0-atlasTileLocal.y)));
      diffuseColor.rgb*=1.0+(atlasTileTone-.5)*.38*atlasTileInside*atlasPatinaStrength;
      atlasCrack*=step(.88,atlasAgeHash(vec3(atlasTileCell,atlasPatinaSeed+11.0)));
      atlasWear=atlasTileInside*atlasPatch*.35;
    #endif
    diffuseColor.rgb*=1.0+(atlasBroad-.5)*.22*atlasPatinaStrength;
    diffuseColor.rgb*=1.0-(atlasSoil*.20+atlasCrack*.32)*atlasPatinaStrength;
    atlasRelief=-atlasCrack*.0008*atlasPatinaStrength;
    atlasPolish=atlasUp*atlasPatch*.09;
  `,
  clay: `
    float atlasSlip=atlasAgeField(atlasP*7.3);
    diffuseColor.rgb*=1.0+(atlasBroad-.5)*.28*atlasPatinaStrength;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.52,.43,.30),smoothstep(.59,.74,atlasSlip)*.28*atlasPatinaStrength);
    diffuseColor.rgb*=1.0-atlasSoil*.22*atlasPatinaStrength;
    atlasRelief=(atlasFine-.5)*.00028*atlasPatinaStrength;
    atlasWear=atlasPatch*.3;
  `,
  wood: `
    float atlasGrain=atlasAgeNoise(vec3(atlasUv.x*185.0,atlasUv.y*.8,atlasPatinaSeed));
    float atlasScratch=smoothstep(.73,.89,atlasGrain)*atlasPatch;
    vec2 atlasRingCell=floor(atlasUv*1.7),atlasRingUv=fract(atlasUv*1.7)-.5;
    float atlasRingRadius=.065+atlasAgeHash(vec3(atlasRingCell,2.0))*.035;
    float atlasRing=1.0-smoothstep(.005,.012,abs(length(atlasRingUv)-atlasRingRadius));
    atlasRing*=step(.86,atlasAgeHash(vec3(atlasRingCell,4.0)))*atlasUp*
      smoothstep(.30,.48,atlasHeight)*(1.0-smoothstep(1.22,1.45,atlasHeight));
    diffuseColor.rgb*=1.0+(atlasBroad-.5)*.40*atlasPatinaStrength;
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.51,(atlasSoil*.38+atlasRing*.43)*atlasPatinaStrength);
    diffuseColor.rgb=mix(diffuseColor.rgb,min(diffuseColor.rgb*1.65+vec3(.032,.025,.012),vec3(.8)),atlasScratch*.35*atlasPatinaStrength);
    atlasRelief=-atlasScratch*.00045*atlasPatinaStrength;
    atlasWear=atlasScratch;
    atlasPolish=atlasPatch*atlasUp*.16;
  `,
  metal: `
    atlasOxide=smoothstep(.52,.71,atlasAgeField(atlasP*9.1))*smoothstep(.45,.66,atlasBroad);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.115,.065),atlasOxide*.70*atlasPatinaStrength);
    diffuseColor.rgb*=1.0+(atlasBroad-.5)*.18*atlasPatinaStrength;
    atlasRelief=atlasOxide*atlasFine*.00025*atlasPatinaStrength;
    atlasWear=atlasOxide;
    atlasPolish=(1.0-atlasPatch)*.05;
  `,
  fabric: `
    atlasWear=smoothstep(.47,.68,atlasBroad);
    diffuseColor.rgb=mix(diffuseColor.rgb,min(diffuseColor.rgb*1.24+vec3(.025,.018,.010),vec3(.88)),atlasWear*.45*atlasPatinaStrength);
    diffuseColor.rgb*=1.0-atlasPatch*.16*atlasPatinaStrength;
  `,
  leather: `
    atlasWear=smoothstep(.48,.67,atlasBroad)*(.4+.6*atlasUp);
    float atlasScuff=smoothstep(.64,.81,atlasAgeField(atlasP*34.0))*atlasWear;
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.5+vec3(.035,.020,.008),atlasWear*.5*atlasPatinaStrength);
    diffuseColor.rgb*=1.0-atlasScuff*.28*atlasPatinaStrength;
    atlasRelief=-atlasScuff*.00025*atlasPatinaStrength;
    atlasPolish=atlasWear*.16;
  `,
  earth: `
    float atlasMoisture=smoothstep(.42,.64,atlasBroad);
    diffuseColor.rgb*=mix(1.14,.62,atlasMoisture)*atlasPatinaStrength+(1.0-atlasPatinaStrength);
    atlasWear=atlasMoisture;
    atlasPolish=atlasMoisture*.15;
  `,
};

/** Shared by interiors and outdoors; keeps masks in metres, not stretched mesh UVs. */
export function applySurfacePatina(group, definition, views = {}) {
  const materials = new Set();
  group.updateMatrixWorld(true);
  group.traverse((object) => {
    if (!object.isMesh) return;
    const surfaces = Array.isArray(object.material)
      ? object.material
      : [object.material];
    if (
      surfaces.some((material) => surfacePatinaProfile(material)) &&
      !object.geometry.getAttribute("atlasObjectSeed")
    )
      stampSurfaceVariation(object.geometry, object.matrixWorld);
    for (const material of surfaces) materials.add(material);
  });
  const strength = { value: definition.environment === "outdoor" ? 1 : 0.82 };
  const floor = (Object.values(views)[0]?.position?.[1] ?? 1.62) - 1.62;
  const byProfile = {};
  let changed = 0;
  for (const material of materials) {
    const profile = surfacePatinaProfile(material);
    if (!profile) continue;
    const compile = material.onBeforeCompile;
    const cacheKey = material.customProgramCacheKey();
    const seed = seedFor(
      `${definition.id}/${profile}/${material.name}/${material.color.getHex()}`,
    );
    const tiled = profile === "terracotta";
    const scatter =
      tiled ||
      [material.map, material.normalMap, material.roughnessMap].some(
        canScatterSurfaceMap,
      );
    const componentVariation = ["stone", "tile", "clay"].includes(profile)
      ? 0.3
      : profile === "wood"
        ? 0.23
        : 0.12;
    material.onBeforeCompile = (shader, renderer) => {
      compile.call(material, shader, renderer);
      shader.uniforms.atlasPatinaStrength = strength;
      shader.uniforms.atlasPatinaSeed = { value: seed };
      shader.uniforms.atlasPatinaFloor = { value: floor };
      shader.uniforms.atlasPatinaTileGrid = {
        value: material.map?.userData.tileGrid ?? [9, 9],
      };
      shader.uniforms.atlasPatinaMicroStrength = {
        value: material.map ? 0.05 : 0.18,
      };
      shader.vertexShader =
        "attribute float atlasObjectSeed;\nvarying float atlasPatinaObjectSeed;\nvarying vec3 atlasPatinaPosition;\nvarying vec3 atlasPatinaNormal;\n" +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `
        #include <project_vertex>
        vec4 atlasWorld=vec4(transformed,1.0);
        #ifdef USE_BATCHING
          atlasWorld=batchingMatrix*atlasWorld;
        #endif
        #ifdef USE_INSTANCING
          atlasWorld=instanceMatrix*atlasWorld;
        #endif
        atlasPatinaPosition=(modelMatrix*atlasWorld).xyz;
        atlasPatinaNormal=inverseTransformDirection(transformedNormal,viewMatrix);
        atlasPatinaObjectSeed=atlasObjectSeed;
        #ifdef USE_INSTANCING
          vec3 atlasInstance=instanceMatrix[3].xyz;
          atlasPatinaObjectSeed=fract(sin(dot(atlasInstance,vec3(12.9898,78.233,37.719)))*43758.5453);
        #endif
      `,
      );
      shader.fragmentShader =
        shaderLibrary +
        (tiled ? tileSampling : scatter ? scatteredSampling : "") +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>\n${commonMasks}
        diffuseColor.rgb*=1.0+atlasComponent*${componentVariation.toFixed(2)}*atlasPatinaStrength;
        ${treatments[profile]}`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        `
        #include <roughnessmap_fragment>
        if(atlasPatinaStrength>0.0)
          roughnessFactor=clamp(roughnessFactor+(atlasSoil*.16+atlasWear*.13-atlasPolish+atlasComponent*.08)*atlasPatinaStrength,.08,1.0);
      `,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <metalnessmap_fragment>",
        `
        #include <metalnessmap_fragment>
        metalnessFactor*=1.0-atlasOxide*.75*atlasPatinaStrength;
      `,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `
        #include <normal_fragment_maps>
        if(atlasPatinaStrength>0.0) normal=atlasReliefNormal(-vViewPosition,normal,atlasRelief);
      `,
      );
      if (scatter) scatterSurfaceSampling(shader, material, { tiled });
    };
    material.customProgramCacheKey = () =>
      `${cacheKey}/atlas-surface-patina-v4/${profile}/${scatter}`;
    material.needsUpdate = true;
    byProfile[profile] = (byProfile[profile] ?? 0) + 1;
    changed++;
  }
  return {
    stats: { materials: changed, profiles: byProfile },
    setStrength(value) {
      if (!Number.isFinite(value) || value < 0 || value > 1)
        throw new Error("Patina strength must be between 0 and 1.");
      strength.value = value;
    },
  };
}
