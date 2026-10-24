import { scaleEnemy } from "./combat-rules.js";
import * as THREE from "three";
import { GHOSTS, ELEMENTS, SAFE_RADIUS } from "./data.js";
import { RAID_TARGETS, RITUAL } from "./layout.js";
import { distance, clamp } from "./state.js";
import { makeGhost, animateHuman, orb, glow, mesh } from "./models.js";
import { makeResident, makeBuffalo } from "./expansion-models.js";
import { animateFolkloreGhost } from "./folklore-models.js";
import { GHOST_ASSETS } from "./ghost-assets.js";

export class VillageLife {
  constructor(game) {
    this.game = game;
    this.actors = [];
    this.animals = [];
    this.fireModels = new Map();
    this.currentNight = 0;
    this.flameTick = 0;
    this.buildResidents();
    this.syncRaids();
  }
  addResident(def, route) {
    const model = makeResident(def);
    model.position.set(def.x, 0, def.z);
    this.game.scene.add(model);
    const npc = {
      def,
      model,
      aimHeight: GHOST_ASSETS[def.id] ? GHOST_ASSETS[def.id].height * .7 : 1.5,
      active: false,
      ambient: true,
      route,
      index: 0,
      phase: this.actors.length * 0.71,
    };
    this.actors.push(npc);
    this.game.npcs.push(npc);
    return npc;
  }
  buildResidents() {
    const goods = [
      "sayur segar",
      "ikan sungai",
      "pisang manis",
      "nasi pecel",
      "bumbu dapur",
      "kain batik",
      "jajanan pasar",
    ];
    for (let i = 0; i < 7; i++) {
      const x = -134 + (i % 4) * 10,
        z = -18 - Math.floor(i / 4) * 15;
      this.addResident(
        {
          id: `pedagang-${i}`,
          name: [
            "Bu Tini",
            "Pak Joko",
            "Bu Minah",
            "Pak Darto",
            "Bu Wati",
            "Mas Fikri",
            "Mbak Yuni",
          ][i],
          role: `Pedagang ${goods[i]}`,
          x,
          z: z - 1,
          color: ["#b79160", "#8a9d7e", "#a77779"][i % 3],
          day: true,
          night: false,
          line: `Monggo, ${goods[i]} baru datang. Pasar ramai sejak pagi. Hati-hati copet di simpang timur, Pak Hansip.`,
        },
        [],
      );
    }
    for (let i = 0; i < 9; i++) {
      const x = -141 + i * 5,
        z = i % 2 ? 5 : -8;
      this.addResident(
        {
          id: `pembeli-${i}`,
          name: `Warga pasar ${i + 1}`,
          role: "Pembeli di Pasar Sukarame",
          x,
          z,
          color: ["#97a789", "#b69a7b", "#789dab", "#b18387"][i % 4],
          day: true,
          night: false,
          line: [
            "Harga cabai naik, tapi senyum pedagang masih gratis.",
            "Saya titip kampung ini malam nanti, Pak.",
            "Dompet saya hampir diambil orang berjaket cokelat!",
          ][i % 3],
        },
        [
          { x: -141, z: -8 },
          { x: -95, z: -8 },
          { x: -95, z: 7 },
          { x: -141, z: 7 },
        ],
      );
    }
    for (let i = 0; i < 4; i++)
      this.addResident(
        {
          id: `petani-${i}`,
          name: `Pak ${["Sastro", "Karno", "Wahid", "Marto"][i]}`,
          role: "Petani Sawah Wetan",
          outfit: "farmer",
          x: -153 + i * 17,
          z: -88,
          color: "#a99b67",
          day: true,
          night: false,
          line: "Padi perlu dirawat tiap hari. Kerbau membantu membajak di sebelah barat. Tolong jaga pematang saat malam tiba.",
        },
        [
          { x: -153 + i * 17, z: -88 },
          { x: -153 + i * 17, z: -105 },
        ],
      );
    for (let i = 0; i < 4; i++)
      this.addResident(
        {
          id: `santri-harian-${i}`,
          name: [
            "Santri Ilham",
            "Santri Rizki",
            "Santri Naufal",
            "Santri Azmi",
          ][i],
          role: "Santri Nurul Fajar",
          outfit: "santri",
          x: 105 + i * 5,
          z: -163,
          color: "#c3c6aa",
          day: true,
          night: true,
          line: "Selepas mengaji kami membersihkan halaman dan membantu warga. Kiai Hasan menunggu di depan masjid.",
        },
        [
          { x: 100 + i * 4, z: -163 },
          { x: 123 + i * 3, z: -160 },
        ],
      );
    for (let i = 0; i < 3; i++) {
      const x = -235 + i * 19,
        z = 67;
      const n = this.addResident(
        {
          id: `pemanen-${i}`,
          name: `Pemanen ${["Agus", "Roni", "Edi"][i]}`,
          role: "Pekerja panen sawit",
          outfit: "harvester",
          x,
          z,
          color: "#b58b57",
          day: true,
          night: false,
          line: "Tandan masak kami turunkan dengan egrek, lalu diangkut ke truk. Jangan dekat-dekat pohon saat panen, Pak.",
        },
        [
          { x, z },
          { x: x + 5, z: 77 },
        ],
      );
      const pole = mesh(
        n.model,
        new THREE.CylinderGeometry(0.035, 0.04, 4, 5),
        "#9d9170",
        0.7,
        2,
        0,
      );
      pole.rotation.z = -0.2;
    }
    for (let i = 0; i < 2; i++) {
      const m = makeBuffalo();
      m.position.set(-181 + i * 6, 0, -91);
      this.game.scene.add(m);
      this.animals.push({ model: m, x: -181 + i * 6, z: -91, phase: i * 3 });
    }
  }
  syncRaids() {
    const g = this.game,
      d = g.state.data;
    if (d.raid.night !== d.night) {
      d.raid = { night: d.night, suppressed: false, entries: [], fires: [] };
    }
    if (this.currentNight === d.night) return;
    for (const e of g.enemies.filter((e) => e.raid)) {
      e.model.removeFromParent();
    }
    g.enemies = g.enemies.filter((e) => !e.raid);
    this.currentNight = d.night;
    for (const record of d.raid.entries)
      if (record.status === "active") this.createRaid(record);
  }
  createRaid(record) {
    const g = this.game,
      target = RAID_TARGETS[record.index],
      base = GHOSTS.find((d) => d.id === target.kind),
      def = { ...base, radius: 600 };
    const model = makeGhost(def);
    model.position.set(record.x ?? -248, 0, record.z ?? -247);
    g.scene.add(model);
    const e = {
      def,
      model,
      pos: model.position,
      home: { x: -248, z: -247 },
      name: `${base.name} · Kiriman`,
      hp: record.hp ?? base.hp,
      maxHp: record.maxHp ?? base.hp,
      active: true,
      respawn: 0,
      attackTimer: 0,
      hit: 0,
      wander: 0,
      human: false,
      raid: record,
    };
    scaleEnemy(e, g.state.data.level);
    g.enemies.push(e);
    return e;
  }
  dispatch(index) {
    const d = this.game.state.data;
    if (d.raid.suppressed || d.raid.entries.some((r) => r.index === index))
      return null;
    const record = {
      index,
      status: "active",
      x: -248,
      z: -247,
      route: 0,
      hp: null,
      attack: 0,
    };
    delete record.hp;
    d.raid.entries.push(record);
    const e = this.createRaid(record);
    this.game.ui.toast(
      `KIRIMAN KI WULUNG · ${e.def.name} menuju ${RAID_TARGETS[index].name}.`,
      "error",
    );
    this.game.audio.play("skill");
    this.game.state.save();
    return e;
  }
  suppress() {
    const g = this.game,
      d = g.state.data;
    if (!g.state.isNight) {
      g.ui.toast("Ritual hanya menyala pada malam hari.");
      return false;
    }
    if (d.raid.suppressed) {
      g.ui.toast("Ritual malam ini sudah diputus.");
      return false;
    }
    if (!g.state.spend({ essence: 2 })) {
      g.ui.toast("Butuh 2 sari gaib untuk memutus ritual.", "error");
      return false;
    }
    d.raid.suppressed = true;
    d.stats.wards++;
    for (const e of g.enemies.filter((e) => e.raid && e.active)) {
      e.raid.status = "banished";
      e.active = false;
      e.model.visible = false;
    }
    g.effects.burst(RITUAL.x, 2, RITUAL.z, "#b9e5c3", 100, 8);
    g.audio.play("capture");
    g.ui.toast("Ritual diputus. Kiriman berhenti untuk malam ini.", "success");
    g.state.save();
    return true;
  }
  stopRaid(e) {
    if (!e.raid || e.raid.status !== "active") return;
    e.raid.status = "defeated";
    this.game.state.data.stats.raidsStopped++;
  }
  ignite(index) {
    const d = this.game.state.data;
    if (d.raid.fires.some((f) => f.index === index)) return;
    d.raid.fires.push({ index, heat: 1 });
    this.game.ui.toast(
      "KEBAKARAN! Dekati Rumah Pak Hadi dan tekan E untuk memadamkan.",
      "error",
    );
  }
  extinguish(fire) {
    const g = this.game;
    if (g.state.data.stamina < 10) {
      g.ui.toast("Pulihkan stamina untuk memadamkan api.");
      return;
    }
    g.state.data.stamina -= 10;
    fire.heat = Math.max(0, fire.heat - 0.5);
    g.effects.burst(
      RAID_TARGETS[fire.index].x,
      2,
      RAID_TARGETS[fire.index].z,
      "#99dfea",
      40,
      6,
    );
    if (fire.heat === 0) {
      g.state.data.stats.firesOut++;
      g.state.data.security = clamp(g.state.data.security + 4, 0, 100);
      g.ui.toast("Api padam. Rumah warga terselamatkan.", "success");
    } else g.ui.toast("Api mengecil. Tekan E sekali lagi.");
    g.state.save();
  }
  interactions() {
    const g = this.game,
      d = g.state.data,
      result = [];
    if (distance(d, RITUAL) < 5)
      result.push({
        dist: distance(d, RITUAL),
        type: "ritual",
        label: "Putus kiriman · 2 sari gaib",
      });
    for (const f of d.raid.fires)
      if (f.heat > 0 && distance(d, RAID_TARGETS[f.index]) < 7)
        result.push({
          dist: distance(d, RAID_TARGETS[f.index]) - 0.5,
          type: "fire",
          obj: f,
          label: "Padamkan api · 10 stamina",
        });
    return result;
  }
  update(dt, t) {
    const g = this.game,
      d = g.state.data;
    this.syncRaids();
    const day = !g.state.isNight;
    for (const n of this.actors) {
      if (n.incidentUnavailable || n.witchCursed) continue;
      n.active = day || n.def.night;
      n.model.visible = n.active && distance(n.model.position, d) < 115;
      if (!n.active) continue;
      let moving = false;
      if (n.route.length && distance(n.model.position, d) > 3) {
        const target = n.route[n.index],
          dx = target.x - n.model.position.x,
          dz = target.z - n.model.position.z,
          l = Math.hypot(dx, dz);
        if (l < 1.5) n.index = (n.index + 1) % n.route.length;
        else {
          const speed = n.def.outfit === "farmer" ? 0.55 : 1.1,
            step = Math.min(
              l,
              dt * speed * (g.weather?.movementFactor(n.model.position) ?? 1),
            );
          const nx = n.model.position.x + (dx / l) * step,
            nz = n.model.position.z + (dz / l) * step;
          if (g.world.canMove(nx, nz, 0.35)) {
            n.model.position.x = nx;
            n.model.position.z = nz;
            moving = true;
            n.model.rotation.y = Math.atan2(dx, dz);
          } else n.index = (n.index + 1) % n.route.length;
        }
      }
      n.def.x = n.model.position.x;
      n.def.z = n.model.position.z;
      animateHuman(n.model, t + n.phase, moving, false);
      if (n.def.outfit === "harvester")
        n.model.userData.arms[1].rotation.x =
          -1.6 + Math.sin(t * 2 + n.phase) * 0.5;
    }
    this.animals.forEach((a) => {
      if (a.incidentUnavailable) return;
      a.model.visible = distance(a.model.position, d) < 115;
      a.weatherClock =
        (a.weatherClock ?? t - dt) +
        dt * (g.weather?.movementFactor(a.model.position) ?? 1);
      a.model.position.x = a.x + Math.sin(a.weatherClock * 0.14 + a.phase) * 2;
      a.model.rotation.y =
        Math.cos(a.weatherClock * 0.14 + a.phase) > 0
          ? Math.PI / 2
          : -Math.PI / 2;
    });
    if (g.state.isNight && !d.raid.suppressed) {
      const minutes = (d.time - 1080 + 1440) % 1440;
      for (let i = 0; i < 4; i++) if (minutes >= 90 + i * 38) this.dispatch(i);
    }
    for (const e of g.enemies.filter((e) => e.raid)) {
      scaleEnemy(e, d.level);
      if (e.heldByPlayer) continue;
      const r = e.raid;
      e.active = g.state.isNight && r.status === "active" && !d.raid.suppressed;
      e.model.visible = e.active;
      if (!e.active) continue;
      const destination = RAID_TARGETS[r.index],
        route = [
          { x: -220, z: -247 },
          { x: -220, z: -130 },
          { x: destination.x > 0 ? 0 : -65, z: -130 },
          { x: destination.x > 0 ? 0 : -65, z: destination.z },
          destination,
        ];
      if (
        !g.isSafe &&
        distance(e.pos, d) < 11 &&
        !(g.isFlying && g.altitude > 6)
      ) {
        if (distance(e.pos, d) > 2) g.steer(e, d.x, d.z, 5.5, dt);
        else if (e.attackTimer <= 0) {
          g.hurt(e.power, "magic");
          e.attackTimer = 1.8;
        }
      } else if (r.route < route.length) {
        const target = route[r.route];
        if (distance(e.pos, target) < 2.2) r.route++;
        else g.steer(e, target.x, target.z, 11, dt);
      } else {
        r.attack = (r.attack || 0) + dt;
        if (r.attack >= 6) {
          r.attack = 0;
          d.security = clamp(d.security - 2, 0, 100);
          if (["tuyul", "ngepet"].includes(e.def.id))
            d.village.treasury = Math.max(0, d.village.treasury - 25);
          else if (e.def.id === "banaspati") this.ignite(r.index);
          else {
            d.village.damage++;
            g.ui.toast(
              "Kuyang di rumah Bu Rini! Warga menunggu pertolongan.",
              "error",
            );
          }
        }
      }
      e.attackTimer -= dt;
      e.hit = Math.max(0, e.hit - dt);
      e.pos.y =
        e.def.kind === "head" ? 1.8 : Math.sin(t * 2 + r.index) * 0.12 + 0.15;
      e.model.userData.own.emissiveIntensity =
        e.hit > 0 ? 1.2 : e.hp / e.maxHp <= 0.25 ? 0.65 + Math.sin(t * 9) * 0.3 : 0.27;
      animateFolkloreGhost(e.model, t + r.index, {
        moving: r.route < route.length,
        attack: Math.max(0, (e.attackTimer - 1.2) / .6), hit: e.hit,
      });
      if (e.model.userData.folklore) g.audio.ghostVoices.play(e.def.id, {
        distance: Math.hypot(distance(e.pos, d), g.altitude || 0),
        event: e.attackTimer > 1.2 ? "attack" : "idle",
      });
      r.x = e.pos.x;
      r.z = e.pos.z;
      r.hp = e.hp;
    }
    this.flameTick += dt;
    for (const f of d.raid.fires) {
      const target = RAID_TARGETS[f.index];
      let m = this.fireModels.get(f.index);
      if (!m) {
        m = new THREE.Group();
        for (let i = 0; i < 7; i++) {
          const flame = orb(
            m,
            0.65,
            "#efaa48",
            Math.sin(i * 2) * 3,
            4.3 + Math.cos(i) * 0.3,
            Math.cos(i * 2) * 2,
            0,
            { emissive: "#ef652b", emissiveIntensity: 2.8 },
          );
          flame.scale.y = 3;
        }
        m.position.set(target.houseX, 0, target.houseZ);
        g.scene.add(m);
        this.fireModels.set(f.index, m);
      }
      m.visible = f.heat > 0;
      m.scale.y = f.heat * (1 + Math.sin(t * 9) * 0.1);
      if (f.heat > 0 && this.flameTick > 1) {
        g.effects.burst(target.houseX, 5, target.houseZ, "#ffb264", 10, 3);
        d.village.damage += 0.1;
        d.security = clamp(d.security - 0.2, 0, 100);
      }
    }
    if (this.flameTick > 1) this.flameTick = 0;
    for (const [index, m] of this.fireModels)
      if (!d.raid.fires.some((f) => f.index === index && f.heat > 0))
        m.visible = false;
    g.world.ritualObject.group.visible = g.state.isNight;
    g.world.ritualObject.stone.rotation.y = t;
    g.world.ritualObject.group.scale.setScalar(d.raid.suppressed ? 0.65 : 1);
  }
}
