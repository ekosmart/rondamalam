import test from "node:test";
import assert from "node:assert/strict";
import {
  enemyStats,
  scaleEnemy,
  effectiveDamage,
  fallDamage,
} from "../src/combat-rules.js";
import { GameState, freshState } from "../src/state.js";
import { parseSaveBackup, saveBackup } from "../src/save-transfer.js";
test("enemy scaling preserves damage ratio and applies exactly once per level", () => {
  const e = { def: { hp: 100, power: 10 }, maxHp: 100, hp: 25, incident: {} };
  scaleEnemy(e, 6);
  assert.equal(e.level, 6);
  assert.equal(e.maxHp, 180);
  assert.equal(e.hp, 45);
  assert.equal(e.power, 14.5);
  scaleEnemy(e, 6);
  assert.equal(e.hp, 45);
  scaleEnemy(e, 7);
  assert.equal(e.hp / e.maxHp, 0.25);
  assert.equal(e.incident.level, 7);
  assert.equal(e.incident.hp, e.hp);
});
test("physical missile and falling damage cannot harm spirits; plasma can", () => {
  const spirit = { human: false },
    human = { human: true },
    zombie = { incident: {} };
  assert.equal(effectiveDamage(spirit, 62, "physical"), 0);
  assert.equal(effectiveDamage(spirit, 40, "energy"), 40);
  assert.equal(effectiveDamage(human, 62, "physical"), 62);
  assert.equal(effectiveDamage(zombie, 62, "physical"), 62);
  assert.equal(fallDamage(1), 0);
  assert.equal(fallDamage(12), 80);
  assert.equal(fallDamage(70), 280);
});
test("Sembrani and tractor upgrade require quest completion and cannot be bought", () => {
  const g = new GameState(null);
  g.data.coins = 5000;
  assert.equal(g.buyMount("sembrani"), false);
  g.data.quests["farm-care"] = "active";
  g.data.stats.farmCare = 4;
  assert.equal(g.claimQuest("farm-care"), false);
  g.data.stats.farmCare = 5;
  assert.equal(g.claimQuest("farm-care"), true);
  assert.equal(g.data.mount, "sembrani");
  assert.equal(g.claimQuest("farm-care"), false);
  g.data.quests["et-tractor"] = "active";
  g.data.stats.ufoDown = 3;
  assert.equal(g.claimQuest("et-tractor"), false);
  g.data.quests["et-home"] = "done";
  g.data.mounts.push("ufo");
  assert.equal(g.claimQuest("et-tractor"), true);
  assert.ok(g.data.incidents.tech.ufoTractor);
});
test("save transfer preserves progression and migrates old incident fields", () => {
  const d = freshState();
  d.level = 12;
  d.coins = 4321;
  d.mounts.push("sembrani", "ufo");
  d.rural.cared = ["animal-2"];
  d.incidents.tech.ufoTractor = true;
  const read = parseSaveBackup(saveBackup(d));
  assert.equal(read.coins, 4321);
  assert.ok(read.mounts.includes("sembrani"));
  assert.equal(read.incidents.tech.ufoTractor, true);
  delete d.rural;
  delete d.incidents;
  const old = parseSaveBackup(JSON.stringify(d));
  assert.deepEqual(old.rural.cared, []);
  assert.equal(old.incidents.tech.ufoTractor, false);
});
test("malformed imported saves are rejected before touching storage", () => {
  assert.throws(() => parseSaveBackup("{broken"));
  assert.throws(() => parseSaveBackup("{}"));
  assert.throws(() => parseSaveBackup("x".repeat(1_000_001)));
  const d = freshState();
  d.stats.farmCare = "<img onerror=x>";
  assert.throws(() => parseSaveBackup(JSON.stringify(d)));
  d.stats.farmCare = 1;
  d.level = -4;
  assert.throws(() => parseSaveBackup(JSON.stringify(d)));
});
