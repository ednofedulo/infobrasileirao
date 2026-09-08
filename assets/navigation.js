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
      // The visible identity is a sibling of the native
      // scroller, not a sticky descendant. Native elastic scrolling can only
      // move the statistics. The original table retains its row headers.
      const rail = document.createElement("div");
      rail.className = "standings-identity";
      rail.setAttribute("role", "group");
      rail.setAttribute("aria-label", "Clubes");
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
        const teamLink = team.querySelector(".standing-team-link");
        if (teamLink) {
          const accessibleName = teamLink.getAttribute("aria-label") ?? "Clube";
          teamCopy.append(teamLink);
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
