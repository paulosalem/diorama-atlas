import * as THREE from "three";

// Shared, local, colour-managed material maps. No generation or network service is
// required when the visitor opens a scene.
export function createRiadMaterials(renderer) {
  const maps = new Map();
  const loader = new THREE.TextureLoader();
  const anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const owned = new Set();
  const pending = [];
  function scanned(asset, color, repeat, roughness = 1) {
    const params = { color, roughness };
    for (const [suffix, slot] of [
      ["diff", "map"],
      ["nor_gl", "normalMap"],
      ["rough", "roughnessMap"],
    ]) {
      const key = `${asset}/${suffix}/${repeat}`;
      let texture = maps.get(key);
      if (!texture) {
        let resolve, reject;
        pending.push(
          new Promise((yes, no) => {
            resolve = yes;
            reject = no;
          }),
        );
        texture = loader.load(
          `/public/riad/materials/${asset}_${suffix}.jpg`,
          resolve,
          undefined,
          reject,
        );
        texture.colorSpace =
          suffix === "diff" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(...repeat);
        texture.anisotropy = anisotropy;
        maps.set(key, texture);
        owned.add(texture);
      }
      params[slot] = texture;
    }
    const mat = new THREE.MeshStandardMaterial(params);
    mat.normalScale.set(0.55, 0.55);
    owned.add(mat);
    return mat;
  }
  function plain(color, roughness = 0.65, metalness = 0) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    owned.add(mat);
    return mat;
  }
  function canvasTexture(draw, repeat = [1, 1], size = 1024, color = true) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    draw(canvas.getContext("2d"), size);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(...repeat);
    map.anisotropy = anisotropy;
    owned.add(map);
    return map;
  }
  let seed = 742;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const micro = canvasTexture(
    (c, s) => {
      c.fillStyle = "#888";
      c.fillRect(0, 0, s, s);
      for (let i = 0; i < 65000; i++) {
        c.fillStyle = `rgba(${random() > 0.5 ? "255,255,255" : "0,0,0"},${random() * 0.18})`;
        c.fillRect(
          random() * s,
          random() * s,
          1 + random() * 3,
          1 + random() * 2,
        );
      }
    },
    [2, 2],
    512,
    false,
  );
  const textile = canvasTexture((c, s) => {
    c.fillStyle = "#79533e";
    c.fillRect(0, 0, s, s);
    const bands = [
      "#8b4935",
      "#b89967",
      "#273d40",
      "#d5bd8a",
      "#673b31",
      "#332e2a",
    ];
    for (let x = 0; x < s; x += 128) {
      c.fillStyle = bands[(x / 128) % bands.length];
      c.fillRect(x, 0, 92, s);
      c.fillStyle = "#c6a376";
      c.fillRect(x + 96, 0, 7, s);
      c.fillRect(x + 118, 0, 4, s);
      for (let y = -64; y < s; y += 128) {
        c.strokeStyle = "#d2b383";
        c.lineWidth = 8;
        c.beginPath();
        c.moveTo(x + 46, y + 8);
        c.lineTo(x + 82, y + 60);
        c.lineTo(x + 46, y + 112);
        c.lineTo(x + 10, y + 60);
        c.closePath();
        c.stroke();
        c.strokeStyle = "#342f27";
        c.lineWidth = 5;
        c.stroke();
      }
    }
    for (let y = 0; y < s; y += 3) {
      c.fillStyle = y % 2 ? "#ffffff12" : "#00000022";
      c.fillRect(0, y, s, 1);
    }
    for (let x = 0; x < s; x += 3) {
      c.fillStyle = "#f7e0b714";
      c.fillRect(x, 0, 1, s);
    }
  });
  const carving = canvasTexture(
    (c, s) => {
      c.fillStyle = "#666";
      c.fillRect(0, 0, s, s);
      c.strokeStyle = "#ddd";
      c.lineWidth = 8;
      for (let y = -128; y < s + 128; y += 128)
        for (let x = -128; x < s + 128; x += 128) {
          for (let a = 0; a < 8; a++) {
            c.save();
            c.translate(x + 64, y + 64);
            c.rotate((a * Math.PI) / 4);
            c.beginPath();
            c.moveTo(0, 0);
            c.bezierCurveTo(-34, -16, -24, -51, 0, -61);
            c.bezierCurveTo(24, -51, 34, -16, 0, 0);
            c.stroke();
            c.restore();
          }
          c.beginPath();
          c.arc(x + 64, y + 64, 13, 0, Math.PI * 2);
          c.stroke();
        }
    },
    [1, 1],
    1024,
    false,
  );
  const leafMap = canvasTexture(
    (c, s) => {
      c.clearRect(0, 0, s, s);
      const g = c.createLinearGradient(0, 0, s, s);
      g.addColorStop(0, "#34492b");
      g.addColorStop(0.5, "#6c8245");
      g.addColorStop(1, "#193826");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(s / 2, 0);
      c.bezierCurveTo(s, s * 0.3, s * 0.95, s * 0.8, s / 2, s);
      c.bezierCurveTo(s * 0.08, s * 0.8, 0, s * 0.3, s / 2, 0);
      c.fill();
      c.strokeStyle = "#95a46b";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(s / 2, 0);
      c.lineTo(s / 2, s);
      c.stroke();
      c.lineWidth = 1.5;
      for (let i = 1; i < 12; i++)
        for (const sign of [-1, 1]) {
          c.beginPath();
          c.moveTo(s / 2, (i * s) / 12);
          c.lineTo(
            s / 2 + sign * s * 0.3 * Math.sin((i / 12) * Math.PI),
            ((i - 1.7) * s) / 12,
          );
          c.stroke();
        }
    },
    [1, 1],
    256,
  );
  const plaster = scanned("plastered_wall_02", 0xeee2cc, [0.42, 0.75]);
  for (const map of [plaster.map, plaster.normalMap, plaster.roughnessMap])
    map.offset.set(0.28, 0.13);
  plaster.normalScale.set(0.3, 0.3);
  const carved = plaster.clone();
  carved.bumpMap = carving;
  carved.bumpScale = 0.026;
  carved.normalMap = null;
  owned.add(carved);
  const cloth = new THREE.MeshStandardMaterial({
    map: textile,
    bumpMap: micro,
    bumpScale: 0.012,
    roughness: 0.98,
    side: THREE.DoubleSide,
  });
  owned.add(cloth);
  const leaf = new THREE.MeshStandardMaterial({
    map: leafMap,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 0.65,
  });
  owned.add(leaf);
  const mats = {
    plaster,
    carved,
    cloth,
    leaf,
    floor: scanned("terracotta_floor_tiles", 0xd3baa3, [5, 5], 0.78),
    marble: scanned("marble_01", 0xf2e9d5, [0.23, 0.24], 0.87),
    cedar: scanned("wood_table_worn", 0xccab82, [1, 2], 0.73),
    pot: scanned("clay_plaster", 0xf1c4a0, [1, 1]),
    brass: plain(0xb89a58, 0.32, 0.84),
    bronze: plain(0x3a3024, 0.55, 0.8),
    grout: plain(0xa99d83, 0.98),
    soil: plain(0x302d20, 1),
    bark: plain(0x5c4b36, 0.97),
    cream: plain(0xe8dcc1, 0.35),
    dark: plain(0x191c16, 0.88),
    water: new THREE.MeshPhysicalMaterial({
      color: 0x37594c,
      roughness: 0.075,
      metalness: 0.65,
      transparent: true,
      opacity: 0.87,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xdce9d9,
      roughness: 0.085,
      metalness: 0,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    }),
  };
  owned.add(mats.water);
  owned.add(mats.glass);
  const waterTime = { value: 0 };
  mats.water.userData.time = waterTime;
  mats.water.onBeforeCompile = (shader) => {
    shader.uniforms.waterTime = waterTime;
    shader.vertexShader = "varying vec3 waterPosition;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nwaterPosition = (modelMatrix * vec4(position, 1.0)).xyz;",
    );
    shader.fragmentShader =
      "uniform float waterTime; varying vec3 waterPosition;\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
      float wave = length(waterPosition.xz - vec2(0.0, -0.35));
      vec2 radial = normalize(waterPosition.xz - vec2(0.0, -0.35) + vec2(.001));
      vec2 ripples = radial * sin(wave * 42.0 - waterTime * 3.2) * .032;
      ripples += vec2(sin(waterPosition.x * 26.0 + waterTime), cos(waterPosition.z * 29.0 - waterTime)) * .014;
      normal = normalize(normal + mat3(viewMatrix) * vec3(ripples.x, 0.0, ripples.y));`,
    );
  };
  const tileColors = [0x164f4c, 0xcfc8b4, 0x253e42, 0xa2824a, 0x63918a];
  mats.tiles = tileColors.map((color) => {
    const m = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.4,
      clearcoat: 0.6,
      clearcoatRoughness: 0.22,
      bumpMap: micro,
      bumpScale: 0.0025,
    });
    owned.add(m);
    return m;
  });
  for (const map of [
    mats.marble.map,
    mats.marble.normalMap,
    mats.marble.roughnessMap,
  ])
    map.offset.set(0.12, 0.13);
  mats.marble.normalScale.set(0.15, 0.15);
  mats.pot.normalScale.set(0.5, 0.5);
  mats.pot.color.set(0xf2b990);
  mats.bark.bumpMap = micro;
  mats.bark.bumpScale = 0.025;
  return {
    ...mats,
    ready: Promise.all(pending),
    dispose() {
      owned.forEach((x) => x.dispose());
    },
  };
}
