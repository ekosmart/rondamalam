import { FISH } from "./fishing-data.js";
import { SHOP_ITEMS, STORAGE_ITEMS } from "./frontier-data.js";
export function freshFrontier() {
  return {
    rod: 0,
    fishLog: [],
    fishRecords: {},
    bag: {
      ...Object.fromEntries(FISH.map((f) => [f.id, 0])),
      bait: 0,
      capsules: 0,
      fish: 0,
      goldfish: 0,
      corn: 0,
      wheat: 0,
      crystal: 0,
    },
    storage: {},
    dinos: [],
    tagged: [],
    fed: {},
    gifts: [],
    harvest: {},
    dinoSeen: false,
    spaceUnlocked: false,
    spaceCollected: [],
    zCaptives: 0,
  };
}
export function restoreFrontier(v) {
  const b = freshFrontier(),
    d = {
      ...b,
      ...v,
      bag: { ...b.bag, ...v?.bag },
      storage: { ...v?.storage },
      fed: { ...v?.fed },
      harvest: { ...v?.harvest },
    };
  for (const k of ["dinos", "tagged", "gifts", "spaceCollected"])
    d[k] = Array.isArray(d[k])
      ? [...new Set(d[k].filter((x) => typeof x === "string"))]
      : [];
  for (const obj of [d.bag, d.storage, d.fed])
    for (const k in obj)
      obj[k] = Number.isFinite(Number(obj[k]))
        ? Math.max(0, Math.floor(Number(obj[k])))
        : 0;
  d.rod = Math.floor(Math.max(0, Math.min(3, Number(d.rod) || 0)));
  d.fishLog = Array.isArray(v?.fishLog)
    ? v.fishLog
        .filter(
          (c) =>
            FISH.some((f) => f.id === c.id) &&
            Number.isFinite(c.kg) &&
            c.kg > 0 &&
            Number.isFinite(c.cm) &&
            c.cm > 0,
        )
        .slice(-100)
    : [];
  d.fishRecords = Object.fromEntries(
    FISH.filter(
      (f) =>
        v?.fishRecords?.[f.id] &&
        Number.isFinite(v.fishRecords[f.id].kg) &&
        Number.isFinite(v.fishRecords[f.id].cm) &&
        Number.isFinite(v.fishRecords[f.id].count),
    ).map((f) => [f.id, v.fishRecords[f.id]]),
  );
  return d;
}
export function itemBag(data, item) {
  return item.base ? data : data.frontier.bag;
}
export function trade(data, id, mode, quantity = 1) {
  const item = SHOP_ITEMS.find((i) => i.id === id),
    f = data.frontier,
    n = Math.floor(quantity);
  if (
    !item ||
    !["buy", "sell"].includes(mode) ||
    !Number.isFinite(quantity) ||
    !Number.isInteger(quantity) ||
    n < 1 ||
    n > 100
  )
    return false;
  if (item.tool) {
    if (
      mode !== "buy" ||
      n !== 1 ||
      !(
        (id === "rod" && f.rod === 0) ||
        (id === "rod-upgrade" && f.rod === 1)
      ) ||
      data.coins < item.buy
    )
      return false;
    data.coins -= item.buy;
    f.rod++;
    return true;
  }
  const bag = itemBag(data, item),
    price = mode === "buy" ? item.buy : item.sell;
  if (!price) return false;
  if (mode === "buy") {
    if (data.coins < price * n) return false;
    data.coins -= price * n;
    bag[id] = (bag[id] || 0) + n;
  } else {
    if ((bag[id] || 0) < n) return false;
    bag[id] -= n;
    data.coins += price * n;
  }
  return true;
}
export function transferStorage(data, id, mode, quantity) {
  const item = STORAGE_ITEMS.find((i) => i.id === id),
    n = Math.floor(quantity);
  if (
    !item ||
    !["deposit", "withdraw"].includes(mode) ||
    !Number.isFinite(quantity) ||
    !Number.isInteger(quantity) ||
    n < 1 ||
    n > 1e8
  )
    return false;
  const bag = itemBag(data, item),
    chest = data.frontier.storage,
    from = mode === "deposit" ? bag : chest,
    to = mode === "deposit" ? chest : bag;
  if ((from[id] || 0) < n) return false;
  from[id] -= n;
  to[id] = (to[id] || 0) + n;
  return true;
}
