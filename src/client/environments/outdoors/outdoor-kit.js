import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createEnvironmentKit } from "../shared/environment-kit.js";
import { createRecordedSoundscape } from "../shared/recorded-soundscape.js";
import { getSoundscapeProfile } from "../shared/soundscape-profiles.js";
import { createOutdoorWater } from "./outdoor-water.js";
import { configureOutdoorMaterialScale } from "./outdoor-material-scale.js";
import { createOutdoorTree } from "./outdoor-foliage.js";
import { addOutdoorWearPatch } from "./outdoor-weathering.js";

export function outdoorView(label, position, target, fov = 60) {
  return { label, position, target, fov };
}

/** Metre-scale construction, daylight and locally stored material scans. */
export function createOutdoorKit(renderer, seed = 73, options = {}) {
  const k = createEnvironmentKit(renderer, seed);
  const owned = new Set(),
    pending = [],
    reflectors = [],
    geometries = new Set();
  const imageBitmaps = new Set();
  let disposed = false;
  const originalBox = k.box,
    originalFinish = k.finish;
  const anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const loader = new THREE.TextureLoader();
  k.surfaceMaterial = (
    id,
    { color = 0xffffff, scale = 1.2, normalStrength = 0.3 } = {},
  ) => {
    if (!["peeling-paint", "worn-plaster", "weathered-wood"].includes(id))
      throw new Error(`Unknown downloaded detail surface: ${id}`);
    const material = k.material(color, 1);
    const prefix = `/public/outdoors/detail-assets/${id}`;
    material.map = k.imageTexture(`${prefix}_diff_2k.jpg`, { repeat: true });
    material.normalMap = k.imageTexture(`${prefix}_nor_gl_2k.jpg`, {
      data: true,
      repeat: true,
    });
    material.roughnessMap = k.imageTexture(`${prefix}_rough_2k.jpg`, {
      data: true,
      repeat: true,
    });
    material.normalScale.set(normalStrength, normalStrength);
    material.userData.metresPerRepeat = scale;
    return material;
  };
  k.wearPatch = (position, options) =>
    addOutdoorWearPatch(k, position, options);
  const photographicLeaves = new Map();
  k.leafMaterial = (kind = "broadleaf") => {
    if (!["broadleaf", "grass"].includes(kind))
      throw new Error(`Unknown photographic foliage: ${kind}`);
    if (!photographicLeaves.has(kind)) {
      const material = k.material(0xffffff, 0.82);
      const prefix = `/public/outdoors/detail-assets/foliage/${kind}`;
      material.map = k.imageTexture(`${prefix}-cutout.png`);
      material.normalMap = k.imageTexture(`${prefix}-normal-gl.jpg`, {
        data: true,
      });
      material.roughnessMap = k.imageTexture(`${prefix}-roughness.jpg`, {
        data: true,
      });
      material.normalScale.set(0.28, 0.28);
      material.alphaTest = 0.42;
      material.alphaToCoverage = true;
      material.side = THREE.DoubleSide;
      material.userData.photographicFoliage = kind;
      photographicLeaves.set(kind, material);
    }
    return photographicLeaves.get(kind);
  };
  const modelLoader = new GLTFLoader(),
    modelTemplates = new Map();
  k.model = (
    url,
    position,
    { height, angle = 0, parent = k.group, packedOcclusion = false } = {},
  ) => {
    if (
      !url.startsWith("/public/outdoors/") ||
      (height !== undefined && (!Number.isFinite(height) || height <= 0))
    )
      throw new Error(
        "An outdoor model needs a local URL and a positive target height.",
      );
    const holder = k.sub(position, angle, parent);
    holder.userData.asset = url;
    if (!modelTemplates.has(url)) {
      modelTemplates.set(
        url,
        modelLoader.loadAsync(url).then((gltf) => {
          const resources = new Set(),
            modelImages = new Set();
          gltf.scene.traverse((object) => {
            if (!object.isMesh) return;
            object.castShadow = object.receiveShadow = true;
            resources.add(object.geometry);
            geometries.add(object.geometry);
            for (const material of Array.isArray(object.material)
              ? object.material
              : [object.material]) {
              resources.add(material);
              owned.add(material);
              for (const value of Object.values(material))
                if (value?.isTexture) {
                  resources.add(value);
                  owned.add(value);
                  value.anisotropy = anisotropy;
                  if (typeof value.image?.close === "function") {
                    imageBitmaps.add(value.image);
                    modelImages.add(value.image);
                  }
                }
            }
          });
          if (disposed) {
            resources.forEach((resource) => resource.dispose());
            modelImages.forEach((image) => image.close());
          }
          return gltf.scene;
        }),
      );
    }
    pending.push(
      modelTemplates.get(url).then((template) => {
        if (disposed) return;
        const model = template.clone(true);
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        if (size.y <= 0)
          throw new Error(`The model has no physical height: ${url}`);
        if (height !== undefined) model.scale.multiplyScalar(height / size.y);
        model.updateMatrixWorld(true);
        bounds.setFromObject(model);
        const center = bounds.getCenter(new THREE.Vector3());
        model.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
        if (packedOcclusion)
          model.traverse((object) => {
            if (!object.isMesh) return;
            const configure = (source) => {
              const material = source.clone();
              owned.add(material);
              if (!material.aoMap && material.roughnessMap) {
                material.aoMap = material.roughnessMap;
                material.aoMapIntensity = 0.7;
                material.needsUpdate = true;
              }
              return material;
            };
            object.material = Array.isArray(object.material)
              ? object.material.map(configure)
              : configure(object.material);
          });
        holder.add(model);
      }),
    );
    return holder;
  };
  function scanned(slot, color, scale = 1) {
    const mat = k.material(color, 1);
    for (const [suffix, property] of [
      ["diff", "map"],
      ["nor_gl", "normalMap"],
      ["rough", "roughnessMap"],
    ]) {
      let resolve, reject;
      pending.push(
        new Promise((yes, no) => {
          resolve = yes;
          reject = no;
        }),
      );
      const map = loader.load(
        `/public/outdoors/materials/${slot}_${suffix}.jpg`,
        resolve,
        undefined,
        () =>
          reject(
            new Error(
              `Outdoor ${slot} ${suffix} material could not be loaded.`,
            ),
          ),
      );
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.colorSpace =
        suffix === "diff" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      map.anisotropy = anisotropy;
      mat[property] = map;
      owned.add(map);
    }
    mat.normalScale.set(0.48, 0.48);
    mat.userData.metresPerRepeat = scale;
    return mat;
  }
  k.m.stone = scanned("rock", 0xe6ddcd, 2);
  // Individual modeled pavers need stone grain, not another grid of photographed joints.
  k.m.cobble = k.m.stone.clone();
  k.m.cobble.color.set(0xc3bbae);
  k.m.cobble.normalScale.set(0.35, 0.35);
  owned.add(k.m.cobble);
  k.m.brick = scanned("brick", 0xd0a58a, 2);
  k.m.ground = scanned("ground", 0xaeb392, 2);
  k.m.terracotta = k.m.pot;
  k.m.plaster.color.set(0xf2eddf);
  k.m.cedar.color.set(0xb7a58b);
  k.m.cedar.roughness = 0.88;
  k.m.cedar.roughnessMap = null;
  for (const mat of [k.m.plaster, k.m.cedar, k.m.bark, k.m.floor])
    mat.userData.metresPerRepeat = mat === k.m.cedar ? 1.2 : 2;
  k.geometries = geometries;

  k.box = (
    size,
    position,
    mat = k.m.cedar,
    parent = k.group,
    bevel = 0.008,
    rotation = [0, 0, 0],
  ) => {
    const object = originalBox(size, position, mat, parent, bevel, rotation);
    const scale = mat.userData.metresPerRepeat;
    if (scale) {
      const { position: p, normal: n, uv } = object.geometry.attributes;
      const offset = k.random() * 3;
      for (let i = 0; i < p.count; i++) {
        const x = Math.abs(n.getX(i)),
          y = Math.abs(n.getY(i)),
          z = Math.abs(n.getZ(i));
        const u = x > y && x > z ? p.getZ(i) : p.getX(i);
        const v = y > x && y > z ? p.getZ(i) : p.getY(i);
        uv.setXY(i, u / scale + offset, v / scale + offset * 0.63);
      }
    }
    return object;
  };

  k.paving = ({
    width,
    depth,
    position = [0, 0, 0],
    stoneSize = 0.45,
    material = k.m.cobble,
  }) => {
    const g = k.sub(position);
    k.box([width, 0.12, depth], [0, -0.09, 0], k.m.ground, g, 0);
    const colors = Array.from({ length: 5 }, (_, i) => {
      const mat = material.clone();
      mat.color.offsetHSL(0, 0, (i - 2) * 0.018);
      owned.add(mat);
      return mat;
    });
    const rows = Math.ceil(depth / stoneSize),
      columns = Math.ceil(width / stoneSize);
    const dz = depth / rows,
      dx = width / columns;
    for (let row = 0; row < rows; row++)
      for (let col = 0; col <= columns; col++) {
        const start = -width / 2 + (col - (row % 2) * 0.5) * dx;
        const lo = Math.max(-width / 2, start),
          hi = Math.min(width / 2, start + dx);
        if (hi - lo < 0.02) continue;
        const stone = k.box(
          [hi - lo - 0.012, 0.09, dz - 0.013],
          [
            (hi + lo) / 2,
            -0.025 + k.range(-0.006, 0.006),
            -depth / 2 + (row + 0.5) * dz,
          ],
          colors[(col + row * 3) % colors.length],
          g,
          0.009,
        );
        stone.rotation.y = k.range(-0.013, 0.013);
      }
    return g;
  };

  const leafMap = k.texture(
    (c, s) => {
      c.clearRect(0, 0, s, s);
      const fill = c.createLinearGradient(0, 0, s, s);
      fill.addColorStop(0, "#899951");
      fill.addColorStop(0.5, "#526d37");
      fill.addColorStop(1, "#263f25");
      c.fillStyle = fill;
      c.beginPath();
      c.moveTo(s / 2, 6);
      c.bezierCurveTo(s * 0.96, s * 0.3, s * 0.98, s * 0.7, s / 2, s - 6);
      c.bezierCurveTo(s * 0.05, s * 0.7, s * 0.04, s * 0.3, s / 2, 6);
      c.fill();
      c.strokeStyle = "#c0bc7560";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(s / 2, 7);
      c.lineTo(s / 2, s - 8);
      c.stroke();
      c.lineWidth = 0.8;
      for (let i = 2; i < 12; i++)
        for (const sign of [-1, 1]) {
          c.beginPath();
          c.moveTo(s / 2, (i * s) / 13);
          c.lineTo(
            s / 2 + sign * s * 0.32 * Math.sin((i / 13) * Math.PI),
            ((i - 1.3) * s) / 13,
          );
          c.stroke();
        }
    },
    [1, 1],
    128,
  );
  const foliage = k.material(0xffffff, 0.78);
  foliage.map = leafMap;
  foliage.alphaTest = 0.42;
  foliage.alphaToCoverage = true;
  foliage.side = THREE.DoubleSide;
  k.tree = (position, options) =>
    createOutdoorTree(
      k,
      {
        broadleaf: k.leafMaterial("broadleaf"),
        palm: foliage,
      },
      position,
      options,
    );

  k.water = ({ width, depth, position = [0, 0, 0], color = 0x466e68 }) => {
    const g = k.sub(position);
    const mirror = createOutdoorWater({ width, depth, color });
    g.add(mirror);
    k.animated.add(mirror);
    reflectors.push(mirror);
    k.animations.push((delta, elapsed) => {
      mirror.material.uniforms.waterTime.value = elapsed;
    });

    return g;
  };

  const sunPosition = options.sunPosition ?? [-12, 18, 10];
  const sun = new THREE.DirectionalLight(
    options.sunColor ?? 0xffe5bd,
    options.sunIntensity ?? 3.1,
  );
  sun.position.set(...sunPosition);
  sun.target.position.set(0, 1, 0);
  sun.castShadow = true;
  const shadowSize = Math.min(4096, renderer.capabilities.maxTextureSize);
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, {
    left: -23,
    right: 23,
    bottom: -23,
    top: 23,
    near: 0.1,
    far: 110,
  });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0001;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  k.group.add(sun, sun.target);
  k.group.add(
    new THREE.HemisphereLight(
      options.skyColor ?? 0xbad4e5,
      0x8f7e64,
      options.ambientIntensity ?? 0.45,
    ),
  );

  k.finish = (definition, views, anchors, settings = {}) => {
    const refreshMaterials = [];
    k.group.traverse((object) => {
      if (!object.isMesh) return;
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        if (material !== k.m.cedar && material.map === k.m.cedar.map)
          material.userData.diffuseDetailMode = "tinted-grain";
        const refresh = configureOutdoorMaterialScale(material);
        if (refresh) refreshMaterials.push(refresh);
      }
    });
    const runtime = originalFinish(definition, views, anchors, {
      exposure: options.exposure ?? 0.88,
      environmentIntensity: 0.18,
      ...settings,
      soundscape: createRecordedSoundscape(getSoundscapeProfile(definition.id)),
    });
    runtime.background = options.skyColor ?? 0xbad0dc;
    runtime.fog = {
      color: options.skyColor ?? 0xbad0dc,
      density: options.fogDensity ?? 0.006,
    };
    runtime.outdoor = true;
    runtime.sun = sun;
    runtime.aoScale = 0.75;
    runtime.ready = Promise.all([runtime.ready, ...pending]).then(() => {
      if (disposed) return;
      refreshMaterials.forEach((refresh) => refresh());
    });

    runtime.captureReflections = () => {
      sun.shadow.autoUpdate = false;
      sun.shadow.needsUpdate = true;
    };
    const dispose = runtime.dispose;
    runtime.dispose = () => {
      if (disposed) return;
      disposed = true;

      reflectors.forEach((reflector) => {
        reflector.geometry.dispose();
        reflector.dispose();
      });
      geometries.forEach((geometry) => geometry.dispose());
      owned.forEach((resource) => resource.dispose());
      imageBitmaps.forEach((image) => image.close());
      k.group.traverse((object) => {
        if (object.isInstancedMesh) object.dispose();
      });
      dispose();
    };
    return runtime;
  };
  return k;
}
