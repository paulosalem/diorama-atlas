import * as THREE from "three";

export function addSteamPlume(
  k,
  { position, height = 0.8, width = 0.4, count = 24 },
) {
  return addAtmosphericParticles(k, {
    position,
    spread: [width * 0.15, height, width * 0.13],
    count,
    steam: true,
    sizeMultiplier: width * 10,
    maximumSize: 256,
    opacity: 0.01,
    blending: THREE.AdditiveBlending,
  });
}

export function addAtmosphericParticles(
  k,
  {
    position,
    spread,
    count = 24,
    steam = false,
    sizeMultiplier = 1,
    maximumSize = 28,
    opacity = steam ? 0.065 : 0.11,
    blending = THREE.NormalBlending,
  },
) {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    vertices.set(
      [k.range(-spread[0], spread[0]), 0, k.range(-spread[2], spread[2])],
      i * 3,
    );
    phases[i] = k.random();
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
  const time = { value: 0 };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending,
    uniforms: {
      time,
      steam: { value: steam ? 1 : 0 },
      height: { value: spread[1] },
      sizeMultiplier: { value: sizeMultiplier },
      maximumSize: { value: maximumSize },
      opacity: { value: opacity },
    },
    vertexShader: `
      uniform float time;
      uniform float steam;
      uniform float height;
      uniform float sizeMultiplier;
      uniform float maximumSize;
      attribute float phase;
      varying float fade;
      void main() {
        float age = fract(phase + time * (steam > .5 ? .16 : .014));
        vec3 p = position;
        p.y = age * height;
        p.x += sin(phase * 13. + time * .4) * age * (steam > .5 ? .028 : .07);
        fade = sin(age * 3.14159);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_PointSize = clamp(sizeMultiplier * (steam > .5 ? 30. + age * 55. : 5.) / max(.2, -mv.z), 1., maximumSize);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float opacity;
      varying float fade;
      void main() {
        float falloff = pow(max(0., 1. - length(gl_PointCoord - .5) * 2.), 2.);
        gl_FragColor = vec4(1., .97, .9, falloff * fade * opacity);
      }`,
  });
  k.ownMaterial(material);
  k.ownGeometry(geometry);
  const points = new THREE.Points(geometry, material);
  points.name = steam ? "Gentle steam" : "Sparse window dust";
  points.position.set(...position);
  points.frustumCulled = false;
  k.group.add(points);
  k.animated.add(points);
  k.animations.push((_, elapsed) => {
    time.value = elapsed;
  });
  return points;
}
