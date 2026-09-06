export const COMPETITION_ZONES = Object.freeze([
  Object.freeze({
    key: "libertadores",
    className: "zone-libertadores",
    from: 1,
    to: 4,
    short: "G4",
    label: "Libertadores"
  }),
  Object.freeze({
    key: "pre-libertadores",
    className: "zone-pre-libertadores",
    from: 5,
    to: 5,
    short: "PRÉ",
    label: "Pré-Libertadores"
  }),
  Object.freeze({
    key: "sulamericana",
    className: "zone-sulamericana",
    from: 6,
    to: 11,
    short: "SUL",
    label: "Sul-Americana"
  }),
  Object.freeze({
    key: "relegation",
    className: "zone-relegation",
    from: 17,
    to: 20,
    short: "Z4",
    label: "Rebaixamento"
  })
]);

export const STANDING_ZONE_CLASSES = Object.freeze([
  ...COMPETITION_ZONES.map((zone) => zone.className),
  "zone-neutral"
]);

export function competitionZone(position) {
  return (
    COMPETITION_ZONES.find((zone) => position >= zone.from && position <= zone.to) ??
    null
  );
}

export function standingZone(position) {
  return competitionZone(position)?.className ?? "zone-neutral";
}
