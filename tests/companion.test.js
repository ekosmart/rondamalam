import test from "node:test";
import assert from "node:assert/strict";
import { companionDamage } from "../src/combat-rules.js";
test("companion damage leaves a living enemy below 25 percent, even for an awakened burst", () => {
  const e = { active: true, maxHp: 180, hp: 180 };
  e.hp -= companionDamage(e, 10000);
  assert.ok(e.hp > 0 && e.hp / e.maxHp < 0.25);
  assert.equal(companionDamage(e, 100), 0);
  for (const hp of [45, 44, 1, 0])
    assert.equal(companionDamage({ ...e, hp }, 100), 0);
  assert.equal(companionDamage({ ...e, hp: 100, active: false }, 100), 0);
  assert.equal(companionDamage({ ...e, hp: 100 }, 8), 8);
});
