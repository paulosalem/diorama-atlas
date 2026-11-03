# Generalize the cause, not the decoration

These are examples from the collection's requests and implementation, not a
shopping list for every scene or a certification of photographic realism.
Read the [scene briefs](../../../../docs/scenes/README.md) for local intent.

| Case                                                                                 | General lesson                                                                                                                | A deeper pass should ask                                                                                                                                                           |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marrakech's recessed doors, shutters, furnished rooms and upper gallery              | A threshold needs construction, a destination and layered light; adding a dark doorway texture is not spatial depth           | Can the viewer see through at different heights and angles? Do cladding, glass, furniture or skirting secretly close the opening? Is the room beyond inhabited?                    |
| Marrakech's stitched poufs, rumpled linen, slippers, crumbs, open book and tea steam | Occupation is a network of related actions and physical relationships, not a clutter count                                    | Do cloth, vessels and small objects rest convincingly? Are signs of use restrained, culturally plausible and visible at close range?                                               |
| Kyoto's preparation room, siphon brewing, coffee traces and turning record           | Connect public atmosphere to backstage work; animate a meaningful working object                                              | Do glass, coffee equipment and record imagery reward close inspection? Does movement remain unhurried and sound spatially credible?                                                |
| Istanbul and all three Lisbon taverns' service rooms and partly cleared tables       | Hospitality has a sequence: serving, sharing, clearing and storage                                                            | Do dishes, bread, labels, glassware and linen imply that sequence without identical arrangements? Are the distinct regional and saved-variant intentions preserved?                |
| Hanoi's pulled-out drawers, parcels, scales and dispensary                           | Containers require actual interiors; dense working storage must retain legible circulation                                    | Are drawer bottoms and sides real? Do jars and paper have believable rims, folds and labels without invented medicinal claims?                                                     |
| Kerala's recessed hearth, fuel, steam, pantry, garden and single canal               | Heat, ventilation, preparation and exterior context should agree; one physical system should have one coherent implementation | Are soot and embers localized? Can the visitor understand the kitchen-to-garden depth? Are duplicated water surfaces or blocked hearth mouths masking defects?                     |
| Oaxaca's loom, warp, loose fibre, shears and dye room                                | Build a readable process, with fine functional parts and related materials                                                    | Can one follow preparation to weaving? Are threads, tools and textile edges convincing rather than decorative proxies?                                                             |
| The bookshop's reading room, binding tools, spectacles and illustrated books         | Repeated objects need individual material/graphic identity and a purpose                                                      | Do spines, covers, open pages and paper edges remain convincing near the camera? Does the reading light actually support the activity?                                             |
| Newar pottery and the Central Asian madrasa                                          | Repetition in culture or construction is not permission for identical geometry, finish or flat ornament                       | Do pots have varied profiles and open mouths? Do screens, arcades and glazed borders retain physical depth and locally coherent construction?                                      |
| Bahian paving, Andean fitted masonry, Swahili verandahs and Lao layered roofs        | Regional identity lives in slope, joints, shade, support and silhouette, not a collection of generic motifs                   | Are surfaces structurally plausible from the side and reverse? Does selective weathering respect maintenance and exposure?                                                         |
| Balinese fields and the Douro's richer hills, vines and field margins                | A living landscape needs terrain-following parcels, connected plant structure and varied ground cover                         | Do leaves attach and bend correctly? Are plants individual enough close up? Do ground pigment, grass, soil and worn paths describe the same land use?                              |
| Venetian hulls, Naxi crossings and Tunisian coastal water                            | Water must meet constructed objects correctly and behave at the right environmental scale                                     | Are hulls hollow, benches supported and crossings open? Do reflections, waves, wet edges and waterline light share an irregular flow rather than independent patterns?             |
| Collection-wide patina and non-repetitive floors                                     | Natural material variation and wear are different; maintained wood and stone are still nonuniform                             | Does each piece vary without giant grain, repeated patches, broken grout alignment or blanket grime? Are artistic patterns and printed images protected?                           |
| Field Notes, books, labels, record sleeves and contextual wall prints                | Actual imagery and physical paper give small props identity; tasteful integration matters more than quantity                  | Are labels curved to their vessels and pages bowed/bound? Does the imagery suit the place rather than copying the same admired artwork everywhere?                                 |
| Douro's car, bicycle, wheelbarrow, crates, tools and flowering pots                  | Add life through an understandable activity area, with grounded objects and useful circulation                                | Does the yard feel worked rather than staged? Are scale, tool construction, cavities, support and vegetation/path boundaries credible?                                             |
| Douro's pergola, moving linen, harvest table, baskets and river landing              | Coziness comes from shade, tactile contact, a place to pause and traces of work                                               | Do weighted cloth, basket interiors, seating, grapes and the landing connect physically and compositionally?                                                                       |
| Douro's two-piece floating miniature and exposed geology                             | A presentation change reveals new surfaces and relationships that must be fully modeled                                       | Are undersides closed, roots embedded, cut faces coherent and both riverbanks believable? Do orbiting, close visits, narration and clear gaps all survive?                         |
| Douro's supported riverside line and detailed stationary railcar                     | A new infrastructure element creates obligations for terrain, clearance, scale and construction                               | Are rails, sleepers, ballast, supports, seats and glazing credible? Are trees and routes clear? Do not imply a functioning train simulation when only a stationary vehicle exists. |
| Native Three.js/Babylon/PlayCanvas/Unity comparisons                                 | An engine change is not an automatic realism gain; shaders and animation can be lost during export                            | Are patina, alpha masks, grain scale, cloth, leaf wind, water, shadows and reflections actually preserved? Compare independent same-camera runs, not competing panes.              |

## How repeated invocations go deeper

- A wooden stick initially represented by a box needs more than a better wood
  texture. New photographs can reveal taper, bends, nonuniform cross-sections,
  end splits, chipped edges, knots and shallow grain relief. Refine the mesh
  with enough small faces to express those features; inspect grazing light,
  silhouette and cracks from oblique views. Later passes can resolve finer
  structure instead of merely subdividing an unchanged rectangular prism.
- If existing reference photographs cannot resolve how an object is built,
  acquire additional close, reverse or macro views of comparable examples.
  Record the new observed details and resulting modeling decisions; do not
  treat a limited reference package as proof there is nothing left to improve.
- A first doorway correction might remove a blocking wall. A later pass should
  examine reveals, threshold wear, joinery, the furnished room beyond and the
  daylight transition; it should not add another doorway merely to show activity.
- A first water correction might remove repeated ripples. Later scrutiny should
  examine reflected geometry, coherent disturbance, shoreline contact, caustics,
  hull exclusion and appearance at different viewing distances.
- A first yard pass might add work-related props. Later passes should improve
  their construction, support, cloth weight, ground transitions and activity
  relationships, not multiply vehicles and crates.
- A first material pass might add patina. Later passes should separate natural
  variation from damage, remove repeated masks and correct grain scale rather
  than continually increasing grime.

## Boundaries

The [Douro brief](../../../../docs/scenes/douro-vineyard.md) and
[engine study](../../../../experiments/marrakech/README.md) describe particular
experiences. A miniature, geological cutaway, railway or new engine is not a
universal requirement. Characters were considered, not delivered. Transfer
the principle of believable life and deeper inspection, not a compulsory list
of Moroccan ornaments, vineyard props, water features or moving people.
