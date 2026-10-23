export const BAMBOO_GROVE = { x0: -280, x1: -194, z0: -188, z1: -27 };
export const BANANA_GROVE = { x: -124, z: 122, w: 62, d: 30 };
export const VILLAGE_BANANAS = [
  { x: -44, z: -80 },
  { x: 43, z: -104 },
  { x: 112, z: -100 },
  { x: -44, z: 55 },
  { x: 66, z: 98 },
];
export const PLANT_ASSETS = [
  "sawit_tbs",
  "bambu_rumpun",
  "gandum_rumpun",
  "jagung_dewasa",
  "jagung_mati",
  "jerami_gulungan",
  "orang_orangan_sawah",
  "pisang_anakan",
  "pisang_daun_kering",
  "pisang_pohon_berbuah",
  "sawit_pelepah_tumpuk",
  "sawit_pohon",
];
export function plantationClearing(x, z) {
  const b = BAMBOO_GROVE,
    p = BANANA_GROVE;
  return (
    (x > b.x0 - 5 && x < b.x1 + 5 && z > b.z0 - 5 && z < b.z1 + 5) ||
    (Math.abs(x - p.x) < p.w / 2 + 5 && Math.abs(z - p.z) < p.d / 2 + 5) ||
    (x > -258 && x < -166 && z > 38 && z < 145) ||
    VILLAGE_BANANAS.some((p) => Math.hypot(x - p.x, z - p.z) < 8)
  );
}
