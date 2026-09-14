import * as THREE from "three";

export function createPaperProps(k) {
  const images = new Map();
  function printedMaterial(image) {
    if (!images.has(image)) {
      const material = k.material(0xffffff, 0.93);
      material.map = k.imageTexture(image);
      material.side = THREE.DoubleSide;
      material.name = "Printed image artwork";
      material.userData.artwork = image;
      images.set(image, material);
    }
    return images.get(image);
  }
  function paperGeometry(width, height, curl) {
    const geometry = new THREE.PlaneGeometry(width, height, 12, 18);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i) / width,
        y = positions.getY(i) / height;
      positions.setZ(
        i,
        curl * Math.abs(x * 2) ** 5 * Math.abs(y * 2) ** 4 +
          curl * 0.16 * Math.sin(y * 12 + x * 7),
      );
    }
    geometry.computeVertexNormals();
    return geometry;
  }
  function book(
    position,
    {
      width = 0.18,
      depth = 0.27,
      thickness = 0.027,
      angle = 0.12,
      parent = k.group,
      image = "/public/outdoors/generated/botanical-field-notes.png",
    } = {},
  ) {
    if (width <= 0 || depth <= 0 || thickness < 0.012)
      throw new Error("Invalid printed-book dimensions.");
    const g = k.sub(position, angle, parent);
    g.name = "Illustrated field notebook";
    const binding = k.material(0x59614a, 0.89),
      paper = k.material(0xdbd1b4, 0.97);
    const edge = k.material(0xb7ad92, 0.98);
    k.box([width, 0.003, depth], [0, 0.002, 0], binding, g, 0.002);
    k.box(
      [width - 0.009, thickness - 0.007, depth - 0.009],
      [0.002, thickness / 2, 0],
      paper,
      g,
      0.0015,
    );
    k.box(
      [0.007, thickness, depth],
      [-width / 2 + 0.002, thickness / 2, 0],
      binding,
      g,
      0.002,
    );
    for (let i = 0; i < 9; i++) {
      const y = 0.006 + (i * (thickness - 0.012)) / 9;
      k.box(
        [width - 0.011, 0.0004, 0.0007],
        [0.002, y, depth / 2 - 0.004],
        edge,
        g,
        0,
      );
      k.box(
        [0.0007, 0.0004, depth - 0.011],
        [width / 2 - 0.003, y, 0],
        edge,
        g,
        0,
      );
    }
    k.mesh(
      paperGeometry(width, depth, 0.0016),
      printedMaterial(image),
      [0, thickness + 0.001, 0],
      [-Math.PI / 2, 0, 0],
      g,
    );
    const bookmark = k.material(0x986450, 0.98);
    k.mesh(
      paperGeometry(0.012, 0.045, 0.003),
      bookmark,
      [width * 0.21, 0.011, depth / 2 + 0.014],
      [-Math.PI / 2, 0, -0.1],
      g,
    );
    return g;
  }
  function poster(
    position,
    { width = 0.3, height = 0.45, angle = 0, parent = k.group, image } = {},
  ) {
    if (!image || width <= 0 || height <= 0)
      throw new Error("A poster requires an image and positive dimensions.");
    const g = k.sub(position, angle, parent);
    k.mesh(
      paperGeometry(width, height, 0.006),
      printedMaterial(image),
      [0, 0, 0.002],
      [0, 0, 0],
      g,
    );
    for (const x of [-width * 0.42, width * 0.42])
      k.sphere(0.0035, [x, height * 0.43, 0.007], k.m.iron, g, [1, 1, 0.4]);
    return g;
  }
  return { book, poster };
}
