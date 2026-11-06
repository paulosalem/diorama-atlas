import { expect, test } from "@playwright/test";
import { waitForViewer } from "../../scripts/helpers/browser-viewer.mjs";

test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
test.describe.configure({ timeout: 120_000 });

const cases = [
  {
    scene: "andean-stone-lane",
    contacts: [
      {
        name: "left lower bearing wall",
        origin: [-7, 1.2, 10.1],
        direction: [1, 0, 0],
        range: [0.48, 0.58],
        section: 0,
      },
      {
        name: "right lower bearing wall",
        origin: [7, 1.2, 9.1],
        direction: [-1, 0, 0],
        range: [0.51, 0.61],
        section: 1,
      },
    ],
  },
  {
    scene: "riad",
    contacts: [-1, 1].flatMap((side) => [
      {
        name: `${side}: service-wing foundation`,
        origin: [side * 9.3, -0.3, 0],
        direction: [-side, 0, 0],
        range: [0.37, 0.47],
      },
      {
        name: `${side}: service room continues to the courtyard wall`,
        origin: [side * 9, 1.2, side * 0.78],
        direction: [-side, 0, 0],
        range: [3.25, 3.31],
      },
    ]),
    clearance: [-1, 1].flatMap((side) =>
      [0.35, 1.2, 2.0].flatMap((height) =>
        [-0.32, 0, 0.32].map((across) => ({
          name: `${side}: service doorway at ${height}/${across}`,
          origin: [side * 9, height, side * 0.78 + across],
          direction: [-side, 0, 0],
          distance: 3,
        })),
      ),
    ),
  },
  {
    scene: "kerala-backwater-kitchen-courtyard-aadf7c",
    contacts: [
      {
        name: "outer garden foundation",
        origin: [-16.8, -0.5, 0],
        direction: [1, 0, 0],
        range: [0.56, 0.64],
      },
    ],
  },
  {
    scene: "newar-potters-square",
    contacts: [
      {
        name: "complete left building depth",
        origin: [-18, 1.2, 4],
        direction: [1, 0, 0],
        range: [1, 1.1],
        section: 1,
      },
      {
        name: "complete right building depth",
        origin: [18, 1.2, 4],
        direction: [-1, 0, 0],
        range: [0.8, 0.9],
        section: 1,
      },
    ],
  },
  {
    scene: "naxi-canal-quarter",
    contacts: [
      {
        name: "soil at the willow root height",
        origin: [-3.9, 0.2, -15.25],
        direction: [0, -1, 0],
        range: [0.13, 0.15],
        section: 0,
      },
      {
        name: "root bed continues to foundation",
        origin: [-1.5, -1.65, -15.25],
        direction: [-1, 0, 0],
        range: [1.03, 1.06],
        section: 0,
      },
    ],
  },
  {
    scene: "roman-domus",
    contacts: [
      {
        name: "street paving bedding",
        origin: [-16, -0.24, 20],
        direction: [1, 0, 0],
        range: [0.99, 1.01],
      },
      {
        name: "foundation beneath the sidewalk",
        origin: [-16.5, -0.4, 0],
        direction: [1, 0, 0],
        range: [1.39, 1.41],
      },
      {
        name: "impluvium remains a real cavity",
        origin: [0, -0.16, 6],
        direction: [0, -1, 0],
        range: [0.12, 0.14],
      },
    ],
  },
];

for (const { scene, contacts, clearance = [] } of cases) {
  test(`${scene}: miniature construction contact and physical clearance`, async ({
    page,
  }) => {
    await page.goto(`/?scene=${scene}&version=miniature&inspect=1`);
    await waitForViewer(page);
    const results = await page.evaluate(
      async ({ contacts, clearance }) => {
        const THREE = await import("three");
        const { getActiveViewer } =
          await import("/src/client/viewer/panorama-viewer.js");
        const viewer = getActiveViewer();
        viewer.runtime.group.updateMatrixWorld(true);
        const solids = [];
        viewer.runtime.group.traverseVisible((object) => {
          if (object.isMesh) solids.push(object);
        });
        const probe = (item) => {
          const offset =
            item.section === undefined
              ? [0, 0, 0]
              : viewer.runtime.sections[item.section].offset;
          const origin = item.origin.map((value, axis) => value + offset[axis]);
          const ray = new THREE.Raycaster(
            new THREE.Vector3(...origin),
            new THREE.Vector3(...item.direction),
            0,
            item.distance ?? 8,
          );
          return {
            ...item,
            actual: ray.intersectObjects(solids, false)[0]?.distance ?? null,
          };
        };
        return {
          contacts: contacts.map(probe),
          clearance: clearance.map(probe),
        };
      },
      { contacts, clearance },
    );
    for (const { name, actual, range } of results.contacts) {
      expect(actual, name).not.toBeNull();
      expect(actual, name).toBeGreaterThanOrEqual(range[0]);
      expect(actual, name).toBeLessThanOrEqual(range[1]);
    }
    for (const { name, actual } of results.clearance)
      expect(actual, name).toBeNull();
  });
}

test("Tunisian seawater stops at the coast instead of emerging through the cut rock", async ({
  page,
}) => {
  await page.goto("/?scene=tunisian-terrace-cafe&version=miniature&inspect=1");
  await waitForViewer(page);
  const result = await page.evaluate(async () => {
    const THREE = await import("three");
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    const { runtime } = getActiveViewer();
    runtime.group.updateMatrixWorld(true);
    const water = [];
    runtime.group.traverseVisible((mesh) => {
      if (mesh.name === "Miniature water reflection") water.push(mesh);
    });
    const ray = new THREE.Raycaster();
    const hits = (x, z) => {
      ray.set(new THREE.Vector3(x, -33, z), new THREE.Vector3(0, -1, 0));
      return ray.intersectObjects(water, false).map((hit) => hit.distance);
    };
    return {
      surfaces: water.length,
      dryTerrace: [-24, -12, 0, 12, 29].map((x) => hits(x, 20)),
      drySlope: [-24, -12, 0, 12, 29].map((x) => hits(x, -35)),
      sea: hits(0, -77),
      normals: water.flatMap((mesh) => {
        const normals = mesh.geometry.attributes.normal;
        const transform = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
        return Array.from(
          { length: normals.count },
          (_, i) =>
            new THREE.Vector3()
              .fromBufferAttribute(normals, i)
              .applyNormalMatrix(transform).y,
        );
      }),
    };
  });
  expect(result.surfaces).toBe(1);
  expect(result.dryTerrace.flat()).toEqual([]);
  expect(result.drySlope.flat()).toEqual([]);
  expect(result.sea.length).toBeGreaterThan(0);
  expect(result.sea[0]).toBeCloseTo(1, 4);
  expect(result.normals.every((value) => value > 0.99)).toBe(true);
});
