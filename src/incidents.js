import { ATTACK_RANGE } from "./combat-tuning.js";
import { makeDinosaur } from "./frontier-models.js";
import { updateDinoIncident } from "./dino-incident.js";
import { DINO_NEST } from "./frontier-data.js";
import { makeLivestock, animateLivestock } from "./rural-models.js";
import { scaleEnemy } from "./combat-rules.js";
import { IncidentNavigation } from "./incident-navigation.js";
import * as THREE from "three";
import {
  LAB,
  ET_CAMP,
  LAB_SAMPLES,
  ET_PARTS,
  INCIDENT_ENEMIES,
  INCIDENT_TYPES,
} from "./incident-data.js";
import { nightPlan, nightMinutes, waveRoster } from "./incident-rules.js";
import { distance, clamp } from "./state.js";
import { makeIncidentEnemy } from "./incident-models.js";
import { mesh, orb, glow, animateHuman } from "./models.js";

export class Incidents {
  constructor(game) {
    this.game = game;
    this.navigation = new IncidentNavigation(game);
    this.actors = [];
    this.departures = [];
    this.serial = 0;
    this.seenEvent = null;
    this.defenderTimers = new Map();
    this.visualTick = 0;
    this.portal = new THREE.Group();
    game.scene.add(this.portal);
    this.portal.position.set(92, 44, -120);
    for (let i = 0; i < 3; i++) {
      const ring = mesh(
        this.portal,
        new THREE.TorusGeometry(11 + i * 0.6, 0.12, 6, 64),
        new THREE.MeshBasicMaterial({
          color: i === 1 ? "#be9eff" : "#81dbea",
          transparent: true,
          opacity: 0.7,
        }),
      );
      ring.rotation.z = i * 0.4;
    }
    this.portal.visible = false;
    this.meteor = new THREE.Group();
    game.scene.add(this.meteor);
    orb(this.meteor, 0.7, "#eaf3cf", 0, 0, 0, 1, {
      emissive: "#e7f1c4",
      emissiveIntensity: 4,
    });
    const tail = mesh(
      this.meteor,
      new THREE.ConeGeometry(0.5, 18, 10),
      new THREE.MeshBasicMaterial({
        color: "#9bdddc",
        transparent: true,
        opacity: 0.6,
      }),
      -8,
      4,
      0,
    );
    tail.rotation.z = -1.1;
    this.meteor.visible = false;
    for (let i = 0; i < 3; i++) {
      const x = [-36, 35, 47][i],
        z = [-51, -91, 76][i];
      game.life.addResident(
        {
          id: "warga-malam-" + i,
          name: ["Pak Harun", "Bu Sari", "Mas Yanto"][i],
          role: "Warga penjaga lingkungan",
          x,
          z,
          color: ["#ada383", "#a9827c", "#7c9e92"][i],
          day: true,
          night: true,
          line: "Pabrik baru itu membuat kami gelisah. Kalau sirine berbunyi, kami menunggu bantuan di luar rumah.",
        },
        [
          { x, z },
          { x: x + 4, z: z + 6 },
        ],
      );
    }
    const hud = document.createElement("section");
    hud.id = "incident-hud";
    hud.className = "hidden";
    hud.innerHTML =
      '<span class="incident-kicker"></span><strong class="incident-title"></strong><div class="incident-detail"></div><div class="incident-boss hidden"><small></small><div class="meter enemy"><i></i></div></div><button data-action="incident-waypoint">Tandai ancaman terdekat</button>';
    document.querySelector("#hud").appendChild(hud);
    this.hud = hud;
    this.sync();
    this.applyResidents();
    this.updateWorld();
  }
  get data() {
    return this.game.state.data.incidents;
  }
  get event() {
    return this.data.event;
  }
  sync() {
    const g = this.game,
      d = g.state.data,
      s = this.data;
    if (!s.labBuilt && (d.night >= 2 || !g.state.isNight)) {
      s.labBuilt = true;
      g.ui.toast(
        "Pabrik Payung Korp dibuka di timur laut. Temui Prof William.",
        "success",
      );
    }
    // Keep an existing night's encounter/result intact when upgrading old saves.
    if (s.plan?.night === d.night && s.plan.version !== 2) {
      s.plan = s.event
        ? { ...s.plan, version: 2, kind: s.event.type }
        : nightPlan(s.seed, d.night);
    }
    if (s.plan?.night !== d.night) {
      if (this.event && ["active", "warning"].includes(this.event.phase))
        this.dawn();
      s.plan = nightPlan(s.seed, d.night);
      s.event = null;
      this.clearActors();
      this.seenEvent = null;
    }
    if (
      this.event &&
      this.seenEvent !== `${this.event.night}-${this.event.type}`
    ) {
      this.clearActors();
      this.seenEvent = `${this.event.night}-${this.event.type}`;
      this.serial = this.event.serial || 0;
      for (const r of this.event.enemies)
        if (r.hp > 0 && ["warning", "active"].includes(this.event.phase))
          this.createActor(r);
    }
  }
  start(type) {
    if (
      !INCIDENT_TYPES[type] ||
      !this.data.labBuilt ||
      !this.game.state.isNight
    )
      return false;
    if (
      this.event?.night === this.game.state.data.night &&
      this.event.phase !== "idle"
    )
      return false;
    this.clearActors();
    const d = this.game.state.data;
    if (type === "dino") d.frontier.dinoSeen = true;
    this.data.event = {
      night: d.night,
      type,
      phase: "warning",
      wave: 0,
      waveSeconds: 0,
      elapsed: 0,
      gap: 0,
      serial: 0,
      enemies: [],
      sanctuary: 100,
      skyX: d.x,
      skyZ: d.z,
      skyY: this.game.altitude,
      skyYaw: this.game.cameraYaw,
    };
    this.seenEvent = `${d.night}-${type}`;
    this.serial = 0;
    this.game.ui.toast(
      type === "zombie"
        ? "SIRINE PAYUNG KORP! Gerbang laboratorium jebol."
        : type === "dino"
          ? "METEOR JATUH! Raptor keluar dari sarang di barat daya. Selamatkan warga!"
          : "BINTANG JATUH! Portal Orion terbuka di langit.",
      "error",
    );
    this.game.audio.play(
      type === "zombie" ? "siren" : type === "dino" ? "dinosaur" : "portal",
    );
    this.game.state.save();
    return true;
  }
  createActor(record) {
    const base = INCIDENT_ENEMIES[record.kind];
    if (!base) return null;
    const def = {
      ...base,
      id: record.kind,
      region: "Payung Korp / Orion",
      radius: 0,
    };
    const model = record.animalType
      ? makeLivestock(record.animalType, true)
      : def.dinoSpecies
        ? makeDinosaur(def.dinoSpecies)
        : makeIncidentEnemy(def);
    model.position.set(record.x, record.y || 0, record.z);
    this.game.scene.add(model);
    const e = {
      def,
      model,
      pos: model.position,
      home: { x: record.x, z: record.z },
      name: record.animalType
        ? `${this.victim(record.residentId)?.name || "Ternak"} terinfeksi`
        : record.residentId
          ? "Warga terinfeksi"
          : def.name,
      hp: record.hp,
      maxHp: record.maxHp ?? def.hp,
      active: true,
      human: false,
      incident: record,
      attackTimer: record.cooldown || 0,
      hit: 0,
      aimHeight: def.aimHeight,
    };
    if (def.kind === "saucer") {
      const beam = mesh(
        model,
        new THREE.ConeGeometry(3.1, 14, 20, 1, true),
        new THREE.MeshBasicMaterial({
          color: "#a5e7e5",
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
        0,
        -7,
        0,
      );
      beam.visible = false;
      e.beam = beam;
    }
    scaleEnemy(e, this.game.state.data.level);
    this.actors.push(e);
    this.game.enemies.push(e);
    return e;
  }
  spawn(kind, x, z, extra = {}) {
    const r = {
      id: `${this.event.night}-${++this.serial}`,
      kind,
      x,
      z,
      y: INCIDENT_ENEMIES[kind].air ? (kind === "mothership" ? 36 : 14) : 0,
      hp: INCIDENT_ENEMIES[kind].hp,
      route: 0,
      cooldown: 0,
      ...extra,
    };
    this.event.serial = this.serial;
    this.event.enemies.push(r);
    return this.createActor(r);
  }
  spawnWave() {
    const e = this.event;
    e.wave++;
    e.waveSeconds = 0;
    e.gap = 0;
    waveRoster(e.type, e.wave).forEach((kind, i) => {
      if (e.type === "dino") {
        this.spawn(
          kind,
          DINO_NEST.x + 15 + (i % 3) * 2,
          DINO_NEST.z - 8 + Math.floor(i / 3) * 3,
        );
      } else if (e.type === "zombie") {
        const x = e.wave === 1 ? 206 + (i % 3) * 2 : e.wave === 4 ? 86 : 176,
          z =
            e.wave === 1
              ? -199 - Math.floor(i / 3) * 2
              : -130 + ((i % 3) - 1) * 0.6;
        this.spawn(kind, x, z, {
          house: i % this.game.world.houses.length,
          guard: i % 3 === 2 && i % 4 !== 1,
          farm: i % 4 === 1,
          route: e.wave === 1 ? 0 : 1,
        });
      } else {
        const air = INCIDENT_ENEMIES[kind].air;
        this.spawn(
          kind,
          air ? 65 + (i % 4) * 18 : 72 + (i % 5) * 4,
          air ? -142 - Math.floor(i / 4) * 12 : -143,
          { house: i % this.game.world.houses.length },
        );
      }
    });
    this.game.ui.toast(
      `${INCIDENT_TYPES[e.type].name} · Gelombang ${e.wave}/4${e.wave === 4 ? " · " + INCIDENT_TYPES[e.type].boss + " muncul!" : ""}`,
      "error",
    );
    this.game.audio.play("ring");
    this.game.state.save();
  }
  clearActors() {
    for (const e of this.actors) e.model.removeFromParent();
    this.actors = [];
    this.game.enemies = this.game.enemies.filter((e) => !e.incident);
  }
  availableVictims() {
    const g = this.game,
      result = [];
    for (const n of g.npcs) {
      if (
        !n.active ||
        n.kappaCaptive ||
        n.witchCursed ||
        n.incidentUnavailable ||
        [
          "william",
          "et",
          "kiai",
          "wiryo",
          "panitia",
          "bocil",
          "dukun",
          "mulyono",
          "pastor",
          "elon",
          "john",
          "kopdes-shop",
          "divisi-z-0",
          "divisi-z-1",
          "divisi-z-2",
        ].includes(n.def.id) ||
        Math.hypot(n.model.position.x, n.model.position.z) < 27
      )
        continue;
      result.push({ id: n.def.id, name: n.def.name, model: n.model, npc: n });
    }
    g.life.animals.forEach((a, i) => {
      if (!a.incidentUnavailable)
        result.push({
          id: `animal-${i}`,
          name: a.name || "Kerbau sawah",
          model: a.model,
          animal: a,
        });
    });
    return result;
  }
  victim(id) {
    const n = this.game.npcs.find((n) => n.def.id === id);
    if (n) return { id, name: n.def.name, model: n.model, npc: n };
    const a = this.game.life.animals[Number(id?.replace("animal-", ""))];
    return id?.startsWith("animal-") && a
      ? { id, name: a.name || "Kerbau sawah", model: a.model, animal: a }
      : null;
  }
  restrain(v, condition, shipId = null) {
    if (this.data.residents[v.id]) return false;
    this.data.residents[v.id] = {
      condition,
      shipId,
      x: v.model.position.x,
      z: v.model.position.z,
    };
    if (v.npc) v.npc.incidentUnavailable = true;
    if (v.animal) v.animal.incidentUnavailable = true;
    return true;
  }
  rescue(id, count = true) {
    const s = this.data.residents[id];
    if (!s) return;
    const v = this.victim(id);
    if (v) {
      const p = this.game.world.nearestLanding(s.x, s.z);
      v.model.position.set(p.x, 0, p.z);
      v.model.rotation.z = 0;
      v.model.visible = true;
      if (v.npc) {
        v.npc.incidentUnavailable = false;
        v.npc.active = true;
        v.npc.def.x = p.x;
        v.npc.def.z = p.z;
      }
      if (v.animal) v.animal.incidentUnavailable = false;
      this.game.effects.burst(p.x, 1.5, p.z, "#a6e7b1", 24, 4);
    }
    delete this.data.residents[id];
    this.data.lostCaptives = this.data.lostCaptives.filter((x) => x !== id);
    if (count) {
      this.game.state.data.stats.rescued++;
      if (v?.animal?.kind) this.game.rural.care(id);
    }
  }
  infect(v) {
    if (!this.restrain(v, "infected")) return;
    v.model.visible = false;
    this.spawn("infected", v.model.position.x, v.model.position.z, {
      residentId: v.id,
      animalType: v.animal ? v.animal.kind || "buffalo" : null,
      house: 0,
      route: 4,
    });
    this.game.ui.toast(
      v.name + " terinfeksi! Lumpuhkan, lalu berikan serum.",
      "error",
    );
  }
  applyResidents() {
    for (const n of this.game.npcs)
      n.incidentUnavailable = !!this.data.residents[n.def.id];
    this.game.life.animals.forEach(
      (a, i) => (a.incidentUnavailable = !!this.data.residents[`animal-${i}`]),
    );
    for (const [id, s] of Object.entries(this.data.residents)) {
      const v = this.victim(id);
      if (!v) continue;
      if (v.npc) v.npc.active = false;
      if (["sick", "injured"].includes(s.condition)) {
        v.model.visible = true;
        v.model.position.set(s.x, 0, s.z);
        v.model.rotation.z = 0.22;
      } else if (["lifting", "hunted"].includes(s.condition)) {
        v.model.visible = true;
      } else v.model.visible = false;
    }
  }
  damageHouse(house, power) {
    if (!house) return;
    const before = this.data.houses[house.id] ?? 100;
    if (before <= 0) return;
    const hp = Math.max(0, before - power);
    this.data.houses[house.id] = hp;
    this.game.state.data.village.damage += power / 10;
    this.game.state.data.security = clamp(
      this.game.state.data.security - power * 0.12,
      0,
      100,
    );
    this.game.effects.burst(
      house.x,
      3,
      house.z,
      hp === 0 ? "#a79b78" : "#b5a789",
      hp === 0 ? 80 : 12,
      hp === 0 ? 10 : 3,
    );
    if (hp === 0) {
      this.game.ui.toast(
        "Rumah warga runtuh! Warga akan membangunnya kembali saat fajar.",
        "error",
      );
      this.game.audio.play("hurt");
      this.game.cameraShake = 0.3;
    }
  }
  updateHouses() {
    for (const h of this.game.world.houses) {
      const hp = this.data.houses[h.id] ?? 100;
      h.group.visible = hp > 0;
      h.rubble.visible = hp <= 0;
      h.collider.disabled = hp <= 0;
      h.flight.h = hp <= 0 ? 1 : 9;
      h.group.rotation.z = hp > 0 && hp < 35 ? 0.035 : 0;
    }
  }
  moveAir(e, target, speed, dt) {
    const delta = new THREE.Vector3(
        target.x,
        target.y ?? e.pos.y,
        target.z,
      ).sub(e.pos),
      len = delta.length();
    if (len > 0.1)
      e.pos.addScaledVector(delta, Math.min(speed * dt, len) / len);
    e.model.rotation.y = Math.atan2(delta.x, delta.z);
  }
  updateZombie(e, dt, t) {
    const g = this.game,
      r = e.incident,
      d = g.state.data;
    const house = g.world.houses[r.house % g.world.houses.length];
    e.attackTimer -= dt;
    if (!g.isSafe && g.altitude < 5 && distance(e.pos, d) < 13) {
      if (distance(e.pos, d) > 2.5)
        this.navigation.move(e, d.x, d.z, e.def.speed, dt);
      else if (e.attackTimer <= 0) {
        g.hurt(e.power, "physical");
        e.attackTimer = 1.5;
      }
    } else {
      const nearby = this.availableVictims()
        .filter(
          (v) =>
            (v.npc || v.animal) &&
            distance(v.model.position, e.pos) < (e.def.boss ? 18 : 14),
        )
        .sort(
          (a, b) =>
            distance(a.model.position, e.pos) -
            distance(b.model.position, e.pos),
        )[0];
      if (nearby && e.attackTimer <= 0 && !r.residentId) {
        if (distance(nearby.model.position, e.pos) < 2.5) {
          this.infect(nearby);
          e.attackTimer = 7;
        } else
          this.navigation.move(
            e,
            nearby.model.position.x,
            nearby.model.position.z,
            e.def.speed,
            dt,
          );
      } else {
        const destination = r.farm
          ? { x: -126, z: 174 }
          : r.guard
            ? { x: 98, z: -157 }
            : { x: house.x, z: house.z + house.d / 2 + 3 };
        const route = [
          { x: 191, z: -130 },
          { x: r.guard ? 98 : 0, z: -130 },
          { x: r.guard ? 98 : 0, z: destination.z },
          destination,
        ];
        if (r.route < route.length) {
          const target = route[r.route];
          if (distance(e.pos, target) < 2.8) r.route++;
          else
            this.navigation.move(
              e,
              target.x,
              target.z,
              e.def.boss ? 4.8 : e.def.speed,
              dt,
            );
        } else if (distance(e.pos, destination) > 3.5) {
          this.navigation.move(
            e,
            destination.x,
            destination.z,
            e.def.speed,
            dt,
          );
        } else if (e.attackTimer <= 0) {
          e.attackTimer = e.def.boss ? 2.2 : 4;
          if (r.farm) {
            // Once the pen is empty, continue to a house instead of damaging it remotely.
            r.farm = false;
            r.route = 1;
          } else if (r.guard) {
            this.event.sanctuary = Math.max(
              0,
              this.event.sanctuary - e.power * 0.35,
            );
            g.effects.ring(98, -157, "#d5cc8d", 5);
            if (this.event.sanctuary <= 0) r.guard = false;
          } else {
            this.damageHouse(house, e.def.boss ? 38 : 5);
            if ((this.data.houses[house.id] ?? 100) <= 0) {
              r.house = (r.house + 1) % g.world.houses.length;
              r.route = 1;
            }
          }
        }
      }
    }
    if (r.animalType) {
      animateLivestock(e.model, t, true);
      return;
    }
    animateHuman(e.model, t, true, false);
    e.model.userData.arms.forEach(
      (a) => (a.rotation.x = -1.35 + Math.sin(t * 2) * 0.15),
    );
    if (e.def.boss) e.model.userData.torso.rotation.z = Math.sin(t * 2) * 0.055;
  }
  attackVillage(e, dt) {
    const g = this.game, r = e.incident;
    const houses = g.world.houses.filter(h => Math.hypot(h.x, h.z) >= 25 && (this.data.houses[h.id] ?? 100) > 0);
    let house = houses.find(h => h.id === r.villageTarget);
    if (!house) { house = houses.sort((a, b) => distance(a, e.pos) - distance(b, e.pos))[0]; r.villageTarget = house?.id; }
    if (!house) {
      if (e.def.air) this.moveAir(e, { x: 92, y: e.def.kind === "mothership" ? 36 : 20, z: -120 }, 6, dt);
      return;
    }
    const giant = e.def.kind === "mothership";
    if (e.def.air) this.moveAir(e, { x: house.x + 8, y: giant ? 36 : 17, z: house.z + 8 }, giant ? 5 : 8, dt);
    else this.navigation.move(e, house.x, house.z + house.d / 2 + 3, 2.4, dt);
    if (distance(e.pos, house) < (giant ? 35 : 22) && e.attackTimer <= 0) {
      g.effects.beam(e.pos.clone().add(new THREE.Vector3(0, e.aimHeight || 1, 0)), new THREE.Vector3(house.x, 4, house.z), "#d18bff", 0.45);
      this.damageHouse(house, giant ? 18 : 8); this.updateHouses();
      e.attackTimer = giant ? 3.5 : 4;
    }
  }
  updateAlien(e, dt, t) {
    const g = this.game, d = g.state.data, r = e.incident;
    e.attackTimer -= dt;
    r.retaliation = Math.max(0, (r.retaliation || 0) - dt);
    if (g.isSafe || distance(e.pos, d) > 65) r.retaliation = 0;
    if (r.retaliation > 0 && !r.captive) {
      if (r.victim) {
        const victim = this.victim(r.victim);
        if (victim && this.data.residents[victim.id]?.shipId === r.id) this.rescue(victim.id, false);
        r.victim = null; r.beam = 0;
      }
      if (e.beam) e.beam.visible = false;
      if (e.def.air) this.moveAir(e, { x: d.x + Math.sin(t * 0.4) * 12, y: g.altitude + (e.def.kind === "mothership" ? 32 : 14), z: d.z + Math.cos(t * 0.4) * 12 }, 8, dt);
      else if (distance(e.pos, d) > 12) this.navigation.move(e, d.x, d.z, 3.5, dt);
      if (e.attackTimer <= 0) { this.fireAtPlayer(e); e.attackTimer = 3; }
      return;
    }
    if (e.def.kind === "saucer") {
      if (e.beam) e.beam.visible = false;
      // Continue collecting after each delivery, including saves from the old one-delivery AI.
      r.delivered = false;
      if (r.captive) {
        this.moveAir(e, { x: 92, y: 38, z: -120 }, 12, dt);
        if (distance(e.pos, { x: 92, z: -120 }) < 7 && e.pos.y > 30) {
          if (!this.data.lostCaptives.includes(r.captive)) this.data.lostCaptives.push(r.captive);
          const captive = this.data.residents[r.captive];
          if (captive) { captive.condition = "aboard"; captive.shipId = "mothership"; }
          r.captive = null; r.beam = 0; e.name = "UFO Penculik";
        }
      } else {
        let v = this.victim(r.victim);
        if (!v || (this.data.residents[v.id] && this.data.residents[v.id].shipId !== r.id)) {
          const victims = this.availableVictims().filter(v => !this.actors.some(other => other !== e && other.active && other.incident.victim === v.id));
          v = victims.sort((a, b) => distance(a.model.position, e.pos) - distance(b.model.position, e.pos))[0];
          r.victim = v?.id; r.beam = 0;
        }
        if (v) {
          const saved = this.data.residents[v.id];
          const target = { x: saved?.x ?? v.model.position.x, z: saved?.z ?? v.model.position.z, y: 14 };
          this.moveAir(e, target, e.def.speed, dt);
          if (distance(e.pos, target) < 2 && Math.abs(e.pos.y - 14) < 3) {
            if (!saved) this.restrain(v, "lifting", r.id);
            r.beam = (r.beam || 0) + dt;
            e.beam.visible = true; v.model.visible = true; v.model.position.y = Math.min(12, r.beam * 3.2);
            if (r.beam >= 4) {
              r.captive = v.id; r.victim = null; r.beam = 0;
              this.data.residents[v.id].condition = "abducted";
              v.model.visible = false; e.beam.visible = false;
              e.name = "UFO Penculik · membawa sandera";
              g.ui.toast(v.name + " diculik! Jatuhkan UFO atau kapal induknya.", "error");
            }
          }
        } else this.attackVillage(e, dt);
      }
    } else {
      this.attackVillage(e, dt);
      if (e.def.kind === "mothership") e.model.rotation.y = t * 0.09;
      else animateHuman(e.model, t, true, false);
    }
  }
  fireAtPlayer(e) {
    const g = this.game,
      d = g.state.data;
    if (g.isSafe || !(e.incident.retaliation > 0)) return;
    const end = new THREE.Vector3(d.x, g.altitude + 1.7, d.z),
      start = e.pos.clone().add(new THREE.Vector3(0, e.aimHeight || 0, 0));
    if (start.distanceTo(end) > ATTACK_RANGE.alien) return;
    g.effects.beam(start, end, "#dc8cff", 0.45);
    g.effects.burst(end.x, end.y, end.z, "#dc8cff", 20, 2);
    g.hurt(e.power, "energy");
    g.audio.play("hit");
  }
  defenders(dt, t) {
    const g = this.game;
    if (!this.event || this.event.phase !== "active") return;
    for (const n of g.npcs.filter(
      (n) => n.def.outfit === "santri" && !n.incidentUnavailable,
    )) {
      const enemy = this.actors
        .filter(
          (e) =>
            e.active &&
            distance(e.pos, n.model.position) < 27 &&
            distance(e.pos, { x: 99, z: -163 }) < 50,
        )
        .sort(
          (a, b) =>
            distance(a.pos, n.model.position) -
            distance(b.pos, n.model.position),
        )[0];
      if (!enemy) continue;
      n.model.rotation.y = Math.atan2(
        enemy.pos.x - n.model.position.x,
        enemy.pos.z - n.model.position.z,
      );
      n.model.userData.arms[0].rotation.x = -1.4;
      const cooldown = (this.defenderTimers.get(n.def.id) || 0) - dt;
      this.defenderTimers.set(n.def.id, cooldown);
      if (cooldown <= 0) {
        this.defenderTimers.set(n.def.id, 1.2);
        g.damageEnemy(enemy, 7, "santri");
        const p = n.model.position;
        g.effects.burst(p.x, 2, p.z, "#e1dab0", 8, 2);
        g.effects.burst(
          enemy.pos.x,
          enemy.pos.y + 1,
          enemy.pos.z,
          "#dfd7a6",
          8,
          2,
        );
      }
    }
  }
  defeated(e, source) {
    const g = this.game,
      r = e.incident;
    if (!e.active || r.hp <= 0) return;
    e.active = false;
    e.hp = 0;
    r.hp = 0;
    e.model.visible = false;
    if (g.lockedTarget === e) g.lockedTarget = null;
    const zombie = ["zombie", "runner", "titan", "infected"].includes(r.kind);
    if (zombie) g.state.data.stats.zombies++;
    else if (e.def.dinoSpecies) g.state.data.stats.dinoHunted++;
    else {
      this.data.tech.cells += e.def.air ? 2 : 1;
      if (e.def.air) g.state.data.stats.ufoDown++;
    }
    if (r.residentId && this.data.residents[r.residentId])
      this.data.residents[r.residentId].condition = "sick";
    for (const id of [r.captive, r.victim])
      if (id && this.data.residents[id]?.shipId === r.id) this.rescue(id);
    g.state.data.coins += e.def.boss ? 180 : 12;
    g.state.addXp(e.def.boss ? 70 : 8);
    g.effects.burst(
      e.pos.x,
      e.pos.y + 1,
      e.pos.z,
      zombie ? "#bcc59a" : "#a4dff3",
      e.def.boss ? 140 : 22,
      e.def.boss ? 18 : 5,
    );
    if (e.def.boss) {
      if (!zombie)
        for (const id of Object.keys(this.data.residents))
          if (
            ["lifting", "abducted", "aboard", "hunted", "nest"].includes(
              this.data.residents[id].condition,
            )
          )
            this.rescue(id);
      this.win();
    }
    g.state.save();
  }
  win() {
    const g = this.game,
      e = this.event;
    if (!e || e.phase === "won") return;
    e.phase = "won";
    for (const a of this.actors) {
      a.active = false;
      a.model.visible = false;
      a.incident.hp = 0;
      if (a.incident.residentId && this.data.residents[a.incident.residentId])
        this.data.residents[a.incident.residentId].condition = "sick";
    }
    if (e.type === "zombie") g.state.data.stats.outbreaks++;
    else if (e.type === "dino") g.state.data.stats.dinoWaves++;
    else g.state.data.stats.alienWaves++;
    g.state.data.coins += 250;
    g.state.data.security = clamp(g.state.data.security + 15, 0, 100);
    g.ui.toast(
      "DESA BERTAHAN! " + INCIDENT_TYPES[e.type].boss + " tumbang. +250 koin.",
      "success",
    );
    g.audio.play("capture");
    this.portal.visible = false;
    g.state.save();
  }
  dawn() {
    const g = this.game,
      e = this.event;
    if (!e || !["warning", "active"].includes(e.phase)) return;
    e.phase = "dawn";
    for (const a of this.actors) {
      if (!a.active) continue;
      a.active = false;
      a.incident.hp = 0;
      if (e.type === "zombie") {
        g.effects.burst(a.pos.x, 1, a.pos.z, "#a39d89", 20, 3);
        g.effects.burst(a.pos.x, 2, a.pos.z, "#edba6c", 15, 2);
        a.model.visible = false;
        if (a.incident.residentId && this.data.residents[a.incident.residentId])
          this.data.residents[a.incident.residentId].condition = "sick";
      } else {
        this.departures.push({
          model: a.model,
          life: 3,
          ground: e.type === "dino",
        });
        if (e.type === "dino") continue;
        for (const id of [a.incident.captive, a.incident.victim]) {
          const s = this.data.residents[id];
          if (!s) continue;
          if (s.condition === "lifting") this.rescue(id, false);
          else {
            if (!this.data.lostCaptives.includes(id))
              this.data.lostCaptives.push(id);
            s.condition = "aboard";
            s.shipId = "mothership";
          }
        }
      }
    }
    g.ui.toast(
      e.type === "zombie"
        ? "Matahari terbit. Zombie jadi abu; warga bergotong royong memulihkan desa."
        : e.type === "dino"
          ? "Fajar tiba. Dinosaurus mundur ke sarang; warga dan ternak pulang dengan selamat."
          : "Fajar tiba. Armada Orion kabur; semua warga dan ternak kembali ke desa.",
    );
    this.portal.visible = false;
    g.state.save();
  }
  interactions() {
    const g = this.game,
      d = g.state.data,
      result = [];
    if (g.altitude > 5) return result;
    for (const p of g.world.incidentWorld.pickups) {
      if (
        this.data.collected.includes(p.id) ||
        (p.id.startsWith("lab") && !this.data.labBuilt)
      )
        continue;
      if (distance(d, p) < 4)
        result.push({
          type: "incident-pickup",
          obj: p,
          dist: distance(d, p) - 0.3,
          label: p.id.startsWith("lab")
            ? "Ambil tabung data Payung Korp"
            : "Ambil komponen UFO E.T.",
        });
    }
    const beacon = { x: ET_CAMP.x - 6, z: ET_CAMP.z - 1 };
    if (distance(d, beacon) < 4)
      result.push({
        type: "beacon",
        dist: distance(d, beacon),
        label: "Aktifkan suar kepulangan · 3 sel bintang",
      });
    for (const [id, s] of Object.entries(this.data.residents))
      if (s.condition === "sick" && distance(d, s) < 4)
        result.push({
          type: "cure",
          obj: id,
          dist: distance(d, s) - 1,
          label: "Pulihkan warga · 1 serum",
        });
    return result;
  }
  interact(it) {
    const g = this.game,
      d = g.state.data,
      s = this.data;
    if (it.type === "incident-pickup") {
      const p = it.obj;
      if (s.collected.includes(p.id)) return true;
      s.collected.push(p.id);
      p.group.visible = false;
      if (p.id.startsWith("lab")) {
        d.stats.labSamples++;
        s.tech.samples++;
      } else {
        d.stats.etParts++;
        s.tech.etParts++;
      }
      g.audio.play("collect");
      g.ui.toast(
        p.id.startsWith("lab")
          ? `Tabung riset ${d.stats.labSamples}/3. Laporkan kepada William.`
          : `Komponen UFO ${d.stats.etParts}/3. Kembalikan ke E.T.`,
        "success",
      );
    } else if (it.type === "beacon") {
      if (d.quests["et-parts"] !== "done") {
        g.ui.toast("Kembalikan tiga komponen kepada E.T. terlebih dahulu.");
        return true;
      }
      if (d.stats.signalReady) {
        g.ui.toast("Suar sudah aktif. Temui E.T. untuk menerima UFO.");
        return true;
      }
      if (s.tech.cells < 3) {
        g.ui.toast(
          "Butuh 3 sel bintang. Diperoleh dari E.T. atau pesawat alien.",
        );
        return true;
      }
      s.tech.cells -= 3;
      d.stats.signalReady = 1;
      g.effects.burst(254, 4, 219, "#b1ecff", 100, 12);
      g.ui.toast(
        "Sinyal pulang diterima! Temui E.T. untuk serah terima UFO.",
        "success",
      );
    } else if (it.type === "cure") {
      if (s.tech.serum < 1) {
        g.ui.toast(
          "Serum habis. Racik bersama Prof William: 2 daun obat + 1 sari gaib.",
        );
        return true;
      }
      s.tech.serum--;
      this.rescue(it.obj);
      g.ui.toast("Warga pulih dan kembali beraktivitas.", "success");
    } else return false;
    g.state.save();
    return true;
  }
  npcDialogue(npc) {
    if (npc.id === "william")
      return {
        ...npc,
        quest:
          this.game.state.data.quests["william-samples"] === "done"
            ? "william-flight"
            : "william-samples",
        line:
          this.game.state.data.quests["william-samples"] === "done"
            ? "Laras Surya dapat menjangkau pesawat di langit. Setelah 12 zombie dibasmi dan kamu memiliki Mecha Gundam, aku bisa memasang sayap terbang dan misil. Warga sakit membutuhkan serum penawar."
            : npc.line,
      };
    if (npc.id === "et")
      return {
        ...npc,
        quest:
          this.game.state.data.quests["et-home"] === "done"
            ? "et-tractor"
            : this.game.state.data.quests["et-parts"] === "done"
              ? "et-home"
              : "et-parts",
        line: this.data.tech.etDeparted
          ? "Aku telah pulang. Hologram ini bisa meningkatkan UFO-mu. Jatuhkan total tiga pesawat Orion, lalu aku pasang sinar pengangkat. Tekan U dua kali untuk mengangkat lalu menjatuhkan target. Hantu tidak terluka oleh jatuhan fisik."
          : this.game.state.data.quests["et-parts"] === "done"
            ? "Tiga sel bintang sudah kuberikan. Aktifkan suar di sebelah barat reruntuhan, lalu temui aku lagi. Aku pulang lewat portal; UFO yang selesai diperbaiki menjadi milikmu."
            : npc.line,
      };
    return npc;
  }
  updateWorld() {
    const w = this.game.world.incidentWorld,
      s = this.data;
    w.factory.visible = s.labBuilt && !w.factory.userData.weatherRuined;
    w.construction.visible = !s.labBuilt;
    for (const p of w.pickups) {
      p.group.visible =
        !s.collected.includes(p.id) && (!p.id.startsWith("lab") || s.labBuilt);
      p.group.rotation.y = this.game.elapsed * 0.5;
    }
    w.crystal.rotation.y = this.game.elapsed;
    w.wreck.visible = !s.tech.etDeparted;
    const william = this.game.npcs.find((n) => n.def.id === "william");
    if (william && !s.labBuilt) {
      william.active = false;
      william.model.visible = false;
    }
    const et = this.game.npcs.find((n) => n.def.id === "et");
    if (et) {
      et.model.scale.setScalar(s.tech.etDeparted ? 0.75 : 1);
      et.model.position.y = s.tech.etDeparted
        ? 0.3 + Math.sin(this.game.elapsed * 2) * 0.08
        : 0;
      if (s.tech.etDeparted && !et.model.userData.hologram) {
        et.model.userData.hologram = true;
        et.model.traverse((o) => {
          if (o.isMesh) {
            o.material = o.material.clone();
            o.material.transparent = true;
            o.material.opacity = 0.42;
            o.material.color.set("#9adce0");
            if (o.material.emissive) {
              o.material.emissive.set("#71ced7");
              o.material.emissiveIntensity = 0.45;
            }
            o.castShadow = false;
          }
        });
      }
    }
    this.updateHouses();
  }
  updateHUD() {
    const e = this.event,
      show =
        e &&
        ["warning", "active"].includes(e.phase) &&
        !this.game.sports.active;
    this.hud.classList.toggle("hidden", !show);
    document.body.classList.toggle("incident-running", !!show);
    if (!show) return;
    this.hud.querySelector(".incident-kicker").textContent =
      e.phase === "warning" ? "PERINGATAN DESA" : `GELOMBANG ${e.wave}/4`;
    this.hud.querySelector(".incident-title").textContent =
      INCIDENT_TYPES[e.type].name;
    this.hud.querySelector(".incident-detail").textContent =
      e.type === "zombie"
        ? `${this.actors.filter((a) => a.active).length} ancaman · Masjid ${Math.ceil(e.sanctuary)}%`
        : `${this.actors.filter((a) => a.active).length} ancaman · ${Object.values(this.data.residents).filter((s) => ["lifting", "abducted", "aboard", "hunted", "nest"].includes(s.condition)).length} sandera`;
    const boss = this.actors.find((a) => a.def.boss && a.active),
      bar = this.hud.querySelector(".incident-boss");
    bar.classList.toggle("hidden", !boss);
    if (boss) {
      bar.querySelector("small").textContent =
        `${boss.name} · Lv. ${boss.level}`;
      bar.querySelector("i").style.width = (100 * boss.hp) / boss.maxHp + "%";
    }
  }
  update(dt, t) {
    this.sync();
    const g = this.game,
      s = this.data;
    this.updateWorld();
    if (!g.state.isNight) {
      this.dawn();
      g.rural.restoreMorning();
    }
    if (
      s.labBuilt &&
      g.state.isNight &&
      s.plan.kind &&
      s.plan.kind !== "witch" &&
      !g.magic?.enemy &&
      !g.state.data.magic?.raid &&
      !this.event &&
      nightMinutes(g.state.data.time) >= s.plan.start - 1080
    )
      this.start(s.plan.kind);
    const ev = this.event;
    if (ev && ["warning", "active"].includes(ev.phase) && g.state.isNight) {
      ev.elapsed += dt;
      this.portal.visible = ev.type === "alien";
      this.portal.lookAt(g.camera.position);
      this.portal.rotation.z += t * 0.02;
      this.meteor.visible =
        ["alien", "dino"].includes(ev.type) && ev.elapsed < 7;
      if (this.meteor.visible) {
        const u = ev.elapsed / 7;
        const yaw = ev.skyYaw || 0;
        this.meteor.position.set(
          ev.skyX - Math.sin(yaw) * 40 + Math.cos(yaw) * (u * 70 - 35),
          (ev.skyY || 0) + 42 - u * 40,
          ev.skyZ - Math.cos(yaw) * 40 - Math.sin(yaw) * (u * 70 - 35),
        );
        this.meteor.rotation.y = -yaw;
        if (ev.type === "dino")
          this.meteor.position.set(
            DINO_NEST.x - 60 * (1 - u),
            100 * (1 - u) + 3,
            DINO_NEST.z - 30 * (1 - u),
          );
      }
      if (ev.phase === "warning" && ev.elapsed >= 7) {
        ev.phase = "active";
        if (ev.type === "dino") {
          g.effects.burst(DINO_NEST.x, 2, DINO_NEST.z, "#eabc76", 170, 18);
          g.audio.play("hurt");
          g.cameraShake = 0.35;
        }
        this.spawnWave();
      }
      if (ev.phase === "active") {
        ev.waveSeconds += dt;
        for (const e of [...this.actors]) {
          if (!e.active || e.heldByPlayer) continue;
          e.hit = Math.max(0, e.hit - dt);
          if (ev.type === "zombie") this.updateZombie(e, dt, t);
          else if (ev.type === "dino") updateDinoIncident(this, e, dt, t);
          else this.updateAlien(e, dt, t);
          const r = e.incident;
          r.x = e.pos.x;
          r.y = e.pos.y;
          r.z = e.pos.z;
          r.hp = e.hp;
          r.cooldown = e.attackTimer;
        }
        this.defenders(dt, t);
        if (
          ev.wave < 4 &&
          (this.actors.filter((a) => a.active).length === 0 ||
            ev.waveSeconds >= 65)
        ) {
          ev.gap += dt;
          if (ev.gap > 8 && this.actors.filter((a) => a.active).length < 28)
            this.spawnWave();
        }
      }
    } else {
      this.portal.visible = false;
      this.meteor.visible = false;
    }
    for (let i = this.departures.length - 1; i >= 0; i--) {
      const d = this.departures[i];
      d.life -= dt;
      if (d.ground) {
        const angle = Math.atan2(
          DINO_NEST.x - d.model.position.x,
          DINO_NEST.z - d.model.position.z,
        );
        d.model.rotation.y = angle;
        const terrain = g.weather?.movementFactor(d.model.position) ?? 1;
        d.model.position.x += Math.sin(angle) * dt * 10 * terrain;
        d.model.position.z += Math.cos(angle) * dt * 10 * terrain;
      } else d.model.position.y += dt * 20;
      if (d.life <= 0) {
        d.model.visible = false;
        this.departures.splice(i, 1);
      }
    }
    this.applyResidents();
    this.updateHUD();
  }
}
