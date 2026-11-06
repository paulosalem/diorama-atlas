import * as THREE from "three";

export function charredWoodMaterial(k) {
  const material = k.ownMaterial(k.m.bark.clone());
  material.color.set(0x28231e);
  material.roughness = 1;
  material.emissive = new THREE.Color(0xffffff);
  material.emissiveIntensity = 0.65;
  material.emissiveMap = k.texture(
    (context, size) => {
      context.fillStyle = "#000000";
      context.fillRect(0, 0, size, size);
      for (let i = 0; i < 17; i++) {
        const x = (size * (i + 0.4)) / 17;
        context.lineWidth = 0.4 + (i % 3) * 0.35;
        context.strokeStyle = i % 3 ? "#a62903" : "#d74705";
        context.beginPath();
        for (let row = 0; row <= 24; row++) {
          const px =
            x + 3.8 * Math.sin(row * 1.3 + i) + 2 * Math.sin(row * 0.7 - i);
          const py = (row / 24) * size;
          const heat = Math.sin(i * 5.7 + row * 0.63) + Math.cos(row * 1.3 - i);
          if (row === 0 || heat < 0.1) context.moveTo(px, py);
          else context.lineTo(px, py);
          if (row % 5 === i % 5) {
            context.lineTo(px + 5 + (i % 4) * 2, py + 4);
            context.moveTo(px, py);
          }
        }
        context.stroke();
      }
    },
    [1, 1],
    256,
  );
  return material;
}
