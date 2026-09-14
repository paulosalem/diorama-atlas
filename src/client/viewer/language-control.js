import {
  getLocale,
  getLocaleError,
  setLocale,
  subscribeLocale,
  t,
} from "../localization/locale.js";

export function createLanguageControl() {
  const control = document.createElement("div");
  control.className = "language-control";
  const label = document.createElement("label");
  label.htmlFor = "atlasLanguage";
  label.className = "sr-only";
  const select = document.createElement("select");
  select.id = "atlasLanguage";
  for (const [locale, name] of [
    ["en-US", "English (US)"],
    ["pt-BR", "Português (Brasil)"],
  ]) {
    const option = document.createElement("option");
    option.value = locale;
    option.textContent = name;
    option.lang = locale;
    select.append(option);
  }
  const error = document.createElement("p");
  error.id = "languagePreferenceError";
  error.className = "language-preference-error";
  error.setAttribute("role", "alert");
  select.setAttribute("aria-describedby", error.id);
  control.append(label, select, error);
  const render = () => {
    label.textContent = t("Language");
    select.value = getLocale();
    select.title = t("Language for the entire Atlas and narration");
    error.textContent = t(getLocaleError());
    error.hidden = !error.textContent;
  };
  select.onchange = () => setLocale(select.value);
  const unsubscribe = subscribeLocale(render);
  render();
  return {
    mount(app) {
      const actions = app.querySelector(
        ".world-navigation, .viewer-header-actions",
      );
      (actions ?? app).prepend(control);
      render();
    },
    dispose() {
      unsubscribe();
      control.remove();
    },
  };
}
