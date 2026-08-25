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

function initializeSimulator() {
  const root = document.querySelector("[data-result-simulator]");
  if (!root) return;

  const tableBody = root.querySelector("[data-simulator-table-body]");
  const rows = [...root.querySelectorAll("[data-standing-row]")];
  const baseStandings = readBaseStandings(rows);
  const rowsByTeam = new Map(rows.map((row) => [row.dataset.teamId, row]));
  const rounds = [...root.querySelectorAll("[data-simulator-round]")];
  const previousRoundButton = root.querySelector('[data-round-step="-1"]');
  const nextRoundButton = root.querySelector('[data-round-step="1"]');
  const activeRoundLabel = root.querySelector("[data-active-round]");
  const roundPosition = root.querySelector("[data-round-position]");
  let activeRoundIndex = Math.max(
    0,
    rounds.findIndex((round) => !round.hidden)
  );

  function showRound(index) {
    if (!rounds.length) return;
    activeRoundIndex = Math.min(rounds.length - 1, Math.max(0, index));

    rounds.forEach((round, roundIndex) => {
      round.hidden = roundIndex !== activeRoundIndex;
    });
    const activeRound = rounds[activeRoundIndex];
    activeRoundLabel.textContent = `Rodada ${activeRound.dataset.roundNumber}`;
    roundPosition.textContent = `${activeRoundIndex + 1} de ${rounds.length}`;
    previousRoundButton.disabled = activeRoundIndex === 0;
    nextRoundButton.disabled = activeRoundIndex === rounds.length - 1;
  }

  function updateStandings() {
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
      updateStandings();
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
    updateStandings();
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
