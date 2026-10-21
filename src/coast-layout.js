// Shared locations keep buildings, NPCs, interactions and quest markers aligned.
export const COAST_HOUSES = [
  [-30, 320],
  [-28, 338],
  [-28, 370],
  [-8, 382],
  [-27, 410],
];
export const AUCTION = { x: -6, z: 321 };
export const CAPTAIN = { x: AUCTION.x, z: 335 };
export const FOOD_STALL = { x: 5, z: 365 };
export const WARUNG = { x: FOOD_STALL.x, z: 371 };
export const DOCK_HEIGHT = 0.65;
export const COAST_PIERS = [
  {
    x: 74,
    z: 330,
    width: 28,
    rampStart: 56,
    rampEnd: 60,
    startY: 0.01,
    endY: DOCK_HEIGHT,
  },
  {
    x: 165,
    z: 420,
    width: 14,
    rampStart: 172,
    rampEnd: 176,
    startY: DOCK_HEIGHT,
    endY: 0.01,
  },
];
export function coastGroundHeight(x, z) {
  for (const p of COAST_PIERS) {
    if (Math.abs(z - p.z) > 4) continue;
    if (x >= p.rampStart && x <= p.rampEnd)
      return (
        p.startY +
        ((p.endY - p.startY) * (x - p.rampStart)) / (p.rampEnd - p.rampStart)
      );
    if (Math.abs(x - p.x) <= p.width / 2) return DOCK_HEIGHT;
  }
  return 0;
}
