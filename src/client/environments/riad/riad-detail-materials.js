import * as THREE from "three";
import { createLocalImageTextures } from "../shared/local-image-textures.js";
import { createPrintMaterials } from "../shared/print-materials.js";

// Small-scale craft textures complement the existing scanned material maps.
export function createRiadDetailMaterials(renderer, base) {
  const resources = new Set();
  const pending = [];
  const imageTexture = createLocalImageTextures(renderer, pending, resources);
  const prints = createPrintMaterials({
    imageTexture,
    ownMaterial: (material) => resources.add(material),
  });
  let seed = 12039;
  const random = () =>
    (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
  function texture(draw, size = 1024, color = true) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    draw(canvas.getContext("2d"), size);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    resources.add(t);
    return t;
  }
  function material(params) {
    const m = new THREE.MeshStandardMaterial(params);
    resources.add(m);
    return m;
  }
  const weave = texture(
    (c, s) => {
      c.fillStyle = "#888";
      c.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 3)
        for (let x = 0; x < s; x += 3) {
          const v = 100 + random() * 80;
          c.fillStyle = `rgb(${v},${v},${v})`;
          c.fillRect(x, y, 2, 2);
        }
    },
    512,
    false,
  );
  const fabric = (bg, accent, pattern) =>
    texture((c, s) => {
      c.fillStyle = bg;
      c.fillRect(0, 0, s, s);
      if (pattern === "diamond") {
        for (let y = -128; y < s + 128; y += 192)
          for (let x = -96; x < s + 96; x += 192) {
            c.strokeStyle = accent;
            c.lineWidth = 7;
            c.beginPath();
            c.moveTo(x, y - 80);
            c.lineTo(x + 64, y);
            c.lineTo(x, y + 80);
            c.lineTo(x - 64, y);
            c.closePath();
            c.stroke();
            c.lineWidth = 2;
            c.strokeRect(x - 9, y - 9, 18, 18);
          }
      } else if (pattern === "stripe") {
        for (let x = 0; x < s; x += 128) {
          c.fillStyle = accent;
          c.fillRect(x, 0, 16, s);
          c.fillRect(x + 23, 0, 3, s);
          c.fillRect(x + 31, 0, 2, s);
        }
      }
      for (let y = 0; y < s; y += 2) {
        c.fillStyle = `rgba(235,222,190,${0.025 + random() * 0.07})`;
        c.fillRect(0, y, s, 1);
      }
      for (let x = 0; x < s; x += 3) {
        c.fillStyle = "#0b09091b";
        c.fillRect(x, 0, 1, s);
      }
      for (let i = 0; i < 14000; i++) {
        c.fillStyle = random() > 0.5 ? "#ede4c517" : "#21170c13";
        c.fillRect(random() * s, random() * s, 1 + random() * 4, 1);
      }
    });
  const cushions = [
    ["#86412d", "#c2955c", "diamond"],
    ["#364749", "#b3a886", "stripe"],
    ["#b4a082", "#675a48", "diamond"],
    ["#6e4635", "#b7844c", "stripe"],
  ].map(([bg, accent, pattern]) =>
    material({
      map: fabric(bg, accent, pattern),
      roughness: 0.96,
      bumpMap: weave,
      bumpScale: 0.0025,
    }),
  );
  const linen = material({
    map: fabric("#c8ba99", "#a18d6d", "plain"),
    color: 0xf5e5c8,
    roughness: 1,
    bumpMap: weave,
    bumpScale: 0.003,
    side: THREE.DoubleSide,
  });
  const rugMap = texture((c, s) => {
    c.fillStyle = "#683729";
    c.fillRect(0, 0, s, s);
    for (const [inset, color] of [
      [17, "#c6ac7a"],
      [26, "#323f3b"],
      [62, "#be9866"],
      [78, "#633c2c"],
      [94, "#d1b885"],
      [101, "#343c37"],
    ]) {
      c.strokeStyle = color;
      c.lineWidth = 9;
      c.strokeRect(inset, inset, s - inset * 2, s - inset * 2);
    }
    function diamond(x, y, r, color) {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(x, y - r);
      c.lineTo(x + r * 0.72, y);
      c.lineTo(x, y + r);
      c.lineTo(x - r * 0.72, y);
      c.closePath();
      c.fill();
    }
    for (let y = 210; y < 900; y += 300) {
      diamond(512, y, 150, "#c0a16e");
      diamond(512, y, 120, "#263e3c");
      diamond(512, y, 87, "#a6663c");
      diamond(512, y, 50, "#d5bc86");
    }
    for (let x = 170; x < 900; x += 115)
      for (let y = 160; y < 940; y += 115) {
        if (Math.abs(x - 512) < 130) continue;
        diamond(x, y, 28, "#b79862");
        diamond(x, y, 15, "#343d32");
      }
    for (let i = 0; i < 90000; i++) {
      c.fillStyle = random() > 0.5 ? "#eddec114" : "#21160c18";
      c.fillRect(random() * s, random() * s, 1 + random() * 3, 1);
    }
    for (let y = 0; y < s; y += 2) {
      c.fillStyle = "#eed6ae12";
      c.fillRect(0, y, s, 1);
    }
  });
  const rug = material({
    map: rugMap,
    roughness: 1,
    bumpMap: weave,
    bumpScale: 0.005,
    side: THREE.DoubleSide,
  });
  const plasterPatina = base.plaster.clone();
  resources.add(plasterPatina);
  plasterPatina.color.set(0xd8c6a5);
  plasterPatina.roughness = 1;
  const silver = material({
    color: 0xc3b8a3,
    metalness: 0.94,
    roughness: 0.22,
    bumpMap: weave,
    bumpScale: 0.00015,
  });
  const ceramic = material({
    color: 0x587b6c,
    metalness: 0.03,
    roughness: 0.23,
    bumpMap: weave,
    bumpScale: 0.0007,
  });
  const tea = new THREE.MeshPhysicalMaterial({
    color: 0x6c300b,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.82,
    clearcoat: 1,
  });
  resources.add(tea);
  const leather = material({
    color: 0x76472f,
    roughness: 0.64,
    bumpMap: weave,
    bumpScale: 0.003,
    side: THREE.DoubleSide,
  });
  const paper = material({
    color: 0xcfc0a0,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const stitch = material({ color: 0xbca079, roughness: 1 });
  const tileVariants = base.tiles.map((tile) =>
    Array.from({ length: 6 }, () => {
      const v = tile.clone();
      v.color.multiplyScalar(0.86 + random() * 0.24);
      v.roughness = 0.23 + random() * 0.25;
      v.clearcoat = 0.7;
      resources.add(v);
      return v;
    }),
  );
  const bread = material({
    color: 0xc09150,
    roughness: 0.92,
    bumpMap: weave,
    bumpScale: 0.015,
  });
  const date = material({
    color: 0x482513,
    roughness: 0.33,
    bumpMap: weave,
    bumpScale: 0.006,
  });
  const wax = material({ color: 0xefe0b4, roughness: 0.68 });
  const dampStone = base.marble.clone();
  dampStone.color.set(0xabb4a0);
  dampStone.roughness = 0.36;
  resources.add(dampStone);
  for (const fabric of [...cushions, linen, rug])
    fabric.userData.patinaProfile = "fabric";
  leather.userData.patinaProfile = "leather";
  ceramic.userData.patinaProfile = "clay";
  paper.userData.patinaProfile = "none";
  return {
    prints,
    get ready() {
      return Promise.all(pending);
    },
    paper,
    leather,
    stitch,
    tileVariants,
    cushions,
    linen,
    rug,
    plasterPatina,
    silver,
    ceramic,
    tea,
    bread,
    date,
    wax,
    dampStone,
    dispose() {
      resources.forEach((r) => r.dispose());
    },
  };
}
