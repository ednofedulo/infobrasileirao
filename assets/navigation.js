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

  function toggleStandingChart(button) {
    const chartId = button.getAttribute("aria-controls");
    const chart = chartId ? document.getElementById(chartId) : null;
    if (!chart) return;

    const expanded = button.getAttribute("aria-expanded") !== "true";
    const teamName = button.dataset.teamName ?? "o clube";
    button.setAttribute("aria-expanded", String(expanded));
    button.setAttribute(
      "aria-label",
      `${expanded ? "Recolher" : "Exibir"} evolução do ${teamName} na classificação`
    );
    chart.hidden = !expanded;
    if (expanded) setUpPositionCharts(chart);
  }

  const chartResultLabels = {
    win: "Vitória",
    draw: "Empate",
    loss: "Derrota"
  };
  const chartVenueLabels = { C: "Em casa", F: "Fora de casa" };

  // Progressive enhancement: without JS every point still carries a native
  // <title>, so the values stay reachable through hover and keyboard focus.
  function setUpPositionChart(chart) {
    if (chart.dataset.chartReady === "true") return;
    chart.dataset.chartReady = "true";

    const panel = chart.closest(".team-chart-panel");
    const surface = chart.querySelector("[data-chart-surface]");
    const crosshair = chart.querySelector("[data-chart-crosshair]");
    const points = [...chart.querySelectorAll(".chart-point")];
    if (!panel || !surface || !points.length) return;

    const tooltip = document.createElement("div");
    tooltip.className = "chart-tooltip";
    tooltip.setAttribute("aria-hidden", "true");
    tooltip.innerHTML =
      '<span class="chart-tooltip-round"></span>' +
      '<span class="chart-tooltip-result"><span class="chart-tooltip-swatch"></span><span></span></span>' +
      '<span class="chart-tooltip-match"></span>' +
      '<span class="chart-tooltip-standing"></span>';
    panel.append(tooltip);

    const roundLabel = tooltip.querySelector(".chart-tooltip-round");
    const swatch = tooltip.querySelector(".chart-tooltip-swatch");
    const resultLabel = tooltip.querySelector(".chart-tooltip-result span:last-child");
    const matchLabel = tooltip.querySelector(".chart-tooltip-match");
    const standingLabel = tooltip.querySelector(".chart-tooltip-standing");
    let activePoint = null;

    function hide() {
      if (!activePoint) return;
      activePoint = null;
      tooltip.dataset.visible = "false";
      crosshair.setAttribute("hidden", "");
      for (const point of points) point.removeAttribute("data-active");
    }

    function show(point) {
      if (point === activePoint) return;
      activePoint = point;

      const [round, date, result, position, pointTotal, venue, match] = (
        point.dataset.point ?? ""
      ).split("|");
      // The axis counts matches, so the round is what the reader needs spelled out.
      roundLabel.textContent = `Jogo ${points.indexOf(point) + 1} · Rodada ${round} · ${date}`;
      swatch.className = `chart-tooltip-swatch result-${result}`;
      resultLabel.textContent = chartResultLabels[result] ?? "";
      matchLabel.textContent = match ? `${chartVenueLabels[venue]} · ${match}` : "";
      matchLabel.hidden = !match;
      standingLabel.textContent = `${position}º · ${pointTotal} ${
        pointTotal === "1" ? "ponto" : "pontos"
      }`;

      for (const other of points) other.removeAttribute("data-active");
      point.setAttribute("data-active", "true");

      const cx = Number(point.getAttribute("cx"));
      crosshair.setAttribute("x1", String(cx));
      crosshair.setAttribute("x2", String(cx));
      crosshair.removeAttribute("hidden");

      // The SVG scales to its container, so map viewBox units to CSS pixels.
      const chartBox = chart.getBoundingClientRect();
      const panelBox = panel.getBoundingClientRect();
      const scale = chartBox.width / chart.viewBox.baseVal.width;
      const left = chartBox.left - panelBox.left + cx * scale;
      const top =
        chartBox.top - panelBox.top + Number(point.getAttribute("cy")) * scale;

      tooltip.dataset.visible = "true";
      const offset = tooltip.offsetWidth / 2;
      const clamped = Math.min(Math.max(left, offset + 4), panelBox.width - offset - 4);
      tooltip.style.transform = `translate(${Math.round(clamped - offset)}px, ${Math.round(
        top - tooltip.offsetHeight - 14
      )}px)`;
    }

    function nearestPoint(event) {
      const chartBox = chart.getBoundingClientRect();
      const scale = chartBox.width / chart.viewBox.baseVal.width;
      const position = (event.clientX - chartBox.left) / scale;
      let closest = points[0];
      let distance = Infinity;
      for (const point of points) {
        const delta = Math.abs(Number(point.getAttribute("cx")) - position);
        if (delta < distance) {
          distance = delta;
          closest = point;
        }
      }
      return closest;
    }

    surface.addEventListener("pointermove", (event) => show(nearestPoint(event)));
    surface.addEventListener("pointerleave", hide);
    surface.addEventListener("pointercancel", hide);
    for (const point of points) {
      point.addEventListener("focus", () => show(point));
      point.addEventListener("blur", hide);
    }
    chart.addEventListener("keydown", (event) => {
      if (event.key === "Escape") hide();
    });
  }

  function setUpPositionCharts(root) {
    for (const chart of root.querySelectorAll("[data-position-chart]")) {
      setUpPositionChart(chart);
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
      const standingToggle = event.target?.closest?.("[data-standing-toggle]");
      if (standingToggle) toggleStandingChart(standingToggle);
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
