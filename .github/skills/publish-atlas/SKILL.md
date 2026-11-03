---
name: publish-atlas
description: Prepare or publish a Diorama Atlas version on GitHub Pages. Use for release readiness, static export, repository presentation and deployment verification; preserve private runtime boundaries and require explicit Git publication authority.
---

# Prepare and publish the Atlas

Read [deployment](../../../docs/deployment.md), [development](../../../docs/development.md),
[asset rights](../../../docs/assets.md) and the current changelog.
Distinguish preparing source from publishing it.

1. Inspect the branch and working tree. Preserve unrelated work, unique caches
   and source evidence. Do not reset, stash, switch branches, commit, tag, push,
   change repository visibility or create a release without the applicable
   explicit authorization.
2. Align the package and lockfile version, README, changelog, documentation
   index and complete scene briefs. Describe the current experience, not old
   workstation state. Keep user-facing material concise and technical details
   in dedicated guides.
3. Review the publication boundary. Static Pages must include the bundled
   catalog and approved assets, but no server, credentials, runtime caches,
   review outputs or unverified media. Asset terms are not a project-wide
   open-source license; never choose a new license silently.
4. Run `npm run check`, relevant local browser checks and `npm run test:pages`.
   Keep the full-detail hardware-GPU preflight and test gates intact. Diagnose
   renderer or asset failures instead of increasing timeouts or lowering detail.
5. If authorized, commit the intended files, push the intended branch and
   identify the deployment run by its **exact SHA**. Confirm artifact upload
   and deployment succeed; a configured Pages URL is not a live deployment.
6. Verify the actual public origin: HTTP success, globe entry/return, indoor
   and outdoor rendering, subdirectory asset paths, both languages, real
   narration, sound controls, About/creator links and absent private paths.
   Inspect a real public screenshot. New origins have separate preferences.
7. Report the live URL and version only after verification. State uncommitted
   or unpublished work and unresolved failures plainly. Keep job logs and
   browser evidence outside source; leave no diagnostic server running unless
   it is intentionally provided as the user's preview.

Do not treat a failed CI run, a local screenshot or a README link as proof that
the public app works. Preserve explicit job bounds and retained failure evidence.
