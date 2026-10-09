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
function random(seed) {
  let n = seed | 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
// Three different incidents and one quiet night per shuffled four-night block.
export function nightPlan(seed, night) {
  const n = Math.max(1, Math.floor(night)),
    block = Math.floor((n - 1) / 4);
  const order = ["zombie", "alien", "dino", null];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(random(seed + block * 7919 + i * 3571) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    night: n,
    kind: order[(n - 1) % 4],
    start: 1170 + Math.floor(random(seed + n * 1543) * 120),
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
