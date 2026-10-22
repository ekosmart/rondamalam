import { SchoolInterior } from "./school-interior.js";
import { nightMinutes } from "../incident-rules.js";
import * as THREE from "three";
import { asset, loadMagicAssets } from "./assets.js";
import { createWitchRig } from "./rider-model.js";
import { createStatue } from "./statue-model.js";
import { buildMagicVillage, buildAcademy, place } from "./world.js";
import { magicSound } from "./audio.js";
import {
  STATION,
  LARAS,
  BOOTH,
  BOOK,
  TROLLEY,
  PORTAL,
  NOTES,
  portalReason,
  nightTime,
  claimTicket,
  claimMagicRewards,
  solveNote,
} from "./rules.js";
import { frontierPanel, frontierButton as btn } from "../frontier.js";
import { makeHuman, animateHuman, makeWeapon } from "../models.js";
import "./magic.css";
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export class MagicEvent {
  constructor(g) {
    this.g = g;
    this.ready = false;
    this.active = false;
    this.pushing = false;
    this.progress = 0;
    this.trainTime = 0;
    this.transit = 0;
    this.protection = 0;
    this.curses = new Map();
    this.bolts = [];
    this.clock = 0;
    this.attackCooldown = 0;
    this.hud = document.createElement("section");
    this.hud.id = "magic-controls";
    this.hud.className = "hidden";
    document.querySelector("#hud").append(this.hud);
    this.fade = document.createElement("div");
    this.fade.id = "magic-transition";
    document.body.append(this.fade);
    this.readyPromise = loadMagicAssets()
      .then(() => {
        this.world = buildMagicVillage(g);
        if (
          distance(g.state.data, STATION) < 50 &&
          !g.world.canMove(g.state.data.x, g.state.data.z)
        ) {
          Object.assign(
            g.state.data,
            g.world.nearestLanding(g.state.data.x, g.state.data.z),
          );
          g.updatePlayer(0);
        }
        this.potions = [
          [-10, 28],
          [22, 38],
          [-26, -10],
          [15, -32],
        ].map(([x, z], i) => ({
          id: "p" + i,
          model: place(g.scene, "potion", 0.8, x, z, 0.4),
        }));
        this.ready = true;
        this.syncCurses();
        if (this.s.raid && nightTime(g.state.data))
          this.startRaid(this.s.raid.type, true);
        else this.s.raid = null;
      })
      .catch((e) => {
        this.error = e;
        console.error("Magic assets:", e);
        g.ui.toast(
          "Aset dunia sihir gagal dimuat. Muat ulang untuk mencoba lagi.",
        );
      });
  }
  get s() {
    return this.g.state.data.magic;
  }
  sound(kind) {
    magicSound(this.g.audio, kind);
  }
  journal() {
    const s = this.s;
    return `<h3 class="section-label">MALAM KUTUKAN SAPU HITAM</h3><p>Rotasi 5 malam: tenang → zombie/titan → alien → dinosaurus → penyihir. Invasi mulai pukul 20.00. Kedua penyihir bergantian.</p><div class="quest-list">${[
      [
        "Kutukan di Bawah Sapu",
        s.accepted,
        s.ticket,
        "Bu Laras di selatan pos (12, 28). Usir satu penyerang; ramuan melindungi dari kutukan dan memulihkan warga. Laporkan untuk memperoleh Tiket Peron 13.",
        `Penyihir terusir: ${s.defeated.length} jenis · Warga dipulihkan: ${s.rescued}`,
      ],
      [
        "Penumpang Tanpa Bayangan",
        s.stationAccepted,
        s.academyVisited,
        "Temui Pak Jatmiko di loket stasiun. Baca buku: Lentera → Bulan → Ombak. Malam hari, tunggu kereta lalu dorong troli ke tembok bata di gerbang.",
        `Tiket ${s.ticket ? "dimiliki" : "belum dimiliki"} · Buku ${s.bookSolved ? "terpecahkan" : "belum terpecahkan"}`,
      ],
      [
        "Pelajaran Pemutus Kutukan",
        s.trialAccepted,
        s.completed,
        "Minta tugas kepada Prof. Arun di halaman akademi. Dengan tongkat pinjaman, dekati tiga orang-orangan terkutuk berurutan Lentera → Bulan → Ombak dan tekan Spasi. Laporkan untuk memperoleh Tongkat Sihir dan Sapu Terbang.",
        `Segel padam ${s.seals.length}/3`,
      ],
    ]
      .map(
        ([title, accepted, done, desc, progress]) =>
          `<div class="journal-quest ${done ? "complete" : ""}"><div><span class="eyebrow">${done ? "SELESAI" : accepted ? "SEDANG BERJALAN" : "TEMUI NPC UNTUK MEMULAI"}</span><h3>${title}</h3><p>${desc}</p><small>${progress}</small></div></div>`,
      )
      .join(
        "",
      )}</div><p>Ramuan penawar: ${s.potions} ${btn("magic-potion", "Minum ramuan")} ${!this.active ? btn("magic-waypoint", "Tandai stasiun") : ""}</p>`;
  }
  guide() {
    const s = this.s;
    frontierPanel(
      this.g,
      "Bu Laras · Penjaga Mantra",
      `<p class="dialogue-line">“Dua penyihir mencuri nama warga. Yang hijau mengubah tubuh menjadi kodok; Hollow Rider mengunci jiwa di batu. Usir salah satunya dan bawa kabarnya kepadaku. Ramuan menjaga tubuhmu dan bisa dipakai untuk menolong korban.”</p>${!s.accepted ? btn("magic-accept", "Saya akan membantu") : !s.ticket ? `${s.defeated.length ? btn("magic-ticket", "Laporkan serangan · Terima tiket & 100 koin") : "<p>Penyihir mendapat giliran malam 5, 10, 15, dan seterusnya pukul 20.00. Beradalah di sekitar desa saat gilirannya.</p>"}` : "<p>Tiketmu berlaku seterusnya. Pak Jatmiko menjaga loket Stasiun Tengah Malam di barat daya. Portal bata hanya terbuka malam hari ketika kereta tiba dan troli didorong mendekatinya.</p>"}${s.accepted && s.potions === 0 ? btn("magic-supply", "Minta ramuan cadangan") : ""}${btn("close", "Sampai jumpa")}`,
    );
  }
  stationDialogue() {
    this.sound("owl");
    frontierPanel(
      this.g,
      "Pak Jatmiko · Loket Peron 13",
      `<p>“Crimson Express mengikuti tiga cahaya: Lentera dinyalakan, Bulan terbit, lalu Ombak menjawab. Baca buku mantra di peron. Setelah kereta berhenti, pegang troli dan dorong ke gerbang bata. Tiket harus dibawa; lintasan hanya hidup pada malam hari.”</p><p>${this.s.ticket ? "Tiket Peron 13 terverifikasi." : "Bu Laras akan memberimu tiket setelah kau membantu desa."}</p>${this.s.ticket && !this.s.stationAccepted ? btn("magic-station", "Saya akan menyelidiki peron") : ""}${btn("close", "Mengerti")}`,
    );
  }
  bookPanel() {
    frontierPanel(
      this.g,
      "Buku Mantra Peron 13",
      `<p>“Lentera menyala. Bulan terbit. Ombak menjawab.”</p><p>Urutan benar ${this.progress}/3</p>${NOTES.map((n, i) => btn("magic-note", n, `data-note="${i}"`)).join("")}${btn("close", "Tutup buku")}`,
    );
  }
  professor() {
    frontierPanel(
      this.g,
      "Prof. Arun · Penjaga Halaman Akademi",
      `<p>“Serangan itu bersumber dari tiga segel di halaman kami. Kau boleh meminjam tongkat untuk memutusnya. Dekati tiap orang-orangan hingga 12 meter, urut Lentera → Bulan → Ombak, lalu Spasi atau tombol mantra. Setelah tiga segel padam, tongkat dan sapu ini menjadi milikmu.”</p><p>Segel padam ${this.s.seals.length}/3. Pintu Sekolah Kala Wengi di ujung jalan halaman kini terbuka. Dekati pintu lalu tekan E untuk menjelajah.</p>${!this.s.trialAccepted ? btn("magic-trial", "Saya akan membantu · Pinjam tongkat") : !this.s.completed && this.s.seals.length === 3 ? btn("magic-reward", "Laporkan · Terima Tongkat Sihir & Sapu Terbang") : this.s.completed ? "<p>Terima kasih. Kutukan warga telah dipatahkan. Peron tetap dapat kau kunjungi.</p>" : "<p>Lanjutkan latihan di halaman.</p>"}${btn("close", "Sampai jumpa")}`,
    );
  }
  interactions() {
    if (
      !this.ready ||
      this.active ||
      this.g.spirit.active ||
      this.g.expeditions.active ||
      this.g.altitude > 5
    )
      return [];
    const a = [
      { id: "guide", ...LARAS, label: "Bu Laras · Kutukan Sapu Hitam" },
      { id: "booth", ...BOOTH, label: "Pak Jatmiko · Periksa tiket" },
      { id: "book", ...BOOK, label: "Baca buku mantra" },
      {
        id: "trolley",
        ...(this.pushing ? this.g.state.data : this.world.trolley.position),
        label: this.pushing ? "Lepaskan troli" : "Dorong troli · Peron 13",
      },
      { id: "portal", ...PORTAL, label: "Periksa gerbang bata" },
    ];
    for (const p of this.potions)
      if (!this.s.loot.includes(p.id))
        a.push({
          id: p.id,
          ...p.model.position,
          label: "Ambil ramuan penawar",
        });
    for (const c of this.s.cursed)
      a.push({
        id: "rescue:" + c.id,
        x: c.x,
        z: c.z,
        label: `Pulihkan warga ${c.type === "frog" ? "menjadi kodok" : "membatu"} · 1 ramuan`,
      });
    return a
      .map((p) => ({
        ...p,
        type: "magic",
        dist: distance(p, this.g.state.data),
      }))
      .filter((p) => p.dist < (p.id === "trolley" ? 2.2 : 4));
  }
  interact(it) {
    if (it.type !== "magic") return false;
    const g = this.g,
      s = this.s;
    if (it.id === "guide") this.guide();
    else if (it.id === "booth") this.stationDialogue();
    else if (it.id === "book") {
      if (!s.ticket) g.ui.toast("Mintalah tiket kepada Bu Laras dahulu.");
      else if (!s.stationAccepted)
        g.ui.toast("Bicaralah dengan Pak Jatmiko untuk menyelidiki peron.");
      else this.bookPanel();
    } else if (it.id === "portal")
      g.ui.toast(
        portalReason(g.state.data, this.trainTime >= 4, this.pushing) ||
          "Dorong troli lebih dekat ke permukaan bata.",
      );
    else if (it.id === "trolley") {
      if (!s.ticket) {
        g.ui.toast("Troli peron hanya boleh dipakai pemegang tiket.");
        return true;
      }
      this.pushing = !this.pushing;
      g.state.data.riding = false;
      g.land();
      g.ui.toast(
        this.pushing
          ? "Dorong dengan WASD / joystick menuju gerbang bata. E untuk melepas."
          : "Troli dilepaskan.",
      );
    } else if (it.id.startsWith("rescue:")) {
      if (s.potions < 1)
        g.ui.toast(
          "Ambil ramuan di sekitar pos atau minta persediaan kepada Bu Laras.",
        );
      else {
        s.potions--;
        this.free(it.id.slice(7));
        this.sound("rescue");
      }
    } else if (it.id.startsWith("p") && !s.loot.includes(it.id)) {
      s.loot.push(it.id);
      s.potions++;
      this.sound("rescue");
      g.ui.toast(
        "Ramuan diperoleh. Gunakan di Jurnal atau dekat warga terkutuk.",
      );
    }
    g.state.save();
    return true;
  }
  action(action, args = {}) {
    const g = this.g,
      d = g.state.data,
      s = this.s;
    if (action.startsWith("magic-") && !this.ready) {
      g.ui.toast("Aset sihir masih dimuat.");
      return true;
    }
    if (action === "magic-waypoint") {
      if (!this.active) {
        g.waypoint = { ...STATION };
        g.ui.close();
      }
      return true;
    }
    if (action === "magic-potion") {
      if (s.potions > 0) {
        s.potions--;
        this.protection = 25;
        g.effects.ring(d.x, d.z, "#a9d6d1", 10);
        d.hp = Math.min(g.state.maxHp, d.hp + 25);
        this.sound("rescue");
        g.state.save();
        g.ui.toast("Perlindungan kutukan aktif 25 detik.");
      } else g.ui.toast("Belum ada ramuan penawar.");
      return true;
    }
    if (["magic-accept", "magic-ticket", "magic-supply"].includes(action)) {
      if (this.active || g.ui.panel !== "dialogue" || distance(d, LARAS) > 5)
        return true;
      if (action === "magic-accept" && !s.accepted) {
        s.accepted = true;
        s.potions += 2;
        g.ui.toast("Quest diterima · 2 ramuan penawar. Catatan ada di Jurnal.");
      }
      if (action === "magic-supply" && s.accepted && s.potions === 0) {
        s.potions = 2;
        g.ui.toast("Bu Laras memberi 2 ramuan cadangan untuk menolong warga.");
      }
      if (action === "magic-ticket" && claimTicket(d))
        g.ui.toast(
          "Tiket Peron 13 & 100 koin diperoleh. Selidiki stasiun.",
          "success",
        );
      g.state.save();
      this.guide();
      return true;
    }
    if (action === "magic-station") {
      if (
        !this.active &&
        g.ui.panel === "dialogue" &&
        distance(d, BOOTH) < 5 &&
        s.ticket
      ) {
        s.stationAccepted = true;
        g.state.save();
        g.ui.close();
        g.ui.toast(
          "Quest diterima · Penumpang Tanpa Bayangan. Periksa buku mantra di peron.",
        );
      }
      return true;
    }
    if (action === "magic-note") {
      if (
        this.active ||
        g.ui.panel !== "dialogue" ||
        distance(d, BOOK) > 4 ||
        !s.stationAccepted
      )
        return true;
      this.progress = solveNote(this.progress, Number(args.note));
      this.sound("spell");
      if (this.progress === 3) {
        s.bookSolved = true;
        this.progress = 0;
        g.state.save();
        g.ui.close();
        g.ui.toast("Mantra terpecahkan. Crimson Express datang saat malam.");
      } else this.bookPanel();
      return true;
    }
    if (!this.active) {
      if (this.pushing && action === "mount") {
        g.ui.toast("Lepaskan troli dengan E sebelum menaiki tunggangan.");
        return true;
      }
      return false;
    }
    if (action === "magic-exit" || action === "menu") {
      this.exit();
      return action !== "menu";
    }
    if (this.insideSchool && this.school.action(action)) return true;
    if (action === "magic-trial" || action === "magic-reward") {
      if (
        g.ui.panel !== "dialogue" ||
        distance(this.position, { x: 4, z: 22 }) > 4
      )
        return true;
      if (action === "magic-trial" && !s.trialAccepted) {
        s.trialAccepted = true;
        this.avatar.userData.holder.clear();
        this.avatar.userData.holder.add(makeWeapon("tongkat-sihir"));
      }
      if (action === "magic-reward" && claimMagicRewards(d)) {
        this.syncCurses();
        this.sound("rescue");
        g.ui.toast(
          "Sapu Terbang & Tongkat Sihir menjadi milikmu dan sudah dipilih. Tekan B setelah pulang untuk terbang.",
          "success",
        );
      }
      g.state.save();
      this.professor();
      return true;
    }
    if (
      [
        "close",
        "journal",
        "settings",
        "help",
        "sound",
        "quality",
        "save",
        "reset-prompt",
        "reset-confirm",
      ].includes(action)
    )
      return false;
    if (g.ui.panel) return true;
    if (action === "interact" || action === "magic-interact") {
      if (distance(this.position, { x: 0, z: -16 }) < 4) this.enterSchool();
      else if (distance(this.position, { x: 4, z: 22 }) < 4) this.professor();
      else if (distance(this.position, { x: -23, z: 23 }) < 4) this.exit();
      else
        g.ui.toast(
          "Dekati Prof. Arun, pintu sekolah di ujung jalan, atau gerbang untuk berinteraksi.",
        );
    }
    if (action === "attack" || action === "special" || action === "magic-cast")
      this.cast();
    return true;
  }
  startRaid(type, restore = false) {
    if (
      !this.ready ||
      this.active ||
      !nightTime(this.g.state.data) ||
      this.enemy
    )
      return false;
    const g = this.g;
    this.sound("curse");
    this.s.raid = { type, night: g.state.data.night };
    this.s.checkedNight = g.state.data.night;
    const rig = type === "stone" ? createWitchRig() : null,
      model = new THREE.Group();
    model.add(rig ? rig.group : asset("Penyihir", 3.5));
    model.position.set(16, 4, 40);
    g.scene.add(model);
    this.enemy = {
      witch: true,
      type,
      rig,
      model,
      pos: model.position,
      home: model.position.clone(),
      name:
        type === "stone"
          ? "Hollow Rider · Arca Kutukan"
          : "Penyihir Rawa · Kutukan Kodok",
      def: {
        id: "witch-" + type,
        hp: 180,
        power: 12,
        element: "Gaib",
        kind: "witch",
        air: true,
      },
      hp: 180,
      maxHp: 180,
      active: true,
      human: true,
      attackTimer: 3,
      aimHeight: 1.5,
      respawn: 0,
      hit: 0,
    };
    g.enemies.push(this.enemy);
    this.raidTime = 0;
    this.shotTime = 3;
    if (!restore) {
      g.ui.toast(
        this.enemy.name + " menyerang desa! Saat ia turun, dekati dan serang.",
        "error",
      );
      this.s.loot = [];
      g.state.save();
    }
    return true;
  }
  damage(e, amount) {
    if (!e.active) return;
    e.hp = Math.max(0, e.hp - Math.max(0, amount));
    e.hit = 0.2;
    this.sound("spell");
    if (e.hp <= 0) {
      if (!this.s.defeated.includes(e.type)) this.s.defeated.push(e.type);
      this.stopRaid();
      this.g.state.data.coins += 60;
      this.g.state.save();
      this.g.ui.toast(
        "Penyihir terusir · +60 koin. Laporkan kepada Bu Laras.",
        "success",
      );
    }
  }
  stopRaid() {
    if (this.enemy) {
      this.enemy.active = false;
      this.enemy.model.removeFromParent();
      if (this.enemy.rig)
        this.enemy.model.traverse((m) => m.geometry?.dispose());
      this.g.enemies = this.g.enemies.filter((e) => e !== this.enemy);
      if (this.g.lockedTarget === this.enemy) this.g.lockedTarget = null;
      this.enemy = null;
    }
    this.bolts.forEach((b) => b.model.removeFromParent());
    this.bolts = [];
    this.s.raid = null;
  }
  curse(n, type) {
    if (this.s.cursed.length >= 6 || n.witchCursed || n.incidentUnavailable)
      return;
    if (
      this.protection > 0 &&
      distance(n.model.position, this.g.state.data) < 10
    ) {
      this.sound("rescue");
      this.g.ui.toast("Aura ramuan menahan kutukan pada warga di dekatmu.");
      return;
    }
    this.s.cursed.push({
      id: n.def.id,
      type,
      x: n.model.position.x,
      z: n.model.position.z,
    });
    this.syncCurses();
    this.g.state.save();
  }
  free(id) {
    if (!this.s.cursed.some((c) => c.id === id)) return;
    this.s.cursed = this.s.cursed.filter((c) => c.id !== id);
    this.s.rescued++;
    this.syncCurses();
    this.g.state.save();
  }
  syncCurses() {
    for (const [id, item] of this.curses)
      if (!this.s.cursed.some((c) => c.id === id)) {
        item.model.removeFromParent();
        if (item.rig) {
          const materials = new Set(),
            textures = new Set();
          item.model.traverse((m) => {
            if (m.isMesh) {
              m.geometry.dispose();
              materials.add(m.material);
            }
          });
          materials.forEach((m) => {
            Object.values(m).forEach((v) => {
              if (v?.isTexture) textures.add(v);
            });
            m.dispose();
          });
          textures.forEach((t) => t.dispose());
        }
        item.n.witchCursed = false;
        item.n.model.visible = true;
        this.curses.delete(id);
      }
    this.s.cursed = this.s.cursed.filter((c) =>
      this.g.life.actors.some((n) => n.def.id === c.id),
    );
    for (const c of this.s.cursed) {
      if (this.curses.has(c.id)) continue;
      const n = this.g.life.actors.find((n) => n.def.id === c.id);
      if (!n) continue;
      const rig = c.type === "stone" ? createStatue() : null,
        model = rig ? rig.group : asset("frog", 0.9);
      model.position.set(c.x, 0, c.z);
      this.g.scene.add(model);
      n.witchCursed = true;
      n.model.visible = false;
      this.curses.set(c.id, { n, model, rig });
    }
  }
  update(dt, t) {
    if (!this.ready || this.active) return;
    const g = this.g,
      d = g.state.data,
      s = this.s;
    this.clock += dt;
    this.protection = Math.max(0, this.protection - dt);
    this.world.station.update(t);
    if (!this.enemy && s.raid && nightTime(d))
      this.startRaid(s.raid.type, true);
    if (
      !this.enemy &&
      nightTime(d) &&
      g.incidents.data.plan?.kind === "witch" &&
      nightMinutes(d.time) >= g.incidents.data.plan.start - 1080 &&
      s.checkedNight !== d.night &&
      Math.hypot(d.x, d.z) < 140 &&
      !g.sports.active &&
      !["warning", "active"].includes(g.incidents.event?.phase)
    ) {
      s.checkedNight = d.night;
      this.startRaid(g.incidents.data.plan.witchType);
      g.state.save();
    }
    if (this.enemy) {
      if (!nightTime(d)) {
        this.stopRaid();
        g.state.save();
        g.ui.toast("Fajar mengusir penyihir. Korban masih membutuhkan ramuan.");
      } else {
        this.raidTime += dt;
        this.shotTime -= dt;
        const e = this.enemy;
        const target = g.life.actors
          .filter(
            (n) => n.def.night && !n.witchCursed && !n.incidentUnavailable,
          )
          .sort(
            (a, b) =>
              distance(a.model.position, d) - distance(b.model.position, d),
          )[0];
        const center = target?.model.position || { x: 15, z: 30 };
        const old = e.pos.clone();
        e.pos.set(
          center.x + Math.sin(this.raidTime * 0.3) * 9,
          (this.raidTime % 16 < 9 ? 1.2 : 7) + Math.sin(t) * 0.3,
          center.z + Math.cos(this.raidTime * 0.3) * 9,
        );
        e.model.rotation.y = Math.atan2(e.pos.x - old.x, e.pos.z - old.z);
        e.rig?.update(t);
        if (this.shotTime <= 0) {
          this.shotTime = 5;
          const victim = target && this.s.cursed.length < 6 ? target : null;
          const end = victim
            ? victim.model.position.clone().add(new THREE.Vector3(0, 1, 0))
            : new THREE.Vector3(d.x, g.altitude + 1, d.z);
          const model = asset("curse_bolt", 0.6);
          model.position.copy(e.pos);
          g.scene.add(model);
          this.bolts.push({ model, end, victim, type: e.type, age: 0 });
          if (distance(e.pos, d) < 60) this.sound("curse");
        }
      }
    }
    for (const b of [...this.bolts]) {
      b.age += dt;
      const v = b.end.clone().sub(b.model.position);
      if (v.length() < dt * 18 || b.age > 6) {
        if (v.length() < dt * 18) {
          if (b.victim) this.curse(b.victim, b.type);
          else if (
            this.protection <= 0 &&
            distance(d, b.end) < 3 &&
            Math.abs(g.altitude + 1 - b.end.y) < 3
          )
            g.hurt(12, "magic");
        }
        b.model.removeFromParent();
        this.bolts.splice(this.bolts.indexOf(b), 1);
      } else b.model.position.addScaledVector(v.normalize(), dt * 18);
    }
    for (const { n, model, rig } of this.curses.values()) {
      n.model.visible = false;
      rig?.update(t);
      if (!rig) model.position.y = Math.abs(Math.sin(t * 2)) * 0.15;
    }
    for (const p of this.potions) {
      p.model.visible = !s.loot.includes(p.id);
      p.model.rotation.y = t;
    }
    this.world.owl.rotation.y = Math.sin(t * 0.6) * 0.25;
    const atStation = distance(d, STATION) < 48;
    if (s.bookSolved && nightTime(d) && atStation) {
      const before = this.trainTime;
      this.trainTime = Math.min(4, this.trainTime + dt);
      if (before === 0) this.sound("train");
    } else this.trainTime = 0;
    this.world.train.g.visible = this.world.carriage.visible =
      this.trainTime > 0;
    const trainX = STATION.x - 44 + Math.min(1, this.trainTime / 4) * 49;
    this.world.train.g.position.set(trainX, 0.1, STATION.z + 14);
    this.world.carriage.position.x = trainX - 14;
    this.world.train.wheels.forEach((w) => (w.rotation.x = t * 4));
    this.world.train.puffs.forEach((p, i) => {
      p.position.y = 3.4 + ((t + i * 0.3) % 2) * 1.2;
      p.scale.setScalar(1 + ((t + i * 0.3) % 2));
    });
    if (this.pushing) {
      if (distance(d, STATION) > 48 || d.riding || g.altitude > 5) {
        this.pushing = false;
        this.world.trolley.position.set(TROLLEY.x, 0, TROLLEY.z);
      } else {
        this.world.trolley.position.set(
          d.x + Math.sin(g.facing) * 1.2,
          0,
          d.z + Math.cos(g.facing) * 1.2,
        );
        this.world.trolley.rotation.y = g.facing;
      }
    }
    const near =
      distance(this.world.trolley.position, PORTAL) < 3.5 &&
      distance(d, PORTAL) < 5;
    const permitted = !portalReason(d, this.trainTime >= 4, this.pushing);
    this.world.portal.mat.uniforms.uTime.value = t;
    const u = this.world.portal.mat.uniforms.uProx;
    u.value = THREE.MathUtils.damp(u.value, permitted && near ? 1 : 0, 3, dt);
    if (permitted && near) {
      if (this.transit === 0) this.sound("portal");
      this.transit += dt;
      this.fade.style.opacity = String(Math.max(0, this.transit - 1));
      if (this.transit > 2 && this.enter()) return;
    } else {
      this.transit = 0;
      this.fade.style.opacity = "0";
    }
    this.hud.classList.toggle(
      "hidden",
      !this.pushing && !(this.enemy && distance(this.enemy.pos, d) < 75),
    );
    const html = `${this.pushing ? btn("interact", "Lepaskan troli · E") : btn("magic-potion", `Ramuan · ${s.potions}`)}`;
    if (this.hud.innerHTML !== html) this.hud.innerHTML = html;
  }
  enter() {
    const g = this.g;
    if (
      !this.ready ||
      this.active ||
      portalReason(g.state.data, this.trainTime >= 4, this.pushing) ||
      distance(g.state.data, PORTAL) >= 5 ||
      distance(this.world.trolley.position, PORTAL) >= 3.5
    )
      return false;
    this.academy ??= buildAcademy();
    this.position = new THREE.Vector3(0, 0, 26);
    this.villageCamera = {
      yaw: g.cameraYaw,
      pitch: g.cameraPitch,
      distance: g.cameraDistance,
    };
    g.cameraYaw = 0;
    g.cameraPitch = 0.25;
    g.cameraDistance = 40;
    this.active = true;
    this.pushing = false;
    this.transit = 0;
    this.fade.style.opacity = "0";
    this.s.academyVisited = true;
    g.frontier.cancelFishing();
    g.tractor.reset();
    g.land();
    g.state.data.riding = false;
    g.state.data.x = STATION.x;
    g.state.data.z = STATION.z + 8;
    g.state.save();
    g.ui.close();
    g.keys.clear();
    g.ui.joystick?.reset();
    g.flightInput = 0;
    g.lockedTarget = null;
    this.avatar ??= makeHuman("#6c805b");
    this.academy.scene.add(this.avatar);
    this.avatar.userData.holder.clear();
    this.avatar.userData.holder.add(
      makeWeapon(this.s.trialAccepted ? "tongkat-sihir" : g.state.data.weapon),
    );
    document.body.classList.add("inside-academy");
    this.hud.classList.remove("hidden");
    this.hud.innerHTML = `${btn("magic-interact", "Bicara / Keluar · E")}${btn("magic-cast", "Mantra · Spasi")}${btn("journal", "Jurnal")}${btn("magic-exit", "Pulang ke stasiun")}`;
    g.ui.toast("Akademi Sihir · Temui Prof. Arun di halaman.");
    return true;
  }
  exit() {
    if (!this.active) return;
    const g = this.g;
    if (this.insideSchool) this.school.leave();
    this.active = false;
    g.cameraYaw = this.villageCamera.yaw;
    g.cameraPitch = this.villageCamera.pitch;
    g.cameraDistance = this.villageCamera.distance;
    document.body.classList.remove("inside-academy");
    this.hud.classList.add("hidden");
    g.ui.close();
    g.keys.clear();
    g.flightInput = 0;
    g.ui.joystick?.reset();
    Object.assign(g.state.data, {
      x: STATION.x,
      z: STATION.z + 8,
      riding: false,
    });
    g.altitude = 0;
    g.equipMount();
    g.equipWeapon();
    g.updatePlayer(0);
    g.state.save();
    this.world.trolley.position.set(TROLLEY.x, 0, TROLLEY.z);
  }
  enterSchool() {
    if (
      !this.active ||
      this.insideSchool ||
      distance(this.position, { x: 0, z: -16 }) >= 4
    )
      return;
    try {
      this.school ??= new SchoolInterior(this);
      this.school.enter();
    } catch (e) {
      console.error("School interior:", e);
      this.g.ui.toast("Interior gagal dimuat. Silakan coba kembali.");
    }
  }
  cast() {
    if (this.insideSchool) return;
    if (!this.s.trialAccepted) {
      this.g.ui.toast("Mintalah tugas dan tongkat pinjaman kepada Prof. Arun.");
      return;
    }
    if (this.attackCooldown > 0) return;
    this.attackCooldown = 0.5;
    const index = this.academy.targets.findIndex(
      (m, i) =>
        !this.s.seals.includes(i) && distance(m.position, this.position) < 12,
    );
    if (index < 0) {
      this.g.ui.toast(
        "Dekati orang-orangan yang segelnya masih menyala (12 m).",
      );
      return;
    }
    if (index !== this.s.seals.length) {
      this.g.ui.toast(
        "Segel menolak. Putuskan sesuai mantra: Lentera, Bulan, lalu Ombak.",
      );
      this.sound("curse");
      return;
    }
    const trail = asset("curse_bolt", 0.65);
    trail.position.copy(this.position).add(new THREE.Vector3(0, 1.8, 0));
    this.academy.scene.add(trail);
    this.academy.spell = {
      model: trail,
      target: this.academy.targets[index].position
        .clone()
        .add(new THREE.Vector3(0, 1.8, 0)),
      age: 0,
    };
    this.s.seals.push(index);
    this.academy.targets[index].visible = false;
    this.sound("spell");
    this.g.state.save();
    if (this.s.seals.length === 3) {
      this.academy.source.visible = false;
      this.g.ui.toast(
        "Sumber kutukan padam. Laporkan kepada Prof. Arun.",
        "success",
      );
    } else this.g.ui.toast(`Segel padam ${this.s.seals.length}/3.`);
  }
  frame(dt, t) {
    if (this.insideSchool) {
      this.school.frame(dt, t);
      return;
    }
    const g = this.g,
      a = this.academy;
    g.audio.ghostVoices.pause(true);
    g.audio.setWeather({}, true);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (a.spell) {
      a.spell.age += dt;
      a.spell.model.position.lerp(a.spell.target, Math.min(1, dt * 12));
      a.spell.model.rotation.y += dt * 12;
      if (a.spell.age > 0.5) {
        a.spell.model.removeFromParent();
        a.spell = null;
      }
    }
    let moving = false;
    if (!g.ui.panel) {
      const { x, z } = g.movementInput();
      const v = new THREE.Vector3(x, 0, z).clampLength(0, 1);
      moving = v.lengthSq() > 0;
      if (moving) {
        this.avatar.rotation.y = Math.atan2(x, z);
        this.position.addScaledVector(v, dt * 7);
        this.position.x = THREE.MathUtils.clamp(this.position.x, -28, 28);
        this.position.z = THREE.MathUtils.clamp(this.position.z, -17, 30);
      }
    }
    this.avatar.position.copy(this.position);
    animateHuman(this.avatar, t, moving, false);
    a.targets.forEach((m, i) => (m.visible = !this.s.seals.includes(i)));
    a.source.visible = this.s.seals.length < 3;
    a.source.rotation.y = t;
    a.camera.aspect = innerWidth / innerHeight;
    a.camera.updateProjectionMatrix();
    const flat = Math.cos(g.cameraPitch) * g.cameraDistance;
    a.camera.position.set(
      this.position.x + Math.sin(g.cameraYaw) * flat,
      Math.max(2, 4 + Math.sin(g.cameraPitch) * g.cameraDistance),
      this.position.z - 10 + Math.cos(g.cameraYaw) * flat,
    );
    a.camera.lookAt(this.position.x, 4, this.position.z - 10);
    if (g.ui.toastTimer > 0) {
      g.ui.toastTimer -= dt;
      if (g.ui.toastTimer <= 0)
        document.querySelector("#toast").classList.remove("show");
    }
    g.renderer.render(a.scene, a.camera);
  }
}
