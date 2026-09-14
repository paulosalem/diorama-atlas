import { uiPtBR } from "./ui-pt-BR.js";
import { contentPtBR } from "./content-pt-BR.js";

export const LOCALE_COOKIE = "atlas-language";
export const SUPPORTED_LOCALES = Object.freeze(["en-US", "pt-BR"]);
export const translations = Object.freeze({
  "en-US": Object.freeze({}),
  "pt-BR": Object.freeze({ ...contentPtBR, ...uiPtBR }),
});

export function createLocaleStore({
  target,
  language = "en-US",
  reportError = console.error,
} = {}) {
  let locale = /^pt(?:-|$)/i.test(language) ? "pt-BR" : "en-US";
  let preferenceError = "";
  const listeners = new Set();
  function fail(message, error) {
    preferenceError = message;
    reportError(message, error);
  }
  try {
    const encoded = target?.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
      ?.slice(LOCALE_COOKIE.length + 1);
    if (encoded !== undefined) {
      const saved = decodeURIComponent(encoded);
      if (!SUPPORTED_LOCALES.includes(saved))
        throw new RangeError("Unsupported saved language.");
      locale = saved;
    }
  } catch (error) {
    fail(
      "The saved language could not be read. Choose your language again.",
      error,
    );
  }
  const applyLanguage = () => {
    if (target?.documentElement) target.documentElement.lang = locale;
  };
  applyLanguage();
  return {
    getLocale: () => locale,
    getLocaleError: () => preferenceError,
    setLocale(value) {
      if (!SUPPORTED_LOCALES.includes(value)) {
        fail("Choose English (US) or Português (Brasil).", value);
        listeners.forEach((listener) => listener(locale));
        return false;
      }
      locale = value;
      preferenceError = "";
      applyLanguage();
      try {
        if (target) {
          const cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}`;
          target.cookie = `${cookie}; Path=/; Max-Age=31536000; SameSite=Lax`;
          if (!target.cookie.split(";").some((part) => part.trim() === cookie))
            throw new Error("The browser did not retain the language cookie.");
        }
      } catch (error) {
        fail(
          "Language changed for this visit, but could not be saved. Check your browser's cookie settings.",
          error,
        );
      }
      listeners.forEach((listener) => listener(locale));
      return !preferenceError;
    },
    subscribeLocale(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const store = createLocaleStore({
  target: typeof document === "undefined" ? undefined : document,
  language: typeof navigator === "undefined" ? "en-US" : navigator.language,
});
export const { getLocale, setLocale, subscribeLocale, getLocaleError } = store;

export function t(source, variables = {}) {
  if (source == null) return "";
  const dictionary = translations[getLocale()];
  const message = Object.hasOwn(dictionary, source)
    ? dictionary[source]
    : source;
  return String(message).replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(variables, name) ? String(variables[name]) : match,
  );
}

function updateElement(element) {
  for (const attribute of [
    "textContent",
    "aria-label",
    "placeholder",
    "title",
    "alt",
    "data-name",
  ]) {
    const key =
      attribute === "textContent" ? "data-i18n" : `data-i18n-${attribute}`;
    if (!element.hasAttribute(key)) continue;
    const variables = JSON.parse(element.getAttribute(`${key}-vars`) ?? "{}");
    const translated = t(
      element.getAttribute(key),
      Object.fromEntries(
        Object.entries(variables).map(([name, value]) => [
          name,
          typeof value === "string" ? t(value) : value,
        ]),
      ),
    );
    if (attribute === "textContent") element.textContent = translated;
    else element.setAttribute(attribute, translated);
  }
}

/** Bind first-party text without replacing its controls or retaining DOM nodes. */
export function translateElement(
  element,
  source,
  variables = {},
  attribute = "textContent",
) {
  const key =
    attribute === "textContent" ? "data-i18n" : `data-i18n-${attribute}`;
  element.setAttribute(key, source ?? "");
  element.setAttribute(`${key}-vars`, JSON.stringify(variables));
  updateElement(element);
  return element;
}

export function translateUI(root) {
  const selector = [
    "[data-i18n]",
    "[data-i18n-aria-label]",
    "[data-i18n-placeholder]",
    "[data-i18n-title]",
    "[data-i18n-alt]",
    "[data-i18n-data-name]",
  ].join(",");
  if (root.matches?.(selector)) updateElement(root);
  root.querySelectorAll(selector).forEach(updateElement);
}
