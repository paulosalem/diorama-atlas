import * as THREE from "three";

export function gerMaterials(k) {
  const wood = [0xf5dfb2, 0xffe6bd, 0xe7c99c, 0xf0d4a9].map((color) => {
    const m = k.ownMaterial(k.m.cedar.clone());
    m.color.set(color);
    m.roughness = 0.8;
    return m;
  });
  const paint = k.ownMaterial(k.m.cedar.clone());
  paint.map = null;
  paint.color.set(0xb65a2d);
  paint.normalScale.set(0.13, 0.13);
  paint.roughness = 0.66;
  paint.userData.patinaProfile = "none";
  const canvas = k.material(0xf0e3c9, 0.96);
  const fibre = k.texture(
    (c, s) => {
      c.fillStyle = "#d9cdb7";
      c.fillRect(0, 0, s, s);
      let seed = 5247;
      const random = () =>
        (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
      for (let i = 0; i < 25000; i++) {
        const shade = Math.floor(150 + random() * 90);
        c.strokeStyle = `rgba(${shade},${shade},${shade},0.18)`;
        const x = random() * s,
          y = random() * s;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + random() * 8, y + random() * 2);
        c.stroke();
      }
      for (let y = 0; y < s; y += 3) {
        c.fillStyle = "#ffffff0b";
        c.fillRect(0, y, s, 1);
      }
    },
    [6, 2],
    512,
  );
  canvas.map = fibre;
  canvas.bumpMap = fibre;
  canvas.bumpScale = 0.006;
  canvas.userData.patinaProfile = "fabric";
  const lining = k.ownMaterial(canvas.clone());
  lining.color.set(0xd2c6af);
  const felt = k.ownMaterial(canvas.clone());
  felt.color.set(0x9a8b72);
  const rope = k.material(0x5d4934, 0.98);
  const steel = k.material(0x303338, 0.64, 0.65);
  const enamel = k.material(0xd4ded8, 0.27, 0.08);
  const darkEnamel = k.material(0x244d57, 0.28, 0.1);
  const metal = k.material(0x9b9e9c, 0.35, 0.85);
  const bedding = k.textile(
    ["#25484c", "#517176", "#9d9172", "#314b52"],
    [2, 2],
  );
  const cloth = k.textile(["#b1aa91", "#d0c8b3", "#9a593e", "#d0c8b3"], [1, 1]);
  const ground = k.material(0xffffff, 1);
  ground.map = k.imageTexture(
    "/public/outdoors/detail-assets/douro/soil-diff.jpg",
    { repeat: true },
  );
  ground.normalMap = k.imageTexture(
    "/public/outdoors/detail-assets/douro/soil-nor_gl.jpg",
    { data: true, repeat: true },
  );
  ground.roughnessMap = k.imageTexture(
    "/public/outdoors/detail-assets/douro/soil-rough.jpg",
    { data: true, repeat: true },
  );
  ground.vertexColors = true;
  ground.roughness = 1;
  ground.normalScale.set(0.35, 0.35);
  const grass = [0x6a7050, 0x84815b, 0x9e9162].map((color) => {
    const m = k.material(color, 1);
    m.side = THREE.DoubleSide;
    m.userData.nativeWind = { anchor: [0.5, 0] };
    return m;
  });
  return {
    wood,
    paint,
    canvas,
    lining,
    felt,
    rope,
    steel,
    enamel,
    darkEnamel,
    metal,
    bedding,
    cloth,
    ground,
    grass,
  };
}
