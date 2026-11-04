import * as THREE from "three";

export function createDomusMaterials(kit) {
  const plaster = (color) => {
    const mat = kit.ownMaterial(kit.m.plaster.clone());
    mat.color.set(color);
    mat.roughness = 0.96;
    mat.userData.patinaProfile = "none";
    return mat;
  };
  const red = plaster(0x9d4431);
  const ochre = plaster(0xc49a56);
  const cream = plaster(0xe5d7b8);
  const black = plaster(0x343333);
  const wood = kit.ownMaterial(kit.m.cedar.clone());
  wood.color.setRGB(1.5, 1.25, 0.95);
  wood.roughness = 0.8;
  const stone = kit.material(0xd8c5a5, 0.78);
  stone.normalMap = kit.m.plaster.normalMap;
  stone.normalScale.set(0.08, 0.08);
  stone.userData.patinaProfile = "none";
  const mosaicMap = kit.texture(
    (ctx, size) => {
      const count = 160,
        step = size / count;
      ctx.fillStyle = "#9e9683";
      ctx.fillRect(0, 0, size, size);
      for (let row = 0; row < count; row++)
        for (let col = 0; col < count; col++) {
          const diamond =
            Math.abs((row % 40) - 20) + Math.abs((col % 40) - 20) < 5;
          const value = (diamond ? 43 : 201) + Math.floor(kit.range(-14, 14));
          ctx.fillStyle = `rgb(${value + 7},${value + 3},${value - 7})`;
          ctx.fillRect(
            col * step + 0.7,
            row * step + 0.7,
            step - 1.3,
            step - 1.3,
          );
        }
    },
    [1, 1],
    2048,
  );
  const mosaic = kit.material(0xffffff, 0.82);
  mosaic.map = mosaicMap;
  mosaic.bumpMap = mosaicMap;
  mosaic.bumpScale = 0.0015;
  mosaic.userData.patinaProfile = "none";
  const mosaicBorder = kit.ownMaterial(mosaic.clone());
  mosaicBorder.color.set(0x242523);
  const signinum = kit.material(0xffffff, 0.95);
  signinum.map = kit.texture(
    (ctx, size) => {
      ctx.fillStyle = "#a26c52";
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 34000; i++) {
        const light = kit.range(58, 78);
        ctx.fillStyle = `hsl(${kit.range(15, 38)} 25% ${light}%)`;
        const s = kit.range(0.6, 2.4);
        ctx.fillRect(kit.random() * size, kit.random() * size, s, s * 0.8);
      }
    },
    [1, 1],
    1024,
  );
  signinum.bumpMap = signinum.map;
  signinum.bumpScale = 0.002;
  const linen = kit.textile(["#cabb98", "#cabb98", "#cabb98"]);
  const wineCloth = kit.textile(["#74372c", "#74372c", "#b98d58"]);
  const blueCloth = kit.textile(["#687875", "#687875", "#c2b496"]);
  for (const material of [linen, wineCloth, blueCloth])
    material.userData.patinaProfile = "none";
  const bronze = kit.material(0x9a7944, 0.4, 0.78);
  const iron = kit.material(0x383735, 0.65, 0.72);
  const clay = kit.material(0xb17e56, 0.85);
  const glazed = kit.material(0x86422e, 0.36);
  const glass = kit.ownMaterial(
    new THREE.MeshPhysicalMaterial({
      color: 0x9baea0,
      roughness: 0.14,
      transparent: true,
      opacity: 0.3,
      metalness: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const fruitArt = kit.material(0xffffff, 0.98);
  fruitArt.map = kit.imageTexture("/public/domus/paintings.jpg");
  fruitArt.userData.artwork = true;
  const portrait = kit.material(0xffffff, 0.98);
  portrait.map = kit.imageTexture("/public/domus/writing.jpg");
  portrait.userData.artwork = true;
  return {
    red,
    ochre,
    cream,
    black,
    wood,
    stone,
    mosaic,
    mosaicBorder,
    signinum,
    linen,
    wineCloth,
    blueCloth,
    bronze,
    iron,
    clay,
    glazed,
    glass,
    fruitArt,
    portrait,
    soil: kit.material(0x625640, 1),
    leaf: kit.material(0x4f6741, 0.95),
    leafLight: kit.material(0x76835a, 0.95),
    bread: kit.material(0xae7b39, 0.94),
    flesh: kit.material(0xbb9773, 0.9),
    wax: kit.material(0x4d3526, 0.87),
    ivory: kit.material(0xdbcca6, 0.7),
  };
}
