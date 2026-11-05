// Frontage positions are at the threshold; local negative Z runs into the house.
export const alfamaHouses = [
  {
    position: [-1.6, 0, 7.6],
    angle: Math.PI / 2,
    width: 3.6,
    depth: 3.8,
    storeys: 3,
    color: "white",
    coveredWalls: { back: 5.3 },
  },
  {
    position: [3.8, 0, 7.05],
    angle: -0.28,
    width: 4,
    depth: 2.5,
    storeys: 2,
    color: "rose",
    partyWalls: { right: true },
  },
  {
    position: [-3.5, 2.4, 1],
    angle: 0,
    width: 4.4,
    depth: 3.5,
    storeys: 2,
    color: "white",
    tiled: true,
    open: true,
  },
  {
    position: [6, 2.4, -4.25],
    angle: Math.PI / 2,
    width: 3,
    depth: 2.5,
    storeys: 3,
    color: "ochre",
    coveredWalls: { left: 5.3 },
  },
  {
    position: [-6.4, 4.8, -8.8],
    angle: 0.18,
    width: 3.3,
    depth: 3.6,
    storeys: 2,
    color: "blue",
  },
  {
    position: [-3.6, 4.8, -9.6],
    angle: -Math.PI / 2,
    width: 3.8,
    depth: 3.7,
    storeys: 2,
    color: "white",
    partyWalls: { left: true },
  },
  {
    position: [6.8, 4.8, -9.3],
    angle: Math.PI,
    width: 3.8,
    depth: 2.5,
    storeys: 2,
    color: "rose",
  },
  {
    position: [7.65, 2.4, 1.2],
    angle: 0,
    width: 3,
    depth: 3.4,
    storeys: 2,
    color: "white",
    passage: true,
    coveredWalls: { left: 5.3 },
  },
  {
    position: [-8.6, 2.4, 0.2],
    angle: Math.PI,
    width: 2.6,
    depth: 2.6,
    storeys: 3,
    color: "white",
  },
  {
    position: [-8.7, 4.8, -8],
    angle: Math.PI / 2,
    width: 2.6,
    depth: 2.1,
    storeys: 2,
    color: "white",
  },
  {
    position: [-5.8, 4.8, -5.5],
    angle: Math.PI + 0.12,
    width: 2.6,
    depth: 2,
    storeys: 2,
    color: "white",
  },
  {
    position: [10.8, 2.4, -4],
    angle: -Math.PI / 2,
    width: 3.4,
    depth: 2.6,
    storeys: 2,
    color: "white",
  },
  {
    position: [-9, 0, 9],
    angle: -0.2,
    width: 2.8,
    depth: 3,
    storeys: 2,
    color: "ochre",
    coveredWalls: { right: 5.3 },
  },
  {
    position: alfamaLocalPoint([3.8, 0, 7.05], -0.28, [3.4, 0, 0]),
    angle: -0.28,
    width: 2.8,
    depth: 2.5,
    storeys: 2,
    color: "white",
    partyWalls: { left: false },
  },
  {
    position: [-3.6, 4.8, -12.4],
    angle: -Math.PI / 2,
    width: 1.8,
    depth: 3.7,
    storeys: 2,
    color: "ochre",
    partyWalls: { right: false },
  },
];

// Each pair owns one physical wall, not two overlapping exterior facades.
export const alfamaPartyWalls = [
  { owner: 1, neighbor: 13, side: "right", neighborSide: "left" },
  { owner: 5, neighbor: 14, side: "left", neighborSide: "right" },
];

export const alfamaInfills = [
  {
    id: "lower-shared-wing",
    base: 0,
    height: 5.3,
    outline: [
      [-5.4, 9.4],
      alfamaLocalPoint([-9, 0, 9], -0.2, [1.4, 0, 0]).filter((_, i) => i !== 1),
      alfamaLocalPoint([-9, 0, 9], -0.2, [1.4, 0, -3]).filter(
        (_, i) => i !== 1,
      ),
      [-5.4, 5.8],
    ],
    exposedEdges: [
      [0, 1],
      [2, 3],
    ],
    contacts: [
      { house: 0, side: "back", local: [0, 1.3, -3.8] },
      { house: 12, side: "right", local: [1.4, 1.3, -1.5] },
    ],
    color: "blue",
  },
  {
    id: "court-masonry-junction",
    base: 2.4,
    height: 5.3,
    outline: [
      [6.15, -1.2],
      [5.3, -1.2],
      [5.3, -2.75],
      [6.15, -2.75],
    ],
    exposedEdges: [
      [0, 1],
      [1, 2],
    ],
    closures: [
      [
        [6, -2.75],
        [6.15, -2.75],
      ],
      [
        [6.15, -2.75],
        [6.15, -2.2],
      ],
    ],
    contacts: [
      { house: 3, side: "left", local: [-1.5, 1.3, -0.4] },
      { house: 7, side: "left", local: [-1.5, 1.3, -2.9] },
    ],
    color: "white",
  },
];

export const alfamaFlights = [
  {
    id: "lower-north",
    start: [0, 0, 7.32],
    end: [0, 1.2, 4.8],
    width: 1.8,
    count: 7,
  },
  {
    id: "lower-west",
    start: [-0.8, 1.2, 4],
    end: [-3.4, 2.4, 4],
    width: 1.6,
    count: 7,
  },
  {
    id: "middle-diagonal",
    start: [0, 2.4, -0.8],
    end: [2.3, 3.6, -3.3],
    width: 1.65,
    count: 8,
  },
  {
    id: "upper-west",
    start: [1.4, 3.6, -4.2],
    end: [-1.4, 4.8, -4.2],
    width: 1.65,
    count: 8,
  },
  {
    id: "back-lane-west",
    start: [-6.4, 2.4, -1.1],
    end: [-9, 3.6, -1.1],
    width: 1.6,
    count: 7,
  },
  {
    id: "back-lane-north",
    start: [-9.8, 3.6, -1.9],
    end: [-9.8, 4.8, -4.7],
    width: 1.6,
    count: 8,
  },
  {
    id: "court-return",
    start: [10.2, 2.4, -6.3],
    end: [10.2, 4.8, -11.34],
    width: 1.65,
    count: 14,
  },
];

export const alfamaTerraces = [
  {
    height: 2.4,
    outline: [
      [-11.2, -13.6],
      [13.6, -13.6],
      [13.6, 2.8],
      [-1.3, 2.8],
      [-1.3, 3.1],
      [-3.4, 3.1],
      [-3.4, 4.9],
      [-5.7, 4.9],
      [-5.7, 2.8],
      [-11.2, 2.8],
    ],
  },
  {
    height: 4.8,
    outline: [
      [-11.2, -13.6],
      [13.6, -13.6],
      [13.6, -11.34],
      [9.3, -11.34],
      [9.3, -5.5],
      [-1.3, -5.5],
      [-1.3, -3.3],
      [-3.1, -3.3],
      [-3.1, -5.5],
      [-11.2, -5.5],
    ],
  },
];

export function alfamaLocalPoint(position, angle, [x, y, z]) {
  return [
    position[0] + x * Math.cos(angle) + z * Math.sin(angle),
    position[1] + y,
    position[2] - x * Math.sin(angle) + z * Math.cos(angle),
  ];
}

// Level routes join stair mouths, doors and courts. Heights are walking surfaces.
export const alfamaConnections = [
  [
    [0, 0, 8.3],
    [0, 0, 7.32],
  ],
  [
    [0, 1.2, 4.8],
    [0, 1.2, 4],
    [-0.8, 1.2, 4],
  ],
  [
    [-3.4, 2.4, 4],
    [-4.2, 2.4, 4],
    [-4.2, 2.4, 2.5],
    [-1.9, 2.4, 2.5],
    [0, 2.4, 2.2],
    [0, 2.4, -0.8],
  ],
  [
    [0, 2.4, 2.2],
    [7.65, 2.4, 2.2],
    [7.65, 2.4, -2.2],
    [8.3, 2.4, -3.6],
    [9.5, 2.4, -4],
    [10.2, 2.4, -5.9],
    [10.2, 2.4, -6.3],
  ],
  [
    [-4.2, 2.4, 2.5],
    [-6.5, 2.4, 2.5],
    [-6.3, 2.4, -1.1],
    [-6.4, 2.4, -1.1],
  ],
  [
    [-9, 3.6, -1.1],
    [-9.8, 3.6, -1.1],
    [-9.8, 3.6, -1.9],
  ],
  [
    [-9.8, 4.8, -4.7],
    [-9.8, 4.8, -5.1],
    [-8.2, 4.8, -5.1],
    [-8.2, 4.8, -6.2],
    [-7.6, 4.8, -6.8],
    [-6.6, 4.8, -7.3],
  ],
  [
    [2.3, 3.6, -3.3],
    [2.3, 3.6, -4.2],
    [1.4, 3.6, -4.2],
  ],
  [
    [-1.4, 4.8, -4.2],
    [-2.2, 4.8, -4.2],
    [-2.2, 4.8, -6.6],
    [-3.8, 4.8, -6.6],
    [-4.5, 4.8, -7.2],
    [-6.6, 4.8, -7.3],
  ],
  [
    [10.2, 4.8, -11.34],
    [10.2, 4.8, -12],
    [2.6, 4.8, -12],
    [2.6, 4.8, -6.6],
    [-2.2, 4.8, -6.6],
  ],
];
