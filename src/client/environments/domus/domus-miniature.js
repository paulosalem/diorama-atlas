import * as THREE from "three";
import { domusWalls, wallSegments } from "./domus-layout.js";

export function createDomusMiniature(kit, architecture, sun) {
  const sectionHeight = 1.15;
  const planes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), sectionHeight)];
  const wallMaterials = new Map();
  const originals = new Map();
  architecture.walls.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const original = mesh.material;
    if (!wallMaterials.has(original)) {
      const material = kit.ownMaterial(original.clone());
      material.clipShadows = true;
      material.clippingPlanes = planes;
      wallMaterials.set(original, material);
      originals.set(original, original);
      originals.set(material, original);
    }
    mesh.material = wallMaterials.get(original);
  });
  const caps = kit.sub();
  caps.name = "domus-section-caps";
  caps.userData.batchRoot = true;
  caps.visible = false;
  const section = kit.ownMaterial(
    new THREE.MeshStandardMaterial({ color: 0xd6c5a6, roughness: 0.9 }),
  );
  section.userData.patinaProfile = "none";
  for (const wall of domusWalls) {
    const alongX = wall.axis === "x";
    for (const [start, end] of wallSegments(wall)) {
      const middle = (start + end) / 2;
      kit.box(
        alongX ? [end - start, 0.018, 0.3] : [0.3, 0.018, end - start],
        alongX
          ? [middle, sectionHeight - 0.009, wall.fixed]
          : [wall.fixed, sectionHeight - 0.009, middle],
        section,
        caps,
        0,
      );
    }
  }
  for (const x of [-14.85, 16.85])
    kit.box(
      [0.22, 0.018, 39],
      [x, sectionHeight - 0.009, -2],
      section,
      caps,
      0,
    );
  const shellOffset = new THREE.Vector3(-37, 9, -3);
  const upperPlane = new THREE.Plane(
    new THREE.Vector3(0, 1, 0),
    -sectionHeight,
  );
  const upper = kit.sub();
  upper.name = "domus-lifted-envelope";
  upper.userData.batchRoot = true;
  upper.visible = false;
  const upperWalls = architecture.walls.clone(true);
  const upperMaterials = new Map();
  upperWalls.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const original = originals.get(mesh.material);
    if (!upperMaterials.has(original)) {
      const material = kit.ownMaterial(original.clone());
      material.clippingPlanes = [upperPlane];
      material.clipShadows = true;
      upperMaterials.set(original, material);
    }
    mesh.material = upperMaterials.get(original);
  });
  upperWalls.name = "domus-upper-walls";
  upper.add(upperWalls);
  const upperCaps = caps.clone(true);
  upperCaps.name = "domus-upper-section-caps";
  upperCaps.visible = true;
  upper.add(upperCaps);
  const base = kit.sub();
  base.name = "domus-miniature-base";
  base.userData.batchRoot = true;
  base.visible = false;
  const baseMaterial = kit.ownMaterial(
    new THREE.MeshStandardMaterial({ color: 0x504537, roughness: 0.8 }),
  );
  baseMaterial.userData.patinaProfile = "none";
  kit.box([34, 0.9, 46], [1, -0.95, 1], baseMaterial, base, 0.12);
  let active = false;
  let cutaway = true;
  function apply() {
    const sectioned = active && cutaway;
    architecture.roofs.visible = true;
    architecture.roofs.position.set(
      sectioned ? shellOffset.x : 0,
      sectioned ? shellOffset.y : 0,
      sectioned ? shellOffset.z : 0,
    );
    upper.visible = sectioned;
    upper.position.copy(shellOffset);
    upperPlane.constant = -sectionHeight - shellOffset.y;
    caps.visible = sectioned;
    base.visible = active;
    architecture.walls.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const original = originals.get(mesh.material);
      mesh.material = sectioned ? wallMaterials.get(original) : original;
    });
    sun.shadow.needsUpdate = true;
  }
  return {
    background: 0xd7d0c2,
    environmentIntensity: 0.4,
    exposure: 0.86,
    bounds: [
      [-16, -1.4, -22],
      [18, 5.5, 24],
    ],
    views: {
      overview: {
        label: "Whole house",
        position: [43, 56, 58],
        target: [-16, 3.5, 0],
        closedTarget: [1, 0, 1],
        bounds: [
          [-53, -1.4, -25],
          [18, 14.5, 24],
        ],
      },
      courts: {
        label: "Courtyards",
        position: [-23, 34, 25],
        target: [0, 0, -3],
        bounds: [
          [-7.5, 0, -17.5],
          [7.5, 4, 12.5],
        ],
      },
      garden: {
        label: "Peristyle garden",
        position: [-12, 17, 6],
        target: [0, 0.6, -11],
        bounds: [
          [-7.2, 0, -17.2],
          [7.2, 3.6, -5],
        ],
      },
      service: {
        label: "Working household",
        position: [39, 33, 20],
        target: [10, 0, -2],
        bounds: [
          [7, 0, -21],
          [15.5, 4, 17],
        ],
      },
      plan: {
        label: "House plan",
        position: [1, 72, 4],
        target: [1, 0, 1],
      },
    },
    setActive(value) {
      active = value;
      apply();
    },
    setCutaway(value) {
      cutaway = value;
      apply();
    },
    get cutaway() {
      return cutaway;
    },
    get active() {
      return active;
    },
  };
}
