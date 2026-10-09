import test from "node:test";
import assert from "node:assert/strict";
import { GameState, freshState } from "../src/state.js";
import {
  trade,
  transferStorage,
  restoreFrontier,
} from "../src/frontier-rules.js";
import { rollFish } from "../src/fishing-data.js";
import { effectiveDamage } from "../src/combat-rules.js";
const storage = () => {
  let data;
  return { getItem: () => data, setItem: (_, v) => (data = v) };
};
test("Kopdes transactions are atomic, use correct prices and reject invalid quantities", () => {
  const d = freshState();
  assert.equal(trade(d, "rod-upgrade", "buy"), false);
  assert.equal(trade(d, "rod", "buy"), true);
  assert.equal(d.coins, 95);
  assert.equal(trade(d, "rod", "buy"), false);
  assert.equal(trade(d, "bait", "buy", 5), true);
  assert.equal(d.coins, 80);
  assert.equal(trade(d, "bait", "sell", 3), true);
  assert.equal(d.coins, 83);
  for (const bad of [NaN, Infinity, -1, 0, 1.5, 101])
    assert.equal(trade(d, "bait", "buy", bad), false);
  assert.equal(trade(d, "bait", "sell", 3), false);
  assert.equal(d.frontier.bag.bait, 2);
  assert.equal(d.coins, 83);
});
test("home storage conserves money and materials, never allows negative transfers", () => {
  const d = freshState();
  assert.equal(transferStorage(d, "coins", "deposit", 100), true);
  assert.equal(d.coins, 60);
  assert.equal(d.frontier.storage.coins, 100);
  assert.equal(transferStorage(d, "coins", "withdraw", 101), false);
  assert.equal(transferStorage(d, "coins", "withdraw", 30), true);
  assert.equal(d.coins, 90);
  assert.equal(transferStorage(d, "herb", "deposit", 4), true);
  assert.equal(d.herb, 1);
  for (const bad of [NaN, Infinity, -1, 0, 1.5])
    assert.equal(transferStorage(d, "coins", "deposit", bad), false);
});
test("legacy saves gain frontier defaults while storage and collection survive save and death", () => {
  const mem = storage(),
    g = new GameState(mem);
  delete g.data.frontier;
  g.save();
  const s = new GameState(mem);
  assert.equal(s.data.frontier.rod, 0);
  transferStorage(s.data, "coins", "deposit", 100);
  s.data.frontier.dinos = ["trex"];
  s.data.frontier.spaceCollected = ["moon"];
  s.data.frontier.rod = 2;
  s.save();
  const n = new GameState(mem);
  assert.equal(n.data.frontier.storage.coins, 100);
  n.respawn();
  assert.equal(n.data.frontier.storage.coins, 100);
  assert.deepEqual(n.data.frontier.dinos, ["trex"]);
  assert.deepEqual(n.data.frontier.spaceCollected, ["moon"]);
  assert.equal(n.data.frontier.rod, 2);
});
test("rocket and GyroBall rewards require progress and cannot repeat", () => {
  const g = new GameState(storage());
  g.data.quests["elon-orbit"] = "active";
  assert.equal(g.claimQuest("elon-orbit"), false);
  g.data.stats.aliensCaptured = 2;
  assert.equal(g.claimQuest("elon-orbit"), true);
  assert.equal(g.data.frontier.spaceUnlocked, true);
  assert.equal(g.claimQuest("elon-orbit"), false);
  g.data.quests["john-survey"] = "active";
  g.data.stats.dinoTagged = 2;
  assert.equal(g.claimQuest("john-survey"), true);
  assert.ok(g.data.mounts.includes("gyroball"));
  const fresh = new GameState(storage());
  assert.equal(fresh.buyMount("gyroball"), false);
});
test("fishing upgrade increases rare catch window and dinosaurs accept physical damage", () => {
  const counts = [1, 2].map(
    (rod) =>
      Array.from({ length: 1000 }, (_, i) =>
        rollFish({ rod, night: false, posts: [] }, () => i / 1000),
      ).filter((f) => f.id === "goldfish").length,
  );
  assert.ok(counts[1] > counts[0]);
  assert.equal(effectiveDamage({ dino: true }, 60, "physical"), 60);
  assert.equal(effectiveDamage({}, 60, "physical"), 0);
});
