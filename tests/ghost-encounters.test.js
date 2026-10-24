import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GHOST_ASSETS } from "../src/ghost-assets.js";
import { ghostScheduled, amphibiousMove } from "../src/ghost-encounters.js";

test("every supplied rigged asset contains four valid animation clips", () => {
  assert.equal(Object.keys(GHOST_ASSETS).length, 24);
  for (const cfg of Object.values(GHOST_ASSETS)) {
    const bytes = readFileSync(
      new URL(`../public/models/ghosts/${cfg.file}.glb`, import.meta.url),
    );
    const gltf = JSON.parse(
      bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
    );
    assert.deepEqual(gltf.animations.map((a) => a.name).sort(), [
      "Attack",
      "Death",
      "Idle",
      "Walk",
    ]);
    for (const clip of gltf.animations) {
      assert.ok(clip.channels.length > 0);
      for (const channel of clip.channels) {
        assert.ok(gltf.nodes[channel.target.node]);
        assert.ok(
          gltf.accessors[clip.samplers[channel.sampler].input].max[0] > 0,
        );
      }
    }
  }
});

test("locals and Kliwon guests have mutually exclusive night schedules", () => {
  for (const isNight of [false, true])
    for (const isKliwon of [false, true]) {
      const state = { isNight, isKliwon };
      assert.equal(ghostScheduled({}, state), isNight && !isKliwon);
      assert.equal(
        ghostScheduled({ global: true }, state),
        isNight && isKliwon,
      );
    }
});

test("amphibious movement permits river water but preserves obstacles and land boundaries", () => {
  const world = {
    canMove: (x, z) => x < 143 && x > 0 && Math.abs(z) < 285,
    colliders: [{ x: 155, z: 0, w: 2, d: 2 }],
  };
  assert.equal(amphibiousMove(world, 155, 20), true);
  assert.equal(amphibiousMove(world, 140, 20), true);
  assert.equal(amphibiousMove(world, 155, 0), false);
  assert.equal(amphibiousMove(world, 155, 400), false);
  assert.equal(amphibiousMove(world, -400, 20), false);
});
