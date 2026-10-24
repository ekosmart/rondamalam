import test from "node:test";
import assert from "node:assert/strict";
import { GameState, captureChance } from "../src/state.js";
import { GHOSTS, POSTS } from "../src/data.js";
const store = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k), setItem: (k, v) => m.set(k, v) };
};
const state = () => new GameState(store());
test("night patrol rewards each post once and gives completion reward", () => {
  const s = state(),
    coins = s.data.coins;
  for (const p of POSTS) assert.equal(s.ring(p.id), true);
  assert.equal(s.data.coins, coins + 150);
  assert.equal(s.data.stats.bestPatrol, 5);
  assert.equal(s.ring(POSTS[0].id), false);
  assert.equal(s.data.coins, coins + 150);
});
test("daytime cannot ring; sunset opens a fresh patrol", () => {
  const s = state();
  s.data.time = 1079.99;
  s.data.posts = ["kampung"];
  assert.equal(s.ring("pasar"), false);
  assert.equal(s.advance(0.05), "dusk");
  assert.deepEqual(s.data.posts, []);
  assert.equal(s.data.night, 2);
});
test("dawn restores health without ending the game", () => {
  const s = state();
  s.data.time = 359.99;
  s.data.hp = 7;
  assert.equal(s.advance(0.05), "dawn");
  assert.equal(s.data.hp, s.maxHp);
  assert.equal(s.isNight, false);
});
test("death returns to safe spawn and charges bounded coin penalty", () => {
  const s = state();
  s.data.coins = 200;
  s.data.hp = 0;
  s.data.x = 210;
  s.data.z = -150;
  s.data.riding = true;
  assert.equal(s.respawn(), 30);
  assert.equal(s.data.coins, 170);
  assert.equal(s.data.hp, 100);
  assert.equal(s.data.x, 0);
  assert.equal(s.data.z, 12);
  assert.equal(s.data.riding, false);
  s.data.coins = 4;
  assert.equal(s.respawn(), 4);
  assert.equal(s.data.coins, 0);
});
test("crafting spends exact resources, equips one weapon, rejects duplicates", () => {
  const s = state();
  assert.equal(s.craft("keris"), true);
  assert.equal(s.data.coins, 30);
  assert.equal(s.data.iron, 1);
  assert.equal(s.data.essence, 0);
  assert.equal(s.data.weapon, "keris");
  assert.equal(s.data.stats.crafted, 1);
  assert.equal(s.craft("keris"), false);
  assert.equal(s.craft("tombak"), false);
  assert.equal(s.data.coins, 30);
});
test("bottle crafting cannot create negative resources", () => {
  const s = state();
  s.data.glass = 2;
  s.data.herb = 1;
  s.data.coins = 15;
  assert.equal(s.craft("bottle"), true);
  assert.equal(s.data.bottles, 9);
  assert.equal(s.data.coins, 0);
  assert.equal(s.craft("bottle"), false);
});
test("capture threshold is 25% and improves at lower health", () => {
  assert.equal(captureChance(26, 100), 0);
  assert.equal(captureChance(25, 100), 0.68);
  assert.ok(captureChance(1, 100) > 0.9);
});
test("capture adds unique collection entry and equips first companion", () => {
  const s = state();
  s.catchGhost("pocong");
  s.catchGhost("pocong");
  assert.equal(s.data.collection.length, 1);
  assert.equal(s.data.stats.captured, 2);
  assert.equal(s.data.companion, "pocong");
  assert.equal(s.catchGhost("unknown"), false);
});
test("awakening requires level cap, materials, and is irreversible", () => {
  const s = state();
  s.catchGhost("kuntilanak");
  assert.equal(s.awaken("kuntilanak"), false);
  s.addCompanionXp(1000);
  s.data.coins = 250;
  s.data.essence = 9;
  s.data.iron = 7;
  assert.equal(s.companion.level, 5);
  assert.equal(s.awaken("kuntilanak"), true);
  assert.equal(s.companion.awakened, true);
  assert.equal(s.data.coins, 50);
  assert.equal(s.awaken("kuntilanak"), false);
});
test("quest rewards cannot be claimed before objective or twice", () => {
  const s = state();
  assert.equal(s.claimQuest("patrol"), false);
  s.data.stats.bestPatrol = 5;
  assert.equal(s.claimQuest("patrol"), true);
  const coins = s.data.coins;
  assert.equal(s.claimQuest("patrol"), false);
  assert.equal(s.data.coins, coins);
});
test("mount collection and stat upgrades charge only when allowed", () => {
  const s = state();
  s.data.coins = 1000;
  assert.equal(s.buyMount("bmx"), true);
  assert.equal(s.data.coins, 760);
  s.buyMount("bmx");
  assert.equal(s.data.coins, 760);
  assert.equal(s.upgrade("health"), true);
  assert.equal(s.maxHp, 125);
  assert.equal(s.data.hp, 125);
  assert.equal(s.upgrade("bad"), false);
});
test("local save preserves inventory, quests, companions, and world time", () => {
  const storage = store(),
    s = new GameState(storage);
  s.catchGhost("pocong");
  s.data.x = -70;
  s.data.time = 840;
  s.data.quests.catch = "active";
  s.save();
  const loaded = new GameState(storage);
  assert.equal(loaded.data.x, -70);
  assert.equal(loaded.data.time, 840);
  assert.equal(loaded.companion.id, "pocong");
  assert.equal(loaded.data.quests.catch, "active");
});
test("broken saves recover, and invalid content ids are removed", () => {
  const storage = { getItem: () => "{broken" };
  const s = new GameState(storage);
  assert.equal(s.data.hp, 100);
  const storage2 = {
    getItem: () =>
      JSON.stringify({
        version: 1,
        posts: ["bad"],
        weapons: ["missing"],
        weapon: "missing",
        collection: [],
        companion: "bad",
        time: null,
      }),
  };
  const t = new GameState(storage2);
  assert.deepEqual(t.data.posts, []);
  assert.equal(t.data.companion, null);
  assert.equal(t.weapon.id, "kentongan");
  assert.equal(t.data.time, 1152);
});
test("ghost roster contains the PRD roster and separate homes outside the safe zone", () => {
  assert.equal(GHOSTS.length, 28);
  assert.equal(GHOSTS.filter((g) => g.global).length, 9);
  for (const g of GHOSTS) {
    assert.ok(Math.hypot(g.x, g.z) > g.radius + 23);
    assert.ok(g.hp > 0);
    assert.ok(g.radius <= 45);
  }
});
