// Geographic settings, not surveyed street addresses. The bookshop is regional.
export const locations = [
  {
    id: "marrakech",
    name: "Marrakech",
    country: "Morocco",
    lat: 31.6295,
    lon: -7.9811,
    type: "riad",
    match: /marrakech|riad/i,
  },
  {
    id: "oaxaca",
    name: "Oaxaca",
    country: "Mexico",
    lat: 17.0732,
    lon: -96.7266,
    type: "workshop",
    match: /oaxaca|textile/i,
  },
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    lat: 35.0116,
    lon: 135.7681,
    type: "japanese",
    match: /kyoto|kissaten/i,
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Türkiye",
    lat: 41.0082,
    lon: 28.9784,
    type: "tavern",
    match: /istanbul|meyhane/i,
  },
  {
    id: "hanoi",
    name: "Hanoi",
    country: "Vietnam",
    lat: 21.0285,
    lon: 105.8542,
    type: "shop",
    match: /hanoi|herb/i,
  },
  {
    id: "lisbon",
    name: "Lisbon",
    country: "Portugal",
    lat: 38.7223,
    lon: -9.1393,
    type: "tavern",
    match: /lisbon|tasca/i,
  },
  {
    id: "kerala",
    name: "Kerala",
    country: "India",
    lat: 9.4981,
    lon: 76.3388,
    type: "tropical",
    match: /kerala|backwater/i,
  },
  {
    id: "central-europe",
    name: "Central Europe",
    country: "An imagined bookshop · regional setting",
    lat: 48.5,
    lon: 14.5,
    type: "bookshop",
    match: /european|bookshop/i,
  },
];
export function locateScenes(scenes) {
  return locations
    .map((location) => ({
      ...location,
      scenes: scenes.filter((s) => location.match.test(`${s.id} ${s.title}`)),
    }))
    .filter((location) => location.scenes.length);
}
