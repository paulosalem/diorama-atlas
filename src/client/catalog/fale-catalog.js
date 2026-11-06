import { interiorVersions } from "./scene-versions.js";

export const faleViews = {
  room: {
    label: "An open household room",
    position: [0.25, 1.8, 2.25],
    target: [0, 2.0, -0.5],
    fov: 76,
  },
  joinery: {
    label: "A roof held together",
    position: [0, 1.75, 0.3],
    target: [1.65, 4.1, -0.8],
    fov: 64,
  },
  weaving: {
    label: "A basket in the making",
    position: [3.5, 1.45, 1.6],
    target: [2.65, 0.8, 0.1],
    fov: 56,
  },
  cooking: {
    label: "The cooking shelter",
    position: [5.1, 1.7, -3.1],
    target: [6.8, 0.8, -6.5],
    fov: 68,
  },
  home: {
    label: "A quieter room",
    position: [-2.7, 1.65, -7.3],
    target: [-3.35, 1, -10.1],
    fov: 72,
  },
  grounds: {
    label: "Across the household grounds",
    position: [9.5, 1.7, 7.8],
    target: [0.2, 2.1, -1.5],
    fov: 66,
  },
};

const details = [
  [
    "bindings",
    "Timber and coconut fibre",
    "Madeira e fibra de coco",
    "Samoan builders use coconut-fibre sennit, called ‘afa, to bind timber joints. This long-house-inspired frame has two rows of substantial supports, distinct from the central posts of a round fale tele. Its precise dimensions and metal-roof assembly are an authored interpretation.",
    "Construtores samoanos usam cordame de fibra de coco, chamado ‘afa, para unir peças de madeira. Esta estrutura inspirada na casa alongada tem duas fileiras de apoios robustos, diferentes dos pilares centrais de um fale tele circular. As dimensões e a montagem do telhado metálico são uma interpretação.",
    [1.65, 3.9, -1.3],
  ],
  [
    "pola",
    "Shelter without a sealed wall",
    "Abrigo sem uma parede fechada",
    "Woven coconut-leaf screens, called pola, can shelter selected sides while others remain open. Their overlapping panels and suspension cords make the boundary adjustable. They are working parts of the house, not wallpaper or ceremonial fine mats.",
    "Telas de folhas de coqueiro trançadas, chamadas pola, podem abrigar alguns lados enquanto outros permanecem abertos. Painéis sobrepostos e cordões de suspensão tornam ajustável esse limite. São partes funcionais da casa, não papel de parede nem esteiras cerimoniais finas.",
    [1.35, 2.15, -2.83],
  ],
  [
    "basket",
    "Leaves become a useful container",
    "Folhas se tornam um recipiente útil",
    "Broad coconut-leaf strips cross over and under one another to make a carrying basket. Fresh strips, a hollow coconut shell and a second basket suggest work paused nearby. These ordinary objects should not be confused with the finely woven pandanus mats valued in ceremonial exchange.",
    "Tiras largas de folhas de coqueiro passam por cima e por baixo umas das outras para formar um cesto. Tiras frescas, uma casca de coco aberta e outro cesto sugerem uma pausa no trabalho. Esses objetos cotidianos não devem ser confundidos com as esteiras finas de pandano valorizadas nas trocas cerimoniais.",
    [2.6, 0.7, 0.35],
  ],
  [
    "umu",
    "Cooking belongs to the grounds",
    "A cozinha faz parte do terreno",
    "The separate shelter gives food preparation its own working space. In this interpretation, an umu uses heated stones at ground level beneath a cover of leaves. The connected rooms and paths describe a household, not a cooking demonstration or a claim that every family lives in the same way.",
    "O abrigo separado oferece um espaço próprio ao preparo dos alimentos. Nesta interpretação, um umu usa pedras aquecidas ao nível do chão sob uma cobertura de folhas. Cômodos e caminhos conectados descrevem uma casa, não uma demonstração culinária nem a ideia de que todas as famílias vivem da mesma forma.",
    [6.25, 0.35, -6.5],
  ],
];

export const faleScene = {
  id: "samoan-fale",
  environment: "fale",
  daylight: "summer",
  versions: interiorVersions,
  title: "Samoan Fale and Household Grounds",
  region: "Upolu · Samoa",
  period: "A contemporary household · Afternoon shade",
  blurb: "An open room, woven screens and the everyday work of a household.",
  summary:
    "An imagined Upolu household connects an open-sided fale, a private living room and a separate cooking shelter. Timber construction, woven coconut leaves, a maintained metal roof and cared-for grounds reveal a place shaped by use. The setting is an authored interpretation, not a surveyed family home or a staged chiefly ceremony.",
  accent: "#8f9d79",
  camera: faleViews.room,
  references: "/public/fale/references.json",
  details: details.map(([id, title, , body, , point]) => ({
    id,
    title,
    body,
    point,
  })),
};

export const faleTranslations = Object.fromEntries([
  [faleScene.title, "Fale samoano e espaços da casa"],
  [faleScene.region, "Upolu · Samoa"],
  [faleScene.period, "Uma casa contemporânea · Sombra da tarde"],
  [
    faleScene.blurb,
    "Um cômodo aberto, telas trançadas e o trabalho cotidiano de uma casa.",
  ],
  [
    faleScene.summary,
    "Uma casa imaginada em Upolu conecta um fale aberto nas laterais, um cômodo mais reservado e um abrigo de cozinha separado. A estrutura de madeira, as folhas de coqueiro trançadas, o telhado metálico bem cuidado e o terreno mantido revelam um lugar moldado pelo uso. É uma interpretação criada, não o levantamento de uma residência real nem uma cerimônia encenada de chefes.",
  ],
  ["An open household room", "Um cômodo aberto da casa"],
  ["A roof held together", "Um telhado unido"],
  ["A basket in the making", "Um cesto em preparo"],
  ["The cooking shelter", "O abrigo da cozinha"],
  ["A quieter room", "Um cômodo mais tranquilo"],
  ["Across the household grounds", "Pelos espaços da casa"],
  ["Upolu", "Upolu"],
  ["Samoa", "Samoa"],
  [
    "Quiet household and garden sounds; illustrative recordings, not Samoan field recordings",
    "Sons discretos da casa e do jardim; gravações ilustrativas, não feitas em Samoa",
  ],
  [
    "A contemporary Upolu fale with a metal roof and cared-for planting; not the fictional household.",
    "Um fale contemporâneo de Upolu com telhado metálico e plantas bem cuidadas; não é a casa fictícia.",
  ],
  [
    "Folded pola screens, steps and a stone platform at a round fale in Lelepa, Savai'i; not the modeled long-house plan.",
    "Telas pola dobradas, degraus e uma plataforma de pedra em um fale circular de Lelepa, Savai'i; não é a planta alongada modelada.",
  ],
  [
    "Broad leaf strips, open basket mouths and different stages of drying inform the utility baskets.",
    "Tiras largas de folhas, bocas abertas e diferentes estágios de secagem orientam os cestos utilitários.",
  ],
  [
    "Ground-level stones and prepared leaf packets inform the cooking area, not cooking instructions.",
    "Pedras ao nível do chão e alimentos em folhas orientam a área de cozinha, não instruções culinárias.",
  ],
  ...details.flatMap(([, title, titlePt, body, bodyPt]) => [
    [title, titlePt],
    [body, bodyPt],
  ]),
]);
