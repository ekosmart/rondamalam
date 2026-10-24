import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { VEHICLE_ASSETS } from "../src/vehicle-assets.js";
import { VEHICLE_MOUNTS, VEHICLE_QUESTS } from "../src/vehicle-data.js";
import {
  freshVehicles,
  restoreVehicles,
  acceptVehicleQuest,
  collectVehiclePoint,
  claimVehicleQuest,
  startOjol,
  finishOjol,
  ojolFare,
  vehicleCanMove,
} from "../src/vehicle-rules.js";
import { VEHICLE_SOUNDS, vehicleSound } from "../src/vehicle-audio.js";
import { GameState } from "../src/state.js";
test("all nine original models retain binary integrity and animation clips", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../assets/source/vehicles/manifest.json", import.meta.url),
    ),
  );
  for (const cfg of Object.values(VEHICLE_ASSETS)) {
    const b = readFileSync(
      new URL(`../public/models/vehicles/${cfg.file}.glb`, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(b).digest("hex"),
      manifest[cfg.file + ".glb"],
    );
    const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)));
    assert.ok(j.animations.some((a) => a.name === cfg.drive));
  }
});
test("quest rewards cannot be bought or claimed without accepted, unique objectives", () => {
  const s = new GameState(),
    d = s.data;
  d.coins = 9999;
  for (const m of VEHICLE_MOUNTS) {
    if (m.questOnly) assert.equal(s.buyMount(m.id), false);
    else {
      const before = d.coins;
      assert.equal(s.buyMount(m.id), true);
      assert.equal(d.coins, before - m.cost);
    }
  }
  for (const q of VEHICLE_QUESTS) {
    assert.equal(collectVehiclePoint(d, q.id, 0), false);
    assert.equal(claimVehicleQuest(d, q.id), false);
    assert.equal(acceptVehicleQuest(d, q.id), true);
    if (q.kind === "trail")
      assert.equal(collectVehiclePoint(d, q.id, 1), false);
    for (let i = 0; i < q.points.length; i++) {
      assert.equal(collectVehiclePoint(d, q.id, i), true);
      assert.equal(collectVehiclePoint(d, q.id, i), false);
    }
    assert.equal(claimVehicleQuest(d, q.id), true);
    assert.equal(claimVehicleQuest(d, q.id), false);
    assert.equal(d.mounts.filter((id) => id === q.mount).length, 1);
  }
});
test("save restores quest progress and onboard order without paying it again", () => {
  const storage = {
    value: null,
    getItem() {
      return this.value;
    },
    setItem(k, v) {
      this.value = v;
    },
  };
  const s = new GameState(storage),
    d = s.data;
  acceptVehicleQuest(d, "naga");
  collectVehiclePoint(d, "naga", 6);
  startOjol(d.vehicles);
  assert.equal(finishOjol(d), 0);
  d.vehicles.job.phase = "dropoff";
  const pay = ojolFare(d.vehicles.job),
    before = d.coins;
  s.save();
  const restored = new GameState(storage);
  assert.deepEqual(restored.data.vehicles.collected.naga, [6]);
  assert.equal(finishOjol(restored.data), pay);
  assert.equal(finishOjol(restored.data), 0);
  assert.equal(restored.data.coins, before + pay);
  assert.equal(restored.data.vehicles.trips, 1);
  const clean = restoreVehicles({
    collected: { naga: [0, 0, 99, -1] },
    job: { from: "x", to: "y", phase: "dropoff" },
    trips: -3,
  });
  assert.deepEqual(clean.collected.naga, [0]);
  assert.equal(clean.job, null);
  assert.equal(clean.trips, 0);
});
test("Ojol routes rotate with distinct destinations and only one active order", () => {
  const s = freshVehicles();
  for (let i = 0; i < 36; i++) {
    s.trips = i;
    assert.equal(startOjol(s), true);
    assert.notEqual(s.job.from, s.job.to);
    assert.ok(ojolFare(s.job) > 20);
    assert.equal(startOjol(s), false);
    s.job = null;
  }
});
test("amphibious shoreline is continuous; raft stays in water and honors obstacles", () => {
  const world = {
    colliders: [],
    canMove(x) {
      return x < 142 || x > 168;
    },
  };
  for (let x = 139; x < 171; x += 0.25)
    assert.equal(vehicleCanMove(world, "buaya-putih", x, 75), true, `${x}`);
  assert.equal(vehicleCanMove(world, "getek-bambu", 155, 75), true);
  assert.equal(vehicleCanMove(world, "getek-bambu", 135, 75), false);
  world.colliders.push({ x: 155, z: 75, w: 2, d: 2 });
  assert.equal(vehicleCanMove(world, "getek-bambu", 155, 75), false);
});
test("nine synthesized vehicle voices are distinct, finite and have click-free edges", () => {
  const hashes = new Set();
  for (const id of Object.keys(VEHICLE_SOUNDS)) {
    const a = vehicleSound(id);
    assert.ok(a.every((v) => Number.isFinite(v) && Math.abs(v) < 1));
    assert.ok(a.some((v) => Math.abs(v) > 0.03));
    assert.ok(Math.abs(a[0]) < 0.001 && Math.abs(a.at(-1)) < 0.005);
    hashes.add(
      createHash("sha256").update(Buffer.from(a.buffer)).digest("hex"),
    );
  }
  assert.equal(hashes.size, 9);
  assert.equal(vehicleSound("none").length, 0);
});
