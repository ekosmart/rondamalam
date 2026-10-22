import { magicSound } from "./magic/audio.js";
import { ATTACK_RANGE } from "./combat-tuning.js";
import * as THREE from "three";
import { makeMissile } from "./incident-models.js";
import { orb, glow } from "./models.js";

export class RangedCombat {
  constructor(game) {
    this.game = game;
    this.shots = [];
    this.missileCooldown = 0;
  }
  aim(e) {
    return e.pos.clone().add(new THREE.Vector3(0, e.aimHeight ?? 1.4, 0));
  }
  target(range) {
    const g = this.game,
      origin = new THREE.Vector3(
        g.state.data.x,
        g.altitude + 2,
        g.state.data.z,
      );
    return [g.lockedTarget, ...g.nearby(range)].find(
      (e) => e?.active && e.hp > 0 && origin.distanceTo(this.aim(e)) < range,
    );
  }
  launch(target, damage, missile = false, index = 0, color = "#ffe299", range = missile ? ATTACK_RANGE.missile : ATTACK_RANGE.solar) {
    const g = this.game,
      d = g.state.data,
      model = missile ? makeMissile() : new THREE.Group();
    if (!missile) {
      orb(model, 0.2, color, 0, 0, 0, 1, {
        emissive: color,
        emissiveIntensity: 4,
      });
      glow(model, color, 1.5, 0, 0, 0, 0.8);
    }
    const sideways = (index - 1) * 1.1,
      back = missile ? -1.5 : 1.2;
    model.position.set(
      d.x + Math.sin(g.facing) * back + Math.cos(g.facing) * sideways,
      g.altitude + (missile ? 6 : 1.8),
      d.z + Math.cos(g.facing) * back - Math.sin(g.facing) * sideways,
    );
    g.scene.add(model);
    this.shots.push({
      model,
      origin: model.position.clone(),
      range,
      traveled: 0,
      target,
      damage,
      color,
      missile,
      age: 0,
      life: missile ? 6 : 3,
      last: this.aim(target),
      trail: 0,
    });
  }
  shoot(volley = false) {
    const g = this.game;
    if (!volley && g.cooldowns.attack > 0) return false;
    const e = this.target(ATTACK_RANGE.solar);
    if (!e) {
      g.ui.toast("Bidik musuh dalam 48 m: klik target, lalu Spasi.");
      return false;
    }
    g.facing = Math.atan2(e.pos.x - g.state.data.x, e.pos.z - g.state.data.z);
    const wand = g.state.data.weapon === "tongkat-sihir";
    const damage = (wand ? 42 : 36) + g.state.data.upgrades.strength * 6;
    this.launch(e, damage * (volley ? 2.4 : 1), false, 0, wand ? "#cda6ff" : "#ffe299");
    g.cooldowns.attack = 0.48;
    g.swing = 0.001;
    if (wand) magicSound(g.audio, "spell");
    else g.audio.play("solar");
    return true;
  }
  missiles() {
    const g = this.game,
      d = g.state.data;
    if (!(d.riding && d.mount === "mecha" && d.incidents.tech.mechaFlight)) {
      g.ui.toast("Selesaikan misi upgrade William dan naiki mecha.");
      return false;
    }
    if (this.missileCooldown > 0) {
      g.ui.toast(`Misil siap ${Math.ceil(this.missileCooldown)} detik lagi.`);
      return false;
    }
    const target = this.target(ATTACK_RANGE.missile);
    if (!target) {
      g.ui.toast("Klik musuh dalam 60 meter untuk mengunci misil.");
      return false;
    }
    for (let i = 0; i < 3; i++) this.launch(target, 62, true, i);
    this.missileCooldown = 6;
    g.audio.play("missile");
    g.cameraShake = 0.12;
    return true;
  }
  update(dt) {
    const g = this.game;
    this.missileCooldown = Math.max(0, this.missileCooldown - dt);
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.age += dt;
      s.life -= dt;
      if (s.traveled > s.range * (s.missile ? 1.4 : 1.05) || (s.target.active && s.origin.distanceTo(this.aim(s.target)) > s.range + 3)) s.life = 0;
      if (s.target.active && s.target.hp > 0) s.last.copy(this.aim(s.target));
      const dest =
        s.missile && s.age < 0.38
          ? s.model.position.clone().add(new THREE.Vector3(0, 10, 0))
          : s.last;
      const dir = dest.clone().sub(s.model.position),
        step = (s.missile ? 44 : 78) * dt,
        hit = dir.length() <= step && (!s.missile || s.age >= 0.38);
      if (hit || s.life <= 0) {
        if (hit && s.life > 0) {
          const p = s.last,
            color = s.missile ? "#ffa564" : s.color;
          g.effects.burst(
            p.x,
            p.y,
            p.z,
            color,
            s.missile ? 65 : 25,
            s.missile ? 7 : 3,
          );
          g.impactLight.position.copy(p);
          g.impactLight.color.set(color);
          g.impactLight.intensity = 90;
          for (const e of g.enemies)
            if (
              e.active &&
              e.hp > 0 &&
              this.aim(e).distanceTo(p) < (s.missile ? 7 : 2.5)
            )
              g.damageEnemy(
                e,
                s.damage *
                  (!s.missile && ["zombie", "titan"].includes(e.def.kind)
                    ? 1.5
                    : 1),
                s.missile ? "missile" : "player",
                s.missile ? "physical" : "energy",
              );
        }
        s.model.removeFromParent();
        s.model.traverse((o) => {
          if (o.isMesh && o.geometry.type !== "BoxGeometry") {
            o.geometry.dispose(); /* Shared materials are cached by models.js. */
          }
        });
        this.shots.splice(i, 1);
        continue;
      }
      s.traveled += step;
      dir.normalize();
      s.model.position.addScaledVector(dir, step);
      s.model.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      s.trail -= dt;
      if (s.trail <= 0) {
        s.trail = 0.035;
        const p = s.model.position;
        g.effects.burst(p.x, p.y, p.z, s.missile ? "#ffbe78" : s.color, 2, 0.6);
      }
    }
  }
}
