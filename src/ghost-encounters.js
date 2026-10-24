import { SAFE_RADIUS } from "./data.js";
import { distance } from "./state.js";

export const kliwonActive = (state) => state.isNight && state.isKliwon;
export const ghostScheduled = (def, state) =>
  state.isNight && !!def.global === !!state.isKliwon;
export const inRiver = (x, z) => x > 143 && x < 167 && z > -285 && z < 285;
export function amphibiousMove(world, x, z, r = 0.42) {
  if (!inRiver(x, z)) return world.canMove(x, z, r);
  return !world.colliders.some(
    (c) =>
      !c.disabled && Math.abs(x - c.x) < c.w + r && Math.abs(z - c.z) < c.d + r,
  );
}

// Farthest-first placement uses actual, walkable local ghost homes. No random
// clustering near the old portals; the layout is stable for an entire night.
export function distributeKliwon(game) {
  const locals = game.enemies.filter(
    (e) =>
      !e.human &&
      !e.def.global &&
      !e.raid &&
      !e.incident &&
      !e.dino &&
      !e.witch,
  );
  const sites = locals
    .map((e) => ({ x: e.home.x, z: e.home.z }))
    .filter(
      (p) =>
        Math.hypot(p.x, p.z) > SAFE_RADIUS + 8 &&
        game.world.canMove(p.x, p.z, 0.8),
    );
  const chosen = [];
  let riverIndex = 0;
  for (const e of game.enemies.filter(
    (e) => e.def.global && !e.incident && !e.witch,
  )) {
    let site;
    if (e.def.amphibious)
      site = { x: 155, z: [-235, -35, 195][riverIndex++ % 3] };
    else {
      const available = sites.filter((p) =>
        chosen.every((c) => distance(c, p) > 7),
      );
      site = available.sort((a, b) => {
        const score = (p) =>
          chosen.length
            ? Math.min(...chosen.map((c) => distance(c, p)))
            : Math.hypot(p.x, p.z);
        return score(b) - score(a);
      })[0];
    }
    if (!site) continue;
    chosen.push(site);
    e.home = { ...site };
    e.habitat = { ...site };
    e.pos.set(site.x, 0, site.z);
    e.hp = e.maxHp;
    e.respawn = 0;
    e.provoked = 0;
    e.attackTimer = 0;
  }
}

export function releaseKappa(game, enemy, rescued = false) {
  const captive = enemy.kappaCaptive;
  if (!captive) return;
  const { n, position } = captive;
  n.kappaCaptive = false;
  n.model.position.copy(position);
  n.def.x = position.x;
  n.def.z = position.z;
  n.active = game.state.isNight ? n.def.night : n.def.day;
  n.model.visible = n.active;
  enemy.kappaCaptive = null;
  enemy.kappaCooldown = 40;
  if (rescued) game.ui.toast(`${n.def.name} bebas dari Kappa!`, "success");
}

// Captives stay visible above water and return safely when their captor is
// caught/defeated or dawn ends the event. No permanent NPC/quest removal.
export function updateKappa(game, e, dt) {
  e.kappaCooldown = Math.max(0, (e.kappaCooldown || 0) - dt);
  if (e.kappaCaptive) {
    game.steer(e, e.home.x, e.home.z, 2.1, dt);
    const n = e.kappaCaptive.n;
    n.model.position.set(e.pos.x, 0.8, e.pos.z);
    n.model.rotation.y = e.model.rotation.y;
    for (const arm of n.model.userData.arms || []) arm.rotation.x = -1.5;
    n.model.visible = true;
    n.def.x = e.pos.x;
    n.def.z = e.pos.z;
    return true;
  }
  if (
    e.provoked > 0 ||
    distance(e.pos, game.state.data) < 9 ||
    e.kappaCooldown > 0
  )
    return false;
  const victims = (game.frontier?.fishers || []).filter(
    (f) =>
      f.spot.id.startsWith("river-") &&
      f.n.active &&
      !f.n.witchCursed &&
      !f.n.incidentUnavailable &&
      !f.n.kappaCaptive &&
      distance(e.home, f.n.model.position) < 55,
  );
  const f = victims.sort(
    (a, b) =>
      distance(e.pos, a.n.model.position) - distance(e.pos, b.n.model.position),
  )[0];
  if (!f) return false;
  if (distance(e.pos, f.n.model.position) > 1.8)
    game.steer(e, f.n.model.position.x, f.n.model.position.z, 2.6, dt);
  else {
    e.kappaCaptive = { n: f.n, position: f.n.model.position.clone() };
    f.n.kappaCaptive = true;
    e.attackTimer = 1.7;
    game.audio.ghostVoices.play("kappa", {
      distance: distance(e.pos, game.state.data),
      event: "attack",
    });
    game.ui.toast(
      `Kappa menculik ${f.n.def.name} di sungai! Kalahkan atau tangkap Kappa untuk menolong.`,
      "error",
    );
    game.effects.burst(e.pos.x, 0.4, e.pos.z, "#75cfe3", 12, 2);
  }
  return true;
}
