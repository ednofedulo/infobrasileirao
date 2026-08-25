(() => {
  const storageKey = "central-do-campeonato-theme";
  const menuStorageKey = "central-do-campeonato-menu-collapsed";
  const root = document.documentElement;

  try {
    const savedTheme = localStorage.getItem(storageKey);
    if (savedTheme === "light" || savedTheme === "dark") {
      root.dataset.theme = savedTheme;
    }
    if (localStorage.getItem(menuStorageKey) === "true") {
      root.dataset.menuCollapsed = "true";
    }
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }

  function syncControls() {
    const activeTheme = root.dataset.theme === "light" ? "light" : "dark";
    for (const button of document.querySelectorAll("[data-theme-option]")) {
      const active = button.dataset.themeOption === activeTheme;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }

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
        if (menuCollapsed) {
          control.setAttribute("tabindex", "-1");
        } else {
          control.removeAttribute("tabindex");
        }
      }
    }
  }

  function selectTheme(theme) {
    root.dataset.theme = theme;
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // Theme still applies for the current page when persistence is blocked.
    }
    syncControls();
  }

  function toggleMenu() {
    const collapsed = root.dataset.menuCollapsed !== "true";
    if (collapsed) {
      root.dataset.menuCollapsed = "true";
    } else {
      delete root.dataset.menuCollapsed;
    }
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
      const button = event.target?.closest?.("[data-theme-option]");
      if (button) {
        selectTheme(button.dataset.themeOption);
        return;
      }
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
