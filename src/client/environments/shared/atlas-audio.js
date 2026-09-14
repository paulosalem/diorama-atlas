import { createRecordedSoundscape } from "./recorded-soundscape.js";
import { musicProfile } from "./soundscape-profiles.js";
import { createAudioFocus } from "./audio-focus.js";
import {
  DEFAULT_AUDIO_PREFERENCES,
  readAudioPreferences,
  saveAudioPreferences,
} from "./audio-preferences.js";

export function createAtlasAudio() {
  let ambience = null;
  let music = null;
  let title = "Around the world";
  let preferences = { ...DEFAULT_AUDIO_PREFERENCES };
  let preferenceError = "";
  let pauseReason = "";
  let ducked = false;
  let disposed = false;
  let attached = false;
  let unsubscribeAmbience;
  let unsubscribeMusic;
  const events = new AbortController();
  const listeners = new Set();
  const notify = () => {
    if (!disposed) listeners.forEach((listener) => listener());
  };

  function readPreferences() {
    try {
      preferences = readAudioPreferences();
      preferenceError = "";
    } catch (error) {
      console.error("Could not read saved sound choices.", error);
      preferenceError =
        "Saved sound choices could not be read. Choose your settings again.";
    }
  }
  readPreferences();
  const focus = createAudioFocus({
    onLost() {
      pauseAll("Playing in another Atlas tab. Resume here to move playback.");
    },
    onPreferences() {
      readPreferences();
      applySettings();
      notify();
    },
  });

  function savePreferences() {
    try {
      saveAudioPreferences(preferences);
      preferenceError = "";
      focus.publishPreferences();
    } catch (error) {
      console.error("Could not save sound choices.", error);
      preferenceError = error.message;
    }
  }

  function play(soundscape, automatic) {
    soundscape.start({ automatic }).catch((error) => {
      console.error("Could not play the soundscape.", error);
    });
  }

  function disposeMusic() {
    unsubscribeMusic?.();
    unsubscribeMusic = null;
    music?.dispose();
    music = null;
  }

  function syncMusic() {
    const profile = musicProfile(ambience?.profile, preferences.mode);
    if (music?.profile.layers[0].asset === profile.layers[0].asset) return;
    disposeMusic();
    music = createRecordedSoundscape(profile);
    unsubscribeMusic = music.subscribe(notify);
  }

  function applySettings() {
    if (!attached) return;
    syncMusic();
    ambience?.setVolume(preferences.ambienceVolume);
    music.setVolume(preferences.musicVolume);
    ambience?.setDucked(ducked);
    music.setDucked(ducked);
    if (!preferences.ambienceEnabled) ambience?.stop();
    if (!preferences.musicEnabled) music.stop();
  }

  function resume(automatic, channel) {
    if (!attached || disposed || document.hidden) return;
    applySettings();
    const playAmbience =
      preferences.ambienceEnabled &&
      ambience &&
      (!channel || channel === "ambience");
    const playMusic =
      preferences.musicEnabled && (!channel || channel === "music");
    if (!preferences.ambienceEnabled && !preferences.musicEnabled) return;
    focus.claim();
    pauseReason = "";
    if (playAmbience) play(ambience, automatic);
    if (playMusic) play(music, automatic);
  }

  function pauseAll(message = "Paused. Your sound choices are saved.") {
    pauseReason = message;
    focus.release();
    ambience?.pause(message);
    music?.pause(message);
    notify();
  }

  function leaveEnvironment() {
    unsubscribeAmbience?.();
    unsubscribeAmbience = null;
    ambience?.stop();
    ambience = null;
    // The common theme may continue, but a place's music cannot outlive its room.
    if (music?.profile.layers[0].position) disposeMusic();
    attached = false;
  }

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) pauseAll();
    },
    { signal: events.signal },
  );

  function status(soundscape, enabled) {
    if (!soundscape) return undefined;
    const value = soundscape.status;
    if (!enabled && value.state === "paused")
      return { ...value, state: "idle", notice: "" };
    if (enabled && value.state === "idle") {
      return {
        ...value,
        state: "paused",
        notice:
          pauseReason || "Your choice is saved. Resume when you are ready.",
      };
    }
    return value;
  }

  return {
    leaveEnvironment,
    attachEnvironment(runtime, name = "Around the world") {
      if (disposed) return;
      leaveEnvironment();
      ambience = runtime?.soundscape ?? null;
      title = name;
      attached = true;
      if (ambience) unsubscribeAmbience = ambience.subscribe(notify);
      applySettings();
      if (focus.owned || document.hasFocus()) resume(true);
      notify();
    },
    toggleAmbience() {
      if (!ambience) {
        preferences.ambienceEnabled = !preferences.ambienceEnabled;
        savePreferences();
        notify();
        return;
      }
      preferences.ambienceEnabled = !["playing", "loading"].includes(
        ambience.status.state,
      );
      savePreferences();
      if (preferences.ambienceEnabled) resume(false, "ambience");
      else ambience.stop();
      notify();
    },
    toggleMusic() {
      if (!attached) return;
      syncMusic();
      preferences.musicEnabled = !["playing", "loading"].includes(
        music.status.state,
      );
      savePreferences();
      if (preferences.musicEnabled) resume(false, "music");
      else music.stop();
      notify();
    },
    setMode(value) {
      if (!["place", "theme"].includes(value))
        throw new RangeError(`Unknown music setting: ${value}`);
      preferences.mode = value;
      savePreferences();
      applySettings();
      if (focus.owned) resume(false, "music");
      notify();
    },
    setVolume(channel, value) {
      if (!["ambience", "music"].includes(channel))
        throw new RangeError(`Unknown audio channel: ${channel}`);
      if (!Number.isFinite(value) || value < 0 || value > 1)
        throw new RangeError("Volume must be between zero and one.");
      preferences[`${channel}Volume`] = value;
      savePreferences();
      applySettings();
      notify();
    },
    setDucked(value) {
      ducked = value;
      ambience?.setDucked(value);
      music?.setDucked(value);
    },
    beginNarration() {
      focus.claim();
      ducked = true;
      ambience?.setDucked(true);
      music?.setDucked(true);
    },
    update(camera) {
      ambience?.update(camera);
      music?.update(camera);
    },
    mute() {
      preferences.ambienceEnabled = preferences.musicEnabled = false;
      savePreferences();
      focus.release();
      pauseReason = "";
      ambience?.stop();
      music?.stop();
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get snapshot() {
      return {
        ...preferences,
        title,
        preferenceError,
        ambience: status(ambience, preferences.ambienceEnabled) ?? {
          state: preferences.ambienceEnabled ? "armed" : "idle",
          notice: preferences.ambienceEnabled
            ? "Saved. Ambience starts when you enter a place."
            : "",
        },
        ambienceLabel: ambience?.profile.label,
        music: status(music, preferences.musicEnabled),
        musicAsset: music?.profile.layers[0].asset,
      };
    },
    get inspection() {
      return {
        ambience: ambience?.inspection,
        music: music?.inspection,
        ownsPlayback: focus.owned,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      events.abort();
      leaveEnvironment();
      disposeMusic();
      focus.dispose();
      listeners.clear();
    },
  };
}
