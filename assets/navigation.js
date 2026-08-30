(() => {
  const menuStorageKey = "info-brasileirao-menu-collapsed";
  const root = document.documentElement;
  const compactMenuQuery = matchMedia("(max-width: 900px)");

  function restoreMenuForViewport() {
    if (compactMenuQuery.matches) {
      root.dataset.menuCollapsed = "true";
    } else {
      delete root.dataset.menuCollapsed;
    }
  }

  restoreMenuForViewport();

  function syncControls() {
    const menuCollapsed =
      compactMenuQuery.matches && root.dataset.menuCollapsed === "true";
    for (const button of document.querySelectorAll("[data-menu-toggle]")) {
      button.setAttribute("aria-expanded", String(!menuCollapsed));
      button.setAttribute(
        "aria-label",
        menuCollapsed ? "Expandir menu" : "Recolher menu"
      );
      button.setAttribute("title", menuCollapsed ? "Expandir menu" : "Recolher menu");
    }
    for (const navigation of document.querySelectorAll("[data-primary-navigation]")) {
      navigation.setAttribute("aria-hidden", String(menuCollapsed));
      navigation.inert = menuCollapsed;
      for (const control of navigation.querySelectorAll("a, button")) {
        if (menuCollapsed) control.setAttribute("tabindex", "-1");
        else control.removeAttribute("tabindex");
      }
    }
  }

  function focusMenuLink() {
    const navigation = document.querySelector("[data-primary-navigation]");
    const destination =
      navigation?.querySelector('a[aria-current="page"]') ??
      navigation?.querySelector("a");
    destination?.focus();
  }

  function focusMenuButton() {
    document.querySelector("[data-menu-toggle]")?.focus();
  }

  function toggleMenu() {
    const collapsed = root.dataset.menuCollapsed !== "true";
    if (collapsed) root.dataset.menuCollapsed = "true";
    else delete root.dataset.menuCollapsed;

    try {
      localStorage.setItem(menuStorageKey, String(collapsed));
    } catch {
      // Menu still changes for the current page when persistence is blocked.
    }
    syncControls();
    if (compactMenuQuery.matches) {
      if (collapsed) focusMenuButton();
      else focusMenuLink();
    }
  }

  function initialize() {
    syncControls();
    compactMenuQuery.addEventListener?.("change", () => {
      restoreMenuForViewport();
      syncControls();
    });
    document.addEventListener("click", (event) => {
      if (event.target?.closest?.("[data-menu-toggle]")) toggleMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !compactMenuQuery.matches) return;
      root.dataset.menuCollapsed = "true";
      syncControls();
      focusMenuButton();
    });
    document.addEventListener(
      "error",
      (event) => {
        const target = event.target;
        if (
          target instanceof HTMLImageElement &&
          target.classList.contains("player-photo")
        ) {
          const fallback = document.createElement("span");
          fallback.className = `${target.className} player-photo-fallback`;
          fallback.setAttribute("aria-hidden", "true");
          fallback.textContent = target.parentElement?.dataset.initials ?? "";
          target.replaceWith(fallback);
        }
      },
      true
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
