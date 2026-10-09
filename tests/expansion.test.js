import test from "node:test";
import assert from "node:assert/strict";
import { patrolPosts, POST_POOL, RACE_TRACK, onRoad } from "../src/layout.js";
import { GameState, freshState } from "../src/state.js";
import { RaceProgress, CupMatch } from "../src/sports-rules.js";
test("five patrol sectors change every night and remain stable on reload", () => {
  assert.equal(POST_POOL.length, 15);
  for (let n = 1; n < 30; n++) {
    const a = patrolPosts(n),
      b = patrolPosts(n + 1);
    assert.equal(new Set(a.map((p) => p.id)).size, 5);
    assert.ok(a.every((p, i) => p.id !== b[i].id));
    assert.deepEqual(patrolPosts(n), a);
    assert.ok(a.every((p) => !onRoad(p.x, p.z, 1)));
  }
});
test("only the five active poles award points on each night", () => {
  const s = new GameState(null);
  s.data.night = 2;
  s.data.time = 1200;
  const ids = s.patrolPosts.map((p) => p.id);
  for (const p of POST_POOL) assert.equal(s.ring(p.id), ids.includes(p.id));
  assert.equal(s.data.posts.length, 5);
});
test("legacy patrol progress migrates without removing earned inventory", () => {
  const d = freshState();
  delete d.patrolVersion;
  d.night = 32;
  d.posts = ["kampung", "sawah", "beringin"];
  d.coins = 629;
  d.mounts = ["onthel", "motor"];
  const s = new GameState({ getItem: () => JSON.stringify(d) });
  assert.equal(s.data.coins, 629);
  assert.deepEqual(s.data.mounts, ["onthel", "motor"]);
  assert.equal(s.data.posts.length, 3);
  assert.ok(s.data.posts.every((id) => s.patrolPosts.some((p) => p.id === id)));
  assert.equal(s.data.raid.entries.length, 0);
});
test("race requires ordered checkpoints, two laps and rejects teleport shortcuts", () => {
  const r = new RaceProgress();
  assert.equal(r.step({ x: 0, z: 19 }, { x: -65, z: 19 }, 1), false);
  assert.equal(r.passed, 0);
  let previous = RACE_TRACK[0];
  for (let lap = 0; lap < 2; lap++)
    for (let i = 1; i <= RACE_TRACK.length; i++) {
      const target = RACE_TRACK[i % RACE_TRACK.length],
        start = { ...previous },
        steps = Math.ceil(
          Math.hypot(target.x - start.x, target.z - start.z) / 3,
        );
      for (let j = 1; j <= steps; j++) {
        const p = {
          x: start.x + ((target.x - start.x) * j) / steps,
          z: start.z + ((target.z - start.z) * j) / steps,
        };
        r.step(previous, p, 0.1);
        previous = p;
      }
    }
  assert.equal(r.lap, 2);
  assert.equal(r.passed, 20);
  assert.equal(r.done, true);
});
test("football tournament advances only after winning each timed match", () => {
  const cup = new CupMatch();
  cup.goal(0);
  assert.equal(cup.tick(89), null);
  assert.equal(cup.tick(1), "final");
  assert.equal(cup.round, 1);
  assert.deepEqual(cup.score, [0, 0]);
  cup.goal(0);
  cup.goal(0);
  cup.goal(1);
  assert.equal(cup.tick(90), "champion");
  assert.equal(cup.won, true);
  assert.equal(cup.tick(1), null);
  const draw = new CupMatch();
  assert.equal(draw.tick(90), "draw");
});
