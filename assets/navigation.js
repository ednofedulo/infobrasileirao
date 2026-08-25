(() => {
  const menuStorageKey = "central-do-campeonato-menu-collapsed";
  const root = document.documentElement;

  try {
    const savedMenuState = localStorage.getItem(menuStorageKey);
    if (savedMenuState === "false") delete root.dataset.menuCollapsed;
    else root.dataset.menuCollapsed = "true";
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }

  function syncControls() {
    const menuCollapsed = root.dataset.menuCollapsed === "true";
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
  }

  function initialize() {
    syncControls();
    document.addEventListener("click", (event) => {
      if (event.target?.closest?.("[data-menu-toggle]")) toggleMenu();
    });
    document.addEventListener(
      "error",
      (event) => {
        const target = event.target;
        if (
          target instanceof HTMLImageElement &&
          target.classList.contains("player-photo")
        ) {
          target.remove();
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
