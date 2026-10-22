import test from "node:test";
import assert from "node:assert/strict";
import {
  freshCoast,
  restoreCoast,
  acceptCoastRequest,
  coastRequest,
} from "../src/coast-rules.js";
import {
  freshSpirit,
  restoreSpirit,
  acceptSpiritRequest,
  spiritRequest,
} from "../src/spirit-rules.js";

test("coastal requests reject skipping and never start the next mission automatically", () => {
  const s = freshCoast();
  assert.equal(acceptCoastRequest(s, "wreck"), false);
  assert.ok(acceptCoastRequest(s, "lighthouse"));
  assert.equal(acceptCoastRequest(s, "lighthouse"), false);
  s.lighthouse = true;
  assert.equal(coastRequest(s), "rescue");
  assert.equal(s.rescueAccepted, false);
  assert.ok(acceptCoastRequest(s, "rescue"));
  s.boatOwned = true;
  assert.equal(s.wreckAccepted, false);
  assert.ok(acceptCoastRequest(s, "wreck"));
  assert.equal(coastRequest(s), null);
});
test("palace requests require NPC acceptance at each checkpoint", () => {
  const s = freshSpirit();
  assert.equal(acceptSpiritRequest(s, "guardian"), false);
  assert.ok(acceptSpiritRequest(s, "sparks"));
  assert.equal(acceptSpiritRequest(s, "relics"), false);
  s.crossed = true;
  assert.ok(acceptSpiritRequest(s, "relics"));
  s.relics = ["teratai", "cermin", "mutiara"];
  assert.equal(spiritRequest(s), "melody");
  assert.equal(s.melodyAccepted, false);
  assert.ok(acceptSpiritRequest(s, "melody"));
  s.melodySolved = true;
  assert.equal(s.guardianAccepted, false);
  assert.ok(acceptSpiritRequest(s, "guardian"));
  assert.equal(acceptSpiritRequest(s, "guardian"), false);
});
test("legacy checkpoints keep ongoing missions, new saves preserve declined missions", () => {
  assert.ok(restoreCoast({ lighthouse: true }).rescueAccepted);
  assert.ok(restoreCoast({ boatOwned: true }).wreckAccepted);
  assert.equal(
    restoreCoast({ ...freshCoast(), lighthouse: true }).rescueAccepted,
    false,
  );
  assert.equal(
    restoreCoast({ ...freshCoast(), boatOwned: true }).wreckAccepted,
    false,
  );
  assert.ok(
    restoreSpirit({ relics: ["teratai", "cermin", "mutiara"] }).melodyAccepted,
  );
  assert.ok(restoreSpirit({ melodySolved: true }).guardianAccepted);
  assert.equal(
    restoreSpirit({ ...freshSpirit(), melodySolved: true }).guardianAccepted,
    false,
  );
  assert.ok(restoreSpirit({ blessed: true }).blessed);
  assert.ok(restoreCoast({ completed: true }).completed);
});
