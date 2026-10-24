import { VEHICLE_QUESTS, OJOL_STOPS, VEHICLE_MOUNTS } from "./vehicle-data.js";
import { coastWater, inCoastBounds, WORLD_BOUNDS } from "./coast-rules.js";
export const freshVehicles = () => ({
  quests: {},
  collected: {},
  claimed: [],
  trips: 0,
  earnings: 0,
  job: null,
});
export function restoreVehicles(saved = {}) {
  const s = freshVehicles();
  if (!saved || typeof saved !== "object") return s;
  for (const q of VEHICLE_QUESTS) {
    if (saved.quests?.[q.id] === true) s.quests[q.id] = true;
    const ids = Array.isArray(saved.collected?.[q.id])
      ? saved.collected[q.id]
      : [];
    s.collected[q.id] = [
      ...new Set(
        ids.filter((i) => Number.isInteger(i) && i >= 0 && i < q.points.length),
      ),
    ];
  }
  s.claimed = Array.isArray(saved.claimed)
    ? [
        ...new Set(
          saved.claimed.filter((id) => VEHICLE_QUESTS.some((q) => q.id === id)),
        ),
      ]
    : [];
  for (const key of ["trips", "earnings"])
    s[key] = Number.isFinite(saved[key])
      ? Math.max(0, Math.floor(saved[key]))
      : 0;
  const j = saved.job;
  if (
    j &&
    ["pickup", "dropoff"].includes(j.phase) &&
    OJOL_STOPS.some((p) => p.id === j.from) &&
    OJOL_STOPS.some((p) => p.id === j.to) &&
    j.from !== j.to
  )
    s.job = { phase: j.phase, from: j.from, to: j.to };
  return s;
}
export function acceptVehicleQuest(d, id) {
  const q = VEHICLE_QUESTS.find((q) => q.id === id),
    s = d.vehicles;
  if (
    !q ||
    s.quests[id] ||
    s.claimed.includes(id) ||
    (q.requires && !d.mounts.includes(q.requires))
  )
    return false;
  s.quests[id] = true;
  s.collected[id] = [];
  return true;
}
export function collectVehiclePoint(d, id, index) {
  const q = VEHICLE_QUESTS.find((q) => q.id === id),
    s = d.vehicles;
  if (
    !q ||
    !s.quests[id] ||
    s.claimed.includes(id) ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= q.points.length
  )
    return false;
  const list = (s.collected[id] ||= []);
  if (list.includes(index) || (q.kind === "trail" && list.length !== index))
    return false;
  list.push(index);
  return true;
}
export function claimVehicleQuest(d, id) {
  const q = VEHICLE_QUESTS.find((q) => q.id === id),
    s = d.vehicles;
  if (
    !q ||
    !s.quests[id] ||
    s.claimed.includes(id) ||
    s.collected[id]?.length !== q.points.length
  )
    return false;
  s.claimed.push(id);
  if (!d.mounts.includes(q.mount)) d.mounts.push(q.mount);
  return true;
}
export const passengerVehicle = (id) =>
  VEHICLE_MOUNTS.some((m) => m.id === id && m.passenger);
export function startOjol(s) {
  if (s.job) return false;
  const from = OJOL_STOPS[s.trips % OJOL_STOPS.length],
    to =
      OJOL_STOPS[
        (s.trips + 1 + (Math.floor(s.trips / OJOL_STOPS.length) % 4)) %
          OJOL_STOPS.length
      ];
  s.job = { from: from.id, to: to.id, phase: "pickup" };
  return true;
}
export function ojolFare(job) {
  const a = OJOL_STOPS.find((s) => s.id === job.from),
    b = OJOL_STOPS.find((s) => s.id === job.to);
  return 20 + Math.round(Math.hypot(a.x - b.x, a.z - b.z) * 0.22);
}
export function finishOjol(d) {
  const s = d.vehicles;
  if (s.job?.phase !== "dropoff") return 0;
  const pay = ojolFare(s.job);
  s.job = null;
  s.trips++;
  s.earnings += pay;
  d.coins += pay;
  return pay;
}
export function vehicleWater(x, z) {
  return (x > 144 && x < 166 && z > -278 && z < 285) || coastWater(x, z, 0.6);
}
export function vehicleCanMove(world, id, x, z, r = 0.8) {
  if (
    x < WORLD_BOUNDS.minX + 2 ||
    x > WORLD_BOUNDS.maxX - 2 ||
    z < WORLD_BOUNDS.minZ + 2 ||
    z > WORLD_BOUNDS.maxZ - 2
  )
    return false;
  const def = VEHICLE_MOUNTS.find((m) => m.id === id);
  // Include the shoreline transition for amphibious mounts; the pedestrian
  // river exclusion is wider than the water surface and otherwise traps them.
  const amphibiousArea =
    def?.amphibious &&
    ((x > 140 && x < 170 && z > -278 && z < 285) || inCoastBounds(x, z));
  if (amphibiousArea || (def?.waterOnly && vehicleWater(x, z)))
    return !world.colliders.some(
      (c) =>
        !c.disabled &&
        Math.abs(x - c.x) < c.w + r &&
        Math.abs(z - c.z) < c.d + r,
    );
  return !def?.waterOnly && world.canMove(x, z, r);
}
