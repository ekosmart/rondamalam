// Shared spatial plan: roads, patrol sectors and sports routes use the same coordinates.
export const ROADS = [
  { x: 24, z: -153, w: 48, d: 6 },
  { x: -18, z: -221, w: 36, d: 5 },
  { x: -18, z: -197, w: 36, d: 5 },
  { x: -18, z: -155, w: 36, d: 5 },
  { x: 15, z: -222, w: 30, d: 5 },
  { x: 15, z: -203, w: 30, d: 5 },
  { x: -78, z: 149, w: 7, d: 116 },
  { x: -99, z: 207, w: 42, d: 7 },
  { x: 0, z: -78, w: 10, d: 340 },
  { x: -65, z: -55.5, w: 8, d: 151 },
  { x: -65, z: -180, w: 8, d: 100 },
  { x: -119, z: 19, w: 260, d: 8 },
  { x: 88, z: -130, w: 195, d: 9 },
  { x: -112, z: -130, w: 225, d: 8 },
  { x: 36, z: -47, w: 78, d: 7 },
  { x: 48, z: 48, w: 102, d: 7 },
  { x: 112, z: 143, w: 166, d: 8 },
  { x: 191, z: -40, w: 8, d: 440 },
  { x: -130, z: 91, w: 260, d: 7 },
  { x: 15, z: 91, w: 30, d: 7 },
  { x: 30, z: 117, w: 8, d: 52 },
  { x: -109, z: -193, w: 91, d: 6 },
  { x: 48, z: -141, w: 8, d: 30 },
  { x: 96, z: -153, w: 100, d: 7 },
  { x: -220, z: -189, w: 7, d: 118 },
  { x: -235, z: -247, w: 30, d: 6 },
  { x: 127, z: 30, w: 136, d: 7 },
  { x: 216, z: -205, w: 52, d: 7 },
  { x: 224, z: 174, w: 66, d: 7 },
  { x: 247, z: 197, w: 7, d: 46 },
];
// Keep the old IDs for night one; saves from v1 can migrate by sector.
export const POST_SECTORS = [
  [
    { id: "kampung", name: "Simpang Kampung", x: -7, z: -46 },
    { id: "kampung-utara", name: "Gang Rumah Warga", x: -7, z: -80 },
    { id: "kampung-selatan", name: "Simpang Sekolah Rakyat", x: -7, z: 45 },
  ],
  [
    { id: "pasar", name: "Jalan Pasar", x: -103, z: 26 },
    { id: "pasar-barat", name: "Pasar Barat", x: -140, z: 26 },
    { id: "pasar-timur", name: "Pasar Timur", x: -83, z: 26 },
  ],
  [
    { id: "sawah", name: "Pematang Wetan", x: -81, z: -137 },
    { id: "sawah-barat", name: "Pematang Barat", x: -170, z: -137 },
    { id: "bambu", name: "Simpang Bambu", x: -188, z: -123 },
  ],
  [
    { id: "makam", name: "Gerbang Makam", x: -76, z: -187 },
    { id: "makam-barat", name: "Makam Barat", x: -118, z: -187 },
    { id: "makam-timur", name: "Jalan Juru Kunci", x: -72, z: -164 },
  ],
  [
    { id: "beringin", name: "Jembatan Beringin", x: 177, z: -138 },
    { id: "masjid", name: "Pelataran Masjid Raya", x: 94, z: -160 },
    { id: "pesantren", name: "Simpang Pesantren", x: 130, z: -146 },
  ],
];
export const POST_POOL = POST_SECTORS.flat();
export function patrolPosts(night) {
  const n = Math.max(0, Math.floor(Number(night) || 1) - 1);
  return POST_SECTORS.map(
    (sector, i) => sector[(n * (i % 2 ? 2 : 1)) % sector.length],
  );
}
export const RACE_TRACK = [
  { x: 0, z: 19 },
  { x: -35, z: 19 },
  { x: -65, z: 19 },
  { x: -65, z: -25 },
  { x: -65, z: -75 },
  { x: -65, z: -130 },
  { x: -25, z: -130 },
  { x: 0, z: -130 },
  { x: 0, z: -85 },
  { x: 0, z: -35 },
];
export const SPORTS = { football: { x: -54, z: 112 }, race: { x: 7, z: 26 } };
export const RITUAL = { x: -255, z: -245 };
export const RAID_TARGETS = [
  {
    id: "tabungan",
    name: "Tabungan warga",
    x: -22,
    z: -25,
    houseX: -22,
    houseZ: -33,
    kind: "tuyul",
  },
  {
    id: "warung",
    name: "Kas warung",
    x: 19,
    z: -28,
    houseX: 19,
    houseZ: -36,
    kind: "ngepet",
  },
  {
    id: "bayi",
    name: "Rumah Bu Rini · lindungi bayi",
    x: -23,
    z: -53,
    houseX: -23,
    houseZ: -62,
    kind: "kuyang",
  },
  {
    id: "api",
    name: "Rumah Pak Hadi",
    x: 22,
    z: -70,
    houseX: 22,
    houseZ: -79,
    kind: "banaspati",
  },
];
export function rectanglesOverlap(a, b, padding = 0) {
  return (
    Math.abs(a.x - b.x) < a.w / 2 + b.w / 2 + padding &&
    Math.abs(a.z - b.z) < a.d / 2 + b.d / 2 + padding
  );
}
export function onRoad(x, z, padding = 0) {
  return ROADS.some(
    (r) =>
      Math.abs(x - r.x) < r.w / 2 + padding &&
      Math.abs(z - r.z) < r.d / 2 + padding,
  );
}
export function segmentDistance(p, a, b) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    l = dx * dx + dz * dz;
  const t = l
    ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l))
    : 0;
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}
