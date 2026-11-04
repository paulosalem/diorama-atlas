export const DOMUS_WALL_HEIGHT = 3.8;
export const DOMUS_EYE_HEIGHT = 1.62;

// Metres: front street is +Z, garden and bathing service are -Z.
export const domusRooms = [
  { id: "atrium", bounds: [-7, 7, 0, 12], floor: "mosaic" },
  { id: "entrance", bounds: [-1.6, 1.6, 12, 17], floor: "mosaic" },
  { id: "porter", bounds: [-13, -1.6, 12, 17], floor: "red" },
  { id: "stores", bounds: [1.6, 7, 12, 17], floor: "red" },
  { id: "textiles", bounds: [-13, -7, 6, 12], floor: "red" },
  { id: "bedroom", bounds: [-13, -7, 0, 6], floor: "mosaic" },
  { id: "study", bounds: [-13, -7, -6, 0], floor: "mosaic" },
  { id: "dining", bounds: [-13, -7, -14, -6], floor: "mosaic" },
  { id: "family", bounds: [-13, -7, -21, -14], floor: "red" },
  { id: "tablinum", bounds: [-7, 7, -5, 0], floor: "mosaic" },
  { id: "garden", bounds: [-7, 7, -17, -5], floor: "mosaic" },
  { id: "exedra", bounds: [-7, 7, -21, -17], floor: "mosaic" },
  { id: "passage", bounds: [7, 9, -21, 17], floor: "red" },
  { id: "service", bounds: [9, 15, 10, 17], floor: "red" },
  { id: "kitchen", bounds: [9, 15, 3, 10], floor: "red" },
  { id: "pantry", bounds: [9, 15, -3, 3], floor: "red" },
  { id: "latrine", bounds: [9, 15, -6, -3], floor: "red" },
  { id: "changing", bounds: [9, 15, -9, -6], floor: "mosaic" },
  { id: "warm-bath", bounds: [9, 15, -13, -9], floor: "mosaic" },
  { id: "hot-bath", bounds: [9, 15, -17, -13], floor: "mosaic" },
  { id: "furnace", bounds: [9, 15, -21, -17], floor: "red" },
];

const wall = (axis, fixed, start, end, openings = []) => ({
  axis,
  fixed,
  start,
  end,
  openings: openings.map(([center, width, height = 2.55]) => ({
    center,
    width,
    height,
  })),
});

export const domusWalls = [
  wall("x", 17, -13, 15, [
    [0, 2.5],
    [8, 1.55],
  ]),
  wall("x", -21, -13, 15),
  wall("z", -13, -21, 17),
  wall("z", 15, -21, 17),
  wall("z", -7, -21, 12, [
    [-17.5, 1.5],
    [-10, 1.6],
    [-3, 1.5],
    [3, 1.5],
    [9, 1.5],
  ]),
  wall("z", 7, -21, 17, [
    [-18.5, 1.4],
    [-10, 1.5],
    [-2.5, 1.5],
    [6, 1.5],
    [14.5, 1.4],
  ]),
  wall("z", 9, -21, 17, [
    [-19, 1.4],
    [-15, 1.4],
    [-11, 1.4],
    [-7.5, 1.4],
    [-4.5, 1.4],
    [0, 1.5],
    [6.5, 1.5],
    [13.5, 1.5],
  ]),
  wall("x", 12, -13, 7, [[0, 2.5]]),
  wall("z", -1.6, 12, 17, [[14.5, 1.4]]),
  wall("z", 1.6, 12, 17, [[14.5, 1.4]]),
  ...[6, 0, -6, -14].map((z) => wall("x", z, -13, -7)),
  wall("x", 0, -7, 7, [
    [-5, 1.5],
    [0, 4],
    [5, 1.5],
  ]),
  wall("x", -5, -7, 7, [
    [-5, 1.5],
    [0, 4],
    [5, 1.5],
  ]),
  wall("z", -3, -5, 0),
  wall("z", 3, -5, 0),
  wall("x", -17, -7, 7, [[0, 5]]),
  ...[10, 3, -3, -6, -9, -13, -17].map((z) =>
    wall("x", z, 9, 15, [-9, -13].includes(z) ? [[10.6, 1.25]] : []),
  ),
];

export function wallSegments(wall) {
  const segments = [];
  let start = wall.start;
  for (const opening of [...wall.openings, { center: wall.end, width: 0 }]) {
    const end = opening.center - opening.width / 2;
    if (end > start) segments.push([start, end]);
    start = opening.center + opening.width / 2;
  }
  return segments;
}

export const domusViews = {
  atrium: {
    label: "Atrium · welcome and water",
    position: [-4.4, 1.62, 10],
    target: [0.1, 1.5, 1],
    fov: 70,
  },
  entrance: {
    label: "Entrance · the public threshold",
    position: [0, 1.62, 20],
    target: [0, 1.5, 8],
    fov: 65,
  },
  tablinum: {
    label: "Tablinum · accounts and influence",
    position: [1.2, 1.62, -0.8],
    target: [-1, 0.9, -3.5],
    fov: 68,
  },
  shrine: {
    label: "Lararium · household worship",
    position: [-4.7, 1.62, 2.5],
    target: [-6.2, 1.5, 1.25],
    fov: 54,
  },
  textiles: {
    label: "Textiles · making and mending",
    position: [-8.1, 1.62, 8.9],
    target: [-11.5, 1.25, 8.6],
    fov: 68,
  },
  bedroom: {
    label: "Cubiculum · clothing and rest",
    position: [-8.2, 1.62, 3.3],
    target: [-11, 0.8, 2],
    fov: 70,
  },
  study: {
    label: "Study · learning and leisure",
    position: [-8.1, 1.62, -2.6],
    target: [-11, 1, -4.5],
    fov: 65,
  },
  dining: {
    label: "Triclinium · dining and hierarchy",
    position: [-8.2, 1.62, -8],
    target: [-10.2, 0.7, -11.4],
    fov: 72,
  },
  garden: {
    label: "Peristyle · cultivated nature",
    position: [-3.4, 1.62, -5.9],
    target: [0.8, 1.35, -13.5],
    fov: 70,
  },
  exedra: {
    label: "Exedra · art and conversation",
    position: [0, 1.62, -17.8],
    target: [-3, 1.1, -19.8],
    fov: 74,
  },
  family: {
    label: "Family · childhood and dependents",
    position: [-8.1, 1.62, -17.5],
    target: [-11, 0.7, -19],
    fov: 69,
  },
  kitchen: {
    label: "Culina · preparing the meal",
    position: [10.2, 1.62, 6.4],
    target: [13.3, 1, 7.5],
    fov: 72,
  },
  pantry: {
    label: "Pantry · provisions and trade",
    position: [10.2, 1.62, 0],
    target: [13.6, 1, -0.5],
    fov: 72,
  },
  service: {
    label: "Service room · unequal lives",
    position: [10.2, 1.62, 13.5],
    target: [13.1, 0.9, 14.5],
    fov: 68,
  },
  latrine: {
    label: "Latrine · waste and water",
    position: [10.4, 1.62, -4.5],
    target: [13.8, 0.6, -4.5],
    fov: 67,
  },
  changing: {
    label: "Bathing · oil and the strigil",
    position: [10.1, 1.62, -7.5],
    target: [13.4, 0.9, -7.5],
    fov: 67,
  },
  warm: {
    label: "Warm room · private comfort",
    position: [10.5, 1.62, -11],
    target: [13.6, 1, -11.6],
    fov: 65,
  },
  hot: {
    label: "Hot room · heated water",
    position: [10.5, 1.62, -15],
    target: [13.7, 0.6, -15],
    fov: 68,
  },
  furnace: {
    label: "Furnace · the cost of comfort",
    position: [10.1, 1.62, -19],
    target: [13.3, 0.7, -18.7],
    fov: 68,
  },
  stores: {
    label: "Stores · weights and wealth",
    position: [2.5, 1.62, 14.5],
    target: [5.4, 1, 15.6],
    fov: 65,
  },
};
