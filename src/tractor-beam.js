import * as THREE from "three";
import { distance } from "./state.js";
import { fallDamage, isSpirit } from "./combat-rules.js";
export class TractorBeam {
  constructor(game) {
    this.game = game;
    this.held = null;
    this.falling = [];
    const mat = new THREE.MeshBasicMaterial({
      color: "#9edfec",
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.beam = new THREE.Mesh(
      new THREE.ConeGeometry(2.5, 1, 24, 1, true),
      mat,
    );
    this.beam.visible = false;
    game.scene.add(this.beam);
  }
  toggle() {
    const g = this.game,
      d = g.state.data;
    if (!(d.riding && d.mount === "ufo" && d.incidents.tech.ufoTractor)) {
      g.ui.toast(
        "Selesaikan quest Gravitasi sahabat bintang dari E.T. lalu naiki UFO.",
      );
      return false;
    }
    if (this.held) {
      this.release(true);
      return true;
    }
    const e = g.lockedTarget;
    if (
      !e?.active ||
      e.hp <= 0 ||
      distance(e.pos, d) > 38 ||
      Math.abs(e.pos.y - g.altitude) > 65
    ) {
      g.ui.toast("Klik musuh dalam 38 meter, lalu U untuk mengangkat.");
      return false;
    }
    if (this.falling.some((f) => f.e === e)) return false;
    this.held = { e, baseY: e.def.air ? e.pos.y : 0 };
    e.heldByPlayer = true;
    g.audio.play("portal");
    g.ui.toast(
      `${e.name} diangkat · U lagi untuk menjatuhkan${isSpirit(e) ? " · Hantu kebal damage fisik" : ""}`,
    );
    return true;
  }
  release(damaging = false) {
    if (!this.held) return;
    const { e, baseY } = this.held;
    this.held = null;
    this.beam.visible = false;
    if (!e.active || e.hp <= 0) {
      e.heldByPlayer = false;
      return;
    }
    let x = e.pos.x,
      z = e.pos.z;
    if (Math.hypot(x, z) < 29) {
      const a = Math.atan2(x || 1, z || 1);
      x = Math.sin(a) * 31;
      z = Math.cos(a) * 31;
    }
    const p = this.game.world.nearestLanding(x, z);
    this.falling.push({
      e,
      x: p.x,
      z: p.z,
      height: Math.max(0, e.pos.y),
      velocity: 0,
      damaging,
      baseY,
    });
  }
  update(dt) {
    const g = this.game,
      d = g.state.data;
    if (
      this.held &&
      (!d.riding ||
        d.mount !== "ufo" ||
        g.isSafe ||
        g.deathTimer > 0 ||
        g.sports.active ||
        !this.held.e.active)
    )
      this.release(false);
    if (this.held) {
      const e = this.held.e,
        targetY = Math.max(4, g.altitude - 3);
      e.pos.x = d.x;
      e.pos.z = d.z;
      e.pos.y += (targetY - e.pos.y) * Math.min(1, dt * 4);
      e.model.visible = true;
      const h = Math.max(1, g.altitude - e.pos.y);
      this.beam.position.set(d.x, e.pos.y + h / 2, d.z);
      this.beam.scale.set(e.def.boss ? 2 : 1, h, e.def.boss ? 2 : 1);
      this.beam.visible = true;
    }
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i],
        e = f.e;
      if (!e.active || e.hp <= 0) {
        e.heldByPlayer = false;
        this.falling.splice(i, 1);
        continue;
      }
      f.velocity += dt * 20;
      e.pos.y -= f.velocity * dt;
      e.pos.x = f.x;
      e.pos.z = f.z;
      if (e.pos.y <= 0) {
        e.pos.y = f.baseY;
        e.heldByPlayer = false;
        e.navigation = null;
        if (f.damaging) {
          g.damageEnemy(e, fallDamage(f.height), "tractor", "physical");
          g.effects.burst(
            f.x,
            0.5,
            f.z,
            isSpirit(e) ? "#b0dbe6" : "#c5b084",
            35,
            5,
          );
        }
        this.falling.splice(i, 1);
      }
    }
  }
  reset() {
    this.release(false);
    for (const f of this.falling) {
      f.e.pos.set(f.x, f.baseY, f.z);
      f.e.heldByPlayer = false;
      f.e.navigation = null;
    }
    this.falling = [];
  }
}
