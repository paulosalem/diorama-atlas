import * as THREE from "three";
import { printCatalog } from "./print-catalog.js";

export function createPrintMaterials({ imageTexture, ownMaterial }) {
  const cache = new Map();
  const groups = Object.fromEntries(
    Object.entries(printCatalog).map(([kind, entries]) => [
      kind,
      new Set(entries.map((entry) => entry.id)),
    ]),
  );
  function image(path, role) {
    if (!cache.has(path)) {
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: imageTexture(path),
        roughness: 0.94,
        side: THREE.DoubleSide,
      });
      material.name = `Printed ${role}`;
      material.userData.artwork = path;
      material.userData.artworkRole = role;
      material.userData.patinaProfile = "none";
      ownMaterial(material);
      cache.set(path, material);
    }
    return cache.get(path);
  }
  function entry(kind, id, prefix) {
    if (!groups[kind].has(id)) throw new Error(`Unknown ${kind} print: ${id}`);
    return image(`/public/print-library/${prefix}-${id}.jpg`, prefix);
  }
  return {
    edition(index) {
      return printCatalog.books[
        ((index % printCatalog.books.length) + printCatalog.books.length) %
          printCatalog.books.length
      ].id;
    },
    book(id, part = "front") {
      if (
        !groups.books.has(id) ||
        !["front", "back", "spine", "page-left", "page-right"].includes(part)
      )
        throw new Error(`Unknown book image: ${id}/${part}`);
      return image(
        `/public/print-library/book-${id}-${part}.jpg`,
        `book-${part}`,
      );
    },
    label: (id) => entry("labels", id, "label"),
    drawer: (id) => entry("labels", id, "drawer"),
    poster: (id) => entry("posters", id, "poster"),
    record: (id) => entry("records", id, "record"),
    recordSpine: (id) => entry("records", id, "record-spine"),
  };
}
