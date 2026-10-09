import { GameState, freshState } from "./state.js";
export function parseSaveBackup(text) {
  if (text.length > 1_000_000) throw Error("File save terlalu besar.");
  const payload = JSON.parse(text),
    raw = payload?.game === "ronda-malam" ? payload.state : payload;
  if (
    raw?.version !== 1 ||
    !Array.isArray(raw.weapons) ||
    !Array.isArray(raw.mounts) ||
    !Number.isFinite(raw.level)
  )
    throw Error("File ini bukan save Ronda Malam yang didukung.");
  const walk = (v) => {
    if (typeof v === "number" && (!Number.isFinite(v) || Math.abs(v) > 1e12))
      throw Error("Angka dalam save tidak valid.");
    if (typeof v === "string" && (v.length > 500 || /[<>]/.test(v)))
      throw Error("Isi save tidak valid.");
    if (v && typeof v === "object")
      for (const [k, value] of Object.entries(v)) {
        if (["__proto__", "constructor", "prototype"].includes(k))
          throw Error("Struktur save tidak valid.");
        walk(value);
      }
  };
  walk(raw);
  const base = freshState();
  if (raw.level < 1 || raw.level > 10000 || raw.level % 1)
    throw Error("Level save tidak valid.");
  if (
    raw.collection != null &&
    (!Array.isArray(raw.collection) ||
      raw.collection.some((x) => !x || typeof x !== "object"))
  )
    throw Error("Koleksi save tidak valid.");
  for (const section of [
    "stats",
    "upgrades",
    "sports",
    "village",
    "settings",
    "incidents",
  ])
    if (
      raw[section] != null &&
      (typeof raw[section] !== "object" || Array.isArray(raw[section]))
    )
      throw Error("Struktur save tidak valid.");
  for (const [k, v] of Object.entries(base))
    if (
      typeof v === "number" &&
      raw[k] !== undefined &&
      (!Number.isFinite(raw[k]) ||
        (!["x", "z", "bribeDay"].includes(k) && raw[k] < 0))
    )
      throw Error("Nilai save tidak valid.");
  for (const section of ["stats", "upgrades", "village", "settings"])
    for (const [k, v] of Object.entries(base[section]))
      if (
        raw[section]?.[k] !== undefined &&
        typeof raw[section][k] !== typeof v
      )
        throw Error("Nilai save tidak valid.");
  const state = new GameState({ getItem: () => JSON.stringify(raw) });
  return state.data;
}
export function saveBackup(data) {
  return JSON.stringify(
    {
      game: "ronda-malam",
      format: 1,
      exportedAt: new Date().toISOString(),
      state: data,
    },
    null,
    2,
  );
}
