import { sceneVersionUrl, sceneVersions } from "../catalog/scene-versions.js";
import { subscribeLocale, t } from "../localization/locale.js";

export function mountSceneVersions(viewer, definition, selected) {
  const versions = sceneVersions(definition);
  if (!versions.length) return () => {};
  const panel = document.createElement("div");
  panel.className = "scene-experience";
  const navigation = document.createElement("nav");
  navigation.className = "scene-versions";
  const label = document.createElement("span");
  label.className = "scene-versions-label";
  const hint = document.createElement("p");
  hint.className = "scene-experience-hint";
  const links = versions.map((version) => {
    const link = document.createElement("a");
    link.href = sceneVersionUrl(location.href, version.id).href;
    link.dataset.version = version.id;
    if (version.id === selected.id) link.setAttribute("aria-current", "true");
    navigation.append(link);
    return link;
  });
  navigation.prepend(label);
  panel.append(navigation, hint);
  viewer.querySelector(".viewer-header").after(panel);
  function render() {
    navigation.setAttribute("aria-label", t("Explore as"));
    label.textContent = t("Explore as");
    hint.textContent = t(selected.description);
    links.forEach((link, index) => {
      link.textContent = t(versions[index].label);
      link.title = t(versions[index].description);
    });
  }
  render();
  const unsubscribe = subscribeLocale(render);
  return () => {
    unsubscribe();
    panel.remove();
  };
}
