import * as THREE from "three";
import {
  box,
  orb,
  cylinder,
  sign,
  makeHuman,
  animateHuman,
  makeWeapon,
} from "./models.js";
import { makeMount, animateMount } from "./expansion-models.js";
import { MOUNTS } from "./data.js";
import { makeSpiritAsset } from "./spirit-models.js";
import { frontierPanel, frontierButton } from "./frontier.js";
import {
  SPIRIT_GATE,
  SPARKS,
  RELICS,
  NOTES,
  SPIRIT_STAGES,
  spiritStage,
  gateReason,
  collectSpiritItem,
  playSpiritNote,
  claimSpiritBlessing,
} from "./spirit-rules.js";
import "./spirit.css";

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const GUARD = { x: 0, z: 27 },
  QUEEN = { x: 0, z: -38 };
const GONG = { x: 18, z: -17 },
  WELL = { x: 10, z: 25 };
const CHESTS = [
  { id: "lotus", x: 29, z: 20 },
  { id: "tide", x: -29, z: -29 },
];
const btn = frontierButton;
export class SpiritRealm {
  constructor(g) {
    this.g = g;
    this.active = false;
    this.position = new THREE.Vector3();
    this.mounted = true;
    this.attackTimer = 0;
    this.specialTimer = 0;
    this.waterTimer = 0;
    this.waterCooldown = 0;
    this.sightTimer = 0;
    this.sightCooldown = 0;
    this.melody = 0;
    this.hudTime = 0;
    this.hud = document.createElement("section");
    this.hud.id = "spirit-hud";
    this.hud.className = "hidden";
    document.querySelector("#hud").append(this.hud);
    this.hud.innerHTML = `<div class="spirit-content"></div><nav class="spirit-return">${btn("spirit-exit", "Pulang ke pantai")}${btn("spirit-home", "Kembali ke desa")}</nav>`;
    this.hudContent = this.hud.querySelector(".spirit-content");
    this.buildBeach();
  }
  get s() {
    return this.g.state.data.spirit;
  }
  journal() {
    const [title, desc] = SPIRIT_STAGES[spiritStage(this.s)];
    return `<div class="note-box"><span class="eyebrow">SEMBRANI · KERATON SAMUDRA SUNYI</span><h3>${title}</h3><p>${desc}</p><small>Cahaya ${this.s.sparks.length}/3 · Pusaka ${this.s.relics.length}/3 · ${this.s.blessed ? "Restu diperoleh" : "Restu belum diperoleh"}</small><ol>${SPIRIT_STAGES.slice(
      0,
      8,
    )
      .map(
        ([name], i) =>
          `<li>${i < spiritStage(this.s) ? "✓ " : i === spiritStage(this.s) ? "→ " : ""}${name}</li>`,
      )
      .join(
        "",
      )}</ol><p>${btn("spirit-waypoint", "Tandai Pantai Sukma")}</p></div>`;
  }
  buildBeach() {
    const s = this.g.scene,
      { x, z } = SPIRIT_GATE;
    this.beach = new THREE.Group();
    this.beach.position.set(x, 0, z);
    s.add(this.beach);
    box(this.beach, 51, 0.09, 30, "#b9aa83", 0, 0.03, 0);
    box(this.beach, 51, 0.06, 10, "#287a7d", 0, 0.06, 14);
    const gate = makeSpiritAsset("gate");
    this.beach.add(gate);
    this.portal = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 6.3),
      new THREE.MeshBasicMaterial({
        color: "#77e9ca",
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      }),
    );
    this.portal.position.set(0, 3.2, 0);
    this.beach.add(this.portal);
    sign(this.beach, "PANTAI SUKMA • GERBANG KLIWON", 14, 1).position.set(
      0,
      9.3,
      0,
    );
    const keeper = makeHuman("#538477");
    keeper.position.set(-7, 0, -4);
    this.beach.add(keeper);
    sign(this.beach, "JURU GERBANG", 4, 0.6).position.set(-7, 3.5, -4);
    this.sparkModels = SPARKS.map((p) => {
      const gem = orb(s, 0.6, "#74f1d3", p.x, 1.6, p.z, 0, {
        emissive: "#54d5b6",
        emissiveIntensity: 1.6,
      });
      cylinder(s, 0.8, 1, 0.4, "#687a71", p.x, 0.2, p.z, 6);
      sign(s, p.name, 5, 0.6).position.set(p.x, 3, p.z);
      return { def: p, gem };
    });
  }
  interactions() {
    if (this.active || this.g.altitude > 12) return [];
    const d = this.g.state.data;
    const choices = [
      {
        type: "spirit-keeper",
        x: SPIRIT_GATE.x - 7,
        z: SPIRIT_GATE.z - 4,
        label: "Juru gerbang · Panggilan Sembrani",
      },
      {
        type: "spirit-gate",
        ...SPIRIT_GATE,
        label: "Lintas Sukma · Gerbang alam gaib",
      },
    ];
    if (this.s.started)
      for (const p of SPARKS)
        if (!this.s.sparks.includes(p.id))
          choices.push({
            type: "spirit-spark",
            ...p,
            label: "Pulihkan " + p.name,
          });
    return choices
      .map((p) => ({ ...p, dist: dist(p, d) }))
      .filter((p) => p.dist < 4.8);
  }
  interact(it) {
    const g = this.g,
      d = g.state.data;
    if (it.type === "spirit-keeper") {
      if (!d.mounts.includes("sembrani")) {
        g.ui.toast(
          "Miliki Sembrani dahulu: rawat lima ternak, lalu laporkan kepada Pak Mulyono.",
        );
        return true;
      }
      if (!this.s.started) {
        this.s.started = true;
        g.state.save();
      }
      g.ui.dialogue({
        name: "Juru Gerbang Sukma",
        role: "Penjaga lintasan",
        line:
          this.s.sparks.length < 3
            ? "Tiga cahaya leluhur menunggu di pantai. Tunggangi Sembrani dan pulihkan semuanya dengan E. Datanglah ke gerbang pada malam Kliwon."
            : "Sukma Sembrani telah pulih. Tunggangi ia menuju gerbang. Lintasan pertama memerlukan malam Kliwon; setelah itu jalanmu akan selalu terbuka.",
      });
      return true;
    }
    if (it.type === "spirit-spark") {
      if (!d.riding || d.mount !== "sembrani") {
        g.ui.toast("Pulihkan cahaya sambil menunggang Sembrani.");
        return true;
      }
      if (collectSpiritItem(this.s, "sparks", it.id)) {
        g.audio.play("collect");
        g.state.save();
        if (this.s.sparks.length === 3) {
          g.equipMount();
          g.ui.toast(
            "Sembrani Penembus Sukma bangkit! Gerbang pertama terbuka pada malam Kliwon.",
            "success",
          );
        } else
          g.ui.toast(
            "Cahaya sukma pulih " + this.s.sparks.length + "/3.",
            "success",
          );
      }
      return true;
    }
    if (it.type === "spirit-gate") {
      this.enter();
      return true;
    }
    return false;
  }
  enter() {
    const g = this.g,
      d = g.state.data;
    if (
      this.active ||
      g.expeditions.active ||
      g.sports.active ||
      dist(d, SPIRIT_GATE) > 6
    )
      return false;
    const reason = gateReason(d);
    if (reason) {
      g.ui.toast(reason);
      return false;
    }
    if (!this.scene) this.buildRealm();
    g.frontier.cancelFishing();
    g.frontier.endCelebration();
    g.tractor.reset();
    g.land();
    this.active = true;
    this.mounted = true;
    this.crossing = true;
    this.position.set(0, 0, 65);
    this.yaw = Math.PI;
    this.melody = 0;
    this.attackTimer = 0;
    this.specialTimer = 0;
    this.waterTimer = 0;
    this.sightTimer = 0;
    this.resetBoss();
    this.avatar.userData.holder.traverse((m) => {
      if (m.isMesh && m.userData.baseEmissive) m.material.dispose();
    });
    this.avatar.userData.holder.clear();
    this.avatar.userData.holder.add(makeWeapon(d.weapon));
    this.avatar.userData.holder.traverse((m) => {
      if (m.isMesh) {
        m.material = m.material.clone();
        m.userData.baseEmissive = m.material.emissive.clone();
        m.userData.baseIntensity = m.material.emissiveIntensity;
      }
    });
    if (this.s.blessed && !this.horse.userData.spiritBlessed) {
      this.horse.removeFromParent();
      this.horse = makeMount(
        MOUNTS.find((m) => m.id === "sembrani"),
        { spiritAwakened: true, spiritBlessed: true },
      );
      this.horse.userData.spiritBlessed = true;
      this.scene.add(this.horse);
    }
    d.x = SPIRIT_GATE.x;
    d.z = SPIRIT_GATE.z - 5;
    d.riding = false;
    g.state.save();
    g.ui.close();
    g.keys.clear();
    g.flightInput = 0;
    g.ui.joystick?.reset();
    g.lockedTarget = null;
    document.body.classList.add("inside-spirit");
    this.hud.classList.remove("hidden");
    this.updateHUD();
    g.ui.toast(
      "Lintas Sukma: kendalikan Sembrani dengan WASD menuju gerbang bercahaya.",
      "success",
    );
    return true;
  }
  exit(defeated = false, village = false) {
    if (!this.active) return;
    const g = this.g,
      d = g.state.data;
    this.active = false;
    this.crossing = false;
    this.waterTimer = 0;
    this.sightTimer = 0;
    g.ui.close();
    g.keys.clear();
    g.flightInput = 0;
    g.ui.joystick?.reset();
    Object.assign(d, {
      ...g.world.nearestLanding(village ? 0 : SPIRIT_GATE.x, village ? 12 : SPIRIT_GATE.z - 6),
      mount: "sembrani",
      riding: !village,
    });
    if (defeated) {
      d.hp = Math.max(1, Math.round(g.state.maxHp * 0.5));
      d.stamina = g.state.maxStamina;
    }
    g.altitude = 0;
    g.cruiseAltitude = 0;
    g.equipMount();
    g.updatePlayer(0);
    g.ui.lastZone = "";
    document.body.classList.remove("inside-spirit");
    this.hud.classList.add("hidden");
    g.state.save();
    if (defeated)
      g.ui.toast(
        "Sembrani membawamu pulang. Pusaka dan progres aman; Penjaga Palung pulih untuk percobaan berikutnya.",
      );
  }
  buildRealm() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color("#293e55");
    s.fog = new THREE.Fog("#46666c", 55, 140);
    s.add(new THREE.HemisphereLight("#b7e5df", "#3a4053", 2.1));
    const sun = new THREE.DirectionalLight("#ffe0ad", 2.8);
    sun.position.set(-30, 45, 25);
    s.add(sun);
    const moon = orb(s, 6, "#f1d2ab", -45, 30, -75, 2, {
      emissive: "#e8c49b",
      emissiveIntensity: 0.6,
    });
    this.water = box(s, 180, 0.2, 220, "#1f676d", 0, -0.3, 0, {
      metalness: 0.45,
      roughness: 0.25,
    });
    box(s, 68, 0.5, 82, "#707e77", 0, -0.05, -4);
    box(s, 64, 0.12, 78, "#869082", 0, 0.24, -4);
    box(s, 5, 0.12, 40, "#b2b394", 0, 0.1, 51);
    for (let z = -38; z <= 32; z += 4)
      box(s, 6, 0.025, 3.9, "#a9ad94", 0, 0.32, z);
    const palace = (this.palace = makeSpiritAsset("palace"));
    palace.position.set(0, 0.3, -39);
    s.add(palace);
    palace.traverse((m) => {
      if (m.isMesh) {
        m.material = m.material.clone();
      }
    });
    const gate = makeSpiritAsset("gate");
    gate.position.set(0, 0.3, 31);
    s.add(gate);
    for (const x of [-32, 32]) {
      box(s, 1, 1.6, 78, "#845445", x, 0.9, -4);
      for (let z = -38; z <= 32; z += 7) {
        box(s, 1.7, 2, 1.7, "#95654b", x, 1, z);
        coneLantern(s, x, 2.7, z);
      }
    }
    for (const x of [-21, 21]) {
      const pavilion = makeSpiritAsset("palace");
      pavilion.scale.setScalar(0.32);
      pavilion.position.set(x, 0.35, x < 0 ? 12 : 0);
      s.add(pavilion);
    }
    box(s, 13, 0.12, 13, "#286d73", -23, 0.34, -18);
    for (let i = 0; i < 13; i++) {
      const x = -27 + (i % 4) * 2.6,
        z = 8 + Math.floor(i / 4) * 2.6;
      cylinder(s, 0.7, 0.7, 0.05, "#477e61", x, 0.4, z, 7);
      orb(s, 0.32, "#e4b2c3", x, 0.64, z, 0);
    }
    this.fish = [];
    for (let i = 0; i < 12; i++) {
      const f = orb(s, 0.35, i % 2 ? "#efd7a1" : "#7aded1", 0, 0, 0, 0);
      f.scale.set(1.9, 0.7, 0.6);
      this.fish.push(f);
    }
    this.relicModels = RELICS.map((p) => {
      cylinder(s, 0.75, 1, 0.8, "#586f69", p.x, 0.7, p.z, 8);
      const gem = orb(s, 0.5, "#ecd698", p.x, 1.8, p.z, 0, {
        emissive: "#76c9aa",
        emissiveIntensity: 0.5,
      });
      sign(s, p.name, 4, 0.6).position.set(p.x, 3, p.z);
      return { def: p, gem };
    });
    this.falseSeal = orb(s, 0.5, "#8e5f8c", -18, 1, -19, 0);
    sign(s, "PEMANDIAN INGATAN", 8, 0.7).position.set(-23, 3.6, -22);
    this.guard = makeHuman("#619080");
    this.guard.position.set(GUARD.x, 0, GUARD.z);
    s.add(this.guard);
    sign(s, "JURU KERATON • TURUN & MINTA IZIN", 11, 0.6).position.set(
      0,
      4,
      27,
    );
    this.queen = makeHuman("#247966");
    this.queen.scale.setScalar(1.2);
    this.queen.position.set(QUEEN.x, 1, QUEEN.z);
    s.add(this.queen);
    const torso = this.queen.userData.torso;
    torso.children
      .find((o) => o.isMesh && Math.abs(o.position.y - 2.64) < 0.01)
      ?.removeFromParent();
    orb(torso, 0.34, "#182d30", 0, 2.43, -0.18, 1).scale.set(1, 1.2, 0.75);
    orb(torso, 0.22, "#17292a", 0, 2.37, -0.43, 1);
    for (const side of [-1, 1])
      orb(torso, 0.065, "#e2bd6d", side * 0.32, 2.28, 0.07, 0);
    cylinder(this.queen, 0.38, 0.85, 1.75, "#1a8873", 0, 0.9, 0, 8);
    for (let i = -2; i <= 2; i++)
      cylinder(
        this.queen,
        0.025,
        0.1,
        0.5 - Math.abs(i) * 0.07,
        "#e7bf70",
        i * 0.12,
        2.97,
        0,
        5,
      );
    box(this.queen, 1.3, 0.12, 0.3, "#dab668", 0, 1.98, 0.12);
    sign(s, "RATU SELATAN", 6, 0.8).position.set(0, 5.3, -38);
    for (let i = 0; i < 4; i++) {
      const x = GONG.x - 3 + i * 2;
      box(s, 1.7, 0.8, 1.2, "#75563c", x, 0.65, GONG.z);
      cylinder(s, 0.65, 0.65, 0.18, "#c5a264", x, 1.2, GONG.z, 12);
      sign(s, NOTES[i], 1.8, 0.4).position.set(x, 2.1, GONG.z);
    }
    sign(s, "OMBAK → BULAN → ANGIN → BINTANG", 12, 0.6).position.set(
      18,
      3.8,
      -19,
    );
    cylinder(s, 1.2, 1.5, 0.7, "#afc5b2", WELL.x, 0.5, WELL.z, 12);
    orb(s, 0.6, "#8ddde0", WELL.x, 1.1, WELL.z, 1, {
      emissive: "#8ddde0",
      emissiveIntensity: 0.5,
    });
    this.chests = CHESTS.map((p) => {
      const model = new THREE.Group();
      model.position.set(p.x, 0.3, p.z);
      s.add(model);
      box(model, 1.2, 0.8, 0.8, "#c2a36b", 0, 0.4, 0);
      box(model, 0.15, 0.9, 0.85, "#e0cf91", 0, 0.45, 0);
      return { def: p, model };
    });
    this.boss = makeSpiritAsset("boss");
    s.add(this.boss);
    this.telegraph = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 4.5, 48),
      new THREE.MeshBasicMaterial({
        color: "#fa7668",
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.telegraph.rotation.x = -Math.PI / 2;
    this.telegraph.position.y = 0.4;
    s.add(this.telegraph);
    this.avatar = makeHuman("#647b5a");
    s.add(this.avatar);
    this.horse = makeMount(
      MOUNTS.find((m) => m.id === "sembrani"),
      { spiritAwakened: true },
    );
    s.add(this.horse);
    this.camera = new THREE.PerspectiveCamera(
      52,
      innerWidth / innerHeight,
      0.1,
      240,
    );
  }
  resetBoss() {
    this.bossMax = 420 + Math.max(0, this.g.state.data.level - 1) * 25;
    this.bossHp = this.bossMax;
    this.bossPhase = "idle";
    this.bossTime = 0;
    this.boss.position.set(0, 0.3, -12);
    this.telegraph.visible = false;
    this.boss.visible = this.s.melodySolved && !this.s.bossDefeated;
  }
  nearest() {
    if (this.crossing) return null;
    const a = [
      { id: "exit", x: 0, z: 31, label: "Pulang bersama Sembrani" },
      { id: "guard", ...GUARD, label: "Minta izin · Juru Keraton" },
      { id: "queen", ...QUEEN, label: "Menghadap Ratu Selatan" },
      { id: "well", ...WELL, label: "Air teratai · Pulihkan HP" },
    ];
    if (this.s.welcomed) {
      for (const p of RELICS)
        if (!this.s.relics.includes(p.id))
          a.push({ ...p, id: "relic:" + p.id, label: "Pulihkan " + p.name });
      a.push({ id: "gong", ...GONG, label: "Mainkan gamelan" });
      a.push({
        id: "false-seal",
        x: -18,
        z: -19,
        label: "Periksa segel pemandian",
      });
    }
    if (this.sightTimer > 0)
      for (const p of CHESTS)
        if (!this.s.chests.includes(p.id))
          a.push({ ...p, id: "chest:" + p.id, label: "Buka peti tersembunyi" });
    return a
      .map((p) => ({ ...p, dist: dist(p, this.position) }))
      .filter((p) => p.dist < 3.4)
      .sort((a, b) => a.dist - b.dist)[0];
  }
  interactRealm() {
    const n = this.nearest(),
      g = this.g;
    if (!n) return;
    if (n.id === "exit") {
      this.exit();
      return;
    }
    if (n.id === "guard") {
      if (this.mounted) {
        g.ui.toast(
          "Turun dari Sembrani dengan B untuk menghormati juru keraton.",
        );
        return;
      }
      this.s.welcomed = true;
      g.state.save();
      g.ui.dialogue({
        name: "Juru Keraton",
        role: "Tamu dari Alam Manusia",
        line: "Ratu mengizinkanmu masuk. Ingatan kami dicuri Penjaga Palung. Pulihkan tiga pusaka: cawan di taman barat, cermin di pendopo timur, dan mutiara di pemandian barat. Gamelan akan menunjukkan jalan menuju balairung.",
      });
    } else if (n.id.startsWith("relic:")) {
      if (collectSpiritItem(this.s, "relics", n.id.slice(6))) {
        g.state.save();
        g.audio.play("collect");
        g.ui.toast(
          "Pusaka pulih " +
            this.s.relics.length +
            "/3. " +
            (this.s.relics.length === 3
              ? "Dengarkan petunjuk gamelan di timur."
              : ""),
          "success",
        );
      }
    } else if (n.id === "false-seal") {
      g.ui.toast(
        g.state.data.weapon === "keris-mpu-gandring"
          ? "Pamor Gandring menyala: segel ini palsu. Mutiara asli berada lebih ke barat."
          : "Segel ini kosong. Cari mutiara di sisi barat pemandian.",
      );
    } else if (n.id === "well") {
      if (this.bossPhase !== "idle" && !this.s.bossDefeated) {
        g.ui.toast("Jauhi arena sampai Penjaga Palung kembali berjaga dahulu.");
        return;
      }
      g.state.data.hp = g.state.maxHp;
      g.state.save();
      g.ui.toast("Air teratai memulihkan daya tahan.", "success");
    } else if (n.id === "gong") {
      if (this.s.relics.length < 3) {
        g.ui.toast("Tiga pusaka diperlukan agar gamelan kembali bersuara.");
        return;
      }
      if (this.s.melodySolved) {
        g.ui.toast(
          "Balairung terbuka. Hadapi Penjaga Palung di pelataran tengah.",
        );
        return;
      }
      this.gongPanel();
    } else if (n.id === "queen") {
      if (!this.s.bossDefeated) {
        g.ui.toast(
          "Pulihkan pusaka, mainkan gamelan, lalu bebaskan Penjaga Palung dari kutukan.",
        );
        return;
      }
      if (this.mounted) {
        g.ui.toast("Turun dengan B sebelum menghadap Ratu Selatan.");
        return;
      }
      if (claimSpiritBlessing(g.state.data)) {
        g.state.addXp(180);
        g.state.save();
        this.horse.removeFromParent();
        this.horse = makeMount(
          MOUNTS.find((m) => m.id === "sembrani"),
          { spiritAwakened: true, spiritBlessed: true },
        );
        this.horse.userData.spiritBlessed = true;
        this.scene.add(this.horse);
      }
      g.ui.dialogue({
        name: "Ratu Selatan",
        role: "Restu Samudra Sunyi",
        line: "Ingatan keraton kembali. Terimalah pelana pusaka, 350 koin, dan 8 sari gaib. Sembrani kini memiliki Tapak Samudra (V, enam detik) dan Mata Sukma (R, sepuluh detik). Gunakan keduanya saat ditunggangi untuk menjelajahi perairan dan menemukan peti tersembunyi.",
      });
    } else if (n.id.startsWith("chest:")) {
      const id = n.id.slice(6);
      if (!this.s.chests.includes(id)) {
        this.s.chests.push(id);
        g.state.data.coins += 80;
        g.state.data.essence += 2;
        g.state.save();
        g.ui.toast("Peti sukma: +80 koin, +2 sari gaib.", "success");
      }
    }
    this.updateHUD();
  }
  gongPanel() {
    frontierPanel(
      this.g,
      "Gamelan Tanpa Penabuh",
      `<p>Ukiran berbunyi: <b>Ombak → Bulan → Angin → Bintang</b>.</p><p>Nada benar ${this.melody}/4. Nada salah mengulang urutan.</p><div class="spirit-notes">${NOTES.map((n, i) => btn("spirit-note", n, `data-note="${i}"`)).join("")}</div>`,
    );
  }
  action(action, args = {}) {
    const g = this.g;
    if (action === "spirit-waypoint") {
      if (!this.active) {
        g.waypoint = { ...SPIRIT_GATE };
        g.ui.close();
        g.ui.toast(
          "Pantai Sukma ditandai: selatan Space Z, koordinat 108, 262.",
        );
      }
      return true;
    }
    if (!this.active) return false;
    if (action === "spirit-exit" || action === "spirit-home") {
      this.exit(false, action === "spirit-home");
      return true;
    }
    if (action === "spirit-note") {
      if (
        !g.ui.panel ||
        dist(this.position, GONG) > 3.4 ||
        this.s.relics.length < 3 ||
        this.s.melodySolved
      )
        return true;
      this.melody = playSpiritNote(this.melody, Number(args.note));
      if (
        Number.isInteger(Number(args.note)) &&
        Number(args.note) >= 0 &&
        Number(args.note) < 4
      )
        g.audio.tone(
          [196, 220, 247, 294][Number(args.note)],
          1.2,
          "sine",
          0.18,
        );
      if (this.melody === 4) {
        this.s.melodySolved = true;
        g.state.save();
        g.ui.close();
        this.resetBoss();
        g.ui.toast("Gamelan menyatu. Penjaga Palung terbangun!", "success");
      } else this.gongPanel();
      return true;
    }
    if (
      [
        "close",
        "settings",
        "help",
        "journal",
        "save",
        "quality",
        "sound",
        "reset-prompt",
      ].includes(action)
    )
      return false;
    if (action === "reset-confirm") {
      this.exit();
      return false;
    }
    if (action === "menu") {
      this.exit();
      return false;
    }
    if (g.ui.panel) return true;
    if (action === "interact" || action === "spirit-interact")
      this.interactRealm();
    else if (action === "mount") {
      if (!this.crossing && this.onLand(this.position)) {
        this.mounted = !this.mounted;
        g.ui.toast(
          this.mounted ? "Menunggang Sembrani." : "Turun dari Sembrani.",
        );
      }
    } else if (action === "attack" || action === "special")
      this.attack(action === "special");
    else if (
      action === "spirit-water" ||
      action === "ascend" ||
      action === "mecha-flight"
    ) {
      if (this.s.blessed && this.mounted && this.waterCooldown <= 0) {
        this.waterTimer = 6;
        this.waterCooldown = 16;
        g.ui.toast("Tapak Samudra aktif selama 6 detik.");
      } else
        g.ui.toast(
          "Tapak Samudra memerlukan restu, Sembrani, dan cooldown siap.",
        );
    } else if (action === "spirit-sight" || action === "capture") {
      if (this.s.blessed && this.mounted && this.sightCooldown <= 0) {
        this.sightTimer = 10;
        this.sightCooldown = 18;
        g.ui.toast("Mata Sukma menyingkap dua peti tersembunyi.");
      } else
        g.ui.toast("Mata Sukma memerlukan restu, Sembrani, dan cooldown siap.");
    }
    return true;
  }
  attack(special = false) {
    if (
      this.crossing ||
      !this.boss.visible ||
      this.bossHp <= 0 ||
      this.attackTimer > 0 ||
      (special && this.specialTimer > 0)
    )
      return;
    const range = special ? 10 : 6.5;
    if (dist(this.position, this.boss.position) > range) {
      this.g.ui.toast("Dekati Penjaga Palung untuk menyerang.");
      return;
    }
    this.attackTimer = this.g.state.weapon.attackCooldown ?? 0.55;
    if (special) this.specialTimer = 4;
    const damage =
      (this.g.state.weapon.damage + this.g.state.data.upgrades.strength * 6) *
      (special ? 1.65 : 1);
    this.bossHp = Math.max(0, this.bossHp - damage);
    this.swing = 0.35;
    this.g.audio.play("hit");
    if (this.bossHp === 0) {
      this.s.bossDefeated = true;
      this.boss.visible = false;
      this.telegraph.visible = false;
      this.bossPhase = "idle";
      this.g.state.save();
      this.g.ui.toast(
        "Kutukan Penjaga Palung sirna. Menghadaplah kepada Ratu Selatan.",
        "success",
      );
    }
    this.updateHUD();
  }
  onLand(p) {
    return (
      (Math.abs(p.x) < 31 && p.z > -43 && p.z < 35) ||
      (Math.abs(p.x) < 2.3 && p.z >= 35 && p.z <= 68)
    );
  }
  canMove(p) {
    if (Math.abs(p.x) > 38 || p.z < -46 || p.z > 68) return false;
    if (!this.onLand(p) && !(this.mounted && this.waterTimer > 0)) return false;
    if (this.crossing) return Math.abs(p.x) < 2.3 && p.z >= 30;
    if (!this.s.welcomed && p.z < 23) return false;
    if (!this.s.bossDefeated && p.z < -26) return false;
    // Portal pylons and full-size palace columns, keeping the central route open.
    if (Math.abs(Math.abs(p.x) - 4) < 1.8 && Math.abs(p.z - 31) < 1.5)
      return false;
    for (const x of [-9, -5, 5, 9])
      for (const z of [-45, -33])
        if (Math.abs(p.x - x) < 0.9 && Math.abs(p.z - z) < 0.9) return false;
    return true;
  }
  updateBoss(dt) {
    if (!this.boss.visible || this.s.bossDefeated) return;
    const p = this.position,
      b = this.boss.position,
      away = dist(p, { x: 0, z: -12 });
    if (away > 21) {
      if (this.bossPhase !== "idle") this.resetBoss();
      return;
    }
    if (this.bossPhase === "idle") {
      if (away < 17) {
        this.bossPhase = "chase";
        this.bossTime = 1;
      }
      return;
    }
    this.bossTime -= dt;
    if (this.bossPhase === "chase") {
      const delta = new THREE.Vector3(p.x - b.x, 0, p.z - b.z);
      if (delta.length() > 4) b.addScaledVector(delta.normalize(), dt * 2.1);
      this.boss.rotation.y = Math.atan2(p.x - b.x, p.z - b.z);
      if (this.bossTime <= 0) {
        this.bossPhase = "windup";
        this.bossTime = this.bossHp < this.bossMax * 0.5 ? 0.85 : 1.15;
        this.telegraph.position.set(p.x, 0.4, p.z);
        this.telegraph.visible = true;
      }
    } else if (this.bossPhase === "windup" && this.bossTime <= 0) {
      if (dist(p, this.telegraph.position) < 4.5) {
        this.g.state.data.hp = Math.max(0, this.g.state.data.hp - 22);
        this.g.ui.toast(
          "Gelombang palung! −22 HP. Keluar dari lingkaran merah sebelum hantaman.",
        );
        if (this.g.state.data.hp === 0) {
          this.exit(true);
          return;
        }
      }
      this.telegraph.visible = false;
      this.bossPhase = "recovery";
      this.bossTime = 1.5;
    } else if (this.bossPhase === "recovery" && this.bossTime <= 0) {
      this.bossPhase = "chase";
      this.bossTime = 1.2;
    }
  }
  updateHUD() {
    if (!this.active) return;
    const stage = spiritStage(this.s),
      [title, desc] = SPIRIT_STAGES[stage],
      n = this.nearest();
    const objective = this.crossing
      ? { x: 0, z: 31 }
      : stage === 3
        ? GUARD
        : stage === 4
          ? RELICS.find((p) => !this.s.relics.includes(p.id))
          : stage === 5
            ? GONG
            : stage === 6
              ? this.boss.position
              : stage === 7
                ? QUEEN
                : null;
    const direction = objective
      ? `${objective.x < this.position.x ? "←" : "→"} ${Math.round(Math.abs(objective.x - this.position.x))} m · ${objective.z < this.position.z ? "↑" : "↓"} ${Math.round(Math.abs(objective.z - this.position.z))} m`
      : "";
    const content = `<div class="spirit-status"><small>ALAM GAIB · KERATON SAMUDRA SUNYI</small><strong>${this.crossing ? "Melintasi laut berkabut" : title}</strong><span>${this.crossing ? "WASD / joystick: ikuti jalan cahaya menuju gerbang." : desc}</span><span>HP ${Math.ceil(this.g.state.data.hp)}/${this.g.state.maxHp} · ${this.mounted ? "Sembrani" : "Berjalan"} · ${direction}</span>${this.boss.visible ? `<label>Penjaga Palung · ${Math.ceil(this.bossHp)}/${this.bossMax}<progress max="${this.bossMax}" value="${this.bossHp}"></progress></label><small>${this.bossPhase === "windup" ? "HINDARI LINGKARAN MERAH" : this.bossPhase === "recovery" ? "CELAH TERBUKA — SERANG" : "Spasi serang · Q pusaka · WASD menghindar"}</small>` : ""}</div><nav>${n ? btn("spirit-interact", n.label + " · E") : ""}${!this.crossing ? btn("mount", this.mounted ? "Turun · B" : "Naik · B") : ""}${this.boss.visible ? btn("attack", "Serang · Spasi") + btn("special", "Pusaka · Q") : ""}${this.s.blessed ? btn("spirit-water", "Tapak · V " + Math.ceil(this.waterCooldown)) + btn("spirit-sight", "Mata · R " + Math.ceil(this.sightCooldown)) : ""}</nav>`;
    if (content !== this.lastHUDContent) {
      this.hudContent.innerHTML = content;
      this.lastHUDContent = content;
    }
  }
  updateVillage(dt, t) {
    this.portal.material.opacity =
      this.s.sparks.length === 3 ? 0.32 + Math.sin(t * 2) * 0.1 : 0.08;
    for (const { def, gem } of this.sparkModels) {
      gem.visible = this.s.started && !this.s.sparks.includes(def.id);
      gem.rotation.y = t;
      gem.position.y = 1.6 + Math.sin(t * 2) * 0.2;
    }
  }
  frame(dt, t) {
    const g = this.g,
      p = this.position;
    g.ui.toastTimer = Math.max(0, g.ui.toastTimer - dt);
    if (g.ui.toastTimer === 0)
      document.querySelector("#toast").classList.remove("show");
    let moving = false;
    if (!g.ui.panel) {
      const oldWater = this.waterTimer;
      for (const key of [
        "attackTimer",
        "specialTimer",
        "waterTimer",
        "waterCooldown",
        "sightTimer",
        "sightCooldown",
        "swing",
      ])
        this[key] = Math.max(0, (this[key] || 0) - dt);
      if (oldWater > 0 && this.waterTimer === 0 && !this.onLand(p)) {
        p.set(0, 0, 25);
        g.ui.toast(
          "Tapak Samudra berakhir. Sembrani membawamu ke tepi daratan.",
        );
      }
      const { x, z } = g.movementInput();
      const v = new THREE.Vector3(x, 0, z).clampLength(0, 1);
      moving = v.lengthSq() > 0;
      if (moving) {
        this.yaw = Math.atan2(x, z);
        const step = v.multiplyScalar(dt * (this.mounted ? 12 : 6));
        const next = p.clone();
        next.x += step.x;
        if (this.canMove(next)) p.x = next.x;
        next.copy(p);
        next.z += step.z;
        if (this.canMove(next)) p.z = next.z;
      }
      if (this.crossing && p.z <= 32) {
        this.crossing = false;
        this.s.crossed = true;
        g.state.save();
        g.ui.toast(
          "Selamat datang di Samudra Sunyi. Turun dengan B dan minta izin kepada juru keraton.",
        );
      }
      this.updateBoss(dt);
      if (!this.active) return;
    }
    this.horse.visible = this.mounted;
    this.horse.position.copy(p);
    this.horse.rotation.y = this.yaw;
    animateMount(this.horse, "sembrani", t, moving);
    const floor = Math.abs(p.x) < 11.3 && p.z < -30 ? 1.1 : 0.3;
    this.horse.position.y = floor;
    this.avatar.position.set(p.x, floor + (this.mounted ? 1.75 : 0), p.z);
    this.avatar.rotation.y = this.yaw;
    animateHuman(
      this.avatar,
      t,
      moving,
      this.mounted,
      this.swing ? 1 - this.swing / 0.35 : 0,
    );
    for (const { def, gem } of this.relicModels) {
      gem.visible = !this.s.relics.includes(def.id);
      gem.rotation.y = t * 0.6;
    }
    for (const { def, model } of this.chests)
      model.visible = this.sightTimer > 0 && !this.s.chests.includes(def.id);
    this.falseSeal.scale.setScalar(
      g.state.data.weapon === "keris-mpu-gandring" &&
        dist(p, { x: -18, z: -19 }) < 9
        ? 1.3 + Math.sin(t * 5) * 0.15
        : 1,
    );
    const sense =
      g.state.data.weapon === "keris-mpu-gandring" &&
      dist(p, { x: -18, z: -19 }) < 9;
    this.avatar.userData.holder.traverse((m) => {
      if (m.isMesh && m.userData.baseEmissive) {
        m.material.emissive.copy(
          sense ? new THREE.Color("#61f5ce") : m.userData.baseEmissive,
        );
        m.material.emissiveIntensity = sense
          ? 0.8 + Math.sin(t * 4) * 0.2
          : m.userData.baseIntensity;
      }
    });
    this.palace.traverse((m) => {
      if (m.isMesh && m.material.name.includes("roof")) {
        const inside = p.z < -28 && Math.abs(p.x) < 14;
        m.material.transparent = inside;
        m.material.opacity = inside ? 0.16 : 1;
        m.material.depthWrite = !inside;
      }
    });
    this.fish.forEach((f, i) =>
      f.position.set(
        Math.sin(t * 0.15 + i) * 40,
        5 + Math.sin(t + i) * 1.2,
        -10 + Math.cos(t * 0.1 + i) * 42,
      ),
    );
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(p.x + 9, 18, p.z + 22);
    this.camera.lookAt(p.x, 2, p.z - 4);
    g.renderer.render(this.scene, this.camera);
    this.hudTime += dt;
    if (this.hudTime > 0.15) {
      this.hudTime = 0;
      this.updateHUD();
    }
  }
}
function coneLantern(s, x, y, z) {
  cylinder(s, 0.45, 0.65, 0.8, "#c6a570", x, y, z, 6);
  orb(s, 0.28, "#8bead3", x, y + 0.4, z, 0, {
    emissive: "#8bead3",
    emissiveIntensity: 1.5,
  });
}
