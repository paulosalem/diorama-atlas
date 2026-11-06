import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  buildCutawayTerrain,
  cutawayRockRelief,
} from "../src/client/environments/shared/cutaway-terrain.js";
import { createRecordedNarration } from "../src/client/viewer/recorded-narration.js";
import { vineyardViews } from "../src/client/environments/outdoors/vineyard-views.js";
import { getStudy, studies } from "../experiments/marrakech/web/scenes.js";
import {
  colorVineyardGround,
  vineyardGrowth,
  vineyardPath,
} from "../src/client/environments/outdoors/vineyard-garden.js";
import {
  oppositeBankBounds,
  oppositeBankHeight,
  oppositeBankProfile,
  oppositeShore,
} from "../src/client/environments/outdoors/vineyard-opposite-bank.js";

test("the miniature is isolated from the four-engine comparison and keeps the original eye-level cameras", () => {
  const miniature = getStudy("douro-miniature");
  assert.equal(miniature.miniature, true);
  assert.equal(miniature.defaultView, "whole");
  assert(!Object.values(studies).includes(miniature));
  assert.notEqual(miniature.assetRoot, getStudy("douro").assetRoot);
  assert.deepEqual(vineyardViews.arrival.position, [7.8, 1.72, -1.3]);
  assert.deepEqual(vineyardViews.quinta.position, [-6.65, 1.62, 1.02]);
  assert.deepEqual(
    Object.values(vineyardViews).map((view) => view.fov),
    [64, 49, 59, 70],
  );
});

test("terrain cutaways close the actual asymmetric footprint without mirrored undersides", () => {
  const soil = new THREE.MeshStandardMaterial(),
    rock = new THREE.MeshStandardMaterial();
  const k = {
    mesh(geometry, material, position = [0, 0, 0]) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.fromArray(position);
      return mesh;
    },
  };
  const specification = {
    boundary: [
      [-2, 0, 3],
      [-2, -1, -6],
      [2, -1, -6],
      [2, 0, 3],
    ],
    bottom: -3,
    soilDepth: 0.3,
    soil,
    rock,
  };
  const meshes = buildCutawayTerrain(k, specification);
  assert.equal(meshes.length, 3);
  for (const mesh of meshes) {
    for (const attribute of Object.values(mesh.geometry.attributes))
      assert([...attribute.array].every(Number.isFinite));
  }
  const underside = meshes.at(-1);
  underside.geometry.computeBoundingBox();
  assert.equal(underside.geometry.boundingBox.min.z, -6);
  assert.equal(underside.geometry.boundingBox.max.z, 3);
  assert.equal(underside.position.y, -3);
  for (let i = 0; i < underside.geometry.attributes.normal.count; i++)
    assert(underside.geometry.attributes.normal.getY(i) < -0.99);
  assert.throws(
    () => buildCutawayTerrain(k, { ...specification, bottom: 1 }),
    /finite boundary/,
  );
  assert.throws(
    () => buildCutawayTerrain(k, { ...specification, bottom: -1.32 }),
    /finite boundary/,
  );
  const side = meshes[0].geometry;
  const rows = 129;
  const columns = side.attributes.position.count / rows;
  assert(columns > specification.boundary.length + 1);
  for (let column = 1; column < columns; column++) {
    const du =
      side.attributes.uv.getX(column * rows) -
      side.attributes.uv.getX((column - 1) * rows);
    assert(du > 0 && du <= 0.35 * 0.35 + 1e-6);
  }
  for (let row = 0; row < rows; row++)
    for (const axis of ["X", "Y", "Z"])
      assert.equal(
        side.attributes.position[`get${axis}`](row),
        side.attributes.position[`get${axis}`]((columns - 1) * rows + row),
        "the texture seam must not open the physical terrain",
      );
  const explicitlyClosed = buildCutawayTerrain(k, {
    ...specification,
    boundary: [...specification.boundary, specification.boundary[0]],
  });
  assert.deepEqual(
    explicitlyClosed[0].geometry.attributes.position.array,
    side.attributes.position.array,
  );
  explicitlyClosed.forEach((mesh) => mesh.geometry.dispose());
  meshes.forEach((mesh) => mesh.geometry.dispose());
  soil.dispose();
  rock.dispose();
});

test("the opposite bank rises from its river half to real hills without bridging the floating gap", () => {
  assert(oppositeBankBounds.back < -25);
  for (const x of [-15, -7, 0, 8, 15]) {
    const profile = oppositeBankProfile(x);
    assert.deepEqual(profile[0], [oppositeBankBounds.back, -6.2]);
    assert.equal(profile.at(-1)[0], oppositeBankBounds.front);
    assert(profile.at(-1)[1] > 4);
    assert.equal(oppositeBankHeight(x, oppositeShore(x)), -5.3);
    for (let i = 1; i < profile.length; i++) {
      assert(profile[i].every(Number.isFinite));
      assert(profile[i][0] < profile[i - 1][0]);
      assert(
        Math.abs(oppositeBankHeight(x, profile[i][0]) - profile[i][1]) < 1e-10,
      );
    }
  }
});

test("terrain layers remain adjacent when soil and rock share a material, including terrace risers", () => {
  const material = new THREE.MeshStandardMaterial();
  const boundary = [
    [-2, 0, 3],
    [-2, 0, 0],
    [-2, -1.35, 0],
    [-2, -1.35, -3],
    [2, -1.35, -3],
    [2, -1.35, 0],
    [2, 0, 0],
    [2, 0, 3],
  ];
  const k = {
    mesh: (geometry, material) => new THREE.Mesh(geometry, material),
  };
  const meshes = buildCutawayTerrain(k, {
    boundary,
    bottom: -3,
    soil: material,
    rock: material,
  });
  const bedrock = meshes[0].geometry.attributes.position;
  const soil = meshes[1].geometry.attributes.position;
  const columns = soil.count / 4;
  assert.equal(bedrock.count / 129, columns);
  for (let column = 0; column < columns; column++) {
    const rockTop = column * 129 + 128;
    const soilBottom = column * 4;
    for (const axis of ["X", "Y", "Z"])
      assert.equal(
        bedrock[`get${axis}`](rockTop),
        soil[`get${axis}`](soilBottom),
        "soil meets bedrock without a gap or duplicate side",
      );
    assert(soil.getY(soilBottom + 3) > soil.getY(soilBottom));
    assert.equal(bedrock.getY(column * 129), -3);
  }
  for (const point of boundary)
    assert(
      Array.from({ length: columns }, (_, column) => column * 4 + 3).some(
        (i) =>
          Math.abs(soil.getX(i) - point[0]) < 1e-6 &&
          Math.abs(soil.getY(i) - point[1]) < 1e-6 &&
          Math.abs(soil.getZ(i) - point[2]) < 1e-6,
      ),
      "preserve each terrace step instead of smoothing its vertical edge",
    );
  assert.throws(
    () =>
      buildCutawayTerrain(k, {
        boundary: boundary.map((point) => [0, point[1], point[2]]),
        bottom: -3,
        soil: material,
        rock: material,
      }),
    /nonzero horizontal footprint/,
  );
  meshes.forEach((mesh) => mesh.geometry.dispose());
  material.dispose();
});

test("mineral cut relief is bounded, continuous and does not repeat at a metre", () => {
  for (const point of [
    [0, 0, 0],
    [-4.3, -9.1, 2.8],
    [12.4, -35.6, -72.3],
  ]) {
    const value = cutawayRockRelief(...point);
    assert(Number.isFinite(value) && Math.abs(value) <= 0.044);
    assert.equal(value, cutawayRockRelief(...point));
    for (let axis = 0; axis < 3; axis++) {
      const nearby = [...point];
      nearby[axis] += 1e-5;
      assert(Math.abs(cutawayRockRelief(...nearby) - value) < 1e-5);
      nearby[axis] += 1;
      assert(Math.abs(cutawayRockRelief(...nearby) - value) > 1e-6);
    }
  }
});

test("vineyard planting keeps the contour path bare and ground pigment finite", () => {
  const positions = [];
  for (let x = -15; x <= 15; x += 0.5) {
    assert.equal(vineyardGrowth(x, vineyardPath(x)), 0);
    for (let z = -52; z < -42; z += 0.5) {
      const growth = vineyardGrowth(x, z);
      assert(growth >= 0 && growth <= 1);
      positions.push(x, oppositeBankHeight(x, z), z);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  colorVineyardGround({ geometry });
  const colors = geometry.getAttribute("color");
  assert.equal(colors.count, positions.length / 3);
  assert(
    [...colors.array].every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 1,
    ),
  );
  assert(
    Array.from(
      { length: colors.count },
      (_, i) => colors.getY(i) > colors.getX(i),
    ).some(Boolean),
  );
  geometry.dispose();
});

class TestAudio extends EventTarget {
  src = "";
  paused = true;
  loads = 0;
  async play() {
    this.paused = false;
  }
  pause() {
    this.paused = true;
  }
  removeAttribute(name) {
    if (name === "src") this.src = "";
  }
  load() {
    this.loads++;
  }
}

test("recorded narration stays silent until requested and releases audio on hide, stop and disposal", async () => {
  const target = new EventTarget();
  target.hidden = false;
  const audio = new TestAudio();
  const states = [];
  const narrator = createRecordedNarration({
    target,
    audio,
    onChange: (state) => states.push(state),
  });
  const recording = {
    id: "river",
    file: "/public/narration/river.mp3",
    locale: "pt-BR",
  };
  assert.equal(audio.src, "");
  assert.equal(audio.preload, "none");
  await narrator.play(recording);
  assert.equal(audio.src, recording.file);
  assert.equal(narrator.state, "playing");
  target.hidden = true;
  target.dispatchEvent(new Event("visibilitychange"));
  assert.equal(narrator.state, "idle");
  assert.equal(audio.src, "");
  assert(audio.paused);
  await narrator.play(recording);
  assert.equal(audio.src, "");
  target.hidden = false;
  await narrator.play(recording);
  narrator.stop();
  assert.equal(audio.src, "");
  await narrator.play(recording);
  narrator.dispose();
  narrator.dispose();
  assert.equal(audio.src, "");
  assert.equal(narrator.state, "disposed");
  await assert.rejects(narrator.play(recording), /disposed/);
  const count = states.length;
  target.hidden = true;
  target.dispatchEvent(new Event("visibilitychange"));
  assert.equal(states.length, count);
});

test("missing or failed recordings produce an explicit recoverable state", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  const audio = new TestAudio();
  const narrator = createRecordedNarration({ audio });
  await narrator.play(null);
  assert.equal(narrator.state, "unavailable");
  audio.play = () => {
    throw new DOMException("Unavailable", "NotSupportedError");
  };
  await narrator.play({ file: "/public/narration/river.mp3" });
  assert.equal(narrator.state, "unavailable");
  assert.equal(errors.mock.calls.length, 2);
  audio.play = async () => {
    audio.paused = false;
  };
  await narrator.play({ file: "/public/narration/river.mp3" });
  assert.equal(narrator.state, "playing");
  narrator.dispose();
});

test("a stopped or disposed pending audio play cannot revive the narrator", async () => {
  const audio = new TestAudio();
  let release;
  audio.play = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const narrator = createRecordedNarration({ audio });
  const pending = narrator.play({ file: "/public/narration/river.mp3" });
  narrator.dispose();
  release();
  await pending;
  assert.equal(narrator.state, "disposed");
  assert.equal(audio.src, "");
  narrator.dispose();
});
