# Historical model attribution

Seven unused models were removed from the current source tree during the
v1.0.0 cleanup. Their earlier Git versions remain part of the repository, so
their redistribution rights were verified before public-source publication.
They are **not included in the current application or Pages export**.

On 2026-11-02, every historical GLB was compared byte for byte with the original
in [Khronos glTF Sample Assets at commit
`8f492390ddc7a2ae221a1369ef560589cf8c70fb`](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/8f492390ddc7a2ae221a1369ef560589cf8c70fb).
All seven matched exactly. Atlas renamed the files but did not modify their
contents. The paths below refer to `public/atlas-models/` in historical commits,
including `887f00b`.

| Historical file     | Original asset and source               | Attribution                                                                                                                  | License                                                |
| ------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `camera.glb`        | [Antique Camera][camera]                | Maximillan Kamps / UX3D, 2018                                                                                                | CC0-1.0; UX3D mark restrictions below                  |
| `candle-holder.glb` | [Glass Hurricane Candle Holder][candle] | Eric Chadwick / Wayfair LLC                                                                                                  | CC BY 4.0; Khronos marks below                         |
| `lantern.glb`       | [Lantern][lantern]                      | sbtron / Microsoft, 2017; Frank Galligan, 2018, for the upstream Draco variant                                               | CC0-1.0                                                |
| `olives.glb`        | [Iridescent Dish with Olives][olives]   | Eric Chadwick / Wayfair LLC                                                                                                  | CC BY 4.0                                              |
| `plant.glb`         | [Diffuse Transmission Plant][plant]     | Eric Chadwick / Darmstadt Graphics Group GmbH, 2024, materials and animation; Rico Cilliers, 2021, original Poly Haven asset | CC BY 4.0 for the adaptation; CC0-1.0 for the original |
| `pot-of-coals.glb`  | [PotOfCoals][coals]                     | Eric Chadwick / Darmstadt Graphics Group GmbH, 2023                                                                          | CC BY 4.0; Khronos marks below                         |
| `teacup.glb`        | [Diffuse Transmission Teacup][teacup]   | Polyhaven.com and Eric Chadwick, 2023; original [Tea Set 01](https://polyhaven.com/a/tea_set_01)                             | CC0-1.0                                                |

Each pinned source directory contains its `LICENSE.md`, `metadata.json` and
original `glTF-Binary/<model-name>.glb`. License terms:
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode) and
[CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/legalcode).
Upstream metadocumentation is CC BY 4.0. Embedded copyright notices are preserved
in the historical binaries; their year labels sometimes differ from the
upstream metadata. Both original records remain available at the source.

**Trademarks are not relicensed.** The
[UX3D mark notice](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/8f492390ddc7a2ae221a1369ef560589cf8c70fb/LICENSES/LicenseRef-LegalMark-UX3D.txt)
and [Khronos mark notice](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/8f492390ddc7a2ae221a1369ef560589cf8c70fb/LICENSES/LicenseRef-LegalMark-Khronos.txt)
permit the marks in their original model context, not unrelated use. Khronos
and glTF marks belong to The Khronos Group; UX3D's mark belongs to UX3D.
No endorsement of Diorama Atlas is implied. Other embedded notices, including
the DGG logo notice in PotOfCoals, remain intact.

## Verified identity

These are SHA-256 hashes of both the historical files and their matching
upstream originals, not hashes of rendered previews.

| File                |    Bytes | SHA-256                                                            |
| ------------------- | -------: | ------------------------------------------------------------------ |
| `camera.glb`        | 17540348 | `ae89695479ad997f09ebea8060a5ad01312ad8fe7ffb92f73b4e895109feecd2` |
| `candle-holder.glb` |  2705400 | `add23791ee6f5f550b94a21232a323720c92c20d280f4f7d19cf954234f0b7b8` |
| `lantern.glb`       |  9564264 | `a79458c4b02d695187a952f23a63b8bf278e7bc3d316a3c2a314f2d6974181f1` |
| `olives.glb`        |  5742828 | `1540b4a36b790a907f4824cfe848ba481b3da3cc8070172b7b3ba178f78a7ed1` |
| `plant.glb`         |  5759100 | `1748be8847e24bdd5cb6c5ac2bfd0afe8f11efc4f85091148550555e47c7ee83` |
| `pot-of-coals.glb`  |  4696240 | `fac3323e77309413e96285e3ee86dd92ef5e797325e173aa180ba6472aba58ed` |
| `teacup.glb`        |  4795028 | `d4f567186fea262819aac6664cb9d7cef7f4600406038046771a69e10363935b` |

This closes the missing-provenance question for these historical assets without
rewriting Git history or reintroducing unused downloads. Future reuse still
requires appropriate visual inspection, runtime ownership and application
credits. This attribution grants no new license to Atlas's original source.

[camera]: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/8f492390ddc7a2ae221a1369ef560589cf8c70fb/Models/AntiqueCamera
[candle]: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/8f492390ddc7a2ae221a1369ef560589cf8c70fb/Models/GlassHurricaneCandleHolder
[lantern]: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/8f492390ddc7a2ae221a1369ef560589cf8c70fb/Models/Lantern
[olives]: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/8f492390ddc7a2ae221a1369ef560589cf8c70fb/Models/IridescentDishWithOlives
[plant]: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/8f492390ddc7a2ae221a1369ef560589cf8c70fb/Models/DiffuseTransmissionPlant
[coals]: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/8f492390ddc7a2ae221a1369ef560589cf8c70fb/Models/PotOfCoals
[teacup]: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/8f492390ddc7a2ae221a1369ef560589cf8c70fb/Models/DiffuseTransmissionTeacup
