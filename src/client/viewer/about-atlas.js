import {
  subscribeLocale,
  t,
  translateElement,
} from "../localization/locale.js";

import { sitePath, staticHosting } from "../site.js";

let dialog;
let opener;
let unsubscribeLocale;

function externalLink(label, href) {
  const link = document.createElement("a");
  link.textContent = label;
  link.href = sitePath(href);
  link.target = "_blank";
  link.rel = "noreferrer";
  return link;
}

async function showAbout(button) {
  opener = button;
  if (dialog) {
    dialog.showModal();
    return;
  }
  dialog = document.createElement("dialog");
  dialog.className = "about-atlas";
  dialog.setAttribute("aria-labelledby", "aboutAtlasTitle");
  const current = dialog;
  const header = document.createElement("header");
  const heading = document.createElement("h2");
  heading.id = "aboutAtlasTitle";
  translateElement(heading, "About Atlas");
  const close = document.createElement("button");
  translateElement(close, "Close");
  translateElement(close, "Close About and credits", {}, "aria-label");
  close.onclick = () => current.close();
  header.append(heading, close);
  const intro = document.createElement("p");
  intro.className = "about-intro";
  translateElement(
    intro,
    "Imagined places, real traditions. Original environments for looking closely, wandering slowly and discovering the character of everyday materials.",
  );
  const author = document.createElement("p");
  author.className = "about-author";
  author.append(
    translateElement(document.createElement("span"), "Created by"),
    " ",
    externalLink("Dr. Paulo Salem", "https://www.paulosalem.com/"),
    ".",
  );
  const disclosure = document.createElement("p");
  translateElement(
    disclosure,
    "These settings are fictional, not replicas of landmarks. Photographs guide regional styles; scanned materials and original artwork enrich the details. Generated artwork is identified below. Soundscapes combine licensed recordings and music; they are atmospheric compositions, not recordings of these imagined places.",
  );
  const narrationDisclosure = translateElement(
    document.createElement("p"),
    "Narrated introductions and viewpoints use AI-generated voices reading original documentary-style text.",
  );
  const label = document.createElement("label");
  label.htmlFor = "creditSearch";
  translateElement(label, "Sources & credits");
  const search = document.createElement("input");
  search.id = "creditSearch";
  search.type = "search";
  translateElement(
    search,
    "Filter by asset, author or license",
    {},
    "placeholder",
  );
  const content = document.createElement("div");
  content.className = "credit-list";
  content.setAttribute("aria-live", "polite");
  content.append(
    translateElement(document.createElement("p"), "Loading attribution…"),
  );
  current.append(
    header,
    intro,
    author,
    disclosure,
    narrationDisclosure,
    label,
    search,
    content,
  );
  if (staticHosting)
    narrationDisclosure.after(
      translateElement(
        document.createElement("p"),
        "This public edition includes all bundled places and prerecorded narration for guided visits, object details and Miniatures. Creating new places requires the local server.",
      ),
    );
  current.addEventListener("close", () => opener?.focus());
  current.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      current.close();
    }
  });
  document.body.append(current);
  current.showModal();
  try {
    const response = await fetch(sitePath("/public/credits.json"));
    if (!response.ok)
      throw new Error("The attribution catalogue could not be loaded.");
    const credits = await response.json();
    if (!Array.isArray(credits.entries))
      throw new Error("The attribution catalogue has an invalid format.");
    if (dialog !== current) return;
    function render() {
      const query = search.value.toLocaleLowerCase().trim();
      const entries = credits.entries.filter((entry) =>
        `${entry.title} ${t(entry.title)} ${entry.author} ${t(entry.author)} ${entry.license} ${t(entry.license)} ${entry.category} ${t(entry.category)}`
          .toLocaleLowerCase()
          .includes(query),
      );
      content.replaceChildren();
      const count = document.createElement("p");
      count.className = "credit-count";
      translateElement(
        count,
        entries.length === 1 ? "{count} source" : "{count} sources",
        {
          count: entries.length,
        },
      );
      content.append(count);
      for (const category of [
        ...new Set(entries.map((entry) => entry.category)),
      ]) {
        const section = document.createElement("section");
        const title = document.createElement("h3");
        translateElement(title, category);
        section.append(title);
        for (const entry of entries.filter(
          (item) => item.category === category,
        )) {
          const item = document.createElement("article");
          item.className = "credit-entry";
          const title = document.createElement("h4");
          title.append(
            translateElement(
              externalLink(entry.title, entry.source),
              entry.title,
            ),
          );
          const credit = document.createElement("p");
          credit.append(
            translateElement(document.createElement("span"), entry.author),
            entry.date ? ` · ${entry.date}` : "",
          );
          const license = entry.licenseUrl
            ? externalLink(entry.license, entry.licenseUrl)
            : document.createElement("span");
          translateElement(license, entry.license);
          license.className = "credit-license";
          item.append(title, credit, license);
          if (entry.image) {
            const imageLink = externalLink("View image", entry.image);
            translateElement(imageLink, "View image");
            imageLink.className = "credit-image-link";
            item.append(imageLink);
          }
          if (entry.note) {
            const note = document.createElement("p");
            note.className = "credit-note";
            translateElement(note, entry.note);
            item.append(note);
          }
          section.append(item);
        }
        content.append(section);
      }
      if (!entries.length) {
        const empty = document.createElement("p");
        translateElement(empty, "No sources match that filter.");
        content.append(empty);
      }
    }
    search.addEventListener("input", render);
    unsubscribeLocale = subscribeLocale(render);
    render();
  } catch (error) {
    console.error(error);
    content.replaceChildren(
      translateElement(
        document.createElement("p"),
        "{error} Close this box and reopen it to retry.",
        { error: error.message },
      ),
    );
    const discard = () => {
      current.remove();
      if (dialog === current) dialog = null;
    };
    if (current.open)
      current.addEventListener("close", discard, { once: true });
    else discard();
  }
}

export function addAboutButton(parent) {
  const button = document.createElement("button");
  button.className = "about-button";
  translateElement(button, "About");
  translateElement(button, "About Atlas and asset credits", {}, "aria-label");
  button.onclick = () => showAbout(button);
  parent.append(button);
  return button;
}

export function disposeAbout() {
  unsubscribeLocale?.();
  unsubscribeLocale = null;
  dialog?.remove();
  dialog = null;
  opener = null;
}
