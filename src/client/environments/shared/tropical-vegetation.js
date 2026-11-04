import * as THREE from "three";
import { laminaGeometry, shapedTimber } from "./natural-forms.js";

/** Connected pinnate crowns and broad understory leaves, shared by fields and gardens. */
export function tropicalVegetation(k) {
  const time = { value: 0 };
  const leaf = k.material(0xffffff, 0.83);
  leaf.side = THREE.DoubleSide;
  leaf.userData.patinaProfile = "none";
  leaf.map = k.texture(
    (c, size) => {
      const color = c.createLinearGradient(0, 0, size, 0);
      color.addColorStop(0, "#7b875e");
      color.addColorStop(0.47, "#c0c99b");
      color.addColorStop(0.5, "#e0d9a8");
      color.addColorStop(0.53, "#bac591");
      color.addColorStop(1, "#7c8b62");
      c.fillStyle = color;
      c.fillRect(0, 0, size, size);
      for (let y = -size; y < size; y += 7) {
        c.strokeStyle = "#e7ecc142";
        c.lineWidth = 0.8;
        c.beginPath();
        c.moveTo(0, y + size * 0.2);
        c.lineTo(size * 0.5, y);
        c.lineTo(size, y + size * 0.2);
        c.stroke();
      }
    },
    [1, 1],
    256,
  );
  leaf.bumpMap = leaf.map;
  leaf.bumpScale = 0.0007;
  const stalk = k.material(0x718051, 0.9);
  stalk.userData.patinaProfile = "none";
  leaf.onBeforeCompile = (shader) => {
    shader.uniforms.livingLeafTime = time;
    shader.vertexShader = `uniform float livingLeafTime;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float phase = dot(instanceMatrix[3].xyz, vec3(1.7, 0.9, 2.3));
        transformed.z += sin(livingLeafTime * 0.8 + phase) * 0.013 * position.y * position.y;
      #endif`,
    );
  };
  leaf.customProgramCacheKey = () => "rooted-tropical-leaf-v1";
  k.animations.push((_, elapsed) => {
    time.value = elapsed;
  });
  const palmLeaf = k.ownGeometry(
    laminaGeometry({ length: 1, width: 0.085, bend: -0.18, segments: 12 }),
  );
  const broadLeaf = k.ownGeometry(
    laminaGeometry({ length: 1, width: 0.32, bend: -0.37, segments: 28 }),
  );
  const distantPalmLeaf = k.ownGeometry(
    laminaGeometry({
      length: 1,
      width: 0.085,
      bend: -0.18,
      segments: 5,
      columns: 2,
    }),
  );
  const up = new THREE.Vector3(0, 1, 0);
  const matrix = new THREE.Object3D();
  function leaves(parent, geometry, entries, distantGeometry) {
    const mesh = new THREE.InstancedMesh(geometry, leaf, entries.length);
    entries.forEach((entry, i) => {
      matrix.position.fromArray(entry.position);
      const axis = new THREE.Vector3(...entry.direction).normalize();
      const across = new THREE.Vector3().crossVectors(axis, up).normalize();
      const normal = new THREE.Vector3().crossVectors(across, axis);
      matrix.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(across, axis, normal),
      );
      matrix.scale.set(...entry.scale);
      matrix.updateMatrix();
      mesh.setMatrixAt(i, matrix.matrix);
      mesh.setColorAt(
        i,
        new THREE.Color().setHSL(
          0.23 + k.range(-0.025, 0.025),
          k.range(0.36, 0.53),
          k.range(0.44, 0.67),
        ),
      );
    });
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    if (distantGeometry) {
      const distant = new THREE.InstancedMesh(
        distantGeometry,
        leaf,
        entries.length,
      );
      distant.instanceMatrix = mesh.instanceMatrix.clone();
      distant.instanceColor = mesh.instanceColor.clone();
      distant.castShadow = distant.receiveShadow = true;
      distant.computeBoundingSphere();
      const lod = new THREE.LOD();
      lod.position.copy(mesh.boundingSphere.center);
      mesh.position.copy(lod.position).negate();
      distant.position.copy(mesh.position);
      lod.addLevel(mesh, 0);
      lod.addLevel(distant, 24, 0.12);
      parent.add(lod);
    } else parent.add(mesh);
    return mesh;
  }
  function palm(
    position,
    { height = 7, radius = height * 0.4, parent = k.group } = {},
  ) {
    const group = k.sub(position, k.range(0, Math.PI * 2), parent);
    group.name = "Rooted coconut palm";
    shapedTimber(
      k,
      [0, -0.09, 0],
      [0, height, 0],
      height * 0.052,
      k.m.bark,
      group,
      {
        round: true,
        taper: 0.55,
        bend: height * 0.02,
        relief: 0.004,
        seed: height,
      },
    );
    for (let y = 0.2; y < height - 0.2; y += 0.17)
      k.ring(
        height * 0.026 * (1 - (0.55 * y) / height),
        0.004,
        [
          height * 0.02 * Math.sin((y / height) * Math.PI),
          y,
          height *
            0.007 *
            Math.sin((y / height) * Math.PI) *
            Math.sin((y / height) * Math.PI * 0.7),
        ],
        k.m.bark,
        group,
      );
    const entries = [];
    for (let frond = 0; frond < 19; frond++) {
      const angle = frond * 2.39996;
      const reach = radius * k.range(0.73, 1.05);
      const rise = radius * k.range(0.12, 0.43);
      const fall = radius * k.range(0.16, 0.42);
      const point = (t) => [
        Math.cos(angle) * reach * t,
        height + Math.sin(Math.PI * t) * rise - fall * t * t,
        Math.sin(angle) * reach * t,
      ];
      k.tube([0, 0.2, 0.45, 0.7, 1].map(point), 0.014, k.m.jade, group);
      for (let pair = 0; pair < 29; pair++) {
        const t = 0.13 + (pair / 29) * 0.83;
        for (const side of [-1, 1]) {
          const size = ((0.25 + Math.sin(t * Math.PI) * 0.85) * radius) / 2.6;
          entries.push({
            position: point(t),
            direction: [
              -Math.sin(angle) * side + Math.cos(angle) * 0.38,
              -0.24 - t * 0.3,
              Math.cos(angle) * side + Math.sin(angle) * 0.38,
            ],
            scale: [k.range(0.82, 1.12), size, size],
          });
        }
      }
    }
    leaves(group, palmLeaf, entries, distantPalmLeaf);
    for (let i = 0; i < 5; i++)
      k.sphere(
        0.115,
        [Math.cos(i * 2.4) * 0.18, height - 0.22, Math.sin(i * 2.4) * 0.18],
        stalk,
        group,
        [0.8, 1.1, 0.8],
      );
    return group;
  }
  function understory(position, { height = 1.5, parent = k.group } = {}) {
    const group = k.sub(position, k.range(0, Math.PI * 2), parent);
    group.name = "Connected broadleaf understory";
    shapedTimber(
      k,
      [0, -0.04, 0],
      [0, height * 0.6, 0],
      height * 0.07,
      stalk,
      group,
      { round: true, taper: 0.65, relief: 0.001 },
    );
    const entries = [];
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.399;
      const y = height * k.range(0.43, 0.7);
      const root = [
        Math.cos(angle) * height * 0.16,
        y,
        Math.sin(angle) * height * 0.16,
      ];
      k.tube(
        [[0, height * 0.25, 0], [root[0] * 0.5, y * 0.8, root[2] * 0.5], root],
        0.012,
        k.m.jade,
        group,
      );
      const size = height * k.range(0.55, 0.83);
      entries.push({
        position: root,
        direction: [Math.cos(angle), k.range(0.3, 0.95), Math.sin(angle)],
        scale: [size, size, size],
      });
    }
    leaves(group, broadLeaf, entries);
    return group;
  }
  return { palm, understory };
}
