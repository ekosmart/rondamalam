export const SPIRIT_GATE = { x: 108, z: 262 };
export const SPARKS = [
  { id: "embun", name: "Embun Leluhur", x: 91, z: 255 },
  { id: "angin", name: "Napas Angin", x: 119, z: 249 },
  { id: "ombak", name: "Suara Ombak", x: 128, z: 269 },
];
export const RELICS = [
  { id: "teratai", name: "Cawan Teratai", x: -22, z: 12 },
  { id: "cermin", name: "Cermin Ingatan", x: 22, z: 0 },
  { id: "mutiara", name: "Mutiara Pasang", x: -24, z: -17 },
];
export const MELODY = [0, 2, 1, 3];
export const NOTES = ["Ombak", "Angin", "Bulan", "Bintang"];
export const SPIRIT_STAGES = [
  [
    "Panggilan Leluhur",
    "Miliki Kuda Sembrani dari Pak Mulyono, lalu temui juru gerbang di Pantai Sukma (108, 262).",
  ],
  [
    "Pulihkan Sukma Sembrani",
    "Kumpulkan tiga cahaya di sekitar pantai sambil menunggang Sembrani.",
  ],
  [
    "Lintas Sukma",
    "Naiki Sembrani dan gunakan gerbang saat malam Kliwon. Gerbang yang pernah dilalui terbuka kapan saja.",
  ],
  [
    "Tamu dari Alam Manusia",
    "Turun dari Sembrani dengan B. Minta izin kepada juru keraton di depan gerbang.",
  ],
  [
    "Tiga Pusaka yang Hilang",
    "Pulihkan cawan di taman, cermin di pendopo timur, dan mutiara di pemandian barat.",
  ],
  [
    "Gamelan Tanpa Penabuh",
    "Dekati gamelan di timur: Ombak, Bulan, Angin, Bintang. Bunyikan empat nada untuk membuka balairung.",
  ],
  [
    "Penjaga Palung",
    "Kalahkan pencuri ingatan di pelataran. Hindari lingkaran merah; serang saat ia memulihkan tenaga.",
  ],
  [
    "Restu Ratu Selatan",
    "Temui Ratu Selatan di depan singgasana. Terima pelana pusaka, Tapak Samudra, dan Mata Sukma.",
  ],
  [
    "Penembus Sukma",
    "Keraton telah pulih. Jelajahi kembali dengan Sembrani; V Tapak Samudra, R Mata Sukma.",
  ],
];
export const freshSpirit = () => ({
  started: false,
  sparks: [],
  crossed: false,
  welcomed: false,
  relics: [],
  melodySolved: false,
  bossDefeated: false,
  blessed: false,
  chests: [],
});
export function restoreSpirit(raw) {
  const s = freshSpirit();
  if (!raw || typeof raw !== "object") return s;
  for (const key of [
    "started",
    "crossed",
    "welcomed",
    "melodySolved",
    "bossDefeated",
    "blessed",
  ])
    s[key] = raw[key] === true;
  for (const [key, ids] of [
    ["sparks", SPARKS.map((x) => x.id)],
    ["relics", RELICS.map((x) => x.id)],
    ["chests", ["lotus", "tide"]],
  ])
    s[key] = Array.isArray(raw[key])
      ? [...new Set(raw[key].filter((id) => ids.includes(id)))]
      : [];
  // Later checkpoints imply their prerequisites, keeping old/partial saves playable.
  if (s.blessed) s.bossDefeated = true;
  if (s.bossDefeated) s.melodySolved = true;
  if (s.melodySolved) s.relics = RELICS.map((x) => x.id);
  if (s.relics.length) s.welcomed = true;
  if (s.welcomed) s.crossed = true;
  if (s.crossed) s.sparks = SPARKS.map((x) => x.id);
  if (s.sparks.length) s.started = true;
  return s;
}
export function spiritStage(s) {
  if (!s.started) return 0;
  if (s.sparks.length < 3) return 1;
  if (!s.crossed) return 2;
  if (!s.welcomed) return 3;
  if (s.relics.length < 3) return 4;
  if (!s.melodySolved) return 5;
  if (!s.bossDefeated) return 6;
  return s.blessed ? 8 : 7;
}
export function gateReason(data) {
  if (!data.mounts.includes("sembrani"))
    return "Selesaikan quest lima ternak Pak Mulyono untuk mendapatkan Sembrani.";
  if (data.spirit.sparks.length < 3)
    return "Pulihkan tiga cahaya sukma di sekitar pantai dahulu.";
  if (!data.riding || data.mount !== "sembrani")
    return "Tunggangi Kuda Sembrani dengan B untuk melintasi gerbang.";
  const night = data.time >= 1080 || data.time < 360;
  if (!data.spirit.crossed && !(night && data.night % 3 === 1))
    return "Lintasan pertama terbuka pada malam Kliwon (malam 1, 4, 7, …).";
  return "";
}
export function collectSpiritItem(s, kind, id) {
  const defs = kind === "sparks" ? SPARKS : kind === "relics" ? RELICS : [];
  if (
    !(kind === "sparks" ? s.started : s.welcomed) ||
    !defs.some((x) => x.id === id) ||
    s[kind].includes(id)
  )
    return false;
  s[kind].push(id);
  return true;
}
export function playSpiritNote(progress, note) {
  if (!Number.isInteger(note) || note < 0 || note > 3) return 0;
  return note === MELODY[progress] ? progress + 1 : 0;
}
export function claimSpiritBlessing(data) {
  if (!data.spirit.bossDefeated || data.spirit.blessed) return false;
  data.spirit.blessed = true;
  data.coins += 350;
  data.essence += 8;
  return true;
}
