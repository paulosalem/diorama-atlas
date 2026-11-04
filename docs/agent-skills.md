# Agent skills

The repository includes five project-local skills under `.github/skills/`.
They are human-readable procedures, not background automations or permissions
to spend money, publish work or launch other agents.

| Skill                                                           | Use it for                                                                  |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [create-diorama](../.github/skills/create-diorama/SKILL.md)     | A new setting, variant, environment family or generated-scene pathway       |
| [review-dioramas](../.github/skills/review-dioramas/SKILL.md)   | Matched visual review, realism refinements and regression evidence          |
| [curate-assets](../.github/skills/curate-assets/SKILL.md)       | Licensed references, scans, props, printed imagery and recorded audio       |
| [narrate-dioramas](../.github/skills/narrate-dioramas/SKILL.md) | Bilingual scripts, prerecorded passages and transcript/playback integration |
| [publish-atlas](../.github/skills/publish-atlas/SKILL.md)       | Version preparation, static export and verified Pages publication           |

Agents supporting repository Agent Skills can discover their `SKILL.md`
descriptions. Otherwise, explicitly ask the agent to read the linked file.
No separate MCP server, external registry installation or copied user-level
configuration is required.

The creation skill incorporates the [full quality contract](diorama-standard.md)
and [conversation-derived design decisions](history/design-decisions.md).
Its concise procedure does not replace those mandatory references. Scene briefs
supply local cultural and compositional intent; shared standards supply the
common quality floor.

Every creation must deliver **the landscape and/or interior plus its miniature**.
The creation and review skills explicitly require both representations to be
integrated, inspected and shown in the handoff. A preview image or map pin is
not a substitute for the miniature.
Neither is the small globe-marker model: the miniature is a full interactive
peer view, with orbit/zoom, its own link and a clear switch to the environment.

To add a recurring procedure, first check for an existing skill or maintenance
script. Keep executable mechanisms in reusable scripts, task-specific choices
in arguments/manifests, and the skill focused on decisions, sequence, safeguards
and observable acceptance criteria. Give every skill a matching directory/name
and a specific trigger description; avoid copying the entire architecture into it.
