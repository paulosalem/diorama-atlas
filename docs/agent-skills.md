# Agent skills

The repository includes six project-local skills under `.github/skills/`.
They are human-readable procedures, not background automations or permissions
to spend money, publish work or launch other agents.

| Skill                                                                         | Use it for                                                                                                 |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [create-diorama](../.github/skills/create-diorama/SKILL.md)                   | A new setting, variant, environment family or generated-scene pathway                                      |
| [improve-diorama-realism](../.github/skills/improve-diorama-realism/SKILL.md) | Repeated evidence-led realism improvements to one scene, selected scenes, a family or the whole collection |
| [review-dioramas](../.github/skills/review-dioramas/SKILL.md)                 | Matched visual review, realism refinements and regression evidence                                         |
| [curate-assets](../.github/skills/curate-assets/SKILL.md)                     | Licensed references, scans, props, printed imagery and recorded audio                                      |
| [narrate-dioramas](../.github/skills/narrate-dioramas/SKILL.md)               | Bilingual scripts, prerecorded passages and transcript/playback integration                                |
| [publish-atlas](../.github/skills/publish-atlas/SKILL.md)                     | Version preparation, static export and verified Pages publication                                          |

Agents supporting repository Agent Skills can discover their `SKILL.md`
descriptions. Otherwise, explicitly ask the agent to read the linked file.
No separate MCP server, external registry installation or copied user-level
configuration is required.

The creation skill incorporates the [full quality contract](diorama-standard.md)
and [conversation-derived design decisions](history/design-decisions.md).
Its concise procedure does not replace those mandatory references. Scene briefs
supply local cultural and compositional intent; shared standards supply the
common quality floor.

Invoke `/improve-diorama-realism` with scene IDs, names, a family or `all dioramas`.
For example, `/improve-diorama-realism riad, textile` or
`/improve-diorama-realism douro-vineyard miniature; focus on ground and life`.
These are agent instructions, not a new executable command. Hosts without slash
skill discovery can read the linked `SKILL.md` directly.

Each invocation preserves a fresh baseline, looks for remaining artificiality,
implements demonstrable improvements and performs complete correction/review
rounds. Previous approval is a floor, not a stopping condition; doubling down
means better physical and perceptual fidelity, not more clutter or damage.
Evidence and remaining limitations carry forward without overwriting old runs.
The creation skill applies this same discipline from the first inspectable build.
Use `review-dioramas` when only an inspection, rather than changes, is wanted.

To add a recurring procedure, first check for an existing skill or maintenance
script. Keep executable mechanisms in reusable scripts, task-specific choices
in arguments/manifests, and the skill focused on decisions, sequence, safeguards
and observable acceptance criteria. Give every skill a matching directory/name
and a specific trigger description; avoid copying the entire architecture into it.
