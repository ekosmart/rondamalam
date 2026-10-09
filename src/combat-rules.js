export const isSpirit = (enemy) =>
  !enemy.human && !enemy.incident && !enemy.dino;
export function effectiveDamage(enemy, amount, type = "arcane") {
  return type === "physical" && isSpirit(enemy) ? 0 : Math.max(0, amount);
}
export function enemyStats(baseHp, basePower, level) {
  const l = Math.max(1, Math.floor(Number(level) || 1));
  return {
    level: l,
    maxHp: Math.round(baseHp * (1 + (l - 1) * 0.16)),
    power: basePower * (1 + (l - 1) * 0.09),
  };
}
export function scaleEnemy(enemy, level) {
  const l = Math.max(1, Math.floor(Number(level) || 1));
  if (enemy.level === l) return;
  const fraction = Math.max(
    0,
    Math.min(1, enemy.hp / (enemy.maxHp || enemy.def.hp)),
  );
  enemy.baseHp ??= enemy.def.hp;
  enemy.basePower ??=
    enemy.def.power ?? (enemy.human ? 10 : enemy.def.global ? 18 : 9);
  Object.assign(enemy, enemyStats(enemy.baseHp, enemy.basePower, l));
  enemy.hp = fraction * enemy.maxHp;
  const record = enemy.incident || enemy.raid;
  if (record) {
    record.hp = enemy.hp;
    record.maxHp = enemy.maxHp;
    record.level = enemy.level;
  }
}
export const fallDamage = (height) =>
  Math.min(280, Math.max(0, height - 2) * 8);
