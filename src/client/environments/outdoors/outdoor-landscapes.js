import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createOutdoorKit, outdoorView } from "./outdoor-kit.js";
import { WATER_FLOW_GLSL } from "../shared/water-flow.js";

const TAU = Math.PI * 2;

function seedFor(definition, salt) {
  let seed = salt;
  for (const letter of definition.id)
    seed = (Math.imul(seed, 31) + letter.charCodeAt(0)) | 0;
  return seed >>> 0;
}

function geometryFrom(position, indices, uv) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(position, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A sampled strip follows the land instead of covering it with rectangular slabs. */
function landStrip(edgeA, edgeB, start = -70, end = 70, samples = 160) {
  const positions = [],
    indices = [],
    uv = [];
  for (let i = 0; i <= samples; i++) {
    const x = start + ((end - start) * i) / samples;
    for (const edge of [edgeA, edgeB]) {
      const [y, z] = edge(x);
      positions.push(x, y, z);
      uv.push(x / 2, z / 2);
    }
    if (i < samples) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  return geometryFrom(positions, indices, uv);
}

function planarWaterGeometry(geometry, height) {
  const flat = geometry.clone(),
    p = flat.attributes.position;
  for (let i = 0; i < p.count; i++)
    p.setXYZ(i, p.getX(i), -p.getZ(i), p.getY(i) - height);
  flat.computeVertexNormals();
  return flat;
}

function batch(
  k,
  geometry,
  material,
  entries,
  { shadow = true, parent = k.group } = {},
) {
  if (!entries.length) return null;
  k.geometries.add(geometry);
  const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
  const transform = new THREE.Object3D(),
    color = new THREE.Color();
  entries.forEach((entry, i) => {
    if (entry.matrix) mesh.setMatrixAt(i, entry.matrix);
    else {
      transform.position.set(...entry.position);
      transform.rotation.set(...(entry.rotation ?? [0, 0, 0]));
      transform.scale.set(...(entry.scale ?? [1, 1, 1]));
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    }
    if (entry.color !== undefined) mesh.setColorAt(i, color.set(entry.color));
  });
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  parent.add(mesh);
  return mesh;
}

function tintedScan(k, source, color, roughness = 0.92) {
  const mat = k.material(color, roughness);
  for (const property of ["map", "normalMap", "roughnessMap", "bumpMap"])
    mat[property] = source[property];
  mat.normalScale.copy(source.normalScale);
  mat.userData.metresPerRepeat = source.userData.metresPerRepeat;
  return mat;
}

function leafGeometry(width = 0.042, height = 0.85, bend = 0.24, segments = 5) {
  const positions = [],
    uv = [],
    indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const w = width * (1 - t) * (0.72 + Math.sin(t * Math.PI) * 0.55);
    for (const side of [-1, 1]) {
      positions.push((side * w) / 2, t * height, bend * t * t);
      uv.push((side + 1) / 2, t);
    }
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2);
      if (i < segments - 1) indices.push(a + 1, a + 3, a + 2);
    }
  }
  return geometryFrom(positions, indices, uv);
}

function riceBladeGeometry(habit) {
  const position = [],
    uv = [],
    indices = [],
    segments = 7;
  const droop = [0, 0.22, 0.45][habit],
    reach = [0.19, 0.36, 0.53][habit];
  for (let row = 0; row <= segments; row++) {
    const t = row / segments;
    const width =
      0.024 * (1 - t) * (0.16 + 1.18 * Math.sin(Math.PI * t) ** 0.6);
    const twist = t * t * [0.1, -0.2, 0.28][habit];
    for (const side of [-1, 0, 1]) {
      const x = (side * width) / 2;
      position.push(
        x * Math.cos(twist),
        t - droop * t ** 4,
        reach * t * t +
          x * Math.sin(twist) +
          (1 - Math.abs(side)) * 0.0014 * Math.sin(Math.PI * t),
      );
      uv.push((side + 1) / 2, t);
    }
    if (row < segments)
      for (let column = 0; column < 2; column++) {
        const a = row * 3 + column;
        indices.push(a, a + 1, a + 3);
        if (row < segments - 1) indices.push(a + 1, a + 4, a + 3);
      }
  }
  return geometryFrom(position, indices, uv);
}

function photographicLeafGeometry(width, height, habit = 0) {
  const position = [],
    uv = [],
    indices = [],
    segments = 12,
    across = 4;
  const [u0, v0, u1, v1] = [0.038, 0.13, 0.469, 0.903];
  for (let row = 0; row <= segments; row++) {
    const t = row / segments,
      halfWidth =
        (Math.min(1, 1.4 * Math.sin(Math.PI * t) ** 0.75) * width) / 2;
    for (let column = 0; column <= across; column++) {
      const side = (column / across) * 2 - 1,
        x = side * halfWidth;
      const bow = [
        0.035 * t * t,
        0.026 * Math.sin(t * Math.PI * 0.75),
        0.018 * t * t + 0.01 * Math.sin(Math.PI * t),
      ][habit];
      const cup = [0.008, -0.005, 0.013][habit],
        twist = [0.005, -0.009, 0.003][habit];
      position.push(
        x,
        height * t,
        bow +
          (1 - side * side) * cup * Math.sin(Math.PI * t) +
          side * twist * Math.sin(t * Math.PI * 1.6),
      );
      // Physical-width UVs retain the photographed silhouette instead of stretching every row.
      uv.push(u0 + (x / width + 0.5) * (u1 - u0), v0 + t * (v1 - v0));
    }
    if (row < segments)
      for (let col = 0; col < across; col++) {
        const a = row * (across + 1) + col,
          b = a + across + 1;
        if (row > 0) indices.push(a, a + 1, b);
        if (row < segments - 1) indices.push(a + 1, b + 1, b);
      }
  }
  return geometryFrom(position, indices, uv);
}

function ricePanicleGeometry() {
  const parts = [],
    grain = new THREE.SphereGeometry(1, 6, 4);
  const rachis = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.012, 0.09, 0.003),
    new THREE.Vector3(0.055, 0.16, 0.006),
    new THREE.Vector3(0.105, 0.13, 0.012),
  ]);
  parts.push(new THREE.TubeGeometry(rachis, 12, 0.0011, 4, false));
  for (let branch = 0; branch < 8; branch++) {
    const t = 0.18 + branch * 0.085,
      base = rachis.getPoint(t),
      side = branch % 2 ? -1 : 1;
    const end = base
      .clone()
      .add(
        new THREE.Vector3(
          0.027 + 0.018 * (1 - t),
          -0.02 - 0.014 * t,
          side * (0.016 + 0.022 * (1 - t)),
        ),
      );
    const mid = base.clone().lerp(end, 0.55);
    mid.y += 0.012;
    const path = new THREE.CatmullRomCurve3([base, mid, end]);
    parts.push(new THREE.TubeGeometry(path, 4, 0.00065, 3, false));
    for (let seed = 0; seed < 4; seed++) {
      const p = path.getPoint(0.23 + seed * 0.23);
      const husk = grain.clone();
      husk.scale(0.0026, 0.0064, 0.0022);
      husk.rotateZ(-0.25 - seed * 0.15);
      husk.translate(p.x, p.y - 0.005, p.z + (seed % 2 ? 0.002 : -0.002));
      parts.push(husk);
    }
  }
  grain.dispose();
  const geometry = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  const p = geometry.attributes.position,
    uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, Math.max(0, p.getY(i) / 0.18));
  return geometry;
}

function windMaterial(k, color, strength = 0.065) {
  const material = k.material(color, 0.88);
  material.side = THREE.DoubleSide;
  const time = { value: 0 };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.landscapeTime = time;
    shader.vertexShader = `uniform float landscapeTime;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      vec2 root = vec2(0.0);
      #ifdef USE_INSTANCING
        root = instanceMatrix[3].xz;
      #endif
      float sway = sin(landscapeTime * 1.3 + root.x * .38 + root.y * .25);
      sway += .32 * sin(landscapeTime * 2.7 + root.y * 1.6);
      transformed.x += sway * ${strength.toFixed(4)} * uv.y * uv.y;
      transformed.z += sway * ${(0.4 * strength).toFixed(4)} * uv.y * uv.y;
    `,
    );
  };
  material.customProgramCacheKey = () => `landscape-wind-${strength}`;
  k.animations.push((_, elapsed) => {
    time.value = elapsed;
  });
  return material;
}

function reflectedCanalLight(k, materials) {
  const time = { value: 0 };
  for (const material of materials) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.canalLightTime = time;
      shader.vertexShader = `varying vec3 canalLightPosition;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <worldpos_vertex>",
        `
        #include <worldpos_vertex>
        vec4 canalPoint = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          canalPoint = instanceMatrix * canalPoint;
        #endif
        canalLightPosition = (modelMatrix * canalPoint).xyz;
      `,
      );
      shader.fragmentShader = `varying vec3 canalLightPosition;
        uniform float canalLightTime;\n${WATER_FLOW_GLSL}\n${shader.fragmentShader}`;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <lights_fragment_end>",
        `
        #include <lights_fragment_end>
        float bankDistance = abs(abs(canalLightPosition.x) - 2.44);
        float wetEdge = (1.0 - smoothstep(.1, .65, bankDistance))
          * (1.0 - smoothstep(.05, .8, abs(canalLightPosition.y + .22)))
          * (1.0 - smoothstep(10.0, 15.0, abs(canalLightPosition.z)));
        vec2 bankFlow = waterNoise(canalLightPosition.xz * .31
          - vec2(.037,.021) * canalLightTime).yz * .18;
        vec2 reflectedPoint = vec2(canalLightPosition.z * 1.7, canalLightPosition.y * 5.3)
          + bankFlow - vec2(.11,-.073) * canalLightTime;
        float reflectedRipple = smoothstep(.02,.37,waterNoise(reflectedPoint).x)
          * (.65 + .35 * waterNoise(reflectedPoint * .43 + 9.2).x);
        reflectedLight.indirectDiffuse += vec3(.032, .052, .045)
          * reflectedRipple * wetEdge;
      `,
      );
    };
    material.customProgramCacheKey = () => "advected-canal-reflected-light";
  }
  k.animations.push((_, elapsed) => {
    time.value = elapsed;
  });
}

function mountain(k, { x, z, width, depth, height, color, phase, base = -28 }) {
  const geometry = new THREE.PlaneGeometry(width, depth, 104, 36);
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.attributes.position,
    colors = [];
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i),
      pz = p.getZ(i);
    const ridge = Math.exp(
      -(((pz / depth + 0.05 + 0.08 * Math.sin(px * 0.02)) * 3.1) ** 2),
    );
    const peaks =
      0.57 +
      0.18 * Math.sin((px / width) * 12 + phase) +
      0.12 * Math.sin((px / width) * 27 + phase * 0.7) +
      0.065 * Math.sin((px / width) * 65 + pz * 0.018) +
      0.025 * Math.sin(px * 0.24 + Math.sin(pz * 0.16));
    const shoulders = Math.max(0, 1 - Math.abs((px / width) * 2) ** 4);
    p.setY(i, base + height * ridge * peaks * shoulders);
    const shade =
      0.88 +
      0.06 * Math.sin(px * 0.1 + pz * 0.07) +
      0.035 * Math.sin(px * 0.35 - pz * 0.12);
    colors.push(shade, shade, shade);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = k.material(color, 1);
  material.vertexColors = true;
  const mesh = k.mesh(geometry, material, [x, 0, z]);
  mesh.castShadow = false;
}

function fieldShelter(k, position) {
  const g = k.sub(position, -0.12);
  const bamboo = tintedScan(k, k.m.cedar, 0xa38b5d);
  const replacementBoard = tintedScan(k, k.m.cedar, 0xb5a17c);
  const thatch = tintedScan(k, k.m.ground, 0x978967);
  k.box([2.75, 0.14, 2.15], [0, 0.32, 0], bamboo, g, 0.01);
  for (const x of [-1.16, 1.16])
    for (const z of [-0.86, 0.86]) {
      k.cylinder(0.052, 2.75, [x, 1.32, z], bamboo, g, 0.061, 10);
      for (let y = 0.2; y < 2.7; y += 0.35)
        k.mesh(
          new THREE.TorusGeometry(0.055, 0.006, 4, 14),
          bamboo,
          [x, y, z],
          [Math.PI / 2, 0, 0],
          g,
        );
      k.rod([x, 1.92, z], [x * 0.53, 2.62, z], 0.026, bamboo, g);
    }
  for (const z of [-0.91, 0.91])
    k.rod([-1.4, 2.58, z], [1.4, 2.58, z], 0.056, bamboo, g);
  const roof = new THREE.BufferGeometry();
  roof.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -1.7, 2.4, -1.5, 1.7, 2.4, -1.5, -1.7, 3.23, 0, 1.7, 3.23, 0, -1.7, 2.4,
        1.5, 1.7, 2.4, 1.5,
      ],
      3,
    ),
  );
  roof.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 1, 2, 1, 0, 2, 2, 2], 2),
  );
  roof.setIndex([0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5]);
  roof.computeVertexNormals();
  thatch.side = THREE.DoubleSide;
  k.mesh(roof, thatch, [0, 0, 0], [0, 0, 0], g);
  for (let x = -1.68; x < 1.7; x += 0.047)
    for (const side of [-1, 1]) {
      k.rod(
        [x, 3.25, 0],
        [x + k.range(-0.022, 0.022), 2.38, side * k.range(1.49, 1.61)],
        0.012,
        thatch,
        g,
      );
    }
  for (let x = -1.18; x < 1.2; x += 0.16)
    k.box(
      [0.145, 0.042, 1.95],
      [x, 0.416, 0],
      x > 0.05 && x < 0.21 ? replacementBoard : bamboo,
      g,
      0.004,
    );
  for (let turn = 0; turn < 5; turn++)
    k.mesh(
      new THREE.TorusGeometry(0.061, 0.003, 4, 16),
      k.m.linen,
      [-1.16, 1.91 + turn * 0.008, 0.86],
      [Math.PI / 2, 0, 0],
      g,
    );
  k.box([1.85, 0.085, 0.37], [0, 0.83, -0.72], bamboo, g);
  for (const x of [-0.72, 0.72])
    k.box([0.07, 0.48, 0.3], [x, 0.56, -0.72], bamboo, g);
  return g;
}

function basket(k, position, parent = k.group) {
  const g = k.sub(position, 0.28, parent);
  const wicker = k.material(0x9e8052, 0.95),
    darkWicker = k.material(0x796440, 1);
  k.lathe(
    [
      [0.16, 0],
      [0.22, 0.045],
      [0.3, 0.34],
      [0.315, 0.43],
      [0.3, 0.43],
      [0.285, 0.34],
      [0.205, 0.045],
      [0.16, 0.02],
    ],
    [0, 0, 0],
    darkWicker,
    g,
    32,
  );
  for (let y = 0.05; y < 0.43; y += 0.019)
    k.ring(0.21 + y * 0.23, 0.007, [0, y, 0], wicker, g);
  for (let i = 0; i < 48; i++) {
    const angle = (i * TAU) / 48;
    k.rod(
      [Math.cos(angle) * 0.217, 0.045, Math.sin(angle) * 0.217],
      [Math.cos(angle) * 0.312, 0.43, Math.sin(angle) * 0.312],
      0.005,
      wicker,
      g,
    );
  }
  k.ring(0.313, 0.015, [0, 0.43, 0], wicker, g);
  k.tube(
    [
      [-0.3, 0.35, 0],
      [-0.25, 0.63, 0],
      [0, 0.78, 0],
      [0.25, 0.63, 0],
      [0.3, 0.35, 0],
    ],
    0.013,
    wicker,
    g,
  );
}

function shelterRestingPlace(k, shelter) {
  basket(k, [-0.76, 0.44, 0.42], shelter);
  const clay = tintedScan(k, k.m.terracotta, 0x9c8363, 0.76);
  const jar = k.sub([0.63, 0.44, -0.22], -0.16, shelter);
  k.lathe(
    [
      [0.17, 0],
      [0.19, 0.025],
      [0.28, 0.18],
      [0.29, 0.35],
      [0.21, 0.52],
      [0.155, 0.57],
      [0.15, 0.65],
      [0.13, 0.65],
      [0.13, 0.575],
      [0.19, 0.515],
      [0.26, 0.35],
      [0.25, 0.19],
      [0.16, 0.055],
    ],
    [0, 0, 0],
    clay,
    jar,
    36,
  );
  k.ring(0.142, 0.012, [0, 0.65, 0], clay, jar);
  k.cylinder(
    0.126,
    0.009,
    [0, 0.598, 0],
    k.material(0x3a4936, 0.25),
    jar,
    0.126,
    24,
  );
  k.rod([-0.1, 0.61, 0.03], [0.16, 0.76, 0.04], 0.009, k.m.cedar, jar);
  k.lathe(
    [
      [0, 0],
      [0.027, 0.003],
      [0.052, 0.028],
      [0.048, 0.039],
      [0.019, 0.012],
    ],
    [-0.1, 0.59, 0.03],
    k.m.cedar,
    jar,
    20,
  );
  k.lathe(
    [
      [0.041, 0],
      [0.045, 0.015],
      [0.047, 0.13],
      [0.039, 0.13],
      [0.037, 0.021],
    ],
    [0.73, 0.443, 0.23],
    k.m.cedar,
    shelter,
    24,
  );

  const cloth = k.material(0xc5b698, 1);
  cloth.side = THREE.DoubleSide;
  cloth.map = k.texture(
    (c, size) => {
      c.fillStyle = "#d0c4aa";
      c.fillRect(0, 0, size, size);
      c.fillStyle = "#788475";
      for (const x of [13, 21, size - 25, size - 17]) c.fillRect(x, 0, 3, size);
      for (let y = 0; y < size; y += 2) {
        c.fillStyle = y % 4 ? "#ffffff19" : "#5a56421a";
        c.fillRect(0, y, size, 1);
      }
      for (let x = 0; x < size; x += 3) {
        c.fillStyle = "#ffffff16";
        c.fillRect(x, 0, 1, size);
      }
    },
    [1, 1],
    128,
  );
  cloth.bumpMap = cloth.map;
  cloth.bumpScale = 0.002;
  const geometry = new THREE.PlaneGeometry(0.72, 0.72, 24, 24);
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i);
    const fall =
      z > 0.16 ? -(z - 0.16) * 1.95 : z < -0.17 ? (z + 0.17) * 1.1 : 0;
    p.setY(i, fall + Math.sin(x * 45) * 0.011 + Math.cos(z * 10) * 0.007);
  }
  geometry.computeVertexNormals();
  k.mesh(geometry, cloth, [0.15, 0.888, -0.73], [0, 0, 0], shelter);
  k.book([-0.58, 0.8735, -0.72], {
    width: 0.205,
    depth: 0.305,
    thickness: 0.025,
    angle: -0.12,
    parent: shelter,
  });
}

/**
 * An anonymous Balinese subak landscape, informed by contour agriculture and
 * tropical vegetation. Field boundaries, shelter, basket and the open channel
 * are composed examples, not a surveyed location or a model of the entire subak system.
 */
export function buildSubakTerraces(definition, renderer) {
  const k = createOutdoorKit(renderer, seedFor(definition, 718), {
    sunPosition: [-45, 29, -20],
    sunColor: 0xffe6b5,
    sunIntensity: 2.25,
    skyColor: 0xc4d6d3,
    fogDensity: 0.0057,
    exposure: 0.93,
  });
  const soil = tintedScan(k, k.m.ground, 0x807354, 0.98);
  const wetSoil = tintedScan(k, k.m.ground, 0x494d35, 0.57);
  const bank = tintedScan(k, k.m.ground, 0x76834c);
  bank.side = THREE.DoubleSide;
  const stone = tintedScan(k, k.m.stone, 0x77785c);
  const rice = windMaterial(k, 0xffffff);
  rice.map = k.texture(
    (c, size) => {
      const leaf = c.createLinearGradient(0, 0, size, 0);
      leaf.addColorStop(0, "#879477");
      leaf.addColorStop(0.46, "#c5cdb2");
      leaf.addColorStop(0.5, "#e1e4cc");
      leaf.addColorStop(0.55, "#a6b28e");
      leaf.addColorStop(1, "#889572");
      c.fillStyle = leaf;
      c.fillRect(0, 0, size, size);
      c.strokeStyle = "#e2e4c43a";
      c.lineWidth = 1;
      for (let x = 10; x < size; x += 11) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + 3, size);
        c.stroke();
      }
    },
    [1, 1],
    128,
  );
  rice.bumpMap = rice.map;
  rice.bumpScale = 0.0006;
  const grass = windMaterial(k, 0xffffff, 0.032);
  const canopy = k.material(0x49692e, 0.97);
  canopy.map = k.texture(
    (c, size) => {
      c.fillStyle = "#66834b";
      c.fillRect(0, 0, size, size);
      for (let i = 0; i < 9500; i++) {
        c.strokeStyle = ["#829958", "#4e713b", "#a4ac6e", "#405e2c"][i % 4];
        c.lineWidth = k.range(1, 3);
        c.beginPath();
        const x = k.range(0, size),
          y = k.range(0, size);
        c.moveTo(x, y);
        c.lineTo(x + k.range(-5, 5), y - k.range(4, 15));
        c.stroke();
      }
    },
    [1, 1],
    256,
  );
  canopy.bumpMap = canopy.map;
  canopy.bumpScale = 0.035;
  const drop = 1.18;
  const contours = (i, x) =>
    12 -
    i * 6 +
    7 * Math.sin(x * 0.05 + i * 0.16) +
    3.3 * Math.sin(x * 0.1 + i * 0.21) +
    0.001 * x * x;
  const riceEntries = [],
    closeRiceEntries = [[], [], []],
    grassEntries = [],
    pebbles = [],
    culms = [],
    panicles = [];
  const vigorAt = (level, x, z) =>
    THREE.MathUtils.clamp(
      0.54 +
        0.22 * Math.sin(x * 0.24 + z * 0.31 + level * 0.7) +
        0.16 * Math.sin(x * 0.63 - z * 0.29 + level * 0.41),
      0.08,
      0.95,
    );
  const water = k.water({
    width: 140,
    depth: 6,
    position: [0, 0.038, 0],
    color: 0x35452d,
  });
  const reflector = water.children.find((object) => object.isReflector);
  const waterMaterial = reflector.material,
    sharedWater = [];
  const reflection = reflector.onBeforeRender;
  // Parallel paddies share one capture. Hide consumers during capture to avoid texture feedback.
  reflector.onBeforeRender = function (renderer, scene, camera) {
    const visible = sharedWater.map((surface) => surface.visible);
    sharedWater.forEach((surface) => {
      surface.visible = false;
    });
    try {
      reflection.call(this, renderer, scene, camera);
    } finally {
      sharedWater.forEach((surface, index) => {
        surface.visible = visible[index];
      });
    }
  };
  function paddyWater(geometry, position, rotation = [-Math.PI / 2, 0, 0]) {
    const surface = k.mesh(geometry, waterMaterial, position, rotation);
    surface.castShadow = false;
    k.animated.add(surface);
    sharedWater.push(surface);
    return surface;
  }
  for (let level = -4; level < 23; level++) {
    const height = -level * drop;
    const near = (x) => contours(level, x) - 0.36;
    const far = (x) => contours(level + 1, x) + 0.35;
    const field = landStrip(
      (x) => [height, near(x)],
      (x) => [height, far(x)],
    );
    k.mesh(field, level % 5 === 3 ? soil : wetSoil);
    const waterGeo = landStrip(
      (x) => [height + 0.038, near(x) - 0.04],
      (x) => [height + 0.038, far(x) + 0.04],
    );
    if (level === 0) {
      reflector.geometry.dispose();
      reflector.geometry = planarWaterGeometry(waterGeo, height + 0.038);
      k.geometries.add(reflector.geometry);
    } else if (level % 5 !== 3) {
      paddyWater(planarWaterGeometry(waterGeo, height + 0.038), [
        0,
        height + 0.038,
        0,
      ]);
    }
    waterGeo.dispose();
    const canopyIntervals =
      level >= -1 && level < 5
        ? [
            [-70, -34],
            [34, 70],
          ]
        : [[-70, 70]];
    for (const [start, end] of canopyIntervals) {
      k.mesh(
        landStrip(
          (x) => [height + 0.17, near(x) - 0.29],
          (x) => [height + 0.17, far(x) + 0.29],
          start,
          end,
        ),
        canopy,
      );
    }
    k.mesh(
      landStrip(
        (x) => [height + 0.075, contours(level, x) + 0.34],
        (x) => [height + 0.14, contours(level, x)],
      ),
      bank,
    );
    k.mesh(
      landStrip(
        (x) => [height + 0.14, contours(level, x)],
        (x) => [height + 0.075, contours(level, x) - 0.34],
      ),
      bank,
    );
    k.mesh(
      landStrip(
        (x) => [height + 0.155, contours(level, x) + 0.135],
        (x) => [height + 0.155, contours(level, x) - 0.135],
      ),
      soil,
    );
    k.mesh(
      landStrip(
        (x) => [height + 0.08, contours(level + 1, x) + 0.33],
        (x) => [height - drop + 0.08, contours(level + 1, x) + 0.4],
      ),
      bank,
    );

    const spacing =
      level < -2
        ? 1.2
        : level < 0
          ? 0.75
          : level < 5
            ? 0.46
            : level < 13
              ? 0.78
              : 1.4;
    const extent = level < 0 ? 55 : level < 5 ? 46 : level < 13 ? 60 : 70;
    for (let x = -extent; x < extent; x += spacing * k.range(0.87, 1.14)) {
      const nx = x + k.range(-0.07, 0.07);
      for (
        let z = far(nx) + spacing * k.range(0.35, 1.1);
        z < near(nx) - 0.15;
        z += spacing * k.range(0.84, 1.2)
      ) {
        const vigor = vigorAt(level, nx, z);
        if (k.random() < 0.045 + Math.max(0, 0.42 - vigor) * 1.05) continue;
        if (
          Math.abs(nx - 9 - Math.sin(z * 0.39 + level) * 0.6) < 0.14 &&
          level >= 0 &&
          level < 5
        )
          continue;
        if (level === 0 && nx > -3.98 && nx < -3.42) continue;
        if (
          level === 0 &&
          Math.abs(nx + 13) < 1.8 &&
          Math.abs(z - contours(1, -13) - 1.1) < 1.45
        )
          continue;
        const root = [
          nx +
            k.range(-spacing * 0.23, spacing * 0.23) +
            Math.sin(z * 0.55) * 0.055,
          height + 0.025,
          z + k.range(-spacing * 0.24, spacing * 0.24),
        ];
        const close = level >= -1 && level < 4 && Math.abs(nx) < 30;
        const baseBlades =
          level < -2 ? 3 : level < 0 ? 10 : level < 5 ? 15 : level < 13 ? 5 : 3;
        const blades = Math.max(
          3,
          Math.round(baseBlades * k.range(0.7, 1.14) * (0.68 + vigor * 0.5)),
        );
        const plantHeight = k.range(0.58, 0.82) * (0.72 + vigor * 0.42);
        const clumpAngle = k.range(0, TAU),
          lean = k.range(-0.13, 0.13) + Math.sin(nx * 0.17 + z * 0.23) * 0.11;
        const tillers = close
          ? vigor < 0.43
            ? 2
            : k.random() < 0.2
              ? 4
              : 3
          : 1;
        const ripeness =
          0.5 + 0.5 * Math.sin(nx * 0.14 + z * 0.11 + level * 0.65);
        const stems = Array.from({ length: tillers }, (_, index) => {
          const angle = clumpAngle + index * 2.399,
            spread = k.range(0.018, 0.034);
          const dx = lean + Math.cos(angle) * k.range(0.035, 0.1),
            dz = Math.sin(angle) * k.range(0.025, 0.085);
          const h = plantHeight * k.range(0.84, 1.05);
          const axis = new THREE.Vector3(dx, 1, dz).normalize();
          const orientation = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            axis,
          );
          const rotation = new THREE.Euler().setFromQuaternion(orientation);
          return {
            angle,
            x: Math.cos(angle) * spread,
            z: Math.sin(angle) * spread,
            dx,
            dz,
            h,
            rotation: [rotation.x, rotation.y, rotation.z],
            orientation,
          };
        });
        const clumpHue = 0.225 + vigor * 0.047,
          clumpLightness = 0.16 + vigor * 0.11;
        for (let blade = 0; blade < blades; blade++) {
          const stem = stems[blade % tillers],
            nodeIndex = Math.floor(blade / tillers);
          const node = nodeIndex / Math.max(1, Math.ceil(blades / tillers) - 1);
          const attachment = stem.h * (0.055 + node * 0.38);
          const aging =
            close && nodeIndex === 0 && ripeness > 0.72 && k.random() < 0.22;
          const habit = aging || node < 0.24 ? 2 : node > 0.73 ? 0 : 1;
          const shade = new THREE.Color().setHSL(
            aging ? 0.145 : clumpHue + k.range(-0.008, 0.008),
            aging ? 0.25 : k.range(0.43, 0.59),
            clumpLightness + k.range(-0.018, 0.035),
          );
          const entries = close ? closeRiceEntries[habit] : riceEntries;
          entries.push({
            position: [
              root[0] + stem.x + attachment * stem.dx,
              root[1] + attachment,
              root[2] + stem.z + attachment * stem.dz,
            ],
            rotation: [
              stem.dz + k.range(-0.07, 0.07),
              stem.angle + (nodeIndex % 2 ? Math.PI : 0) + k.range(-0.17, 0.17),
              -stem.dx + k.range(-0.09, 0.09),
            ],
            scale: [
              k.range(0.77, 1.12),
              stem.h * (1 - node * 0.38) * k.range(0.84, 1.04),
              k.range(0.82, 1.16),
            ],
            color: shade,
          });
        }
        if (close) {
          for (const stem of stems) {
            const stemHeight = stem.h * 0.76;
            culms.push({
              position: [
                root[0] + stem.x + (stemHeight * stem.dx) / 2,
                root[1] + stemHeight / 2,
                root[2] + stem.z + (stemHeight * stem.dz) / 2,
              ],
              rotation: stem.rotation,
              scale: [
                1,
                stemHeight * Math.sqrt(1 + stem.dx ** 2 + stem.dz ** 2),
                1,
              ],
              color: new THREE.Color().setHSL(
                clumpHue,
                0.36,
                clumpLightness + 0.055,
              ),
            });
          }
          const focusPatch =
            level === 0 && Math.abs(nx) < 2 && z > near(nx) - 3.2;
          if (k.random() < (focusPatch ? 0.32 : vigor > 0.65 ? 0.028 : 0)) {
            const stem = stems[0],
              stemHeight = stem.h * 0.76;
            const orientation = stem.orientation
              .clone()
              .multiply(
                new THREE.Quaternion().setFromAxisAngle(
                  new THREE.Vector3(0, 1, 0),
                  stem.angle,
                ),
              );
            const rotation = new THREE.Euler().setFromQuaternion(orientation);
            panicles.push({
              position: [
                root[0] + stem.x + stemHeight * stem.dx,
                root[1] + stemHeight,
                root[2] + stem.z + stemHeight * stem.dz,
              ],
              rotation: [rotation.x, rotation.y, rotation.z],
              scale: [
                k.range(0.8, 1.1),
                k.range(0.82, 1.15),
                k.range(0.8, 1.15),
              ],
              color: new THREE.Color().setHSL(
                0.19 + vigor * 0.025,
                0.22,
                k.range(0.56, 0.73),
              ),
            });
          }
        }
      }
      if (level >= 0 && level < 11)
        for (const side of [-1, 1]) {
          for (let leaf = 0; leaf < 3; leaf++)
            grassEntries.push({
              position: [
                nx,
                height + 0.13,
                contours(level, nx) + side * k.range(0.2, 0.34),
              ],
              rotation: [
                k.range(-0.4, 0.4),
                k.range(0, TAU),
                k.range(-0.5, 0.5),
              ],
              scale: [1.6, k.range(0.1, 0.24), 0.7],
              color: new THREE.Color().setHSL(0.22, 0.28, k.range(0.24, 0.36)),
            });
        }
    }
    if (level >= 0 && level < 7)
      for (let x = -28; x < 28; x += k.range(0.35, 0.8))
        pebbles.push({
          position: [
            x,
            height - 0.17 + k.range(-0.1, 0.05),
            contours(level + 1, x) + 0.38,
          ],
          rotation: [k.range(0, 1), k.range(0, TAU), k.range(0, 1)],
          scale: [k.range(0.16, 0.32), k.range(0.09, 0.17), k.range(0.1, 0.2)],
          color: new THREE.Color().setHSL(0.15, 0.09, k.range(0.5, 0.76)),
        });
  }
  batch(k, leafGeometry(0.024, 1, 0.32, 2), rice, riceEntries, {
    shadow: false,
  });
  closeRiceEntries.forEach((entries, habit) => {
    batch(k, riceBladeGeometry(habit), rice, entries, { shadow: false });
  });
  batch(
    k,
    new THREE.CylinderGeometry(0.0025, 0.0037, 1, 5, 1, true),
    k.material(0xffffff, 0.86),
    culms,
    { shadow: false },
  );
  batch(k, ricePanicleGeometry(), windMaterial(k, 0xb2b795, 0.008), panicles, {
    shadow: false,
  });
  batch(k, leafGeometry(0.025, 1, 0.3, 2), grass, grassEntries, {
    shadow: false,
  });
  batch(k, new THREE.IcosahedronGeometry(1, 0), stone, pebbles);

  const surroundingLand = new THREE.PlaneGeometry(480, 520, 96, 104);
  surroundingLand.rotateX(-Math.PI / 2);
  surroundingLand.translate(0, 0, -30);
  const landPositions = surroundingLand.attributes.position,
    landUV = surroundingLand.attributes.uv;
  for (let i = 0; i < landPositions.count; i++) {
    const x = landPositions.getX(i),
      z = landPositions.getZ(i),
      sampleX = THREE.MathUtils.clamp(x, -70, 70);
    let level = -4;
    while (level < 22 && z < contours(level + 1, sampleX)) level++;
    const upperEdge = contours(-4, sampleX);
    let height = -level * drop - 2 * drop;
    if (z > upperEdge) height += Math.min(11, (z - upperEdge) * 0.065);
    const side = Math.max(0, Math.abs(x) - 70);
    height +=
      Math.min(9, side * 0.08) + Math.sin(x * 0.025) * Math.min(side * 0.01, 1);
    landPositions.setY(i, height);
    landUV.setXY(i, x / 3, z / 3);
  }
  surroundingLand.computeVertexNormals();
  k.mesh(surroundingLand, tintedScan(k, k.m.ground, 0x6e8050));
  mountain(k, {
    x: 0,
    z: 125,
    width: 370,
    depth: 165,
    height: 33,
    color: 0x5e7645,
    phase: 1.9,
    base: 3.8,
  });
  k.tree([35, 4 * drop + 0.1, contours(-4, 35)], { height: 6.2, radius: 3.2 });

  mountain(k, {
    x: 5,
    z: -340,
    width: 620,
    depth: 205,
    height: 72,
    color: 0x829b97,
    phase: 0.6,
    base: -35,
  });
  mountain(k, {
    x: -45,
    z: -255,
    width: 460,
    depth: 180,
    height: 46,
    color: 0x698575,
    phase: 2.2,
    base: -32,
  });
  mountain(k, {
    x: 20,
    z: -183,
    width: 330,
    depth: 125,
    height: 23,
    color: 0x4b6a43,
    phase: 0.8,
  });
  for (const side of [-1, 1])
    mountain(k, {
      x: side * 138,
      z: -70,
      width: 150,
      depth: 220,
      height: 33,
      color: 0x536d40,
      phase: side * 1.8,
    });
  for (let i = 0; i < 10; i++) {
    const x = -72 + i * 16,
      z = contours(21, x);
    k.tree([x, -21 * drop, z], {
      height: k.range(4.5, 8),
      radius: k.range(2.2, 3.8),
    });
  }
  for (const [x, level, height] of [
    [-18, 1, 8],
    [32, 4, 9],
    [-40, 5, 8.5],
    [44, 9, 10],
    [-31, 12, 7],
    [15, 15, 9],
  ]) {
    const palm = k.tree([x, -level * drop + 0.1, contours(level, x)], {
      height,
      radius: height * 0.41,
      kind: "palm",
    });
    palm.traverse((object) => {
      if (object.geometry?.type !== "TorusGeometry") return;
      const { radius, tube } = object.geometry.parameters;
      object.geometry.dispose();
      object.geometry = new THREE.TorusGeometry(radius, tube, 3, 14);
      k.geometries.add(object.geometry);
    });
  }
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const x = side * k.range(61, 70),
        level = i * 6;
      k.tree([x, -level * drop, contours(level, x)], {
        height: k.range(5, 8),
        radius: k.range(2.2, 3.8),
      });
    }

  const shelterX = -13,
    shelterZ = contours(1, shelterX);
  const shelter = fieldShelter(k, [shelterX, 0.08, shelterZ + 1.1]);
  shelterRestingPlace(k, shelter);
  shelter.updateWorldMatrix(true, false);
  const shelterEye = shelter
    .localToWorld(new THREE.Vector3(0.86, 2, 0.25))
    .toArray();
  const shelterLook = shelter
    .localToWorld(new THREE.Vector3(-0.58, 0.9, -0.72))
    .toArray();
  // A modest open channel illustrates field irrigation without claiming a documented weir.
  const channelGeometry = new THREE.PlaneGeometry(0.25, 4.5);
  channelGeometry.translate(-3.7, -contours(0, -3.7) + 2.4, 0);
  paddyWater(channelGeometry, [0, 0.012, 0]);
  for (const side of [-1, 1])
    k.box(
      [0.1, 0.075, 4.5],
      [-3.7 + side * 0.2, 0.042, contours(0, -3.7) - 2.4],
      soil,
      k.group,
      0,
    );

  const arrivalZ = contours(0, 17);
  return k.finish(
    definition,
    {
      arrival: outdoorView(
        "Along a Balinese bund",
        [17, 1.83, arrivalZ - 0.07],
        [-11, -11.5, -11],
        62,
      ),
      rice: outdoorView(
        "Rice, water & wet earth",
        [1.1, 1.05, contours(0, 1.1)],
        [-0.25, 0.36, contours(0, 1.1) - 2.5],
        57,
      ),
      contours: outdoorView(
        "Across the subak terraces",
        [-11.5, 1.82, contours(0, -11.5)],
        [21, -10.5, -22],
        63,
      ),
      shelter: outdoorView(
        "A pause in the field shelter",
        shelterEye,
        shelterLook,
        61,
      ),
    },
    [
      [-7, -3 * drop + 0.2, contours(3, -7)],
      [-0.3, 0.48, contours(0, -0.3) - 1.7],
      [-4.6, 0.23, contours(0, -4.6)],
      [-3.7, 0.13, contours(0, -3.7) - 2],
    ],
  );
}

function archOutline(radius, spring, rise, top, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-radius - 0.58, spring - 0.55);
  shape.lineTo(-radius, spring - 0.55);
  shape.lineTo(-radius, spring);
  for (let i = 0; i <= 48; i++) {
    const angle = Math.PI - (i * Math.PI) / 48;
    shape.lineTo(Math.cos(angle) * radius, spring + Math.sin(angle) * rise);
  }
  shape.lineTo(radius, spring - 0.55);
  shape.lineTo(radius + 0.58, spring - 0.55);
  shape.lineTo(radius + 0.58, top - 0.36);
  shape.lineTo(radius * 0.65, top);
  shape.lineTo(-radius * 0.65, top);
  shape.lineTo(-radius - 0.58, top - 0.36);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 32,
  });
  return geometry;
}

function stoneBridge(k, masonry, trim, position) {
  const g = k.sub(position);
  const radius = 2.13,
    spring = -0.83,
    rise = 1.25,
    deck = 0.72,
    depth = 2.0;
  k.mesh(
    archOutline(radius, spring, rise, deck, depth),
    masonry,
    [0, 0, -depth / 2],
    [0, 0, 0],
    g,
  );
  for (const front of [-1, 1])
    for (let i = 0; i < 17; i++) {
      const a = (Math.PI * i) / 17 + 0.008,
        b = (Math.PI * (i + 1)) / 17 - 0.008;
      const shape = new THREE.Shape();
      shape.moveTo(Math.cos(a) * radius, spring + Math.sin(a) * rise);
      shape.lineTo(Math.cos(b) * radius, spring + Math.sin(b) * rise);
      shape.lineTo(
        Math.cos(b) * (radius + 0.31),
        spring + Math.sin(b) * (rise + 0.31),
      );
      shape.lineTo(
        Math.cos(a) * (radius + 0.31),
        spring + Math.sin(a) * (rise + 0.31),
      );
      shape.closePath();
      k.mesh(
        new THREE.ExtrudeGeometry(shape, { depth: 0.085, bevelEnabled: false }),
        trim,
        [0, 0, front > 0 ? depth / 2 - 0.015 : -depth / 2 - 0.07],
        [0, 0, 0],
        g,
      );
    }
  const level = (x) => deck - Math.max(0, Math.abs(x) - 1.46) * 0.26;
  for (let x = -2.73; x < 2.78; x += 0.34) {
    k.box([0.328, 0.095, 2.02], [x, level(x) + 0.012, 0], trim, g, 0.009);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const x = -2.76 + i * 0.92,
        y = level(x);
      k.box([0.18, 0.98, 0.19], [x, y + 0.54, side * 0.99], trim, g, 0.012);
      k.box([0.23, 0.07, 0.24], [x, y + 1.03, side * 0.99], trim, g, 0.014);
      k.sphere(0.105, [x, y + 1.13, side * 0.99], trim, g, [0.82, 0.85, 0.82]);
      if (i === 6) continue;
      const midpoint = x + 0.46,
        midY = level(midpoint);
      for (const dx of [-0.25, 0, 0.25])
        k.box(
          [0.075, 0.63, 0.1],
          [midpoint + dx, midY + 0.48, side * 0.99],
          trim,
          g,
          0.006,
        );
      const slope = Math.atan2(level(x + 0.92) - level(x), 0.92);
      k.box(
        [0.96, 0.105, 0.16],
        [midpoint, midY + 0.86, side * 0.99],
        trim,
        g,
        0.014,
        [0, 0, slope],
      );
      k.box(
        [0.91, 0.12, 0.15],
        [midpoint, midY + 0.13, side * 0.99],
        trim,
        g,
        0.005,
        [0, 0, slope],
      );
    }
    for (let step = 0; step < 4; step++) {
      const y = 0.38 - step * 0.095;
      k.box(
        [0.38, y + 0.16, 2.23],
        [side * (2.95 + step * 0.35), y / 2 - 0.075, 0],
        trim,
        g,
        0.014,
      );
    }
  }
}

function latticeWindow(k, parent, x, y, z, width, height, wood, detail = true) {
  const recess = detail ? 0.34 : 0.27;
  k.box(
    [width + 0.04, height + 0.04, 0.05],
    [x, y, z - recess],
    k.m.plaster,
    parent,
    0.002,
  );
  for (const side of [-1, 1]) {
    k.box(
      [0.055, height + 0.13, recess],
      [x + side * (width / 2 + 0.025), y, z - recess / 2],
      wood,
      parent,
      0.003,
    );
    k.box(
      [width + 0.13, 0.06, recess],
      [x, y + side * (height / 2 + 0.025), z - recess / 2],
      wood,
      parent,
      0.003,
    );
  }
  k.box(
    [width * 0.22, height * 0.88, 0.027],
    [x - width * 0.35, y - height * 0.025, z - recess + 0.055],
    wood,
    parent,
    0.003,
  );
  for (const side of [-1, 1]) {
    k.box(
      [0.06, height + 0.08, 0.11],
      [x + (side * width) / 2, y, z],
      wood,
      parent,
      0.004,
    );
    k.box(
      [width + 0.08, 0.065, 0.11],
      [x, y + (side * height) / 2, z],
      wood,
      parent,
      0.004,
    );
  }
  k.box(
    [width + 0.2, 0.075, 0.27],
    [x, y - height / 2 - 0.085, z + 0.025],
    wood,
    parent,
    0.006,
  );
  const spacing = detail ? 0.17 : 0.25;
  for (let dx = -width / 2 + spacing; dx < width / 2 - 0.03; dx += spacing)
    k.box(
      [0.023, height - 0.04, 0.055],
      [x + dx, y, z + 0.016],
      wood,
      parent,
      0,
    );
  for (let dy = -height / 2 + spacing; dy < height / 2; dy += spacing)
    k.box(
      [width - 0.05, 0.025, 0.055],
      [x, y + dy, z + 0.025],
      wood,
      parent,
      0,
    );
  if (detail) {
    for (const dx of [-width * 0.23, width * 0.23])
      for (const dy of [-height * 0.22, height * 0.22]) {
        const size = Math.min(width * 0.22, height * 0.16);
        for (const sign of [-1, 1])
          k.box(
            [size, 0.024, 0.059],
            [x + dx, y + dy + sign * size * 0.34, z + 0.047],
            wood,
            parent,
            0,
            [0, 0, (sign * Math.PI) / 4],
          );
      }
  }
}

function tiledRoof(
  k,
  parent,
  { width, depth, eave, rise, tiles, tileMaterial, wood },
) {
  const overhang = 0.45,
    halfDepth = depth / 2 + overhang;
  const roofHeight = (t) => eave + rise * (1 - t) ** 1.25 + 0.23 * t ** 9;
  // Curved roof surfaces, individual half-round tiles, and lifted corner ridges are all geometry.
  const positions = [],
    uv = [],
    indices = [];
  for (const side of [-1, 1]) {
    const offset = positions.length / 3;
    for (let row = 0; row <= 16; row++) {
      const t = row / 16;
      for (const sign of [-1, 1]) {
        positions.push(
          sign * (width / 2 + overhang),
          roofHeight(t),
          side * halfDepth * t,
        );
        uv.push(((sign + 1) * width) / 3, (t * halfDepth) / 2);
      }
      if (row < 16) {
        const a = offset + row * 2;
        if (side > 0) indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        else indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  k.mesh(
    geometryFrom(positions, indices, uv),
    tileMaterial,
    [0, 0, 0],
    [0, 0, 0],
    parent,
  );
  parent.updateWorldMatrix(true, false);
  const transform = new THREE.Object3D();
  for (
    let x = -width / 2 - overhang + 0.09;
    x < width / 2 + overhang;
    x += 0.18
  ) {
    for (const side of [-1, 1])
      for (let z = 0.12; z < halfDepth + 0.03; z += 0.28) {
        const t = Math.min(1, z / halfDepth),
          t1 = Math.min(1, (z + 0.03) / halfDepth);
        const slope = (roofHeight(t1) - roofHeight(t)) / 0.03;
        transform.position.set(x, roofHeight(t) + 0.06, side * z);
        transform.rotation.set(Math.atan2(1, side * slope), 0, 0);
        transform.scale.set(1, 1, 1);
        transform.updateMatrix();
        tiles.push({
          matrix: parent.matrixWorld.clone().multiply(transform.matrix),
          color: new THREE.Color().setHSL(
            0.12,
            k.range(0.01, 0.055),
            k.range(0.62, 0.91),
          ),
        });
      }
    for (const side of [-1, 1]) {
      k.rod(
        [x, eave + 0.12, side * (halfDepth - 0.16)],
        [x, eave + 0.12, side * (halfDepth + 0.08)],
        0.038,
        wood,
        parent,
      );
    }
  }
  k.tube(
    [
      [-width / 2 - 0.49, eave + rise + 0.3, 0],
      [-width / 2 + 0.13, eave + rise + 0.1, 0],
      [0, eave + rise + 0.09, 0],
      [width / 2 - 0.13, eave + rise + 0.1, 0],
      [width / 2 + 0.49, eave + rise + 0.3, 0],
    ],
    0.095,
    tileMaterial,
    parent,
  );
  for (const side of [-1, 1]) {
    k.box(
      [width + 0.94, 0.14, 0.15],
      [0, eave + 0.1, side * halfDepth],
      wood,
      parent,
      0.003,
    );
    for (const edge of [-1, 1])
      k.tube(
        [
          [edge * (width / 2 + 0.43), eave + rise + 0.23, 0],
          [
            edge * (width / 2 + 0.43),
            roofHeight(0.45) + 0.07,
            side * halfDepth * 0.45,
          ],
          [edge * (width / 2 + 0.44), eave + 0.26, side * halfDepth],
          [edge * (width / 2 + 0.55), eave + 0.43, side * (halfDepth + 0.2)],
        ],
        0.065,
        tileMaterial,
        parent,
      );
  }
}

function canalBuilding(
  k,
  position,
  angle,
  {
    width = 5.2,
    depth = 4.1,
    floors = 2,
    veranda = false,
    bayCount,
    distant = false,
    weathered = false,
    tiles,
    tileMaterial,
    wood,
  },
) {
  const g = k.sub(position, angle),
    story = 2.65,
    front = depth / 2;
  const height = floors * story;
  k.box([width, 0.32, depth], [0, 0.08, 0], k.m.stone, g, 0.01);
  k.box(
    [width - 0.2, height - 0.16, 0.22],
    [0, height / 2, -front + 0.1],
    k.m.plaster,
    g,
    0.008,
  );
  const undercoat = weathered
    ? tintedScan(k, k.m.stone, 0xb6aa93)
    : k.m.plaster;
  for (const side of [-1, 1])
    k.box(
      [0.22, height - 0.15, depth],
      [side * (width / 2 - 0.1), height / 2, 0],
      side < 0 ? undercoat : k.m.plaster,
      g,
      0.008,
    );
  if (weathered) {
    const plaster = new THREE.Shape();
    plaster.moveTo(-front, 0.075);
    plaster.lineTo(front, 0.075);
    plaster.lineTo(front, height - 0.075);
    plaster.lineTo(-front, height - 0.075);
    plaster.closePath();
    for (const outline of [
      [
        [1.35, 0.19],
        [1.72, 0.18],
        [1.84, 0.28],
        [1.81, 0.41],
        [1.94, 0.48],
        [1.75, 0.66],
        [1.55, 0.6],
        [1.41, 0.45],
        [1.32, 0.32],
      ],
      [
        [-1.63, 0.21],
        [-1.31, 0.2],
        [-1.29, 0.29],
        [-1.35, 0.4],
        [-1.51, 0.38],
        [-1.66, 0.31],
      ],
    ]) {
      const hole = new THREE.Path();
      outline.forEach(([x, y], index) =>
        index ? hole.lineTo(x, y) : hole.moveTo(x, y),
      );
      hole.closePath();
      plaster.holes.push(hole);
    }
    const geometry = new THREE.ExtrudeGeometry(plaster, {
      depth: 0.008,
      bevelEnabled: false,
    });
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
    k.mesh(
      geometry,
      k.m.plaster,
      [-width / 2 - 0.014, 0, 0],
      [0, -Math.PI / 2, 0],
      g,
    );
  }
  const bays = bayCount ?? Math.max(2, Math.round(width / 1.7)),
    bay = width / bays;
  for (let floor = 0; floor < floors; floor++) {
    const bottom = floor * story + 0.19,
      top = bottom + story;
    const balcony = veranda && floor > 0;
    k.box([width, 0.16, depth], [0, bottom, 0], wood, g, 0.003);
    k.box([width, 0.16, 0.19], [0, top - 0.11, front], wood, g, 0.006);
    if (balcony) {
      k.box(
        [width - 0.3, story - 0.21, 0.16],
        [0, bottom + story / 2, front - 1.22],
        k.m.plaster,
        g,
        0.003,
      );
      for (let bayIndex = 0; bayIndex < bays; bayIndex++) {
        const x = -width / 2 + bay * (bayIndex + 0.5);
        for (const side of [-1, 1])
          k.box(
            [0.075, 2.18, 0.12],
            [x + side * bay * 0.3, bottom + 1.19, front - 1.07],
            wood,
            g,
            0.003,
          );
        k.box(
          [bay * 0.65, 0.09, 0.12],
          [x, bottom + 2.24, front - 1.07],
          wood,
          g,
          0.003,
        );
        if (bayIndex % 2 === 0) {
          for (let panel = 0; panel < 3; panel++)
            k.box(
              [bay * 0.18, 2.08, 0.045],
              [x + (panel - 1) * bay * 0.195, bottom + 1.18, front - 1.1],
              wood,
              g,
              0.003,
            );
        } else {
          k.box(
            [bay * 0.7, 0.06, 0.28],
            [x, bottom + 0.69, front - 0.97],
            wood,
            g,
            0.004,
          );
        }
      }
      for (let post = 0; post <= bays * 6; post++) {
        const x = -width / 2 + 0.16 + (post * (width - 0.32)) / (bays * 6);
        k.box(
          [0.045, 0.67, 0.05],
          [x, bottom + 0.5, front + 0.035],
          wood,
          g,
          0.003,
        );
      }
      for (const y of [0.18, 0.85])
        k.box(
          [width + 0.08, 0.075, 0.11],
          [0, bottom + y, front + 0.04],
          wood,
          g,
          0.006,
        );
    } else {
      k.box(
        [width - 0.25, 0.51, 0.13],
        [0, bottom + 0.27, front - 0.075],
        wood,
        g,
        0.004,
      );
      for (let i = 0; i < bays; i++) {
        const x = -width / 2 + bay * (i + 0.5);
        latticeWindow(
          k,
          g,
          x,
          bottom + 1.36,
          front + 0.015,
          bay - 0.3,
          1.64,
          wood,
          floor === 0,
        );
        for (let panel = 0; panel < 3; panel++)
          k.box(
            [bay / 3 - 0.07, 0.38, 0.035],
            [x - bay / 3 + (panel * bay) / 3, bottom + 0.26, front + 0.02],
            wood,
            g,
            0.002,
          );
      }
    }
    for (let i = 0; i <= bays; i++) {
      const x = -width / 2 + i * bay;
      k.box(
        [0.17, story, 0.18],
        [x, bottom + story / 2, front + 0.04],
        wood,
        g,
        0.006,
      );
      for (const side of [-1, 1])
        k.rod(
          [x, top - 0.63, front + 0.02],
          [x + side * 0.36, top - 0.16, front + 0.02],
          0.047,
          wood,
          g,
        );
    }
    if (veranda && floor === 0)
      for (const x of [-width * 0.34, width * 0.34]) {
        const y = top - 0.42;
        k.sphere(0.14, [x, y, front + 0.24], k.m.red, g, [0.81, 1.26, 0.81]);
        k.cylinder(
          0.063,
          0.037,
          [x, y + 0.17, front + 0.24],
          k.m.brass,
          g,
          0.063,
          12,
        );
        k.rod(
          [x, y - 0.18, front + 0.24],
          [x, y - 0.27, front + 0.24],
          0.009,
          k.m.red,
          g,
        );
      }
  }
  tiledRoof(k, g, {
    width,
    depth,
    eave: height + 0.12,
    rise: veranda ? 1.25 : 1.05,
    tiles,
    tileMaterial,
    wood,
  });
  if (veranda)
    tiledRoof(k, k.sub([0, 0, front + 0.37], 0, g), {
      width: width + 0.18,
      depth: 1.28,
      eave: 2.55,
      rise: 0.56,
      tiles,
      tileMaterial,
      wood,
    });
  if (distant)
    g.traverse((object) => {
      if (object.geometry?.type !== "RoundedBoxGeometry") return;
      object.geometry.computeBoundingBox();
      const size = object.geometry.boundingBox.getSize(new THREE.Vector3());
      const center = object.geometry.boundingBox.getCenter(new THREE.Vector3());
      object.geometry.dispose();
      object.geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      object.geometry.translate(center.x, center.y, center.z);
      k.geometries.add(object.geometry);
    });
  return g;
}

function planter(k, position, { scale = 1 } = {}) {
  const g = k.sub(position);
  g.scale.setScalar(scale);
  k.lathe(
    [
      [0.22, 0],
      [0.25, 0.045],
      [0.28, 0.08],
      [0.36, 0.41],
      [0.37, 0.46],
      [0.32, 0.46],
      [0.31, 0.4],
      [0.23, 0.07],
    ],
    [0, 0, 0],
    k.m.terracotta,
    g,
    24,
  );
  k.ring(0.357, 0.023, [0, 0.415, 0], k.m.terracotta, g);
  k.cylinder(0.31, 0.018, [0, 0.404, 0], k.m.ground, g, 0.31, 24);
  const leaves = [];
  const up = new THREE.Vector3(0, 1, 0),
    phase = k.range(0, TAU);
  function leafPairs(path, count, angle) {
    for (let node = 0; node < count; node++) {
      const t = 0.25 + (node / count) * 0.73,
        point = path.getPointAt(t);
      for (const side of [-1, 1]) {
        if (k.random() < 0.12) continue;
        const azimuth = angle + side * k.range(0.6, 1.3);
        const direction = new THREE.Vector3(
          Math.cos(azimuth),
          k.range(0.12, 0.75) + t * 0.18,
          Math.sin(azimuth),
        ).normalize();
        const base = point.clone().addScaledVector(direction, 0.022);
        k.rod(
          point.toArray(),
          base.clone().addScaledVector(direction, 0.004).toArray(),
          0.0017,
          k.m.bark,
          g,
        );
        const orientation = new THREE.Quaternion().setFromUnitVectors(
          up,
          direction,
        );
        orientation.multiply(
          new THREE.Quaternion().setFromAxisAngle(
            up,
            side * 0.36 + k.range(-0.3, 0.3),
          ),
        );
        const rotation = new THREE.Euler().setFromQuaternion(orientation);
        const growth = (1.14 - t * 0.34) * k.range(0.82, 1.15);
        const tint = 0.92 + t * 0.08 + k.range(-0.02, 0.02);
        leaves.push({
          position: base.toArray(),
          rotation: [rotation.x, rotation.y, rotation.z],
          scale: [growth * k.range(0.86, 1.08), growth, k.range(0.75, 1.2)],
          habit: t > 0.78 ? 2 : k.random() < 0.5 ? 0 : 1,
          color: new THREE.Color().setRGB(tint, tint + 0.012, tint - 0.012),
        });
      }
    }
  }
  function leafyBranch(points, radius, leafNodes, angle) {
    const path = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(path, 12, radius, 5, false);
    const p = geometry.attributes.position,
      uv = geometry.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const t = uv.getX(i),
        center = path.getPointAt(t),
        taper = 1 - t * 0.74;
      p.setXYZ(
        i,
        center.x + (p.getX(i) - center.x) * taper,
        center.y + (p.getY(i) - center.y) * taper,
        center.z + (p.getZ(i) - center.z) * taper,
      );
    }
    geometry.computeVertexNormals();
    k.mesh(geometry, k.m.bark, [0, 0, 0], [0, 0, 0], g);
    leafPairs(path, leafNodes, angle);
    return path;
  }
  for (let branch = 0; branch < 7; branch++) {
    const angle = phase + branch * 2.399 + k.range(-0.22, 0.22),
      radius = k.range(0.25, 0.43);
    const end = new THREE.Vector3(
      Math.cos(angle) * radius,
      k.range(0.95, 1.16),
      Math.sin(angle) * radius,
    );
    const mid = end.clone().multiplyScalar(0.45);
    mid.y = k.range(0.72, 0.84);
    const path = leafyBranch(
      [new THREE.Vector3(0, 0.41, 0), mid, end],
      0.012,
      6,
      angle,
    );
    for (const t of [0.46, 0.73]) {
      const start = path.getPointAt(t),
        a = angle + (t < 0.6 ? -0.83 : 0.75);
      const tip = start
        .clone()
        .add(
          new THREE.Vector3(
            Math.cos(a) * 0.2,
            k.range(0.08, 0.2),
            Math.sin(a) * 0.2,
          ),
        );
      const elbow = start.clone().lerp(tip, 0.55);
      elbow.y += 0.035;
      leafyBranch([start, elbow, tip], 0.0045, 5, a);
    }
  }
  return { parent: g, leaves };
}

function curvedPetalGeometry() {
  const positions = [],
    uv = [],
    indices = [],
    rows = 12,
    columns = 8;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    for (let column = 0; column <= columns; column++) {
      const u = column / columns,
        side = u * 2 - 1;
      const width = 0.0175 * Math.sin(Math.PI * t) ** 0.55;
      positions.push(
        side * width,
        0.003 * Math.sin(t * Math.PI) +
          0.01 * t * t +
          0.003 * side * side * Math.sin(t * Math.PI) +
          side * 0.0017 * Math.sin(t * 5),
        t * 0.043,
      );
      uv.push(u, t);
    }
    if (row < rows)
      for (let column = 0; column < columns; column++) {
        const a = row * (columns + 1) + column,
          b = a + columns + 1;
        if (row > 0) indices.push(a, b, a + 1);
        if (row < rows - 1) indices.push(a + 1, b, b + 1);
      }
  }
  return geometryFrom(positions, indices, uv);
}

function flowersAtWaterEdge(k, parent, petalMaterial, centerMaterial) {
  const petalGeometry = curvedPetalGeometry();
  const centerGeometry = new THREE.SphereGeometry(0.006, 12, 8);
  for (let flower = 0; flower < 6; flower++) {
    const angle = flower * 2.4 + k.range(-0.3, 0.3),
      radius = k.range(0.19, 0.34);
    const x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius,
      height = k.range(1.12, 1.36);
    k.tube(
      [
        [0, 0.43, 0],
        [x * 0.55, height * 0.75, z * 0.55],
        [x, height, z],
      ],
      0.0028,
      k.m.leaf,
      parent,
    );
    const blossom = k.sub([x, height, z], angle, parent);
    blossom.rotation.x = k.range(-0.3, 0.32);
    blossom.rotation.z = k.range(-0.24, 0.24);
    for (let petal = 0; petal < 5; petal++) {
      const a = (petal * TAU) / 5 + k.range(-0.06, 0.06);
      const mesh = k.mesh(
        petalGeometry,
        petalMaterial,
        [0, 0, 0],
        [k.range(-0.12, 0.08), a, 0],
        blossom,
      );
      mesh.scale.set(
        k.range(0.88, 1.12),
        k.range(0.8, 1.2),
        k.range(0.88, 1.13),
      );
    }
    k.mesh(centerGeometry, centerMaterial, [0, 0.003, 0], [0, 0, 0], blossom);
  }
}

function teaOnBench(k, bench, timber) {
  const g = k.sub([-0.1, 0.513, 0.015], 0.12, bench);
  const ceramic = k.material(0x879077, 0.39),
    tea = k.material(0x4d3822, 0.2);
  k.box([0.48, 0.026, 0.31], [0, 0.013, 0], timber, g, 0.006);
  for (const side of [-1, 1]) {
    k.box([0.48, 0.025, 0.012], [0, 0.038, side * 0.149], timber, g, 0.003);
    k.box([0.012, 0.025, 0.29], [side * 0.234, 0.038, 0], timber, g, 0.003);
  }
  const pot = k.sub([-0.085, 0.031, -0.008], -0.2, g);
  k.lathe(
    [
      [0.04, 0],
      [0.055, 0.009],
      [0.073, 0.035],
      [0.067, 0.071],
      [0.045, 0.092],
      [0.026, 0.098],
    ],
    [0, 0, 0],
    ceramic,
    pot,
    32,
  );
  k.lathe(
    [
      [0, 0],
      [0.049, 0],
      [0.05, 0.009],
      [0.023, 0.017],
      [0, 0.018],
    ],
    [0, 0.095, 0],
    ceramic,
    pot,
    32,
  );
  k.sphere(0.011, [0, 0.119, 0], ceramic, pot, [0.85, 1, 0.85]);
  k.tube(
    [
      [0.055, 0.038, 0],
      [0.083, 0.057, 0],
      [0.095, 0.085, 0],
    ],
    0.009,
    ceramic,
    pot,
  );
  k.tube(
    [
      [-0.053, 0.019, 0],
      [-0.097, 0.025, 0],
      [-0.104, 0.062, 0],
      [-0.061, 0.079, 0],
    ],
    0.007,
    ceramic,
    pot,
  );
  for (const z of [-0.077, 0.078]) {
    k.lathe(
      [
        [0, 0],
        [0.033, 0],
        [0.048, 0.008],
        [0.05, 0.013],
        [0.042, 0.017],
        [0.026, 0.008],
        [0, 0.008],
      ],
      [0.113, 0.029, z],
      ceramic,
      g,
      28,
    );
    k.lathe(
      [
        [0.021, 0],
        [0.026, 0.004],
        [0.037, 0.041],
        [0.039, 0.057],
        [0.034, 0.057],
        [0.032, 0.042],
        [0.02, 0.009],
      ],
      [0.113, 0.041, z],
      ceramic,
      g,
      28,
    );
    k.cylinder(0.031, 0.002, [0.113, 0.086, z], tea, g, 0.031, 28);
  }
}

function willow(k, position) {
  const g = k.sub(position),
    leaves = [];
  k.tube(
    [
      [0, 0, 0],
      [0.08, 1.8, 0],
      [-0.06, 3.3, 0.08],
      [0.35, 5.7, 0.2],
    ],
    0.18,
    k.m.bark,
    g,
  );
  for (let branch = 0; branch < 14; branch++) {
    const angle = (branch * TAU) / 14,
      radius = k.range(2.1, 3.5),
      h = k.range(4.8, 6.2);
    const end = [Math.cos(angle) * radius, h, Math.sin(angle) * radius];
    k.tube(
      [[0, 2.8, 0], [end[0] * 0.4, h + 0.4, end[2] * 0.4], end],
      0.045,
      k.m.bark,
      g,
    );
    for (let strand = 0; strand < 7; strand++) {
      const x = end[0] + k.range(-0.4, 0.4),
        z = end[2] + k.range(-0.4, 0.4),
        length = k.range(1.25, 3.2);
      k.tube(
        [
          [x, h, z],
          [x + 0.15, h - length * 0.5, z + 0.13],
          [x + 0.25, h - length, z + 0.11],
        ],
        0.0055,
        k.m.bark,
        g,
      );
      for (let i = 0; i < 30; i++) {
        const t = i / 30;
        leaves.push({
          position: [
            x + 0.25 * t + (i % 2 ? -0.055 : 0.055),
            h - t * length,
            z + 0.11 * t,
          ],
          rotation: [0, angle + i * 0.45, Math.PI + (i % 2 ? -0.55 : 0.55)],
          scale: [0.85, 1, 1],
          color: new THREE.Color().setHSL(
            k.range(0.2, 0.25),
            0.3,
            k.range(0.3, 0.51),
          ),
        });
      }
    }
  }
  batch(
    k,
    leafGeometry(0.04, 0.21, 0.035, 2),
    windMaterial(k, 0xffffff, 0.024),
    leaves,
    { parent: g },
  );
}

function timberFootbridge(k, position, stone, timber) {
  const g = k.sub(position);
  for (const side of [-1, 1]) {
    k.box([0.48, 1.1, 1.25], [side * 2.62, -0.43, 0], stone, g, 0.014);
    k.box([5.9, 0.22, 0.14], [0, 0.07, side * 0.39], timber, g, 0.005);
    k.box([1.1, 0.13, 1.2], [side * 3.15, 0.03, 0], stone, g, 0.012);
    for (const x of [-2.65, -1.32, 0, 1.32, 2.65])
      k.box([0.09, 1.02, 0.09], [x, 0.7, side * 0.48], timber, g, 0.004);
    for (const y of [0.59, 1.18])
      k.box([5.6, 0.075, 0.085], [0, y, side * 0.48], timber, g, 0.004);
  }
  for (let x = -2.89; x < 2.9; x += 0.17)
    k.box([0.157, 0.055, 1.02], [x, 0.21, 0], timber, g, 0.004);
}

function fracturedPaver(k, entry, stone, mortar) {
  const g = k.sub(
    [entry.position[0], entry.position[1] - 0.044, entry.position[2]],
    entry.rotation[1],
  );
  k.box([0.447, 0.064, 0.486], [0, 0.016, 0], mortar, g, 0);
  const fragments = [
    [
      [-0.224, -0.243],
      [-0.112, -0.243],
      [0.041, -0.064],
      [-0.015, 0.047],
      [0.017, 0.243],
      [-0.224, 0.243],
    ],
    [
      [-0.1, -0.243],
      [0.224, -0.243],
      [0.224, 0.161],
      [0.187, 0.243],
      [0.029, 0.243],
      [-0.004, 0.05],
      [0.053, -0.066],
    ],
  ];
  fragments.forEach((outline, index) => {
    const shape = new THREE.Shape();
    outline.forEach(([x, z], point) =>
      point ? shape.lineTo(x, z) : shape.moveTo(x, z),
    );
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.081,
      bevelEnabled: false,
    });
    geometry.rotateX(-Math.PI / 2);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) * 2.2, uv.getY(i) * 2.2);
    k.mesh(
      geometry,
      stone,
      [0, index ? -0.0025 : 0, 0],
      [0, 0, index ? 0.004 : 0],
      g,
    );
  });
}

/**
 * An anonymous canal quarter informed by Naxi-associated old-town architecture:
 * timber and plaster frontages, deep tiled eaves, bridges and planted water edges.
 * The network, crossings and unequal façade bays are an original composition,
 * not a replica of a named square or a surveyed historic streetscape.
 */
export function buildNaxiCanal(definition, renderer) {
  const k = createOutdoorKit(renderer, seedFor(definition, 1928), {
    sunPosition: [-11, 22, -13],
    sunColor: 0xffe8c6,
    sunIntensity: 2.7,
    skyColor: 0xc1d2da,
    fogDensity: 0.006,
    exposure: 0.94,
  });
  const stone = tintedScan(k, k.m.stone, 0xacaea2);
  const bridgeStone = tintedScan(k, k.m.stone, 0xd8d7cc);
  const dampStone = tintedScan(k, k.m.stone, 0x626e5d, 0.73);
  reflectedCanalLight(k, [stone, dampStone]);
  const timber = tintedScan(k, k.m.cedar, 0x9d876d);
  const roofTile = tintedScan(k, k.m.stone, 0x777e78, 0.93);
  roofTile.side = THREE.DoubleSide;
  k.m.red.color.set(0x923e31);
  const tiles = [],
    pavers = [],
    retainingStones = [],
    dampStones = [],
    fracturedPavers = [],
    repairedPavers = [];
  const bend = (z) =>
    z < -16
      ? -Math.min(12, (-z - 16) ** 1.35 * 0.18)
      : z > 9
        ? (z - 9) * 0.08
        : 0;
  const canalWidth = (z) => 2.22 + 0.14 * Math.sin(z * 0.13);
  k.box([120, 0.4, 110], [0, -1.65, -4], dampStone, k.group, 0);
  const waterOrigin = -4;
  const water = k.water({
    width: 5,
    depth: 74,
    position: [0, -0.83, waterOrigin],
    color: 0x384e47,
  });
  const waterPositions = [],
    waterUV = [],
    waterIndices = [];
  for (let i = 0; i <= 146; i++) {
    const z = 31 - i * 0.5;
    for (const side of [-1, 1]) {
      waterPositions.push(
        bend(z) + side * (canalWidth(z) + 0.06),
        -z + waterOrigin,
        0,
      );
      waterUV.push((side + 1) / 2, i / 10);
    }
    if (i < 146) {
      const a = i * 2;
      waterIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const waterGeometry = geometryFrom(waterPositions, waterIndices, waterUV);
  for (const mesh of water.children)
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      mesh.geometry = waterGeometry.clone();
      k.geometries.add(mesh.geometry);
    }
  waterGeometry.dispose();
  for (let row = 0; row < 139; row++) {
    const z = 30 - row * 0.5,
      center = bend(z),
      width = canalWidth(z);
    for (const side of [-1, 1]) {
      const bankX = center + side * (width + 0.16);
      for (let course = 0; course < 5; course++) {
        const entry = {
          position: [
            bankX,
            -0.14 - course * 0.24,
            z + (course % 2 ? 0.12 : -0.12),
          ],
          scale: [0.32, 0.222, 0.486],
          rotation: [0, k.range(-0.012, 0.012), k.range(-0.018, 0.018)],
          color: new THREE.Color().setHSL(0.15, 0.045, k.range(0.72, 0.98)),
        };
        (course > 2 ? dampStones : retainingStones).push(entry);
      }
      retainingStones.push({
        position: [bankX + side * 0.05, 0.018, z],
        scale: [0.57, 0.15, 0.486],
        color: new THREE.Color().setHSL(0.15, 0.045, k.range(0.77, 0.95)),
      });
      const columns = side > 0 && z > -6.4 && z < 3.5 ? 18 : 8;
      for (let col = 0; col < columns; col++) {
        const entry = {
          position: [
            bankX + side * (0.45 + col * 0.46),
            -0.032 + k.range(-0.004, 0.004),
            z,
          ],
          scale: [0.448, 0.09, 0.487],
          rotation: [0, k.range(-0.012, 0.012), 0],
          color: new THREE.Color().setHSL(0.15, 0.055, k.range(0.75, 0.98)),
        };
        const fractured =
          (side < 0 &&
            ((z === 4 && col === 1) ||
              (z === 0.5 && col === 2) ||
              (z === -8 && col === 1))) ||
          (side > 0 && ((z === 2 && col === 1) || (z === -5.5 && col === 0)));
        const repaired =
          side > 0 && col === 2 && (z === 5 || z === 5.5 || z === 6);
        (fractured ? fracturedPavers : repaired ? repairedPavers : pavers).push(
          entry,
        );
      }
    }
  }
  batch(k, new THREE.BoxGeometry(1, 1, 1), stone, pavers);
  batch(
    k,
    new THREE.BoxGeometry(1, 1, 1),
    tintedScan(k, k.m.stone, 0xb7b5a6),
    repairedPavers,
  );
  const pavingMortar = tintedScan(k, k.m.ground, 0x747064);
  fracturedPavers.forEach((entry) =>
    fracturedPaver(k, entry, stone, pavingMortar),
  );
  batch(k, new THREE.BoxGeometry(1, 1, 1), stone, retainingStones);
  batch(k, new THREE.BoxGeometry(1, 1, 1), dampStone, dampStones);
  // Continuous banks fill the joints and extend beyond the visible street.
  for (const side of [-1, 1])
    k.box([43, 1.25, 100], [side * 27.4, -0.69, -3], stone, k.group, 0);
  const bridgeZ = -1.9;
  stoneBridge(k, stone, bridgeStone, [0, 0, bridgeZ]);
  k.box([2.8, 0.16, 2.7], [4.45, -0.04, bridgeZ], bridgeStone, k.group, 0.014);
  timberFootbridge(k, [bend(13.2), 0, 13.2], stone, timber);

  canalBuilding(k, [7.0, 0.02, -8.1], -0.12, {
    width: 7.4,
    depth: 5.4,
    floors: 2,
    veranda: true,
    bayCount: 4,
    weathered: true,
    tiles,
    tileMaterial: roofTile,
    wood: timber,
  });
  for (const [z, width, floors] of [
    [6.3, 5.6, 2],
    [0.4, 6.0, 2],
    [-5.6, 5.8, 2],
    [-11.55, 6.0, 2],
    [-17.6, 6.0, 2],
  ]) {
    canalBuilding(k, [-7.15 + bend(z), 0, z], Math.PI / 2, {
      width,
      depth: 4.8,
      floors,
      tiles,
      tileMaterial: roofTile,
      wood: timber,
    });
  }
  for (const z of [-17.7, -24, -30.4])
    canalBuilding(k, [6.95 + bend(z), 0, z], -Math.PI / 2, {
      width: 6.1,
      depth: 4.5,
      floors: 2,
      distant: true,
      tiles,
      tileMaterial: roofTile,
      wood: timber,
    });
  canalBuilding(k, [8.25, 0, 5.6], -Math.PI / 2, {
    width: 5.8,
    depth: 4.2,
    floors: 2,
    tiles,
    tileMaterial: roofTile,
    wood: timber,
  });
  canalBuilding(k, [13.1, 0, -1.7], -Math.PI / 2, {
    width: 10.1,
    depth: 4.6,
    floors: 2,
    distant: true,
    tiles,
    tileMaterial: roofTile,
    wood: timber,
  });
  for (const z of [-23.4, -29.5, -35.6])
    canalBuilding(k, [-7.15 + bend(z), 0, z], Math.PI / 2, {
      width: 6.2,
      depth: 4.8,
      floors: 2,
      distant: true,
      tiles,
      tileMaterial: roofTile,
      wood: timber,
    });
  canalBuilding(k, [-6.7, 0, -42], 0, {
    width: 18,
    depth: 4.8,
    floors: 2,
    distant: true,
    tiles,
    tileMaterial: roofTile,
    wood: timber,
  });
  for (const z of [12.2, 18.3, 24.4])
    for (const side of [-1, 1]) {
      canalBuilding(
        k,
        [side * 7.2 + bend(z), 0, z],
        side < 0 ? Math.PI / 2 : -Math.PI / 2,
        {
          width: 6.2,
          depth: 4.8,
          floors: 2,
          distant: true,
          tiles,
          tileMaterial: roofTile,
          wood: timber,
        },
      );
    }
  canalBuilding(k, [1.3, 0, 33.4], Math.PI, {
    width: 17.6,
    depth: 4.8,
    floors: 2,
    distant: true,
    tiles,
    tileMaterial: roofTile,
    wood: timber,
  });
  for (const side of [-1, 1])
    k.box(
      [0.25, 2.6, 13],
      [side < 0 ? -9.7 : 11.4, 1.3, -9.7],
      k.m.plaster,
      k.group,
      0.006,
    );
  const tileGeometry = new THREE.CylinderGeometry(
    0.087,
    0.087,
    0.36,
    7,
    1,
    true,
    Math.PI / 2,
    Math.PI,
  );
  batch(k, tileGeometry, roofTile, tiles);

  const smallLeaves = [0, 1, 2].map((habit) =>
    photographicLeafGeometry(0.085, 0.17, habit),
  );
  const shrubMaterial = windMaterial(k, 0xffffff, 0.014);
  const photographicLeaves = k.leafMaterial("broadleaf");
  for (const property of [
    "map",
    "normalMap",
    "roughnessMap",
    "roughness",
    "alphaTest",
    "alphaToCoverage",
    "side",
  ])
    shrubMaterial[property] = photographicLeaves[property];
  shrubMaterial.normalScale.copy(photographicLeaves.normalScale);
  shrubMaterial.roughness *= 0.95;
  shrubMaterial.userData.photographicFoliage = "broadleaf";
  const ivoryPetal = k.material(0xd9ceb2, 0.87),
    rosePetal = k.material(0xbd8f87, 0.9);
  const petalMap = k.texture(
    (c, size) => {
      const gradient = c.createLinearGradient(0, 0, 0, size);
      gradient.addColorStop(0, "#d1c5b4");
      gradient.addColorStop(0.7, "#ede7d9");
      gradient.addColorStop(1, "#e4ddcf");
      c.fillStyle = gradient;
      c.fillRect(0, 0, size, size);
      c.strokeStyle = "#ffffff42";
      c.lineWidth = 1;
      for (let vein = -4; vein <= 4; vein++) {
        c.beginPath();
        c.moveTo(size / 2 + vein * 3, 0);
        c.quadraticCurveTo(
          size / 2 + vein * 13,
          size * 0.55,
          size / 2 + vein * 21,
          size,
        );
        c.stroke();
      }
    },
    [1, 1],
    128,
  );
  for (const petal of [ivoryPetal, rosePetal]) {
    petal.map = petalMap;
    petal.bumpMap = petalMap;
    petal.bumpScale = 0.00015;
    petal.side = THREE.DoubleSide;
    petal.roughness = 0.76;
  }
  const flowerCenter = k.material(0xb3a16a, 0.93);
  const shrubEntries = [[], [], []];
  for (const [x, z, scale] of [
    [-2.95, 7.9, 1.1],
    [-2.93, 4.5, 1.05],
    [-2.96, 1.5, 1],
    [-2.94, -1, 0.92],
    [3.13, 7.2, 1.22],
    [3.22, 3.15, 1.05],
    [4.35, -2.1, 1.0],
    [3.05, -6.5, 0.87],
    [-3.05, -7.5, 1.05],
    [3.1, -11.2, 1],
    [-3.45, -12.4, 0.9],
  ]) {
    const planterData = planter(k, [x, 0.1, z], { scale });
    if (z === 4.5 || z === 3.15)
      flowersAtWaterEdge(
        k,
        planterData.parent,
        z === 4.5 ? ivoryPetal : rosePetal,
        flowerCenter,
      );
    planterData.parent.updateWorldMatrix(true, false);
    const transform = new THREE.Object3D();
    for (const leaf of planterData.leaves) {
      transform.position.set(...leaf.position);
      transform.rotation.set(...leaf.rotation);
      transform.scale.set(...leaf.scale);
      transform.updateMatrix();
      shrubEntries[leaf.habit].push({
        matrix: planterData.parent.matrixWorld
          .clone()
          .multiply(transform.matrix),
        color: leaf.color,
      });
    }
  }
  shrubEntries.forEach((entries, habit) =>
    batch(k, smallLeaves[habit], shrubMaterial, entries),
  );
  willow(k, [-0.35, -0.03, -15.25]);
  k.tree([-4.1, 0.05, 2.8], { height: 8.4, radius: 3.7 });
  k.tree([4.55, 0.02, 1.8], { height: 5.5, radius: 2.5 });
  k.tree([-4.55, 0.04, -20.5], { height: 6.5, radius: 2.8 });
  for (const z of [5.1, -0.5]) {
    const bench = k.sub([-4.12, 0, z], Math.PI / 2);
    for (const x of [-0.72, 0.72]) {
      for (const side of [-1, 1]) {
        k.box(
          [0.1, 0.035, 0.12],
          [x, -0.008, side * 0.22],
          k.m.iron,
          bench,
          0.004,
        );
        k.rod(
          [x, 0.0095, side * 0.22],
          [x, 0.457, side * 0.17],
          0.019,
          k.m.iron,
          bench,
          0.025,
        );
      }
      k.rod([x, 0.443, -0.19], [x, 0.443, 0.2], 0.02, k.m.iron, bench);
      k.box([0.11, 0.66, 0.1], [x, 0.66, -0.22], timber, bench, 0.005);
    }
    k.rod([-0.72, 0.18, 0], [0.72, 0.18, 0], 0.013, k.m.iron, bench);
    for (let i = 0; i < 4; i++)
      k.box(
        [1.8, 0.052, 0.095],
        [0, 0.48, -0.17 + i * 0.115],
        timber,
        bench,
        0.004,
      );
    for (const y of [0.69, 0.86])
      k.box([1.83, 0.13, 0.06], [0, y, -0.24], timber, bench, 0.004);
    if (z === -0.5) teaOnBench(k, bench, timber);
  }
  for (let i = 0; i < 54; i++) {
    const z = k.range(-17, 11),
      side = k.random() > 0.5 ? 1 : -1;
    k.sphere(
      0.046,
      [bend(z) + side * (canalWidth(z) - 0.02), k.range(-0.81, -0.43), z],
      dampStone,
      k.group,
      [1.2, 1.8, 0.9],
    );
  }

  return k.finish(
    definition,
    {
      arrival: outdoorView(
        "A Naxi canal quarter",
        [-3.04, 1.66, 5.85],
        [0.9, 1.5, -3.7],
        59,
      ),
      bridge: outdoorView(
        "On the stone bridge",
        [-0.85, 2.39, bridgeZ],
        [5.1, 2.75, -6.7],
        65,
      ),
      stream: outdoorView(
        "At the canal edge",
        [3.65, 1.37, 2.6],
        [-0.9, -0.35, bridgeZ],
        59,
      ),
      lattice: outdoorView(
        "Tea bench & timber doorway",
        [-3.52, 1.55, 2.35],
        [-4.15, 0.94, -0.3],
        61,
      ),
    },
    [
      [0, 1.16, bridgeZ + 1.01],
      [0.1, -0.72, 2.05],
      [-4.7, 1.68, 0.45],
      [-2.93, 1.16, 4.5],
    ],
  );
}
