import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createRecordedSoundscape } from "../shared/recorded-soundscape.js";
import { getSoundscapeProfile } from "../shared/soundscape-profiles.js";
import { configureWaterMaterial } from "../shared/water-flow.js";

/** Add evidence of ordinary use after architecture, before static batching. */
export function addInteriorLife(k, p, type, definition) {
  const builders = {
    cafe: addCafe,
    tavern: addTavern,
    herbshop: addHerbShop,
    bookshop: addBookshop,
    workshop: addWorkshop,
    kitchen: addKitchen,
  };
  if (!builders[type]) throw new RangeError(`Unknown interior family: ${type}`);
  const life = createDetails(k, p, type);
  builders[type](k, p, life, definition);
  animateLeaves(k);
  if (type !== "workshop" && type !== "herbshop")
    life.particles(
      [0, 0.3, -0.2],
      [2.2, Math.min(2.7, k.layout.height - 0.4), 2.4],
      28,
    );
  return {
    soundscape: createRecordedSoundscape(getSoundscapeProfile(type)),
    aoScale: 0.75,
    environmentIntensity:
      type === "kitchen" || type === "workshop" ? 0.28 : 0.26,
    exposure: type === "bookshop" ? 0.97 : 0.96,
    fog: { color: type === "kitchen" ? 0xb8c3ac : 0xb8ab93, density: 0.005 },
  };
}

function createDetails(k, p, type) {
  const { m, group, sub, mesh, sphere, ring, rod, tube, range } = k;
  const cloth = k.textile(
    type === "cafe"
      ? ["#8b806a", "#8b806a", "#c0ae8c"]
      : type === "tavern"
        ? ["#c6bda4", "#c6bda4", "#947a66"]
        : ["#aaa08a", "#aaa08a", "#c3b18d"],
  );
  cloth.bumpScale = 0.0015;
  const paper = k.material(0xd5c6a4, 0.98);
  paper.side = THREE.DoubleSide;
  const crumb = k.material(0xb38b50, 0.93);
  const stainMaterial = k.material(0x795d39, 1);
  stainMaterial.transparent = true;
  stainMaterial.opacity = 0.19;
  stainMaterial.depthWrite = false;

  function drape(position, width, length, angle = 0, top = length * 0.55) {
    const geometry = new THREE.PlaneGeometry(width, length, 18, 26);
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i);
      const distance = length / 2 - vertices.getY(i);
      const hanging = Math.max(0, distance - top);
      const fold = Math.sin(x * 35 + distance * 5) * 0.004;
      vertices.setXYZ(
        i,
        x,
        fold - hanging * 0.94,
        Math.min(distance, top) + Math.sin(Math.min(hanging * 7, 1.1)) * 0.025,
      );
    }
    geometry.computeVertexNormals();
    const clothMesh = mesh(geometry, cloth, position, [0, angle, 0]);
    clothMesh.name = "Lived-in draped linen";
    k.animated.add(clothMesh);
    k.animateFabric(clothMesh, 0.002);
    return clothMesh;
  }

  function basket(position, radius = 0.23, height = 0.26, parent = group) {
    const basketGroup = sub(position, 0, parent);
    basketGroup.name = "Woven working basket";
    const radiusAt = (y) => radius * (0.73 + (y / height) * 0.27);
    for (let y = 0.016; y < height; y += 0.019)
      ring(radiusAt(y), 0.0045, [0, y, 0], m.bark, basketGroup);
    ring(radius, 0.008, [0, height, 0], m.bark, basketGroup);
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI) / 12;
      const points = [];
      for (let n = 0; n <= 12; n++) {
        const y = (n / 12) * height;
        const r = radiusAt(y) + Math.cos(n * Math.PI + i) * 0.002;
        points.push([Math.cos(angle) * r, y, Math.sin(angle) * r]);
      }
      tube(points, 0.003, m.paper, basketGroup);
    }
    k.cylinder(radius * 0.73, 0.009, [0, 0.007, 0], m.bark, basketGroup);
    return basketGroup;
  }

  function scatter(
    position,
    count = 12,
    mat = crumb,
    spread = 0.1,
    parent = group,
  ) {
    for (let i = 0; i < count; i++) {
      const size = range(0.0015, 0.004);
      sphere(
        size,
        [
          position[0] + range(-spread, spread),
          position[1] + size * 0.4,
          position[2] + range(-spread, spread),
        ],
        mat,
        parent,
        [1, 0.4, range(0.6, 1.8)],
      );
    }
  }

  function stain(position, radius = 0.045, parent = group) {
    const geometry = new THREE.RingGeometry(
      radius * 0.93,
      radius,
      48,
      1,
      0.28,
      5.55,
    );
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i),
        y = vertices.getY(i);
      const wobble = 1 + Math.sin(Math.atan2(y, x) * 13) * 0.018;
      vertices.setXY(i, x * wobble, y * wobble);
    }
    const mark = mesh(
      geometry,
      stainMaterial,
      position,
      [-Math.PI / 2, 0, 0],
      parent,
    );
    mark.castShadow = false;
    return mark;
  }

  function papers(
    position,
    {
      parent = group,
      count = 3,
      width = 0.2,
      length = 0.27,
      heading = "NOTES",
      angle = -0.08,
    } = {},
  ) {
    const stack = sub(position, angle, parent);
    stack.name = `${heading} working papers`;
    const writing = p.prints.book(p.printTheme.sheet, "page-right");
    for (let n = 0; n < count; n++) {
      const geometry = new THREE.PlaneGeometry(width, length, 8, 12);
      const vertices = geometry.attributes.position;
      for (let i = 0; i < vertices.count; i++)
        vertices.setZ(
          i,
          0.0015 * Math.sin(vertices.getY(i) * 15) +
            Math.max(0, vertices.getX(i) - width * 0.25) ** 2,
        );
      geometry.computeVertexNormals();
      mesh(
        geometry,
        n === count - 1 ? writing : paper,
        [n * 0.002, 0.003 + n * 0.0012, n * 0.001],
        [-Math.PI / 2, 0, 0],
        stack,
      );
    }
    return stack;
  }

  function spoon(position, parent = group, angle = 0, mat = m.brass) {
    const utensil = sub(position, angle, parent);
    rod([0, 0.003, -0.07], [0, 0.003, 0.03], 0.0025, mat, utensil);
    sphere(0.023, [0, 0.003, 0.047], mat, utensil, [0.62, 0.12, 1]);
    return utensil;
  }

  function twine(position, parent = group) {
    const points = [];
    for (let i = 0; i < 55; i++) {
      const angle = i * 0.3,
        r = 0.026 + i * 0.00055;
      points.push([
        position[0] + Math.cos(angle) * r,
        position[1] + 0.002 + i * 0.00004,
        position[2] + Math.sin(angle) * r,
      ]);
    }
    tube(points, 0.0012, m.linen, parent);
  }

  function particles(position, spread, count = 24, steam = false) {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      vertices.set(
        [range(-spread[0], spread[0]), 0, range(-spread[2], spread[2])],
        i * 3,
      );
      phases[i] = k.random();
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    const time = { value: 0 };
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        time,
        steam: { value: steam ? 1 : 0 },
        height: { value: spread[1] },
      },
      vertexShader: `
        uniform float time;
        uniform float steam;
        uniform float height;
        attribute float phase;
        varying float fade;
        void main() {
          float age = fract(phase + time * (steam > .5 ? .16 : .014));
          vec3 p = position;
          p.y = age * height;
          p.x += sin(phase * 13. + time * .4) * age * (steam > .5 ? .028 : .07);
          fade = sin(age * 3.14159);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_PointSize = clamp((steam > .5 ? 30. + age * 55. : 5.) / max(.2, -mv.z), 1., 28.);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float steam;
        varying float fade;
        void main() {
          float falloff = pow(max(0., 1. - length(gl_PointCoord - .5) * 2.), 2.);
          gl_FragColor = vec4(1., .97, .9, falloff * fade * (steam > .5 ? .065 : .11));
        }`,
    });
    k.ownMaterial(material);
    k.ownGeometry(geometry);
    const points = new THREE.Points(geometry, material);
    points.name = steam ? "Gentle steam" : "Sparse window dust";
    points.position.set(...position);
    points.frustumCulled = false;
    group.add(points);
    k.animated.add(points);
    k.animations.push((_, elapsed) => {
      time.value = elapsed;
    });
    return points;
  }

  return {
    cloth,
    paper,
    crumb,
    drape,
    basket,
    scatter,
    stain,
    papers,
    spoon,
    twine,
    particles,
  };
}

function addCafe(k, p, d, definition) {
  const { m, group, sub, box, rod, sphere, cylinder } = k;
  const tableX = -k.layout.width / 2 + 1.48;
  d.drape([2.46, 1.101, 0.56], 0.3, 0.44, Math.PI / 2, 0.22);
  d.stain([1.87, 1.099, 0.53]);
  d.stain([1.77, 1.099, -1.47], 0.038);
  d.spoon([2.02, 1.105, 0.29], group, 0.6);
  d.spoon([1.79, 1.102, -0.77], group, -0.3);
  d.scatter([2.24, 1.099, 1.78], 16, m.bark, 0.09);
  d.papers([2.2, 1.099, 2.08], {
    width: 0.13,
    length: 0.22,
    heading: "COFFEE",
    count: 2,
  });
  d.scatter([tableX + 0.1, 0.746, -2.43], 10);
  d.stain([tableX + 0.18, 0.744, 2.83], 0.039);
  p.cup([1.9, 1.1, -0.2]);
  d.particles([1.9, 1.17, -0.2], [0.019, 0.27, 0.019], 20, true);
  d.particles([2, 1.615, -1.25], [0.025, 0.31, 0.025], 24, true);

  const copper = k.material(0x996943, 0.48, 0.75);
  const grinder = sub([2.23, 1.1, 1.68]);
  grinder.name = "Hand grinder and grounds";
  box([0.2, 0.18, 0.19], [0, 0.09, 0], m.cedar, grinder);
  k.lathe(
    [
      [0.023, 0],
      [0.105, 0.045],
      [0.11, 0.12],
      [0.101, 0.125],
      [0.092, 0.05],
      [0.02, 0.008],
    ],
    [0, 0.18, 0],
    copper,
    grinder,
    32,
  );
  cylinder(0.07, 0.007, [0, 0.245, 0], m.bark, grinder);
  d.scatter([0, 0.25, 0], 16, m.bark, 0.05, grinder);
  rod([0, 0.22, 0], [0, 0.355, 0], 0.006, m.iron, grinder);
  rod([0, 0.355, 0], [0.115, 0.355, 0], 0.004, m.brass, grinder);
  sphere(0.015, [0.115, 0.355, 0], m.cedar, grinder);
  box([0.13, 0.049, 0.014], [0, 0.035, 0.105], m.cedar, grinder);
  sphere(0.009, [0, 0.035, 0.12], m.brass, grinder);

  // The existing disk remains the platter; this independently moving record sits above it.
  const record = sub([-0.69, 0.996, -3.84]);
  record.name = "Turning 33⅓ rpm record";
  const darkPieces = [new THREE.CylinderGeometry(0.176, 0.176, 0.003, 32)];
  const grooves = [];
  const groove = k.material(0x292825, 0.42);
  for (let radius = 0.067; radius < 0.17; radius += 0.006)
    grooves.push(
      new THREE.TorusGeometry(radius, 0.00035, 8, 40)
        .rotateX(Math.PI / 2)
        .translate(0, 0.002, 0),
    );
  const label = k.material(definition.generated ? 0x928269 : 0xb4a381, 0.86);
  cylinder(0.055, 0.001, [0, 0.003, 0], label, record);
  for (let i = 0; i < 4; i++)
    darkPieces.push(
      new THREE.BoxGeometry(0.027 - i * 0.003, 0.0006, 0.002).translate(
        0,
        0.004,
        0.015 + i * 0.006,
      ),
    );
  darkPieces.push(
    new THREE.BoxGeometry(0.016, 0.0006, 0.006).translate(0.017, 0.004, -0.023),
  );
  for (const [pieces, material] of [
    [darkPieces, m.dark],
    [grooves, groove],
  ]) {
    const geometry = mergeGeometries(pieces, false);
    pieces.forEach((piece) => piece.dispose());
    if (!geometry) throw new Error("Could not assemble the turning record.");
    k.mesh(geometry, material, [0, 0, 0], [0, 0, 0], record);
  }
  cylinder(0.0025, 0.014, [0, 0.006, 0], m.brass, record);
  k.animated.add(record);
  k.animations.push((_, elapsed) => {
    record.rotation.y = (-elapsed * Math.PI * 10) / 9;
  });

  const bag = d.basket([2.6, 0.012, 2.77], 0.19, 0.23);
  k.cushion([0.25, 0.24, 0.24], [0, 0.14, 0], d.cloth, bag);
}

function addTavern(k, p, d, definition) {
  const { m, group, sub, sphere, box, cylinder, range } = k;
  const lisbon = /lisbon|tasca/i.test(definition.title);
  const x = -k.layout.width / 2 + 1.4;
  const counterX = k.layout.width / 2 - 1;
  for (const z of [-2.6, 0.13, 2.95]) {
    d.drape([x + 0.16, 0.77, z + 0.29], 0.21, 0.36, 0.05, 0.3);
    d.spoon([x + 0.31, 0.77, z - 0.13], group, 0.18);
    d.scatter([x + 0.15, 0.77, z + 0.05], 7, d.crumb, 0.065);
  }
  const bread = d.basket([counterX - 0.04, 1.105, 2.14], 0.16, 0.095);
  for (let i = 0; i < 3; i++) {
    const loaf = sub(
      [-0.064 + i * 0.058, 0.075 + i * 0.01, 0],
      -0.24 + i * 0.2,
      bread,
    );
    sphere(0.067, [0, 0.015, 0], d.crumb, loaf, [0.7, 0.5, 1.4]);
    for (let n = 0; n < 3; n++)
      k.rod(
        [-0.021, 0.044, -0.044 + n * 0.037],
        [0.022, 0.044, -0.03 + n * 0.037],
        0.002,
        m.cream,
        loaf,
      );
  }
  const clearing = sub([counterX - 0.12, 1.104, 0.92]);
  clearing.name = lisbon ? "Lunch clearing tray" : "Meze clearing tray";
  box([0.42, 0.018, 0.3], [0, 0.011, 0], m.cedar, clearing);
  for (const edge of [-1, 1])
    box([0.015, 0.035, 0.3], [edge * 0.203, 0.029, 0], m.cedar, clearing);
  p.plate([0, 0.023, 0], clearing, 0.12);
  p.plate([0.015, 0.041, -0.004], clearing, 0.115);
  const olive = k.material(lisbon ? 0x5b603c : 0x343b26, 0.63);
  for (let i = 0; i < 3; i++)
    sphere(
      0.013,
      [range(-0.05, 0.05), 0.064, range(-0.045, 0.045)],
      olive,
      clearing,
      [1, 0.8, 1.3],
    );
  d.spoon([0.08, 0.065, 0.01], clearing, 0.7);
  d.drape([counterX + 0.37, 1.104, -0.14], 0.32, 0.55, Math.PI / 2, 0.23);
  d.papers([counterX - 0.2, 1.103, 1.53], {
    heading: lisbon ? "ALMOÇO" : "SOFRA",
    count: 2,
    width: 0.11,
    length: 0.18,
  });
  d.stain([counterX + 0.12, 1.103, -0.35], 0.032);
  const crate = d.basket([counterX + 0.1, 0.012, 3.22], 0.22, 0.29);
  for (const offset of [-0.09, 0.06]) p.bottle([offset, 0.015, 0], crate, 0.92);
  cylinder(0.065, 0.004, [counterX + 0.26, 1.104, 2.31], m.cedar);
}

function addHerbShop(k, p, d) {
  const { m, group, sub, box, mesh, sphere, rod, range } = k;
  d.papers([-0.85, 0.905, -1.91], {
    count: 4,
    width: 0.19,
    length: 0.23,
    heading: "BOTANICALS",
  });
  d.twine([-1.02, 0.906, -1.57]);
  d.spoon([0.13, 0.923, -1.98], group, 1.1);
  const leaf = k.material(0x77764d, 0.98);
  const parcel = sub([0.97, 0.916, -1.48], -0.12);
  parcel.name = "Open botanical parcel";
  box([0.23, 0.006, 0.16], [0, 0.003, 0], d.paper, parcel, 0);
  for (const side of [-1, 1]) {
    mesh(
      new THREE.PlaneGeometry(0.23, 0.11),
      d.paper,
      [0, 0.022, side * 0.113],
      [-Math.PI / 2 + side * 0.37, 0, 0],
      parcel,
    );
    mesh(
      new THREE.PlaneGeometry(0.095, 0.16),
      d.paper,
      [side * 0.144, 0.019, 0],
      [-Math.PI / 2, side * 0.35, 0],
      parcel,
    );
  }
  for (let i = 0; i < 20; i++) {
    const x = range(-0.08, 0.08),
      z = range(-0.05, 0.05);
    rod([x, 0.012, z], [x + 0.035, 0.016, z + 0.018], 0.0016, m.bark, parcel);
    sphere(0.013, [x + 0.015, 0.015, z], leaf, parcel, [0.5, 0.15, 1.5]);
  }
  d.scatter([0.87, 0.905, -1.39], 12, leaf, 0.04);
  const weights = sub([-0.59, 0.91, -2.0]);
  weights.name = "Brass measuring weights";
  for (let i = 0; i < 3; i++) {
    const radius = 0.013 + i * 0.005;
    k.cylinder(
      radius,
      0.017 + i * 0.008,
      [i * 0.044, 0.011 + i * 0.004, 0],
      m.brass,
      weights,
    );
    sphere(0.006, [i * 0.044, 0.024 + i * 0.008, 0], m.brass, weights);
  }
  const bundleBasket = d.basket([-1.83, 0.012, 2.2], 0.23, 0.27);
  for (let i = 0; i < 23; i++) {
    const x = range(-0.14, 0.14),
      z = range(-0.14, 0.14);
    rod(
      [x, 0.035, z],
      [x + range(-0.04, 0.04), range(0.25, 0.41), z + 0.04],
      0.004,
      m.bark,
      bundleBasket,
    );
  }
  d.drape([1.82, 0.727, 2.69], 0.23, 0.31, 0, 0.15);
  d.particles([-1.7, 0.35, 2.6], [0.5, 2.3, 0.5], 24);
}

function addBookshop(k, p, d) {
  const { m, group, sub, box, rod, ring } = k;
  d.papers([0.53, 0.798, 1.01], {
    width: 0.23,
    length: 0.27,
    heading: "CORRESPONDENCE",
    count: 4,
  });
  d.twine([-0.82, 0.798, 0.99]);
  const spectacles = sub([-0.54, 0.802, 0.95], 0.26);
  spectacles.name = "Reading spectacles";
  for (const x of [-0.031, 0.031])
    ring(0.026, 0.0018, [x, 0.003, 0], m.bronze, spectacles);
  rod([-0.009, 0.003, 0], [0.009, 0.003, 0], 0.0016, m.bronze, spectacles);
  for (const x of [-0.057, 0.057])
    k.tube(
      [
        [x, 0.003, 0],
        [x, 0.006, -0.068],
        [x * 0.84, 0.006, -0.087],
      ],
      0.0016,
      m.bronze,
      spectacles,
    );
  const parcel = sub([-1.47, 0.012, 1.34], 0.14);
  parcel.name = "Books wrapped for collection";
  box([0.33, 0.14, 0.27], [0, 0.07, 0], d.paper, parcel);
  for (const x of [-0.075, 0.075])
    k.tube(
      [
        [x, 0.001, 0.139],
        [x, 0.144, 0.139],
        [x, 0.144, -0.139],
        [x, 0.001, -0.139],
      ],
      0.0014,
      m.linen,
      parcel,
    );
  d.twine([0.04, 0.143, 0], parcel);
  // Build horizontal volumes explicitly: the standing-book helper rotates around a different origin.
  const stack = sub([-1.54, 0.012, 1.84], -0.08);
  stack.name = "Horizontal book stack";
  for (let i = 0; i < 4; i++) {
    const book = sub([i * 0.005, i * 0.048, 0], i % 2 ? 0.04 : -0.04, stack);
    const cover = i % 2 ? m.jade : p.leather;
    box([0.28, 0.04, 0.21], [0, 0.024, 0], d.paper, book, 0);
    for (const y of [0.002, 0.046])
      box([0.291, 0.004, 0.224], [0, y, 0], cover, book, 0);
    box([0.006, 0.046, 0.224], [-0.145, 0.024, 0], cover, book, 0);
  }
  box([0.29, 0.004, 0.021], [-0.51, 0.8, 1.14], m.cedar, group, 0);
  for (let i = 0; i < 12; i++)
    box(
      [0.001, 0.0007, i % 5 === 0 ? 0.012 : 0.006],
      [-0.64 + i * 0.022, 0.803, 1.139],
      m.dark,
      group,
      0,
    );
  rod([-0.91, 0.802, 0.83], [-0.71, 0.802, 0.85], 0.004, m.bronze);
  d.drape([2.75, 0.75, 3.18], 0.36, 0.56, 0, 0.19);
  d.particles([1.75, 0.641, 2.9], [0.017, 0.22, 0.017], 16, true);
}

function addWorkshop(k, p, d) {
  const { m, group, sub, sphere, ring, rod, box, range } = k;
  const yarns = [m.red, m.jade, d.cloth, m.paper];
  const basket = d.basket([0.63, 0.012, 0.71], 0.27, 0.26);
  for (let i = 0; i < 7; i++) {
    const x = range(-0.14, 0.14),
      z = range(-0.14, 0.14);
    const y = 0.075 + Math.floor(i / 3) * 0.065;
    const yarn = yarns[i % yarns.length];
    sphere(0.075, [x, y, z], yarn, basket, [1, 0.85, 1]);
    for (let n = 0; n < 8; n++) {
      const offset = -0.049 + n * 0.014;
      const radius = Math.sqrt(
        Math.max(0.001, 0.075 ** 2 - (offset / 0.85) ** 2),
      );
      ring(radius, 0.0017, [x, y + offset, z], yarn, basket);
    }
  }
  const loose = [];
  for (let i = 0; i < 45; i++)
    loose.push([
      0.56 + Math.sin(i * 0.24) * (0.06 + i * 0.001),
      0.015,
      0.62 + i * 0.015,
    ]);
  k.tube(loose, 0.0013, m.paper);
  for (let i = 0; i < 13; i++) {
    const x = range(-0.15, 0.15),
      z = range(0.45, 0.8);
    rod(
      [x, 0.013, z],
      [x + range(0.025, 0.09), 0.014, z + 0.035],
      0.0007,
      m.paper,
    );
  }
  d.drape([2.3, 0.8, 1.66], 0.47, 0.75, 0, 0.17);
  d.papers([-1.52, 0.766, 2.83], {
    width: 0.18,
    length: 0.14,
    heading: "DYE NOTES",
    count: 2,
  });
  d.twine([-1.13, 0.768, 2.83]);
  const shears = sub([-0.76, 0.772, 2.84], 0.7);
  shears.name = "Tailoring shears";
  for (const x of [-0.024, 0.024])
    ring(0.021, 0.0025, [x, 0.001, 0], m.iron, shears);
  for (const side of [-1, 1])
    box(
      [0.009, 0.003, 0.135],
      [side * 0.006, 0.001, 0.081],
      m.bronze,
      shears,
      0,
      [0, side * 0.28, 0],
    );
  k.cylinder(0.006, 0.005, [0, 0.004, 0.046], m.brass, shears);
  const pigment = k.material(0x984f3c, 0.99);
  d.scatter([-2.58, 0.84, -3.23], 22, pigment, 0.085);
  d.drape([-1.98, 0.841, -3.59], 0.22, 0.38, Math.PI / 2, 0.22);
  const hanging = [];
  group.traverse((object) => {
    if (
      object.isMesh &&
      object.geometry.type === "PlaneGeometry" &&
      object.geometry.parameters.height > 1.5 &&
      object.material.map &&
      object.material.side === THREE.DoubleSide &&
      object.material !== m.leaf &&
      !k.animated.has(object)
    )
      hanging.push(object);
  });
  for (const textile of hanging) {
    k.animated.add(textile);
    k.animateFabric(textile, 0.003);
  }
  d.particles([-1.9, 0.3, -0.8], [1, 2.4, 1.6], 28);
}

function addKitchen(k, p, d) {
  const { m, group, sphere, rod, range } = k;
  d.drape([3.05, 0.84, 1.14], 0.35, 0.53, Math.PI / 2, 0.26);
  d.spoon([2.55, 0.849, 1.03], group, 0.4);
  d.scatter([-0.34, 0.768, 0.76], 18, m.cream, 0.09);
  const cutting = k.sub([-0.49, 0.769, 0.74], 0.12);
  cutting.name = "Fresh preparation on the board";
  const flesh = k.material(0xd5c9a1, 0.9);
  for (let i = 0; i < 4; i++) {
    const slice = k.cylinder(
      0.026,
      0.008,
      [i * 0.046, 0.005, 0],
      m.jade,
      cutting,
    );
    k.cylinder(0.022, 0.0085, slice.position.toArray(), flesh, cutting);
  }
  const peel = [];
  for (let i = 0; i < 42; i++) {
    const angle = i * 0.21;
    peel.push([
      -0.02 + Math.cos(angle) * 0.035,
      0.772 + Math.sin(angle) * 0.002,
      0.83 + i * 0.001,
    ]);
  }
  k.tube(peel, 0.003, m.jade);
  const basket = d.basket([1.62, 0.012, 2.59], 0.27, 0.27);
  for (let i = 0; i < 7; i++) {
    const x = range(-0.16, 0.16),
      z = range(-0.16, 0.16),
      y = 0.095 + i * 0.018;
    sphere(0.066, [x, y, z], i % 3 ? m.jade : m.red, basket, [1, 0.83, 1]);
    rod([x, y + 0.05, z], [x + 0.009, y + 0.073, z], 0.003, m.bark, basket);
  }
  const ember = k.material(0x61311d, 0.95);
  ember.emissive.set(0xff651b);
  ember.emissiveIntensity = 0.45;
  for (const x of [-2.08, -0.73]) {
    for (let i = 0; i < 13; i++)
      sphere(
        0.013,
        [
          x + range(-0.125, 0.125),
          0.087 + range(0, 0.003),
          -3.53 + range(-0.12, 0.06),
        ],
        ember,
        group,
        [1.2, 0.5, 1],
      );
    d.particles([x, 1.004, -3.85], [0.042, 0.48, 0.042], 30, true);
  }
  k.animations.push((_, elapsed) => {
    ember.emissiveIntensity =
      0.43 + 0.07 * Math.sin(elapsed * 1.8) + 0.035 * Math.sin(elapsed * 4.7);
  });
  animateCanal(k);
}

function animateCanal(k) {
  const surface = k.group.getObjectByName("Backwater canal surface");
  if (!surface)
    throw new Error("The kitchen requires its connected garden canal.");
  const material = surface.material;
  material.name = "Living backwater canal";
  material.metalness = 0;
  material.userData.patinaProfile = "none";
  const time = k.m.water.userData.time;
  configureWaterMaterial(material, {
    time,
    disturbance: k.m.water.userData.disturbance,
  });
  k.animations.push((_, elapsed) => {
    time.value = elapsed;
  });
}

function animateLeaves(k) {
  const pivot = new THREE.Vector3();
  const axis = new THREE.Vector3();
  let count = 0;
  k.group.updateMatrixWorld(true);
  k.group.traverse((object) => {
    if (!object.isMesh || object.material !== k.m.leaf) return;
    const vertices = object.geometry.attributes.position.count;
    const pivots = new Float32Array(vertices * 4);
    const axes = new Float32Array(vertices * 3);
    const phase = k.range(0, Math.PI * 2);
    pivot.setFromMatrixPosition(object.matrixWorld);
    axis.set(0, 0, 1).transformDirection(object.matrixWorld);
    for (let i = 0; i < vertices; i++) {
      pivots.set([pivot.x, pivot.y, pivot.z, phase], i * 4);
      axes.set([axis.x, axis.y, axis.z], i * 3);
    }
    // finish() bakes positions into world space; these per-leaf attributes survive its merge.
    object.geometry.setAttribute(
      "breezePivot",
      new THREE.BufferAttribute(pivots, 4),
    );
    object.geometry.setAttribute(
      "breezeAxis",
      new THREE.BufferAttribute(axes, 3),
    );
    count++;
  });
  if (!count) return;

  const time = { value: 0 };
  const strength = { value: 0 };
  const leaf = k.m.leaf;
  const compile = leaf.onBeforeCompile;
  leaf.name = "Batched animated foliage";
  leaf.onBeforeCompile = (shader, renderer) => {
    compile.call(leaf, shader, renderer);
    shader.uniforms.interiorBreezeTime = time;
    shader.uniforms.interiorBreezeStrength = strength;
    shader.vertexShader =
      `
      attribute vec4 breezePivot;
      attribute vec3 breezeAxis;
      uniform float interiorBreezeTime;
      uniform float interiorBreezeStrength;
      vec3 interiorLeafRotation(vec3 value) {
        float angle = sin(interiorBreezeTime * .65 + breezePivot.w) * interiorBreezeStrength;
        float c = cos(angle);
        float s = sin(angle);
        return value * c + cross(breezeAxis, value) * s
          + breezeAxis * dot(breezeAxis, value) * (1. - c);
      }
    ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      "#include <beginnormal_vertex>\nobjectNormal = interiorLeafRotation(objectNormal);",
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntransformed = breezePivot.xyz + interiorLeafRotation(transformed - breezePivot.xyz);",
    );
  };
  leaf.customProgramCacheKey = () => "interior-batched-foliage-1";
  k.animations.push((_, elapsed) => {
    time.value = elapsed;
    strength.value = 0.009;
  });
}
