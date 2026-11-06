import { interiorVersions } from "./scene-versions.js";

export const saunaViews = {
  room: {
    label: "Inside the sauna",
    position: [0.35, 1.75, 1.05],
    target: [-1.25, 1.35, -1.05],
    fov: 72,
  },
  heater: {
    label: "Stones and löyly",
    position: [-0.75, 1.65, 1.05],
    target: [-2.05, 1.17, 0.1],
    fov: 53,
  },
  benches: {
    label: "Timber and touch",
    position: [-0.05, 1.55, -0.3],
    target: [-1.6, 1.45, -1.75],
    fov: 58,
  },
  changing: {
    label: "Between warmth and air",
    position: [2.4, 1.75, 0.95],
    target: [1.9, 1.05, -1.65],
    fov: 68,
  },
  passage: {
    label: "Out to the lake",
    position: [1.9, 1.72, 0.6],
    target: [2.25, 0.9, 8.8],
    fov: 62,
  },
  shore: {
    label: "The cooling shore",
    position: [5.8, 1.65, 8.5],
    target: [0.25, 1.3, 0.1],
    fov: 62,
  },
};

const details = [
  [
    "stones",
    "Heat held in stone",
    "Calor guardado na pedra",
    "Water cast onto heated stones produces löyly. Angular stones leave air spaces around the heater, while a firebox and flue carry combustion below and away from them. This imagined wood-fired heater is one of many sauna types, not an installation guide.",
    "A água lançada sobre pedras aquecidas produz o löyly. As pedras angulosas deixam espaços para o ar, enquanto a fornalha e a chaminé conduzem a combustão por baixo delas e para fora. Este aquecedor a lenha imaginado é um entre muitos tipos de sauna, não um guia de instalação.",
    [-2.05, 1.18, 0.1],
  ],
  [
    "benches",
    "A place to settle",
    "Um lugar para se acomodar",
    "Slatted benches offer different heights, while smooth edges and a headrest make contact with timber comfortable. A folded cloth and the darker traces of recent water suggest care and use, not a room kept untouched for display.",
    "Bancos ripados oferecem alturas diferentes, enquanto bordas suaves e um apoio de cabeça tornam confortável o contato com a madeira. Um pano dobrado e marcas mais escuras de água recente sugerem cuidado e uso, não um cômodo intocado para exposição.",
    [-1.55, 1.5, -1.86],
  ],
  [
    "whisk",
    "Birch, water and choice",
    "Bétula, água e escolha",
    "A tied bundle of leafy birch twigs rests near the water bucket. Often called vasta in eastern Finland and vihta elsewhere, the whisk belongs to a varied bathing tradition. Not everyone uses one; quiet consideration for other bathers matters more than a prescribed ritual.",
    "Um feixe amarrado de ramos de bétula repousa perto do balde de água. Muitas vezes chamado de vasta no leste da Finlândia e vihta em outras regiões, faz parte de uma tradição de banho variada. Nem todos o usam; a consideração por quem compartilha a sauna importa mais do que um ritual obrigatório.",
    [-0.4, 1.04, -0.97],
  ],
  [
    "threshold",
    "A rhythm of rooms",
    "Um ritmo de espaços",
    "A changing room and sheltered porch connect the heated room to the lakeshore. Cooling can mean sitting in fresh air rather than swimming. The fictional household makes that everyday sequence visible without treating all Finnish sauna customs as identical.",
    "Um vestiário e uma varanda abrigada ligam o cômodo aquecido à margem do lago. Refrescar-se pode significar sentar ao ar livre, e não necessariamente nadar. Esta casa imaginada torna visível essa sequência cotidiana sem tratar todos os costumes finlandeses de sauna como idênticos.",
    [1.9, 1.25, 1.4],
  ],
];

export const saunaScene = {
  id: "finnish-lakeside-sauna",
  environment: "sauna",
  daylight: "summer",
  versions: interiorVersions,
  title: "Finnish Lakeside Sauna",
  region: "Finnish Lakeland · Near Saimaa",
  period: "A contemporary household sauna · Late-summer afternoon",
  blurb: "Warm timber, heated stones and a quiet path to the lake.",
  summary:
    "An imagined lakeside household connects bathing, rest and fresh air. A wood-fired sauna opens into a changing room and sheltered porch, with birches and a timber jetty beyond. Finnish photographic references inform the construction and ordinary objects; the building and its plan are an authored interpretation.",
  accent: "#8f9e79",
  camera: saunaViews.room,
  references: "/public/sauna/references.json",
  details: details.map(([id, title, , body, , point]) => ({
    id,
    title,
    body,
    point,
  })),
};

export const saunaTranslations = Object.fromEntries([
  [saunaScene.title, "Sauna finlandesa à beira do lago"],
  [saunaScene.region, "Região dos lagos da Finlândia · Perto de Saimaa"],
  [
    saunaScene.period,
    "Uma sauna doméstica contemporânea · Tarde de fim de verão",
  ],
  [
    saunaScene.blurb,
    "Madeira acolhedora, pedras aquecidas e um caminho tranquilo até o lago.",
  ],
  [
    saunaScene.summary,
    "Uma casa imaginada à beira do lago conecta banho, descanso e ar fresco. A sauna a lenha se abre para um vestiário e uma varanda abrigada, com bétulas e um píer de madeira adiante. Fotografias finlandesas orientam a construção e os objetos cotidianos; o edifício e sua planta foram criados para esta interpretação.",
  ],
  ["Inside the sauna", "Dentro da sauna"],
  ["Stones and löyly", "Pedras e löyly"],
  ["Timber and touch", "Madeira e contato"],
  ["Between warmth and air", "Entre o calor e o ar"],
  ["Out to the lake", "Rumo ao lago"],
  ["The cooling shore", "A margem refrescante"],
  ["Finnish Lakeland", "Região dos lagos da Finlândia"],
  ["Finland", "Finlândia"],
  ["Birch bark", "Casca de bétula"],
  [
    "Bench levels, pale timber and ordinary equipment in a photographed Finnish sauna; not the fictional building.",
    "Alturas dos bancos, madeira clara e equipamentos cotidianos em uma sauna finlandesa fotografada; não é o edifício fictício.",
  ],
  [
    "A close view of angular heater stones, their air spaces and the metal rim; branding is not reproduced in the model.",
    "Uma vista próxima das pedras angulosas, dos espaços de ar entre elas e da borda metálica; as marcas comerciais não são reproduzidas no modelo.",
  ],
  [
    "A bucket, ladle and birch whisk show the construction and handling of everyday bathing objects.",
    "Um balde, uma concha e um feixe de bétula mostram a construção e o manuseio de objetos cotidianos do banho.",
  ],
  [
    "A camp-centre sauna by Lake Ätäskö informs the timber envelope and shore adjacency, not the imagined household's plan.",
    "Uma sauna de um centro de acampamento junto ao lago Ätäskö orienta a construção de madeira e a relação com a margem, não a planta da casa imaginada.",
  ],
  [
    "A Swedish birch macro informs the modeled trees and is also mapped onto their trunks; it is not a measured Finnish material scan.",
    "Uma macrofotografia de bétula sueca orienta as árvores modeladas e também é aplicada aos troncos; não é uma digitalização medida de material finlandês.",
  ],
  [
    "Quiet fire and garden ambience; illustrative recordings, not Finnish field recordings",
    "Fogo discreto e ambiente de jardim; gravações ilustrativas, não feitas na Finlândia",
  ],
  ...details.flatMap(([, title, titlePt, body, bodyPt]) => [
    [title, titlePt],
    [body, bodyPt],
  ]),
]);
