import assert from "node:assert/strict";
import test from "node:test";
import {
  assertCaptureCamera,
  orbitCapturePose,
} from "../scripts/helpers/miniature-survey.mjs";

test("matched cameras accept equivalent quaternion signs but reject pose drift", () => {
  const pose = {
    position: [4, 8, 15],
    target: [1, 2, 3],
    fov: 40,
    quaternion: [0, 0, 0, 1],
  };
  assert.doesNotThrow(() =>
    assertCaptureCamera({ ...pose, quaternion: [0, 0, 0, -1] }, pose),
  );
  for (const changed of [
    { position: [4, 8, 15.1] },
    { target: [1, 2, 3.1] },
    { fov: 41 },
    { fov: Number.NaN },
    { quaternion: [0, 0, 1, 0] },
  ])
    assert.throws(
      () => assertCaptureCamera({ ...pose, ...changed }, pose),
      /changed the requested capture camera/,
    );
});

test("survey rotations preserve distance, target and the original pose", () => {
  const pose = {
    position: [4, 8, 15],
    target: [1, 2, 3],
    fov: 40,
    quaternion: [0, 0, 0, 1],
  };
  const original = structuredClone(pose);
  const radius = Math.hypot(
    ...pose.position.map((value, i) => value - pose.target[i]),
  );
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const rotated = orbitCapturePose(pose, angle);
    assert.deepEqual(rotated.target, pose.target);
    assert.equal(rotated.fov, pose.fov);
    assert.equal(rotated.position[1], pose.position[1]);
    assert.equal(rotated.quaternion, undefined);
    assert(
      Math.abs(
        Math.hypot(
          ...rotated.position.map((value, i) => value - rotated.target[i]),
        ) - radius,
      ) < 1e-10,
    );
  }
  assert.deepEqual(pose, original);
});

test("underside surveys change elevation without moving the orbit center", () => {
  const pose = { position: [8, 9, 12], target: [0, 1, 0], fov: 37 };
  const below = orbitCapturePose(pose, Math.PI, -0.3);
  assert(below.position[1] < pose.target[1]);
  assert.deepEqual(below.target, pose.target);
  assert(
    Math.abs(
      Math.hypot(below.position[0], below.position[1] - 1, below.position[2]) -
        Math.hypot(8, 8, 12),
    ) < 1e-10,
  );
});
