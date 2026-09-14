import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import {
  WATER_FLOW_GLSL,
  configureWaterMaterial,
} from "../shared/water-flow.js";

/** Animated details are separate from the static architecture batches. */
export function addRiadAtmosphere({
  group,
  m,
  detail,
  animations,
  dynamic,
  geometries,
  object,
  subgroup,
  rod,
  torus,
  rand,
  range,
}) {
  const owned = [];
  const time = { value: 0 };
  animations.push((_, t) => {
    time.value = t;
  });
  const leafCompile = (shader) => {
    shader.uniforms.breezeTime = time;
    shader.vertexShader = "uniform float breezeTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      float phase=0.;
      #ifdef USE_INSTANCING
        phase=instanceMatrix[3].x*5.+instanceMatrix[3].y*2.;
      #endif
      transformed.z += sin(breezeTime*1.35+phase+position.y*9.)*.012*(position.y+.12);`,
    );
  };
  m.leaf.onBeforeCompile = leafCompile;
  m.leaf.customProgramCacheKey = () => "riad-citrus-breeze";
  // Heavy linen: gathered at the waist, full pleats at the hem, fixed at the rod.
  for (const [x, z, angle] of [
    [-3.76, -4.55, 0],
    [3.8, -4.55, 0],
  ]) {
    const g = subgroup([x, 3.67, z], angle);
    rod([-0.59, 0.07, 0], [0.59, 0.07, 0], 0.017, m.bronze, g);
    const geo = new THREE.PlaneGeometry(1.06, 3.4, 36, 70);
    geometries.add(geo);
    const pos = geo.attributes.position,
      original = pos.array.slice();
    function shape(t) {
      for (let i = 0; i < pos.count; i++) {
        const u = original[i * 3],
          v = Math.max(0, 1.7 - original[i * 3 + 1]),
          waist = Math.exp(-(((v - 2.13) / 0.43) ** 2));
        const x = u * (1 - 0.62 * waist) + 0.12 * waist;
        const wave =
          Math.sin(u * 37) * (0.036 + 0.018 * v) +
          Math.sin(u * 19 + v * 0.8) * 0.017;
        pos.setXYZ(
          i,
          x,
          -v,
          wave +
            0.035 * Math.sin(t * 0.72 + v * 1.2 + u * 3) * (v / 3.4) ** 1.5,
        );
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }
    shape(0);
    const cloth = object(geo, detail.linen, [0, 0, 0.025], [0, 0, 0], g);
    dynamic.add(cloth);
    animations.push((_, t) => shape(t));
    for (let u = -0.45; u < 0.5; u += 0.1)
      torus(0.025, 0.006, [u, 0.008, 0], m.bronze, [0, Math.PI / 2, 0], g);
    torus(0.185, 0.012, [0.12, -2.13, 0.015], m.brass, [Math.PI / 2, 0, 0], g);
  }
  // A casually draped, weighted throw over the gallery rail.
  const throwGeo = new THREE.PlaneGeometry(1.02, 1.38, 28, 44);
  geometries.add(throwGeo);
  const tp = throwGeo.attributes.position,
    tb = tp.array.slice();
  const throwMesh = object(
    throwGeo,
    detail.cushions[1],
    [-4.29, 5.67, 0.7],
    [0, Math.PI / 2, 0],
  );
  dynamic.add(throwMesh);
  animations.push((_, t) => {
    for (let i = 0; i < tp.count; i++) {
      const x = tb[i * 3],
        v = tb[i * 3 + 1] + 0.69;
      tp.setXYZ(
        i,
        x,
        -v,
        Math.sin(x * 22) * 0.035 +
          0.06 * Math.sin(v * 2.4) +
          0.009 * v * Math.sin(t * 0.9 + x * 7),
      );
    }
    tp.needsUpdate = true;
    throwGeo.computeVertexNormals();
  });
  const waterTime = m.water.userData.time;
  const disturbance = m.water.userData.disturbance;
  disturbance.value.set(0, -0.35, 0.45, 1);
  // Material.clone does not copy shader hooks. The lower basin must share the
  // upper surface's flow and clock, without taking ownership of either material.
  group.traverse((object) => {
    const material = object.material;
    if (material && material !== m.water && material.userData.time)
      configureWaterMaterial(material, { time: waterTime, disturbance });
  });
  // The planar capture and physical water use the very same surface slopes.
  const shader = {
    uniforms: {
      ...THREE.UniformsLib.fog,
      color: { value: null },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      time: waterTime,
      waterDisturbance: disturbance,
    },
    vertexShader: `
      uniform mat4 textureMatrix;
      varying vec4 mirrorUv;
      varying vec3 waterWorld;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      #include <fog_pars_vertex>
      void main() {
        mirrorUv = textureMatrix * vec4(position, 1.0);
        waterWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <logdepthbuf_vertex>
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float time;
      uniform vec4 waterDisturbance;
      varying vec4 mirrorUv;
      varying vec3 waterWorld;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      #include <fog_pars_fragment>
      ${WATER_FLOW_GLSL}
      void main() {
        #include <logdepthbuf_fragment>
        float footprint = waterFootprint(waterWorld.xz);
        vec3 flow = waterSurface(waterWorld.xz, time, footprint) * .72
          + waterImpact(waterWorld.xz, time, footprint, waterDisturbance);
        vec3 normal = normalize(vec3(-flow.y, 1.0, -flow.z));
        vec2 distortion = (viewMatrix * vec4(normal - vec3(0.0, 1.0, 0.0), 0.0)).xy;
        vec4 uv = mirrorUv;
        uv.xy += distortion * .10 * uv.w;
        vec3 reflected = texture2DProj(tDiffuse, uv).rgb;
        float fresnel = waterFresnel(normalize(cameraPosition - waterWorld), normal);
        gl_FragColor = vec4(reflected * vec3(.97, .99, .98), .12 + .88 * fresnel);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
      }`,
  };
  const mirror = new Reflector(new THREE.CircleGeometry(1.2, 8), {
    textureWidth: 512,
    textureHeight: 512,
    clipBias: 0.003,
    multisample: 0,
    shader,
  });
  mirror.rotation.set(-Math.PI / 2, 0, Math.PI / 8);
  mirror.position.set(0, 0.156, -0.35);
  mirror.material.uniforms.time = waterTime;
  mirror.material.uniforms.waterDisturbance = disturbance;
  mirror.material.fog = true;
  mirror.material.transparent = true;
  mirror.material.depthWrite = false;
  mirror.renderOrder = 2;
  group.add(mirror);
  dynamic.add(mirror);
  geometries.add(mirror.geometry);
  const originalReflection = mirror.onBeforeRender;
  mirror.onBeforeRender = function (renderer, scene, camera, ...args) {
    // Auxiliary normal/depth and cube-map passes must not recursively render mirrors.
    if (
      scene.overrideMaterial ||
      !camera.isPerspectiveCamera ||
      camera.fov === 90
    )
      return;
    originalReflection.call(this, renderer, scene, camera, ...args);
  };
  // Very soft caustics on the submerged basin floor, not a texture on the water.
  const causticMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      time: waterTime,
      waterDisturbance: disturbance,
    },
    vertexShader: `
      varying vec2 p;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        p = (modelMatrix * vec4(position, 1.0)).xz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float time;
      uniform vec4 waterDisturbance;
      varying vec2 p;
      #include <common>
      #include <fog_pars_fragment>
      ${WATER_FLOW_GLSL}
      void main() {
        float footprint = waterFootprint(p);
        vec3 flow = waterSurface(p, time, footprint) * .72
          + waterImpact(p, time, footprint, waterDisturbance);
        // Screen derivatives recover the surface curvature, so light gathers
        // beneath the same moving hollows instead of an unrelated sine grid.
        vec2 px = dFdx(p), py = dFdy(p);
        vec2 sx = dFdx(flow.yz), sy = dFdy(flow.yz);
        float determinant = px.x * py.y - px.y * py.x;
        float curvature = (sx.x * py.y - sy.x * px.y
          + sy.y * px.x - sx.y * py.x) / (abs(determinant) > 1e-10 ? determinant : 1e-10);
        float focus = smoothstep(.07, .4, -curvature);
        gl_FragColor = vec4(.64, .82, .48, focus * .045);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  owned.push(causticMat);
  const caustics = object(
    new THREE.CircleGeometry(1.12, 64),
    causticMat,
    [0, 0.091, -0.35],
    [-Math.PI / 2, 0, 0],
  );
  caustics.castShadow = false;
  dynamic.add(caustics);
  // Fine spill streams from the stone bowl into the lower basin.
  const streamMat = new THREE.MeshPhysicalMaterial({
    color: 0xb7d7cb,
    roughness: 0.08,
    metalness: 0.08,
    transparent: true,
    opacity: 0.46,
    clearcoat: 1,
  });
  owned.push(streamMat);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + 0.23;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 0.64, 0.827, Math.sin(a) * 0.64 - 0.35),
      new THREE.Vector3(Math.cos(a) * 0.705, 0.66, Math.sin(a) * 0.705 - 0.35),
      new THREE.Vector3(Math.cos(a) * 0.76, 0.16, Math.sin(a) * 0.76 - 0.35),
    ]);
    const mesh = object(
      new THREE.TubeGeometry(curve, 20, 0.0045, 5),
      streamMat,
    );
    mesh.castShadow = false;
    dynamic.add(mesh);
  }
  // Suspended dust is tiny and sparse. Steam rises only above the tea glasses.
  function motes(count, origin, spread, isSteam = false) {
    const geo = new THREE.BufferGeometry(),
      positions = new Float32Array(count * 3),
      phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions.set(
        [
          range(-spread[0], spread[0]),
          range(0, spread[1]),
          range(-spread[2], spread[2]),
        ],
        i * 3,
      );
      phase[i] = rand();
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("phase", new THREE.BufferAttribute(phase, 1));
    geometries.add(geo);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        time,
        steam: { value: isSteam ? 1 : 0 },
        height: { value: spread[1] },
      },
      vertexShader: `uniform float time;uniform float steam;uniform float height;attribute float phase;varying float fade;void main(){vec3 p=position;float age=fract(phase+time*(steam>.5?.14:.017));p.y=age*height;p.x+=sin(time*.3+phase*15.)*(steam>.5?.026:.12)*age;p.z+=cos(time*.4+phase*9.)*.018;fade=sin(age*3.14159);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp((steam>.5?65.:8.)/max(-mv.z,.2),1.,35.);gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform float steam;varying float fade;void main(){float r=length(gl_PointCoord-.5);float a=pow(max(0.,1.-r*2.),2.)*fade;gl_FragColor=vec4(vec3(1.,.94,.79),a*(steam>.5?.07:.11));}`,
    });
    owned.push(mat);
    const points = new THREE.Points(geo, mat);
    points.position.set(...origin);
    points.frustumCulled = false;
    group.add(points);
  }
  motes(110, [-0.6, 0.3, -0.8], [3.5, 6.5, 2.5]);
  motes(28, [-3.12, 0.56, 0.18], [0.05, 0.45, 0.04], true);
  // Sunlight is made visible only as a very faint shaft at the roof opening.
  const shaftMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader:
      "varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:
      "varying vec2 v;void main(){float edge=pow(sin(v.x*3.14159),3.);float falloff=sin(v.y*3.14159);gl_FragColor=vec4(.95,.75,.41,edge*falloff*.015);}",
  });
  owned.push(shaftMat);
  for (const x of [-1.8, 0.65]) {
    const geo = new THREE.PlaneGeometry(0.72, 6.8);
    geometries.add(geo);
    const beam = object(geo, shaftMat, [x, 4.4, -0.1], [-0.6, 0, -0.23]);
    beam.castShadow = false;
    dynamic.add(beam);
  }
  return {
    mirror,
    dispose() {
      mirror.dispose();
      owned.forEach((o) => o.dispose());
    },
  };
}
