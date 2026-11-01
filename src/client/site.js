const root = new URL("../../", import.meta.url);

export const siteBase = root.protocol === "file:" ? "/" : root.pathname;
export const staticHosting =
  typeof document !== "undefined" &&
  document.querySelector('meta[name="atlas-hosting"]')?.content === "static";

/** Resolve canonical local paths without changing external or data URLs. */
export function sitePath(path) {
  return path.startsWith("/") && !path.startsWith("//")
    ? `${siteBase}${path.slice(1)}`
    : path;
}
