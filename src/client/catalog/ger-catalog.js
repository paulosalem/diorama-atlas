import { interiorVersions } from "./scene-versions.js";

export const gerViews = {
  room: {
    label: "Inside the ger",
    position: [0.25, 1.48, 2.55],
    target: [0, 1.15, -1.1],
    fov: 72,
  },
  hearth: {
    label: "Stove and kettle",
    position: [-1.25, 1.05, 1.3],
    target: [0, 0.6, 0.3],
    fov: 54,
  },
  framework: {
    label: "A frame that folds",
    position: [0.35, 1.05, -0.5],
    target: [-2.15, 1.85, -1.05],
    fov: 68,
  },
  hospitality: {
    label: "Tea and household care",
    position: [1.1, 1.1, -0.8],
    target: [0, 0.56, -1.7],
    fov: 58,
  },
  passage: {
    label: "Through the low doorway",
    position: [-0.55, 1.35, 1.55],
    target: [0.15, 1.1, 4.9],
    fov: 62,
  },
  camp: {
    label: "At the camp",
    position: [5.9, 2.15, 7.3],
    target: [0, 1.25, 0],
    fov: 57,
  },
};

const details = [
  [
    "lattice",
    "A wall that can travel",
    "Uma parede que pode viajar",
    "Crossing timber laths are tied into an expandable lattice. Together with the roof poles, felt and tension bands, they make a dwelling that can be dismantled and carried. These visible joints express portable construction, not a smaller version of a masonry house.",
    "Ripas de madeira cruzadas e amarradas formam uma treliça expansível. Com os caibros, o feltro e as faixas de tensão, permitem desmontar e transportar a moradia. As juntas visíveis mostram uma construção portátil, não uma versão menor de uma casa de alvenaria.",
    [-2.65, 1.15, -0.65],
  ],
  [
    "crown",
    "The roof crown",
    "O anel da cobertura",
    "Radial poles meet a timber crown carried by two posts. The opening admits daylight, while a movable cover helps manage the weather. The painted borders here are original decoration; they are not presented as sacred signs or a complete account of Mongolian ornament.",
    "Caibros radiais encontram um anel de madeira sustentado por dois pilares. A abertura admite luz natural, enquanto uma cobertura móvel ajuda a lidar com o tempo. As bordas pintadas são decoração criada para esta cena, não sinais sagrados nem um panorama completo da ornamentação mongol.",
    [0, 2.8, 0],
  ],
  [
    "stove",
    "Heat and daily preparation",
    "Calor e preparo cotidiano",
    "A metal stove, kettle, flue and protective floor plate connect warmth to domestic work. The modeled firebox has real depth, and the pipe exits through the crown. This is an interpretation of visible household equipment, not installation guidance.",
    "Fogão metálico, chaleira, chaminé e chapa de proteção no piso ligam o calor ao trabalho doméstico. A fornalha modelada tem profundidade real, e o tubo sai pelo anel da cobertura. Esta é uma interpretação de equipamentos domésticos observados, não uma orientação de instalação.",
    [0, 0.65, 0.35],
  ],
  [
    "table",
    "Room for hospitality",
    "Espaço para acolher",
    "Bowls, a thermos and a folded cloth suggest tea recently shared. Beds and storage follow the room's edge, leaving working space around the stove. The arrangement belongs to this imagined household; Mongolian homes and their occupants are not interchangeable.",
    "Tigelas, uma garrafa térmica e um pano dobrado sugerem um chá compartilhado há pouco. Camas e armários acompanham a borda do cômodo, deixando espaço de trabalho ao redor do fogão. A disposição pertence a esta casa imaginada; as moradias mongóis e seus habitantes não são intercambiáveis.",
    [0, 0.58, -1.6],
  ],
];

export const gerScene = {
  id: "mongolian-ger",
  environment: "ger",
  daylight: "summer",
  versions: interiorVersions,
  title: "Mongolian Ger Household",
  region: "Central Mongolian grassland · Near Kharkhorin",
  period: "A contemporary portable home · Late-summer afternoon",
  blurb: "Felt, timber and daily care make a portable home on the steppe.",
  summary:
    "An imagined household explores the ger as a complete home: an expandable frame, layered insulation, warmth, storage and hospitality. Its construction draws on Mongolian references, while its dimensions, furnishings and surrounding camp are an authored interpretation.",
  accent: "#c27b42",
  camera: gerViews.room,
  references: "/public/ger/references.json",
  preview: "/public/previews/mongolian-ger.png",
  details: details.map(([id, title, , body, , point]) => ({
    id,
    title,
    body,
    point,
  })),
};

export const gerTranslations = Object.fromEntries([
  [gerScene.title, "Uma casa ger mongol"],
  [gerScene.region, "Estepe da Mongólia central · Perto de Kharkhorin"],
  [
    gerScene.period,
    "Uma moradia portátil contemporânea · Tarde de fim de verão",
  ],
  [
    gerScene.blurb,
    "Feltro, madeira e cuidado cotidiano formam uma moradia portátil na estepe.",
  ],
  [
    gerScene.summary,
    "Uma casa imaginada apresenta o ger como moradia completa: estrutura expansível, isolamento em camadas, calor, armazenamento e acolhimento. A construção se baseia em referências mongóis, mas as dimensões, os móveis e o acampamento foram criados para esta interpretação.",
  ],
  ["Inside the ger", "Dentro do ger"],
  ["Stove and kettle", "Fogão e chaleira"],
  ["A frame that folds", "Uma estrutura que se dobra"],
  ["Tea and household care", "Chá e cuidado doméstico"],
  ["Through the low doorway", "Pela porta baixa"],
  ["At the camp", "No acampamento"],
  ["Central Mongolia", "Mongólia central"],
  ["Mongolia", "Mongólia"],
  [
    "Ger frame and reverse interior",
    "Estrutura do ger e vista interna reversa",
  ],
  ["Crown and roof connections", "Anel e conexões da cobertura"],
  ["Stove and everyday equipment", "Fogão e equipamentos cotidianos"],
  ["Canvas and external bands", "Lona e faixas externas"],
  [
    "An exhibited frame shows the lattice, radial poles and crown supports; it is not this household.",
    "Uma estrutura em exposição mostra a treliça, os caibros radiais e os apoios do anel; não é esta casa.",
  ],
  [
    "Ornate exhibition joinery informs construction, not the simpler decoration of the imagined home.",
    "As juntas ornamentadas da exposição orientam a construção, não a decoração mais simples da casa imaginada.",
  ],
  [
    "A photographed interior informs the stove, thermos, bedding and storage; its arrangement is not copied.",
    "Um interior fotografado orienta o fogão, a garrafa térmica, a roupa de cama e o armazenamento; sua disposição não é copiada.",
  ],
  [
    "A western Mongolian example informs canvas folds and ground contact, not the central-Mongolian roof profile.",
    "Um exemplo do oeste da Mongólia orienta as dobras da lona e o contato com o chão, não o perfil da cobertura da Mongólia central.",
  ],
  [
    "Quiet household handling; illustrative recordings, not a Mongolian field recording",
    "Sons discretos de utensílios domésticos; gravações ilustrativas, não feitas na Mongólia",
  ],
  ...details.flatMap(([, title, titlePt, body, bodyPt]) => [
    [title, titlePt],
    [body, bodyPt],
  ]),
]);
