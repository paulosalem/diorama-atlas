import * as THREE from "three";

export function clipPolygon(polygon, a, b, threshold) {
  const result = [];
  for (let i = 0; i < polygon.length; i++) {
    const start = polygon[i],
      end = polygon[(i + 1) % polygon.length];
    const ds = a * start[0] + b * start[1] - threshold;
    const de = a * end[0] + b * end[1] - threshold;
    if (ds <= 1e-8) result.push(start);
    if (ds < 0 !== de < 0) {
      const t = ds / (ds - de);
      result.push([
        start[0] + t * (end[0] - start[0]),
        start[1] + t * (end[1] - start[1]),
      ]);
    }
  }
  return result;
}

export function polygonPrismGeometry(outline, height, bevel = 0) {
  if (
    outline.length < 3 ||
    outline.flat().some((n) => !Number.isFinite(n)) ||
    !Number.isFinite(height) ||
    height <= 0 ||
    !Number.isFinite(bevel) ||
    bevel < 0
  )
    throw new Error(
      "A polygon prism needs a finite outline and positive height.",
    );
  const shape = new THREE.Shape(
    outline.map(([x, z]) => new THREE.Vector2(x, -z)),
  );
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export function slopedPanelGeometry(corners, thickness, segments = 1) {
  if (
    corners.length !== 4 ||
    corners.some(
      (point) => point.length !== 3 || point.some((n) => !Number.isFinite(n)),
    ) ||
    !Number.isFinite(thickness) ||
    thickness <= 0 ||
    !Number.isInteger(segments) ||
    segments < 1
  )
    throw new Error(
      "A sloped panel needs four finite corners and positive thickness.",
    );
  const [a, b, c, d] = corners.map((p) => new THREE.Vector3(...p));
  const points = [];
  for (let row = 0; row <= segments; row++)
    for (let column = 0; column <= segments; column++) {
      const u = column / segments,
        v = row / segments;
      points.push(a.clone().lerp(b, u).lerp(d.clone().lerp(c, u), v).toArray());
    }
  const count = points.length,
    stride = segments + 1;
  points.push(...points.map(([x, y, z]) => [x, y - thickness, z]));
  const indices = [];
  for (let row = 0; row < segments; row++)
    for (let column = 0; column < segments; column++) {
      const i = row * stride + column,
        below = i + stride;
      indices.push(
        i,
        below,
        i + 1,
        i + 1,
        below,
        below + 1,
        i + count,
        i + 1 + count,
        below + count,
        i + 1 + count,
        below + 1 + count,
        below + count,
      );
    }
  const perimeter = [];
  for (let column = 0; column <= segments; column++) perimeter.push(column);
  for (let row = 1; row <= segments; row++)
    perimeter.push(row * stride + segments);
  for (let column = segments - 1; column >= 0; column--)
    perimeter.push(segments * stride + column);
  for (let row = segments - 1; row > 0; row--) perimeter.push(row * stride);
  for (let edge = 0; edge < perimeter.length; edge++) {
    const i = perimeter[edge],
      next = perimeter[(edge + 1) % perimeter.length];
    indices.push(i, next, i + count, next, next + count, i + count);
  }
  if (
    THREE.ShapeUtils.area(corners.map(([x, , z]) => new THREE.Vector2(x, z))) <
    0
  )
    for (let i = 0; i < indices.length; i += 3)
      [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      indices.flatMap((i) => points[i]),
      3,
    ),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(
      indices.flatMap((i) => [points[i][0], points[i][2]]),
      2,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}
