export const FISH = [
  {
    id: "wader",
    name: "Wader",
    min: 0.05,
    max: 0.2,
    cm: [8, 17],
    weight: 24,
    color: "#c9d8c7",
    sell: 7,
  },
  {
    id: "fish",
    name: "Nila",
    min: 0.2,
    max: 1.2,
    cm: [16, 36],
    weight: 22,
    color: "#88a7b6",
    sell: 10,
    buy: 16,
  },
  {
    id: "lele",
    name: "Lele",
    min: 0.3,
    max: 1.8,
    cm: [22, 52],
    weight: 20,
    color: "#647584",
    sell: 17,
  },
  {
    id: "mas",
    name: "Ikan Mas",
    min: 0.35,
    max: 2,
    cm: [20, 45],
    weight: 17,
    color: "#deb86d",
    sell: 22,
  },
  {
    id: "gurame",
    name: "Gurame",
    min: 0.5,
    max: 2.8,
    cm: [24, 55],
    weight: 14,
    color: "#a9b9a2",
    sell: 30,
  },
  {
    id: "gabus",
    name: "Gabus",
    min: 0.7,
    max: 3.2,
    cm: [30, 65],
    weight: 12,
    color: "#7d9470",
    sell: 38,
  },
  {
    id: "goldfish",
    name: "Arwana",
    min: 1,
    max: 4,
    cm: [40, 85],
    weight: 7,
    color: "#ebc788",
    sell: 60,
    buy: 90,
  },
  {
    id: "patin",
    name: "Patin Raksasa",
    min: 8,
    max: 32,
    cm: [85, 165],
    weight: 7,
    large: true,
    color: "#a6c5ce",
    sell: 190,
  },
  {
    id: "arapaima",
    name: "Arapaima",
    min: 35,
    max: 120,
    cm: [150, 290],
    weight: 4,
    large: true,
    color: "#8ca28a",
    sell: 390,
  },
  {
    id: "naga-sungai",
    name: "Raja Naga Sungai",
    min: 140,
    max: 300,
    cm: [320, 520],
    weight: 1.8,
    large: true,
    legendary: true,
    color: "#70eadc",
    sell: 1500,
  },
];
export const ROD_NAMES = [
  "Belum punya",
  "Joran Bambu",
  "Reel Koperasi",
  "Joran Pusaka Tirta",
];
export function trophyEligible({ rod, night, posts }) {
  return rod >= 3 && night === true && new Set(posts || []).size >= 5;
}
export function rollFish(context, random = Math.random) {
  const eligible = trophyEligible(context),
    pool = FISH.filter((f) => !f.large || eligible);
  const weight = (f) =>
    f.weight * (context.rod >= 2 && f.id === "goldfish" ? 1.8 : 1);
  let r =
    Math.max(0, Math.min(0.999999, random())) *
    pool.reduce((sum, f) => sum + weight(f), 0);
  const fish = pool.find((f) => (r -= weight(f)) < 0) || pool[pool.length - 1];
  const size = Math.max(0, Math.min(1, random())),
    length = fish.cm[0] + (fish.cm[1] - fish.cm[0]) * size;
  const kg =
    fish.min +
    (fish.max - fish.min) *
      (0.85 * size + 0.15 * Math.max(0, Math.min(1, random())));
  return {
    id: fish.id,
    kg: Math.round(kg * 100) / 100,
    cm: Math.round(length * 10) / 10,
  };
}
export function recordFish(data, catchData) {
  const f = data.frontier;
  f.bag[catchData.id] = (f.bag[catchData.id] || 0) + 1;
  f.fishLog ||= [];
  f.fishLog.push({ ...catchData, night: data.night });
  f.fishLog = f.fishLog.slice(-100);
  const prior = f.fishRecords[catchData.id];
  f.fishRecords[catchData.id] = {
    count: (prior?.count || 0) + 1,
    kg: Math.max(prior?.kg || 0, catchData.kg),
    cm: Math.max(prior?.cm || 0, catchData.cm),
  };
  data.stats.fished++;
  if (data.quests["bowo-tirta"] === "active")
    data.stats.anglerCatches = (data.stats.anglerCatches || 0) + 1;
}
