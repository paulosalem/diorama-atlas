/** One Atlas page owns playback, including in simultaneously visible panes. */
export function createAudioFocus({ onLost, onPreferences }) {
  const channel = new BroadcastChannel("diorama-atlas-audio");
  const id = crypto.randomUUID();
  let latest = { time: 0, id: "" };
  let owned = false;
  let disposed = false;

  channel.onmessage = ({ data }) => {
    if (data?.type === "preferences") {
      onPreferences();
      return;
    }
    if (
      data?.type !== "claim" ||
      !Number.isFinite(data.time) ||
      typeof data.id !== "string" ||
      data.id === id
    )
      return;
    if (
      data.time < latest.time ||
      (data.time === latest.time && data.id <= latest.id)
    )
      return;
    latest = { time: data.time, id: data.id };
    if (owned) {
      owned = false;
      onLost();
    }
  };
  return {
    get owned() {
      return owned;
    },
    claim() {
      if (disposed) throw new Error("Audio focus has been disposed.");
      if (owned) return;
      latest = { time: Math.max(Date.now(), latest.time + 1), id };
      owned = true;
      channel.postMessage({ type: "claim", ...latest });
    },
    release() {
      owned = false;
    },
    publishPreferences() {
      channel.postMessage({ type: "preferences" });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      owned = false;
      channel.onmessage = null;
      channel.close();
    },
  };
}
