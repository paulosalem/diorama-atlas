# Douro Vineyard

**Scene:** `douro-vineyard` · **Region:** Douro Valley, Portugal

**Status:** unfinished local preview; not included in the released collection.
[Open locally](http://127.0.0.1:4183/?scene=douro-vineyard&inspect=1&draft=1).
The catalog's explicit `draft` flag keeps this work out of ordinary navigation
and Pages. Remove it only after every quality gate below is met.

## Cultural intention

An anonymous working vineyard introduces the Douro as a landscape maintained
through generations of agricultural knowledge. Schist walls, vine training,
paths and a small quinta connect the spectacular valley to everyday labor.
This is an original regional interpretation, not a replica of an estate, a
brand of wine or a mapped UNESCO property.

## Spatial and sensory direction

Warm sunlight on a clear summer day crosses maintained, irregular stone terraces.
Healthy, predominantly green vines carry only occasional aging leaves and small dark grape
bunches. A broad working terrace connects a stone stair to a modest limewashed
farm building; its open, thick doorway leads into a furnished tool and sorting
room with a second opening. Lower terraces continue toward a river bend, with
modeled vineyards and scrub on the opposite slopes.

Resolve the schist's horizontal fracture, dry joints and coping; crooked vine
trunks, canes, support wires, tendrils, lobed veined leaves and individual berries.
Green, lightly flowering verges, gravel and occasional dry blades belong at field edges. Harvest crates,
pruning tools, a cloth, a water jug and an illustrated notebook suggest a paused
task without turning the yard into a wine advertisement.

The quinta remains cared for: restrained handling wear and weathering at the
base, not uniform decay. Daylight through actual openings distinguishes its
cool workroom from the warm terraces. Leaf movement is slight and asynchronous;
river reflections are irregular and separate from the agricultural land.
The licensed bird/workshop palette is illustrative, not a Douro field recording.

The sunny-day direction is welcoming and inhabited, not a dry, gray display:
blue sky, clear river reflections, green field margins and warm stone belong
with a modest chair, a drinking cup and flowering pots near the quinta.
Retain agricultural ground and useful paths rather than substituting a lush lawn.
The licensed Kloofendal 43d Clear PureSky supplies clear midday light; its source
is South Africa, not the Douro. The cloudier Sunflowers study was rejected after
rendered inspection and is not distributed. Other environments retain their
existing sky.

## View sequence

`arrival` → `vines` → `terraces` → `quinta`.

The arrival looks along the cultivated terraces toward the valley, with the
quinta at the edge of the view. The vine view resolves
fruit and training; the terrace view reveals dry-stone construction and the
descending route; the quinta view looks through a working threshold.

## References and boundaries

- [UNESCO: Alto Douro Wine Region](https://whc.unesco.org/en/list/1046/):
  terraces, changing cultivation techniques, schist walls and farm complexes.
- [Terraced vineyards, Rosino](https://commons.wikimedia.org/wiki/File:Terraced_vineyards_of_the_Douro.jpg):
  irregular contours, clear ground and stone-supported rows; CC BY-SA 2.0.
- [Harvest-ready Douro grapes, Rosino](https://commons.wikimedia.org/wiki/File:Douro_wine_grapes_ripe_for_the_harvest.jpg):
  vine training, leaf lobes, fruit scale and wall construction; CC BY-SA 2.0.
- [River and cultivated slopes, Yiwenli0203](https://commons.wikimedia.org/wiki/File:Terraced_vineyards_along_the_Douro_river.jpg):
  valley layering and the river's relationship to cultivation; CC0.
- [Quinta da Formigosa, Sanjorgepinho](https://commons.wikimedia.org/wiki/File:Quinta_da_Formigosa,_Chanceleiros,_Covas_do_Douro,_Sabrosa.jpg):
  limewash, roof tiles and working building proportions; CC BY-SA 4.0.

The photographs depict different seasons and actual places. Their names identify
sources, not the fictional vineyard. Do not copy the quinta's name, gate,
inscriptions or exact plan. Do not claim an identifiable grape variety, a
historical terrace age, or an authentic farm operation without evidence.

## Preserve and extend

Retain a usable route between the terrace, stairs and workroom. Agricultural
order must follow irregular terrain, not become endless identical green stripes.
Inspect all four views, the reverse view, ground contact, open containers,
daylight, full bilingual narration, reduced motion, shared audio and disposal.
Compare performance with the existing terraced landscape under matched settings.

## Completion gates

Eight English/Brazilian Portuguese narration recipes are written, but their
recordings require explicit paid-generation approval. No provider call has
been made. The vineyard must also receive final visual approval. It remains
a real-time interpretation, not a verified photographic reconstruction.
Recordings and that review are promotion gates, not optional enhancements.

Implementation: `src/client/environments/outdoors/douro-vineyard.js`,
`vineyard-vines.js`, `vineyard-landscape.js`, `vineyard-garden.js` and `vineyard-quinta.js`. The four licensed photographs and
the CC0 stony-ground scan have recorded provenance in the outdoor asset
manifests; the scan is not specific to the Douro.

The main foliage uses a higher-resolution green-leaf photograph under
CC BY-SA 4.0, with autumn leaves from the licensed Douro close-up. The green
study was photographed in Morocco and supplies botanical detail only; it does
not identify a local cultivar. Its natural pigment, veins and photographed
moisture are retained. Both leaf shapes have their own petiole anchor and
curvature; the wind deformation fixes the attachment point.

The refined landscape has a continuous folded hillside, separate contoured
parcels and modeled open woodland crowns, rather than solid tree masses and
flat planting bands. Near vines carry fissured, tapered wood, connected stems
and individually modeled berries. The quinta has fitted stone slabs, a
complete four-board table, hollow vessels, coiled ties, cut canes and a hung
field hat. A slatted chair, hollow drinking cup and small flowering pots suggest
a pause in the work. Photographic grass blades and individually attached verge
leaves keep the planting three-dimensional without closing the walking routes.
The work cloth stays above the boards and flattens beneath the jug
and shears; the shears include both cutting blades. Preserve all four original
cameras when extending these details.

Spatial instance cells cull off-screen work without removing plants. Trunks
and individual berries use distance-dependent tessellation. Beyond 130 metres,
woodland and distant vine clusters use three projections baked locally from
their actual leaf geometry and bundled imagery; the full geometry returns on
approach. These are runtime render textures, not generated landscape photographs.
Their render targets share the environment's readiness and disposal lifecycle.
Fixed-size render-target viewports keep the baked pixels identical at standard
and high display densities. The browser checks verify that identity, both LOD
transitions, complete instance counts and render-target disposal.

The recording selection can be inspected without credentials or spending:

```sh
node scripts/generate-opening-narration.mjs --scene douro-vineyard --all-views \
  --locale en-US --locale pt-BR --model gpt-4o-mini-tts --voice cedar --dry-run
```

Do not remove `--dry-run` without task-specific approval.
