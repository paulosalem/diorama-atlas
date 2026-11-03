import { WATER_FLOW_GLSL } from "/src/client/environments/shared/water-flow.js";

export function playcanvasPlanarWater(pc, app, camera, meshes, study) {
  const height = study.probePosition[1] - 0.5;
  const texture = new pc.Texture(app.graphicsDevice, {
    name: "River planar reflection",
    width: 768,
    height: 768,
    format: pc.PIXELFORMAT_RGBA16F,
    mipmaps: false,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: pc.ADDRESS_CLAMP_TO_EDGE,
  });
  const target = new pc.RenderTarget({ colorBuffer: texture, depth: true });
  const reflection = new pc.Entity("River reflection camera");
  reflection.addComponent("camera", {
    nearClip: 0.04,
    farClip: study.farClip,
    priority: -20,
    renderTarget: target,
    flipFaces: true,
  });
  reflection.camera.toneMapping = pc.TONEMAP_NONE;
  reflection.camera.gammaCorrection = pc.GAMMA_NONE;
  app.root.addChild(reflection);
  const mirrored = new pc.Mat4();
  const mirror = new pc.Mat4().setScale(1, -1, 1);
  mirror.data[13] = 2 * height;
  const view = new pc.Mat4();
  const projection = new pc.Mat4();
  const project = new pc.Mat4();
  const previous = new pc.Mat4();
  let previousTime = -1;
  reflection.camera.calculateTransform = (matrix) => matrix.copy(mirrored);
  reflection.camera.calculateProjection = (matrix) => matrix.copy(projection);
  const material = new pc.ShaderMaterial({
    uniqueName: "StudyRiver",
    attributes: { vertex_position: pc.SEMANTIC_POSITION },
    vertexGLSL: `
      attribute vec3 vertex_position;
      uniform mat4 matrix_model;
      uniform mat4 matrix_viewProjection;
      uniform mat4 studyReflectionMatrix;
      varying vec3 waterPosition;
      varying vec4 reflectionPosition;
      void main() {
        vec4 world = matrix_model * vec4(vertex_position, 1.0);
        waterPosition = world.xyz;
        reflectionPosition = studyReflectionMatrix * world;
        gl_Position = matrix_viewProjection * world;
      }
    `,
    fragmentGLSL: `
      uniform sampler2D studyReflection;
      uniform vec3 view_position;
      uniform vec3 studyFog;
      uniform float studyTime;
      uniform float studyFogDensity;
      varying vec3 waterPosition;
      varying vec4 reflectionPosition;
      ${WATER_FLOW_GLSL}
      void main() {
        vec2 position = waterPosition.xz / 1.8;
        vec3 flow = waterSurface(position, studyTime * inversesqrt(1.8), waterFootprint(position));
        vec3 normal = normalize(vec3(-flow.y, 1.0, -flow.z));
        vec3 direction = normalize(view_position - waterPosition);
        vec2 uv = reflectionPosition.xy / reflectionPosition.w * .5 + .5;
        uv += normal.xz * .012;
        vec3 reflected = texture2D(studyReflection, clamp(uv, .002, .998)).rgb;
        vec3 color = mix(vec3(.065, .13, .12), reflected, waterFresnel(direction, normal));
        float distance = length(view_position - waterPosition);
        float fog = 1.0 - exp(-studyFogDensity * studyFogDensity * distance * distance);
        gl_FragColor = vec4(mix(color, studyFog, fog), 1.0);
      }
    `,
  });
  material.setParameter("studyReflection", texture);
  material.setParameter("studyFog", study.fogColor);
  material.setParameter("studyFogDensity", study.fogDensity);
  material.setParameter("studyTime", 0);
  const originals = meshes.map((mesh) => mesh.material);
  meshes.forEach((mesh) => {
    mesh.material = material;
    mesh.castShadow = false;
  });
  const hide = (component) => {
    if (component === reflection.camera)
      meshes.forEach((mesh) => {
        mesh.visible = false;
      });
  };
  const show = (component) => {
    if (component === reflection.camera)
      meshes.forEach((mesh) => {
        mesh.visible = true;
      });
  };
  app.scene.on("prerender", hide);
  app.scene.on("postrender", show);
  function update(time) {
    mirrored.mul2(mirror, camera.getWorldTransform());
    view.invert(mirrored);
    projection.copy(camera.camera.projectionMatrix);
    // Clip geometry below the river at the mirror plane, in reflected view space.
    const worldPlane = new pc.Vec4(0, 1, 0, -height);
    const plane = mirrored.clone().transpose().transformVec4(worldPlane);
    const inverse = projection.clone().invert();
    const corner = inverse.transformVec4(
      new pc.Vec4(Math.sign(plane.x), Math.sign(plane.y), 1, 1),
    );
    const scale =
      2 /
      (plane.x * corner.x +
        plane.y * corner.y +
        plane.z * corner.z +
        plane.w * corner.w);
    const p = projection.data;
    p[2] = plane.x * scale - p[3];
    p[6] = plane.y * scale - p[7];
    p[10] = plane.z * scale - p[11];
    p[14] = plane.w * scale - p[15];
    project.mul2(projection, view);
    reflection.enabled = previousTime !== time || !previous.equals(project);
    previousTime = time;
    previous.copy(project);
    material.setParameter("studyReflectionMatrix", project.data);
    material.setParameter("studyTime", time);
  }
  update(0);
  return {
    update,
    dispose() {
      app.scene.off("prerender", hide);
      app.scene.off("postrender", show);
      meshes.forEach((mesh, index) => {
        mesh.material = originals[index];
      });
      reflection.destroy();
      target.destroy();
      texture.destroy();
      material.destroy();
    },
  };
}
