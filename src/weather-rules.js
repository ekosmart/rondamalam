export const WEATHER = {
  clear: {
    name: "Cerah",
    icon: "☀",
    tint: "#b9d8e4",
    dim: 1,
    fog: 0,
    hint: "Langit terbuka · perjalanan lancar",
  },
  cloudy: {
    name: "Berawan",
    icon: "☁",
    tint: "#879ca6",
    dim: 0.65,
    fog: 0.001,
    hint: "Awan bergerak menutupi desa",
  },
  rain: {
    name: "Hujan",
    icon: "☂",
    tint: "#688fa2",
    dim: 0.62,
    fog: 0.002,
    rain: 1,
    hint: "Rintik hujan membasahi Sukarame",
  },
  storm: {
    name: "Hujan badai",
    icon: "≋",
    tint: "#4c6577",
    dim: 0.35,
    fog: 0.005,
    rain: 2,
    wind: 1,
    hint: "Angin kencang · jarak pandang terbatas",
  },
  haze: {
    name: "Kabut asap karhutla",
    icon: "〰",
    tint: "#a48a66",
    dim: 0.48,
    fog: 0.024,
    hint: "Asap pekat · ikuti jalan dan peta",
  },
  tornado: {
    name: "Tornado",
    icon: "◉",
    tint: "#666c74",
    dim: 0.35,
    fog: 0.005,
    wind: 2,
    hint: "Pusaran memburu rumah dan warga · berlindung di pos!",
  },
  snow: {
    name: "Hujan salju",
    icon: "❄",
    tint: "#b8cfde",
    dim: 0.75,
    fog: 0.002,
    snow: 1,
    hint: "Salju turun dan menumpuk di jalan",
  },
  blizzard: {
    name: "Badai salju",
    icon: "❄",
    tint: "#a8bdcc",
    dim: 0.42,
    fog: 0.017,
    snow: 2,
    wind: 1,
    hint: "Angin salju · langkah melambat · jejak tertinggal",
  },
  flood: {
    name: "Banjir",
    icon: "≈",
    tint: "#6c98ab",
    dim: 0.6,
    fog: 0.002,
    rain: 1,
    hint: "Semua tempat jadi spot pancing · gerak darat −48%",
  },
  snowroad: {
    name: "Jalan bersalju",
    icon: "❅",
    tint: "#c6d9e2",
    dim: 0.9,
    fog: 0.001,
    hint: "Tanah bersalju · gerak darat −30% · jejak kaki",
  },
  thunder: {
    name: "Hujan petir",
    icon: "ϟ",
    tint: "#536b88",
    dim: 0.36,
    fog: 0.004,
    rain: 2,
    hint: "Petir menyambar semua jenis entitas · padamkan api dengan E",
  },
};
export function freshWeather() {
  return {
    seed: Math.floor(Math.random() * 1e9),
    index: 0,
    type: "clear",
    elapsed: 0,
    phase: null,
    tornadoPosition: null,
    snow: 0,
    flood: 0,
    fires: [],
    health: {},
  };
}
export function restoreWeather(raw) {
  const v = raw && typeof raw === "object" ? raw : {},
    b = freshWeather();
  const nonneg = (x, max) => Math.min(max, Math.max(0, Number(x) || 0));
  return {
    ...b,
    seed: nonneg(v.seed ?? b.seed, 2 ** 32 - 1),
    index: Math.floor(nonneg(v.index, 1e9)),
    type: WEATHER[v.type] ? v.type : "clear",
    elapsed: nonneg(v.elapsed, 100000),
    phase: typeof v.phase === "string" && /^\d+:(day|night)$/.test(v.phase) ? v.phase : null,
    tornadoPosition: v.tornadoPosition && Number.isFinite(v.tornadoPosition.x) && Number.isFinite(v.tornadoPosition.z) ? { x: Math.max(-285, Math.min(285, v.tornadoPosition.x)), z: Math.max(-285, Math.min(285, v.tornadoPosition.z)) } : null,
    snow: nonneg(v.snow, 1),
    flood: nonneg(v.flood, 1),
    fires: Array.isArray(v.fires)
      ? v.fires
          .filter((f) => typeof f.key === "string" && Number.isFinite(f.life))
          .slice(0, 40)
          .map((f) => ({ key: f.key, life: nonneg(f.life, 22) }))
      : [],
    health: Object.fromEntries(
      Object.entries(v.health || {})
        .filter(([k, h]) => Number.isFinite(h))
        .map(([k, h]) => [k, nonneg(h, 100)]),
    ),
  };
}
export const weatherPhase = state => `${state.data.night}:${state.isNight ? "night" : "day"}`;

// An independent shuffled bag ensures every weather type appears without changing invasion rolls.
export function weatherAt(seed, index) {
  const bag = Object.keys(WEATHER),
    cycle = Math.floor(index / bag.length);
  let n = (seed + cycle * 7919) >>> 0;
  for (let i = bag.length - 1; i > 0; i--) {
    n = (n * 1664525 + 1013904223) >>> 0;
    const j = n % (i + 1);
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag[index % bag.length];
}
export function groundFactor(weather, airborne = false) {
  if (airborne) return 1;
  if (weather.flood > 0.2) return 0.52;
  if (weather.snow > 0.15) return 0.7;
  return 1;
}
