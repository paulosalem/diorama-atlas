export function linkGalleryToApp(html, appUrl) {
  const base = new URL(appUrl);
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password
  )
    throw new Error(
      "Gallery links require an HTTP app URL without credentials.",
    );
  return html.replace(
    /(href|src)=(["'])(\/(?:\?[^"']*|public\/[^"']*)?)\2/g,
    (_, attribute, quote, pathname) => {
      const url = new URL(pathname.replaceAll("&amp;", "&"), base);
      return `${attribute}=${quote}${url.href.replaceAll("&", "&amp;")}${quote}`;
    },
  );
}
