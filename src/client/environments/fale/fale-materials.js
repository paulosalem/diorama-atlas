import * as THREE from "three";

export function faleMaterials(k) {
  const wood = [0x9a7959, 0x806143, 0xa18461].map((color) => {
    const material = k.material(color, 0.78);
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
  });
  const stone = [0x55554a, 0x646257, 0x474b43].map((color) => {
    const material = k.material(color, 0.94);
    material.map = k.imageTexture("/public/outdoors/materials/rock_diff.jpg", {
      repeat: true,
    });
    material.normalMap = k.imageTexture(
      "/public/outdoors/materials/rock_nor_gl.jpg",
      { repeat: true, data: true },
    );
    material.normalScale.set(0.25, 0.25);
    return material;
  });
  const leafTexture = k.texture(
    (c, size) => {
      c.fillStyle = "#ece6c9";
      c.fillRect(0, 0, size, size);
      for (let i = 0; i < size; i += 3) {
        c.fillStyle = i % 9 ? "#857d5730" : "#faf4ce50";
        c.fillRect(0, i, size, 1);
      }
    },
    [1, 1],
    256,
  );
  const leafMaterial = (color) => {
    const material = k.material(color, 0.91);
    material.map = leafTexture;
    material.bumpMap = leafTexture;
    material.bumpScale = 0.0004;
    material.side = THREE.DoubleSide;
    material.userData.patinaProfile = "none";
    return material;
  };
  const leafDry = [0xa99669, 0xc5b185, 0xb5a179].map(leafMaterial);
  const leafGreen = [0x668148, 0x7d8f4b, 0x939758].map(leafMaterial);
  const roof = k.material(0x687d75, 0.69, 0.23);
  roof.side = THREE.DoubleSide;
  const roofSeam = k.material(0x546a61, 0.7, 0.25);
  const zinc = k.material(0x9c9b8e, 0.63, 0.45);
  zinc.side = THREE.DoubleSide;
  const ground = k.material(0xffffff, 0.98);
  ground.map = k.imageTexture(
    "/public/outdoors/detail-assets/douro/soil-diff.jpg",
    { repeat: true },
  );
  ground.normalMap = k.imageTexture(
    "/public/outdoors/detail-assets/douro/soil-nor_gl.jpg",
    { repeat: true, data: true },
  );
  ground.normalScale.set(0.15, 0.15);
  ground.vertexColors = true;
  const cloth = k.textile(["#899fa1", "#bcc5b8", "#899fa1", "#94a9a7"], [2, 2]);
  cloth.bumpScale = 0.0007;
  const concrete = k.material(0xc3bb9e, 0.96);
  concrete.map = k.texture(
    (c, size) => {
      c.fillStyle = "#dbd8cb";
      c.fillRect(0, 0, size, size);
      for (let i = 0; i < 5000; i++) {
        const x = (Math.sin(i * 127.1) * 43758.5453) % 1;
        const y = (Math.sin(i * 91.7) * 28461.719) % 1;
        c.fillStyle = i % 3 ? "#7a786c18" : "#ffffff30";
        c.fillRect(Math.abs(x) * size, Math.abs(y) * size, 1.2, 1);
      }
    },
    [4, 4],
    512,
  );
  concrete.bumpMap = concrete.map;
  concrete.bumpScale = 0.001;
  const bark = k.material(0xa6a090, 0.96);
  bark.map = k.texture(
    (c, size) => {
      c.fillStyle = "#a8a393";
      c.fillRect(0, 0, size, size);
      for (let i = 0; i < 220; i++) {
        const x = (i * 73.17) % size,
          y = (i * 47.31) % size;
        c.fillStyle = i % 3 ? "#4c504021" : "#e4e0cb40";
        c.fillRect(x, y, 0.5 + (i % 3), 3 + (i % 17));
      }
    },
    [3, 12],
    256,
  );
  bark.bumpMap = bark.map;
  bark.bumpScale = 0.0015;
  const canopy = k.material(0x758853, 0.9);
  canopy.map = k.imageTexture(
    "/public/outdoors/detail-assets/foliage/broadleaf-cutout.png",
  );
  canopy.normalMap = k.imageTexture(
    "/public/outdoors/detail-assets/foliage/broadleaf-normal-gl.jpg",
    { data: true },
  );
  canopy.normalScale.set(0.3, 0.3);
  canopy.alphaTest = 0.45;
  canopy.side = THREE.DoubleSide;
  canopy.userData.patinaProfile = "none";
  canopy.userData.nativeWind = { anchor: [0.5, 0.13] };
  const cookingLeaf = k.material(0x739357, 0.76);
  cookingLeaf.side = THREE.DoubleSide;
  cookingLeaf.userData.patinaProfile = "none";
  cookingLeaf.map = k.texture(
    (c, size) => {
      const color = c.createLinearGradient(0, 0, 0, size);
      color.addColorStop(0, "#60794a");
      color.addColorStop(0.48, "#93a56a");
      color.addColorStop(0.5, "#bec18a");
      color.addColorStop(0.52, "#91a568");
      color.addColorStop(1, "#536e3c");
      c.fillStyle = color;
      c.fillRect(0, 0, size, size);
      for (let x = -size; x < size * 2; x += 11) {
        c.strokeStyle = "#d7dca43a";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x - size * 0.2, 0);
        c.lineTo(x, size / 2);
        c.lineTo(x - size * 0.2, size);
        c.stroke();
      }
    },
    [1, 1],
    512,
  );
  cookingLeaf.bumpMap = cookingLeaf.map;
  cookingLeaf.bumpScale = 0.001;
  return {
    wood,
    stone,
    leafDry,
    leafGreen,
    roof,
    roofSeam,
    zinc,
    ground,
    cloth,
    concrete,
    bark,
    canopy,
    cookingLeaf,
    wall: k.material(0xe4ddbb, 0.88),
    trim: k.material(0x738a81, 0.81),
    cord: k.material(0x807152, 0.97),
    coconut: k.material(0x826348, 0.98),
    flesh: k.material(0xeee2be, 0.85),
    enamel: k.material(0xced8c7, 0.32, 0.12),
  };
}
