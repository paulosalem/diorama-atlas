import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { WATER_FLOW_GLSL } from "../shared/water-flow.js";

/** A planar reflection with water's angle-dependent reflectance, not a mirror. */
export function createOutdoorWater({ width, depth, color }) {
  const shader = {
    name: "OutdoorWater",
    uniforms: {
      ...THREE.UniformsLib.fog,
      color: { value: null },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      waterTime: { value: 0 },
      // Open sea needs metre-scale waves that remain resolved from a terrace;
      // narrow channels and paddies retain the smaller, sheltered flow.
      waterScale: {
        value: THREE.MathUtils.clamp(Math.min(width, depth) / 80, 1, 24),
      },
    },
    vertexShader: `
      uniform mat4 textureMatrix;
      varying vec4 mirrorUv;
      varying vec3 waterPosition;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      #include <fog_pars_vertex>
      void main() {
        mirrorUv = textureMatrix * vec4(position, 1.0);
        waterPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <logdepthbuf_vertex>
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 color;
      uniform sampler2D tDiffuse;
      uniform float waterTime;
      uniform float waterScale;
      varying vec4 mirrorUv;
      varying vec3 waterPosition;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      #include <fog_pars_fragment>
      ${WATER_FLOW_GLSL}
      void main() {
        #include <logdepthbuf_fragment>
        vec3 viewDirection = normalize(cameraPosition - waterPosition);
        vec2 flowPosition = waterPosition.xz / waterScale;
        vec3 flow = waterSurface(flowPosition, waterTime * inversesqrt(waterScale),
          waterFootprint(flowPosition));
        vec3 waterNormal = normalize(vec3(-flow.y, 1.0, -flow.z));
        // Project the world-space slope through this capture's camera, rather
        // than making every reflection wobble along the same two screen axes.
        vec2 distortion = (viewMatrix * vec4(waterNormal - vec3(0.0, 1.0, 0.0), 0.0)).xy;
        vec4 uv = mirrorUv;
        uv.xy += distortion * .18 * uv.w;
        vec3 reflection = texture2DProj(tDiffuse, uv).rgb;
        float fresnel = waterFresnel(viewDirection, waterNormal);
        vec3 water = color * .8;
        gl_FragColor = vec4(mix(water, reflection, fresnel), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  };
  const surface = new Reflector(new THREE.PlaneGeometry(width, depth), {
    textureWidth: 768,
    textureHeight: 768,
    color,
    clipBias: 0.003,
    shader,
  });
  surface.material.fog = true;
  surface.rotation.x = -Math.PI / 2;
  const reflect = surface.onBeforeRender;
  surface.onBeforeRender = (renderer, scene, camera) => {
    if (!scene.overrideMaterial) reflect.call(surface, renderer, scene, camera);
  };
  return surface;
}
