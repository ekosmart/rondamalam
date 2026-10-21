import { LaserEffects } from "./laser-effects.js";
import "./joystick.css";
import { VillageWeather } from "./weather.js";
import "./weather.css";
import { Frontier } from "./frontier.js";
import { Expeditions } from "./expeditions.js";
import { SpiritRealm } from "./spirit-realm.js";
import { Coast } from "./coast.js";
import { WORLD_BOUNDS } from "./coast-rules.js";
import "./frontier.css";
import { PWAClient } from "./pwa-client.js";
import { RuralLife } from "./rural-life.js";
import { TractorBeam } from "./tractor-beam.js";
import { scaleEnemy, effectiveDamage } from "./combat-rules.js";
import "./style.css";
import "./mobile.css";
import * as THREE from "three";
import { World } from "./world.js";
import {
  GameState,
  clamp,
  distance,
  captureChance,
  freshState,
} from "./state.js";
import {
  GHOSTS,
  NPCS,
  POSTS,
  MOUNTS,
  ELEMENTS,
  SAFE_RADIUS,
  SAVE_KEY,
  QUESTS,
} from "./data.js";
import {
  makeHuman,
  animateHuman,
  makeGhost,
  makeBicycle,
  makeWeapon,
  mesh,
  cylinder,
  box,
  glowTexture,
} from "./models.js";
import { Soundscape } from "./audio.js";
import { UI } from "./ui.js";
import { makeMount, animateMount, makeResident } from "./expansion-models.js";
import { VillageLife } from "./village-life.js";
import { Minigames } from "./minigames.js";
import { MountCombat } from "./mount-combat.js";

import { Incidents } from "./incidents.js";
import { RangedCombat } from "./ranged-combat.js";

class Effects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.rings = [];
    this.lasers = new LaserEffects(scene);
    this.max = 1000;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(this.max * 3), 3),
    );
    geo.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(this.max * 3), 3),
    );
    geo.setDrawRange(0, 0);
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        map: glowTexture,
        size: 0.48,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  beam(start, end, color, life) { this.lasers.fire(start, end, color, life); }
  burst(x, y, z, color, n = 30, force = 5) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n && this.particles.length < this.max; i++) {
      const a = Math.random() * Math.PI * 2,
        s = Math.random() * force;
      this.particles.push({
        x,
        y,
        z,
        vx: Math.sin(a) * s,
        vy: Math.random() * force * 0.8 + 1,
        vz: Math.cos(a) * s,
        life: 0.4 + Math.random() * 0.8,
        max: 1.2,
        c,
      });
    }
  }
  ring(x, z, color, size = 4, slash = false) {
    const geo = slash
      ? new THREE.RingGeometry(size * 0.72, size, 40, 1, 0, Math.PI * 1.4)
      : new THREE.RingGeometry(0.94, 1, 64);
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const obj = new THREE.Mesh(geo, mat);
    obj.rotation.x = -Math.PI / 2;
    obj.position.set(x, slash ? 1.2 : 0.18, z);
    this.scene.add(obj);
    this.rings.push({ obj, life: 0.5, max: 0.5, size, slash });
  }
  update(dt) {
    this.lasers.update(dt);
    const pos = this.points.geometry.attributes.position,
      col = this.points.geometry.attributes.color;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= dt * 6;
    }
    this.particles.forEach((p, i) => {
      pos.setXYZ(i, p.x, p.y, p.z);
      const a = Math.min(1, p.life * 2);
      col.setXYZ(i, p.c.r * a, p.c.g * a, p.c.b * a);
    });
    pos.needsUpdate = true;
    col.needsUpdate = true;
    this.points.geometry.setDrawRange(0, this.particles.length);
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      r.obj.material.opacity = Math.max(0, r.life / r.max) * 0.8;
      const t = 1 - r.life / r.max;
      if (r.slash) r.obj.rotation.z += dt * 5;
      else r.obj.scale.setScalar(0.4 + t * r.size);
      if (r.life <= 0) {
        r.obj.removeFromParent();
        r.obj.geometry.dispose();
        r.obj.material.dispose();
        this.rings.splice(i, 1);
      }
    }
  }
}

class Game {
  constructor() {
    this.state = new GameState();
    this.audio = new Soundscape();
    this.audio.enabled = this.state.data.settings.sound;
    this.keys = new Set();
    this.started = false;
    this.elapsed = 0;
    this.cameraYaw = 0;
    this.cameraPitch = 0.58;
    this.cameraDistance = 22;
    this.facing = Math.PI;
    this.flashOn = true;
    this.altitude = 0;
    this.cruiseAltitude = 12;
    this.mechaAirborne = false;
    this.lockedTarget = null;
    this.cooldowns = {
      attack: 0,
      special: 0,
      companion: 0,
      bottle: 0,
      hurt: 0,
    };
    this.swing = 0;
    this.projectiles = [];
    this.enemies = [];
    this.npcs = [];
    this.waypoint = null;
    this.interactable = null;
    this.target = null;
    this.saveTimer = 0;
    this.uiTimer = 0;
    this.footTimer = 0;
    this.cameraShake = 0;
    this.deathTimer = 0;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      48,
      innerWidth / innerHeight,
      0.1,
      750,
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    document.querySelector("#game").appendChild(this.renderer.domElement);
    this.world = new World(this.scene);
    this.effects = new Effects(this.scene);
    if (!this.world.canMove(this.state.data.x, this.state.data.z))
      Object.assign(
        this.state.data,
        this.world.nearestLanding(this.state.data.x, this.state.data.z),
      );
    this.targetRing = mesh(
      this.scene,
      new THREE.RingGeometry(1.35, 1.5, 48),
      new THREE.MeshBasicMaterial({
        color: "#edc472",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    this.targetRing.rotation.x = -Math.PI / 2;
    this.targetRing.visible = false;
    this.player = makeHuman("#728368", true);
    this.scene.add(this.player);
    this.player.position.set(this.state.data.x, 0, this.state.data.z);
    this.player.rotation.y = this.facing;
    this.equipWeapon();
    this.equipMount();
    this.spawnCharacters();
    this.updateCompanion();
    this.flashlight = new THREE.SpotLight(
      "#fff0c5",
      65,
      37,
      Math.PI / 7,
      0.6,
      1.3,
    );
    this.flashlight.position.set(0, 2, 0);
    this.scene.add(this.flashlight, this.flashlight.target);
    this.flashBeam = mesh(
      this.scene,
      new THREE.ConeGeometry(3.2, 15, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: "#e8dfb6",
        transparent: true,
        opacity: 0.027,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.impactLight = new THREE.PointLight("#abcbaa", 0, 18, 1.5);
    this.scene.add(this.impactLight);
    this.ui = new UI(this);
    this.pwa = new PWAClient(this);
    this.life = new VillageLife(this);
    this.rural = new RuralLife(this);
    this.sports = new Minigames(this);
    this.mountCombat = new MountCombat(this);
    this.ranged = new RangedCombat(this);
    this.tractor = new TractorBeam(this);
    this.incidents = new Incidents(this);
    this.frontier = new Frontier(this);
    this.expeditions = new Expeditions(this);
    this.spirit = new SpiritRealm(this);
    this.weather = new VillageWeather(this);
    this.coast = new Coast(this);
    this.enemies.forEach((e) => scaleEnemy(e, this.state.data.level));
    this.bindControls();
    this.applyQuality();
    this.camera.position.set(27, 18, 35);
    this.camera.lookAt(-1, 2, -22);
    this.lastTime = performance.now();
    this.renderer.setAnimationLoop((t) => this.frame(t));
    document.querySelector("#loading").classList.add("fade");
    setTimeout(() => document.querySelector("#loading")?.remove(), 800);
    window.addEventListener("pagehide", () => this.state.save());
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.ui?.joystick?.reset();
      this.dragging = false;
    });
    document.addEventListener("visibilitychange", () => {
      this.keys.clear();
      this.ui?.joystick?.reset();
      this.dragging = false;
      this.lastTime = performance.now();
      if (document.hidden) this.state.save();
    });
  }
  get isFlying() {
    const d = this.state.data;
    return (
      d.riding &&
      (["naga", "ufo", "sembrani"].includes(d.mount) ||
        (d.mount === "mecha" &&
          d.incidents.tech.mechaFlight &&
          this.mechaAirborne))
    );
  }
  get isSafe() {
    return Math.hypot(this.state.data.x, this.state.data.z) < SAFE_RADIUS;
  }
  start() {
    this.started = true;
    this.state.data.introSeen = true;
    this.audio.start();
    this.state.save();
    this.ui.lastZone = "";
  }
  equipWeapon() {
    const h = this.player.userData.holder;
    while (h.children.length) h.remove(h.children[0]);
    h.add(makeWeapon(this.state.data.weapon));
  }
  equipMount() {
    if (this.bike) this.bike.removeFromParent();
    const m = MOUNTS.find((m) => m.id === this.state.data.mount) || MOUNTS[0];
    if (!this.isFlying && this.altitude > 0) this.land();
    this.bike = makeMount(m, {
      ...this.state.data.incidents.tech,
      spiritAwakened: this.state.data.spirit.sparks.length === 3,
      spiritBlessed: this.state.data.spirit.blessed,
    });
    this.scene.add(this.bike);
    this.bike.visible = this.state.data.riding;
  }
  updateCompanion() {
    if (this.companionModel) this.companionModel.removeFromParent();
    const c = this.state.companion;
    if (!c) {
      this.companionModel = null;
      return;
    }
    const def = GHOSTS.find((g) => g.id === c.id);
    this.companionModel = makeGhost(def, true);
    this.companionModel.visible = !this.sports?.active;
    this.companionModel.scale.setScalar(c.awakened ? 0.8 : 0.55);
    this.companionModel.position.set(
      this.state.data.x + 2,
      0,
      this.state.data.z + 2,
    );
    this.scene.add(this.companionModel);
    if (c.awakened) {
      const crown = new THREE.Group();
      this.companionModel.add(crown);
      crown.position.y = 2.1;
      const mat = new THREE.MeshBasicMaterial({
        color: ELEMENTS[def.element],
        transparent: true,
        opacity: 0.7,
      });
      const halo = mesh(
        crown,
        new THREE.TorusGeometry(1, 0.035, 5, 40),
        mat,
        0,
        0.1,
        -0.3,
      );
      halo.rotation.x = 0.3;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const shard = mesh(
          crown,
          new THREE.OctahedronGeometry(0.17),
          mat,
          Math.sin(a) * 1.25,
          Math.cos(a) * 1.25,
          -0.3,
        );
        shard.scale.y = 2;
      }
      this.companionModel.userData.crown = crown;
    }
  }
  spawnCharacters() {
    for (const def of GHOSTS) for (let copy = 0; copy < (def.copies ?? 3); copy++) {
      let home = { x: def.x, z: def.z };
      if (copy > 0) {
        for (let attempt = 0; attempt < 80; attempt++) {
          const a = (copy * 2.4 + attempt * 2.399), radius = Math.min(def.radius - 2, 8 + (attempt % 6) * 2);
          const candidate = { x: def.x + Math.cos(a) * radius, z: def.z + Math.sin(a) * radius };
          if (Math.hypot(candidate.x, candidate.z) > SAFE_RADIUS + 3 && this.world.canMove(candidate.x, candidate.z, 0.8) && this.enemies.every(e => distance(e.home, candidate) >= 6)) { home = candidate; break; }
        }
        if (home.x === def.x && home.z === def.z) continue;
      }
      const model = makeGhost(def);
      model.position.set(home.x, 0, home.z);
      this.scene.add(model);
      this.enemies.push({
        def,
        model,
        pos: model.position,
        home,
        spawnId: def.id + "-" + copy,
        aimHeight: def.aimHeight ?? 1.5,
        habitat: { x: def.x, z: def.z },
        name: def.name,
        hp: def.hp,
        maxHp: def.hp,
        active: false,
        respawn: 0,
        attackTimer: 0,
        hit: 0,
        wander: Math.random() * 6.28,
        human: false,
      });
    }
    const criminals = [
      {
        name: "Copet pasar",
        x: -96,
        z: 5,
        color: "#977457",
        hp: 70,
        day: true,
        night: false,
        radius: 32,
        pickpocket: true,
      },
      {
        name: "Maling kampung",
        x: -43,
        z: -41,
        color: "#555b51",
        hp: 65,
        day: true,
        night: true,
        radius: 17,
      },
      {
        name: "Sindikat curanmor",
        x: 48,
        z: 62,
        color: "#5a6669",
        hp: 95,
        day: true,
        night: true,
        radius: 18,
      },
      {
        name: "Begal jalan desa",
        x: 87,
        z: 141,
        color: "#69544b",
        hp: 120,
        day: false,
        night: true,
        radius: 25,
      },
      {
        name: "Koruptor dana desa",
        x: 90,
        z: -60,
        color: "#808875",
        hp: 80,
        day: true,
        night: false,
        radius: 14,
      },
      {
        name: "Pencuri pasar",
        x: -107,
        z: 25,
        color: "#756954",
        hp: 70,
        day: true,
        night: true,
        radius: 17,
      },
      {
        name: "Begal kebun sawit",
        x: -176,
        z: 114,
        color: "#685547",
        hp: 110,
        day: false,
        night: true,
        radius: 20,
      },
    ];
    for (const def of criminals) {
      const model = makeHuman(def.color);
      if (def.name.includes("curanmor")) {
        const bike = makeBicycle("motor", "#574e46");
        bike.position.set(2, 0, 0);
        model.add(bike);
      }
      model.position.set(def.x, 0, def.z);
      this.scene.add(model);
      this.enemies.push({
        def,
        model,
        pos: model.position,
        home: { x: def.x, z: def.z },
        name: def.name,
        hp: def.hp,
        maxHp: def.hp,
        active: false,
        respawn: 0,
        attackTimer: 0,
        hit: 0,
        wander: Math.random() * 6.28,
        human: true,
      });
    }
    for (const def of NPCS) {
      const model = makeResident(def);
      model.position.set(def.x, 0, def.z);
      model.rotation.y = Math.PI * 0.3;
      this.scene.add(model);
      this.npcs.push({ def, model, active: true });
    }
  }
  bindControls() {
    const actions = {
      KeyX: "clear-target",
      KeyV: "mecha-flight",
      KeyH: "missiles",
      KeyU: "tractor",
      KeyE: "interact",
      KeyQ: "special",
      KeyG: "companion",
      KeyR: "capture",
      KeyB: "mount",
      KeyF: "flashlight",
      KeyI: "inventory",
      KeyJ: "journal",
      KeyM: "map",
      KeyP: "camp",
      Space: "attack",
      Digit1: "attack",
    };
    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      )
        e.preventDefault();
      if (e.code === "Tab" && this.ui.panel) {
        e.preventDefault();
        const nodes = [
          ...document.querySelectorAll(".panel button:not(:disabled)"),
        ];
        const index = nodes.indexOf(document.activeElement);
        nodes[
          (index + (e.shiftKey ? -1 : 1) + nodes.length) % nodes.length
        ]?.focus();
        return;
      }
      if (e.code === "Escape") {
        if (this.ui.panel) this.ui.close();
        else if (this.started) this.ui.open("settings");
        return;
      }
      if (e.repeat) {
        this.keys.add(e.code);
        return;
      }
      if (this.ui.menuOpen || this.ui.panel) return;
      this.keys.add(e.code);
      if (actions[e.code]) this.ui.handle(actions[e.code]);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", (e) => {
      if (!this.started || this.ui.panel || this.dragging) return;
      this.cameraPointer = e.pointerId;
      this.dragging = true;
      this.pointerStart = { x: e.clientX, y: e.clientY };
      this.pointerLast = { x: e.clientX, y: e.clientY };
      this.pointerMoved = false;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!this.dragging || this.cameraPointer !== e.pointerId) return;
      const dx = e.clientX - this.pointerLast.x,
        dy = e.clientY - this.pointerLast.y;
      if (
        Math.hypot(
          e.clientX - this.pointerStart.x,
          e.clientY - this.pointerStart.y,
        ) > 5
      )
        this.pointerMoved = true;
      if (this.pointerMoved) {
        this.cameraYaw -= dx * 0.005;
        this.cameraPitch = clamp(this.cameraPitch + dy * 0.003, -1.25, 1.18);
      }
      this.pointerLast = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener("pointerup", (e) => {
      if (this.cameraPointer !== e.pointerId) return;
      if (this.dragging && !this.pointerMoved && e.button === 0) {
        this.pickTarget(e.clientX, e.clientY);
      }
      this.dragging = false;
    });
    for (const ev of ["pointercancel", "lostpointercapture"]) canvas.addEventListener(ev, e => { if (e.pointerId === this.cameraPointer) this.dragging = false; });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.cameraDistance = clamp(
          this.cameraDistance + e.deltaY * 0.015,
          9,
          42,
        );
      },
      { passive: false },
    );
    window.addEventListener("resize", () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
  }
  applyQuality() {
    const high = this.state.data.settings.quality === "high";
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.6 : 1));
    this.renderer.shadowMap.enabled = high;
    this.renderer.shadowMap.needsUpdate = true;
  }
  action(action, args = {}) {
    if (this.pwa?.action(action)) return;
    if (this.started && this.spirit?.action(action, args)) return;
    if (this.started && this.coast?.action(action, args)) return;
    if (this.started && this.expeditions?.action(action, args)) return;
    if (this.started && this.frontier?.action(action, args)) return;
    const st = this.state,
      d = st.data,
      refresh = () => {
        st.save();
        if (this.ui.panel) this.ui.open(this.ui.panel);
      };
    if (action === "start-football") {
      this.sports.startFootball();
      return;
    }
    if (action === "start-race") {
      this.sports.startRace();
      return;
    }
    if (action === "quit-activity") {
      this.sports.action(action);
      return;
    }
    if (
      [
        "attack",
        "special",
        "companion",
        "capture",
        "mount",
        "flashlight",
        "mecha-flight",
        "missiles",
        "tractor",
        "interact",
      ].includes(action) &&
      (!this.started || this.ui.panel || this.deathTimer > 0)
    )
      return;
    if (
      ["craft", "upgrade", "buy-mount", "awaken", "rest"].includes(action) &&
      !this.isSafe
    ) {
      this.ui.toast("Rehat di pos ronda untuk melakukan ini.", "error");
      return;
    }
    if (
      this.sports.active &&
      ["mecha-flight", "missiles", "tractor"].includes(action)
    )
      return;
    if (this.sports.action(action)) return;
    switch (action) {
      case "story-waypoint": {
        const lab = args.id === "william";
        const prefix = lab ? "lab" : "et";
        const d = this.state.data;
        const pickup = this.world.incidentWorld.pickups.find(
          (p) =>
            p.id.startsWith(prefix) && !d.incidents.collected.includes(p.id),
        );
        this.waypoint =
          pickup ||
          (lab
            ? { x: 227, z: -212 }
            : d.quests["et-parts"] === "done" && !d.stats.signalReady
              ? { x: 254, z: 219 }
              : { x: 259, z: 224 });
        this.ui.close();
        this.ui.toast("Tujuan cerita ditandai di peta dan kompas.");
        break;
      }
      case "mix-serum":
        if (distance(d, { x: 227, z: -212 }) > 5 || !d.incidents.labBuilt)
          return;
        if (st.spend({ herb: 2, essence: 1 })) {
          d.incidents.tech.serum++;
          this.ui.toast(
            "Satu serum siap. Dekati warga yang sakit dan tekan E.",
            "success",
          );
          st.save();
          this.ui.dialogue(
            this.incidents.npcDialogue(
              this.npcs.find((n) => n.def.id === "william").def,
            ),
          );
        } else this.ui.toast("Perlu 2 daun obat dan 1 sari gaib.", "error");
        break;
      case "incident-waypoint": {
        const e = this.nearby(800).find((e) => e.incident);
        this.waypoint = e
          ? { x: e.pos.x, z: e.pos.z, name: e.name }
          : { x: 227, z: -212, name: "Prof William" };
        break;
      }
      case "mecha-flight":
        if (!(
          d.riding &&
          d.mount === "mecha" &&
          d.incidents.tech.mechaFlight
        )) {
          this.ui.toast(
            "Upgrade mecha melalui quest Prof William terlebih dahulu.",
          );
          break;
        }
        if (this.mechaAirborne) {
          this.land();
          this.mechaAirborne = false;
        } else this.mechaAirborne = true;
        this.ui.toast(
          this.mechaAirborne
            ? "Mode terbang · T/C ketinggian · H misil"
            : "Mode berjalan · H misil",
        );
        break;
      case "tractor":
        this.tractor.toggle();
        break;
      case "missiles":
        this.ranged.missiles();
        break;
      case "clear-target":
        this.lockedTarget = null;
        break;
      case "ascend":
        this.cruiseAltitude = clamp(this.cruiseAltitude + 5, 8, 80);
        break;
      case "descend":
        this.cruiseAltitude = clamp(this.cruiseAltitude - 5, 8, 80);
        break;
      case "attack":
        this.attack();
        break;
      case "special":
        this.special();
        break;
      case "companion":
        this.companionSkill();
        break;
      case "capture":
        this.capture();
        break;
      case "flashlight":
        this.flashOn = !this.flashOn;
        break;
      case "mount":
        if (d.riding && this.altitude > 0) this.land();
        this.mechaAirborne = false;
        d.riding = !d.riding;
        this.bike.visible = d.riding;
        this.ui.toast(
          d.riding
            ? "Naik " +
                MOUNTS.find((m) => m.id === d.mount).name +
                (d.mount === "naga"
                  ? " · T naik, C turun, B mendarat. Klik musuh untuk semburan api."
                  : d.mount === "mecha"
                    ? d.incidents.tech.mechaFlight
                      ? " · V terbang/berjalan · H misil · Spasi plasma."
                      : " · Kebal sihir. Klik musuh lalu Spasi untuk plasma."
                    : d.mount === "ufo"
                      ? " · T/C ketinggian · Spasi energi · U sinar pengangkat (upgrade)."
                      : d.mount === "sembrani"
                        ? " · T naik, C turun, B mendarat."
                        : ".")
            : "Turun dari tunggangan.",
        );
        break;
      case "interact":
        this.interact();
        break;
      case "craft":
        if (st.craft(args.id)) {
          this.equipWeapon();
          this.audio.play("capture");
          this.ui.toast(
            args.id === "bottle"
              ? "+3 botol kaca segel."
              : `${st.weapon.name} selesai ditempa.`,
            "success",
          );
          refresh();
        } else
          this.ui.toast(
            "Bahan belum cukup. Jelajahi desa untuk mengumpulkannya.",
            "error",
          );
        break;
      case "upgrade":
        if (st.upgrade(args.id)) {
          this.audio.play("capture");
          this.ui.toast(
            "Kemampuan meningkat. Malam terasa sedikit lebih ringan.",
            "success",
          );
          refresh();
        }
        break;
      case "equip-weapon":
        if (d.weapons.includes(args.id)) {
          d.weapon = args.id;
          this.equipWeapon();
          refresh();
        }
        break;
      case "buy-mount":
        if (st.buyMount(args.id)) {
          this.equipMount();
          refresh();
          this.ui.toast("Tunggangan siap dipakai dengan tombol B.", "success");
        }
        break;
      case "equip-mount":
        if (d.mounts.includes(args.id)) {
          d.mount = args.id;
          this.equipMount();
          refresh();
        }
        break;
      case "equip-ghost":
        if (d.collection.some((g) => g.id === args.id)) {
          d.companion = args.id;
          this.updateCompanion();
          refresh();
          this.ui.toast(
            "Pendamping akan ikut bertarung. Tekan G untuk memanggil skill.",
            "success",
          );
        }
        break;
      case "awaken":
        if (st.awaken(args.id)) {
          this.updateCompanion();
          this.audio.play("capture");
          refresh();
          this.ui.toast(
            "Awakening berhasil. Ultimate pendamping kini terbuka.",
            "success",
          );
        }
        break;
      case "accept-quest":
        if (
          QUESTS.some(
            (q) =>
              q.id === args.id &&
              (!q.requiresQuest || d.quests[q.requiresQuest] === "done"),
          ) &&
          !d.quests[args.id]
        ) {
          d.quests[args.id] = "active";
          this.frontier.accept(args.id);
          this.ui.close();
          this.ui.toast("Permintaan warga dicatat dalam jurnal.", "success");
          st.save();
        }
        break;
      case "claim-quest":
        if (st.claimQuest(args.id)) {
          this.equipWeapon();
          this.equipMount();
          if (args.id === "et-home")
            this.effects.burst(259, 3, 224, "#a6eddd", 120, 10);
          this.ui.close();
          this.audio.play("capture");
          this.ui.toast(
            args.id === "bowo-tirta"
              ? "Joran Pusaka Tirta diterima! Malam hari, bunyikan lima tiang untuk peluang ikan raksasa dan legendaris."
              : args.id === "william-samples"
                ? "Laras Surya diterima! Klik target, Spasi tembak, Q ledakan surya."
                : args.id === "william-flight"
                  ? "Mecha ditingkatkan! B naik, V terbang/berjalan, H misil."
                  : args.id === "et-home"
                    ? "E.T. pulang ke bintang. UFO hadiah persahabatan siap dinaiki dengan B."
                    : args.id === "et-tractor"
                      ? "Sinar pengangkat terpasang! Naik UFO, klik target, U angkat / jatuhkan."
                      : args.id === "farm-care"
                        ? "Kuda Sembrani kini milikmu! B terbang, T/C ketinggian."
                        : "Permintaan selesai. Imbalan diterima.",
            "success",
          );
          st.save();
        }
        break;
      case "meal":
        d.hp = st.maxHp;
        this.ui.close();
        this.ui.toast("Sepiring hangat memulihkan seluruh HP.", "success");
        break;
      case "report-bribe":
        if (d.bribeDay !== d.night) {
          d.bribeDay = d.night;
          d.coins += 25;
          d.security = clamp(d.security + 5, 0, 100);
          this.ui.close();
          this.ui.toast(
            "Amplop ditolak dan dicatat sebagai laporan. +25 koin tugas.",
            "success",
          );
          st.save();
        }
        break;
      case "rest":
        if (st.isNight) {
          d.time = 390;
        } else {
          d.time = 1110;
          d.night++;
          d.posts = [];
        }
        d.hp = st.maxHp;
        d.stamina = st.maxStamina;
        this.ui.close();
        this.ui.toast(
          st.isNight
            ? "Malam baru dimulai. Lima tiang menunggu dentingmu."
            : "Pagi tiba. Warga mulai beraktivitas.",
        );
        st.save();
        break;
      case "home-waypoint":
        this.waypoint = { x: 0, z: 0 };
        this.ui.close();
        this.ui.toast("Pos ronda ditandai.");
        break;
      case "post-waypoint": {
        const p = st.patrolPosts.find((p) => p.id === args.id);
        if (p) {
          this.waypoint = { x: p.x, z: p.z };
          this.ui.close();
          this.ui.toast(`${p.name} ditandai pada peta.`);
        }
        break;
      }
      case "sound":
        d.settings.sound = !d.settings.sound;
        this.audio.setEnabled(d.settings.sound);
        refresh();
        break;
      case "quality":
        d.settings.quality = d.settings.quality === "high" ? "low" : "high";
        this.applyQuality();
        refresh();
        break;
      case "save": {
        const ok = st.save();
        this.ui.toast(
          ok
            ? "Perjalanan tersimpan di browser ini."
            : "Penyimpanan browser tidak tersedia.",
          ok ? "success" : "error",
        );
        break;
      }
      case "menu":
        this.expeditions?.exit();
        this.frontier?.cancelFishing();
        st.save();
        this.ui.close();
        this.started = false;
        this.ui.menuOpen = true;
        document.querySelector("#menu").classList.remove("hidden");
        document.querySelector("#hud").classList.add("hidden");
        break;
      case "reset-prompt":
        document.querySelector("#panel-content").innerHTML =
          '<div class="empty-state"><h3>Mulai perjalanan baru?</h3><p>Semua koleksi, pusaka, koin, dan progres di browser ini akan dihapus.</p><button class="primary" data-action="reset-confirm">Ya, hapus progres & mulai baru</button><button class="text-button" style="margin:20px" data-action="settings">Batalkan</button></div>';
        break;
      case "reset-confirm":
        try {
          localStorage.removeItem(SAVE_KEY);
        } catch {}
        this.state.data = freshState();
        this.state.save();
        location.reload();
        break;
    }
  }
  interact() {
    if (this.interactable?.type.startsWith("spirit-") && this.spirit.interact(this.interactable)) return;
    if (this.frontier.fishing) {
      this.frontier.reel();
      return;
    }
    if (this.altitude > 5) {
      this.ui.toast("Tekan B untuk mendarat sebelum berinteraksi.");
      return;
    }
    const it = this.interactable;
    if (!it) return;
    if (
      this.coast.interact(it) ||
      this.spirit.interact(it) ||
      this.weather.interact(it) ||
      this.frontier.interact(it) ||
      this.rural.interact(it) ||
      this.incidents.interact(it)
    )
      return;
    if (it.type === "ritual") {
      this.life.suppress();
      return;
    }
    if (it.type === "fire") {
      this.life.extinguish(it.obj);
      return;
    }
    if (it.type === "npc") {
      this.ui.dialogue(this.incidents.npcDialogue(it.obj.def));
      return;
    }
    if (it.type === "camp") {
      this.ui.open("camp");
      return;
    }
    if (it.type === "post") {
      if (this.state.ring(it.obj.id)) {
        this.audio.play("ring");
        this.effects.ring(it.obj.x, it.obj.z, "#ddc28a", 9);
        this.swing = 0.001;
        this.ui.toast(
          this.state.data.posts.length === 5
            ? "Lima denting lengkap. +75 koin bonus. Temui Pak Wiryo."
            : `${it.obj.name} dibunyikan. +15 koin.`,
          "success",
        );
        this.state.save();
      } else
        this.ui.toast(
          this.state.isNight
            ? "Tiang ini sudah dibunyikan malam ini."
            : "Patroli tiang dimulai setelah matahari terbenam.",
        );
    }
    if (it.type === "pickup") {
      const p = it.obj;
      this.state.data[p.type] += p.type === "glass" ? 2 : 1;
      if (p.type === "herb") this.state.data.stats.herbsFound++;
      p.cooldown = 180;
      p.group.visible = false;
      this.audio.play("collect");
      this.effects.burst(p.x, 0.5, p.z, "#c8d298", 12, 2);
      this.ui.toast(
        `Diperoleh ${p.type === "glass" ? "2 kaca" : p.type === "herb" ? "1 daun obat" : "1 besi"}.`,
        "success",
      );
    }
    if (it.type === "shrine") {
      const d = this.state.data;
      if (d.stats.restored) {
        this.ui.toast("Mustika Bumi telah pulih. Teruslah menjaga Sukarame.");
        return;
      }
      if (d.stats.bestPatrol < 5 || d.stats.captured < 3) {
        this.ui.toast(
          "Ritual memerlukan satu ronda lengkap dan 3 tangkapan roh.",
          "error",
        );
        return;
      }
      if (!this.state.spend({ essence: 6 })) {
        this.ui.toast("Ritual memerlukan 6 sari gaib.", "error");
        return;
      }
      d.stats.restored = 1;
      d.security = 100;
      this.effects.burst(211, 2, -123, "#c7edbc", 180, 14);
      this.effects.ring(211, -123, "#bfdc9a", 25);
      this.audio.play("capture");
      this.ui.toast(
        "MUSTIKA BUMI PULIH. Celah mereda. Laporkan kepada Bu Laras.",
        "success",
      );
      this.state.save();
    }
  }
  findInteraction() {
    if (this.altitude > 5 || this.sports?.active) {
      this.interactable = this.sports?.active ? null : (this.spirit?.interactions().sort((a,b) => a.dist-b.dist)[0] || null);
      return;
    }
    const d = this.state.data,
      candidates = [];
    for (const n of this.npcs)
      if (n.active && !n.incidentUnavailable && distance(d, n.def) < 4.4)
        candidates.push({
          dist: distance(d, n.def),
          type: "npc",
          obj: n,
          label: `Bicara · ${n.def.name}`,
        });
    for (const p of this.state.patrolPosts)
      if (distance(d, p) < 4.7)
        candidates.push({
          dist: distance(d, p),
          type: "post",
          obj: p,
          label: this.state.data.posts.includes(p.id)
            ? `${p.name} · Sudah dibunyikan`
            : `Bunyikan · ${p.name}`,
        });
    for (const p of this.world.pickups)
      if (p.cooldown <= 0 && distance(d, p) < 3.2)
        candidates.push({
          dist: distance(d, p),
          type: "pickup",
          obj: p,
          label: `Ambil ${p.type === "herb" ? "daun obat" : p.type === "glass" ? "kaca" : "besi"}`,
        });
    if (distance(d, { x: -8, z: 2 }) < 5.5)
      candidates.push({
        dist: distance(d, { x: -8, z: 2 }) + 0.5,
        type: "camp",
        label: "Pos ronda · Tempa & istirahat",
      });
    if (distance(d, { x: 211, z: -123 }) < 5)
      candidates.push({
        dist: distance(d, { x: 211, z: -123 }),
        type: "shrine",
        label: "Ritual Mustika Bumi · 6 sari gaib",
      });
    candidates.push(
      ...(this.coast?.interactions() || []),
      ...(this.spirit?.interactions() || []),
      ...(this.life?.interactions() || []),
      ...(this.incidents?.interactions() || []),
      ...(this.rural?.interactions() || []),
      ...(this.frontier?.interactions() || []),
      ...(this.weather?.interactions() || []),
    );
    candidates.sort((a, b) => a.dist - b.dist);
    this.interactable = candidates[0] || null;
  }
  nearby(range, ghostsOnly = false, origin = this.state.data) {
    return this.enemies
      .filter(
        (e) =>
          e.active &&
          e.hp > 0 &&
          (!e.dino || e === this.lockedTarget) &&
          (!ghostsOnly || (!e.human && !e.incident && !e.dino)) &&
          distance(e.pos, origin) < range,
      )
      .sort((a, b) => distance(a.pos, origin) - distance(b.pos, origin));
  }
  attack() {
    if (this.coast?.boating) return;
    if (this.spirit?.active) { this.spirit.attack(); return; }
    if (this.expeditions?.active || this.frontier?.mountedAttack()) return;
    if (this.sports?.active) {
      this.sports.kick();
      return;
    }
    if (
      this.state.data.riding &&
      ["naga", "mecha", "ufo"].includes(this.state.data.mount)
    ) {
      this.mountCombat.fire();
      return;
    }
    if (this.cooldowns.attack > 0 || this.deathTimer > 0) return;
    const d = this.state.data;
    if (d.riding) {
      if (this.altitude > 0) this.land();
      d.riding = false;
      this.bike.visible = false;
    }
    if (this.state.weapon.projectile) {
      this.ranged.shoot();
      return;
    }
    const w = this.state.weapon,
      range = w.id === "senter" ? 13 : w.id === "pecut" ? 6.5 : 4.1;
    const enemies = this.nearby(range).filter(
      (e) => Math.abs(e.pos.y - this.altitude) < 4,
    );
    if (this.lockedTarget && enemies.includes(this.lockedTarget))
      enemies.unshift(enemies.splice(enemies.indexOf(this.lockedTarget), 1)[0]);
    const aimed = this.lockedTarget || enemies[0];
    if (aimed) this.facing = Math.atan2(aimed.pos.x - d.x, aimed.pos.z - d.z);
    this.cooldowns.attack = w.attackCooldown ?? (w.id === "keris" ? 0.36 : 0.56);
    this.swing = 0.001;
    this.audio.play("swing");
    this.effects.ring(
      d.x + Math.sin(this.facing) * 1.6,
      d.z + Math.cos(this.facing) * 1.6,
      ELEMENTS[w.element],
      w.id === "pecut" ? 4.6 : 2.8,
      true,
    );
    const forward = new THREE.Vector2(
      Math.sin(this.facing),
      Math.cos(this.facing),
    );
    for (const e of enemies) {
      const dir = new THREE.Vector2(e.pos.x - d.x, e.pos.z - d.z).normalize();
      if (forward.dot(dir) > -0.15)
        this.damageEnemy(e, w.damage + d.upgrades.strength * 6);
    }
  }
  special() {
    if (this.frontier?.mountedAttack(true)) return;
    if (this.cooldowns.special > 0) {
      this.ui.toast(
        `Laiknya pusaka, perlu jeda ${Math.ceil(this.cooldowns.special)} detik.`,
      );
      return;
    }
    const d = this.state.data;
    if (d.stamina < 18) {
      this.ui.toast("Stamina belum cukup.", "error");
      return;
    }
    if (this.state.weapon.projectile && !d.riding) {
      if (this.ranged.shoot(true)) {
        d.stamina -= 18;
        this.cooldowns.special = 8;
      }
      return;
    }
    d.stamina -= 18;
    this.cooldowns.special = 8;
    this.swing = 0.001;
    const mecha = d.riding && d.mount === "mecha";
    const color = mecha ? "#8ce8f6" : ELEMENTS[this.state.weapon.element];
    this.effects.burst(d.x, 1.1, d.z, color, 110, 10);
    this.effects.ring(d.x, d.z, color, 10);
    this.audio.play("skill");
    this.impactLight.color.set(color);
    this.impactLight.position.set(d.x, 2, d.z);
    this.impactLight.intensity = 90;
    this.cameraShake = 0.15;
    for (const e of this.nearby(10).filter(
      (e) => Math.abs(e.pos.y - this.altitude) < 5,
    ))
      this.damageEnemy(
        e,
        mecha
          ? 70
          : (this.state.weapon.damage + d.upgrades.strength * 6) * 1.65,
      );
  }
  companionSkill() {
    const own = this.state.companion;
    if (!own) {
      this.ui.toast("Tangkap roh pertama untuk mendapat pendamping.", "error");
      return;
    }
    if (this.cooldowns.companion > 0) {
      this.ui.toast(
        `Pendamping memulihkan tenaga: ${Math.ceil(this.cooldowns.companion)} detik.`,
      );
      return;
    }
    const enemy =
      this.lockedTarget && distance(this.lockedTarget.pos, this.state.data) < 24
        ? this.lockedTarget
        : this.nearby(24)[0];
    if (!enemy) {
      this.ui.toast("Tidak ada musuh dalam jangkauan pendamping.");
      return;
    }
    const ghost = GHOSTS.find((g) => g.id === own.id),
      w = this.state.weapon;
    this.cooldowns.companion = 12;
    const fireWind =
        [ghost.element, w.element].includes("Api") &&
        [ghost.element, w.element].includes("Angin"),
      waterEarth =
        [ghost.element, w.element].includes("Air") &&
        [ghost.element, w.element].includes("Tanah");
    const same = ghost.element === w.element;
    const color = fireWind
        ? "#ffb459"
        : waterEarth
          ? "#8fe6c1"
          : ELEMENTS[ghost.element],
      radius = own.awakened ? 13 : fireWind ? 10 : 6;
    const power =
      (30 + own.level * 9) *
      (own.awakened ? 2 : 1) *
      (fireWind ? 1.6 : waterEarth ? 1.35 : same ? 1.25 : 1);
    this.effects.ring(enemy.pos.x, enemy.pos.z, color, radius);
    this.effects.burst(enemy.pos.x, 2, enemy.pos.z, color, 160, 10);
    if (fireWind) {
      for (let i = 0; i < 5; i++)
        setTimeout(() => {
          this.effects.burst(
            enemy.pos.x,
            i + 1,
            enemy.pos.z,
            color,
            25,
            5 - i * 0.5,
          );
        }, i * 100);
    }
    this.audio.play("skill");
    this.ui.toast(
      `${own.awakened ? "ULTIMATE · " : ""}${fireWind ? "Tornado Api" : waterEarth ? "Akar Pasang" : same ? "Resonansi " + ghost.element : "Seruan " + ghost.name}`,
      "success",
    );
    // Damage belongs to the summoned companion, with its own level and awakening scaling.
    for (const e of this.nearby(radius, false, enemy.pos))
      this.damageEnemy(e, power, "companion");
  }
  capture() {
    if (this.frontier?.capture()) return;
    if (this.altitude > 5) {
      this.ui.toast("Mendarat dahulu untuk melempar botol segel.");
      return;
    }
    if (this.cooldowns.bottle > 0) return;
    const d = this.state.data;
    if (d.bottles <= 0) {
      this.ui.toast("Botol habis. Racik lagi di pos ronda.", "error");
      return;
    }
    const eligible = this.nearby(18, true).filter(
      (e) => e.hp / e.maxHp <= 0.25,
    );
    const enemy = this.lockedTarget
      ? eligible.find((e) => e === this.lockedTarget)
      : eligible[0];
    if (!enemy) {
      this.ui.toast(
        "Dekati roh dan lemahkan HP-nya hingga 25% sebelum melempar.",
        "error",
      );
      return;
    }
    d.bottles--;
    this.cooldowns.bottle = 1.1;
    this.facing = Math.atan2(enemy.pos.x - d.x, enemy.pos.z - d.z);
    this.audio.play("bottle");
    const model = new THREE.Group();
    cylinder(model, 0.1, 0.18, 0.47, "#bddccc", 0, 0, 0, 6, {
      transparent: true,
      opacity: 0.8,
      metalness: 0.4,
    });
    cylinder(model, 0.07, 0.08, 0.16, "#839d82", 0, 0.3, 0, 6);
    this.scene.add(model);
    const start = new THREE.Vector3(d.x, 1.8, d.z),
      end = enemy.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
    const flight = clamp(start.distanceTo(end) / 15, 0.4, 1.2);
    const velocity = end.clone().sub(start).divideScalar(flight);
    velocity.y += 0.5 * 12 * flight;
    model.position.copy(start);
    this.projectiles.push({ model, velocity, enemy, time: 0, flight, end });
  }
  damageEnemy(e, amount, source = "player", type = "arcane") {
    if (!e.active || e.hp <= 0) return;
    if (amount > 0 && ["player", "missile", "tractor", "companion"].includes(source)) {
      e.provoked = 24;
      if (e.incident) e.incident.retaliation = 12;
    }
    amount = effectiveDamage(e, amount, type);
    if (amount <= 0) {
      if (source === "tractor" || source === "missile")
        this.ui.toast("Hantu kebal damage fisik. Gunakan plasma atau pusaka.");
      return;
    }
    e.hp = Math.max(0, e.hp - amount);
    e.hit = 0.18;
    e.attackTimer = Math.max(e.attackTimer, 0.25);
    this.audio.play("hit");
    this.effects.burst(
      e.pos.x,
      e.pos.y + (e.aimHeight ?? 1.5),
      e.pos.z,
      e.human ? "#d8b881" : ELEMENTS[e.def.element],
      16,
      4,
    );
    this.cameraShake = 0.06;
    if (e.human && e.name.includes("Koruptor") && e.hp <= 0)
      this.ui.toast(
        "Bukti penyelewengan diamankan. Dana desa kembali.",
        "success",
      );
    if (e.hp <= 0) this.defeat(e, false, source);
  }
  defeat(e, caught = false, source = "player") {
    this.coast?.defeated(e);
    if (e.dino) {
      this.frontier.wildDefeated(e);
      if (this.lockedTarget === e) this.lockedTarget = null;
      return;
    }
    if (e.incident) {
      this.incidents.defeated(e, source);
      if (this.lockedTarget === e) this.lockedTarget = null;
      return;
    }
    this.life?.stopRaid(e);
    if (this.lockedTarget === e) this.lockedTarget = null;
    e.active = false;
    e.model.visible = false;
    e.respawn = e.def.global ? 240 : 150;
    e.hp = 0;
    const d = this.state.data;
    const reward = e.human ? 25 : e.def.global ? 85 : 22;
    d.coins += reward + (e.stolen || 0);
    e.stolen = 0;
    d.security = clamp(d.security + (e.human ? 4 : 1), 0, 100);
    this.state.addXp(e.human ? 15 : e.def.global ? 45 : 23);
    if (e.human) {
      d.stats.criminals++;
      d.iron++;
      d.glass++;
    } else {
      d.essence += e.def.global ? 3 : 1;
      if (e.def.global) d.stats.globals++;
    }
    if (!caught)
      this.ui.toast(
        `${e.human ? "Pelaku diamankan" : e.name + " terusir"} · +${reward} koin${source === "companion" ? " · oleh pendamping" : ""}`,
        "success",
      );
    this.effects.burst(
      e.pos.x,
      1.5,
      e.pos.z,
      caught ? "#d1e9b1" : e.human ? "#e3cc90" : ELEMENTS[e.def.element],
      45,
      5,
    );
    this.state.save();
  }
  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.time += dt;
      p.velocity.y -= 12 * dt;
      p.model.position.addScaledVector(p.velocity, dt);
      p.model.rotation.z += dt * 7;
      const blocked =
        p.time > 0.12 &&
        p.model.position.y < 4.7 &&
        this.world.colliders.some(
          (c) =>
            Math.abs(p.model.position.x - c.x) < c.w + 0.08 &&
            Math.abs(p.model.position.z - c.z) < c.d + 0.08,
        );
      if (p.time >= p.flight || p.model.position.y < 0.1 || blocked) {
        const e = p.enemy;
        const canHit =
          !blocked &&
          e.active &&
          e.hp > 0 &&
          distance(p.model.position, e.pos) < 4.5;
        if (canHit && Math.random() < captureChance(e.hp, e.maxHp)) {
          this.state.catchGhost(e.def.id);
          this.defeat(e, true);
          this.updateCompanion();
          this.audio.play("capture");
          this.ui.toast(
            `${e.name} tertangkap! Tersimpan dalam Almanak Roh.`,
            "success",
          );
          this.state.save();
        } else {
          this.effects.burst(
            p.model.position.x,
            0.6,
            p.model.position.z,
            "#b6d9c3",
            25,
            3,
          );
          this.audio.play("fail");
          this.ui.toast(
            canHit
              ? "Segel retak. Roh lolos—lemahkan lagi atau coba botol lain."
              : "Lemparan meleset. Dekati roh agar lebih mudah ditangkap.",
            "error",
          );
        }
        p.model.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
        });
        p.model.removeFromParent();
        this.projectiles.splice(i, 1);
      }
    }
  }
  movementInput() {
    let x = 0,
      z = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) z--;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) z++;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x--;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x++;
    x += this.moveStick?.x || 0;
    z += this.moveStick?.z || 0;
    const len = Math.hypot(x, z);
    return { x: x / Math.max(1, len), z: z / Math.max(1, len), amount: Math.min(1, len) };
  }
  updatePlayer(dt) {
    if (this.coast?.moveBoat(dt)) return;
    const d = this.state.data;
    let { x, z, amount } = this.movementInput();
    const moving = x !== 0 || z !== 0;
    const running =
      (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight")) &&
      d.stamina > 2 &&
      moving &&
      !d.riding;
    const speed = amount *
      (this.weather?.movementFactor(d, this.isFlying) ?? 1) *
      (this.sports?.active === "race" && this.sports.offTrack ? 0.6 : 1) *
      (d.riding
        ? MOUNTS.find((m) => m.id === d.mount)?.speed || 22
        : running
          ? 11
          : 7);
    if (moving) {
      const len = Math.hypot(x, z);
      x /= len;
      z /= len;
      const xx = x * Math.cos(this.cameraYaw) + z * Math.sin(this.cameraYaw),
        zz = -x * Math.sin(this.cameraYaw) + z * Math.cos(this.cameraYaw);
      this.facing = Math.atan2(xx, zz);
      const nx = d.x + xx * speed * dt,
        nz = d.z + zz * speed * dt;
      if (this.isFlying) {
        d.x = clamp(nx, WORLD_BOUNDS.minX + 2, WORLD_BOUNDS.maxX - 2);
        d.z = clamp(nz, WORLD_BOUNDS.minZ + 2, WORLD_BOUNDS.maxZ - 2);
      } else {
        if (this.world.canMove(nx, d.z)) d.x = nx;
        if (this.world.canMove(d.x, nz)) d.z = nz;
      }
      this.footTimer -= dt;
      if (this.footTimer < 0) {
        this.footTimer = d.riding ? 0.38 : running ? 0.23 : 0.36;
        this.audio.play("step");
      }
    }
    d.stamina = clamp(
      d.stamina + (running ? -23 : 17) * dt,
      0,
      this.state.maxStamina,
    );
    if (this.isSafe) d.hp = clamp(d.hp + dt * 10, 0, this.state.maxHp);
    if (this.isFlying) {
      if (this.keys.has("KeyT"))
        this.cruiseAltitude = clamp(this.cruiseAltitude + dt * 10, 8, 80);
      if (this.keys.has("KeyC"))
        this.cruiseAltitude = clamp(this.cruiseAltitude - dt * 10, 8, 80);
      const floor = this.world.flightClearance(d.x, d.z);
      this.altitude = Math.max(
        floor,
        this.altitude +
          (Math.max(floor, this.cruiseAltitude) - this.altitude) *
            Math.min(1, dt * 3),
      );
    } else this.altitude = 0;
    this.player.visible = !(d.riding && ["mecha", "ufo"].includes(d.mount));
    this.player.position.set(
      d.x,
      this.altitude +
        (d.riding
          ? d.mount === "naga"
            ? 2.7
            : d.mount === "sembrani"
              ? 1.3
              : d.mount === "gyroball"
                ? 0.15
                : 0.65
          : 0),
      d.z,
    );
    const angle = Math.atan2(
      Math.sin(this.facing - this.player.rotation.y),
      Math.cos(this.facing - this.player.rotation.y),
    );
    this.player.rotation.y += angle * Math.min(1, dt * 14);
    if (this.swing > 0) {
      this.swing += dt * 3.4;
      if (this.swing >= 1) this.swing = 0;
    }
    animateHuman(this.player, this.elapsed, moving, d.riding, this.swing);
    if (d.riding && d.mount === "naga")
      this.player.userData.legs.forEach((leg) => (leg.rotation.x = -1.05));
    this.player.userData.legs.forEach((leg, i) => {
      const horseback = d.riding && d.mount === "sembrani";
      leg.rotation.z = horseback ? (i ? 1 : -1) * 0.4 : 0;
      if (horseback) leg.rotation.x = -0.35;
      if (d.riding && d.mount === "gyroball") leg.rotation.x = -1.15;
    });
    this.bike.position.set(d.x, this.altitude, d.z);
    animateMount(this.bike, d.mount, this.elapsed, moving);
    this.bike.userData.flightJets?.forEach((j) => {
      j.visible = this.isFlying;
      j.scale.y = 1 + Math.sin(this.elapsed * 25) * 0.2;
    });
    this.bike.rotation.y = this.player.rotation.y;
    this.bike.visible = d.riding;
    if (d.riding && moving)
      this.bike.userData.wheels.forEach(
        (w) => (w.rotation.z -= dt * speed * 1.5),
      );
    if (this.companionModel && !this.sports?.active) {
      const target = new THREE.Vector3(
        d.x + Math.cos(this.facing) * 2.3,
        0,
        d.z - Math.sin(this.facing) * 2.3,
      );
      this.companionModel.position.lerp(target, 1 - Math.exp(-dt * 4));
      this.companionModel.position.y =
        this.altitude + 0.65 + Math.sin(this.elapsed * 2.4) * 0.15;
      this.companionModel.rotation.y = this.facing;
      this.companionModel.userData.body.rotation.z =
        Math.sin(this.elapsed * 1.3) * 0.04;
      if (this.state.companion?.awakened && Math.random() < dt * 20)
        this.effects.burst(
          this.companionModel.position.x,
          1.2,
          this.companionModel.position.z,
          "#d4e4ad",
          1,
          1,
        );
    }
    if (
      !this.sports?.active &&
      this.waypoint &&
      distance(d, this.waypoint) < 4
    ) {
      this.waypoint = null;
      this.ui.toast("Kamu tiba di tujuan.");
    }
  }
  hurt(amount, type = "physical") {
    if (
      type === "magic" &&
      this.state.data.riding &&
      this.state.data.mount === "mecha"
    ) {
      this.mountCombat.shield();
      return;
    }
    if (this.isSafe || this.cooldowns.hurt > 0) return;
    const d = this.state.data;
    d.hp -= amount * (1 - d.upgrades.ward * 0.1);
    this.cooldowns.hurt = 0.65;
    this.ui.hurt();
    this.audio.play("hurt");
    this.cameraShake = 0.22;
    if (d.hp <= 0) {
      this.coast?.cancelBoat();
      this.frontier.cancelFishing();
      this.frontier.endCelebration();
      this.altitude = 0;
      this.mechaAirborne = false;
      this.lockedTarget = null;
      const loss = this.state.respawn();
      this.deathTimer = 2.8;
      this.keys.clear();
      this.ui?.joystick?.reset();
      this.dragging = false;
      this.ui.close();
      document.querySelector("#respawn-overlay").classList.remove("hidden");
      this.ui.toast(
        `Diselamatkan warga. ${loss} koin digunakan untuk perawatan.`,
      );
      this.state.save();
    }
  }
  steer(e, tx, tz, speed, dt) {
    speed *=
      this.weather?.movementFactor(e.pos, !!e.def?.air || !!e.heldByPlayer) ??
      1;
    const dx = tx - e.pos.x,
      dz = tz - e.pos.z,
      l = Math.hypot(dx, dz);
    if (l < 0.2) return;
    const angle = Math.atan2(dx, dz);
    for (const offset of [0, 0.65, -0.65, 1.3, -1.3]) {
      const a = angle + offset,
        nx = e.pos.x + Math.sin(a) * speed * dt,
        nz = e.pos.z + Math.cos(a) * speed * dt;
      if (Math.hypot(nx, nz) < SAFE_RADIUS + 1) continue;
      if (this.world.canMove(nx, nz, 0.42)) {
        e.pos.x = nx;
        e.pos.z = nz;
        e.model.rotation.y = a;
        return;
      }
    }
  }
  updateEnemies(dt) {
    const d = this.state.data;
    for (const e of this.enemies) {
      scaleEnemy(e, d.level);
      if (e.raid || e.incident || e.dino || e.heldByPlayer) continue;
      if (e.respawn > 0) {
        e.respawn -= dt;
        if (e.respawn <= 0) {
          e.hp = e.maxHp;
          e.pos.set(e.home.x, 0, e.home.z);
        }
      }
      const scheduled = e.human
        ? this.state.isNight
          ? e.def.night
          : e.def.day
        : this.state.isNight && (!e.def.global || this.state.isKliwon);
      e.active = scheduled && e.respawn <= 0 && e.hp > 0;
      e.model.visible = e.active;
      if (!e.active) continue;
      e.attackTimer -= dt;
      e.hit = Math.max(0, e.hit - dt);
      const pd = distance(e.pos, d),
        hd = distance(e.habitat || e.home, d),
        leash = e.def.radius;
      e.provoked = Math.max(0, (e.provoked || 0) - dt);
      if (this.isSafe || hd > leash + 75 || pd > 65) e.provoked = 0;
      const pursuing = e.provoked > 0;
      let moving = false;
      if (!this.isSafe && ((this.altitude < 6 && hd < leash && pd < 25) || pursuing)) {
        if (pd > 1.8) {
          let speed = e.human ? 3.4 : e.def.kind === "child" ? 5 : 2.8;
          if (this.flashOn && !e.human && pd < 12) speed *= 0.75;
          if (pursuing) this.incidents.navigation.move(e, d.x, d.z, Math.max(4.5, speed), dt);
          else this.steer(e, d.x, d.z, speed, dt);
          moving = true;
        } else if (e.attackTimer <= 0 && this.altitude < 6) {
          if (e.def.pickpocket) {
            const stolen = Math.min(d.coins, 18);
            d.coins -= stolen;
            e.stolen = (e.stolen || 0) + stolen;
            this.ui.toast(
              "Copet mengambil " +
                stolen +
                " koin! Amankan untuk mengambilnya kembali.",
              "error",
            );
          } else this.hurt(e.power, e.human ? "physical" : "magic");
          e.attackTimer = e.def.pickpocket ? 10 : e.def.global ? 1.3 : 1.7;
          if (e.def.id === "dracula") e.hp = Math.min(e.maxHp, e.hp + 8);
        }
        if (pursuing && !e.human && this.altitude >= 6 && Math.hypot(pd, this.altitude) < 18 && e.attackTimer <= 0) {
          this.effects.beam(e.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), new THREE.Vector3(d.x, this.altitude + 1.5, d.z), "#bb97ef");
          this.hurt(e.power, "magic"); e.attackTimer = 2.5;
        }
      } else {
        const target = {
          x: e.home.x + Math.sin(this.elapsed * 0.12 + e.wander) * 3,
          z: e.home.z + Math.cos(this.elapsed * 0.12 + e.wander) * 3,
        };
        if (distance(e.pos, target) > 0.8) {
          this.steer(
            e,
            target.x,
            target.z,
            distance(e.pos, e.home) > leash ? 4 : 1.05,
            dt,
          );
          moving = true;
        }
        if (distance(e.pos, e.home) > leash + 3)
          this.incidents.navigation.move(e, e.home.x, e.home.z, 4, dt);
      }
      if (e.human) {
        animateHuman(e.model, this.elapsed, moving, false);
        e.model.scale.setScalar(e.hit > 0 ? 1.05 : 1);
      } else {
        const gd = e.model.userData;
        e.pos.y = [
          "boar",
          "fox",
          "beast",
          "mummy",
          "tall",
          "antler",
          "child",
        ].includes(e.def.kind)
          ? 0
          : e.def.kind === "shroud"
            ? Math.abs(Math.sin(this.elapsed * 3 + e.wander)) * 0.45
            : 0.25 + Math.sin(this.elapsed * 2 + e.wander) * 0.2;
        gd.body.rotation.z = Math.sin(this.elapsed + e.wander) * 0.025;
        gd.own.emissiveIntensity =
          e.hit > 0
            ? 1.2
            : e.hp / e.maxHp <= 0.25
              ? 0.4 + Math.sin(this.elapsed * 9) * 0.3
              : 0.13;
        gd.own.emissive.set(
          e.hp / e.maxHp <= 0.25 ? "#d27967" : ELEMENTS[e.def.element],
        );
      }
    }
    for (const n of this.npcs) {
      if (n.ambient || n.incidentUnavailable) continue;
      n.active = this.state.isNight ? n.def.night : n.def.day;
      n.model.visible = n.active;
      if (n.active) {
        animateHuman(n.model, this.elapsed, false, false);
        if (distance(d, n.def) < 6)
          n.model.rotation.y = Math.atan2(d.x - n.def.x, d.z - n.def.z);
      }
    }
    this.updateTarget();
    if (this.state.isNight && !this.isSafe && Math.random() < dt * 0.06)
      d.security = clamp(d.security - 0.4, 10, 100);
  }
  updateCamera(dt) {
    const d = this.state.data;
    if (!this.started) {
      const t = this.elapsed;
      this.camera.position.set(
        20 + Math.sin(t * 0.035) * 2,
        13,
        35 + Math.sin(t * 0.025) * 2,
      );
      this.camera.lookAt(-3, 3, -24);
      return;
    }
    const mountDistance =
      this.state.data.riding &&
      ["naga", "mecha", "ufo", "sembrani"].includes(d.mount)
        ? Math.max(30, this.cameraDistance)
        : this.cameraDistance;
    const focus = this.altitude + (d.riding && d.mount === "mecha" ? 3 : 1.4);
    const flat = Math.cos(this.cameraPitch) * mountDistance;
    const target = new THREE.Vector3(
      d.x + Math.sin(this.cameraYaw) * flat,
      Math.max(this.weather?.flooded ? 1.65 : 1.1, focus + 0.6 + Math.sin(this.cameraPitch) * mountDistance),
      d.z + Math.cos(this.cameraYaw) * flat,
    );
    this.camera.position.lerp(target, 1 - Math.exp(-dt * 7));
    const shake = this.cameraShake;
    this.camera.position.x += (Math.random() - 0.5) * shake;
    this.camera.position.y += (Math.random() - 0.5) * shake;
    this.camera.position.y = Math.max(1.05, this.camera.position.y);
    this.camera.lookAt(d.x, focus + Math.max(0, -Math.sin(this.cameraPitch)) * mountDistance * 1.3, d.z);
    this.cameraShake = Math.max(0, shake - dt * 0.8);
  }
  updateLight() {
    const d = this.state.data,
      fx = Math.sin(this.facing),
      fz = Math.cos(this.facing);
    this.flashlight.visible = this.flashOn;
    this.flashBeam.visible =
      this.flashOn && this.state.isNight && this.altitude < 5;
    this.flashlight.position.set(d.x + 0.4, this.altitude + 1.8, d.z);
    this.flashlight.target.position.set(d.x + fx * 15, 0.35, d.z + fz * 15);
    this.flashBeam.position.set(d.x + fx * 7.5, 1.2, d.z + fz * 7.5);
    this.flashBeam.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(fx, -0.06, fz).normalize(),
    );
  }

  land() {
    const d = this.state.data,
      spot = this.world.nearestLanding(d.x, d.z);
    d.x = spot.x;
    d.z = spot.z;
    this.altitude = 0;
    this.player.position.set(d.x, 0, d.z);
    this.bike?.position.set(d.x, 0, d.z);
  }
  pickTarget(clientX, clientY) {
    if (this.spirit?.active) {
      if (!this.ui.panel) this.spirit.attack();
      return;
    }
    if (
      !this.started ||
      this.ui.panel ||
      this.deathTimer > 0 ||
      this.expeditions?.active
    )
      return;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        (clientX / innerWidth) * 2 - 1,
        1 - (clientY / innerHeight) * 2,
      ),
      this.camera,
    );
    const point = new THREE.Vector3();
    ray.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      point,
    );
    if (this.sports.active) {
      if (this.sports.active === "football") {
        this.sports.aim = point;
        this.sports.kick();
      }
      return;
    }
    const candidates = this.enemies.filter(
      (e) => e.active && e.hp > 0 && distance(e.pos, this.state.data) < 125,
    );
    const hits = ray
      .intersectObjects(
        candidates.map((e) => e.model),
        true,
      )
      .filter((h) => h.object.type !== "Sprite");
    if (hits.length) {
      let obj = hits[0].object;
      while (obj && !candidates.some((e) => e.model === obj)) obj = obj.parent;
      const target = candidates.find((e) => e.model === obj);
      if (target) {
        this.lockedTarget = target;
        this.target = target;
        this.facing = Math.atan2(
          target.pos.x - this.state.data.x,
          target.pos.z - this.state.data.z,
        );
        this.ui.toast(target.name + " ditarget · Spasi serang · X lepas");
        return;
      }
    }
    this.facing = Math.atan2(
      point.x - this.state.data.x,
      point.z - this.state.data.z,
    );
    this.attack();
  }
  updateTarget() {
    if (
      this.lockedTarget &&
      (!this.lockedTarget.active ||
        this.lockedTarget.hp <= 0 ||
        distance(this.lockedTarget.pos, this.state.data) > 135)
    )
      this.lockedTarget = null;
    this.target = this.lockedTarget || this.nearby(17)[0] || null;
    this.targetRing.visible = !!this.lockedTarget;
    if (this.lockedTarget) {
      this.targetRing.position.set(
        this.lockedTarget.pos.x,
        this.lockedTarget.pos.y + 0.22,
        this.lockedTarget.pos.z,
      );
      this.targetRing.rotation.z = this.elapsed * 0.6;
    }
  }

  frame(t) {
    const dt = Math.min((t - this.lastTime) / 1000, 0.05);
    this.lastTime = t;
    if (document.hidden) return;
    this.elapsed += dt;
    if (this.spirit?.active) {
      this.audio.setWeather({}, true);
      this.spirit.frame(dt, this.elapsed);
      return;
    }
    if (this.expeditions?.active) {
      this.audio.setWeather({}, true);
      this.expeditions.frame(dt, this.elapsed);
      return;
    }
    const running = this.started && !this.ui.panel && this.deathTimer <= 0;
    this.audio.setWeather(this.weather.def, !running);
    if (running) {
      const change = this.sports.active ? null : this.state.advance(dt);
      if (change) {
        this.ui.toast(
          change === "dawn"
            ? "Fajar tiba. HP pulih; warga membuka hari."
            : `Malam ${this.state.data.night} dimulai. Ronda kembali menunggu.`,
        );
        this.state.save();
      }
      for (const key in this.cooldowns)
        this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
      if (this.sports.active) {
        if (this.sports.countdown <= 0) this.updatePlayer(dt);
        this.sports.update(dt, this.elapsed);
        this.interactable = null;
        this.target = null;
        this.targetRing.visible = false;
        for (const n of this.npcs)
          if (n.def.z > 100 && n.def.z < 186 && n.def.x > -52 && n.def.x < 16)
            n.model.visible = false;
      } else {
        this.updatePlayer(dt);
        this.updateEnemies(dt);
        this.life.update(dt, this.elapsed);
        this.incidents.update(dt, this.elapsed);
        this.tractor.update(dt);
        this.rural.update(dt, this.elapsed);
        this.frontier.update(dt, this.elapsed);
        this.weather.update(dt);
        this.spirit.updateVillage(dt, this.elapsed);
        this.coast.update(dt, this.elapsed);
        this.ranged.update(dt);
        this.updateTarget();
        this.mountCombat.update(dt);
        this.updateProjectiles(dt);
        this.findInteraction();
      }
      this.audio.update(dt, this.state.isNight, !!this.target);
      this.saveTimer += dt;
      if (this.saveTimer > 10) {
        this.saveTimer = 0;
        this.state.save();
      }
    } else if (!this.started) {
      animateHuman(this.player, this.elapsed, false, false);
      this.updateEnemies(0);
    }
    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      this.player.position.set(this.state.data.x, 0, this.state.data.z);
      if (this.deathTimer <= 0) {
        document.querySelector("#respawn-overlay").classList.add("hidden");
        this.ui.lastZone = "";
      }
    }
    this.world.update(
      running ? dt : 0,
      this.elapsed,
      this.state,
      this.state.data,
    );
    this.weather.render(running ? dt : 0);
    this.effects.update(dt);
    this.impactLight.intensity = Math.max(
      0,
      this.impactLight.intensity - dt * 170,
    );
    this.updateLight();
    this.updateCamera(dt);
    this.uiTimer += dt;
    if (this.uiTimer > 0.12) {
      this.ui.update(this.uiTimer);
      this.uiTimer = 0;
    }
    this.renderer.render(this.scene, this.camera);
  }
}

try {
  const game = new Game();
  // Explicit test mode exposes a small test harness only for local integration checks.
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("test"))
    window.__ronda = game;
} catch (error) {
  console.error(error);
  document.querySelector("#loading").innerHTML =
    '<strong>Dunia belum bisa dibuka.</strong><span>Game memerlukan browser dengan WebGL 2 dan akselerasi grafis aktif.</span><button onclick="location.reload()">Coba lagi</button>';
}
