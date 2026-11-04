import * as THREE from "three";
import { sitePath } from "../../site.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createRiadMaterials } from "./materials.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { stampSurfaceVariation } from "./surface-variation.js";
import { createLocalImageTextures } from "./local-image-textures.js";
import { createPaperProps } from "./paper-props.js";
import { createPrintMaterials } from "./print-materials.js";

RectAreaLightUniformsLib.init();

/** Shared full-scale construction tools for the atlas's interior environments. */
export function createEnvironmentKit(
  renderer,
  seed = 21,
  { rustic = false, miniature = false } = {},
) {
  const materials = createRiadMaterials(renderer);
  materials.glass.color.set(0xf3f5ef);
  materials.glass.metalness = 0;
  materials.glass.opacity = 0.19;
  materials.glass.roughness = 0.055;
  materials.glass.side = THREE.FrontSide;
  materials.glass.depthWrite = false;
  const group = new THREE.Group();
  const shell = miniature ? new THREE.Group() : null;
  if (shell) {
    shell.name = "Lifted architectural shell";
    group.add(shell);
  }
  function lift(object) {
    if (miniature) object.userData.miniaturePart = "shell";
    return object;
  }
  const geometries = new Set(),
    extraMaterials = new Set(),
    textures = new Set(),
    animated = new Set();
  const animations = [];
  const pending = [];
  const imageTexture = createLocalImageTextures(renderer, pending, textures);
  const prints = createPrintMaterials({
    imageTexture,
    ownMaterial: (material) => extraMaterials.add(material),
  });
  for (const map of [
    materials.floor.map,
    materials.floor.normalMap,
    materials.floor.roughnessMap,
  ])
    map.repeat.set(2.5, 2.7);
  const walls = [],
    windows = [],
    doors = [],
    mirrors = [];
  let layout;
  const ownMaterial = (value) => {
    extraMaterials.add(value);
    return value;
  };
  const ownGeometry = (value) => {
    geometries.add(value);
    return value;
  };
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const range = (lo, hi) => lo + random() * (hi - lo);
  const material = (color, roughness = 0.75, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    extraMaterials.add(m);
    return m;
  };
  const texture = (draw, repeat = [1, 1], size = 1024) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    draw(canvas.getContext("2d"), size);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures.add(t);
    return t;
  };
  const textile = (colors, repeat = [1, 1], pattern = "stripe") => {
    const map = texture((c, size) => {
      c.fillStyle = colors[0];
      c.fillRect(0, 0, size, size);
      for (let x = 0; x < size; x += 32) {
        c.fillStyle = colors[Math.floor(x / 32) % colors.length];
        c.fillRect(x, 0, 24, size);
        if (pattern === "diamond")
          for (let y = 0; y < size; y += 96) {
            c.strokeStyle = colors[(Math.floor(x / 32) + 2) % colors.length];
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(x + 12, y);
            c.lineTo(x + 24, y + 46);
            c.lineTo(x + 12, y + 92);
            c.lineTo(x, y + 46);
            c.closePath();
            c.stroke();
          }
      }
      for (let y = 0; y < size; y += 2) {
        c.fillStyle = y % 4 ? "#00000022" : "#ffffff19";
        c.fillRect(0, y, size, 1);
      }
      for (let x = 0; x < size; x += 3) {
        c.fillStyle = "#ffffff0d";
        c.fillRect(x, 0, 1, size);
      }
    }, repeat);
    const mat = material(0xffffff, 0.98);
    mat.map = map;
    mat.bumpMap = map;
    mat.bumpScale = 0.004;
    mat.side = THREE.DoubleSide;
    mat.userData.patinaProfile = "fabric";
    return mat;
  };
  function mesh(
    geo,
    mat,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    parent = group,
  ) {
    geometries.add(geo);
    const o = new THREE.Mesh(geo, mat);
    o.position.set(...position);
    o.rotation.set(...rotation);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function box(
    size,
    position,
    mat = materials.cedar,
    parent = group,
    bevel = 0.008,
    rotation = [0, 0, 0],
  ) {
    return mesh(
      bevel
        ? new RoundedBoxGeometry(
            ...size,
            2,
            Math.min(bevel, Math.min(...size) * 0.22),
          )
        : new THREE.BoxGeometry(...size),
      mat,
      position,
      rotation,
      parent,
    );
  }
  function sub(position = [0, 0, 0], angle = 0, parent = group) {
    const g = new THREE.Group();
    g.position.set(...position);
    g.rotation.y = angle;
    parent.add(g);
    return g;
  }
  function lathe(
    profile,
    position,
    mat = materials.cream,
    parent = group,
    segments = 40,
  ) {
    return mesh(
      new THREE.LatheGeometry(
        profile.map((p) => new THREE.Vector2(...p)),
        segments,
      ),
      mat,
      position,
      [0, 0, 0],
      parent,
    );
  }
  function cylinder(
    radius,
    height,
    position,
    mat = materials.cedar,
    parent = group,
    bottom = radius,
    segments = 32,
  ) {
    return mesh(
      new THREE.CylinderGeometry(radius, bottom, height, segments),
      mat,
      position,
      [0, 0, 0],
      parent,
    );
  }
  function sphere(radius, position, mat, parent = group, scale = [1, 1, 1]) {
    const o = mesh(
      new THREE.SphereGeometry(radius, 16, 12),
      mat,
      position,
      [0, 0, 0],
      parent,
    );
    o.scale.set(...scale);
    return o;
  }
  function rod(
    start,
    end,
    radius,
    mat = materials.cedar,
    parent = group,
    top = radius,
  ) {
    const a = new THREE.Vector3(...start),
      b = new THREE.Vector3(...end),
      d = b.clone().sub(a);
    const o = cylinder(
      radius,
      d.length(),
      a.add(b).multiplyScalar(0.5).toArray(),
      mat,
      parent,
      top,
      8,
    );
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return o;
  }
  function tube(
    points,
    radius,
    mat = materials.brass,
    parent = group,
    closed = false,
  ) {
    const path = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      closed,
    );
    return mesh(
      new THREE.TubeGeometry(
        path,
        Math.max(24, points.length * 4),
        radius,
        6,
        closed,
      ),
      mat,
      [0, 0, 0],
      [0, 0, 0],
      parent,
    );
  }
  function ring(
    radius,
    thickness,
    position,
    mat = materials.brass,
    parent = group,
    rotation = [Math.PI / 2, 0, 0],
  ) {
    return mesh(
      new THREE.TorusGeometry(radius, thickness, 8, 40),
      mat,
      position,
      rotation,
      parent,
    );
  }
  function cushion(size, position, mat, parent = group, rotation = [0, 0, 0]) {
    const geo = new THREE.SphereGeometry(1, 28, 18),
      p = geo.attributes.position;
    const shape = (v) => Math.sign(v) * Math.abs(v) ** 0.43;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      p.setXYZ(
        i,
        (shape(x) * size[0]) / 2,
        ((shape(y) * size[1]) / 2) * (1 + 0.012 * Math.sin(x * 24 + z * 17)),
        (shape(z) * size[2]) / 2,
      );
    }
    geo.computeVertexNormals();
    const uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++)
      uv.setXY(
        i,
        p.getX(i) / size[0] + 0.5,
        (size[1] > size[2] ? p.getY(i) / size[1] : p.getZ(i) / size[2]) + 0.5,
      );
    return mesh(geo, mat, position, rotation, parent);
  }
  function animateFabric(object, amplitude = 0.004) {
    const positions = object.geometry.attributes.position;
    positions.setUsage(THREE.DynamicDrawUsage);
    const rest = positions.array.slice();
    object.geometry.computeBoundingBox();
    const { min, max } = object.geometry.boundingBox;
    const span = Math.max(0.001, max.y - min.y);
    animated.add(object);
    animations.push((_, time) => {
      for (let i = 0; i < positions.count; i++) {
        const x = rest[i * 3],
          y = rest[i * 3 + 1],
          free = (max.y - y) / span;
        positions.setZ(
          i,
          rest[i * 3 + 2] +
            amplitude * free * free * Math.sin(time * 0.65 + x * 2.1 + y),
        );
      }
      positions.needsUpdate = true;
      object.geometry.computeVertexNormals();
    });
    return object;
  }
  const woodFloor = materials.cedar.clone();
  extraMaterials.add(woodFloor);
  woodFloor.color.set(0xbc9771);
  woodFloor.roughness = 0.73;
  let plaster = materials.plaster;
  if (rustic) {
    plaster = material(0xffffff, 0.96);
    plaster.color.setRGB(2.8, 2.45, 2.0);
    const loader = new THREE.TextureLoader();
    for (const [suffix, slot] of [
      ["diff", "map"],
      ["nor_gl", "normalMap"],
      ["rough", "roughnessMap"],
    ]) {
      let resolve, reject;
      pending.push(
        new Promise((yes, no) => {
          resolve = yes;
          reject = no;
        }),
      );
      const map = loader.load(
        sitePath(
          `/public/interiors/materials/plastered_stone_wall_${suffix}.jpg`,
        ),
        resolve,
        undefined,
        reject,
      );
      map.colorSpace =
        suffix === "diff" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(2.5, 1);
      map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      textures.add(map);
      plaster[slot] = map;
    }
    plaster.normalScale.set(0.4, 0.4);
  }
  const m = {
    ...materials,
    woodFloor,
    plaster,
    iron: material(0x252724, 0.48, 0.8),
    red: material(0x62332a),
    jade: material(0x46685e),
    paper: material(0xd9c8a6, 1),
    linen: textile(["#b9ac94", "#b9ac94", "#d5c8ad"]),
  };

  function floor(width, depth, kind = "wood") {
    if (kind !== "wood")
      return box([width, 0.14, depth], [0, -0.075, 0], m.floor, group, 0.008);
    box([width, 0.1, depth], [0, -0.09, 0], m.dark, group, 0);
    const plankWidth = 0.23,
      count = Math.floor(width / plankWidth);
    const boards = Array.from({ length: 8 }, () => {
      const mat = woodFloor.clone();
      extraMaterials.add(mat);
      mat.color.offsetHSL(0, 0, range(-0.045, 0.035));
      return mat;
    });
    for (let i = 0; i < count; i++) {
      const x = -width / 2 + ((i + 0.5) * width) / count;
      for (let j = 0; j < 5; j++) {
        const len = depth / 5,
          z = -depth / 2 + (j + 0.5) * len;
        const mat = boards[Math.floor(random() * boards.length)];
        box(
          [width / count - 0.003, 0.05, len - 0.004],
          [x, -0.027 + range(-0.001, 0.001), z],
          mat,
          group,
          0.002,
        );
      }
    }
  }
  const ceilingWood = materials.cedar.clone();
  extraMaterials.add(ceilingWood);
  ceilingWood.roughnessMap = null;
  ceilingWood.roughness = 1;
  ceilingWood.color.set(0x9f927d);
  function wallWithOpenings(
    parent,
    width,
    height,
    thickness,
    holes,
    mat = plaster,
    bottom = 0,
  ) {
    const top = bottom + height;
    const levels = [
      ...new Set([
        bottom,
        top,
        ...holes.flatMap((hole) => [
          Math.max(bottom, Math.min(top, hole.bottom)),
          Math.max(bottom, Math.min(top, hole.top)),
        ]),
      ]),
    ].sort((a, b) => a - b);
    for (let i = 0; i < levels.length - 1; i++) {
      const low = levels[i],
        high = levels[i + 1],
        middle = (low + high) / 2;
      const gaps = holes
        .filter((hole) => hole.bottom < middle && hole.top > middle)
        .sort((a, b) => a.x - b.x);
      let edge = -width / 2;
      for (const hole of [...gaps, { x: width / 2, width: 0 }]) {
        const left = Math.min(width / 2, hole.x - hole.width / 2);
        if (left > edge && high > low)
          box(
            [left - edge, high - low, thickness],
            [(left + edge) / 2, middle, 0],
            mat,
            parent,
            0,
          );
        edge = Math.max(edge, hole.x + hole.width / 2);
      }
    }
  }
  function wallPanel({
    position,
    angle = 0,
    width,
    height,
    thickness = 0.24,
    bottom = 0,
    material = plaster,
  }) {
    walls.push({ position, angle, width, height, thickness, bottom, material });
  }
  function room({
    width = 7.2,
    depth = 9,
    height = 3.5,
    floorKind = "wood",
    wall = plaster,
    ceiling = ceilingWood,
    openLeft = false,
    openRight = false,
  } = {}) {
    layout = Object.freeze({
      width,
      depth,
      height,
      floorKind,
      wall,
      ceiling,
      openLeft,
      openRight,
    });
    floor(width, depth, floorKind);
    wallPanel({
      position: [0, 0, -depth / 2],
      width: width + 0.4,
      height,
      material: wall,
    });
    for (const [side, open] of [
      [-1, openLeft],
      [1, openRight],
    ])
      if (!open)
        wallPanel({
          position: [(side * width) / 2, 0, 0],
          angle: Math.PI / 2,
          width: depth,
          height,
          material: wall,
        });
    lift(box([width, 0.2, depth], [0, height + 0.1, 0], ceiling));
    // Entrance is behind the initial visitor position, so looking around stays coherent.
    const side = (width - 1.6) / 2;
    for (const sign of [-1, 1])
      lift(
        box(
          [side, height, 0.18],
          [sign * (width / 2 - side / 2), height / 2, depth / 2],
          wall,
        ),
      );
    lift(
      box([1.6, height - 2.6, 0.18], [0, (height + 2.6) / 2, depth / 2], wall),
    );
    for (const x of [-width / 2 + 0.14, width / 2 - 0.14]) {
      box([0.08, 0.19, depth], [x, 0.1, 0], m.cedar);
      lift(box([0.12, 0.12, depth], [x, height - 0.1, 0], m.cedar));
    }
    wallPanel({
      position: [0, 0, -depth / 2 + 0.14],
      width,
      height: 0.19,
      thickness: 0.1,
      material: m.cedar,
    });
    for (let z = -depth / 2 + 0.8; z < depth / 2; z += 1.5)
      lift(box([width, 0.16, 0.12], [0, height - 0.04, z], m.cedar));
    return layout;
  }
  function windowPanel(
    position,
    width = 1.7,
    height = 1.85,
    angle = 0,
    curtains = true,
  ) {
    const g = sub(position, angle);
    windows.push(
      Object.freeze({
        position: Object.freeze([...position]),
        width,
        height,
        angle,
      }),
    );
    const daylight = new THREE.RectAreaLight(0xddeaff, 4.0, width, height);
    daylight.position.set(0, 0, -0.22);
    daylight.rotation.y = Math.PI;
    g.add(daylight);
    const glazing = mesh(
      new THREE.PlaneGeometry(width - 0.07, height - 0.07),
      m.glass,
      [0, 0, -0.08],
      [0, 0, 0],
      g,
    );
    glazing.name = "Window glazing";
    glazing.castShadow = false;
    for (const sign of [-1, 1]) {
      box(
        [0.085, height + 0.2, 0.34],
        [(sign * width) / 2, 0, -0.06],
        m.cedar,
        g,
      );
      box(
        [width + 0.2, 0.085, 0.34],
        [0, (sign * height) / 2, -0.06],
        m.cedar,
        g,
      );
    }
    box([0.05, height, 0.1], [0, 0, 0.065], m.cedar, g);
    for (const y of [-height / 6, height / 6])
      box([width, 0.035, 0.08], [0, y, 0.07], m.cedar, g);
    box([width + 0.24, 0.08, 0.28], [0, -height / 2 - 0.05, 0.12], m.cedar, g);
    if (curtains) {
      for (const sign of [-1, 1]) {
        const geo = new THREE.PlaneGeometry(
            width * 0.29,
            height * 0.92,
            24,
            18,
          ),
          p = geo.attributes.position;
        for (let i = 0; i < p.count; i++)
          p.setZ(
            i,
            Math.sin(p.getX(i) * 66) * 0.033 + Math.sin(p.getY(i) * 2) * 0.025,
          );
        geo.computeVertexNormals();
        animateFabric(
          mesh(geo, m.linen, [sign * width * 0.4, -0.03, 0.2], [0, 0, 0], g),
        );
      }
      rod(
        [-width * 0.6, height * 0.55, 0.2],
        [width * 0.6, height * 0.55, 0.2],
        0.016,
        m.brass,
        g,
      );
    }
    return g;
  }
  function doorOpening(position, width = 1.22, height = 2.62, angle = 0) {
    doors.push({ position: [...position], width, height, angle });
    const g = sub(position, angle);
    for (const side of [-1, 1])
      box(
        [0.08, height + 0.06, 0.38],
        [side * (width / 2 + 0.025), 0, -0.06],
        m.cedar,
        g,
      );
    box([width + 0.18, 0.09, 0.38], [0, height / 2 + 0.025, -0.06], m.cedar, g);
    box([width, 0.035, 0.47], [0, -height / 2 + 0.006, -0.05], m.marble, g);
    const leaf = sub([-width / 2 + 0.025, -height / 2, -0.08], 1.4, g);
    leaf.name = "Open timber door";
    box(
      [width - 0.09, height - 0.1, 0.065],
      [(width - 0.09) / 2, height / 2, 0],
      m.cedar,
      leaf,
    );
    for (const y of [height * 0.28, height * 0.72]) {
      box(
        [width - 0.29, height * 0.34, 0.015],
        [(width - 0.09) / 2, y, 0.039],
        m.cedar,
        leaf,
      );
      cylinder(0.012, 0.12, [0, y, 0], m.brass, leaf);
    }
    ring(0.025, 0.005, [width - 0.2, 1.05, 0.05], m.brass, leaf, [0, 0, 0]);
    return g;
  }
  function framedText(
    text,
    position,
    width = 0.7,
    height = 0.5,
    angle = 0,
    dark = false,
  ) {
    const map = texture((c, s) => {
      c.fillStyle = dark ? "#25312b" : "#cdbb94";
      c.fillRect(0, 0, s, s);
      c.strokeStyle = dark ? "#a6b49c" : "#75644c";
      c.lineWidth = 5;
      c.strokeRect(36, 36, s - 72, s - 72);
      c.fillStyle = dark ? "#dedbd0" : "#302a22";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = "54px Georgia";
      text
        .split("\n")
        .forEach((line, i, lines) =>
          c.fillText(
            line,
            s / 2,
            s / 2 + (i - (lines.length - 1) / 2) * 95,
            s * 0.8,
          ),
        );
    });
    const mat = material(0xffffff, 0.98);
    mat.map = map;
    const g = sub(position, angle);
    box([width + 0.08, height + 0.08, 0.04], [0, 0, -0.016], m.cedar, g);
    mesh(
      new THREE.PlaneGeometry(width, height),
      mat,
      [0, 0, 0.008],
      [0, 0, 0],
      g,
    );
    return g;
  }
  function mirror(position, width, height, angle = 0) {
    const g = sub(position, angle);
    const surface = new Reflector(new THREE.PlaneGeometry(width, height), {
      textureWidth: 768,
      textureHeight: 768,
      color: 0xbcb7a4,
      clipBias: 0.003,
    });
    g.add(surface);
    animated.add(surface);
    mirrors.push(surface);
    for (const sign of [-1, 1]) {
      box(
        [width + 0.15, 0.065, 0.08],
        [0, sign * (height / 2 + 0.035), 0.015],
        m.brass,
        g,
      );
      box(
        [0.065, height + 0.2, 0.08],
        [sign * (width / 2 + 0.035), 0, 0.015],
        m.brass,
        g,
      );
    }
    return g;
  }
  function lightRoom({
    daylight = true,
    warm = 0xffd8a7,
    intensity = 2.3,
    height = 3.5,
    sunPosition = [-3, 4, 5],
  } = {}) {
    group.add(
      new THREE.HemisphereLight(
        daylight ? 0xc6d7dc : 0xb7bcb0,
        0x75634c,
        daylight ? 0.38 : 0.25,
      ),
    );
    const sun = new THREE.DirectionalLight(
      daylight ? 0xffecd3 : warm,
      intensity,
    );
    sun.position.set(...sunPosition);
    sun.target.position.set(0, 0.5, -2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -6,
      right: 6,
      top: 6,
      bottom: -6,
      near: 0.1,
      far: 30,
    });
    sun.shadow.bias = -0.00015;
    sun.shadow.normalBias = 0.018;
    group.add(sun, sun.target);
    const bounce = new THREE.PointLight(warm, daylight ? 5 : 9, 12, 2);
    bounce.position.set(0, height - 0.7, 1);
    group.add(bounce);
    return sun;
  }
  function finish(
    definition,
    views,
    anchors,
    {
      environmentIntensity = 0.36,
      exposure = 0.98,
      soundscape,
      aoScale,
      fog,
      depthProbes = [],
    } = {},
  ) {
    for (const wall of walls) {
      const panel = sub(wall.position, wall.angle);
      const cosine = Math.cos(wall.angle),
        sine = Math.sin(wall.angle);
      const holes = [...windows, ...doors].flatMap((opening) => {
        const dx = opening.position[0] - wall.position[0],
          dz = opening.position[2] - wall.position[2];
        if (
          Math.abs(sine * dx + cosine * dz) > 0.4 ||
          Math.abs(Math.cos(opening.angle - wall.angle)) < 0.99
        )
          return [];
        return [
          {
            x: cosine * dx - sine * dz,
            width: opening.width,
            bottom: opening.position[1] - wall.position[1] - opening.height / 2,
            top: opening.position[1] - wall.position[1] + opening.height / 2,
          },
        ];
      });
      wallWithOpenings(
        panel,
        wall.width,
        wall.height,
        wall.thickness,
        holes,
        wall.material,
        wall.bottom,
      );
    }
    if (shell) {
      const parts = [];
      group.traverse((object) => {
        if (object.userData.miniaturePart === "shell") parts.push(object);
      });
      group.updateMatrixWorld(true);
      for (const part of parts) shell.attach(part);
    }
    const hotspotAnchors = definition.details.map((detail, index) => {
      const point = Array.isArray(anchors)
        ? anchors[index % anchors.length]
        : (anchors[detail.id] ?? anchors[detail.anchor] ?? anchors.default);
      if (point) detail.point = [...point];
      const a = new THREE.Object3D();
      a.position.fromArray(detail.point);
      group.add(a);
      return a;
    });
    group.updateMatrixWorld(true);
    const batches = new Map(),
      remove = [];
    group.traverse((o) => {
      let moving = o;
      while (moving && !animated.has(moving)) moving = moving.parent;
      if (
        !o.isMesh ||
        o.isInstancedMesh ||
        moving ||
        Array.isArray(o.material) ||
        o.material.transparent
      )
        return;
      let root = o.parent;
      while (root !== group && root !== shell && !root.userData.batchRoot)
        root = root.parent;
      const key = `${root.uuid}/${o.material.uuid}/${Boolean(o.geometry.index)}/${o.castShadow}`;
      if (!batches.has(key))
        batches.set(key, {
          root,
          material: o.material,
          cast: o.castShadow,
          pieces: [],
        });
      const geo = o.geometry.clone();
      stampSurfaceVariation(geo, o.matrixWorld);
      geo.applyMatrix4(
        new THREE.Matrix4()
          .copy(root.matrixWorld)
          .invert()
          .multiply(o.matrixWorld),
      );
      batches.get(key).pieces.push(geo);
      remove.push(o);
    });
    for (const b of batches.values()) {
      const geo = mergeGeometries(b.pieces, false);
      b.pieces.forEach((p) => p.dispose());
      if (!geo) throw new Error(`Could not assemble ${definition.title}.`);
      const o = mesh(geo, b.material, [0, 0, 0], [0, 0, 0], b.root);
      o.castShadow = b.cast;
    }
    remove.forEach((o) => {
      o.removeFromParent();
      o.geometry.dispose();
      geometries.delete(o.geometry);
    });
    let reflection = null;
    let disposed = false;
    return {
      group,
      shell,
      layout,
      animations,
      hotspots: hotspotAnchors,
      views,
      environmentIntensity,
      exposure,
      soundscape,
      aoScale,
      fog,
      depthProbes,
      ready: Promise.all([materials.ready, ...pending]),
      focus: {
        group: Object.assign(new THREE.Group(), { visible: false }),
        ring: new THREE.Object3D(),
        orb: new THREE.Object3D(),
      },
      captureReflections(scene) {
        reflection?.texture.dispose();
        reflection?.dispose();
        const capture = new THREE.WebGLCubeRenderTarget(128, {
          type: THREE.HalfFloatType,
        });
        const probe = new THREE.CubeCamera(0.1, 30, capture);
        probe.position.set(0, 1.5, 0);
        probe.update(renderer, scene);
        // Own the filtered map explicitly: automatic PMREM conversion of a cube
        // render target in Three r183 does not attach its disposal listener.
        const prefilter = new THREE.PMREMGenerator(renderer);
        reflection = prefilter.fromCubemap(capture.texture);
        prefilter.dispose();
        capture.dispose();
        for (const mat of [m.brass, m.bronze, m.glass]) {
          mat.envMap = reflection.texture;
          mat.envMapIntensity = 0.6;
          mat.needsUpdate = true;
        }
        group.traverse((o) => {
          if (o.isLight && o.shadow) {
            o.shadow.autoUpdate = false;
            o.shadow.needsUpdate = true;
          }
        });
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        soundscape?.dispose();
        reflection?.texture.dispose();
        reflection?.dispose();
        mirrors.forEach((o) => {
          o.geometry.dispose();
          o.dispose();
        });
        geometries.forEach((g) => g.dispose());
        extraMaterials.forEach((mat) => mat.dispose());
        textures.forEach((t) => t.dispose());
        group.traverse((o) => {
          if (o.isInstancedMesh) o.dispose();
          if (o.isLight) o.dispose();
        });
        materials.dispose();
      },
    };
  }
  const kit = {
    group,
    miniature,
    shell,
    lift,
    m,
    random,
    range,
    material,
    ownMaterial,
    ownGeometry,
    texture,
    imageTexture,
    prints,
    textile,
    mesh,
    box,
    sub,
    lathe,
    cylinder,
    sphere,
    rod,
    tube,
    ring,
    cushion,
    animateFabric,
    get layout() {
      return layout;
    },
    get windows() {
      return Object.freeze([...windows]);
    },
    room,
    wallPanel,
    wallWithOpenings,
    doorOpening,
    floor,
    windowPanel,
    framedText,
    mirror,
    lightRoom,
    finish,
    animations,
    animated,
  };
  Object.assign(kit, createPaperProps(kit));
  return kit;
}
