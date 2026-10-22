export function freshIncidents(seed = Math.floor(Math.random() * 0x7fffffff)) {
  return {
    seed,
    labBuilt: false,
    recoveredNight: -1,
    plan: null,
    event: null,
    residents: {},
    houses: {},
    lostCaptives: [],
    collected: [],
    tech: {
      samples: 0,
      serum: 0,
      cells: 0,
      mechaFlight: false,
      etParts: 0,
      etDeparted: false,
      ufoTractor: false,
    },
  };
}
// One guaranteed slot per threat in every five nights; night one is a rest night.
export const INVASION_ROTATION = [null, "zombie", "alien", "dino", "witch"];
export function nightPlan(seed, night) {
  const n = Math.max(1, Math.floor(night));
  return {
    version: 2,
    night: n,
    kind: INVASION_ROTATION[(n - 1) % INVASION_ROTATION.length],
    start: 1200,
    witchType: Math.floor((n - 1) / 5) % 2 === 0 ? "frog" : "stone",
  };
}
export const nightMinutes = (time) => (time - 1080 + 1440) % 1440;
export function waveRoster(type, wave) {
  if (type === "dino")
    return wave === 4
      ? ["rex", "raptor", "raptor", "raptor"]
      : Array.from({ length: 4 + wave * 2 }, () => "raptor");
  if (type === "zombie")
    return wave === 4
      ? ["titan", "zombie", "runner", "zombie"]
      : Array.from({ length: 4 + wave * 2 }, (_, i) =>
          i % 4 === 3 ? "runner" : "zombie",
        );
  return wave === 4
    ? ["mothership", "saucer", "alien", "alien"]
    : [
        ...Array.from({ length: 3 + wave * 2 }, () => "alien"),
        ...Array.from({ length: wave === 1 ? 2 : 3 }, () => "saucer"),
      ];
}
export function restoreIncidents(saved, seed) {
  const base = freshIncidents(seed),
    d = {
      ...base,
      ...saved,
      tech: { ...base.tech, ...saved?.tech },
      residents: { ...saved?.residents },
      houses: { ...saved?.houses },
    };
  if (!Number.isFinite(d.seed)) d.seed = base.seed;
  d.lostCaptives = Array.isArray(d.lostCaptives) ? d.lostCaptives : [];
  d.collected = Array.isArray(d.collected) ? d.collected : [];
  if (d.event && !["zombie", "alien", "dino"].includes(d.event.type))
    d.event = null;
  if (d.event) {
    d.event.enemies = Array.isArray(d.event.enemies)
      ? d.event.enemies.filter(
          (e) => e && typeof e.id === "string" && Number.isFinite(e.hp),
        )
      : [];
    d.event.wave = Math.max(0, Math.min(4, d.event.wave || 0));
  }
  return d;
}
