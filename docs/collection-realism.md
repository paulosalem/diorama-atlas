# Collection realism: design and implementation record

This records the interior collection's connected-space realism pass and its
original constraints. For all new work, use the current
[quality standard](diorama-standard.md), [philosophy](philosophy.md) and
[scene briefs](scenes/README.md). Historical evidence and failed findings remain
historical; this document is not a fresh certification of visual quality.

## Intent

Carry forward the approved Marrakech courtyard, including its revised doors and
windows, rather than redesigning the Atlas. The collection pass extended that
level of care to every other interior.

The moment to serve: a visitor enters any place from the globe and feels that
it is part of a larger, inhabited setting rather than a furnished display box.
Looking through an opening must reveal real spatial depth; moving closer should
reveal believable materials and evidence of ordinary use.

## Constraints

- Work only in the current repository. The former Codex workspace is reference
  material and must not be edited.
- Preserve Marrakech, its six viewpoints, and all existing place metadata.
- Preserve the other eleven interiors' four original camera positions, targets,
  and fields of view for matched before/after comparisons.
- Add a fifth viewpoint into a furnished secondary space for each other place.
- Keep sound local, optional, and silent until explicitly enabled.
- Keep motion restrained, respect reduced motion, and dispose of owned resources.
- Do not generate images or make paid provider requests for this work.

## Spatial and material direction

Use actual apertures with thick reveals, thresholds and inset joinery. Extend
them into furnished secondary rooms, offset passages, and believable exterior
settings. Wall cladding, skirting, furniture and glass must not conceal a
supposedly open doorway. Open drawers and hearth mouths also need real cavities.

Light should express the architecture: warm practical lights, softer bounce,
stronger daylight near openings, and quieter enclosed spaces. Wear and clutter
should have a reason and a physical scale, not obscure the original composition.

| Family                      | Connected space           | Signs of use and atmosphere                                          |
| --------------------------- | ------------------------- | -------------------------------------------------------------------- |
| Kyoto cafes                 | Back-bar preparation room | Coffee traces, utensils, paper, cloth, steam and a turning record    |
| Istanbul and Lisbon taverns | Service room              | Partly cleared meals, serving materials, bread and folded cloth      |
| Hanoi herb shops            | Dispensary                | Open drawers, botanical fragments, paper parcels and measuring tools |
| European bookshop           | Reading room              | Correspondence, book piles, spectacles and binding materials         |
| Oaxaca workshop             | Dye/work room             | Loose fibre, warp, shears, pigments and drying textiles              |
| Kerala kitchen              | Pantry and deeper garden  | Food preparation, steam, recessed hearths, embers and backwater      |

## Walkthrough evidence

Capture the current source and all 44 original non-riad views under
`outputs/collection-realism/before/` before changing the environments. Capture
the same views after the changes plus each fifth viewpoint under `after/`.
Use the same viewport and reduced-motion setting so comparisons are honest.

The running application remains the primary experience. The comparison gallery
is generated review output, not a new public application route. Inspect every
family and variant, probe real clear space through openings, and exercise
navigation, optional sound, reduced motion, and compact layouts before handing
the walkthrough to the user. Their visual judgement remains separate from
technical verification.

## Implemented pass

All eleven non-riad interiors now have a furnished connected space and a fifth
viewpoint. The original four camera definitions are preserved. Measured clear
depth through rear doors is 4.59 m, continued passages 3.64 m, and sampled
window views at least 5.09 m. The Kerala hearth and the pulled-out apothecary
drawers are actual cavities rather than dark surfaces on solid boxes.

The place-specific additions include a turning record, coffee traces, table
clearing and serving materials, open paper parcels, binding tools, loose fibre,
steam, and glowing fuel inside the hearth. Foliage uses batched shader animation;
cloth and the record retain their own animated geometry. Kerala has a single
physical canal, shared with its atmosphere rather than overlaid by another
water surface.

All eleven interiors expose local ambience only after explicit interaction.
Muting releases the audio context, restarting creates a fresh one, and disposal
is idempotent. Reduced motion freezes the scene's animation time.

The staged evidence is in `outputs/collection-realism/`: 44 original images,
55 current images, the comparison gallery, the original source archive, and
geometric/audio inspection results. These remain local generated artifacts.
The globe previews now show actual current renders; Marrakech's image and
environment sources remain unchanged.

This is a completed implementation pass, not a claim of photorealism or a
substitute for the user's visual judgement. The comparison is ready for that
walkthrough; experience-specific regression rubrics should follow their feedback.

## Complete miniature sections

A miniature is a complete slice of the same inhabited place, not a set of
front-facing props. Preserve its intentional architectural cutaways while giving
every retained floor, planted edge, roof and upper storey credible support.
Review closed rotations and undersides as well as open rooms and original
close views. A roof's bearing footprint and a tree's root are explicit assembly
ownership, not interchangeable with their visible bounding boxes.

The shared terrain builder closes each underside, keeps soil and bedrock
adjacent, retains vertical terrace risers and samples real side relief along the
boundary. Its UV distance follows the perimeter rather than collapsing at
diagonal corners. Fine nonperiodic mineral relief and physically scaled scans
avoid regular corrugated cut faces; landscape foundation tints retain the local
palette rather than copying the broad mottling of a repeated photograph.

Sectioning must preserve functional negative space. Opened rooms, canals,
courtyards, doorways and roof controls remain deliberate openings; they are not
defects to fill. Shore water must end at actual wet terrain, not extend through
the freshly exposed geological section.
