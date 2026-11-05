import * as THREE from "three";

/** Snapshot visible geometry for repeated exact, short-range clearance rays. */
export function createGeometryProbe(root) {
  root.updateMatrixWorld(true);
  const cells = new Map();
  const owned = [];
  let disposed = false;
  const index = (entry) => {
    for (
      let x = Math.floor(entry.bounds.min.x);
      x <= Math.floor(entry.bounds.max.x);
      x++
    )
      for (
        let z = Math.floor(entry.bounds.min.z);
        z <= Math.floor(entry.bounds.max.z);
        z++
      ) {
        const key = `${x},${z}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(entry);
      }
  };
  root.traverseVisible((object) => {
    if (!object.isMesh) return;
    const source = object.geometry;
    source.computeBoundingBox();
    if (object.isInstancedMesh) {
      const mesh = new THREE.Mesh(source, object.material);
      for (let i = 0; i < object.count; i++) {
        const matrix = new THREE.Matrix4();
        object.getMatrixAt(i, matrix);
        matrix.premultiply(object.matrixWorld);
        index({
          mesh,
          matrix,
          bounds: source.boundingBox.clone().applyMatrix4(matrix),
        });
      }
      return;
    }
    const count = source.index?.count ?? source.attributes.position.count;
    const spans = Array.isArray(object.material)
      ? source.groups.map((group) => ({
          ...group,
          material: object.material[group.materialIndex],
        }))
      : [{ start: 0, count, material: object.material }];
    for (const span of spans) {
      const first = Math.max(span.start, source.drawRange.start);
      const last = Math.min(
        span.start + span.count,
        source.drawRange.start + source.drawRange.count,
        count,
      );
      // Share original attributes; only partition indices, never simplify triangles.
      for (let start = first; start < last; start += 384) {
        const indices = [];
        const bounds = new THREE.Box3();
        const vertex = new THREE.Vector3();
        for (let i = start; i < Math.min(start + 384, last); i++) {
          const offset = source.index ? source.index.getX(i) : i;
          indices.push(offset);
          bounds.expandByPoint(
            vertex.fromBufferAttribute(source.attributes.position, offset),
          );
        }
        const geometry = new THREE.BufferGeometry();
        for (const [name, attribute] of Object.entries(source.attributes))
          geometry.setAttribute(name, attribute);
        geometry.setIndex(indices);
        geometry.boundingBox = bounds;
        geometry.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
        owned.push(geometry);
        const mesh = new THREE.Mesh(geometry, span.material);
        mesh.matrixWorld.copy(object.matrixWorld);
        index({
          mesh,
          bounds: bounds.clone().applyMatrix4(object.matrixWorld),
        });
      }
    }
  });
  const ray = new THREE.Raycaster();
  return {
    probe(origin, direction, distance) {
      if (disposed) throw new Error("Geometry probe has been disposed.");
      if (
        ![...origin, ...direction, distance].every(Number.isFinite) ||
        distance <= 0 ||
        !direction.some((value) => value !== 0)
      )
        throw new RangeError(
          "Geometry probes need finite points, a direction and a positive distance.",
        );
      ray.set(
        new THREE.Vector3(...origin),
        new THREE.Vector3(...direction).normalize(),
      );
      ray.near = 0.002;
      ray.far = distance;
      const bounds = new THREE.Box3().setFromPoints([
        ray.ray.origin,
        ray.ray.at(distance, new THREE.Vector3()),
      ]);
      const entries = new Set();
      for (let x = Math.floor(bounds.min.x); x <= Math.floor(bounds.max.x); x++)
        for (
          let z = Math.floor(bounds.min.z);
          z <= Math.floor(bounds.max.z);
          z++
        )
          for (const entry of cells.get(`${x},${z}`) ?? [])
            if (bounds.intersectsBox(entry.bounds)) entries.add(entry);
      const hits = [];
      for (const { mesh, matrix } of entries) {
        if (matrix) mesh.matrixWorld.copy(matrix);
        mesh.raycast(ray, hits);
      }
      return hits.length ? Math.min(...hits.map((hit) => hit.distance)) : null;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      owned.forEach((geometry) => geometry.dispose());
      owned.length = 0;
      cells.clear();
    },
  };
}
