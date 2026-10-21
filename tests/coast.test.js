import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { freshState, GameState } from "../src/state.js";
import { GHOSTS } from "../src/data.js";
import {
  freshCoast,
  restoreCoast,
  COAST_PARTS,
  collectCoastPart,
  repairLighthouse,
  deliverFishermen,
  claimCoastReward,
  coastLand,
  coastWater,
  DOCKS,
} from "../src/coast-rules.js";
import { makeCoastAsset, makeButoIjo } from "../src/coast-models.js";
test("coastal quest order and rewards cannot be repeated", () => {
  const d = freshState(),
    start = d.coins;
  assert.equal(collectCoastPart(d.coast, "lens"), false);
  assert.equal(repairLighthouse(d), false);
  assert.equal(deliverFishermen(d, ["darto"]), false);
  d.coast.started = true;
  for (const p of COAST_PARTS) {
    assert.equal(collectCoastPart(d.coast, p.id), true);
    assert.equal(collectCoastPart(d.coast, p.id), false);
  }
  assert.equal(repairLighthouse(d), true);
  assert.equal(repairLighthouse(d), false);
  assert.equal(d.coins, start + 100);
  assert.equal(deliverFishermen(d, ["darto", "fake", "darto"]), true);
  assert.equal(d.coast.boatOwned, false);
  assert.equal(deliverFishermen(d, ["seno"]), true);
  assert.equal(deliverFishermen(d, ["seno"]), false);
  assert.equal(d.coast.boatOwned, true);
  assert.equal(d.coins, start + 250);
  assert.equal(claimCoastReward(d), false);
  d.coast.relic = d.coast.butoDefeated = true;
  assert.equal(claimCoastReward(d), true);
  assert.equal(claimCoastReward(d), false);
  assert.equal(d.coins, start + 500);
});
test("land, piers and sea boundaries keep boats off land and walkers off sea", () => {
  for (const p of DOCKS) {
    assert.ok(coastLand(p.x, p.z, 0.55));
    assert.ok(coastWater(p.boatX, p.boatZ, 1.5));
  }
  assert.ok(coastLand(20, 335));
  assert.ok(coastLand(190, 420));
  assert.equal(coastWater(190, 420), false);
  assert.equal(coastWater(30, 440), false);
  assert.equal(coastLand(133, 373), false);
  assert.ok(coastWater(133, 373));
  assert.equal(coastWater(300, 500), false);
  assert.equal(coastLand(-100, 400), false);
});
test("legacy and sea saves recover without losing coastal checkpoints", () => {
  assert.deepEqual(restoreCoast(null), freshCoast());
  assert.deepEqual(restoreCoast({ parts: ["lens", "lens", "fake"] }).parts, [
    "lens",
  ]);
  const d = freshState();
  d.coast = restoreCoast({ completed: true });
  d.x = 133;
  d.z = 373;
  const state = new GameState({ getItem: () => JSON.stringify(d) });
  assert.ok(state.data.coast.completed);
  assert.equal(state.data.x, 84);
  assert.equal(state.data.z, 330);
  d.x = 190;
  d.z = 420;
  assert.equal(new GameState({ getItem: () => JSON.stringify(d) }).data.z, 420);
});
test("Buto Ijo is a single green giant and portable assets match runtime triangles", () => {
  assert.equal(GHOSTS.filter((g) => g.id === "buto-ijo").length, 1);
  assert.equal(GHOSTS.find((g) => g.id === "buto-ijo").copies, 1);
  const giant = makeButoIjo(),
    size = new THREE.Box3().setFromObject(giant).getSize(new THREE.Vector3());
  assert.ok(size.y >= 7 && size.y < 8);
  assert.ok(giant.userData.own.color.g > giant.userData.own.color.r);
  for (const [id, slug] of [
    ["house", "rumah-panggung"],
    ["lighthouse", "mercusuar"],
    ["boat", "perahu-motor"],
    ["buto", "buto-ijo"],
  ]) {
    const f = readFileSync(
      new URL(
        "../public/models/karang-tirta/" + slug + ".glb",
        import.meta.url,
      ),
    );
    const json = JSON.parse(f.toString("utf8", 20, 20 + f.readUInt32LE(12)));
    assert.equal(json.meshes.length, 1);
    const n = json.meshes[0].primitives.reduce(
      (s, p) => s + json.accessors[p.indices].count / 3,
      0,
    );
    assert.equal(n, makeCoastAsset(id).userData.triangles);
    assert.ok(n < 2000);
  }
});
