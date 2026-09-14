export const AUDIO_COOKIE = "atlas-audio-preferences";
export const DEFAULT_AUDIO_PREFERENCES = Object.freeze({
  version: 1,
  ambienceEnabled: false,
  musicEnabled: false,
  ambienceVolume: 0.55,
  musicVolume: 0.32,
  mode: "place",
});

export function validateAudioPreferences(value) {
  if (
    !value ||
    value.version !== 1 ||
    typeof value.ambienceEnabled !== "boolean" ||
    typeof value.musicEnabled !== "boolean" ||
    !["place", "theme"].includes(value.mode) ||
    ![value.ambienceVolume, value.musicVolume].every(
      (volume) => Number.isFinite(volume) && volume >= 0 && volume <= 1,
    )
  )
    throw new Error(
      "The saved sound choices are invalid. Choose your settings again.",
    );
  return Object.fromEntries(
    Object.keys(DEFAULT_AUDIO_PREFERENCES).map((key) => [key, value[key]]),
  );
}

export function readAudioPreferences(cookie = document.cookie) {
  const encoded = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUDIO_COOKIE}=`))
    ?.slice(AUDIO_COOKIE.length + 1);
  if (encoded === undefined) return { ...DEFAULT_AUDIO_PREFERENCES };
  return validateAudioPreferences(JSON.parse(decodeURIComponent(encoded)));
}

export function saveAudioPreferences(preferences, target = document) {
  const value = encodeURIComponent(
    JSON.stringify(validateAudioPreferences(preferences)),
  );
  target.cookie = `${AUDIO_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
  if (
    !target.cookie
      .split(";")
      .some((part) => part.trim() === `${AUDIO_COOKIE}=${value}`)
  )
    throw new Error(
      "Sound choices could not be saved. Check your browser's cookie settings.",
    );
}
