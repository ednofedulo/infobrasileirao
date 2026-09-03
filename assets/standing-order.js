function teamId(entry) {
  return String(entry.team?.id ?? "");
}

function hasPlayedScore(match) {
  return (
    (!match.status || match.status === "played") &&
    Number.isFinite(match.homeTeam?.score) &&
    Number.isFinite(match.awayTeam?.score)
  );
}

function headToHeadComparison(left, right, matches) {
  const leftId = teamId(left);
  const rightId = teamId(right);
  let leftPoints = 0;
  let rightPoints = 0;
  let leftGoalDifference = 0;
  let matchCount = 0;

  for (const match of matches) {
    if (!hasPlayedScore(match)) continue;

    const homeId = String(match.homeTeam.id);
    const awayId = String(match.awayTeam.id);
    const isDirectMatch =
      (homeId === leftId && awayId === rightId) ||
      (homeId === rightId && awayId === leftId);
    if (!isDirectMatch) continue;

    const leftGoals = homeId === leftId ? match.homeTeam.score : match.awayTeam.score;
    const rightGoals = homeId === rightId ? match.homeTeam.score : match.awayTeam.score;
    matchCount += 1;
    leftGoalDifference += leftGoals - rightGoals;

    if (leftGoals > rightGoals) leftPoints += 3;
    else if (leftGoals < rightGoals) rightPoints += 3;
    else {
      leftPoints += 1;
      rightPoints += 1;
    }
  }

  if (!matchCount) return 0;
  return rightPoints - leftPoints || -leftGoalDifference;
}

function disciplineComparison(left, right, field) {
  return Number.isFinite(left[field]) && Number.isFinite(right[field])
    ? left[field] - right[field]
    : 0;
}

function fallbackPositionComparison(left, right) {
  const leftPosition = Number(left.basePosition);
  const rightPosition = Number(right.basePosition);
  return leftPosition > 0 && rightPosition > 0 ? leftPosition - rightPosition : 0;
}

// REC 2026, art. 15: points, wins, goal difference, goals scored, direct
// confrontation (only when two clubs are tied), red cards, yellow cards and draw.
// The official/base position is the deterministic substitute for a draw in generated
// views, because the application cannot perform the CBF's drawing procedure.
export function rankStandingsByCbfCriteria(entries, matches = []) {
  const directTieGroupSizes = new Map();
  for (const entry of entries) {
    const key = [entry.points, entry.wins, entry.goalDifference, entry.goalsFor].join(
      "|"
    );
    directTieGroupSizes.set(key, (directTieGroupSizes.get(key) ?? 0) + 1);
  }

  return [...entries]
    .sort((left, right) => {
      const standardComparison =
        right.points - left.points ||
        right.wins - left.wins ||
        right.goalDifference - left.goalDifference ||
        right.goalsFor - left.goalsFor;
      if (standardComparison) return standardComparison;

      const directTieKey = [
        left.points,
        left.wins,
        left.goalDifference,
        left.goalsFor
      ].join("|");
      if (directTieGroupSizes.get(directTieKey) === 2) {
        const directComparison = headToHeadComparison(left, right, matches);
        if (directComparison) return directComparison;
      }

      return (
        disciplineComparison(left, right, "redCards") ||
        disciplineComparison(left, right, "yellowCards") ||
        fallbackPositionComparison(left, right) ||
        left.team.name.localeCompare(right.team.name, "pt-BR")
      );
    })
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}
