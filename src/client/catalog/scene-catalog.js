import { outdoorScenes } from "./outdoor-catalog.js";

export const curatedScenes = [
  {
    id: "riad",
    title: "Marrakech Riad Courtyard",
    region: "Marrakech medina domestic courtyard",
    period: "Inward-facing hospitality, craft, and climate design",
    blurb:
      "A tiled courtyard of fountain water, carved cedar, citrus trees, lanterns, and tea service arranged around shade and privacy.",
    summary:
      "The riad is one of the great architectural lessons of North Africa: a home turned inward around a courtyard that creates shade, airflow, privacy, and ceremony in dense urban fabric. Water, citrus, tile, carved plaster, cedar screens, and low seating are not random decoration. They organize temperature, sociability, sound, and the experience of welcome. This diorama treats the courtyard as both domestic infrastructure and a choreography of hospitality.",
    accent: "#6fb0a8",
    viewer: {
      top: "rgba(115, 180, 170, 0.2)",
      bottom: "rgba(27, 22, 19, 0.92)",
      fog: 0x201916,
      density: 0.03,
    },
    camera: {
      position: [-4.1, 2.9, 5.35],
      target: [0.45, 1.12, -1.55],
    },
    details: [
      {
        id: "fountain",
        title: "Courtyard fountain",
        body: "The central fountain is atmospheric, but it is also practical. Moving water cools the courtyard, adds sound privacy, and turns the center of the home into a sensory anchor.",
        point: [0, 0.78, 0],
      },
      {
        id: "zellige",
        title: "Zellige floor",
        body: "Zellige tile is a geometry of skill and repairable surfaces. It cools the courtyard visually and physically while making pattern, craft knowledge, and maintenance visible every day.",
        point: [1.24, 0.16, 1.42],
      },
      {
        id: "tea-tray",
        title: "Tea service",
        body: "Mint tea service stages welcome and conversation. The tray, glasses, pot, and sweets organize the courtyard as a social room rather than just an open shaft of light.",
        point: [-3.02, 0.78, 2.42],
      },
      {
        id: "cedar-screen",
        title: "Carved cedar screen",
        body: "Cedar screens filter light and sight lines without fully sealing space. They help a dense house feel layered, private, and breathable at the same time.",
        point: [1.24, 1.9, -4.72],
      },
      {
        id: "citrus",
        title: "Citrus planters",
        body: "Potted citrus turns the courtyard into a cultivated microclimate. Fragrance, shade, and fruit link ornament to everyday seasonal life.",
        point: [-2.74, 1.55, -2.02],
      },
    ],
    concept: {
      mode: "Local fallback reference plate",
      imageVersion: "openai-photo-v2",
      art: "riad",
      references: [
        {
          id: "hero",
          label: "Courtyard",
          note: "Photorealistic full-courtyard reference showing the fountain, arches, citrus planters, and overall hospitality layout.",
        },
        {
          id: "tea",
          label: "Tea and Cedar",
          note: "Closer atmospheric reference for tea service, carved cedar, textiles, lanterns, and the feel of intimate reception alcoves.",
        },
        {
          id: "overview",
          label: "Spatial Read",
          note: "Higher-angle reference clarifying the courtyard geometry, tile fields, wall treatment, and movement around the fountain.",
        },
      ],
      hero: "Isometric cutaway of a Marrakech riad courtyard at late afternoon, intricate zellige, carved plaster arches, citrus trees, tea tray, fountain, warm stone, cinematic miniature.",
      mood: "Quiet shade, water echo, brass lantern warmth, green citrus leaves against sunwashed plaster, intimate hospitality rather than public spectacle.",
      layout:
        "Open courtyard center, fountain on axis, benches and tea service to one side, carved doorway and mashrabiya screen opposite, upper arch rhythm framing the sky.",
      palette: [
        "zellige blue",
        "sunwashed plaster",
        "citrus green",
        "cedar brown",
        "tea-brass amber",
      ],
      props: [
        "fountain basin",
        "tea tray",
        "mint glasses",
        "carved screens",
        "orange tree pots",
        "woven cushions",
        "lanterns",
      ],
      learning: [
        "Why riads turn inward in dense hot cities",
        "How water and shade shape comfort",
        "How craft surfaces teach material culture",
      ],
      colors: ["#0f5f67", "#d6c3a1", "#738f41", "#6f4b34", "#bb8d52"],
    },
  },
  {
    id: "textile",
    title: "Oaxaca Textile Workshop",
    region: "Oaxacan weaving and dye workspace",
    period: "Craft labor, natural dyes, and pattern memory",
    blurb:
      "A sunlit weaving room of wooden looms, dyed skeins, folded cloth, clay vessels, and work surfaces shaped by repeated skilled labor.",
    summary:
      "Oaxacan textile workshops hold together farming, dye knowledge, spinning, loom technique, and pattern memory. The room is full of small evidence of this chain: skeins drying after dye baths, folded cloth awaiting sale, loom parts worn by touch, pigments and fibers stored in bowls and baskets, and sample patterns kept close to the weaver's eye. This diorama focuses on textile labor as a living system of color, rhythm, and accumulated technique.",
    accent: "#d67f48",
    viewer: {
      top: "rgba(210, 133, 84, 0.22)",
      bottom: "rgba(29, 19, 14, 0.92)",
      fog: 0x241712,
      density: 0.028,
    },
    camera: {
      position: [5.85, 3.05, 5.8],
      target: [0.15, 1.16, -1],
    },
    details: [
      {
        id: "loom",
        title: "Pedal loom",
        body: "The loom concentrates generations of knowledge into wood, tension, rhythm, and body memory. Its scale reveals that weaving is architectural labor, not tiny decorative work.",
        point: [-3.06, 1.45, -0.48],
      },
      {
        id: "skeins",
        title: "Dyed skeins",
        body: "Skeins are the moment when color knowledge becomes visible. Cochineal, indigo, marigold, walnut, and other materials are translated into controlled hue before cloth is even on the loom.",
        point: [-1.06, 3.06, -4.62],
      },
      {
        id: "dye-bowls",
        title: "Dye and pigment table",
        body: "Bowls, bundles, and clay vessels connect weaving to plants, insects, minerals, and local ecologies. The workshop teaches color as a material process, not an abstract choice.",
        point: [0.52, 1.02, 2.02],
      },
      {
        id: "folded-textiles",
        title: "Folded textiles",
        body: "Folded finished cloth is where labor meets trade. Patterns, edge finishes, and handle communicate quality long before a textile is worn or hung.",
        point: [4.48, 1.48, -0.8],
      },
      {
        id: "pattern-board",
        title: "Pattern references",
        body: "Sample motifs and pinned references show how pattern memory is stored in the room itself. Workshops often carry visual archives that bridge teaching, repetition, and experimentation.",
        point: [-4.06, 2.36, -4.72],
      },
    ],
    concept: {
      mode: "Local fallback reference plate",
      imageVersion: "openai-photo-v2",
      art: "textile",
      references: [
        {
          id: "hero",
          label: "Workshop",
          note: "Photorealistic full-room reference showing the loom, worktable, shelves, hanging skeins, and the overall craft atmosphere.",
        },
        {
          id: "process",
          label: "Process Table",
          note: "Closer reference for dye bowls, fibers, folded cloth, hand tools, and the room’s process-rich work surfaces.",
        },
        {
          id: "overview",
          label: "Loom Layout",
          note: "Higher-angle reference clarifying the loom footprint, circulation space, ceiling beams, and the storage layout of the workshop.",
        },
      ],
      hero: "Isometric cutaway of an Oaxaca textile workshop, wooden loom in foreground, dyed skeins drying, folded rugs, clay bowls of pigments, sunlit adobe surfaces, handcrafted miniature realism.",
      mood: "Warm daylight, earthy plaster, saturated fibers, visible handwork, room full of process rather than showroom polish, quiet rhythm of repeated making.",
      layout:
        "Loom to one side, long worktable with pigments and folded cloth opposite, yarn rack on the back wall, sample textiles and references pinned high, open floor for movement.",
      palette: [
        "cochineal red",
        "indigo blue",
        "marigold gold",
        "walnut brown",
        "sunbaked adobe",
      ],
      props: [
        "pedal loom",
        "dyed skeins",
        "folded rugs",
        "clay bowls",
        "pattern board",
        "fiber baskets",
        "stools",
      ],
      learning: [
        "How dye knowledge links craft to ecology",
        "How loom scale changes the sense of weaving",
        "How pattern memory lives in samples and repetition",
      ],
      colors: ["#9c3d32", "#315a79", "#d6a03f", "#705037", "#c28a60"],
    },
  },
  {
    id: "kissaten",
    title: "Kyoto Jazz Kissaten",
    region: "Kyoto kissaten coffee and listening-room culture",
    period: "Showa-era coffee ritual, records, and urban leisure",
    blurb:
      "A wood-paneled Japanese coffee house of siphon brewers, vinyl shelves, lace curtains, careful table settings, and amber quiet.",
    summary:
      "The kissaten is not just a cafe. It is a room for ritualized attention: coffee brewed with precision, records played for listening rather than background noise, and interiors tuned to concentration, conversation, and urban respite. Wood paneling, velvet booths, handwritten menus, glassware, ashtrays, sweets, and music equipment all signal a social world built around patience and taste rather than speed.",
    accent: "#c08b56",
    viewer: {
      top: "rgba(207, 154, 92, 0.2)",
      bottom: "rgba(23, 16, 12, 0.92)",
      fog: 0x1d1410,
      density: 0.03,
    },
    camera: {
      position: [5.9, 3.1, 5.8],
      target: [0.24, 1.18, -0.9],
    },
    details: [
      {
        id: "siphon-bar",
        title: "Siphon coffee bar",
        body: "Glass siphons turn coffee into a visible ritual of heat, timing, and care. In many kissaten, the brewing method is part of the room's theater and part of its claim to seriousness.",
        point: [3.24, 2.2, 1.06],
      },
      {
        id: "records",
        title: "Jazz record wall",
        body: "Jazz kissaten built listening into the architecture of everyday life. Record shelves, turntables, and speakers made the room a place for study, mood, and disciplined attention.",
        point: [-4.05, 1.98, 1.96],
      },
      {
        id: "booth",
        title: "Velvet booth",
        body: "Deep booths slow the pace of the visit. They frame coffee as a lingering act and give the small urban room an atmosphere of refuge and privacy.",
        point: [-3.34, 1.08, 1.68],
      },
      {
        id: "dessert",
        title: "Toast and cake service",
        body: "Thick toast, cake slices, cream, and neatly plated sweets are staples of kissaten culture. Their presentation emphasizes balance, repetition, and the craft of ordinary hospitality.",
        point: [0.22, 0.96, 1.54],
      },
      {
        id: "menu-cards",
        title: "Handwritten menu cards",
        body: "Menu cards, matchboxes, clocks, and paper ephemera anchor the kissaten in everyday neighborhood life. They make the room feel maintained rather than designed once and frozen.",
        point: [3.94, 1.96, 1.54],
      },
    ],
    concept: {
      mode: "Local fallback reference plate",
      imageVersion: "openai-photo-v2",
      art: "kissaten",
      references: [
        {
          id: "hero",
          label: "Listening Room",
          note: "Photorealistic main reference showing the overall kissaten room, booths, coffee bar, records, and warm amber composition.",
        },
        {
          id: "brew",
          label: "Coffee Bar",
          note: "Closer reference for siphon brewers, cups, menu cards, counter clutter, and the craftsmanship of the coffee service zone.",
        },
        {
          id: "overview",
          label: "Room Layout",
          note: "Slightly elevated reference clarifying booth placement, circulation, window treatment, and the relationship between listening corner and tables.",
        },
      ],
      hero: "Isometric cutaway of a Kyoto jazz kissaten, glowing wood paneling, velvet booths, siphon coffee bar, jazz records, lace curtain windows, cakes and cups on tables, rich miniature realism.",
      mood: "Low amber light, polished wood, restrained quiet, soft jazz atmosphere, meticulous service, and the feeling of a room designed for lingering attention.",
      layout:
        "Counter bar to one side, listening corner with records opposite, central small tables, deeper booth seating at the edge, and layered objects that make the room feel lived-in rather than staged.",
      palette: [
        "walnut brown",
        "amber brass",
        "cream porcelain",
        "olive upholstery",
        "smoke-tinted lacquer",
      ],
      props: [
        "siphon brewers",
        "vinyl shelves",
        "booths",
        "cake plates",
        "menu cards",
        "pendant lamps",
        "coffee cups",
      ],
      learning: [
        "How kissaten culture differs from fast cafe service",
        "Why jazz listening became part of urban coffee-house life",
        "How interiors shape ritual and pace",
      ],
      colors: ["#4d3426", "#c98d49", "#efe1ca", "#59634c", "#bb8f54"],
    },
  },
  {
    id: "meyhane",
    title: "Istanbul Meyhane",
    region: "Istanbul meyhane table culture",
    period: "Shared meze, raki ritual, and night-table sociability",
    blurb:
      "A convivial tavern room of small plates, clear glasses, mirrors, bottles, and long conversation unfolding around a shared table.",
    summary:
      "The meyhane is a social room organized by sequence and companionship: small meze plates arriving in rounds, raki diluted slowly with water, conversation widening and tightening through the night, and walls built to multiply the table through mirrors, shelves, and reflected light. It is a culture of shared pacing rather than individual ordering, where the table itself becomes the primary stage.",
    accent: "#93a18f",
    viewer: {
      top: "rgba(172, 138, 92, 0.18)",
      bottom: "rgba(24, 17, 14, 0.94)",
      fog: 0x1d1612,
      density: 0.032,
    },
    camera: {
      position: [5.5, 2.95, 4.95],
      target: [-0.92, 1.08, -1.28],
    },
    details: [
      {
        id: "meze",
        title: "Meze spread",
        body: "Meze makes the meal conversational. Many small plates keep the table active, encourage sharing, and turn dining into a gradual sequence instead of a single ordered course.",
        point: [-0.16, 0.98, -0.12],
      },
      {
        id: "raki",
        title: "Raki glasses",
        body: "Raki service is paced and ritualized. Water, ice, and clear glasses structure the rhythm of the evening and connect drink to sociability rather than speed.",
        point: [0.72, 1.06, 0.02],
      },
      {
        id: "bottles",
        title: "Bottle shelves",
        body: "Back-bar bottles and carafes frame the room as a place of return and familiarity. Shelving is part storage, part display, and part memory of what the table might become.",
        point: [4.72, 2.2, -3.18],
      },
      {
        id: "mirrors",
        title: "Wall mirrors",
        body: "Mirrors widen the room and multiply the table, making a modest interior feel denser and more animated. Reflections are part of the meyhane's atmosphere.",
        point: [-4.28, 2.18, -3.72],
      },
      {
        id: "music-corner",
        title: "Music corner",
        body: "Live or remembered music often hovers around the meyhane: a corner instrument, a small platform, or wall-hung traces that make the room feel tuned for evening performance.",
        point: [-3.84, 1.62, 1.26],
      },
    ],
    concept: {
      mode: "Local fallback reference plate",
      imageVersion: "openai-photo-v2",
      art: "meyhane",
      references: [
        {
          id: "hero",
          label: "Shared Table",
          note: "Photorealistic main reference showing the meyhane table, plates, glasses, benches, bottle wall, and mirror-lined room.",
        },
        {
          id: "meze",
          label: "Table Detail",
          note: "Closer reference for meze plates, raki glasses, bread, cutlery, and the dense tabletop choreography.",
        },
        {
          id: "overview",
          label: "Night Interior",
          note: "Slightly elevated reference clarifying room depth, bench seating, reflective walls, and the relationship between table and bottle shelves.",
        },
      ],
      hero: "Isometric cutaway of an Istanbul meyhane interior at night, communal table with many meze plates, raki glasses, mirrored walls, bottle shelves, bentwood chairs, warm tavern realism.",
      mood: "Night warmth, conversation, glass reflections, shared dishes, modest but dense hospitality, and the layered glow of a room occupied for hours.",
      layout:
        "Long central table, bench and chair seating to both sides, mirrored wall and bottle shelf behind, small music corner at the edge, and dense tabletop clutter as the visual focus.",
      palette: [
        "brick red",
        "tile teal",
        "olive wood",
        "cream plaster",
        "aged brass",
      ],
      props: [
        "meze plates",
        "raki glasses",
        "carafes",
        "bottle shelves",
        "mirrors",
        "chairs",
        "music corner",
      ],
      learning: [
        "How shared-table dining shapes social time",
        "Why meze is about pacing as much as flavor",
        "How tavern interiors amplify sociability",
      ],
      colors: ["#8f4d39", "#4c7880", "#5a6847", "#e4d4bf", "#ba9159"],
    },
  },
  {
    id: "herbshop",
    title: "Hanoi Herb Shop",
    region: "Hanoi Old Quarter medicine and herb trade",
    period: "Materia medica, measurement, and narrow-shop commerce",
    blurb:
      "A drawer-lined medicine shop of dried roots, paper packets, hanging bundles, brass scales, labeled jars, and compressed urban knowledge.",
    summary:
      "Shops devoted to herbs and materia medica store knowledge spatially. Drawers, bundles, bowls, jars, balance scales, handwritten packets, and narrow counters organize memory into a room that can be read by eye and hand. The old quarter shop is not just a place of sale: it is an index of ingredients, weights, smells, and repeated acts of sorting, measuring, and advising.",
    accent: "#7fb099",
    viewer: {
      top: "rgba(126, 171, 142, 0.18)",
      bottom: "rgba(18, 15, 12, 0.94)",
      fog: 0x191510,
      density: 0.031,
    },
    camera: {
      position: [5.15, 2.95, 5.1],
      target: [-0.98, 1.12, -0.72],
    },
    details: [
      {
        id: "drawers",
        title: "Drawer wall",
        body: "Drawer cabinets turn memory into furniture. A practiced shopkeeper can read the wall as a working map of ingredients, substitutions, quantities, and habitual combinations.",
        point: [0.18, 2.1, -4.46],
      },
      {
        id: "bundles",
        title: "Hanging herb bundles",
        body: "Bundles make the shop legible by smell, color, and dryness. Hanging storage keeps materials visible while preventing them from disappearing into anonymous containers.",
        point: [3.48, 3.06, -2.34],
      },
      {
        id: "scale",
        title: "Brass balance scale",
        body: "The balance scale is where advice becomes measure. It makes precision visible and turns a transaction into a small public performance of trust and expertise.",
        point: [-1.56, 1.12, 1.32],
      },
      {
        id: "jars",
        title: "Storage jars",
        body: "Jars and ceramic vessels protect ingredients while still keeping them sorted by texture, category, and expected use. They contribute to the room's dense material vocabulary.",
        point: [4.34, 1.88, -2.18],
      },
      {
        id: "packets",
        title: "Paper packets",
        body: "Folded paper packets are a portable form of the shop's knowledge. They compress prescription, quantity, and trust into an ordinary everyday object.",
        point: [-0.82, 1.02, 1.32],
      },
    ],
    concept: {
      mode: "Local fallback reference plate",
      imageVersion: "openai-photo-v2",
      art: "herbshop",
      references: [
        {
          id: "hero",
          label: "Shop Interior",
          note: "Photorealistic main reference showing the drawer wall, counter, hanging herbs, jars, and narrow-shop atmosphere.",
        },
        {
          id: "counter",
          label: "Measuring Counter",
          note: "Closer reference for the balance scale, paper packets, roots, bowls, and the tactile clutter of weighing and sorting.",
        },
        {
          id: "overview",
          label: "Drawer System",
          note: "Slightly elevated reference clarifying the organization of drawers, shelf zones, bundles, and the shop's compressed circulation.",
        },
      ],
      hero: "Isometric cutaway of a Hanoi old quarter herb and medicine shop, wall of small drawers, brass balance scale, hanging herb bundles, jars, paper packets, dense narrow-room realism.",
      mood: "Dusty daylight, paper and wood textures, dried leaves and roots, calm concentration, and the feeling of a room dense with practical memory.",
      layout:
        "Large drawer cabinet on the back wall, counter and weighing station in front, shelves and jars to one side, hanging bundles above, baskets and packets filling the lower edges.",
      palette: [
        "jade green",
        "paper beige",
        "aged bark",
        "brass gold",
        "sunwashed plaster",
      ],
      props: [
        "drawer cabinet",
        "balance scale",
        "paper packets",
        "storage jars",
        "dried roots",
        "hanging bundles",
        "baskets",
      ],
      learning: [
        "How shops store knowledge spatially",
        "Why weighing and sorting shape trust",
        "How ordinary objects carry medical and trade memory",
      ],
      colors: ["#5c8a6a", "#e7d3b7", "#6a4830", "#b78e54", "#d3c2a7"],
    },
  },
];

export async function loadScenes() {
  const response = await fetch("/api/generated-scenes");
  if (!response.ok) throw new Error("Your saved places could not be loaded.");
  const payload = await response.json();
  return [...curatedScenes, ...(payload.scenes ?? []), ...outdoorScenes];
}
