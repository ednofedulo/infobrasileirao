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
    const modalOpen = compactMenuQuery.matches && !menuCollapsed;
    const content = document.querySelector(".app-content");
    if (content) content.inert = modalOpen;
    const masthead = document.querySelector(".mobile-masthead");
    if (masthead) masthead.inert = modalOpen;
    const scrim = document.querySelector("[data-menu-scrim]");
    if (scrim) scrim.hidden = !modalOpen;
    root.dataset.menuModal = String(modalOpen);
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
      navigation.setAttribute("role", modalOpen ? "dialog" : "navigation");
      if (modalOpen) navigation.setAttribute("aria-modal", "true");
      else navigation.removeAttribute("aria-modal");
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

  function revealActiveViewTab() {
    for (const navigation of document.querySelectorAll(".view-tabs, .metric-tabs")) {
      const active = navigation.querySelector('[aria-current="page"]');
      if (active) revealInside(navigation, active);
    }
  }

  function revealInside(scroller, item) {
    const maximum = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const viewport = scroller.clientWidth;
    const start = item.getBoundingClientRect
      ? item.getBoundingClientRect().left -
        scroller.getBoundingClientRect().left +
        scroller.scrollLeft
      : item.offsetLeft;
    const end = start + item.offsetWidth;
    const inset = Math.min(4, Math.max(0, (viewport - item.offsetWidth) / 2));
    if (start < scroller.scrollLeft) {
      scroller.scrollTo({ left: Math.max(0, Math.min(maximum, start - inset)) });
    } else if (end > scroller.scrollLeft + viewport) {
      scroller.scrollTo({
        left: Math.max(0, Math.min(maximum, end - viewport + inset))
      });
    }
  }

  const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");

  function setUpScrollableTabs() {
    for (const scroller of document.querySelectorAll("[data-tabs-scroller]")) {
      const navigation = scroller.querySelector(".view-tabs, .metric-tabs");
      const previous = scroller.querySelector('[data-tabs-scroll="previous"]');
      const next = scroller.querySelector('[data-tabs-scroll="next"]');
      if (!navigation || !previous || !next) continue;

      // Rails are reserved only while content genuinely overflows. Toggling is
      // measured from the unstyled navigation, so showing the rails never
      // creates the overflow they are meant to reveal (no measurement loop).
      function syncIndicators() {
        // Measure intrinsic links against the full wrapper, not the viewport
        // already reduced by the rails. Otherwise overflow becomes permanent.
        const links = [...navigation.querySelectorAll("a")];
        const intrinsic = links.reduce((sum, link) => sum + link.offsetWidth, 0);
        const overflowing = links.length
          ? intrinsic > scroller.clientWidth + 2
          : navigation.scrollWidth > navigation.clientWidth + 2;
        scroller.classList.toggle("has-overflow", overflowing);
        const maximum = Math.max(0, navigation.scrollWidth - navigation.clientWidth);
        const left = Math.max(0, Math.min(maximum, navigation.scrollLeft));
        const atStart = left <= 2;
        const atEnd = left >= maximum - 2;
        previous.hidden = !overflowing;
        next.hidden = !overflowing;
        previous.disabled = !overflowing || atStart;
        next.disabled = !overflowing || atEnd;
      }

      function move(direction) {
        const behavior = reducedMotionQuery.matches ? "auto" : "smooth";
        navigation.scrollBy({
          left: direction * Math.max(140, navigation.clientWidth * 0.7),
          behavior
        });
      }

      previous.addEventListener("click", () => move(-1));
      next.addEventListener("click", () => move(1));
      navigation.addEventListener("scroll", syncIndicators, { passive: true });
      for (const link of navigation.querySelectorAll("a")) {
        link.addEventListener("focus", () => revealInside(navigation, link));
      }
      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(revealActive).observe(navigation);
        new ResizeObserver(revealActive).observe(scroller);
      }
      syncIndicators();
      function revealActive() {
        syncIndicators();
        const active = navigation.querySelector('[aria-current="page"]');
        if (active) revealInside(navigation, active);
        syncIndicators();
      }
      document.fonts?.ready.then(revealActive);
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
    if (chart.sourceRow) chart.sourceRow.hidden = !expanded;
    if (chart.fixedPanel) chart.fixedPanel.hidden = !expanded;
    if (expanded) setUpPositionCharts(chart.fixedPanel ?? chart);
    chart.refreshLayout?.();
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

    // Retain the original geometry so resizing never compounds rounding errors.
    // Adapt the plotting area to the container while keeping labels readable.
    if (typeof ResizeObserver !== "undefined") {
      const geometry = [
        ...chart.querySelectorAll("[x], [cx], [x1], [x2], polyline")
      ].map((element) => ({
        element,
        attributes: ["x", "cx", "x1", "x2", "width", "points"]
          .filter((name) => element.hasAttribute(name))
          .map((name) => [name, element.getAttribute(name)])
      }));
      new ResizeObserver(() => {
        const width = Math.max(240, Math.min(960, chart.clientWidth));
        const left = 34;
        const right = width - 52;
        const scale = (right - left) / (960 - 46 - 76);
        const x = (value) => left + (Number(value) - 46) * scale;
        chart.setAttribute("viewBox", `0 0 ${width} 328`);
        chart.classList.toggle("chart-compact", width < 540);
        for (const { element, attributes } of geometry) {
          for (const [name, value] of attributes) {
            const mapped =
              name === "points"
                ? value
                    .trim()
                    .split(/\s+/)
                    .map((point) => {
                      const [px, py] = point.split(",");
                      return `${x(px)},${py}`;
                    })
                    .join(" ")
                : name === "width"
                  ? Number(value) * scale
                  : x(value);
            element.setAttribute(name, String(mapped));
          }
        }
      }).observe(chart);
    }

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
    surface.addEventListener("pointerdown", (event) => show(nearestPoint(event)));
    surface.addEventListener("pointerleave", hide);
    surface.addEventListener("pointercancel", hide);
    for (const [index, point] of points.entries()) {
      point.setAttribute("tabindex", index === 0 ? "0" : "-1");
      point.addEventListener("focus", () => show(point));
      point.addEventListener("blur", hide);
    }
    chart.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hide();
        event.stopPropagation();
      }
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const current = Math.max(0, points.indexOf(document.activeElement));
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? points.length - 1
            : Math.max(
                0,
                Math.min(
                  points.length - 1,
                  current + (event.key === "ArrowRight" ? 1 : -1)
                )
              );
      for (const point of points) point.setAttribute("tabindex", "-1");
      points[next].setAttribute("tabindex", "0");
      points[next].focus();
    });
  }

  function setUpPositionCharts(root) {
    for (const chart of root.querySelectorAll("[data-position-chart]")) {
      setUpPositionChart(chart);
    }
  }

  function setUpStandingsScroll() {
    // The shadow on the sticky identity edge only communicates real overlap.
    // scrollLeft is clamped because Safari can report values beyond the limits
    // while the data viewport is elastically overscrolled.
    for (const wrap of document.querySelectorAll(
      ".standings-wrap, .simulator-table-panel"
    )) {
      const simulator = wrap.classList.contains("simulator-table-panel");
      if (simulator) wrap.classList.add("standings-wrap");
      const scroller = wrap.querySelector(
        simulator ? ".simulator-table" : ".standings-scroll"
      );
      if (!scroller) continue;
      let table = scroller.querySelector("table");
      if (simulator) {
        table = document.createElement("div");
        table.className = "simulator-table-content";
        table.append(...scroller.childNodes);
        scroller.append(table);
        scroller.classList.add("standings-scroll");
      }
      if (!table) continue;
      // The visible identity and expanded charts are siblings of the native
      // scroller, not sticky descendants. Native elastic scrolling can only
      // move the statistics. The original table retains its row headers.
      const rail = document.createElement("div");
      rail.className = "standings-identity";
      rail.setAttribute("role", "group");
      rail.setAttribute("aria-label", "Clubes e evolução na classificação");
      const rows = [
        ...table.querySelectorAll(
          simulator
            ? ".simulator-table-head, .simulator-standing-row"
            : ".standings-static-head, .standing-static-row"
        )
      ];
      const identities = rows.map((row) => {
        const position = row.children[0];
        const team = row.children[1];
        const identity = document.createElement("div");
        identity.className = `identity-row ${row.className}`;
        const positionCopy = position.cloneNode(true);
        const teamCopy = document.createElement("div");
        teamCopy.className = simulator ? "team-cell simulator-club" : "team-cell";
        const button = team.querySelector("button");
        if (button) {
          const accessibleName = button.dataset.teamName;
          teamCopy.append(button);
          team.textContent = accessibleName;
        } else {
          teamCopy.innerHTML = team.innerHTML;
          teamCopy.setAttribute("aria-hidden", "true");
        }
        // Clone into a neutral div: td/th cannot live outside their table.
        const positionVisual = document.createElement("div");
        positionVisual.className = "position-cell";
        positionVisual.innerHTML = positionCopy.innerHTML;
        positionVisual.setAttribute("aria-hidden", "true");
        identity.append(positionVisual, teamCopy);
        rail.append(identity);
        position.classList.add("identity-source");
        team.classList.add("identity-source");
        return { row, identity, position, team, positionVisual, teamCopy };
      });
      wrap.append(rail);
      const expansions = [...table.querySelectorAll(".standing-chart-row")].map(
        (row) => {
          const panel = document.createElement("div");
          panel.className = "standing-chart-overlay";
          panel.hidden = row.hidden;
          panel.id = `${row.id}-panel`;
          panel.setAttribute("role", "region");
          const control = rail.querySelector(`[aria-controls="${row.id}"]`);
          control?.setAttribute("aria-controls", panel.id);
          panel.setAttribute(
            "aria-label",
            `Evolução do ${control?.dataset.teamName ?? "clube"}`
          );
          panel.append(row.querySelector(".standing-chart-shell"));
          wrap.append(panel);
          row.fixedPanel = panel;
          panel.sourceRow = row;
          return { row, panel };
        }
      );
      const dividers = document.createElement("div");
      dividers.className = "standings-dividers";
      dividers.setAttribute("aria-hidden", "true");
      wrap.append(dividers);
      wrap.classList.add("standings-enhanced");
      let pending = false;
      const layout = () => {
        pending = false;
        // All sizing uses the unscrolled row geometry. Horizontal scroll does
        // not require this work, and never writes an identity transform.
        const first = identities[0];
        const identityWidth =
          first.position.getBoundingClientRect().width +
          first.team.getBoundingClientRect().width;
        wrap.style.setProperty("--identity-width", `${identityWidth}px`);
        rail.style.setProperty(
          "--sb-pos",
          `${first.position.getBoundingClientRect().width}px`
        );
        for (const { row, panel } of expansions) {
          row.children[0].style.height = row.hidden
            ? "0px"
            : `${panel.getBoundingClientRect().height}px`;
        }
        const top = wrap.getBoundingClientRect().top + wrap.clientTop;
        const segments = [];
        for (const {
          row,
          identity,
          position,
          team,
          positionVisual,
          teamCopy
        } of identities) {
          if (simulator) {
            identity.className = `identity-row ${row.className}`;
            positionVisual.textContent = position.textContent;
            teamCopy.innerHTML = team.innerHTML;
          }
          const box = row.getBoundingClientRect();
          const y = box.top - top;
          identity.style.top = `${y}px`;
          identity.style.height = `${box.height}px`;
          const last = segments.at(-1);
          if (last && Math.abs(last.bottom - y) < 2) last.bottom = y + box.height;
          else segments.push({ top: y, bottom: y + box.height });
        }
        for (const { row, panel } of expansions) {
          if (!row.hidden)
            panel.style.top = `${row.getBoundingClientRect().top - top}px`;
        }
        if (simulator) {
          // Source rows reorder after a simulation; merge by rendered order.
          segments.sort((a, b) => a.top - b.top);
          const last = segments.at(-1);
          if (last)
            segments.splice(0, segments.length, {
              top: segments[0].top,
              bottom: last.bottom
            });
        }
        dividers.replaceChildren(
          ...segments.map((segment) => {
            const edge = document.createElement("span");
            edge.style.top = `${segment.top}px`;
            edge.style.height = `${segment.bottom - segment.top}px`;
            return edge;
          })
        );
      };
      const schedule = () => {
        if (!pending) {
          pending = true;
          requestAnimationFrame(layout);
        }
      };
      for (const { row, panel } of expansions) {
        row.refreshLayout = schedule;
        panel.refreshLayout = schedule;
      }
      const sync = () => {
        const maximum = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
        const left = Math.min(Math.max(scroller.scrollLeft, 0), maximum);
        wrap.classList.toggle("scrolled-x", maximum > 2 && left > 2);
      };
      scroller.addEventListener("scroll", sync, { passive: true });
      if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(() => {
          sync();
          schedule();
        });
        observer.observe(wrap);
        observer.observe(scroller);
        observer.observe(table);
        for (const { panel } of expansions) observer.observe(panel);
      }
      document.fonts?.ready.then(schedule);
      wrap
        .closest("[data-result-simulator]")
        ?.addEventListener("simulationupdated", schedule);
      layout();
      sync();
    }
  }

  function initialize() {
    syncControls();
    revealActiveViewTab();
    setUpScrollableTabs();
    setUpStandingsScroll();
    compactMenuQuery.addEventListener?.("change", () => {
      restoreMenuForViewport();
      syncControls();
    });
    document.addEventListener("click", (event) => {
      for (const picker of document.querySelectorAll(".round-picker[open]")) {
        if (!picker.contains(event.target)) picker.open = false;
      }
      if (event.target?.closest?.("[data-menu-toggle]")) toggleMenu();
      if (event.target?.closest?.("[data-menu-scrim]")) toggleMenu();
      const standingToggle = event.target?.closest?.("[data-standing-toggle]");
      if (standingToggle) toggleStandingChart(standingToggle);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        const picker = document.querySelector(".round-picker[open]");
        if (picker) {
          picker.open = false;
          picker.querySelector("summary")?.focus();
          return;
        }
      }
      if (
        event.key === "Tab" &&
        compactMenuQuery.matches &&
        root.dataset.menuCollapsed !== "true"
      ) {
        const controls = [
          ...document.querySelectorAll(
            "[data-menu-toggle], [data-primary-navigation] a"
          )
        ];
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
      // Escape only acts on the menu while the menu is actually open, so it
      // never steals focus from a closed menu while a chart or popover is used.
      if (event.key !== "Escape" || !compactMenuQuery.matches) return;
      if (root.dataset.menuCollapsed === "true") return;
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
