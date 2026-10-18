import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GameState, freshState } from "../src/state.js";
import {
  freshSpirit,
  restoreSpirit,
  gateReason,
  collectSpiritItem,
  playSpiritNote,
  claimSpiritBlessing,
  spiritStage,
  SPARKS,
  RELICS,
  MELODY,
} from "../src/spirit-rules.js";
import { makeSpiritAsset } from "../src/spirit-models.js";

test("first spirit crossing requires owned Sembrani, all sparks, mounting and Kliwon night", () => {
  const d = freshState();
  assert.ok(gateReason(d));
  d.mounts.push("sembrani");
  d.mount = "sembrani";
  d.riding = true;
  assert.ok(gateReason(d));
  d.spirit.started = true;
  for (const p of SPARKS)
    assert.equal(collectSpiritItem(d.spirit, "sparks", p.id), true);
  assert.equal(gateReason(d), "");
  d.time = 800;
  assert.ok(gateReason(d));
  d.time = 1200;
  d.night = 2;
  assert.ok(gateReason(d));
  d.spirit.crossed = true;
  assert.equal(gateReason(d), "");
  d.riding = false;
  assert.ok(gateReason(d));
});
test("spirit relic and melody gates reject skips and duplicate collections", () => {
  const s = freshSpirit();
  assert.equal(collectSpiritItem(s, "relics", "teratai"), false);
  s.welcomed = true;
  for (const r of RELICS) {
    assert.equal(collectSpiritItem(s, "relics", r.id), true);
    assert.equal(collectSpiritItem(s, "relics", r.id), false);
  }
  assert.equal(collectSpiritItem(s, "relics", "fake"), false);
  assert.equal(playSpiritNote(1, 1), 0);
  assert.equal(playSpiritNote(1, NaN), 0);
  assert.equal(
    MELODY.reduce((n, x) => playSpiritNote(n, x), 0),
    4,
  );
});
test("blessing rewards are one-time and spirit save migration is safe", () => {
  const d = freshState(),
    before = d.coins;
  assert.equal(claimSpiritBlessing(d), false);
  d.spirit.bossDefeated = true;
  assert.equal(claimSpiritBlessing(d), true);
  assert.equal(d.coins, before + 350);
  assert.equal(claimSpiritBlessing(d), false);
  assert.deepEqual(restoreSpirit(null), freshSpirit());
  assert.deepEqual(
    restoreSpirit({ sparks: ["embun", "embun", null, "fake"] }).sparks,
    ["embun"],
  );
  assert.equal(spiritStage(restoreSpirit({ blessed: true })), 8);
  const values = new Map(),
    storage = {
      getItem: (k) => values.get(k),
      setItem: (k, v) => values.set(k, v),
    };
  const state = new GameState(storage);
  state.data.spirit = restoreSpirit({ blessed: true });
  state.save();
  assert.equal(new GameState(storage).data.spirit.blessed, true);
  delete state.data.spirit;
  state.save();
  assert.deepEqual(new GameState(storage).data.spirit, freshSpirit());
});
test("each portable Blender export matches its runtime mesh without unrelated objects", () => {
  for (const [id, slug] of [
    ["palace", "keraton-samudra-sunyi"],
    ["gate", "gerbang-sukma"],
    ["boss", "penjaga-palung"],
  ]) {
    const file = readFileSync(
      new URL(
        "../public/models/spirit-realm/" + slug + ".glb",
        import.meta.url,
      ),
    );
    assert.equal(file.toString("ascii", 0, 4), "glTF");
    const json = JSON.parse(
      file.toString("utf8", 20, 20 + file.readUInt32LE(12)),
    );
    assert.equal(json.meshes.length, 1);
    const count = json.meshes[0].primitives.reduce(
      (n, p) => n + json.accessors[p.indices].count / 3,
      0,
    );
    const model = makeSpiritAsset(id);
    assert.equal(count, model.userData.triangles);
    assert.ok(count < 2000);
    model.traverse((m) => {
      if (m.isMesh)
        assert.ok(
          [...m.geometry.attributes.position.array].every(Number.isFinite),
        );
    });
  }
});
