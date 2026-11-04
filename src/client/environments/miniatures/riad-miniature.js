import * as THREE from "three";
import { buildRiadEnvironment } from "../riad/riad-scene.js";
import { buildCutawayTerrain } from "../shared/cutaway-terrain.js";
import { sectionEnvironment } from "./sectioned-environment.js";

export function buildRiadMiniature(definition, renderer, study) {
  const runtime = buildRiadEnvironment(definition, renderer, {
    miniature: true,
  });
  runtime.sun = runtime.group.children.find(
    (object) => object.isDirectionalLight,
  );
  runtime.motions = [];
  runtime.views = { whole: study.whole, ...runtime.views };
  const upstairs = runtime.views.upstairs;
  runtime.views.upstairs = {
    ...upstairs,
    position: upstairs.position.map((value, i) => value + study.openOffset[i]),
    target: upstairs.target.map((value, i) => value + study.openOffset[i]),
  };
  let ownership,
    disposed = false;
  const dispose = runtime.dispose;
  runtime.dispose = () => {
    if (disposed) return;
    disposed = true;
    ownership?.dispose();
    dispose();
  };
  runtime.ready = runtime.ready.then(() => {
    if (disposed) return;
    let masonry, cedar;
    runtime.group.traverse((object) => {
      if (!object.material?.isMeshStandardMaterial) return;
      const material = object.material;
      if (!masonry && material.map && material.roughness > 0.8)
        masonry = material;
      if (!cedar && material.map && material.color.r > material.color.b * 1.5)
        cedar = material;
    });
    ownership = sectionEnvironment(
      runtime,
      [
        {
          min: [-20, -5, -22],
          max: [20, 4.75, 18],
          name: "Courtyard, salon and continued passage",
        },
        {
          min: [-20, 4.75, -22],
          max: [20, 15, 18],
          name: "Lifted upper galleries and shade canopy",
        },
      ],
      {
        convertWater: false,
        placement: (object) =>
          object.userData.miniaturePart === "shell" ? 1 : null,
      },
    );
    runtime.shell = ownership.sections[1].group;
    const stone = ownership.own(
      new THREE.MeshStandardMaterial({
        color: 0xb29e7e,
        roughness: 0.98,
        map: masonry?.map ?? null,
        normalMap: masonry?.normalMap ?? null,
      }),
    );
    const wood = ownership.own(
      new THREE.MeshStandardMaterial({
        color: 0x745237,
        roughness: 0.9,
        map: cedar?.map ?? null,
        normalMap: cedar?.normalMap ?? null,
      }),
    );
    const mesh = (
      geometry,
      material,
      position = [0, 0, 0],
      parent = runtime.group,
    ) => {
      const object = new THREE.Mesh(ownership.own(geometry), material);
      object.position.fromArray(position);
      object.castShadow = object.receiveShadow = true;
      parent.add(object);
      return object;
    };
    const outline = [
      [-9.5, 7.7],
      [9.5, 7.7],
      [9.5, -9.7],
      [2.6, -9.7],
      [2.6, -11.1],
      [1.9, -11.1],
      [1.9, -14.7],
      [-0.4, -14.7],
      [-0.4, -11.1],
      [-2.6, -11.1],
      [-2.6, -9.7],
      [-9.5, -9.7],
    ];
    const top = new THREE.ShapeGeometry(
      new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z))),
    );
    top.rotateX(-Math.PI / 2);
    mesh(top, stone, [0, -0.47, 0]);
    buildCutawayTerrain(
      { mesh },
      {
        boundary: outline.map(([x, z]) => [x, -0.47, z]).reverse(),
        bottom: -2.25,
        soilDepth: 0.24,
        soil: stone,
        rock: stone,
        relief: (x, y, z) => 0.025 * Math.sin(x * 11 + z * 7 + y * 15),
      },
    );
    for (let x = -5.5; x <= 5.5; x += 0.55)
      for (let row = 0; row < 3; row++)
        mesh(new THREE.BoxGeometry(0.535, 0.17, 0.47), stone, [
          x,
          -0.12 - row * 0.1,
          5.95 + row * 0.49,
        ]);
    const cloth = ownership.own(stone.clone());
    cloth.color.set(0xd4c3a1);
    cloth.side = THREE.DoubleSide;
    const cover = new THREE.PlaneGeometry(10.1, 9.7, 64, 64);
    cover.rotateX(-Math.PI / 2);
    const positions = cover.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        z = positions.getZ(i);
      positions.setY(
        i,
        -0.17 * Math.cos((x * Math.PI) / 10.1) * Math.cos((z * Math.PI) / 9.7) +
          0.012 * Math.sin(x * 15),
      );
    }
    cover.computeVertexNormals();
    mesh(cover, cloth, [0, 7.61, 0.38], runtime.shell).name =
      "Seasonal courtyard shade cloth";
    for (const x of [-5.05, 5.05])
      mesh(
        new THREE.BoxGeometry(0.11, 0.12, 9.95),
        wood,
        [x, 7.57, 0.38],
        runtime.shell,
      );
    for (const z of [-4.47, 5.23])
      mesh(
        new THREE.BoxGeometry(10.25, 0.12, 0.11),
        wood,
        [0, 7.57, z],
        runtime.shell,
      );
    for (const x of [-4.9, 4.9])
      for (const z of [-4.3, 5.05])
        mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8),
          wood,
          [x, 7.42, z],
          runtime.shell,
        );
  });
  return runtime;
}
