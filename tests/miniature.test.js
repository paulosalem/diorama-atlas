import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { buildCutawayTerrain } from "../src/client/environments/shared/cutaway-terrain.js";
import { createBrowserNarration } from "../src/client/viewer/browser-narration.js";
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

test("browser narration stays silent until requested and releases its utterance on hide, stop and disposal", () => {
  const target = new EventTarget();
  target.hidden = false;
  const utterances = [];
  const states = [];
  let cancellations = 0;
  const voice = { lang: "pt-BR", localService: true };
  const synthesis = {
    getVoices: () => [{ lang: "pt-BR", localService: false }, voice],
    speak: (utterance) => utterances.push(utterance),
    cancel: () => {
      cancellations++;
    },
  };
  class Utterance {
    constructor(text) {
      this.text = text;
    }
  }
  const narrator = createBrowserNarration({
    target,
    synthesis,
    Utterance,
    onChange: (state) => states.push(state),
  });
  assert.equal(utterances.length, 0);
  narrator.play("Uma vinha sobre o rio.", "pt-BR");
  assert.equal(narrator.state, "preparing");
  assert.equal(utterances[0].voice, voice);
  utterances[0].onstart();
  assert.equal(narrator.state, "speaking");
  target.hidden = true;
  target.dispatchEvent(new Event("visibilitychange"));
  assert.equal(narrator.state, "idle");
  assert.equal(cancellations, 1);
  assert.equal(utterances[0].onend, null);
  narrator.play("Not while hidden.", "en-US");
  assert.equal(utterances.length, 1);
  target.hidden = false;
  narrator.play("The river.", "en-US");
  narrator.stop();
  assert.equal(cancellations, 2);
  narrator.play("The roots.", "en-US");
  narrator.dispose();
  narrator.dispose();
  assert.equal(cancellations, 3);
  assert.equal(narrator.state, "disposed");
  assert.throws(() => narrator.play("No.", "en-US"), /disposed/);
  const count = states.length;
  target.hidden = true;
  target.dispatchEvent(new Event("visibilitychange"));
  assert.equal(states.length, count);
});

test("unavailable browser voices are explicit rather than simulated playback", () => {
  const narrator = createBrowserNarration({ synthesis: null, Utterance: null });
  narrator.play("An imagined vineyard.", "en-US");
  assert.equal(narrator.state, "unavailable");
  assert.throws(() => narrator.play(" ", "en-US"), /nonempty/);
  narrator.dispose();
});

test("a synchronous browser speech failure leaves an explicit recoverable state", (t) => {
  const errors = t.mock.method(console, "error", () => {});
  const synthesis = {
    getVoices: () => [],
    speak: () => {
      throw new DOMException("Unavailable", "NotSupportedError");
    },
    cancel: () => {},
  };
  const narrator = createBrowserNarration({
    synthesis,
    Utterance: class {
      constructor(text) {
        this.text = text;
      }
    },
  });
  narrator.play("The opposite bank.", "en-US");
  assert.equal(narrator.state, "unavailable");
  assert.equal(errors.mock.calls.length, 1);
  assert.equal(errors.mock.calls[0].arguments[1], "NotSupportedError");
  synthesis.speak = (utterance) => utterance.onstart();
  narrator.play("The opposite bank.", "en-US");
  assert.equal(narrator.state, "speaking");
  narrator.dispose();
});
