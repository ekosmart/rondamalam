import { FARM_ANIMALS, NEW_HOMES } from "./rural-data.js";
import { makeLivestock, animateLivestock } from "./rural-models.js";
import { makeHuman, animateHuman, box, beam } from "./models.js";
import { distance } from "./state.js";
import { makeFarmAsset, animateFarmAsset } from "./farm-assets.js";
export class RuralLife {
  constructor(game) {
    this.game = game;
    this.workers = [];
    this.dogTimer = 0;
    NEW_HOMES.forEach(([x, z], i) => {
      for (let j = 0; j < 2; j++)
        game.life.addResident(
          {
            id: `tetangga-${i}-${j}`,
            name: [
              "Bu Ratna",
              "Pak Bowo",
              "Mbak Ayu",
              "Mas Jati",
              "Pak Anton",
              "Bu Endah",
              "Mas Raka",
              "Bu Sinta",
              "Pak Yusuf",
              "Bu Reni",
            ][i * 2 + j],
            role: "Warga kampung utara",
            x: x + (j ? 3 : -3),
            z: z + 7,
            color: j ? "#9eaa86" : "#a3847a",
            day: true,
            night: true,
            line: "Kami bergiliran menjaga rumah saat malam. Kalau terdengar sirine, tolong lindungi warga. Pagi nanti kami bergotong royong lagi.",
          },
          [
            { x: x + (j ? 3 : -3), z: z + 7 },
            { x: x + (j ? 3 : -3), z: z + 11 },
          ],
        );
    });
    for (let i = 0; i < 3; i++)
      game.life.addResident(
        {
          id: `suster-${i}`,
          name: ["Suster Maria", "Suster Agnes", "Suster Klara"][i],
          role: "Biarawati Santa Maria",
          outfit: "nun",
          color: "#e4e2d2",
          x: 20 + i * 8,
          z: -163,
          day: true,
          night: true,
          line: "Kami membantu warga yang kembali saat pagi. Gereja dan masjid bersama-sama menyiapkan pertolongan untuk desa.",
        },
        [
          { x: 20 + i * 8, z: -163 },
          { x: 22 + i * 8, z: -159 },
        ],
      );
    FARM_ANIMALS.forEach((def, i) => {
      const model = makeLivestock(def.kind);
      model.position.set(def.x, 0, def.z);
      game.scene.add(model);
      game.life.animals.push({ ...def, model, phase: i * 0.9 });
    });
    this.tractorModel = makeFarmAsset("tractor");
    this.tractorModel.position.set(-102,0,198);
    this.tractorModel.rotation.y = Math.PI / 2;
    game.scene.add(this.tractorModel);
    game.world.colliders.push({x:-102,z:198,w:3,d:2,h:4});
  }
  restoreMorning() {
    const g = this.game,
      d = g.state.data,
      s = d.incidents;
    if (g.state.isNight || s.recoveredNight === d.night) return;
    s.recoveredNight = d.night;
    g.weather?.restoreMorning();
    let buildings = 0,
      people = 0;
    for (const h of g.world.houses)
      if ((s.houses[h.id] ?? 100) < 100) {
        s.houses[h.id] = 100;
        buildings++;
        this.buildWorkers(h);
        g.effects.burst(h.x, 2, h.z, "#decc9c", 35, 5);
      }
    for (const id of Object.keys(s.residents)) {
      g.incidents.rescue(id, false);
      people++;
    }
    s.lostCaptives = [];
    d.raid.fires = [];
    d.village.damage = 0;
    g.incidents.updateHouses();
    g.incidents.navigation.cache.clear();
    if (buildings || people)
      g.ui.toast(
        `Gotong royong pagi: ${buildings} bangunan pulih, ${people} warga/ternak kembali sehat. Gratis.`,
        "success",
      );
    g.state.save();
  }
  buildWorkers(h) {
    for (let i = 0; i < 2; i++) {
      const model = makeHuman(i ? "#a6ac8e" : "#b69d6b");
      model.position.set(h.x + (i ? 3 : -3), 0, h.z + h.d / 2 + 2.5);
      const holder = model.userData.holder;
      beam(holder, [0, 0, 0], [0, 0.55, 0], 0.045, "#81684b");
      box(holder, 0.45, 0.17, 0.19, "#8e9991", 0, 0.62, 0);
      this.game.scene.add(model);
      this.workers.push({ model, time: 12, phase: i * Math.PI });
    }
  }
  interactions() {
    const g = this.game,
      d = g.state.data;
    if (g.altitude > 5 || d.quests["farm-care"] !== "active") return [];
    return g.life.animals
      .map((a, i) => ({ a, id: `animal-${i}` }))
      .filter(
        ({ a, id }) =>
          a.kind &&
          !a.incidentUnavailable &&
          !d.rural.cared.includes(id) &&
          distance(d, a.model.position) < 4,
      )
      .map(({ a, id }) => ({
        type: "feed-animal",
        obj: id,
        dist: distance(d, a.model.position) - 0.2,
        label: `Beri pakan · ${a.name}`,
      }));
  }
  care(id) {
    const d = this.game.state.data;
    if (d.quests["farm-care"] !== "active" || d.rural.cared.includes(id))
      return;
    d.rural.cared.push(id);
    d.stats.farmCare = d.rural.cared.length;
    this.game.ui.toast(
      `Ternak terawat ${d.stats.farmCare}/5. Laporkan kepada Pak Mulyono.`,
      "success",
    );
    this.game.audio.play("collect");
    this.game.state.save();
  }
  interact(it) {
    if (it.type !== "feed-animal") return false;
    this.care(it.obj);
    return true;
  }
  update(dt, t) {
    const g = this.game;
    this.dogTimer -= dt;
    g.life.animals.forEach((a) => {
      if (a.kind && !a.incidentUnavailable)
        animateLivestock(a.model, t + a.phase, true);
      if (a.kind && !a.incidentUnavailable && a.model.visible)
        g.audio.farm.play(a.kind, distance(a.model.position,g.state.data));
    });
    animateFarmAsset(this.tractorModel,t,false,false);
    const dog = g.life.animals.find(
      (a) => a.kind === "dog" && !a.incidentUnavailable,
    );
    if (dog && g.state.isNight && this.dogTimer <= 0) {
      const e = g
        .nearby(22, false, dog.model.position)
        .find((e) => e.incident && !e.heldByPlayer && e.pos.y < 4);
      if (e) {
        g.audio.farm.play("dog",distance(dog.model.position,g.state.data));
        this.dogTimer = 1.7;
        dog.model.rotation.y = Math.atan2(
          e.pos.x - dog.model.position.x,
          e.pos.z - dog.model.position.z,
        );
        g.damageEnemy(e, 12, "guard-dog", "physical");
        g.effects.ring(
          dog.model.position.x,
          dog.model.position.z,
          "#d6c28f",
          2,
        );
      }
    }
    for (let i = this.workers.length - 1; i >= 0; i--) {
      const w = this.workers[i];
      w.time -= dt;
      animateHuman(w.model, t, false, false);
      w.model.userData.arms[0].rotation.x =
        -0.5 + Math.sin(t * 7 + w.phase) * 0.8;
      if (w.time <= 0) {
        w.model.removeFromParent();
        this.workers.splice(i, 1);
      }
    }
  }
}
