import * as THREE from "three";

export function alfamaPavingGeometry(seed) {
  const shape = new THREE.Shape();
  const cut = (corner) =>
    0.025 + 0.15 * (0.5 + 0.5 * Math.sin(seed * 4.7 + corner * 2.8));
  const corners = [
    [-0.46 + cut(0), -0.46],
    [0.46 - cut(1), -0.46],
    [0.46, -0.46 + cut(1)],
    [0.46, 0.46 - cut(2)],
    [0.46 - cut(2), 0.46],
    [-0.46 + cut(3), 0.46],
    [-0.46, 0.46 - cut(3)],
    [-0.46, -0.46 + cut(0)],
  ];
  corners.forEach(([x, y], i) => {
    const inset = 0.012 + 0.028 * (0.5 + 0.5 * Math.sin(seed * 4.7 + i * 2.8));
    const point = [x - Math.sign(x) * inset, y - Math.sign(y) * inset * 0.7];
    if (i) shape.lineTo(...point);
    else shape.moveTo(...point);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.88,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.024,
    bevelSegments: 2,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.center();
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > 0.35)
      p.setY(
        i,
        p.getY(i) -
          0.055 * (0.5 + 0.5 * Math.sin(p.getX(i) * 9 + p.getZ(i) * 7 + seed)),
      );
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function alfamaGeraniumLeafGeometry() {
  const segments = 40,
    rings = 5;
  const positions = [0, 0.055, 0.006],
    colors = [0.2, 0.32, 0.075],
    uvs = [0.5, 0.5],
    indices = [];
  for (let ring = 1; ring <= rings; ring++) {
    const r = ring / rings;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const scallop = 0.94 + 0.045 * Math.cos(a * 8) + 0.015 * Math.cos(a * 16);
      positions.push(
        Math.cos(a) * r * 0.055 * scallop,
        0.055 + Math.sin(a) * r * 0.055 * scallop,
        0.006 * (1 - r * r) +
          0.005 * (1 + Math.sin(a)) * r * r +
          0.001 * Math.sin(a * 8) * r * (1 - r),
      );
      const zone = Math.exp(-(((r - 0.63) / 0.12) ** 2));
      const vein = Math.max(0, Math.cos(a * 8)) ** 16 * (1 - r) * 0.22;
      const color = new THREE.Color(0x63853d).multiplyScalar(
        1 - zone * 0.35 + vein,
      );
      colors.push(color.r, color.g, color.b);
      uvs.push(0.5 + Math.cos(a) * r * 0.5, 0.5 + Math.sin(a) * r * 0.5);
      const current = 1 + (ring - 1) * segments + i;
      const next = 1 + (ring - 1) * segments + ((i + 1) % segments);
      if (ring === 1) indices.push(0, current, next);
      else
        indices.push(
          current - segments,
          current,
          next,
          current - segments,
          next,
          next - segments,
        );
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(new Float32Array(positions.length), 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function alfamaPetalGeometry() {
  const geometry = new THREE.PlaneGeometry(1, 1, 4, 5);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) + 0.5,
      across = p.getX(i) * 2;
    p.setXYZ(
      i,
      across * 0.012 * Math.sin(Math.PI * t) ** 0.65,
      t * 0.027,
      0.004 * t * t + 0.002 * across * across * Math.sin(t * Math.PI),
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}
