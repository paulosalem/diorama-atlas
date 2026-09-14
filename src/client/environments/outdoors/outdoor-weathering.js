import * as THREE from "three";

export function addOutdoorWearPatch(
  k,
  position,
  {
    width = 0.55,
    height = 0.7,
    angle = 0,
    parent = k.group,
    surface = "worn-plaster",
    strength = 0.7,
    scale = 1.2,
  } = {},
) {
  if (
    ![width, height, strength, scale].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    scale <= 0 ||
    strength < 0 ||
    strength > 1
  )
    throw new Error("Surface-wear dimensions and strength are invalid.");
  const mask = k.texture(
    (context, size) => {
      context.fillStyle = "#000";
      context.fillRect(0, 0, size, size);
      for (let i = 0; i < 14; i++) {
        const x = size * k.range(0.21, 0.79),
          y = size * k.range(0.18, 0.83);
        const radius = size * k.range(0.055, 0.19);
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(255,255,255,${k.range(0.55, 1)})`);
        gradient.addColorStop(0.62, "rgba(255,255,255,.55)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = gradient;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
    },
    [1, 1],
    512,
  );
  mask.colorSpace = THREE.NoColorSpace;
  mask.wrapS = mask.wrapT = THREE.ClampToEdgeWrapping;
  const material = k.surfaceMaterial(surface, { scale, normalStrength: 0.25 });
  material.alphaMap = mask;
  material.transparent = true;
  material.opacity = strength;
  material.depthWrite = false;
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -1;
  const group = k.sub(position, angle, parent);
  const patch = k.mesh(
    new THREE.PlaneGeometry(width, height),
    material,
    [0, 0, 0.002],
    [0, 0, 0],
    group,
  );
  patch.castShadow = false;
  return group;
}
