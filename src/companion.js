import * as THREE from "three";
import { IncidentNavigation } from "./incident-navigation.js";
import { amphibiousMove } from "./ghost-encounters.js";
import { animateFolkloreGhost } from "./folklore-models.js";
import { animateImportedGhost } from "./ghost-assets.js";
import { ELEMENTS } from "./data.js";
import { distance } from "./state.js";

const floating = new Set([
  "kuntilanak",
  "kuyang",
  "palasik",
  "leak",
  "keranda",
  "banaspati",
]);

export class Companion {
  constructor(game, model, def) {
    this.g = game;
    this.model = model;
    this.def = def;
    this.actor = { pos: model.position, model, def };
    this.radius = 0.65;
    this.height = 3;
    this.cooldown = 0;
    this.windup = null;
    this.attackAnimation = 0;
    this.stuck = 0;
    this.mode = "follow";
    this.nav = new IncidentNavigation({
      world: game.world,
      steer: (_e, x, z, s, dt) => this.steer(x, z, s, dt),
    });
    // Friendly navigation can enter the protected pos ronda.
    this.nav.clear = (x, z) => this.clear(x, z);
    const measure = () => {
      if (model.userData.disposed) return;
      const bounds = new THREE.Box3().setFromObject(
        model.userData.body || model,
      );
      const size = bounds.getSize(new THREE.Vector3());
      this.height = size.y;
      this.radius = THREE.MathUtils.clamp(
        Math.min(size.x, size.z) * 0.35,
        0.45,
        1.2,
      );
      this.nav.cache.clear();
      this.actor.navigation = null;
      if (model.userData.crown) model.userData.crown.position.y = size.y + 0.25;
    };
    measure();
    model.userData.ready?.then(measure);
    this.recall();
  }
  clear(x, z) {
    return this.def.amphibious || floating.has(this.def.id)
      ? amphibiousMove(this.g.world, x, z, this.radius)
      : this.g.world.canMove(x, z, this.radius);
  }
  followPoint() {
    const g = this.g,
      d = g.state.data;
    const gap = Math.max(3.5, this.radius * 2 + 2);
    const x = d.x - Math.sin(g.facing) * gap + Math.cos(g.facing) * gap * 0.65;
    const z = d.z - Math.cos(g.facing) * gap - Math.sin(g.facing) * gap * 0.65;
    if (this.clear(x, z)) return { x, z };
    return g.world.nearestLanding(d.x, d.z);
  }
  recall() {
    const p = this.followPoint();
    this.model.position.set(p.x, this.g.world.groundHeight(p.x, p.z), p.z);
    this.actor.navigation = null;
    this.windup = null;
    this.stuck = 0;
  }
  steer(x, z, speed, dt) {
    const p = this.model.position,
      dx = x - p.x,
      dz = z - p.z,
      length = Math.hypot(dx, dz);
    if (length < 0.05) return;
    const angle = Math.atan2(dx, dz),
      amount = Math.min(length, speed * dt);
    for (const offset of [0, 0.65, -0.65, 1.3, -1.3]) {
      const a = angle + offset,
        target = {
          x: p.x + Math.sin(a) * amount,
          z: p.z + Math.cos(a) * amount,
        };
      if (!this.nav.line(p, target)) continue;
      p.x = target.x;
      p.z = target.z;
      this.model.rotation.y = a;
      return;
    }
  }
  validTarget(e) {
    return (
      e &&
      e.active &&
      e.hp > 0 &&
      !e.heldByPlayer &&
      e.hp / e.maxHp > 0.25 &&
      distance(e.pos, this.g.state.data) <= 125
    );
  }
  inReach(e) {
    return (
      distance(this.model.position, e.pos) <= 2.5 + this.radius &&
      Math.abs(e.pos.y - this.model.position.y) <
        Math.max(2.8, this.height * 0.45) &&
      this.nav.line(this.model.position, e.pos)
    );
  }
  update(dt) {
    const g = this.g,
      m = this.model,
      own = g.state.companion;
    if (!own || !m.visible || g.sports?.active) return;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.attackAnimation = Math.max(0, this.attackAnimation - dt);
    const e = this.validTarget(g.lockedTarget) ? g.lockedTarget : null;
    if (this.windup && (this.windup.enemy !== e || !this.inReach(e)))
      this.windup = null;
    if (this.windup) {
      this.windup.time -= dt;
      if (this.windup.time <= 0) {
        // Recheck HP at impact: the player may have weakened it during wind-up.
        if (this.validTarget(e) && this.inReach(e)) {
          g.damageEnemy(
            e,
            (9 + own.level * 4) * (own.awakened ? 1.5 : 1),
            "companion",
          );
          g.effects.burst(
            e.pos.x,
            e.pos.y + (e.aimHeight || 1),
            e.pos.z,
            ELEMENTS[this.def.element],
            8,
            2,
          );
          g.audio.ghostVoices.play(this.def.id, {
            event: "attack",
            distance: distance(m.position, g.state.data),
          });
        }
        this.windup = null;
      }
    }
    const previous = m.position.clone();
    const target = this.validTarget(e) ? e : null;
    this.mode = target ? "chase" : "follow";
    if (target && this.inReach(target)) {
      this.mode = "attack";
      m.rotation.y = Math.atan2(
        target.pos.x - m.position.x,
        target.pos.z - m.position.z,
      );
      if (this.cooldown <= 0) {
        this.cooldown = 1.5;
        this.windup = { enemy: target, time: 0.35 };
        this.attackAnimation = 0.95;
      }
    } else {
      const p = target ? target.pos : this.followPoint(),
        gap = distance(m.position, p);
      if (gap > (target ? 2.2 : 0.8)) {
        const speed = target ? 7 : gap > 18 ? 28 : gap > 8 ? 12 : 6;
        this.nav.move(this.actor, p.x, p.z, speed, dt);
      }
      if (distance(m.position, g.state.data) > 100) this.recall();
    }
    const moved = distance(previous, m.position) > 0.001;
    this.stuck = moved ? 0 : this.stuck + dt;
    if (this.stuck > 6 && distance(m.position, g.state.data) > 18 && !target)
      this.recall();
    const ground = g.world.groundHeight(m.position.x, m.position.z);
    // Walking companions stay on the terrain, even when their player flies.
    const y =
      floating.has(this.def.id) && target
        ? Math.max(ground, target.pos.y)
        : ground;
    m.position.y = THREE.MathUtils.damp(m.position.y, y, 8, dt);
    const options = {
      moving: moved,
      attack: this.attackAnimation > 0 ? 1 : 0,
      dt,
    };
    if (m.userData.importedGhost) animateImportedGhost(m, g.elapsed, options);
    else animateFolkloreGhost(m, g.elapsed, options);
    if (own.awakened && Math.random() < dt * 8)
      g.effects.burst(
        m.position.x,
        m.position.y + this.height * 0.5,
        m.position.z,
        "#d4e4ad",
        1,
        1,
      );
  }
}
