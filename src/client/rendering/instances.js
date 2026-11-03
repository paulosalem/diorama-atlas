export async function loadInstances(manifest) {
  if (!manifest.instanceGroups?.length) {
    if (manifest.instances) throw new Error("Instance groups are missing");
    return [];
  }
  const response = await fetch(`${manifest.study.assetRoot}instances.bin`);
  if (!response.ok)
    throw new Error(`Instance data unavailable (${response.status})`);
  const binary = await response.arrayBuffer();
  return decodeInstanceGroups(manifest, binary);
}

export function decodeInstanceGroups(manifest, binary) {
  if (binary.byteLength !== manifest.instanceBytes)
    throw new Error("Instance data is incomplete");
  let offset = 0;
  let instances = 0;
  const names = new Set();
  const groups = manifest.instanceGroups.map((group) => {
    if (
      typeof group.name !== "string" ||
      !group.name ||
      names.has(group.name) ||
      !Number.isSafeInteger(group.count) ||
      group.count < 1 ||
      group.matrixOffset !== offset ||
      group.colorOffset !== offset + group.count * 64 ||
      group.colorOffset + group.count * 16 > binary.byteLength ||
      !Array.isArray(group.boundsCenter) ||
      group.boundsCenter.length !== 3 ||
      !group.boundsCenter.every(Number.isFinite) ||
      !Array.isArray(group.boundsSize) ||
      group.boundsSize.length !== 3 ||
      !group.boundsSize.every((value) => Number.isFinite(value) && value >= 0)
    )
      throw new Error(`Invalid instance group: ${group.name}`);
    names.add(group.name);
    instances += group.count;
    offset += group.count * 80;
    return {
      ...group,
      matrices: new Float32Array(binary, group.matrixOffset, group.count * 16),
      colors: new Float32Array(binary, group.colorOffset, group.count * 4),
    };
  });
  if (instances !== manifest.instances || offset !== binary.byteLength)
    throw new Error("Instance counts do not match the binary");
  return groups;
}

export function babylonInstances(scene, groups) {
  for (const group of groups) {
    const mesh = scene.getMeshByName(group.name);
    if (!mesh) throw new Error(`Missing instance prototype: ${group.name}`);
    mesh.thinInstanceSetBuffer("matrix", group.matrices, 16, true);
    mesh.thinInstanceSetBuffer("color", group.colors, 4, true);
    mesh.thinInstanceRefreshBoundingInfo();
  }
}

export function playcanvasInstances(pc, app, root, groups) {
  const buffers = [];
  const materials = new Set();
  for (const group of groups) {
    const component = root.findByName(group.name)?.render;
    if (!component)
      throw new Error(`Missing instance prototype: ${group.name}`);
    const elements = pc.VertexFormat.getDefaultInstancingFormat(
      app.graphicsDevice,
    ).elements.map((element) => ({
      semantic: element.name,
      components: element.numComponents,
      type: element.dataType,
      normalize: element.normalize,
    }));
    elements.push({
      semantic: pc.SEMANTIC_TEXCOORD2,
      components: 4,
      type: pc.TYPE_FLOAT32,
    });
    const format = new pc.VertexFormat(app.graphicsDevice, elements);
    const data = new Float32Array(group.count * 20);
    for (let i = 0; i < group.count; i++) {
      data.set(group.matrices.subarray(i * 16, i * 16 + 16), i * 20);
      data.set(group.colors.subarray(i * 4, i * 4 + 4), i * 20 + 16);
    }
    const buffer = new pc.VertexBuffer(
      app.graphicsDevice,
      format,
      group.count,
      {
        usage: pc.BUFFER_STATIC,
        data: data.buffer,
      },
    );
    buffers.push(buffer);
    for (const mesh of component.meshInstances) {
      mesh.setInstancing(buffer, true);
      mesh.setCustomAabb(
        new pc.BoundingBox(
          new pc.Vec3(...group.boundsCenter),
          new pc.Vec3(...group.boundsSize).mulScalar(0.5),
        ),
      );
      materials.add(mesh.material);
    }
  }
  const defaults = pc.ShaderChunks.get(
    app.graphicsDevice,
    pc.SHADERLANGUAGE_GLSL,
  );
  for (const material of materials) {
    const chunks = material.shaderChunks.glsl;
    const transform = chunks.get("transformVS") ?? defaults.get("transformVS");
    chunks.set(
      "transformVS",
      `
      #ifdef INSTANCING
      attribute vec4 vertex_texCoord2;
      varying vec4 studyInstanceColor;
      #endif
      ${transform.replace(
        "dModelMatrix = getModelMatrix();",
        `
        #ifdef INSTANCING
        studyInstanceColor = vertex_texCoord2;
        #endif
        dModelMatrix = getModelMatrix();
      `,
      )}
    `,
    );
    const frontend =
      chunks.get("stdFrontEndPS") ?? defaults.get("stdFrontEndPS");
    chunks.set(
      "stdFrontEndPS",
      `
      #ifdef INSTANCING
      varying vec4 studyInstanceColor;
      #endif
      ${frontend.replace(
        /\n\t?}\s*$/,
        `
        #ifdef INSTANCING
        litArgs_albedo *= studyInstanceColor.rgb;
        litArgs_emission *= studyInstanceColor.rgb;
        #endif
      }`,
      )}
    `,
    );
    material.update();
  }
  return buffers;
}
