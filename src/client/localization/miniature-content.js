import { outdoorScenes } from "../catalog/outdoor-catalog.js";
import { t } from "./locale.js";

const original = outdoorScenes.find((scene) => scene.id === "douro-vineyard");
const detailIds = {
  arrival: "valley",
  vines: "vines",
  terraces: "schist",
  quinta: "quinta",
};
const messages = {
  "en-US": {
    title: "Douro, in miniature",
    subtitle: "A little piece of Portugal",
    views: {
      whole: "The whole piece",
      arrival: "Valley view",
      vines: "The vines",
      terraces: "Stone steps",
      quinta: "Inside the quinta",
      river: "The river",
      geology: "Roots & stone",
      hills: "Across the river",
      harvest: "Harvest corner",
      yard: "The working yard",
      railway: "The riverside railway",
    },
    wholeTitle: "An afternoon you can turn in your hands.",
    wholeBody:
      "Two little pieces of the Douro float together, separated by a sliver of air through the river. A door stands open on one bank; terraces climb toward wooded hills on the other. Turn this imagined valley to see the land beneath the vines, or step into one of its quieter places.",
    hillsTitle: "The hills on the other bank",
    hillsBody:
      "Across the water, another vineyard climbs the slope. Beyond its low terraces, uneven groves gather along the ridge. Shrubs, herbs and small flowers settle between patches of dry grass; a worn contour path threads through the green. Both banks are modeled all the way through. These compressed hills are an imagined miniature, not a geographical model.",
    harvestTitle: "A pause in the afternoon",
    harvestBody:
      "Linen breathes above a worn wooden table. One basket is full of grapes; another is still empty. Two little cups, a notebook and a rumpled cloth suggest a pause between trips through the vines. Herbs and flowers gather around the posts; pale stone leads back to the open quinta. Nothing here is perfectly aligned or quite unused.",
    yardTitle: "Someone will be back in a moment",
    railwayTitle: "The railway beside the river",
    railwayBody:
      "A little red-and-cream regional railcar pauses beside the water. Steel rails rest on timber sleepers and loose ballast; a low, supported viaduct follows the steep bank without taking over the vines. Through the windows are seats and a narrow aisle. This is an imagined stretch inspired by the Douro's riverside railway, not a reconstruction of a particular train, station or route.",
    yardBody:
      "A small work car waits on the stony yard, with harvest crates ready nearby. A bicycle rests beside the quinta; a rake, spade and hoe have been put back on their rack. The wheelbarrow still holds loose stone. Grass gathers where feet and tyres rarely pass, leaving the door and the working paths clear.",
    riverTitle: "At the river's edge",
    riverBody:
      "Below the last retaining wall, a narrow landing meets the water. A wooden boat rests on its mooring, its ribs, loose rope and worn oars visible from above. Light moves across the surface; the vineyard is reflected in the river. This bend and landing are imagined, not a reconstruction of a real site.",
    geologyTitle: "The world beneath the vines",
    geologyBody:
      "The cut sides reveal a thin, stony soil over fractured schist. Pale quartz veins cross the darker rock; branching vine roots reach into its fissures. The inclined markings suggest foliation, not flat sedimentary layers. This is an interpretive cross-section, not a measured geological profile.",
    orbitHint: "Drag to turn · Scroll or pinch to zoom · Arrow keys to rotate",
    eyeHint: "At eye level · Drag or use arrow keys to look · Scroll to zoom",
    home: "Whole miniature",
    reset: "Reset view",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    soundOn: "Enable nature sounds",
    soundOff: "Mute nature sounds",
    soundLoading: "Preparing sounds…",
    pause: "Pause movement",
    resume: "Resume movement",
    reduced: "Reduced motion",
    listen: "Listen to this view",
    stop: "Stop narration",
    voiceNote: "OpenAI-generated voice · starts only when you choose",
    voiceUnavailable:
      "The recording could not play. Try Listen again, or read the story here.",
    language: "Language",
    read: "About this view",
    loading: "Preparing your little corner of the Douro…",
    loadFailed:
      "The miniature could not be loaded. Check the local server, then reload.",
    reload: "Reload",
    compare: "Original comparison",
    atlas: "Open the original Douro",
    credits: "Asset credits",
    note: "An imagined landscape. An interpretive geological section.",
    ready: "The miniature is ready.",
  },
  "pt-BR": {
    title: "Douro em miniatura",
    subtitle: "Um pedacinho de Portugal",
    views: {
      whole: "A peça inteira",
      arrival: "Vista do vale",
      vines: "As videiras",
      terraces: "Degraus de pedra",
      quinta: "Dentro da quinta",
      river: "O rio",
      geology: "Raízes e pedra",
      hills: "A outra margem",
      harvest: "Recanto da colheita",
      yard: "O terreiro de trabalho",
      railway: "A ferrovia à beira-rio",
    },
    wholeTitle: "Uma tarde para girar entre as mãos.",
    wholeBody:
      "Dois pedacinhos do Douro flutuam juntos, separados por uma fresta de ar que atravessa o rio. Uma porta está aberta em uma margem; na outra, terraços sobem até os montes arborizados. Gire este vale imaginado para ver a terra sob as videiras, ou entre em um de seus lugares mais tranquilos.",
    hillsTitle: "Os montes da outra margem",
    hillsBody:
      "Do outro lado da água, outra vinha sobe a encosta. Além dos terraços baixos, pequenos bosques irregulares se agrupam na crista. Arbustos, ervas e flores crescem entre manchas de capim seco; uma trilha gasta atravessa o verde. As duas margens são modeladas por inteiro. Estes montes condensados são uma miniatura imaginada, não um modelo geográfico.",
    harvestTitle: "Uma pausa na tarde",
    harvestBody:
      "O linho se move suavemente sobre uma mesa de madeira gasta. Um cesto está cheio de uvas; outro ainda está vazio. Duas xícaras, um caderno e um pano amassado sugerem uma pausa entre idas à vinha. Ervas e flores cercam os postes; pedras claras levam de volta à quinta aberta. Nada está perfeitamente alinhado ou inteiramente novo.",
    yardTitle: "Alguém já volta",
    railwayTitle: "A ferrovia junto ao rio",
    railwayBody:
      "Uma pequena automotora regional vermelha e creme faz uma pausa junto à água. Os trilhos de aço repousam sobre dormentes de madeira e lastro solto; um viaduto baixo e apoiado acompanha a margem íngreme sem ocupar as vinhas. Pelas janelas aparecem bancos e um corredor estreito. É um trecho imaginado inspirado na ferrovia do Douro, não a reconstrução de um trem, estação ou traçado específico.",
    yardBody:
      "Um pequeno carro de trabalho espera no terreiro pedregoso, com caixas de colheita por perto. Uma bicicleta repousa ao lado da quinta; o ancinho, a pá e a enxada voltaram ao suporte. O carrinho de mão ainda contém pedras soltas. O capim cresce onde pés e pneus raramente passam, deixando a porta e os caminhos de trabalho livres.",
    riverTitle: "À beira do rio",
    riverBody:
      "Abaixo do último muro de arrimo, um pequeno cais encontra a água. Um barco de madeira repousa amarrado, com as cavernas do casco, a corda solta e os remos gastos visíveis de cima. A luz se move na superfície; a vinha se reflete no rio. Esta curva e este cais são imaginados, não uma reconstrução de um lugar real.",
    geologyTitle: "O mundo sob as videiras",
    geologyBody:
      "Os lados cortados revelam um solo fino e pedregoso sobre xisto fraturado. Veios claros de quartzo atravessam a rocha escura; raízes ramificadas penetram em suas fissuras. As marcas inclinadas sugerem foliação, não camadas sedimentares horizontais. É um corte interpretativo, não um perfil geológico medido.",
    orbitHint:
      "Arraste para girar · Role ou use dois dedos para aproximar · Setas para girar",
    eyeHint:
      "Ao nível dos olhos · Arraste ou use as setas para olhar · Role para aproximar",
    home: "Miniatura inteira",
    reset: "Restaurar vista",
    zoomIn: "Aproximar",
    zoomOut: "Afastar",
    soundOn: "Ativar sons da natureza",
    soundOff: "Silenciar a natureza",
    soundLoading: "Preparando sons…",
    pause: "Pausar movimento",
    resume: "Retomar movimento",
    reduced: "Movimento reduzido",
    listen: "Ouvir esta vista",
    stop: "Parar narração",
    voiceNote: "Voz gerada pela OpenAI · só começa quando você escolhe",
    voiceUnavailable:
      "Não foi possível reproduzir a gravação. Tente ouvir novamente ou leia a história aqui.",
    language: "Idioma",
    read: "Sobre esta vista",
    loading: "Preparando seu pedacinho do Douro…",
    loadFailed:
      "Não foi possível carregar a miniatura. Verifique o servidor local e recarregue.",
    reload: "Recarregar",
    compare: "Comparação original",
    atlas: "Abrir o Douro original",
    credits: "Créditos dos materiais",
    note: "Uma paisagem imaginada. Um corte geológico interpretativo.",
    ready: "A miniatura está pronta.",
  },
};

export function miniatureContent(locale, view) {
  const copy = messages[locale];
  if (!copy || !Object.hasOwn(copy.views, view))
    throw new Error("Unknown miniature language or viewpoint.");
  const detail = original.details.find((entry) => entry.id === detailIds[view]);
  return {
    ...copy,
    heading: detail ? t(detail.title) : copy[`${view}Title`],
    body: detail ? t(detail.body) : copy[`${view}Body`],
  };
}

const miniatureStories = {
  "alfama-hillside": {
    "en-US": {
      heading: "A neighborhood discovered one turn at a time.",
      body: "Two sections reveal the same imagined Alfama hillside: narrow stair lanes, thick thresholds, overlapping roofs and a sheltered domestic court. Turn the miniature to follow routes hidden from street level, or choose a close view beside the washing and flower pots. The separation is an interpretive display, not a real fault in the ground. Modest homes and evidence of care are the subject, not a celebration of deprivation.",
    },
    "pt-BR": {
      heading: "Um bairro descoberto a cada curva.",
      body: "Dois cortes revelam a mesma encosta imaginada de Alfama: becos com escadas, soleiras espessas, telhados sobrepostos e um pátio doméstico abrigado. Gire a miniatura para seguir caminhos escondidos ao nível da rua ou escolha uma vista próxima do varal e dos vasos. A separação é um recurso de apresentação, não uma falha real no terreno. O tema são casas modestas e sinais de cuidado, não uma celebração da privação.",
    },
  },
  riad: {
    "en-US": {
      heading: "An inward-looking house, opened to the afternoon.",
      body: "The upper galleries and a seasonal shade canopy lift away together. Below them, the fountain, citrus, patterned tiles and half-finished tea remain in the courtyard. Thick portals continue into furnished salons and quieter passages; the upper rooms stay with their own architectural half. This is an imagined house of hospitality, not a model of a particular riad.",
    },
    "pt-BR": {
      heading: "Uma casa voltada para dentro, aberta para a tarde.",
      body: "As galerias superiores e uma cobertura sazonal de sombra se erguem juntas. Embaixo permanecem a fonte, as árvores cítricas, os mosaicos e o chá no pátio. Portais espessos levam a salões mobiliados e passagens mais silenciosas; os quartos superiores acompanham sua própria metade arquitetônica. É uma casa imaginada de acolhimento, não a maquete de um riad específico.",
    },
  },
  "balinese-subak-terraces": {
    "en-US": {
      heading: "Water, work, and a pause in the shade.",
      body: "Six planted terraces follow the hillside in two floating sections. Wet earth meets narrow bunds; fine roots show in the cut banks. A woven basket, a cup and resting tools wait under the field shelter while palm fronds and rice leaves move gently above the water. This compressed, imagined landscape draws on Balinese subak traditions; it does not represent a surveyed irrigation system or a particular community.",
    },
    "pt-BR": {
      heading: "Água, trabalho e uma pausa à sombra.",
      body: "Seis terraços cultivados acompanham a encosta em dois cortes flutuantes. A terra úmida encontra caminhos estreitos; raízes finas aparecem nas faces cortadas. Um cesto trançado, uma xícara e ferramentas em repouso esperam sob o abrigo do campo, enquanto folhas de palmeira e de arroz se movem suavemente sobre a água. Esta paisagem condensada e imaginada se inspira nas tradições subak de Bali; não representa um sistema de irrigação medido nem uma comunidade específica.",
    },
  },
  textile: {
    "en-US": {
      heading: "A workshop, waiting for someone to return.",
      body: "Behind an earthen facade and a roof of overlapping clay tiles, the loom holds a partly woven cloth. Bowls of dye, loose fibres and the shaded workroom remain where the afternoon left them. The roof and entrance lift together, revealing the room as one half of a floating architectural section; a small drying courtyard stays beside it. This is an imagined Oaxacan workshop, not a model of a particular address.",
    },
    "pt-BR": {
      heading: "Uma oficina à espera de quem já volta.",
      body: "Atrás da fachada de terra e do telhado de peças de barro sobrepostas, o tear sustenta um tecido ainda em trabalho. Tigelas de corante, fibras soltas e a sala sombreada continuam onde a tarde os deixou. O telhado e a entrada se erguem juntos, revelando o interior como metade de um corte arquitetônico flutuante; um pequeno pátio de secagem permanece ao lado. É uma oficina oaxaquenha imaginada, não a maquete de um endereço real.",
    },
  },
};

export function sceneMiniatureContent(
  locale,
  view,
  definition,
  views,
  narration = [],
) {
  const common = messages[locale];
  if (!common) throw new Error(`Unknown miniature language: ${locale}.`);
  const shellLabels =
    locale === "pt-BR"
      ? { openShell: "Abrir a miniatura", closeShell: "Fechar a miniatura" }
      : { openShell: "Crack it open", closeShell: "Close miniature" };
  if (definition.id === "douro-vineyard")
    return { ...miniatureContent(locale, view), ...shellLabels };
  if (!definition.summary)
    throw new Error(`Missing place description for ${definition.id}.`);
  const landscape = definition.environment === "outdoor";
  const intro = narration.find(
    (asset) => asset.locale === locale && asset.view === undefined,
  );
  const firstView = Object.keys(views ?? {}).find((key) => key !== "whole");
  const narrationView = views?.[view]?.narrationView ?? view;
  const transcript = narration.find(
    (asset) =>
      asset.locale === locale &&
      (view === firstView
        ? asset.view === undefined
        : asset.view === narrationView),
  );
  const introduction =
    locale === "pt-BR"
      ? landscape
        ? "Duas partes de uma paisagem vivida, suspensas no ar."
        : "Uma casa de pequenas histórias, pronta para se abrir."
      : landscape
        ? "Two pieces of a lived-in landscape, held in the air."
        : "A place of small stories, waiting to open.";
  const note =
    locale === "pt-BR"
      ? landscape
        ? "O corte revela o solo e a rocha sob a arquitetura, os caminhos e os sinais de trabalho. Esta miniatura é uma interpretação, não um levantamento geográfico."
        : "O invólucro arquitetônico se ergue e se afasta, revelando os cômodos, seus objetos e as passagens. As faces cortadas mostram uma parte do lugar, não necessariamente um edifício completo."
      : landscape
        ? "The cut reveals the ground beneath the architecture, paths and signs of work. This miniature is an interpretation, not a geographical survey."
        : "The architectural shell lifts aside to reveal the rooms, their objects and their connected passages. The cut faces describe a piece of the place, not necessarily a whole building.";
  const story = miniatureStories[definition.id]?.[locale] ?? {
    heading: intro?.title ?? introduction,
    body: `${intro?.text ?? t(definition.summary)} ${note}`,
  };
  if (views && !Object.hasOwn(views, view))
    throw new Error(`Unknown miniature viewpoint: ${view}.`);
  const labels = { whole: common.views.whole };
  for (const [key, value] of Object.entries(views ?? {}))
    if (key !== "whole") labels[key] = t(value.label);
  return {
    ...common,
    ...shellLabels,
    views: labels,
    heading:
      view === "whole" ? story.heading : (transcript?.title ?? labels[view]),
    body:
      view === "whole"
        ? story.body
        : (transcript?.text ?? t(definition.summary)),
    loading:
      locale === "pt-BR"
        ? "Preparando a miniatura…"
        : "Preparing the miniature…",
  };
}
