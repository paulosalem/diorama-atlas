# Static deployment

The public Atlas is hosted at **https://paulosalem.github.io/diorama-atlas/**.
The [source repository](https://github.com/paulosalem/diorama-atlas) is maintained
separately from the static export. The Pages export includes the complete
23-scene collection, 476 prerecorded narration passages, local soundscapes,
material maps, photographs and their credits over HTTPS.

## Publish

`.github/workflows/pages.yml` runs on pushes to `master` and manual dispatches.
It installs the locked dependencies, runs source checks and the dedicated
static-browser suite, uploads `dist/`, and deploys through GitHub's Pages API.
Only the deployment job receives `pages: write` and `id-token: write`.
There is no deployment key or provider credential in the browser or workflow.

The repository's **Settings → Pages → Build and deployment** source is
**GitHub Actions**. The `github-pages` environment tracks deployments.
A failed check does not replace the last published site.

The full-detail browser jobs run on the Apple Silicon `macos-15` runner with
Chromium's Metal backend. A shared preflight records the actual WebGL renderer
and rejects software rendering in CI before loading the collection. The
standard Linux runner's software GPU stalls these scenes, even at a much lower
pixel ratio; reducing the published geometry or materials is not a solution.
Node checks and the deployment job remain on Linux. Local-server CI checks are
split into two complete, nonoverlapping shards on separate GPU runners, with one
browser worker per runner. Browser jobs stop at the first failure and have a
20-minute bound; the sharded test step stops at 18 minutes to leave time for
failure artifacts. Failed traces and Pages scene captures
are retained as workflow artifacts for seven days.

## Build and preview

```sh
npm ci
npx playwright install chromium
npm run build:pages
npm run preview:pages
# Open http://127.0.0.1:4196/diorama-atlas/

npm run test:pages
```

The collection and both Douro experiences build their authored Three.js geometry
directly in the browser. Startup and publication need no scene preparation,
generated model cache or Playwright installation. Playwright is needed only for
browser checks and captures. The historical multi-engine experiments and their
exports are not part of the published site.

The export is portable to a domain root or another project subdirectory.
The HTML shell uses relative module URLs; `src/client/site.js` resolves runtime
asset and navigation paths from its own module location. Asset manifests remain
unchanged. The static catalog contains only the bundled packages' scene
definitions, not their storage envelopes or local cache overrides.

`build:pages -- --output-dir outputs/pages/site` selects another output directory.
The builder refuses source directories, symlinks and unowned nonempty output
directories. Its allowlist publishes `src/client/`, the used public asset
groups, and the minimum Three.js distribution with its license. It excludes
server source, OpenAI dependencies, credentials, caches, review screenshots and
repository metadata. Unused models were also removed from the current
source tree; historical copies remain outside the export allowlist, with
[verified source attribution](history/asset-provenance.md).
Original application content has no new open-source license grant; third-party
assets retain their individual terms and attribution.

The preview server serves static files only and deliberately has no API routes.
Its configurable project prefix catches URLs that accidentally escape to the
domain root. The browser suite checks every scene and viewpoint, bilingual
playback, consent, disposal, globe navigation, credits, references and sound.

## Differences from the local server

All bundled guided, object-detail and Miniature narration uses the same local
OpenAI recordings in both languages. Voice quality does not depend on the
visitor's browser. Missing files produce an explicit, retryable unavailable state.
Both experiences work under the
project subdirectory without any `/lab/` or local-server dependencies.

GitHub Pages cannot run Node or paid generation endpoints. It does not create
new scenes, generate concept images, synthesize new recordings, serve local
caches, or accept user writes. Those optional capabilities remain available
through the local server. No backend failure is disguised as a working API.

Music and ambience default to enabled, with first-time playback requiring an
explicit **Resume**. Saved mute choices are preserved, and narration remains
opt-in. Locale and audio choices are saved per browser origin,
so visitors to the public site start with their own settings rather than
inheriting preferences from `localhost`.
