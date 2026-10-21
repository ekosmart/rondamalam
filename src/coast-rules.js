export const WORLD_BOUNDS = { minX: -280, maxX: 280, minZ: -280, maxZ: 520 };
export const COAST = { x: 20, z: 335 };
export const LIGHTHOUSE = { x: 30, z: 440 };
export const ISLAND = { x: 190, z: 420, radius: 27 };
export const DOCKS = [
  {
    id: "harbor",
    name: "Dermaga Karang Tirta",
    x: 84,
    z: 330,
    boatX: 93,
    boatZ: 330,
  },
  {
    id: "island",
    name: "Dermaga Pulau Karang",
    x: 161,
    z: 420,
    boatX: 153,
    boatZ: 420,
  },
];
export const COAST_PARTS = [
  { id: "lens", name: "Lensa Mercusuar", x: -8, z: 352 },
  { id: "dynamo", name: "Dinamo Bengkel", x: -24, z: 400 },
  { id: "cable", name: "Gulungan Kabel", x: -24, z: 315 },
];
export const FISHERMEN = [
  { id: "darto", name: "Pak Darto", x: 133, z: 373 },
  { id: "seno", name: "Mas Seno", x: 244, z: 475 },
];
export const COAST_STAGES = [
  [
    "Cahaya Mercusuar Padam",
    "Temui Bu Sari di pelelangan Karang Tirta (20, 335).",
  ],
  [
    "Tiga Komponen Mercusuar",
    "Cari lensa di gudang, dinamo di bengkel, dan kabel di pelelangan. Pasang di pintu mercusuar (30, 446).",
  ],
  [
    "Nelayan di Tengah Teluk",
    "Pinjam perahu di ujung dermaga (84, 330). Selamatkan Darto (133, 373) dan Seno (244, 475), lalu antar ke dermaga utama.",
  ],
  [
    "Kapal Tanpa Awak",
    "Perahu kini milikmu. Sandar di Pulau Karang (161, 420), periksa kapal tua, dan usir atau tangkap Buto Ijo pada malam hari.",
  ],
  [
    "Titipan dari Alam Gaib",
    "Bawa segel kapal dan kabar Buto Ijo kepada Bu Sari di pelelangan.",
  ],
  [
    "Pelabuhan Kembali Terang",
    "Karang Tirta pulih. Jelajahi teluk, memancing, dan jual tangkapan di pelelangan.",
  ],
];
export const freshCoast = () => ({
  started: false,
  parts: [],
  lighthouse: false,
  rescued: [],
  boatOwned: false,
  relic: false,
  butoDefeated: false,
  completed: false,
});
export function restoreCoast(raw) {
  const s = freshCoast();
  if (!raw || typeof raw !== "object") return s;
  for (const k of [
    "started",
    "lighthouse",
    "boatOwned",
    "relic",
    "butoDefeated",
    "completed",
  ])
    s[k] = raw[k] === true;
  for (const [k, defs] of [
    ["parts", COAST_PARTS],
    ["rescued", FISHERMEN],
  ])
    s[k] = Array.isArray(raw[k])
      ? [...new Set(raw[k].filter((id) => defs.some((x) => x.id === id)))]
      : [];
  if (s.completed) {
    s.boatOwned = true;
    s.relic = true;
    s.butoDefeated = true;
  }
  if (s.boatOwned) s.rescued = FISHERMEN.map((x) => x.id);
  if (s.rescued.length || s.boatOwned) s.lighthouse = true;
  if (s.lighthouse) s.parts = COAST_PARTS.map((x) => x.id);
  if (s.parts.length) s.started = true;
  return s;
}
export function coastStage(s) {
  if (s.completed) return 5;
  if (!s.started) return 0;
  if (!s.lighthouse) return 1;
  if (!s.boatOwned) return 2;
  return s.relic && s.butoDefeated ? 4 : 3;
}
export function inCoastBounds(x, z) {
  return x >= -60 && x <= 278 && z > 285 && z <= 518;
}
export function coastLand(x, z, margin = 0) {
  if (!inCoastBounds(x, z)) return false;
  return (
    x <= 60 - margin ||
    Math.hypot(x - ISLAND.x, z - ISLAND.z) <= ISLAND.radius - margin ||
    (x >= 59 && x <= 88 - margin && Math.abs(z - 330) <= 4 - margin) ||
    (x >= 158 + margin && x <= 172 && Math.abs(z - 420) <= 4 - margin)
  );
}
export function coastWater(x, z, margin = 0) {
  return (
    x > 60 + margin &&
    x < 278 - margin &&
    z > 287 + margin &&
    z < 518 - margin &&
    Math.hypot(x - ISLAND.x, z - ISLAND.z) > ISLAND.radius + margin &&
    !(x < 89 + margin && Math.abs(z - 330) < 4 + margin) &&
    !(x > 158 - margin && x < 172 + margin && Math.abs(z - 420) < 4 + margin)
  );
}
export function collectCoastPart(s, id) {
  if (
    !s.started ||
    s.lighthouse ||
    s.parts.includes(id) ||
    !COAST_PARTS.some((p) => p.id === id)
  )
    return false;
  s.parts.push(id);
  return true;
}
export function repairLighthouse(d) {
  if (!d.coast.started || d.coast.lighthouse || d.coast.parts.length !== 3)
    return false;
  d.coast.lighthouse = true;
  d.coins += 100;
  return true;
}
export function deliverFishermen(d, aboard) {
  if (!d.coast.lighthouse) return false;
  let changed = false;
  for (const id of aboard)
    if (FISHERMEN.some((p) => p.id === id) && !d.coast.rescued.includes(id)) {
      d.coast.rescued.push(id);
      changed = true;
    }
  if (d.coast.rescued.length === 2 && !d.coast.boatOwned) {
    d.coast.boatOwned = true;
    d.coins += 150;
  }
  return changed;
}
export function claimCoastReward(d) {
  const s = d.coast;
  if (!s.boatOwned || !s.relic || !s.butoDefeated || s.completed) return false;
  s.completed = true;
  d.coins += 250;
  d.essence += 6;
  return true;
}
