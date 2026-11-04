export function createRecordedNarration({
  audio = new Audio(),
  target = globalThis.document,
  onChange = () => {},
} = {}) {
  const events = new AbortController();
  audio.preload = "none";
  let state = "idle",
    disposed = false,
    request = 0,
    asset = null;
  function update(value) {
    state = value;
    onChange(state);
  }
  function stop() {
    request++;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    asset = null;
    if (!disposed) update("idle");
  }
  function fail(error) {
    if (state === "unavailable" || disposed) return;
    console.error("Prerecorded narration could not play.", error);
    update("unavailable");
  }
  target?.addEventListener(
    "visibilitychange",
    () => {
      if (target.hidden) stop();
    },
    { signal: events.signal },
  );
  audio.addEventListener("ended", stop, { signal: events.signal });
  audio.addEventListener(
    "error",
    () => {
      if (asset) fail(audio.error);
    },
    { signal: events.signal },
  );
  return {
    async play(recording) {
      if (disposed) throw new Error("Narration has been disposed.");
      stop();
      if (target?.hidden) return;
      const attempt = request;
      try {
        if (!recording?.file)
          throw new Error("No OpenAI recording is available for this passage.");
        asset = recording;
        audio.src = recording.file;
        update("loading");
        await audio.play();
        if (!disposed && attempt === request) update("playing");
      } catch (error) {
        if (!disposed && attempt === request) fail(error);
      }
    },
    stop,
    get state() {
      return state;
    },
    get snapshot() {
      return {
        state,
        asset: asset?.id,
        file: asset?.file,
        locale: asset?.locale,
      };
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
