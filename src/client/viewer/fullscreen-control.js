import { subscribeLocale, t, translateUI } from "../localization/locale.js";

export function createFullscreenSession({
  target = globalThis.document,
  onChange = () => {},
} = {}) {
  const events = new AbortController();
  let pending = false;
  let disposed = false;
  const notify = () => {
    if (!disposed) onChange();
  };
  const snapshot = () => ({
    supported: Boolean(
      target.fullscreenEnabled &&
      typeof target.documentElement.requestFullscreen === "function",
    ),
    active: Boolean(target.fullscreenElement),
    pending,
  });
  target.addEventListener("fullscreenchange", notify, {
    signal: events.signal,
  });
  return {
    get snapshot() {
      return snapshot();
    },
    async toggle() {
      if (disposed) throw new Error("Fullscreen controls have been disposed.");
      if (pending) return;
      const state = snapshot();
      if (!state.active && !state.supported)
        throw new Error("Fullscreen is not available in this browser.");
      pending = true;
      notify();
      try {
        if (state.active) await target.exitFullscreen();
        else
          await target.documentElement.requestFullscreen({
            navigationUI: "hide",
          });
      } finally {
        pending = false;
        notify();
      }
    },
    dispose() {
      disposed = true;
      events.abort();
    },
  };
}

export function createFullscreenControl() {
  const events = new AbortController();
  const button = document.createElement("button");
  button.id = "fullscreenButton";
  button.className = "fullscreen-button";
  button.type = "button";
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path class="fullscreen-enter" d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>
    <path class="fullscreen-leave" d="M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5"/>
  </svg><span></span>`;
  let disposed = false;
  let dialog;
  let message = "";
  const session = createFullscreenSession({ onChange: render });

  function render() {
    if (disposed) return;
    const { active, pending } = session.snapshot;
    const label = t(active ? "Exit full screen" : "Full screen");
    button.querySelector("span").textContent = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(active));
    button.title = label;
    button.disabled = pending;
    if (dialog) {
      translateUI(dialog);
      dialog.querySelector("#fullscreenMessage").textContent = t(message);
    }
  }

  function showHelp(reason) {
    if (disposed) return;
    const standalone =
      matchMedia("(display-mode: standalone)").matches ||
      navigator.standalone === true;
    message =
      reason === "failed"
        ? "Full screen could not be changed. Try the button again, or use your browser's fullscreen controls."
        : standalone
          ? "Atlas is already open as an app. This browser cannot hide the remaining system controls."
          : "Full screen is not available in this browser. Open Atlas as a Home Screen app instead.";
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "fullscreenHelp";
      dialog.className = "fullscreen-help";
      dialog.setAttribute("aria-labelledby", "fullscreenHelpTitle");
      dialog.innerHTML = `
        <header>
          <h2 id="fullscreenHelpTitle" data-i18n="Use the whole screen"></h2>
          <button type="button" id="closeFullscreenHelp" data-i18n="Close"></button>
        </header>
        <p id="fullscreenMessage" role="status"></p>
        <section class="fullscreen-install">
        <h3 data-i18n="iPad and iPhone"></h3>
        <p data-i18n="In Safari, open Share, choose Add to Home Screen, and enable Open as Web App if offered."></p>
        <h3 data-i18n="Android and desktop"></h3>
        <p data-i18n="Open your browser's menu and choose Install app or Add to Home screen, if available."></p>
        <p data-i18n="Launch Atlas from its new icon to browse without the address bar. Internet access is still required; this does not download the collection for offline use."></p>
        </section>`;
      document.body.append(dialog);
      dialog
        .querySelector("#closeFullscreenHelp")
        .addEventListener("click", () => dialog.close(), {
          signal: events.signal,
        });
      dialog.addEventListener("close", () => button.focus(), {
        signal: events.signal,
      });
      dialog.addEventListener("keydown", (event) => event.stopPropagation(), {
        signal: events.signal,
      });
    }
    dialog.querySelector(".fullscreen-install").hidden = standalone;
    render();
    if (!dialog.open) dialog.showModal();
  }

  button.addEventListener(
    "click",
    async () => {
      if (!session.snapshot.supported && !session.snapshot.active) {
        showHelp("unavailable");
        return;
      }
      try {
        await session.toggle();
      } catch (error) {
        console.error("Could not change fullscreen mode.", error);
        showHelp("failed");
      }
    },
    { signal: events.signal },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        session.snapshot.active &&
        !document.querySelector("dialog[open]")
      )
        // Leave the native fullscreen exit intact without navigating away.
        event.stopPropagation();
    },
    { capture: true, signal: events.signal },
  );
  const unsubscribeLocale = subscribeLocale(render);
  render();
  return {
    mount(app) {
      const actions = app.querySelector(
        ".world-navigation, .viewer-header-actions",
      );
      (actions ?? app).append(button);
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      events.abort();
      session.dispose();
      unsubscribeLocale();
      dialog?.remove();
      button.remove();
    },
  };
}
