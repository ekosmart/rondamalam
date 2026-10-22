import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  freshMagic,
  restoreMagic,
  portalReason,
  nightTime,
  solveNote,
  claimTicket,
  claimMagicRewards,
  STATION,
  stationClearing,
} from "../src/magic/rules.js";
import { freshState, GameState } from "../src/state.js";
import { CROPS } from "../src/frontier-data.js";
import { ROADS } from "../src/layout.js";

test("magic portal requires permanent ticket, night, solved book, train and trolley", () => {
  const d = freshState();
  d.time = 1320;
  assert.match(portalReason(d, true, true), /tiket/);
  d.magic.ticket = true;
  d.time = 720;
  assert.match(portalReason(d, true, true), /malam/);
  d.time = 1320;
  assert.match(portalReason(d, true, true), /buku/);
  d.magic.bookSolved = true;
  assert.match(portalReason(d, false, true), /Crimson/);
  assert.match(portalReason(d, true, false), /troli/);
  assert.equal(portalReason(d, true, true), "");
  assert.ok(nightTime({ ...d, time: 359 }));
  assert.equal(nightTime({ ...d, time: 360 }), false);
});
test("NPC quest rewards reject skips, duplicated seals, and repeat claims", () => {
  const d = freshState();
  assert.equal(claimTicket(d), false);
  d.magic.defeated = ["frog"];
  assert.equal(claimTicket(d), false);
  d.magic.accepted = true;
  assert.equal(claimTicket(d), true);
  const coins = d.coins;
  assert.equal(claimTicket(d), false);
  assert.equal(d.coins, coins);
  assert.equal(claimMagicRewards(d), false);
  d.magic.trialAccepted = true;
  d.magic.seals = [0, 0, 0];
  assert.equal(claimMagicRewards(d), false);
  d.magic.seals = [0, 1, 2];
  d.magic.cursed = [{ id: "warga", type: "frog", x: 0, z: 0 }];
  assert.equal(claimMagicRewards(d), true);
  assert.equal(d.mount, "sapu");
  assert.equal(d.weapon, "tongkat-sihir");
  assert.equal(d.magic.cursed.length, 0);
  const after = JSON.stringify(d);
  assert.equal(claimMagicRewards(d), false);
  assert.equal(JSON.stringify(d), after);
});
test("book puzzle resets incorrect and out-of-range notes", () => {
  assert.equal(solveNote(0, 1), 0);
  assert.equal(solveNote(0, 0), 1);
  assert.equal(solveNote(1, 2), 2);
  assert.equal(solveNote(2, 1), 3);
  assert.equal(solveNote(1, 0), 0);
  assert.equal(solveNote(0, NaN), 0);
  assert.equal(solveNote(3, 3), 0);
});
test("legacy and malformed magic saves recover without duplicate cursed actors", () => {
  assert.deepEqual(restoreMagic(null), freshMagic());
  const s = restoreMagic({
    potions: -4,
    defeated: ["frog", "frog", "alien"],
    seals: [0, 0, 9],
    cursed: [
      { id: "a", type: "stone", x: 1, z: 2 },
      { id: "a", type: "frog", x: 1, z: 2 },
      { id: "b", type: "bad", x: 1, z: 2 },
    ],
    completed: true,
  });
  assert.equal(s.potions, 0);
  assert.deepEqual(s.defeated, ["frog"]);
  assert.equal(s.cursed.length, 1);
  assert.ok(
    s.accepted &&
      s.ticket &&
      s.stationAccepted &&
      s.bookSolved &&
      s.academyVisited &&
      s.trialAccepted,
  );
  const store = {
    text: null,
    getItem() {
      return this.text;
    },
    setItem(k, v) {
      this.text = v;
    },
  };
  const game = new GameState(store);
  game.data.magic = s;
  game.save();
  assert.deepEqual(new GameState(store).data.magic, s);
});
test("new station roads preserve both farm fields and reserve scenery before batching", () => {
  assert.equal(stationClearing(STATION.x, STATION.z), true);
  for (const p of CROPS) {
    assert.equal(stationClearing(p.x, p.z), false);
    for (const r of ROADS.slice(0, 4))
      assert.ok(
        Math.abs(p.x - r.x) >= (p.w + r.w) / 2 ||
          Math.abs(p.z - r.z) >= (p.d + r.d) / 2,
      );
  }
});
test("all fifteen supplied GLBs are self-contained glTF 2 assets", () => {
  for (const id of [
    "candle",
    "carriage",
    "castle",
    "curse_bolt",
    "frog",
    "owl",
    "Penyihir",
    "platform_sign",
    "potion",
    "scarecrow",
    "school_gate",
    "spellbook",
    "ticket_booth",
    "trolley",
    "wand",
  ]) {
    const b = readFileSync(
      new URL(`../public/models/magic/${id}.glb`, import.meta.url),
    );
    assert.equal(b.toString("ascii", 0, 4), "glTF");
    assert.equal(b.readUInt32LE(4), 2);
    assert.equal(b.readUInt32LE(8), b.length);
    const json = JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
    assert.ok(json.meshes.length);
    for (const a of [...(json.buffers || []), ...(json.images || [])])
      assert.ok(!a.uri || a.uri.startsWith("data:"));
  }
});
