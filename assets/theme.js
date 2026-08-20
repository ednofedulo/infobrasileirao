(() => {
  const storageKey = "central-do-campeonato-theme";
  const root = document.documentElement;

  try {
    const savedTheme = localStorage.getItem(storageKey);
    if (savedTheme === "light" || savedTheme === "dark") {
      root.dataset.theme = savedTheme;
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

  function initialize() {
    syncControls();
    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.("[data-theme-option]");
      if (button) selectTheme(button.dataset.themeOption);
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
