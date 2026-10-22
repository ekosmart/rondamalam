export const STATION = { x: -185, z: 255 };
export const LARAS = { x: 12, z: 28 };
export const BOOTH = { x: -197, z: 259 },
  BOOK = { x: -179, z: 258 },
  TROLLEY = { x: -173, z: 259 },
  PORTAL = { x: -167, z: 249 };
export const NOTES = ["Lentera", "Ombak", "Bulan"];
export const ORDER = [0, 2, 1];
export const freshMagic = () => ({
  accepted: false,
  defeated: [],
  rescued: 0,
  ticket: false,
  stationAccepted: false,
  bookSolved: false,
  academyVisited: false,
  trialAccepted: false,
  seals: [],
  completed: false,
  potions: 0,
  loot: [],
  cursed: [],
  raid: null,
  checkedNight: 0,
});
export function restoreMagic(raw) {
  const s = freshMagic();
  if (!raw || typeof raw !== "object") return s;
  for (const k of [
    "accepted",
    "ticket",
    "stationAccepted",
    "bookSolved",
    "academyVisited",
    "trialAccepted",
    "completed",
  ])
    s[k] = raw[k] === true;
  for (const [key, ids] of [
    ["defeated", ["frog", "stone"]],
    ["seals", [0, 1, 2]],
    ["loot", ["p0", "p1", "p2", "p3"]],
  ])
    s[key] = [
      ...new Set(
        (Array.isArray(raw[key]) ? raw[key] : []).filter((x) =>
          ids.includes(x),
        ),
      ),
    ];
  for (const k of ["rescued", "potions", "checkedNight"])
    s[k] = Math.max(0, Math.min(9999, Math.floor(Number(raw[k]) || 0)));
  const seen = new Set();
  s.cursed = (Array.isArray(raw.cursed) ? raw.cursed : [])
    .filter(
      (c) =>
        typeof c.id === "string" &&
        ["frog", "stone"].includes(c.type) &&
        Number.isFinite(c.x) &&
        Number.isFinite(c.z),
    )
    .filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    })
    .slice(0, 6);
  if (raw.raid && ["frog", "stone"].includes(raw.raid.type))
    s.raid = {
      type: raw.raid.type,
      night: Math.max(1, Number(raw.raid.night) || 1),
    };
  if (s.completed) {
    s.seals = [0, 1, 2];
    s.trialAccepted = true;
  }
  if (s.trialAccepted) s.academyVisited = true;
  if (s.academyVisited) s.bookSolved = true;
  if (s.bookSolved) s.stationAccepted = true;
  if (s.stationAccepted) s.ticket = true;
  if (s.ticket) s.accepted = true;
  return s;
}
export const nightTime = (d) => d.time >= 1080 || d.time < 360;
export function portalReason(d, trainReady, pushing) {
  if (!d.magic.ticket)
    return "Mintalah tiket kepada Bu Laras setelah menolong desa.";
  if (!nightTime(d)) return "Portal hanya terbuka pada malam hari.";
  if (!d.magic.bookSolved)
    return "Pecahkan teka-teki buku mantra di peron dahulu.";
  if (!trainReady) return "Tunggu Crimson Express berhenti di peron.";
  if (!pushing) return "Dorong troli ke tembok bata untuk membuka lintasan.";
  return "";
}
export function claimTicket(d) {
  if (
    !d.magic.accepted ||
    !d.magic.defeated.some((t) => ["frog", "stone"].includes(t)) ||
    d.magic.ticket
  )
    return false;
  d.magic.ticket = true;
  d.coins += 100;
  return true;
}
export function claimMagicRewards(d) {
  if (
    !d.magic.trialAccepted ||
    ![0, 1, 2].every((i) => d.magic.seals.includes(i)) ||
    d.magic.completed
  )
    return false;
  d.magic.completed = true;
  d.magic.cursed = [];
  d.coins += 250;
  if (!d.mounts.includes("sapu")) d.mounts.push("sapu");
  if (!d.weapons.includes("tongkat-sihir")) d.weapons.push("tongkat-sihir");
  d.mount = "sapu";
  d.weapon = "tongkat-sihir";
  return true;
}
export function solveNote(progress, note) {
  return Number.isInteger(note) && note === ORDER[progress] ? progress + 1 : 0;
}

// Reserve the station before scenery is batched; keep both existing crop fields intact.
export const stationClearing = (x, z) =>
  (x > -219 && x < -149 && z > 231 && z < 280) ||
  (Math.abs(x + 207) < 7 && z > 210 && z < 278) ||
  (x > -214 && x < -71 && Math.abs(z - 216) < 6);
