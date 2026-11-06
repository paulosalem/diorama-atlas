import * as THREE from "three";

/** Separate crossing leaf strips, with real gaps and alternating over/under relief. */
export function wovenPanel(
  k,
  {
    width,
    height,
    material,
    parent = k.group,
    spacing = 0.028,
    angle = Math.PI / 4,
    relief = 0.0016,
    surface = (x, y, z) => [x, y, z],
  },
) {
  if (
    ![width, height, spacing, relief, angle].every(Number.isFinite) ||
    Math.min(width, height, spacing) <= 0 ||
    relief < 0
  )
    throw new Error("Woven panels require finite positive dimensions.");
  const diagonal = Math.hypot(width, height);
  for (let family = 0; family < 2; family++) {
    const a = angle + (family * Math.PI) / 2;
    const dx = Math.cos(a),
      dy = Math.sin(a);
    const nx = -dy,
      ny = dx;
    for (
      let row = -Math.ceil(diagonal / spacing);
      row <= diagonal / spacing;
      row++
    ) {
      const offset = row * spacing;
      let start = -diagonal,
        end = diagonal;
      for (const [direction, origin, half] of [
        [dx, nx * offset, width / 2],
        [dy, ny * offset, height / 2],
      ]) {
        if (Math.abs(direction) < 0.000001) {
          if (Math.abs(origin) > half) end = start - 1;
        } else {
          const limits = [
            (-half - origin) / direction,
            (half - origin) / direction,
          ].sort((a, b) => a - b);
          start = Math.max(start, limits[0]);
          end = Math.min(end, limits[1]);
        }
      }
      if (end - start < spacing * 0.3) continue;
      const steps = Math.max(2, Math.ceil(((end - start) / spacing) * 4));
      const position = [],
        uv = [],
        index = [];
      for (let i = 0; i <= steps; i++) {
        const distance = start + ((end - start) * i) / steps;
        const z =
          (family ? -1 : 1) *
          relief *
          Math.cos(Math.PI * (distance / spacing + row));
        for (const side of [-1, 1]) {
          const across = offset + side * spacing * 0.43;
          const x = THREE.MathUtils.clamp(
            dx * distance + nx * across,
            -width / 2,
            width / 2,
          );
          const y = THREE.MathUtils.clamp(
            dy * distance + ny * across,
            -height / 2,
            height / 2,
          );
          position.push(...surface(x, y, z));
          uv.push((distance + row * 0.17) * 3, (side + 1) / 2);
        }
        if (i < steps) {
          const p = i * 2;
          index.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(position, 3),
      );
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      k.mesh(
        geometry,
        Array.isArray(material)
          ? material[Math.abs(row) % material.length]
          : material,
        [0, 0, 0],
        [0, 0, 0],
        parent,
      );
    }
  }
}
