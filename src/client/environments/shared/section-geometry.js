import * as THREE from "three";

const EPSILON = 1e-5;
const pointKey = (point) =>
  point.map((value) => Math.round(value / EPSILON)).join(",");

function inside(point, polygon) {
  let contained = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      contained = !contained;
  }
  return contained;
}

function capTriangles(segments, plane, names, sizes) {
  const points = new Map(),
    edges = [],
    adjacency = new Map();
  for (const [a, b] of segments) {
    const ka = pointKey(a.position),
      kb = pointKey(b.position);
    if (ka === kb) continue;
    points.set(ka, a);
    points.set(kb, b);
    const index = edges.length;
    edges.push([ka, kb]);
    for (const key of [ka, kb]) {
      if (!adjacency.has(key)) adjacency.set(key, []);
      adjacency.get(key).push(index);
    }
  }
  const used = new Set(),
    loops = [];
  for (let start = 0; start < edges.length; start++) {
    if (used.has(start)) continue;
    const first = edges[start][0],
      keys = [first];
    let current = first,
      edge = start;
    while (edge !== undefined && !used.has(edge)) {
      used.add(edge);
      const pair = edges[edge];
      current = pair[0] === current ? pair[1] : pair[0];
      if (current === first) break;
      keys.push(current);
      edge = adjacency.get(current)?.find((index) => !used.has(index));
    }
    // Open surfaces (leaves, cloth, water) have no volume to cap.
    if (current === first && keys.length >= 3)
      loops.push(keys.map((key) => points.get(key)));
  }
  const normal = plane.normal.clone().negate();
  const u = new THREE.Vector3(
    Math.abs(normal.y) < 0.9 ? 0 : 1,
    Math.abs(normal.y) < 0.9 ? 1 : 0,
    0,
  )
    .cross(normal)
    .normalize();
  const v = normal.clone().cross(u);
  const projected = loops.map((loop) =>
    loop.map((vertex) => {
      const point = new THREE.Vector3(...vertex.position);
      return new THREE.Vector2(point.dot(u), point.dot(v));
    }),
  );
  const areas = projected.map((loop) => Math.abs(THREE.ShapeUtils.area(loop)));
  const parents = projected.map((loop, i) => {
    let parent = -1;
    for (let j = 0; j < projected.length; j++)
      if (
        areas[j] > areas[i] + EPSILON &&
        inside(loop[0], projected[j]) &&
        (parent < 0 || areas[j] < areas[parent])
      )
        parent = j;
    return parent;
  });
  const depth = (index) => (parents[index] < 0 ? 0 : depth(parents[index]) + 1);
  const triangles = [];
  for (let i = 0; i < loops.length; i++) {
    if (depth(i) % 2 || areas[i] < EPSILON * EPSILON) continue;
    const holes = parents.flatMap((parent, index) =>
      parent === i ? [index] : [],
    );
    const vertices = [loops[i], ...holes.map((h) => loops[h])].flat();
    for (const triangle of THREE.ShapeUtils.triangulateShape(
      projected[i],
      holes.map((h) => projected[h]),
    )) {
      const face = triangle.map((index) => {
        const source = vertices[index],
          vertex = {};
        for (const name of names) vertex[name] = [...source[name]];
        vertex.normal = normal.toArray();
        const point = new THREE.Vector3(...source.position);
        for (const name of names)
          if (name.startsWith("uv") && sizes[name] === 2)
            vertex[name] = [point.dot(u), point.dot(v)];
        return vertex;
      });
      const a = new THREE.Vector3(...face[0].position);
      const b = new THREE.Vector3(...face[1].position).sub(a);
      const c = new THREE.Vector3(...face[2].position).sub(a);
      if (b.cross(c).dot(normal) < 0) face.reverse();
      triangles.push(face);
    }
  }
  return triangles;
}

/** Retain the positive half-spaces, interpolating attributes and closing solid cuts. */
export function sectionGeometry(source, planes) {
  if (
    !source.attributes.position ||
    planes.some((plane) => !Number.isFinite(plane.constant))
  )
    throw new Error("A geometry section needs positions and finite planes.");
  const names = Object.keys(source.attributes);
  const sizes = Object.fromEntries(
    names.map((name) => [name, source.attributes[name].itemSize]),
  );
  let current = source;
  for (const plane of planes) {
    current.computeBoundingBox();
    if (current.boundingBox.isEmpty()) break;
    const center = current.boundingBox.getCenter(new THREE.Vector3());
    const half = current.boundingBox
      .getSize(new THREE.Vector3())
      .multiplyScalar(0.5);
    const radius =
      Math.abs(plane.normal.x) * half.x +
      Math.abs(plane.normal.y) * half.y +
      Math.abs(plane.normal.z) * half.z;
    if (plane.distanceToPoint(center) - radius >= -EPSILON) continue;
    const index = current.index,
      count = index ? index.count : current.attributes.position.count;
    let capacity = Math.max(3, count),
      length = 0;
    let buffers = Object.fromEntries(
      names.map((name) => [name, new Float32Array(capacity * sizes[name])]),
    );
    const append = (points) => {
      if (length + points.length > capacity) {
        capacity = Math.max(capacity * 2, length + points.length);
        buffers = Object.fromEntries(
          names.map((name) => {
            const buffer = new Float32Array(capacity * sizes[name]);
            buffer.set(buffers[name]);
            return [name, buffer];
          }),
        );
      }
      for (const point of points) {
        for (const name of names) {
          const size = sizes[name];
          for (let axis = 0; axis < size; axis++)
            buffers[name][length * size + axis] =
              typeof point === "number"
                ? current.attributes[name].getComponent(point, axis)
                : point[name][axis];
        }
        length++;
      }
    };
    const vertex = (vertexIndex) =>
      Object.fromEntries(
        names.map((name) => [
          name,
          Array.from({ length: sizes[name] }, (_, axis) =>
            current.attributes[name].getComponent(vertexIndex, axis),
          ),
        ]),
      );
    const distance = (point) =>
      plane.normal.x * point[0] +
      plane.normal.y * point[1] +
      plane.normal.z * point[2] +
      plane.constant;
    const segments = [];
    for (let start = 0; start < count; start += 3) {
      const indices = [0, 1, 2].map((offset) =>
        index ? index.getX(start + offset) : start + offset,
      );
      const positions = indices.map((i) => [
        current.attributes.position.getX(i),
        current.attributes.position.getY(i),
        current.attributes.position.getZ(i),
      ]);
      const distances = positions.map(distance);
      if (distances.every((d) => d >= -EPSILON)) {
        append(indices);
        continue;
      }
      if (distances.every((d) => d < EPSILON)) continue;
      const triangle = indices.map(vertex);
      const polygon = [],
        crossings = [];
      for (let i = 0; i < 3; i++) {
        const a = triangle[i],
          b = triangle[(i + 1) % 3];
        const da = distances[i],
          db = distances[(i + 1) % 3];
        if (da >= 0) polygon.push(a);
        if (da < 0 !== db < 0) {
          const fraction = da / (da - db);
          const cut = Object.fromEntries(
            names.map((name) => [
              name,
              a[name].map(
                (value, component) =>
                  value + (b[name][component] - value) * fraction,
              ),
            ]),
          );
          polygon.push(cut);
          crossings.push(cut);
        }
      }
      if (crossings.length === 2) segments.push(crossings);
      for (let i = 1; i < polygon.length - 1; i++)
        append([polygon[0], polygon[i], polygon[i + 1]]);
    }
    for (const triangle of capTriangles(segments, plane, names, sizes))
      append(triangle);
    const result = new THREE.BufferGeometry();
    for (const name of names)
      result.setAttribute(
        name,
        new THREE.BufferAttribute(
          buffers[name].slice(0, length * sizes[name]),
          sizes[name],
        ),
      );
    if (current !== source) current.dispose();
    current = result;
    if (!length) break;
  }
  const result = current === source ? source.clone() : current;
  result.normalizeNormals();
  result.computeBoundingBox();
  result.computeBoundingSphere();
  return result;
}

export function boxPlanes(bounds) {
  return [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -bounds.min.x),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), bounds.max.x),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -bounds.min.y),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), bounds.max.y),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -bounds.min.z),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), bounds.max.z),
  ];
}
