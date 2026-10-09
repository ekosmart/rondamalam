import { ATTACK_RANGE } from "./combat-tuning.js";
import * as THREE from "three";
import { distance } from "./state.js";

export class MountCombat {
  constructor(game) {
    this.game = game;
    this.timer = 0;
    this.shieldTimer = 0;
  }
  update(dt) {
    this.timer = Math.max(0, this.timer - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    const g = this.game;
    if (g.state.data.riding && g.state.data.mount === "naga" && g.lockedTarget)
      this.fire();
    if (g.bike.userData.saber) {
      g.bike.userData.saber.visible =
        g.state.data.riding && g.cooldowns.special > 7.2;
      g.bike.userData.saber.rotation.z =
        Math.sin((8 - g.cooldowns.special) * 6) * 1.2;
    }
    if (g.bike.userData.ward)
      g.bike.userData.ward.visible = this.shieldTimer > 0;
  }
  shield() {
    if (this.shieldTimer > 0) return;
    this.shieldTimer = 0.6;
    const g = this.game,
      d = g.state.data;
    g.effects.ring(d.x, d.z, "#78dce8", 5);
    g.effects.burst(d.x, 3, d.z, "#78dce8", 20, 3);
  }
  fire() {
    const g = this.game,
      d = g.state.data;
    if (this.timer > 0) return;
    const range = d.mount === "naga" ? ATTACK_RANGE.dragon : d.mount === "ufo" ? ATTACK_RANGE.ufo : ATTACK_RANGE.plasma;
    const e = g.lockedTarget || g.ranged.target(range);
    if (!e || !e.active || e.hp <= 0) {
      g.ui.toast("Klik musuh untuk menentukan target tunggangan.");
      return;
    }
    const end = e.pos.clone().add(new THREE.Vector3(0, e.aimHeight ?? 1.4, 0)),
      start = new THREE.Vector3(
        d.x,
        g.altitude + (d.mount === "naga" ? 2.7 : 4.7),
        d.z,
      );
    if (start.distanceTo(end) > range) {
      if (d.mount !== "naga") g.ui.toast(`Target di luar jangkauan ${range} meter.`);
      return;
    }
    g.facing = Math.atan2(e.pos.x - d.x, e.pos.z - d.z);
    const dragon = d.mount === "naga",
      color = dragon ? "#ffae4f" : "#77e5ef";
    start.x += Math.sin(g.facing) * (dragon ? 4.7 : 2);
    start.z += Math.cos(g.facing) * (dragon ? 4.7 : 2);
    if (!dragon) g.effects.beam(start, end, color, 0.4);
    for (let i = 0; i < 15; i++) {
      const p = start.clone().lerp(end, i / 14);
      g.effects.burst(p.x, p.y, p.z, color, dragon ? 4 : 2, dragon ? 2.5 : 0.4);
    }
    g.effects.burst(end.x, end.y, end.z, color, 30, 4);
    g.impactLight.position.copy(end);
    g.impactLight.color.set(color);
    g.impactLight.intensity = 65;
    g.audio.play("skill");
    this.timer = dragon ? 1.1 : 0.7;
    g.damageEnemy(e, dragon ? 24 : 40);
    g.cooldowns.attack = this.timer;
  }
}
