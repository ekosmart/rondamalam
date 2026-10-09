import test from "node:test";
import assert from "node:assert/strict";
import {
  WEATHER,
  weatherAt,
  freshWeather,
  restoreWeather,
  groundFactor,
} from "../src/weather-rules.js";
import {
  FISH,
  rollFish,
  recordFish,
  trophyEligible,
} from "../src/fishing-data.js";
import { GameState, freshState } from "../src/state.js";
import { trade, transferStorage } from "../src/frontier-rules.js";
import { nightPlan } from "../src/incident-rules.js";
const posts = ["a", "b", "c", "d", "e"];
test("eleven weather states form complete repeatable bags independent of invasion RNG", () => {
  assert.equal(Object.keys(WEATHER).length, 11);
  for (const seed of [1, 211, 9219]) {
    const plan = nightPlan(seed, 9);
    for (let block = 0; block < 4; block++) {
      const bag = Array.from({ length: 11 }, (_, i) =>
        weatherAt(seed, block * 11 + i),
      );
      assert.equal(new Set(bag).size, 11);
      assert.deepEqual(
        bag,
        Array.from({ length: 11 }, (_, i) => weatherAt(seed, block * 11 + i)),
      );
    }
    assert.deepEqual(nightPlan(seed, 9), plan);
  }
});
test("flood and snow slow all ground movement without slowing flight", () => {
  assert.equal(groundFactor(freshWeather()), 1);
  for (const [w, factor] of [
    [{ flood: 1, snow: 0 }, 0.52],
    [{ flood: 0, snow: 1 }, 0.7],
    [{ flood: 1, snow: 1 }, 0.52],
  ]) {
    assert.equal(groundFactor(w), factor);
    assert.equal(groundFactor(w, true), 1);
  }
});
test("weather save restores safe bounds and preserves cycle and fires", () => {
  const w = restoreWeather({
    seed: 3,
    index: 14,
    type: "thunder",
    elapsed: 32,
    health: { a: 72 },
    fires: [{ key: "house:a", life: 8 }],
  });
  assert.equal(w.type, "thunder");
  assert.equal(w.index, 14);
  assert.equal(w.elapsed, 32);
  assert.equal(w.fires[0].life, 8);
  assert.equal(w.health.a, 72);
  assert.equal(
    restoreWeather({ type: "wrong", snow: 4, flood: -1 }).type,
    "clear",
  );
  assert.equal(restoreWeather({ snow: 4 }).snow, 1);
  assert.equal(restoreWeather({ flood: -1 }).flood, 0);
});
test("ten species have individual random weight and length, exactly one legendary", () => {
  assert.equal(FISH.length, 10);
  assert.equal(new Set(FISH.map((f) => f.id)).size, 10);
  assert.equal(FISH.filter((f) => f.legendary).length, 1);
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    let n = 0;
    const c = rollFish(
      { rod: 3, night: true, posts },
      () => [i / 2000, 0.42, 0.73][n++],
    );
    const f = FISH.find((f) => f.id === c.id);
    seen.add(c.id);
    assert.ok(c.kg >= f.min && c.kg <= f.max);
    assert.ok(c.cm >= f.cm[0] && c.cm <= f.cm[1]);
  }
  assert.equal(seen.size, 10);
});
test("every missing trophy requirement excludes all large and legendary fish", () => {
  for (const context of [
    { rod: 1, night: true, posts },
    { rod: 2, night: true, posts },
    { rod: 3, night: false, posts },
    { rod: 3, night: true, posts: posts.slice(1) },
    { rod: 3, night: true, posts: ["a", "a", "a", "a", "a"] },
  ]) {
    assert.equal(trophyEligible(context), false);
    for (let i = 0; i < 1000; i++)
      assert.ok(
        !FISH.find((f) => f.id === rollFish(context, () => i / 1000).id).large,
      );
  }
  assert.equal(trophyEligible({ rod: 3, night: true, posts }), true);
});
test("Bowo quest counts actual catches after acceptance, rewards level 3 once, shop cannot bypass it", () => {
  const g = new GameState(null),
    d = g.data;
  recordFish(d, { id: "fish", kg: 0.6, cm: 25 });
  assert.equal(d.stats.anglerCatches, 0);
  d.quests["bowo-tirta"] = "active";
  for (let i = 0; i < 5; i++) recordFish(d, { id: "wader", kg: 0.1, cm: 12 });
  assert.equal(g.claimQuest("bowo-tirta"), false);
  recordFish(d, { id: "lele", kg: 1.2, cm: 35 });
  assert.equal(g.claimQuest("bowo-tirta"), true);
  assert.equal(d.frontier.rod, 3);
  assert.equal(g.claimQuest("bowo-tirta"), false);
  assert.equal(trade(d, "rod-upgrade", "buy"), false);
});
test("catch records survive selling, storage and legacy save reload without duplicating fish", () => {
  const d = freshState();
  recordFish(d, { id: "arapaima", kg: 81, cm: 223 });
  assert.equal(transferStorage(d, "arapaima", "deposit", 1), true);
  assert.equal(trade(d, "arapaima", "sell"), false);
  assert.equal(transferStorage(d, "arapaima", "withdraw", 1), true);
  assert.equal(trade(d, "arapaima", "sell"), true);
  assert.equal(d.frontier.bag.arapaima, 0);
  assert.equal(d.frontier.fishRecords.arapaima.kg, 81);
  const s = new GameState({ getItem: () => JSON.stringify(d) });
  assert.equal(s.data.frontier.fishLog[0].cm, 223);
  delete d.weather;
  delete d.frontier.fishRecords;
  delete d.frontier.fishLog;
  d.frontier.bag.fish = 9;
  d.frontier.bag.goldfish = 2;
  const legacy = new GameState({ getItem: () => JSON.stringify(d) });
  assert.equal(legacy.data.frontier.bag.fish, 9);
  assert.equal(legacy.data.frontier.bag.goldfish, 2);
  assert.deepEqual(legacy.data.frontier.fishLog, []);
  assert.equal(legacy.data.weather.type, "clear");
});
