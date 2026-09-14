import * as THREE from "three";

/** Actual openings and adjoining rooms. Local positive Z always faces the courtyard. */
export function buildRiadRooms({
  group,
  m,
  detail,
  box,
  object,
  subgroup,
  lathe,
  rod,
  torus,
  cushion,
  lantern,
  mosaicStrip,
}) {
  const owned = [];
  const shade = m.plaster.clone();
  shade.color.set(0xa39780);
  shade.roughness = 1;
  owned.push(shade);
  const passage = m.plaster.clone();
  passage.color.set(0x716d60);
  passage.roughness = 1;
  owned.push(passage);
  const wood = m.cedar.clone();
  wood.color.multiplyScalar(0.77);
  owned.push(wood);
  const openings = [];
  // Partition each horizontal band around its apertures. There is no backing plane.
  function wall(width, height, depth, holes, parent, material = m.plaster) {
    const levels = [
      ...new Set([0, height, ...holes.flatMap((h) => [h.bottom, h.top])]),
    ].sort((a, b) => a - b);
    for (let i = 0; i < levels.length - 1; i++) {
      const low = levels[i],
        high = levels[i + 1],
        mid = (low + high) / 2;
      if (high <= low) continue;
      const gaps = holes
        .filter((h) => h.bottom < mid && h.top > mid)
        .sort((a, b) => a.x - b.x);
      let edge = -width / 2;
      for (const gap of [...gaps, { x: width / 2, width: 0 }]) {
        const left = gap.x - gap.width / 2;
        if (left > edge)
          box(
            [left - edge, high - low, depth],
            [(edge + left) / 2, mid, -depth / 2],
            material,
            0,
            parent,
          );
        edge = Math.max(edge, gap.x + gap.width / 2);
      }
    }
  }
  function windowFrame(
    parent,
    x,
    bottom,
    width,
    height,
    { shutters = true } = {},
  ) {
    const frame = subgroup([x, bottom, 0], 0, parent);
    for (const side of [-1, 1]) {
      box(
        [0.085, height + 0.16, 0.17],
        [side * (width / 2 + 0.028), height / 2, 0.036],
        wood,
        0.008,
        frame,
      );
      box(
        [0.05, height, 0.075],
        [side * (width / 2 - 0.015), height / 2, -0.59],
        wood,
        0.003,
        frame,
      );
    }
    box([width + 0.25, 0.13, 0.8], [0, -0.035, -0.27], m.marble, 0.012, frame);
    box(
      [width + 0.22, 0.12, 0.2],
      [0, height + 0.04, 0.04],
      wood,
      0.008,
      frame,
    );
    if (shutters)
      for (const side of [-1, 1]) {
        const leaf = subgroup(
            [(side * width) / 2, 0.02, 0.025],
            side * 0.98,
            frame,
          ),
          cx = -side * (width / 4 - 0.014),
          w = width / 2 - 0.025;
        for (const xx of [cx - w / 2 + 0.026, cx + w / 2 - 0.026])
          box(
            [0.052, height - 0.04, 0.075],
            [xx, height / 2, 0],
            wood,
            0.005,
            leaf,
          );
        for (const y of [0.04, height - 0.035])
          box([w, 0.075, 0.075], [cx, y, 0], wood, 0.005, leaf);
        // Open louvres admit small strips of light rather than a solid painted panel.
        for (let y = 0.14; y < height - 0.1; y += 0.094)
          box(
            [w - 0.08, 0.06, 0.029],
            [cx, y, 0],
            wood,
            0.002,
            leaf,
            [0.42, 0, 0],
          );
        for (const y of [0.19, height - 0.2])
          box(
            [0.13, 0.027, 0.018],
            [cx - side * w * 0.24, y, 0.052],
            m.bronze,
            0.002,
            leaf,
          );
      }
    return frame;
  }
  function room(
    parent,
    { width, depth, floor = 0, height = 3.8, backDoor = false, recess = 0.65 },
  ) {
    const shell = subgroup([0, floor, -recess], 0, parent);
    box([width, 0.13, depth], [0, -0.045, -depth / 2], m.floor, 0, shell);
    box(
      [width + 0.24, 0.18, depth + 0.15],
      [0, height, -depth / 2],
      wood,
      0,
      shell,
    );
    for (const side of [-1, 1])
      box(
        [0.18, height, depth],
        [side * (width / 2 + 0.09), height / 2, -depth / 2],
        shade,
        0,
        shell,
      );
    const back = subgroup([0, 0, -depth], 0, shell);
    wall(
      width,
      height,
      0.22,
      backDoor ? [{ x: 0.78, width: 1.05, bottom: 0, top: 2.55 }] : [],
      back,
      shade,
    );
    // Timber ceiling joists and floor joints continue beyond the visible threshold.
    for (let z = -0.4; z > -depth; z -= 0.5)
      box([width, 0.12, 0.065], [0, height - 0.13, z], wood, 0.004, shell);
    for (const side of [-1, 1])
      box(
        [0.045, 0.23, depth],
        [side * (width / 2 - 0.018), 0.115, -depth / 2],
        wood,
        0.003,
        shell,
      );
    return shell;
  }
  function books(parent, xyz, count = 9) {
    const shelf = subgroup(xyz, 0, parent);
    box([0.9, 0.06, 0.25], [0, 0, 0], wood, 0.005, shelf);
    for (let i = 0; i < count; i++)
      box(
        [0.058, 0.19 + (i % 3) * 0.025, 0.145],
        [-0.36 + i * 0.082, 0.13, 0.016],
        detail.cushions[i % 4],
        0.002,
        shelf,
        [0, 0, i % 4 === 0 ? 0.07 : 0],
      );
  }
  function lamp(parent, xyz, intensity = 1.8) {
    const holder = subgroup(xyz, 0, parent);
    // A shaded niche is a light source deep in the room, with physical furniture around it.
    lathe(
      [
        [0.1, 0],
        [0.13, 0.03],
        [0.065, 0.14],
        [0.042, 0.3],
        [0.06, 0.34],
      ],
      m.bronze,
      [0, 0, 0],
      holder,
      24,
    );
    const glow = new THREE.MeshStandardMaterial({
      color: 0xcbb488,
      roughness: 1,
      emissive: 0xffb75a,
      emissiveIntensity: 0.24,
      side: THREE.DoubleSide,
    });
    owned.push(glow);
    object(
      new THREE.CylinderGeometry(0.13, 0.24, 0.29, 24, 1, true),
      glow,
      [0, 0.46, 0],
      [0, 0, 0],
      holder,
    );
    if (intensity > 0) {
      const light = new THREE.PointLight(0xffc58b, intensity, 3.2, 2);
      light.position.set(0, 0.42, 0.06);
      holder.add(light);
    }
  }
  const back = subgroup([0, 0, -4.9]);
  back.name = "Masonry facade with open portals";
  const upper = [-3.1, 0, 3.1].map((x) => ({
    x,
    width: 1.3,
    bottom: 5.43,
    top: 6.98,
  }));
  const ground = [
    { x: 0, width: 2.36, bottom: 0, top: 4.03 },
    ...[-3.6, 3.6].map((x) => ({ x, width: 1.38, bottom: 0, top: 3.51 })),
  ];
  wall(10.7, 7.3, 0.65, [...ground, ...upper], back);
  // Tile dado stops at every ground-floor opening; thresholds remain unobstructed.
  let edge = -5.15;
  for (const opening of [...ground]
    .sort((a, b) => a.x - b.x)
    .concat([{ x: 5.15, width: 0 }])) {
    const left = opening.x - opening.width / 2;
    if (left > edge)
      mosaicStrip(
        left - edge,
        0.74,
        [(left + edge) / 2, 0.43, 0.034],
        [0, 0, 0],
        back,
        0.12,
        true,
      );
    edge = opening.x + opening.width / 2;
  }
  for (const opening of ground) {
    box(
      [opening.width, 0.09, 0.92],
      [opening.x, 0.005, -0.29],
      m.marble,
      0.006,
      back,
    );
    for (const side of [-1, 1])
      box(
        [0.075, opening.top, 0.075],
        [
          opening.x + side * (opening.width / 2 - 0.045),
          opening.top / 2,
          -0.61,
        ],
        wood,
        0.005,
        back,
      );
    box(
      [opening.width, 0.09, 0.09],
      [opening.x, opening.top - 0.04, -0.6],
      wood,
      0.003,
      back,
    );
    openings.push({
      kind: "door",
      center: [opening.x, 1.65, -4.9],
      normal: [0, 0, 1],
      depth: 0.65,
    });
  }
  // The main salon extends five metres; a second, offset passage continues beyond it.
  const salon = room(back, {
    width: 4.25,
    depth: 5.1,
    height: 4.15,
    backDoor: true,
  });
  salon.name = "Salon beyond the cedar portal";
  for (const side of [-1, 1]) {
    box([0.72, 0.34, 3.1], [side * 1.72, 0.2, -2.94], wood, 0.015, salon);
    cushion([0.73, 0.22, 3.04], [side * 1.72, 0.48, -2.94], [0, 0, 0], salon);
    for (let z = -1.9; z > -4.3; z -= 0.64)
      cushion(
        [0.19, 0.59, 0.6],
        [side * 1.96, 0.86, z],
        [0, 0, side * 0.1],
        salon,
      );
  }
  object(
    new THREE.PlaneGeometry(1.92, 3.4),
    detail.rug,
    [0, 0.03, -2.85],
    [-Math.PI / 2, 0, 0.035],
    salon,
  );
  lathe(
    [
      [0.25, 0],
      [0.24, 0.03],
      [0.18, 0.35],
      [0.46, 0.38],
      [0.46, 0.43],
    ],
    wood,
    [-0.43, 0.04, -3.12],
    salon,
    40,
  );
  lathe(
    [
      [0, 0],
      [0.13, 0.025],
      [0.14, 0.075],
      [0.11, 0.08],
    ],
    detail.ceramic,
    [-0.43, 0.47, -3.12],
    salon,
    32,
  );
  books(salon, [-1.64, 1.54, -4.67]);
  box([0.64, 0.83, 0.48], [-1.63, 0.42, -4.7], wood, 0.012, salon);
  lamp(salon, [-1.63, 0.86, -4.7], 2.1);
  const passageParent = subgroup([0.78, 0, -5.1], 0, salon);
  box([1.05, 0.09, 0.5], [0.78, 0.005, -5.2], m.marble, 0, salon);
  const hallway = room(passageParent, {
    width: 1.08,
    depth: 2.8,
    height: 2.6,
    recess: 0.22,
  });
  box([0.48, 0.12, 0.4], [0.1, 0.58, -2.2], wood, 0.007, hallway);
  lamp(hallway, [0.1, 0.67, -2.2], 0.75);
  // Reveal this second doorway with a thick lintel and inner jambs, never a backdrop image.
  for (const side of [-1, 1])
    box(
      [0.095, 2.55, 0.22],
      [0.78 + side * 0.54, 1.275, -5.04],
      wood,
      0.005,
      salon,
    );
  box([1.16, 0.1, 0.25], [0.78, 2.57, -5.04], wood, 0.004, salon);
  // Furnished side chambers behind the tied curtains.
  for (const [i, x] of [-3.6, 3.6].entries()) {
    const chamber = room(subgroup([x, 0, 0], 0, back), {
      width: 2.1,
      depth: 3.3,
      height: 3.8,
    });
    windowFrame(back, x, 0, 1.38, 3.51, { shutters: false });
    box([1.64, 0.35, 0.6], [0, 0.22, -2.78], wood, 0.008, chamber);
    cushion([1.6, 0.19, 0.59], [0, 0.49, -2.78], [0, 0, 0], chamber);
    books(chamber, [0, 1.6, -3.1]);
    lamp(chamber, [i ? 0.65 : -0.65, 0.62, -2.74], 1.2);
  }
  function upperRoom(parent, opening, index) {
    windowFrame(
      parent,
      opening.x,
      opening.bottom,
      opening.width,
      opening.top - opening.bottom,
    );
    const chamber = room(subgroup([opening.x, 0, 0], 0, parent), {
      width: 2.62,
      depth: 3.05,
      floor: 4.92,
      height: 2.4,
    });
    box([1.8, 0.3, 0.82], [-0.18, 0.23, -2.3], wood, 0.01, chamber);
    cushion([1.76, 0.18, 0.8], [-0.18, 0.47, -2.3], [0, 0, 0], chamber);
    cushion([0.6, 0.15, 0.53], [-0.73, 0.62, -2.27], [0, 0.07, 0], chamber);
    box([0.38, 0.57, 0.38], [0.95, 0.29, -2.27], wood, 0.007, chamber);
    lamp(chamber, [0.95, 0.6, -2.27], 0);
    books(chamber, [-0.68, 1.26, -2.91], 6);
    const world = new THREE.Vector3(opening.x, 6.1, 0);
    parent.localToWorld(world);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(
      parent.quaternion,
    );
    openings.push({
      kind: "window",
      center: world.toArray(),
      normal: normal.toArray(),
      depth: 0.65,
    });
  }
  // Update parent transforms before recording their world-space opening coordinates.
  group.updateMatrixWorld(true);
  upper.forEach((opening, i) => upperRoom(back, opening, i));
  for (const side of [-1, 1]) {
    const facade = subgroup(
      [side * 5.07, 0, 0.0],
      side < 0 ? Math.PI / 2 : -Math.PI / 2,
    );
    const windows = [-2.3, 0.65, 3.6].map((z) => ({
      x: side < 0 ? -z : z,
      width: 1.3,
      bottom: 5.43,
      top: 6.98,
    }));
    wall(11, 7.3, 0.65, windows, facade);
    group.updateMatrixWorld(true);
    windows.forEach((opening, i) => upperRoom(facade, opening, i + 1));
  }
  return {
    openings,
    dispose() {
      owned.forEach((material) => material.dispose());
    },
  };
}
