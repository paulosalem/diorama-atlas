import test from "node:test";
import assert from "node:assert/strict";
import {
  createLocaleStore,
  getLocale,
  LOCALE_COOKIE,
  setLocale,
  subscribeLocale,
  t,
  translateElement,
  translateUI,
  translations,
} from "../src/client/localization/locale.js";
import { locations } from "../src/client/catalog/place-locations.js";

function cookieDocument(initial = "") {
  let cookie = initial;
  let written = "";
  return {
    documentElement: {},
    get cookie() {
      return cookie;
    },
    set cookie(value) {
      written = value;
      cookie = value.split(";")[0];
    },
    get written() {
      return written;
    },
  };
}

test("browser Portuguese defaults to Brazilian Portuguese; other languages use US English", () => {
  for (const [language, expected] of [
    ["pt-BR", "pt-BR"],
    ["pt-PT", "pt-BR"],
    ["pt", "pt-BR"],
    ["en-GB", "en-US"],
    ["fr-FR", "en-US"],
  ]) {
    const target = cookieDocument();
    const store = createLocaleStore({ target, language });
    assert.equal(store.getLocale(), expected);
    assert.equal(target.documentElement.lang, expected);
    assert.equal(
      target.written,
      "",
      "Default detection must not write a preference",
    );
  }
});

test("an explicit saved language overrides navigator and persists for one year", () => {
  const target = cookieDocument(`unrelated=yes; ${LOCALE_COOKIE}=en-US`);
  const store = createLocaleStore({ target, language: "pt-BR" });
  assert.equal(store.getLocale(), "en-US");
  assert.equal(store.setLocale("pt-BR"), true);
  assert.equal(target.documentElement.lang, "pt-BR");
  assert.equal(
    target.written,
    `${LOCALE_COOKIE}=pt-BR; Path=/; Max-Age=31536000; SameSite=Lax`,
  );
  assert.equal(
    createLocaleStore({ target, language: "en-US" }).getLocale(),
    "pt-BR",
  );
});

test("invalid or unreadable cookies expose an error and retain the browser default", () => {
  for (const target of [
    cookieDocument(`${LOCALE_COOKIE}=es-ES`),
    cookieDocument(`${LOCALE_COOKIE}=%E0%A4%A`),
    {
      get cookie() {
        throw new Error("Cookies blocked");
      },
    },
  ]) {
    const errors = [];
    const store = createLocaleStore({
      target,
      language: "pt-PT",
      reportError: (...error) => errors.push(error),
    });
    assert.equal(store.getLocale(), "pt-BR");
    assert.match(store.getLocaleError(), /could not be read/);
    assert.equal(errors.length, 1);
  }
});

test("blocked cookie writes retain the chosen language and report the failure", () => {
  for (const throws of [false, true]) {
    const errors = [];
    const target = {
      documentElement: {},
      get cookie() {
        return "";
      },
      set cookie(value) {
        if (throws) throw new Error("Cookies blocked");
      },
    };
    const store = createLocaleStore({
      target,
      reportError: (...error) => errors.push(error),
    });
    assert.equal(store.setLocale("pt-BR"), false);
    assert.equal(store.getLocale(), "pt-BR");
    assert.equal(target.documentElement.lang, "pt-BR");
    assert.match(store.getLocaleError(), /could not be saved/);
    assert.equal(errors.length, 1);
  }
});

test("invalid choices are rejected explicitly and a valid choice clears the error", () => {
  const errors = [];
  const store = createLocaleStore({
    target: cookieDocument(),
    reportError: (...error) => errors.push(error),
  });
  assert.equal(store.setLocale("pt"), false);
  assert.equal(store.getLocale(), "en-US");
  assert.match(store.getLocaleError(), /Choose English/);
  assert.equal(errors.length, 1);
  assert.equal(store.setLocale("pt-BR"), true);
  assert.equal(store.getLocaleError(), "");
});

test("locale subscribers receive updates and can be released", () => {
  const store = createLocaleStore();
  const received = [];
  const unsubscribe = store.subscribeLocale((locale) => received.push(locale));
  store.setLocale("pt-BR");
  unsubscribe();
  store.setLocale("en-US");
  assert.deepEqual(received, ["pt-BR"]);
});

test("gettext translates known first-party messages and preserves external metadata", () => {
  const original = getLocale();
  try {
    setLocale("pt-BR");
    assert.equal(t("Places"), "Lugares");
    assert.equal(t("{count} places", { count: 22 }), "22 lugares");
    assert.equal(t("{count} places"), "{count} lugares");
    assert.equal(
      t("Unknown external citation title"),
      "Unknown external citation title",
    );
    assert.equal(t(undefined), "");
    assert.equal(t("constructor"), "constructor");
    assert.equal(
      t("Value: {value}", { value: "$& <b>literal</b>" }),
      "Value: $& <b>literal</b>",
    );
    setLocale("en-US");
    assert.equal(t("Places"), "Places");
    assert.equal(t("{count} places", { count: 22 }), "22 places");
  } finally {
    setLocale(original);
  }
});

test("all registered geographic names and countries have deliberate dictionary entries", () => {
  assert.equal(locations.length, 24);
  for (const location of locations)
    for (const value of [location.name, location.country])
      assert.ok(Object.hasOwn(translations["pt-BR"], value), value);
});

test("narration controls and recovery messages have Portuguese translations", () => {
  for (const message of [
    "Place narration",
    "Pause",
    "Replay",
    "Retry",
    "Play",
    "Pause narration",
    "Play narration",
    "Narrate on entry and at views",
    "AI-generated voice",
    "Expand narration",
    "Minimize narration",
    "Preparing narration…",
    "Select Play to allow narration in this browser.",
    "Narration could not be loaded. Select Retry.",
    "Play once to enable narration for future visits and views.",
    "Drag or use arrow keys to look around; scroll or press plus and minus to zoom.",
    "{title} viewpoints",
    "Interactive diorama",
    "Return to atlas",
    "Expand view",
    "Preparing the space…",
    "Listen",
    "Stop",
    "Loading…",
    "Speech unavailable",
    "Audio unavailable",
    "Narrated introductions and viewpoints use AI-generated voices reading original documentary-style text.",
  ]) {
    assert.ok(Object.hasOwn(translations["pt-BR"], message), message);
    assert.notEqual(translations["pt-BR"][message], message);
  }
  assert.equal(translations["pt-BR"].Auto, "Auto");
});

test("DOM bindings update text and labels without replacing controls", () => {
  class Element {
    attributes = new Map();
    textContent = "";
    value = "preserved";
    children = [];
    setAttribute(key, value) {
      this.attributes.set(key, String(value));
    }
    getAttribute(key) {
      return this.attributes.get(key) ?? null;
    }
    hasAttribute(key) {
      return this.attributes.has(key);
    }
    matches() {
      return true;
    }
    querySelectorAll() {
      return this.children;
    }
  }
  const original = getLocale();
  const root = new Element();
  const child = new Element();
  root.children.push(child);
  setLocale("en-US");
  translateElement(child, "Places");
  translateElement(
    root,
    "{name}: preview {count} places",
    { name: "Lisbon", count: 2 },
    "aria-label",
  );
  const unsubscribe = subscribeLocale(() => translateUI(root));
  try {
    setLocale("pt-BR");
    assert.equal(child.textContent, "Lugares");
    assert.equal(
      root.getAttribute("aria-label"),
      "Lisboa: prévia de 2 lugares",
    );
    assert.equal(root.children[0], child);
    assert.equal(root.value, "preserved");
    setLocale("en-US");
    assert.equal(child.textContent, "Places");
    assert.equal(root.getAttribute("aria-label"), "Lisbon: preview 2 places");
  } finally {
    unsubscribe();
    setLocale(original);
  }
});
