/** Explicit, local-browser narration with ownership and visibility cleanup. */
export function createBrowserNarration({
  synthesis = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
  target = globalThis.document,
  onChange = () => {},
} = {}) {
  let utterance = null,
    state = "idle",
    disposed = false;
  const events = new AbortController();
  function update(value) {
    state = value;
    onChange(state);
  }
  function stop() {
    if (utterance) {
      utterance.onstart = utterance.onend = utterance.onerror = null;
      utterance = null;
      synthesis.cancel();
    }
    if (!disposed) update("idle");
  }
  target?.addEventListener(
    "visibilitychange",
    () => {
      if (target.hidden) stop();
    },
    { signal: events.signal },
  );
  return {
    play(text, locale) {
      if (disposed) throw new Error("Narration has been disposed.");
      if (typeof text !== "string" || !text.trim())
        throw new TypeError("Narration needs nonempty text.");
      stop();
      if (!synthesis || !Utterance) {
        update("unavailable");
        return;
      }
      if (target?.hidden) return;
      utterance = new Utterance(text);
      utterance.lang = locale;
      utterance.rate = 0.93;
      const voices = synthesis
        .getVoices()
        .filter((voice) => voice.lang === locale);
      const voice =
        voices.find((candidate) => candidate.localService) ?? voices[0];
      if (voice) utterance.voice = voice;
      utterance.onstart = () => update("speaking");
      utterance.onend = () => {
        utterance = null;
        update("idle");
      };
      utterance.onerror = (event) => {
        utterance = null;
        if (["canceled", "interrupted"].includes(event.error)) update("idle");
        else {
          console.error("Browser narration failed:", event.error);
          update("unavailable");
        }
      };
      update("preparing");
      try {
        synthesis.speak(utterance);
      } catch (error) {
        utterance.onstart = utterance.onend = utterance.onerror = null;
        utterance = null;
        console.error("Browser narration could not start:", error.name);
        update("unavailable");
      }
    },
    stop,
    get state() {
      return state;
    },
    dispose() {
      if (disposed) return;
      stop();
      disposed = true;
      events.abort();
      state = "disposed";
    },
  };
}
