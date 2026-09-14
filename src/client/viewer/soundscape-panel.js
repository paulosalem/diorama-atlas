import { loadAudioLibrary } from "../environments/shared/audio-library.js";
import { translateError } from "../localization/errors.js";
import {
  subscribeLocale,
  t,
  translateElement,
  translateUI,
} from "../localization/locale.js";

export function createSoundscapePanel(audio) {
  const button = document.createElement("button");
  button.id = "soundscapeButton";
  button.className = "soundscape-button";
  translateElement(button, "Soundscape");
  button.setAttribute("aria-haspopup", "dialog");
  const dialog = document.createElement("dialog");
  dialog.className = "soundscape-dialog";
  dialog.id = "soundscapeDialog";
  dialog.setAttribute("aria-labelledby", "soundscapeTitle");
  dialog.innerHTML = `
    <header class="soundscape-heading">
      <div><p class="soundscape-eyebrow">Diorama Atlas</p><h2 id="soundscapeTitle">A sense of place</h2></div>
      <button id="closeSoundscape" aria-label="Close soundscape">Close</button>
    </header>
    <p class="soundscape-intro">Listen a little closer. Quiet sounds of everyday life, with room for music.</p>
    <section class="soundscape-channel" aria-labelledby="ambienceTitle">
      <div class="soundscape-channel-heading"><h3 id="ambienceTitle">Place ambience</h3><button id="ambientSound" aria-pressed="false">Enable ambience</button></div>
      <p id="ambienceDescription"></p>
      <label class="soundscape-volume"><span data-i18n="Volume">Volume</span> <input id="ambienceVolume" aria-label="Ambience volume" type="range" min="0" max="100" value="55"><output for="ambienceVolume">55%</output></label>
      <p id="ambienceStatus" class="soundscape-status" role="status"></p>
    </section>
    <section class="soundscape-channel" aria-labelledby="musicTitle">
      <div class="soundscape-channel-heading"><h3 id="musicTitle">Music</h3><button id="musicSound" aria-pressed="false">Enable music</button></div>
      <label class="soundscape-mode"><span data-i18n="Selection">Selection</span> <select id="musicMode"><option value="place">Follow the place</option><option value="theme">Atlas theme everywhere</option></select></label>
      <p id="musicDescription"></p>
      <label class="soundscape-volume"><span data-i18n="Volume">Volume</span> <input id="musicVolume" aria-label="Music volume" type="range" min="0" max="100" value="32"><output for="musicVolume">32%</output></label>
      <p id="musicStatus" class="soundscape-status" role="status"></p>
    </section>
    <section class="soundscape-channel soundscape-narration">
      <label for="narrationEnabled"><input id="narrationEnabled" type="checkbox" aria-describedby="narrationPreferenceDescription"><span data-i18n="Narrate introductions and views">Narrate introductions and views</span></label>
      <p id="narrationPreferenceDescription">Hear an introduction when you enter a place and a short description when you change viewpoints. Off until you choose it.</p>
    </section>
    <div class="soundscape-footer"><span>Choices saved on this browser. Only one Atlas tab plays at a time.</span><button id="muteSoundscape">Mute all</button></div>
    <p id="audioPreferenceError" class="soundscape-status is-error" role="alert"></p>
    <details class="soundscape-credits"><summary>About the sound &amp; credits</summary>
      <p>Recorded sounds are composed into illustrative spaces, not field recordings of these exact places. The music is a contemporary interpretation, not a claim of historical authenticity.</p>
      <p>Follow the place selects local music where available and the shared Atlas theme elsewhere. Narration gently lowers both channels. Sound choices are remembered in a cookie for one year. Your browser may ask you to resume playback after reopening.</p>
      <div id="audioCredits" aria-live="polite"></div>
    </details>`;
  document.body.append(dialog);
  const find = (id) => dialog.querySelector(`#${id}`);
  for (const element of dialog.querySelectorAll(
    "h2, h3, .soundscape-intro, #closeSoundscape, #musicMode option, .soundscape-footer span, #muteSoundscape, .soundscape-credits > summary, .soundscape-credits > p, #narrationPreferenceDescription",
  ))
    translateElement(element, element.textContent);
  for (const element of dialog.querySelectorAll("[aria-label]"))
    translateElement(
      element,
      element.getAttribute("aria-label"),
      {},
      "aria-label",
    );
  let assets = [];
  let disposed = false;
  let loadingCredits = false;
  let creditsError = null;

  function channel(kind, status) {
    const control = find(kind === "ambience" ? "ambientSound" : "musicSound");
    const state = status?.state ?? "idle";
    control.disabled = kind === "ambience" && !status;
    control.textContent = t(
      state === "loading"
        ? "Cancel loading"
        : state === "armed"
          ? "Disable ambience"
          : state === "playing"
            ? `Mute ${kind}`
            : state === "paused"
              ? `Resume ${kind}`
              : `Enable ${kind}`,
    );
    control.setAttribute(
      "aria-pressed",
      String(state === "playing" || state === "armed"),
    );
    const message = find(`${kind}Status`);
    message.textContent = t(
      state === "error"
        ? status.error
        : state === "loading"
          ? "Loading local audio..."
          : state === "paused"
            ? status.notice || "Paused. Resume when you are ready."
            : state === "armed"
              ? status.notice
              : "",
    );
    message.classList.toggle("is-error", state === "error");
  }

  function render() {
    if (disposed) return;
    translateUI(dialog);
    translateUI(button);
    const state = audio.snapshot;
    find("audioPreferenceError").textContent = t(state.preferenceError);
    channel("ambience", state.ambience);
    channel("music", state.music);
    find("ambienceDescription").textContent = t(
      state.ambienceLabel ?? "Step inside a place to hear its surroundings.",
    );
    const track = assets.find((asset) => asset.id === state.musicAsset);
    find("musicDescription").textContent = track
      ? `${track.title} - ${track.creator}`
      : t("A shared, unhurried theme, or music chosen for the place.");
    for (const kind of ["ambience", "music"]) {
      const slider = find(`${kind}Volume`);
      slider.value = Math.round(state[`${kind}Volume`] * 100);
      slider.nextElementSibling.value = `${slider.value}%`;
    }
    find("musicMode").value = state.mode;
    find("narrationEnabled").checked = state.narrationEnabled;
    const playing =
      state.narrating ||
      [state.ambience, state.music].some((s) => s?.state === "playing");
    button.classList.toggle("is-playing", playing);
    button.setAttribute(
      "aria-label",
      t(playing ? "Soundscape, audio on" : "Soundscape, audio off"),
    );
    if (creditsError)
      find("audioCredits").textContent = t(
        "{error} Reopen this panel to retry.",
        { error: translateError(creditsError) },
      );
  }

  async function credits() {
    if (loadingCredits) return;
    loadingCredits = true;
    creditsError = null;
    const container = find("audioCredits");
    container.replaceChildren(
      translateElement(document.createElement("p"), "Loading credits..."),
    );
    try {
      assets = await loadAudioLibrary();
      if (disposed) return;
      container.replaceChildren();
      for (const asset of [...assets].sort(
        (a, b) => Number(b.kind === "music") - Number(a.kind === "music"),
      )) {
        const entry = document.createElement("p");
        const title = document.createElement("a");
        title.href = asset.sourceUrl;
        title.target = "_blank";
        title.rel = "noreferrer";
        translateElement(title, asset.title);
        const license = document.createElement("a");
        license.href = asset.licenseUrl;
        license.target = "_blank";
        license.rel = "noreferrer";
        translateElement(license, asset.license);
        entry.append(title, ` - ${asset.creator}. `, license, ".");
        if (asset.edits) {
          const edits = document.createElement("small");
          edits.append(
            translateElement(
              document.createElement("span"),
              asset.kind === "music"
                ? "Adapted for Atlas: normalized; some tracks are shortened with fades. "
                : "Edited for playback: filtering, fades and level adjustment; some recordings are excerpted. ",
            ),
          );
          if (asset.licenseEvidence) {
            const notes = document.createElement("a");
            notes.href = asset.licenseEvidence;
            notes.target = "_blank";
            notes.rel = "noreferrer";
            translateElement(notes, "Source & processing notes");
            edits.append(notes);
          }
          entry.append(edits);
        }
        container.append(entry);
      }
      render();
    } catch (error) {
      console.error("Could not load audio credits.", error);
      creditsError = error;
      if (!disposed) render();
    } finally {
      loadingCredits = false;
    }
  }

  button.onclick = () => {
    dialog.showModal();
    button.setAttribute("aria-expanded", "true");
    render();
    if (!assets.length) void credits();
  };
  find("closeSoundscape").onclick = () => dialog.close();
  dialog.addEventListener("close", () => {
    button.setAttribute("aria-expanded", "false");
    button.focus();
  });
  dialog.addEventListener("keydown", (event) => event.stopPropagation());
  find("ambientSound").onclick = audio.toggleAmbience;
  find("musicSound").onclick = audio.toggleMusic;
  find("muteSoundscape").onclick = audio.mute;
  find("musicMode").onchange = (event) => audio.setMode(event.target.value);
  find("narrationEnabled").onchange = (event) =>
    audio.setNarrationEnabled(event.target.checked);
  for (const kind of ["ambience", "music"])
    find(`${kind}Volume`).oninput = (event) =>
      audio.setVolume(kind, Number(event.target.value) / 100);
  const unsubscribe = audio.subscribe(render);
  const unsubscribeLocale = subscribeLocale(render);
  render();
  return {
    mount(app) {
      const actions = app.querySelector(".riad-actions");
      if (actions) actions.prepend(button);
      else app.querySelector(".world")?.append(button);
      render();
    },
    dispose() {
      disposed = true;
      unsubscribe();
      unsubscribeLocale();
      dialog.remove();
      button.remove();
    },
  };
}
