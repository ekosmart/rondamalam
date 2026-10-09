import test from "node:test";
import assert from "node:assert/strict";
import { GameState } from "../src/state.js";
import {
  nightPlan,
  restoreIncidents,
  waveRoster,
  nightMinutes,
} from "../src/incident-rules.js";
const storage = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k), setItem: (k, v) => m.set(k, v) };
};
test("random nights stay deterministic across reload and include all three events plus a quiet night", () => {
  for (const seed of [1, 73, 975, 13987])
    for (let n = 1; n < 31; n += 4) {
      const plans = [0, 1, 2, 3].map((i) => nightPlan(seed, n + i));
      assert.deepEqual(
        new Set(plans.map((p) => p.kind)),
        new Set(["zombie", "alien", "dino", null]),
      );
      for (const p of plans) {
        assert.deepEqual(p, nightPlan(seed, p.night));
        assert.ok(p.start >= 1170 && p.start < 1290);
      }
    }
  assert.ok(nightMinutes(100) > nightMinutes(1200));
});
test("four waves culminate in exactly one giant boss per event", () => {
  for (const type of ["zombie", "alien", "dino"]) {
    for (let i = 1; i <= 3; i++)
      assert.ok(
        !waveRoster(type, i).includes(
          type === "zombie" ? "titan" : type === "dino" ? "rex" : "mothership",
        ),
      );
    assert.equal(
      waveRoster(type, 4).filter(
        (x) =>
          x ===
          (type === "zombie"
            ? "titan"
            : type === "dino"
              ? "rex"
              : "mothership"),
      ).length,
      1,
    );
  }
});
test("older saves get incident defaults without losing progress", () => {
  const store = storage(),
    s = new GameState(store);
  s.data.coins = 345;
  s.data.weapons.push("keris");
  delete s.data.incidents;
  s.save();
  const loaded = new GameState(store);
  assert.equal(loaded.data.coins, 345);
  assert.ok(loaded.data.weapons.includes("keris"));
  assert.equal(loaded.data.incidents.tech.mechaFlight, false);
  assert.deepEqual(restoreIncidents({ tech: { serum: 2 } }, 5).tech.serum, 2);
});
test("quest-only gear cannot be bought or forged and rewards cannot be repeated", () => {
  const s = new GameState(storage());
  assert.equal(s.craft("laras-surya"), false);
  assert.equal(s.buyMount("ufo"), false);
  s.data.quests["william-samples"] = "active";
  s.data.stats.labSamples = 3;
  assert.ok(s.claimQuest("william-samples"));
  assert.equal(s.data.weapon, "laras-surya");
  assert.equal(s.data.incidents.tech.serum, 3);
  const coins = s.data.coins;
  assert.equal(s.claimQuest("william-samples"), false);
  assert.equal(s.data.coins, coins);
  s.data.quests["william-flight"] = "active";
  s.data.stats.zombies = 12;
  assert.equal(s.claimQuest("william-flight"), false);
  s.data.mounts.push("mecha");
  assert.ok(s.claimQuest("william-flight"));
  assert.ok(s.data.incidents.tech.mechaFlight);
  s.data.quests["et-home"] = "active";
  s.data.stats.signalReady = 1;
  assert.equal(s.claimQuest("et-home"), false);
  s.data.quests["et-parts"] = "active";
  s.data.stats.etParts = 3;
  assert.ok(s.claimQuest("et-parts"));
  assert.equal(s.data.incidents.tech.cells, 3);
  assert.ok(s.claimQuest("et-home"));
  assert.ok(s.data.mounts.includes("ufo"));
  assert.ok(s.data.incidents.tech.etDeparted);
});
test("active waves, damaged houses and abductees persist with the same nightly schedule", () => {
  const store = storage(),
    s = new GameState(store),
    d = s.data.incidents;
  d.labBuilt = true;
  d.plan = nightPlan(d.seed, 2);
  d.event = {
    night: 2,
    type: "alien",
    phase: "active",
    wave: 3,
    enemies: [
      {
        id: "2-1",
        kind: "saucer",
        hp: 47,
        x: 10,
        z: 20,
        y: 14,
        captive: "santri",
      },
    ],
  };
  d.residents.santri = { condition: "abducted", shipId: "2-1", x: 80, z: -160 };
  d.houses.home = 22;
  s.save();
  const restored = new GameState(store).data.incidents;
  assert.deepEqual(restored, d);
});
