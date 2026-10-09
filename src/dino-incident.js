import { DINO_NEST } from "./frontier-data.js";
import { animateDinosaur } from "./frontier-models.js";
import { distance } from "./state.js";
export function updateDinoIncident(inc, e, dt, t) {
  const g = inc.game,
    r = e.incident;
  e.attackTimer -= dt;
  if (r.captive && inc.data.residents[r.captive]) {
    inc.navigation.move(e, DINO_NEST.x, DINO_NEST.z, e.def.speed * 0.8, dt);
    const s = inc.data.residents[r.captive];
    s.condition = "hunted";
    const v = inc.victim(r.captive);
    if (v) {
      v.model.visible = true;
      v.model.position.set(
        e.pos.x,
        e.pos.y + (e.def.boss ? 3 : 1),
        e.pos.z - 0.7,
      );
    }
    if (distance(e.pos, DINO_NEST) < 10) {
      s.condition = "nest";
      s.shipId = "nest";
      if (v) v.model.visible = false;
      r.captive = null;
      g.ui.toast(
        "Tawanan dibawa ke sarang meteor. Dekati sarang lalu E untuk membebaskan.",
        "error",
      );
      g.state.save();
    }
  } else if (
    !g.isSafe &&
    g.altitude < 5 &&
    distance(e.pos, g.state.data) < 11
  ) {
    if (distance(e.pos, g.state.data) > 2.6)
      inc.navigation.move(e, g.state.data.x, g.state.data.z, e.def.speed, dt);
    else if (e.attackTimer <= 0) {
      g.hurt(e.power, "physical");
      e.attackTimer = 1.6;
    }
  } else {
    r.captive = null;
    let v = inc.victim(r.victim);
    if (!v || inc.data.residents[v.id] || (!v.npc?.active && !v.animal)) {
      v = inc
        .availableVictims()
        .filter((v) => !inc.data.residents[v.id])
        .sort(
          (a, b) =>
            distance(a.model.position, e.pos) -
            distance(b.model.position, e.pos),
        )[0];
      r.victim = v?.id;
    }
    if (v) {
      if (distance(e.pos, v.model.position) < 3 + (e.def.boss ? 2 : 0)) {
        if (inc.restrain(v, "hunted", r.id)) {
          r.captive = v.id;
          g.ui.toast(
            v.name +
              " dibawa raptor! Buru pembawanya atau selamatkan di sarang.",
            "error",
          );
          g.state.save();
        }
      } else
        inc.navigation.move(
          e,
          v.model.position.x,
          v.model.position.z,
          e.def.speed,
          dt,
        );
    } else
      inc.navigation.move(e, DINO_NEST.x + 18, DINO_NEST.z, e.def.speed, dt);
  }
  animateDinosaur(e.model, t, true);
}
