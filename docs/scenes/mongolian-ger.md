# Mongolian Ger Household

## Cultural proposition

An anonymous contemporary household on the grassland near Kharkhorin, central
Mongolia, on a clear late-summer afternoon. This is neither a surveyed home nor
a tourist camp reconstruction. The visitor learns how a portable dwelling
combines an expandable lattice, radial roof poles, a supported crown, felt
insulation, outer canvas and tension bands. Portability does not mean an empty
or temporary-feeling home: sleeping, storage, heating and hospitality share a
carefully arranged circular room.

The maintenance condition is cared-for and occupied: locally worn floorboards,
creased fabric, clean bowls, folded bedding and a repair basket. Painted wood
has restrained original borders, not invented sacred inscriptions or borrowed
Kazakh embroidery. A stove, enamel vessels and a thermos establish a living
modern setting rather than a supposedly timeless nomadic culture.

## Spatial sequence and paired representations

The south-facing door leads through a thick timber threshold into the furnished
round room. Two posts support the roof crown; the stove has an actual firebox,
flue and protective floor plate. Beds flank the room, a chest occupies the rear,
and a low table holds a partly cleared tea setting. The doorway opens onto a
modeled worn path, sparse grass, an outdoor work area and continuing steppe.
No furniture, floor skirt or transparent panel seals the opening.

The Interior and Miniature are peer experiences under one catalog destination.
Both use the same structure, furniture, materials and immediate grounds.
The miniature has a closed underside and physical textile thickness. Its actual
roof, roof poles and front enclosure lift up and aside to reveal the room; there
is no intact second roof hidden underneath. Orbit, zoom, opening, direct links
and global language/audio controls use the existing shared mechanisms.

- Interior: `?scene=mongolian-ger&inspect=1` (or `&version=interior`)
- Miniature: `?scene=mongolian-ger&version=miniature`

## View sequence

| Key           | Subject and required visible evidence                                  |
| ------------- | ---------------------------------------------------------------------- |
| `room`        | Arrival inside the low doorway: crown, stove, beds and rear storage    |
| `hearth`      | Metal stove seams, open firebox, ash tray, kettle and pipe connections |
| `framework`   | Lattice crossings, ties, timber profiles, crown and textile layers     |
| `hospitality` | Hollow bowls, thermos, low table, supported folded and draped cloth    |
| `passage`     | Looking outward through the real door into the working camp            |
| `camp`        | Reverse exterior, canvas folds, tension bands and a usable approach    |

The miniature retains these views alongside its whole-piece orbit. Framework,
doorway and camp views close the actual shell so their architectural subjects
remain visible; household views open it. The visitor can still operate the
opening control directly.

## Inspection priorities

Arrival, connected-space and closest-supported detail captures are all required.
Likely failures include a rigid plastic-looking tent, perfectly repeated poles,
flat fabric, an overbright interior, a door too high for the frame, unsupported
crown, stove/cloth intersections, a miniature roof that hides the furnishings,
and grass that looks like a lawn. Resolve these through actual construction,
subtle shaped geometry, material scale, motivated light and contact, not clutter.

Use the first inspectable build as the immutable correction baseline, followed
by three complete correction/re-inspection rounds. Inspect closed/open/reverse
miniatures and compact layouts, compare performance on identical cameras, and
exercise motion, narration, ambient sound and disposal before promotion.

## Materials and sensory behavior

Cream canvas with seams, layered wool felt, individually varied timber,
restrained ochre-red paint, dark stove steel and enamel kitchenware. The room
receives daylight through the crown and doorway, with restrained indirect fill.
Small cloth and grass movements are anchored and freeze under reduced motion.
Optional illustrative domestic handling sounds use bundled recordings and
the shared audio controller; do not identify unrelated bird recordings as
Mongolian wildlife. Six guided views, four object explanations and the whole-miniature passage have
en-US and pt-BR text and 22 bundled OpenAI recordings. No provider is called during a visit.

## Sources and interpretation boundaries

- [UNESCO: Mongol ger construction and associated customs](https://ich.unesco.org/en/RL/traditional-craftsmanship-of-the-mongol-ger-and-its-associated-customs-00872):
  portable frame, felt, communal knowledge and assembly.
- [Mongolian ger frame, June 2023](https://commons.wikimedia.org/wiki/File:20230626_2_Mongolian_yurt_inside_view.jpg)
  and its companion reverse/crown photographs: lattice, straight radial poles,
  crown seating and posts. This ornate exhibited example is construction evidence,
  not a household inventory or a reason to copy its carvings.
- [Morning inside a ger](<https://commons.wikimedia.org/wiki/File:Dans_la_gers_(yourte)_au_petit_matin_(4941398532).jpg>):
  low door, simple poles, stove, plank floor and bedding; tourist use is visible.
- [Interior and cooking equipment](https://commons.wikimedia.org/wiki/File:Dentro_del_Ger_-_panoramio.jpg):
  stove rings, pipe joint, thermos, perimeter beds and curtain depth.
- [Breakfast and reverse household views](https://commons.wikimedia.org/wiki/File:Breakfast_in_a_yurt,_with_the_sun_shining_in.jpg):
  interior daylight contrast, preparation and storage. No people or identities
  from the photograph are reproduced.
- [Exterior in western Mongolia](https://commons.wikimedia.org/wiki/File:Traditional_ger_housing_for_a_nomadic_herding_family,_Western_Mongolia.jpg):
  canvas folds, ground contact and external bands only. Its regional form is
  not treated as proof of the central-Mongolian roof profile.

Twelve downloaded photographs were initially inspected across frame, roof,
reverse interior, ordinary meals, stove, bedding and exterior scales. Exact
metadata, licenses, original URLs and hashes remain in the local research
directory `outputs/expansion/ger/references/`; four licensed runtime references
are recorded in `public/ger/references.json`. Targeted further references
are required wherever these do not resolve construction. Dimensions, household
layout and landscape are authored interpretations, not measurements.

## Implementation

The definition and translations live in `src/client/catalog/ger-catalog.js`.
`src/client/environments/ger/` builds the architecture, household and grounds
through the shared environment kit, material, terrain, wind and sound helpers.
Both representations share that builder; the miniature crops the same sampled
near-field terrain rather than substituting a separate ground surface.
`tests/ger.test.js` checks closed textile sections and provenance;
`tests/browser/ger.spec.js` checks doorway width/height, firebox depth and shell
behavior alongside the collection-wide browser and static checks.
