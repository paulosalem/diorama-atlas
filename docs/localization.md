# Global language

The Atlas offers **English (US)** and **Português (Brasil)** in one persistent
language selector on the globe and inside every environment. The choice applies
to navigation, scene descriptions, references, credits explanations, sound
settings and narration. Original citation titles, author names, filenames and
artifact metadata remain unchanged.

The default is Brazilian Portuguese when the browser language is Portuguese;
otherwise it is US English. An explicit choice is saved in the `atlas-language`
cookie for one year, across every route. Invalid or inaccessible cookies fall
back to the browser default and display a visible error by the selector. If a
cookie write fails, the selected language still applies for the current visit,
with an explicit message that it could not be saved.

## Implementation

`src/client/localization/locale.js` exports:

- `getLocale()` → `en-US` or `pt-BR`.
- `setLocale(locale)` → whether the preference was saved successfully. An invalid
  choice returns `false`, preserves the active locale and exposes an error.
- `subscribeLocale(listener)` → an unsubscribe function; the listener receives
  the current locale when a choice or preference error changes.
- `getLocaleError()` → the English source message for the preference error, or an
  empty string.
- `t(englishSource, variables)` → a translated message with named `{variables}`.
  Unknown external or user-supplied content is retained, not machine-translated.
- `translations` → immutable dictionaries for translation coverage checks.
- `createLocaleStore({ target, language, reportError })` → an isolated store for
  tests; normal application consumers use the singleton functions above.

English source messages are the message identifiers. Brazilian Portuguese text
is split between `ui-pt-BR.js` and `content-pt-BR.js`; UI entries take precedence
when a source message occurs in both. `t` interpolates values literally rather
than interpreting them as markup. It does not translate variable values.

For DOM-only surfaces, `translateElement(element, source, variables, attribute)`
stores translation bindings on the element and updates it immediately.
`translateUI(root)` refreshes those bindings in place. These bindings translate
string variable values as first-party source messages. Credit and reference
headings are translated only when explicitly present in the dictionary; true
external titles and actual author names must remain absent. Only first-party
provenance descriptions, such as the generated-narration author line, translate.
Readable license categories such as “Public domain” can be translated; original
license symbols remain unchanged. Binding a parent element's text replaces its
children; bind a dedicated text child when controls or links share the parent.

The main shell owns the single language control and DOM refresh subscription.
Changing language updates `document.documentElement.lang` without navigation,
reloading, scene reconstruction, camera movement or audio-context replacement.
Scene definitions retain their original English values: environment selection
and geometry must never depend on translated titles. The sound panel subscribes
to both audio state and locale changes; the About dialog retains its search
query while refreshing translated categories. Global subscriptions and dialogs
are released on page hide.

Narration language follows this same global preference, not an independent
sound setting. The Soundscape option **Narrate introductions and views** uses
`audio.snapshot.narrationEnabled` and `audio.setNarrationEnabled(boolean)`.
It is off until explicitly enabled. The audio controller owns persistence,
playback focus, volume adjustment during narration and navigation continuity.

## Verification

Run the focused preference, interpolation, dictionary and DOM-binding checks:

```sh
node --test tests/localization.test.js
```

Browser checks should explicitly use `en-US` for the existing English baseline,
then verify Portuguese on the globe and in a scene, persistence after reload,
unchanged camera orientation on language changes, continuous shared music,
reference and credits text, keyboard access, compact layouts and visible
cookie-failure feedback.
