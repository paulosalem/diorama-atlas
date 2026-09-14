export const conceptScenes = {
  riad: {
    id: "riad",
    title: "Marrakech Riad Courtyard",
    version: "openai-photo-v2",
    variants: [
      {
        id: "hero",
        prompt: [
          "Create a photorealistic architectural reference image.",
          "Subject: a Marrakech riad courtyard inside the medina.",
          "View: wide three-quarter interior view, camera at seated eye level, as if shot by a high-end architectural photographer.",
          "Show a tiled fountain at center, terracotta paving, zellige tile borders, carved plaster arches, cedar mashrabiya screen doorway, citrus trees in clay pots, patterned bench cushions, brass tea service, and warm late-afternoon light.",
          "The image should feel like a real place, not an illustration, not a miniature, not CGI, and not a resort advertisement.",
          "Use realistic materials, subtle imperfections, natural shadows, and grounded Moroccan domestic architecture.",
          "Avoid people, text, watermark, collage, fantasy styling, toy-diorama look, or exaggerated glow.",
        ].join(" "),
      },
      {
        id: "tea",
        prompt: [
          "Create a photorealistic interior reference image.",
          "Subject: a welcoming tea alcove in a Marrakech riad courtyard.",
          "View: closer oblique angle focused on low tea table, carved cedar door and screen, patterned cushions, lanterns, tilework, and plaster carving.",
          "The scene should feel intimate, warm, and materially rich, like a real editorial photograph of Moroccan domestic hospitality.",
          "Preserve cultural specificity: cedar carving, brass tea service, zellige, terracotta pots, citrus, and inward-facing courtyard architecture.",
          "Avoid people, text, watermark, fantasy ornament, stylized illustration, or toy-like miniature staging.",
        ].join(" "),
      },
      {
        id: "overview",
        prompt: [
          "Create a photorealistic architectural overview image.",
          "Subject: a Marrakech riad courtyard shown from a slightly elevated angle for spatial clarity.",
          "Show the fountain, surrounding floor geometry, arches, benches, cedar screen doorway, planters, and the relationship between circulation and seating.",
          "The result should look like a real photographic reference for set design and 3D environment art, with accurate materials and natural light.",
          "Avoid people, text, watermark, collage, extreme stylization, miniature-toy aesthetics, or artificial glow.",
        ].join(" "),
      },
    ],
  },
  textile: {
    id: "textile",
    title: "Oaxaca Textile Workshop",
    version: "openai-photo-v2",
    variants: [
      {
        id: "hero",
        prompt: [
          "Create a photorealistic interior reference image.",
          "Subject: an Oaxaca textile workshop used for weaving and natural-dye work.",
          "View: wide three-quarter room view as if photographed for an architectural and craft magazine.",
          "Show a wooden pedal loom, hanging dyed skeins, folded rugs, pigment bowls, clay jars, baskets of fiber, stools, exposed beams, adobe walls, and a central worktable full of process materials.",
          "The room must feel real, hand-worked, sunlit, and materially specific rather than staged like a showroom.",
          "Avoid people, text, watermark, fantasy color, toy-diorama look, CGI gloss, or stylized illustration.",
        ].join(" "),
      },
      {
        id: "process",
        prompt: [
          "Create a photorealistic craft-process reference image.",
          "Subject: the worktable zone of an Oaxaca textile workshop.",
          "View: closer angle focused on dye bowls, pigments, folded textiles, tools, clay jars, baskets, and nearby hanging skeins, with the loom partially visible in the background.",
          "The image should feel like real documentary reference photography of an active weaving space, with tactile surfaces and natural daylight.",
          "Avoid people, text, watermark, fantasy motifs, or stylized concept-art rendering.",
        ].join(" "),
      },
      {
        id: "overview",
        prompt: [
          "Create a photorealistic interior overview image.",
          "Subject: an Oaxaca weaving workshop seen from a slightly elevated angle for layout clarity.",
          "Show the loom footprint, worktable, shelves of folded textiles, baskets of fiber, hanging skeins, and beam structure in one coherent room.",
          "The result should look like a real reference photograph for environment design, with accurate materials, warm daylight, and no stylized miniature effect.",
          "Avoid people, text, watermark, collage, or artificial glow.",
        ].join(" "),
      },
    ],
  },
  kissaten: {
    id: "kissaten",
    title: "Kyoto Jazz Kissaten",
    version: "openai-photo-v2",
    variants: [
      {
        id: "hero",
        prompt: [
          "Create a photorealistic interior reference image.",
          "Subject: a Kyoto jazz kissaten, a classic Japanese coffee house and listening room.",
          "View: wide three-quarter interior view at seated eye level, photographed like a high-end architectural and editorial interior feature.",
          "Show polished walnut paneling, velvet or vinyl booths, small lacquer tables, porcelain coffee cups, cake plates, siphon coffee brewers at the bar, vinyl shelves, speakers, lace curtains, amber pendant lights, menu cards, and subtle tabletop clutter.",
          "The image must feel like a real Showa-era urban cafe, intimate and materially rich, with believable age, wear, and texture rather than stylized nostalgia.",
          "Avoid people, text overlays, watermark, fantasy lighting, toy miniature look, CGI gloss, or illustration aesthetics.",
        ].join(" "),
      },
      {
        id: "brew",
        prompt: [
          "Create a photorealistic close interior reference image.",
          "Subject: the coffee bar of a Kyoto jazz kissaten.",
          "View: closer oblique shot centered on siphon brewers, stacked cups, pastry plates, handwritten menu cards, polished wood counter, glassware, and small service clutter, with the room softly visible beyond.",
          "The result should feel like real editorial photography of a serious coffee house, warm but restrained, with convincing materials and subtle imperfections.",
          "Avoid people, text overlays, watermark, stylized concept-art rendering, or exaggerated glow.",
        ].join(" "),
      },
      {
        id: "overview",
        prompt: [
          "Create a photorealistic architectural overview image.",
          "Subject: a Kyoto jazz kissaten seen from a slightly elevated angle for layout clarity.",
          "Show the relationship among booth seating, central cafe tables, record shelves, speakers, windows with curtains, and the coffee bar in one coherent room.",
          "This should read as a real interior reference photograph for environment design, with accurate proportions, tactile surfaces, and no toy-diorama styling.",
          "Avoid people, text overlays, watermark, collage, or artificial bloom.",
        ].join(" "),
      },
    ],
  },
  meyhane: {
    id: "meyhane",
    title: "Istanbul Meyhane",
    version: "openai-photo-v2",
    variants: [
      {
        id: "hero",
        prompt: [
          "Create a photorealistic interior reference image.",
          "Subject: an Istanbul meyhane, a convivial tavern interior built around a shared table.",
          "View: wide three-quarter evening interior view, photographed like a documentary architectural feature rather than an advertisement.",
          "Show a central table dense with meze plates, raki glasses, water carafes, bread, bentwood or simple wooden chairs, wall mirrors, bottle shelves, banquette seating, modest plaster walls, and warm practical lighting.",
          "The room should feel lived in, social, and modestly elegant, with believable wear, reflections, clutter, and table density.",
          "Avoid people, text overlays, watermark, fantasy styling, toy miniature appearance, or glossy CGI rendering.",
        ].join(" "),
      },
      {
        id: "meze",
        prompt: [
          "Create a photorealistic tabletop reference image.",
          "Subject: the shared meze table of an Istanbul meyhane.",
          "View: closer angle focused on many small plates, raki glasses, clear water carafes, bread, utensils, and the layering of dishes across the evening.",
          "The image should feel like real editorial food-and-space photography with strong material truth and atmospheric reflections, not a commercial hero shot.",
          "Avoid people, text overlays, watermark, stylized illustration, or exaggerated theatrical light.",
        ].join(" "),
      },
      {
        id: "overview",
        prompt: [
          "Create a photorealistic interior overview image.",
          "Subject: an Istanbul meyhane seen from a slightly elevated angle for spatial clarity.",
          "Show mirrors, bottle shelves, banquette seating, music corner, and the shared table in one coherent room with realistic evening light.",
          "This should look like a real architectural reference photo for environment art, with grounded materials, moderate clutter, and no miniature effect.",
          "Avoid people, text overlays, watermark, collage, or excessive glow.",
        ].join(" "),
      },
    ],
  },
  herbshop: {
    id: "herbshop",
    title: "Hanoi Herb Shop",
    version: "openai-photo-v2",
    variants: [
      {
        id: "hero",
        prompt: [
          "Create a photorealistic interior reference image.",
          "Subject: a narrow Hanoi old quarter herb and medicine shop.",
          "View: wide three-quarter room view at standing eye level, photographed like a documentary architectural and craft feature.",
          "Show a large wall of wooden drawers, hanging herb bundles, brass balance scale, paper packets, ceramic jars, glass bottles, roots, bowls, baskets, and a worn work counter in a compressed shop interior.",
          "The room should feel dense with knowledge, tactile, dusty, and materially specific, with believable paper, wood, ceramic, and dried-plant texture.",
          "Avoid people, text overlays, watermark, fantasy motifs, toy miniature look, or stylized concept-art rendering.",
        ].join(" "),
      },
      {
        id: "counter",
        prompt: [
          "Create a photorealistic close interior reference image.",
          "Subject: the weighing and sorting counter of a Hanoi herb shop.",
          "View: closer angle focused on brass balance scale, folded paper packets, bowls of roots and dried leaves, jars, measuring tools, and cluttered work surfaces, with drawer cabinets behind.",
          "The result should feel like real documentary photography of a working shop, with subtle dust, wear, and accurate material relationships.",
          "Avoid people, text overlays, watermark, fantasy aesthetics, or glossy CGI stylization.",
        ].join(" "),
      },
      {
        id: "overview",
        prompt: [
          "Create a photorealistic interior overview image.",
          "Subject: a Hanoi old quarter herb shop seen from a slightly elevated angle for layout clarity.",
          "Show the drawer wall, hanging bundles, jars, side shelving, worktable, and circulation in one coherent narrow interior.",
          "This should read as a real reference photo for environment design, with grounded materials, dense organization, and no toy-diorama styling.",
          "Avoid people, text overlays, watermark, collage, or artificial bloom.",
        ].join(" "),
      },
    ],
  },
  "atlas-map": {
    id: "atlas-map",
    title: "Illustrated Atlas World Map",
    version: "atlas-flat-v1",
    variants: [
      {
        id: "hero",
        prompt: [
          "Create a beautiful flat illustrated world atlas map for a premium cultural exploration interface.",
          "The map must be planar and top-down, with north at the top, in a conventional equirectangular or school-atlas world layout.",
          "Continents must be recognizable and positioned correctly relative to each other: the Americas on the left, Europe and Africa centered, Asia extending to the right, and Australia in the southeast.",
          "Style: elegant editorial atlas, sophisticated and atmospheric, subtle parchment and marine tones, crisp coastlines, gentle terrain tinting, restrained decorative texture, no cartoon look, no 3D tilt, no toy aesthetic.",
          "Important: no labels, no text, no icons, no markers, no compass rose, no ships, no route lines, no legend, no border frame, no inset maps.",
          "Leave clean ocean space and clear land/ocean separation so interface markers can be overlaid accurately afterward.",
          "Avoid fantasy continents, warped geography, satellite realism, infographic styling, collage, or ornamental clutter.",
        ].join(" "),
      },
    ],
  },
};
