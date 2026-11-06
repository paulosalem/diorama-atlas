import * as THREE from "three";

export function saunaMaterials(k) {
  const timber = (color) => {
    const material = k.material(color, 0.88);
    material.map = k.imageTexture("/public/sauna/materials/diff.jpg", {
      repeat: true,
    });
    material.normalMap = k.imageTexture("/public/sauna/materials/nor_gl.jpg", {
      repeat: true,
      data: true,
    });
    material.roughnessMap = k.imageTexture(
      "/public/sauna/materials/rough.jpg",
      { repeat: true, data: true },
    );
    material.normalScale.set(0.13, 0.13);
    material.userData.patinaProfile = "none";
    return material;
  };
  const wood = [0xfff9e9, 0xf1e8d6, 0xfff8e6, 0xe9dfcb].map(timber);
  const outside = [0x89765a, 0x988466, 0x82745f].map(timber);
  const linen = k.textile(["#dbd6c6", "#d6d1c2", "#dbd6c6", "#c5c6bb"], [1, 1]);
  const towel = k.textile(["#718488", "#7d8f91", "#abb7b4", "#7d8f91"], [1, 1]);
  linen.bumpScale = towel.bumpScale = 0.0007;
  const iron = k.material(0x25282b, 0.7, 0.55);
  const metal = k.material(0xb3b6b0, 0.32, 0.82);
  const roof = k.material(0x41494b, 0.81, 0.18);
  const stone = [0x55595a, 0x666969, 0x4b5051].map((color) => {
    const material = k.material(color, 0.9);
    material.map = k.imageTexture("/public/outdoors/materials/rock_diff.jpg", {
      repeat: true,
    });
    material.normalMap = k.imageTexture(
      "/public/outdoors/materials/rock_nor_gl.jpg",
      { repeat: true, data: true },
    );
    material.roughnessMap = k.imageTexture(
      "/public/outdoors/materials/rock_rough.jpg",
      { repeat: true, data: true },
    );
    material.normalScale.set(0.35, 0.35);
    return material;
  });
  const floor = [0x5d6563, 0x626963, 0x6a6d65].map((color) => {
    const material = k.material(color, 0.8);
    material.normalMap = stone[0].normalMap;
    material.normalScale.set(0.035, 0.035);
    material.roughnessMap = stone[0].roughnessMap;
    return material;
  });
  const leaf = [0x4c6831, 0x687b38, 0x7c8946].map((color) => {
    const material = k.material(color, 0.9);
    material.side = THREE.DoubleSide;
    material.userData.nativeWind = { anchor: [0.5, 0] };
    return material;
  });
  const bark = k.material(0xe4ded0, 0.98);
  bark.map = k.imageTexture("/public/sauna/birch-bark.jpg", { repeat: true });
  bark.bumpMap = bark.map;
  bark.bumpScale = 0.008;
  const ground = k.material(0xffffff, 1);
  ground.map = k.imageTexture(
    "/public/outdoors/detail-assets/douro/soil-diff.jpg",
    { repeat: true },
  );
  ground.normalMap = k.imageTexture(
    "/public/outdoors/detail-assets/douro/soil-nor_gl.jpg",
    { repeat: true, data: true },
  );
  ground.roughnessMap = k.imageTexture(
    "/public/outdoors/detail-assets/douro/soil-rough.jpg",
    { repeat: true, data: true },
  );
  ground.normalScale.set(0.38, 0.38);
  ground.vertexColors = true;
  return {
    wood,
    outside,
    linen,
    towel,
    iron,
    metal,
    roof,
    stone,
    floor,
    leaf,
    bark,
    ground,
  };
}
