import * as THREE from "three";

/** Anchored world-space leaf motion, shared by visible and shadow passes. */
export function createFoliageWind(group) {
  const time = { value: 0 };
  const materials = new Map();
  const meshes = [];
  group.traverse((mesh) => {
    const material = mesh.material;
    const wind = material?.userData.nativeWind;
    if (!mesh.isMesh || !wind) return;
    if (!materials.has(material)) {
      const uniforms = {
        atlasWindTime: time,
        atlasWindAnchor: { value: new THREE.Vector2(...wind.anchor) },
      };
      function extend(previous) {
        return function (shader, renderer) {
          previous.call(this, shader, renderer);
          Object.assign(shader.uniforms, uniforms);
          shader.vertexShader = `uniform float atlasWindTime;\nuniform vec2 atlasWindAnchor;\n${shader.vertexShader}`;
          shader.vertexShader = shader.vertexShader.replace(
            "#include <project_vertex>",
            `
            #include <project_vertex>
            vec3 windPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
            #ifdef USE_INSTANCING
              windPosition = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
            #endif
            float windFlex = length(uv - atlasWindAnchor);
            float windBreeze = sin(atlasWindTime * .9 + windPosition.x * 1.3 + windPosition.z * .7)
              + .32 * sin(atlasWindTime * 1.7 + windPosition.y * 7.0 + windPosition.x * .8);
            vec3 windOffset = vec3(.021, 0.0, .014) * windBreeze * windFlex * windFlex;
            mvPosition.xyz += (viewMatrix * vec4(windOffset, 0.0)).xyz;
            gl_Position = projectionMatrix * mvPosition;
          `,
          );
        };
      }
      const previous = material.onBeforeCompile;
      const key = material.customProgramCacheKey;
      material.onBeforeCompile = extend(previous);
      material.customProgramCacheKey = () =>
        `${key.call(material)}/anchored-wind`;
      material.needsUpdate = true;
      const depth = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        map: material.map,
        alphaTest: material.alphaTest,
        side: THREE.DoubleSide,
      });
      depth.onBeforeCompile = extend(depth.onBeforeCompile);
      depth.customProgramCacheKey = () => "anchored-wind-depth";
      materials.set(material, { depth, previous, key });
    }
    meshes.push({ mesh, previous: mesh.customDepthMaterial });
    mesh.customDepthMaterial = materials.get(material).depth;
  });
  return {
    count: materials.size,
    update(value) {
      time.value = value;
    },
    dispose() {
      for (const { mesh, previous } of meshes)
        mesh.customDepthMaterial = previous;
      for (const [material, { depth, previous, key }] of materials) {
        depth.dispose();
        material.onBeforeCompile = previous;
        material.customProgramCacheKey = key;
      }
    },
  };
}
