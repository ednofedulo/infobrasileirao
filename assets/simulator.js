export function calculateSimulatedStandings(baseStandings, matches) {
  const table = new Map(
    baseStandings.map((entry, index) => [
      String(entry.team.id),
      {
        ...entry,
        basePosition: entry.position ?? index + 1,
        team: { ...entry.team }
      }
    ])
  );

  for (const match of matches) {
    const home = table.get(String(match.homeTeam.id));
    const away = table.get(String(match.awayTeam.id));
    const homeScore = Number(match.homeTeam.score);
    const awayScore = Number(match.awayTeam.score);

    if (
      !home ||
      !away ||
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      continue;
    }

    home.played += 1;
    away.played += 1;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.points += 3;
      home.wins += 1;
      away.losses += 1;
    } else if (homeScore < awayScore) {
      away.points += 3;
      away.wins += 1;
      home.losses += 1;
    } else {
      home.points += 1;
      away.points += 1;
      home.draws += 1;
      away.draws += 1;
    }
  }

  return [...table.values()]
    .map((entry) => ({
      ...entry,
      goalDifference: entry.goalsFor - entry.goalsAgainst
    }))
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.wins - left.wins ||
        right.goalDifference - left.goalDifference ||
        right.goalsFor - left.goalsFor ||
        left.basePosition - right.basePosition ||
        left.team.name.localeCompare(right.team.name, "pt-BR")
    )
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}

export function simulationStatusMessage(matchCount, hasEnteredScore) {
  if (matchCount > 0) {
    return `Classificação atualizada com ${matchCount} ${
      matchCount === 1 ? "resultado simulado" : "resultados simulados"
    }.`;
  }
  if (hasEnteredScore) {
    return "Preencha os dois placares da partida para atualizar a classificação.";
  }
  return "Classificação restaurada sem resultados simulados.";
}

function readBaseStandings(rows) {
  return rows.map((row) => ({
    team: {
      id: row.dataset.teamId,
      name: row.dataset.teamName
    },
    position: Number(row.querySelector('[data-field="position"]')?.textContent),
    points: Number(row.dataset.points),
    played: Number(row.dataset.played),
    wins: Number(row.dataset.wins),
    draws: Number(row.dataset.draws),
    losses: Number(row.dataset.losses),
    goalsFor: Number(row.dataset.goalsFor),
    goalsAgainst: Number(row.dataset.goalsAgainst),
    goalDifference: Number(row.dataset.goalDifference)
  }));
}

function readSimulatedMatches(root) {
  return [...root.querySelectorAll("[data-simulation-match]")].flatMap((match) => {
    const homeInput = match.querySelector('[data-side="home"]');
    const awayInput = match.querySelector('[data-side="away"]');
    if (!homeInput?.value.length || !awayInput?.value.length) return [];

    const homeScore = Number(homeInput.value);
    const awayScore = Number(awayInput.value);
    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      return [];
    }

    return [
      {
        homeTeam: { id: homeInput.dataset.teamId, score: homeScore },
        awayTeam: { id: awayInput.dataset.teamId, score: awayScore }
      }
    ];
  });
}

function standingZone(position) {
  if (position <= 5) return "zone-libertadores";
  if (position <= 11) return "zone-sulamericana";
  if (position >= 17) return "zone-relegation";
  return "zone-neutral";
}

function createPlayerBadge(team) {
  if (team.crest) {
    const image = document.createElement("img");
    image.className = "simulator-match-badge team-crest";
    image.src = team.crest;
    image.alt = "";
    image.width = 48;
    image.height = 48;
    image.loading = "lazy";
    image.decoding = "async";
    image.setAttribute("aria-hidden", "true");
    return image;
  }

  const badge = document.createElement("span");
  badge.className = "simulator-match-badge";
  badge.style.setProperty("--team-color", team.background);
  badge.style.setProperty("--team-foreground", team.foreground);
  badge.setAttribute("aria-hidden", "true");
  badge.textContent = team.abbreviation;
  return badge;
}

function createScoreStepper(team, side) {
  const stepper = document.createElement("div");
  stepper.className = "score-stepper";
  const label = `Gols de ${team.name}`;

  for (const [direction, symbol, title] of [
    [-1, "−", "Reduzir gols"],
    [1, "+", "Aumentar gols"]
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.scoreStep = String(direction);
    button.setAttribute(
      "aria-label",
      `${direction < 0 ? "Reduzir" : "Aumentar"} ${label.toLowerCase()}`
    );
    button.title = title;
    button.textContent = symbol;
    stepper.append(button);

    if (direction < 0) {
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = "99";
      input.step = "1";
      input.inputMode = "numeric";
      input.autocomplete = "off";
      input.setAttribute("aria-label", label);
      input.dataset.simulationScore = "";
      input.dataset.side = side;
      input.dataset.teamId = team.id;
      stepper.append(input);
    }
  }
  return stepper;
}

function createMatchTeam(team, side) {
  const container = document.createElement("div");
  container.className = `simulator-match-team ${side}`;
  const name = document.createElement("strong");
  name.title = team.name;
  name.textContent = team.name;
  container.append(createPlayerBadge(team), name, createScoreStepper(team, side));
  return container;
}

function createRound(round, teams) {
  const section = document.createElement("section");
  section.className = "simulator-round";
  section.dataset.simulatorRound = "";
  section.dataset.roundNumber = String(round.number);

  const heading = document.createElement("div");
  heading.className = "simulator-round-heading";
  const title = document.createElement("h2");
  title.textContent = `Rodada ${round.number}`;
  const dateRange = document.createElement("span");
  dateRange.textContent = round.dateRange;
  heading.append(title, dateRange);

  const matches = document.createElement("div");
  for (const match of round.matches) {
    const article = document.createElement("article");
    article.className = "simulator-match";
    article.dataset.simulationMatch = "";
    article.dataset.matchId = match.id;
    const date = document.createElement("p");
    date.className = "simulator-match-date";
    date.textContent = match.dateLabel;
    const scoreboard = document.createElement("div");
    scoreboard.className = "simulator-scoreboard";
    scoreboard.append(
      createMatchTeam(teams[match.homeTeamId], "home"),
      createMatchTeam(teams[match.awayTeamId], "away")
    );
    article.append(date, scoreboard);
    matches.append(article);
  }
  section.append(heading, matches);
  return section;
}

function initializeSimulator() {
  const root = document.querySelector("[data-result-simulator]");
  if (!root) return;

  const tableBody = root.querySelector("[data-simulator-table-body]");
  const rows = [...root.querySelectorAll("[data-standing-row]")];
  const baseStandings = readBaseStandings(rows);
  const rowsByTeam = new Map(rows.map((row) => [row.dataset.teamId, row]));
  const serializedData = root.querySelector("[data-simulator-data]");
  const simulatorData = JSON.parse(serializedData?.textContent ?? '{"rounds":[]}');
  const rounds = simulatorData.rounds;
  const renderedRounds = new Map();
  const initialRound = root.querySelector("[data-simulator-round]");
  const previousRoundButton = root.querySelector('[data-round-step="-1"]');
  const nextRoundButton = root.querySelector('[data-round-step="1"]');
  const activeRoundLabel = root.querySelector("[data-active-round]");
  const roundPosition = root.querySelector("[data-round-position]");
  const simulatorStatus = root.querySelector("[data-simulator-status]");
  let activeRoundIndex = Math.max(
    0,
    rounds.findIndex(
      (round) => String(round.number) === initialRound?.dataset.roundNumber
    )
  );
  if (initialRound) renderedRounds.set(activeRoundIndex, initialRound);

  function showRound(index) {
    if (!rounds.length) return;
    activeRoundIndex = Math.min(rounds.length - 1, Math.max(0, index));

    for (const round of renderedRounds.values()) round.hidden = true;
    let activeRound = renderedRounds.get(activeRoundIndex);
    if (!activeRound) {
      activeRound = createRound(rounds[activeRoundIndex], simulatorData.teams);
      serializedData.before(activeRound);
      renderedRounds.set(activeRoundIndex, activeRound);
    }
    activeRound.hidden = false;
    activeRoundLabel.textContent = `Rodada ${rounds[activeRoundIndex].number}`;
    roundPosition.textContent = `${activeRoundIndex + 1} de ${rounds.length}`;
    previousRoundButton.disabled = activeRoundIndex === 0;
    nextRoundButton.disabled = activeRoundIndex === rounds.length - 1;
  }

  function updateStandings({ announce = false } = {}) {
    const matches = readSimulatedMatches(root);
    const standings = calculateSimulatedStandings(baseStandings, matches);

    for (const entry of standings) {
      const row = rowsByTeam.get(String(entry.team.id));
      if (!row) continue;

      for (const zone of [
        "zone-libertadores",
        "zone-sulamericana",
        "zone-relegation",
        "zone-neutral"
      ]) {
        row.classList.remove(zone);
      }
      row.classList.add(standingZone(entry.position));

      const values = {
        position: entry.position,
        points: entry.points,
        played: entry.played,
        wins: entry.wins,
        draws: entry.draws,
        losses: entry.losses,
        goalsFor: entry.goalsFor,
        goalsAgainst: entry.goalsAgainst,
        goalDifference:
          entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference
      };
      for (const [field, value] of Object.entries(values)) {
        const cell = row.querySelector(`[data-field="${field}"]`);
        if (cell) cell.textContent = String(value);
      }
      tableBody.append(row);
    }

    if (announce && simulatorStatus) {
      const hasEnteredScore = [
        ...root.querySelectorAll("[data-simulation-score]")
      ].some((input) => input.value.length);
      simulatorStatus.textContent = simulationStatusMessage(
        matches.length,
        hasEnteredScore
      );
    }
  }

  root.addEventListener("click", (event) => {
    const roundButton = event.target.closest("[data-round-step]");
    if (roundButton) {
      showRound(activeRoundIndex + Number(roundButton.dataset.roundStep));
      return;
    }

    const stepButton = event.target.closest("[data-score-step]");
    if (stepButton) {
      const input = stepButton.closest(".score-stepper")?.querySelector("input");
      if (!input) return;
      const direction = Number(stepButton.dataset.scoreStep);
      const current = input.value.length ? Number(input.value) : null;
      const next = current === null ? (direction > 0 ? 1 : 0) : current + direction;
      input.value = String(Math.min(99, Math.max(0, next)));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
      return;
    }

    if (event.target.closest("[data-clear-simulation]")) {
      for (const input of root.querySelectorAll("[data-simulation-score]")) {
        input.value = "";
      }
      updateStandings({ announce: true });
    }
  });

  root.addEventListener("input", (event) => {
    if (!event.target.matches("[data-simulation-score]")) return;
    if (event.target.value.length) {
      const score = Math.trunc(Number(event.target.value));
      event.target.value = Number.isFinite(score)
        ? String(Math.min(99, Math.max(0, score)))
        : "";
    }
    updateStandings({ announce: true });
  });

  showRound(activeRoundIndex);
  updateStandings();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSimulator, { once: true });
  } else {
    initializeSimulator();
  }
}
