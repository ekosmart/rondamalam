import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { FARM_ASSETS } from "../src/farm-assets.js";
import { FARM_VOICES, farmVoice } from "../src/farm-audio.js";
import { GameState } from "../src/state.js";
import { MOUNTS } from "../src/data.js";
test("all supplied farm models preserve binary contents and articulating nodes", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../assets/source/farm/manifest.json", import.meta.url),
    ),
  );
  for (const [kind, cfg] of Object.entries(FARM_ASSETS)) {
    const b = readFileSync(
      new URL(`../public/models/farm/${cfg.file}.glb`, import.meta.url),
    );
    assert.equal(b.toString("ascii", 0, 4), "glTF");
    assert.equal(b.readUInt32LE(8), b.length);
    assert.equal(
      createHash("sha256").update(b).digest("hex"),
      manifest[`${cfg.file}.glb`],
    );
    const gltf = JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
    assert.ok(
      gltf.nodes.some((n) =>
        (kind === "barn"
          ? /^door_/
          : kind === "tractor"
            ? /^wheel_/
            : /^leg_/
        ).test(n.name),
      ),
    );
  }
});
test("eight animal calls and diesel are finite, distinct and end without clicks", () => {
  const signatures = new Set();
  for (const id of Object.keys(FARM_VOICES)) {
    const a = farmVoice(id),
      rms = Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
    assert.ok(a.every((v) => Number.isFinite(v) && Math.abs(v) < 1));
    assert.ok(rms > 0.02 && rms < 0.5, id);
    assert.ok(Math.abs(a[0]) < 0.001 && Math.abs(a.at(-1)) < 0.005, id);
    signatures.add(a.slice(1000, 1020).join(","));
  }
  assert.equal(signatures.size, 9);
  assert.equal(farmVoice("unknown").length, 0);
});
test("horse and tractor purchases respect price, ownership and save restoration", () => {
  const storage = {
    value: null,
    getItem() {
      return this.value;
    },
    setItem(k, v) {
      this.value = v;
    },
  };
  const s = new GameState(storage);
  s.data.coins = 1000;
  assert.ok(s.buyMount("horse"));
  assert.equal(s.data.coins, 640);
  assert.ok(s.buyMount("tractor"));
  assert.equal(s.data.coins, 20);
  assert.ok(s.buyMount("tractor"));
  assert.equal(s.data.coins, 20);
  assert.ok(!s.buyMount("ufo"));
  s.save();
  const restored = new GameState(storage);
  assert.equal(restored.data.mount, "tractor");
  assert.ok(
    ["horse", "tractor"].every((id) => restored.data.mounts.includes(id)),
  );
  assert.equal(MOUNTS[0].id, "onthel");
});
