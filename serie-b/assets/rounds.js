export function calculateMatchLayout(heights, columnCount, gap) {
  const safeColumnCount = Math.max(1, Math.floor(columnCount));
  const safeGap = Math.max(0, gap);
  const columnHeights = Array.from({ length: safeColumnCount }, () => 0);
  const positions = heights.map((height, index) => {
    const column = index % safeColumnCount;
    const top = columnHeights[column];
    columnHeights[column] += Math.max(0, height) + safeGap;
    return { column, top };
  });
  const occupiedHeight = Math.max(0, ...columnHeights);

  return {
    positions,
    height: Math.max(0, occupiedHeight - (heights.length ? safeGap : 0))
  };
}

function renderedColumnCount(grid) {
  const template = getComputedStyle(grid).gridTemplateColumns.trim();
  return Math.max(1, template ? template.split(/\s+/).length : 1);
}

function initializeMatchGrid(grid) {
  const cards = [...grid.children].filter((element) =>
    element.classList.contains("match-card")
  );
  if (!cards.length) return;

  let animationFrame = 0;
  let lastGridWidth = 0;

  function arrange() {
    animationFrame = 0;
    const computedStyle = getComputedStyle(grid);
    const columnCount = renderedColumnCount(grid);
    const parsedGap = Number.parseFloat(computedStyle.columnGap);
    const gap = Number.isFinite(parsedGap) ? parsedGap : 14;
    const cardWidth =
      (grid.clientWidth - gap * Math.max(0, columnCount - 1)) / columnCount;

    for (const card of cards) card.style.width = `${cardWidth}px`;
    grid.classList.add("matches-grid-independent");

    const layout = calculateMatchLayout(
      cards.map((card) => card.offsetHeight),
      columnCount,
      gap
    );

    layout.positions.forEach(({ column, top }, index) => {
      cards[index].style.insetInlineStart = `${column * (cardWidth + gap)}px`;
      cards[index].style.top = `${top}px`;
    });
    grid.style.height = `${layout.height}px`;
  }

  function scheduleArrange() {
    if (animationFrame) return;
    animationFrame = requestAnimationFrame(arrange);
  }

  arrange();

  const gridObserver = new ResizeObserver(([entry]) => {
    const width = entry.contentRect.width;
    if (Math.abs(width - lastGridWidth) < 0.5) return;
    lastGridWidth = width;
    scheduleArrange();
  });
  gridObserver.observe(grid);

  const cardObserver = new ResizeObserver(scheduleArrange);
  for (const card of cards) cardObserver.observe(card);
  grid.addEventListener("toggle", scheduleArrange, true);
}

function initialize() {
  for (const grid of document.querySelectorAll(".matches-grid")) {
    initializeMatchGrid(grid);
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
}
