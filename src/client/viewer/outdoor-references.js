import { translateElement } from "../localization/locale.js";
import { sitePath } from "../site.js";

export function addOutdoorReferences(viewer, definition) {
  const button = document.createElement("button");
  translateElement(button, "References");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "outdoorReferences");
  viewer.querySelector(".riad-actions").prepend(button);
  const panel = document.createElement("aside");
  panel.id = "outdoorReferences";
  panel.className = "reference-panel";
  translateElement(
    panel,
    "{title} style references",
    { title: definition.title },
    "aria-label",
  );
  panel.hidden = true;
  const close = document.createElement("button");
  translateElement(close, "Close");
  close.className = "reference-close";
  translateElement(close, "Close photographic references", {}, "aria-label");
  const heading = document.createElement("h2");
  translateElement(heading, "Materials & atmosphere");
  const summary = document.createElement("p");
  translateElement(summary, definition.summary);
  const period = document.createElement("p");
  period.className = "reference-period";
  translateElement(period, definition.period);
  const content = document.createElement("div");
  const note = document.createElement("p");
  note.className = "reference-caveat";
  translateElement(
    note,
    "This is an imagined place. These real photographs inform its regional style, materials and atmosphere; they do not depict the modeled setting. Its map marker identifies a region of inspiration, not an address. Its soundscape combines licensed recordings, not audio captured at this place.",
  );
  panel.append(close, heading, summary, period, note, content);
  viewer.querySelector(".canvas-mount").append(panel);
  let loaded = false;
  const hide = () => {
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    button.focus();
  };
  close.onclick = hide;
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      hide();
    }
  });
  button.onclick = async () => {
    if (!panel.hidden) {
      hide();
      return;
    }
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    close.focus();
    if (loaded) return;
    content.replaceChildren(
      translateElement(
        document.createElement("p"),
        "Loading photographic sources…",
      ),
    );
    try {
      const response = await fetch(
        sitePath("/public/outdoors/references.json"),
      );
      if (!response.ok)
        throw new Error("Photographic sources could not be loaded.");
      const entries = await response.json();
      const entry = entries.find((item) => item.sceneId === definition.id);
      if (!entry?.references?.length)
        throw new Error(
          "No photographic sources are registered for this place.",
        );
      content.replaceChildren();
      for (const reference of entry.references) {
        const figure = document.createElement("figure");
        if (reference.image) {
          const image = document.createElement("img");
          image.src = sitePath(reference.image);
          translateElement(image, reference.note || reference.label, {}, "alt");
          image.loading = "lazy";
          image.addEventListener(
            "error",
            () => {
              const error = document.createElement("p");
              translateElement(
                error,
                "Local photograph unavailable. Open the source below.",
              );
              image.replaceWith(error);
            },
            { once: true },
          );
          figure.append(image);
        }
        const caption = document.createElement("figcaption");
        const link = document.createElement("a");
        link.href = reference.url;
        link.target = "_blank";
        link.rel = "noreferrer";
        translateElement(link, reference.label);
        const credit = document.createElement("p");
        credit.append(
          `${reference.author} · ${reference.date} · `,
          translateElement(document.createElement("span"), reference.license),
        );
        caption.append(link, credit);
        if (reference.note) {
          const description = document.createElement("p");
          translateElement(description, reference.note);
          caption.append(description);
        }
        figure.append(caption);
        content.append(figure);
      }
      if (entry.caveat) {
        const caveat = document.createElement("p");
        caveat.className = "reference-caveat";
        translateElement(caveat, entry.caveat);
        content.append(caveat);
      }
      loaded = true;
    } catch (error) {
      console.error(error);
      content.replaceChildren(
        translateElement(
          document.createElement("p"),
          "{error} Close and reopen this panel to retry.",
          { error: error.message },
        ),
      );
    }
  };
}
