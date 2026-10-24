import { ATTACK_RANGE } from "./combat-tuning.js";
import { FISH, rollFish, recordFish, trophyEligible } from "./fishing-data.js";
import { makeFish } from "./fishing-models.js";
import * as THREE from "three";
import {
  DINOSAURS,
  FISHING_SPOTS,
  CROPS,
  FRONTIER_NPCS,
  DINO_NEST,
} from "./frontier-data.js";
import {
  makeDinosaur,
  animateDinosaur,
  makeRod,
  makeAgent,
} from "./frontier-models.js";
import { scaleEnemy } from "./combat-rules.js";
import { orb, mesh, animateHuman } from "./models.js";
import { distance } from "./state.js";
import { ELEMENTS } from "./data.js";
const modelPoint = (m) =>
  m.position.clone().add(new THREE.Vector3(0.5, 3.1, 0.5));
export const frontierButton = (action, text, extra = "") =>
  `<button class="pill-button" data-action="${action}" ${extra}>${text}</button>`;
export function frontierPanel(g, title, html) {
  g.ui.open("dialogue");
  document.querySelector(".panel-header h2").textContent = title;
  document.querySelector("#panel-content").innerHTML = html;
}
export class Frontier {
  constructor(g) {
    this.g = g;
    this.fishing = null;
    this.capsules = [];
    this.dinos = [];
    this.fishers = [];
    this.agents = [];
    this.helperTime = 0;
    for (const def of DINOSAURS) {
      const model = makeDinosaur(def.id);
      model.position.set(def.x, def.y || 0, def.z);
      g.scene.add(model);
      const e = {
        def: { ...def, element: "Tanah" },
        dino: true,
        name: def.name,
        model,
        pos: model.position,
        home: { x: def.x, z: def.z },
        hp: def.hp,
        maxHp: def.hp,
        active: false,
        human: false,
        attackTimer: 0,
        aimHeight:
          def.id === "brontosaurus"
            ? 4
            : def.id === "trex"
              ? 4
              : def.air
                ? 0.5
                : 1,
      };
      scaleEnemy(e, g.state.data.level);
      this.dinos.push(e);
      g.enemies.push(e);
    }
    for (const [i, spot] of [
      FISHING_SPOTS[4],
      FISHING_SPOTS[9],
      FISHING_SPOTS[14],
      FISHING_SPOTS[15],
    ].entries()) {
      const def = {
        id: "pemancing-" + i,
        name: ["Pak Yudi", "Bu Nanik", "Mas Tono", "Pak Darto"][i],
        role: i === 0 ? "Guru Pemancing · Joran Tirta" : "Pemancing warga",
        quest: i === 0 ? "bowo-tirta" : undefined,
        color: ["#87a995", "#b29984", "#aeb49a", "#839da2"][i],
        x: spot.x,
        z: spot.z + 3,
        day: true,
        night: true,
        line:
          i === 0
            ? "Mau berburu ikan raksasa? Beli Joran Bambu di Kopdes, terima misiku, lalu tangkap 6 ikan. Aku beri 12 umpan dan Joran Pusaka Tirta sebagai hadiah. Patin raksasa, Arapaima, dan Raja Naga Sungai hanya menyambar malam hari setelah lima tiang ronda selesai. Saat banjir, seluruh desa bisa dipancing!"
            : "Ada sepuluh jenis ikan dengan ukuran berbeda. Beli joran dan umpan di Kopdes, lalu E di tepi air. Temui Pak Yudi di tepi barat sungai untuk upgrade Joran Tirta.",
      };
      const n =
        g.life.addResident(def, [{ x: def.x, z: def.z }]) ||
        g.npcs.find((n) => n.def.id === def.id);
      const rod = makeRod();
      n.model.add(rod);
      rod.position.set(0.55, 1, 0);
      rod.rotation.x = 0.7;
      const bobber = orb(
        g.scene,
        0.1,
        "#e4bc68",
        spot.waterX,
        0.35,
        spot.waterZ,
        1,
      );
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          modelPoint(n.model),
          bobber.position,
        ]),
        new THREE.LineBasicMaterial({
          color: "#c9e5e2",
          transparent: true,
          opacity: 0.65,
        }),
      );
      g.scene.add(line);
      this.fishers.push({
        n,
        rod,
        spot,
        bobber,
        line,
        catches: 0,
        lastCatch: -1,
      });
    }
    for (let i = 0; i < 3; i++) {
      const def = {
        id: "divisi-z-" + i,
        name: ["Kapten Z", "Sersan Maya", "Agen Rio"][i],
        role: "Pasukan Divisi Z",
        x: 61 + i * 7,
        z: 203,
        day: true,
        night: true,
        color: "#435760",
        line: "Kami melumpuhkan alien dan mengamankan mereka di ruang riset. Tangkap sendiri dua alien darat untuk izin penerbangan dari Mas Elon.",
      };
      g.life.addResident(def, [{ x: def.x, z: def.z }]);
      const n = g.npcs.find((n) => n.def.id === def.id);
      n.model.removeFromParent();
      n.model = makeAgent();
      n.model.position.set(def.x, 0, def.z);
      g.scene.add(n.model);
      this.agents.push(n);
    }
    this.hud = document.createElement("aside");
    this.hud.id = "fishing-hud";
    this.celebrationHud = document.createElement("aside");
    this.celebrationHud.id = "fish-celebration";
    this.celebrationHud.setAttribute("aria-live", "polite");
    this.celebrationHud.className = "hidden";
    document.querySelector("#hud").append(this.celebrationHud);
    this.hud.className = "hidden";
    document.querySelector("#hud").append(this.hud);
    this.bobber = orb(g.scene, 0.12, "#edc57b", 0, 0.4, 0, 1);
    this.bobber.visible = false;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    this.line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: "#d7e6dd",
        transparent: true,
        opacity: 0.8,
      }),
    );
    g.scene.add(this.line);
    this.line.visible = false;
  }
  get d() {
    return this.g.state.data;
  }
  get data() {
    return this.d.frontier;
  }
  accept(id) {
    if (this.data.gifts.includes(id)) return;
    if (id === "bowo-tirta") {
      this.data.bag.bait += 12;
      this.d.stats.anglerCatches = 0;
      this.data.gifts.push(id);
    }
    if (id === "elon-orbit") {
      this.data.bag.capsules += 5;
      this.data.gifts.push(id);
    }
    if (id === "john-survey") {
      this.data.bag.capsules += 5;
      this.data.bag.fish += 6;
      this.d.herb += 6;
      this.data.gifts.push(id);
    }
  }
  shop() {
    if (this.g.kopdes.active) this.g.kopdes.inspect();
    else this.g.kopdes.enter();
  }
  action(action, args) {
    const g = this.g;
    if (action === "frontier-shop") {
      if (distance(this.d, FRONTIER_NPCS[0]) < 7) this.shop();
      return true;
    }
    if (["frontier-buy", "frontier-sell"].includes(action)) {
      this.g.kopdes.transact(action,args);
      return true;
    }
    if (action === "fish-reel") {
      if (!g.ui.panel) this.reel();
      return true;
    }
    if (action === "fish-cancel") {
      this.cancelFishing();
      return true;
    }
    if (action === "frontier-waypoint") {
      const p =
        FRONTIER_NPCS.find((n) => n.id === args.id) ||
        g.npcs.find((n) => n.def.id === args.id)?.def ||
        FISHING_SPOTS[0];
      g.waypoint = { x: p.x, z: p.z };
      g.ui.close();
      return true;
    }
    return false;
  }
  fishingSpot() {
    const d = this.d;
    const coastal = FISHING_SPOTS.find(p => p.id.startsWith("coast-") && distance(d, p) < 5);
    if (coastal) return coastal;
    if (this.g.weather?.flooded)
      return {
        name: "Banjir Sukarame",
        x: d.x,
        z: d.z,
        waterX: d.x + 3,
        waterZ: d.z + 2,
      };
    // Every shoreline is usable; named spots simply guide NPCs and map hints.
    if (
      Math.abs(d.x - 155) > 10 &&
      Math.abs(d.x - 155) < 19 &&
      Math.abs(d.z) < 280
    )
      return {
        name: "Sungai Sukarame",
        x: d.x,
        z: d.z,
        waterX: d.x < 155 ? 150 : 160,
        waterZ: d.z,
      };
    for (const p of [
      { x: 209, z: -136, r: 10, name: "Mata Air Beringin" },
      { x: -47, z: 213, r: 9, name: "Telaga Ladang" },
    ]) {
      const dist = distance(d, p);
      if (dist > p.r - 2 && dist < p.r + 5) {
        const k = (p.r - 3) / dist;
        return {
          name: p.name,
          x: d.x,
          z: d.z,
          waterX: p.x + (d.x - p.x) * k,
          waterZ: p.z + (d.z - p.z) * k,
        };
      }
    }
    if (d.x > -157 && d.x < -96 && Math.abs(d.z + 69) < 4)
      return {
        name: "Saluran Sawah",
        x: d.x,
        z: d.z,
        waterX: d.x,
        waterZ: -69,
      };
    return null;
  }
  interactions() {
    const g = this.g,
      d = this.d,
      out = [];
    if (g.altitude > 5) return out;
    const add = (type, p, label, range = 4, priority = 0) => {
      const dist = distance(d, p);
      if (dist < range)
        out.push({ type, obj: p, label, dist: dist + priority });
    };
    add("frontier-shop", FRONTIER_NPCS[0], "Masuk Kopdes · Pajangan & jual beli", 5, -2);
    add(
      "home-entry",
      { x: 15, z: -2 },
      "Masuk rumah · Yuli, Aqila & Azkia",
      4,
      -1,
    );
    add(
      "space-entry",
      { x: 78, z: 215 },
      this.data.spaceUnlocked
        ? "Naik roket · Jelajah antariksa"
        : "Roket terkunci · Temui Mas Elon",
      6,
      -1,
    );
    if (this.fishing)
      out.push({
        type: "reel",
        label: this.fishing.bite
          ? "Ikan menyambar! E tarik sekarang"
          : "Menunggu sambaran…",
        dist: -20,
      });
    else {
      const p = this.fishingSpot();
      if (p)
        out.push({
          type: "fish",
          obj: p,
          label: "Memancing · E lempar joran",
          dist: 4.5,
        });
    }
    for (const p of CROPS)
      if (
        Math.abs(d.x - p.x) < p.w / 2 + 2 &&
        Math.abs(d.z - p.z) < p.d / 2 + 2
      )
        add("harvest", p, "Panen " + p.name, Math.max(p.w, p.d) / 2, 1);
    for (const e of this.dinos)
      if (e.active) {
        const range = e.def.air ? 18 : Math.max(4, e.def.length * 0.48);
        add(
          "dino-feed",
          { x: e.pos.x, z: e.pos.z, enemy: e },
          `${e.name} · E pakan (${Math.min(3, this.data.fed[e.def.id] || 0)}/3) · R kapsul`,
          range,
          -1,
        );
      }
    if (
      Object.values(d.incidents.residents).some((s) =>
        ["nest", "hunted"].includes(s.condition),
      )
    )
      add("nest-rescue", DINO_NEST, "Bebaskan tawanan sarang meteor", 17, -3);
    return out;
  }
  interact(it) {
    const g = this.g;
    if (it.type === "frontier-shop") this.shop();
    else if (it.type === "home-entry") g.expeditions.enter("home");
    else if (it.type === "space-entry") g.expeditions.enter("space");
    else if (it.type === "fish") this.cast(it.obj);
    else if (it.type === "reel") this.reel();
    else if (it.type === "harvest") {
      const p = it.obj,
        key = this.d.night + ":" + (g.state.isNight ? "night" : "day");
      if (this.data.harvest[p.id] === key)
        g.ui.toast("Petak ini sudah dipanen pada giliran ini.");
      else {
        this.data.harvest[p.id] = key;
        this.data.bag[p.id] += 5;
        g.ui.toast(
          "Panen +5 " + p.name + ". Bisa dijual di Kopdes.",
          "success",
        );
        g.audio.play("collect");
      }
    } else if (it.type === "nest-rescue") {
      for (const [id, s] of Object.entries(this.d.incidents.residents))
        if (["nest", "hunted"].includes(s.condition)) {
          g.incidents.rescue(id);
          for (const e of g.incidents.actors)
            if (e.incident.captive === id) e.incident.captive = null;
        }
      g.ui.toast(
        "Warga dan ternak keluar dari sarang dengan selamat!",
        "success",
      );
    } else if (it.type === "dino-feed") {
      const e = it.obj.enemy,
        id = e.def.id,
        bag = e.def.food === "herb" ? this.d : this.data.bag;
      if ((this.data.fed[id] || 0) >= 3)
        g.ui.toast(
          "Sudah percaya. Klik dinosaurus lalu R untuk menangkap dengan kapsul.",
        );
      else if (bag[e.def.food] < 1)
        g.ui.toast(
          "Pakan habis. Beli " +
            (e.def.food === "herb" ? "daun obat" : "ikan") +
            " di Kopdes.",
        );
      else {
        bag[e.def.food]--;
        this.data.fed[id] = (this.data.fed[id] || 0) + 1;
        g.lockedTarget = e;
        g.effects.burst(e.pos.x, e.pos.y + 1, e.pos.z, "#a9e1a4", 20, 3);
        g.ui.toast(`${e.name}: kepercayaan ${this.data.fed[id]}/3.`);
      }
    } else return false;
    g.state.save();
    return true;
  }
  cast(spot) {
    const g = this.g;
    if (!spot || this.fishing || g.expeditions?.active || g.ui.panel)
      return false;
    this.endCelebration();
    if (!this.data.rod) {
      g.ui.toast("Beli Joran Bambu di Kopdes terlebih dahulu.");
      return false;
    }
    if (this.data.bag.bait < 1) {
      g.ui.toast("Umpan habis. Beli lagi di Kopdes.");
      return false;
    }
    if (this.d.riding) {
      g.ui.toast("Turun dari tunggangan sebelum memancing.");
      return false;
    }
    this.data.bag.bait--;
    this.fishing = {
      spot,
      x: this.d.x,
      z: this.d.z,
      elapsed: 0,
      wait: 2 + Math.random() * 3,
      bite: false,
    };
    g.facing = Math.atan2(spot.waterX - this.d.x, spot.waterZ - this.d.z);
    this.rod = makeRod();
    g.player.add(this.rod);
    this.rod.position.set(0.65, 1, 0);
    this.rod.rotation.x = 0.75;
    this.bobber.position.set(
      spot.waterX,
      g.weather?.waterY || 0.35,
      spot.waterZ,
    );
    this.bobber.visible = this.line.visible = true;
    g.audio.play("splash");
    g.state.save();
    return true;
  }
  reel() {
    if (!this.fishing) return;
    const g = this.g;
    if (this.fishing.bite) {
      const catchData = rollFish({
        rod: this.data.rod,
        night: g.state.isNight,
        posts: this.d.posts,
      });
      recordFish(this.d, catchData);
      this.celebrate(catchData);
      document.querySelector("#toast").classList.remove("show");
      g.ui.toastTimer = 0;
      g.effects.burst(
        this.bobber.position.x,
        0.5,
        this.bobber.position.z,
        "#b2eeff",
        25,
        3,
      );
      g.audio.play("collect");
    } else g.ui.toast("Terlalu cepat. Tunggu pelampung menyentak.");
    this.cancelFishing();
    g.state.save();
  }
  endCelebration() {
    if (this.catchModel) {
      this.catchModel.removeFromParent();
      this.catchModel.traverse((o) => o.geometry?.dispose());
      this.catchModel = null;
    }
    this.celebration = 0;
    this.celebrationHud?.classList.add("hidden");
    if (this.hiddenHolder) {
      this.hiddenHolder.visible = true;
      this.hiddenHolder = null;
    }
  }
  celebrate(catchData) {
    this.endCelebration();
    const f = FISH.find((f) => f.id === catchData.id);
    this.catchModel = makeFish(f, catchData.cm);
    this.catchModel.position.set(0, 1.6, 0.24);
    this.g.player.add(this.catchModel);
    this.celebration = 4.5;
    this.hiddenHolder = this.g.player.userData.holder;
    if (this.hiddenHolder) this.hiddenHolder.visible = false;
    this.celebrationHud.innerHTML = `<strong>${f.legendary ? "✦ " : ""}${f.name}</strong><span>${catchData.kg.toFixed(2)} kg · ${catchData.cm} cm</span><small>“Mancing Mania, Mantap!”</small>`;
    this.celebrationHud.classList.remove("hidden");
    this.g.audio.fishCheer();
  }
  journal() {
    return `<h3 class="section-label">JURNAL 10 IKAN SUKARAME</h3>${frontierButton("frontier-waypoint", "Temui Pak Yudi · upgrade joran", 'data-id="pemancing-0"')}<p class="frontier-lead">Rekor tangkapan tetap tersimpan meski ikan dijual atau disimpan. Harga Kopdes per ekor. Ikan besar: Joran Tirta + malam + 5 tiang ronda.</p><div class="fish-journal">${FISH.map(
      (f) => {
        const r = this.data.fishRecords[f.id];
        return `<article class="${f.legendary ? "legendary" : ""}"><b>${f.legendary ? "✦ " : ""}${f.name}</b><small>${f.min}–${f.max} kg · ${f.cm[0]}–${f.cm[1]} cm</small><small>${r ? `${r.count} tertangkap · Rekor ${r.kg.toFixed(2)} kg / ${r.cm} cm` : "Belum tercatat"}</small>${f.large ? "<small>Joran Tirta · malam · 5 tiang</small>" : ""}</article>`;
      },
    ).join("")}</div><p class="frontier-lead">Tangkapan terbaru: ${
      this.data.fishLog
        .slice(-5)
        .reverse()
        .map(
          (c) =>
            `${FISH.find((f) => f.id === c.id)?.name} ${c.kg.toFixed(2)} kg / ${c.cm} cm`,
        )
        .join(" · ") || "Belum ada"
    }</p>`;
  }
  cancelFishing() {
    this.fishing = null;
    this.rod?.removeFromParent();
    this.rod = null;
    this.hud.classList.add("hidden");
    this.bobber.visible = this.line.visible = false;
  }
  capture() {
    const g = this.g,
      e = g.lockedTarget || g.nearby(27).find((e) => e.dino);
    if (!e || (!e.dino && e.incident?.kind !== "alien")) return false;
    if (g.cooldowns.bottle > 0) return true;
    if (
      !e.active ||
      e.hp <= 0 ||
      g.ranged
        .aim(e)
        .distanceTo(new THREE.Vector3(this.d.x, g.altitude + 2, this.d.z)) > 32
    ) {
      g.ui.toast("Dekati target dalam 32 meter.");
      return true;
    }
    if (
      e.hp / e.maxHp > 0.25 &&
      !(e.dino && (this.data.fed[e.def.id] || 0) >= 3)
    ) {
      g.ui.toast(
        e.dino
          ? "Beri tiga pakan (E) atau lemahkan HP hingga 25%."
          : "Lemahkan alien darat hingga HP 25%.",
      );
      return true;
    }
    if (this.data.bag.capsules < 1) {
      g.ui.toast("Kapsul habis. Beli di Kopdes atau terima bekal quest.");
      return true;
    }
    this.data.bag.capsules--;
    g.cooldowns.bottle = 1;
    const model = orb(
      g.scene,
      0.21,
      "#83e2e5",
      this.d.x,
      g.altitude + 1.8,
      this.d.z,
      1,
      { emissive: "#4c9ea7", emissiveIntensity: 1 },
    );
    this.capsules.push({ model, e, start: model.position.clone(), age: 0 });
    g.audio.play("bottle");
    g.state.save();
    return true;
  }
  finishCapture(e) {
    const g = this.g;
    if (!e.active || e.hp <= 0) return;
    if (e.dino) {
      const id = e.def.id;
      if (!this.data.dinos.includes(id)) this.data.dinos.push(id);
      if (!this.data.tagged.includes(id)) {
        this.data.tagged.push(id);
        this.d.stats.dinoTagged = this.data.tagged.length;
      }
      e.active = e.model.visible = false;
      g.ui.toast(
        e.name + " diamankan di habitat konservasi. Atlas diperbarui.",
        "success",
      );
    } else {
      g.incidents.defeated(e, "capture");
      this.d.stats.aliensCaptured++;
      this.data.zCaptives++;
      g.ui.toast(
        "Alien diamankan untuk riset Divisi Z. Laporkan ke Mas Elon.",
        "success",
      );
    }
    if (g.lockedTarget === e) g.lockedTarget = null;
    g.effects.burst(e.pos.x, e.pos.y + 1, e.pos.z, "#9ee9e3", 55, 6);
    g.audio.play("capture");
    g.state.save();
  }
  mountedAttack(special = false) {
    const g = this.g;
    if (!(this.d.riding && this.d.mount === "sembrani")) return false;
    if (g.cooldowns[special ? "special" : "attack"] > 0 || g.deathTimer > 0)
      return true;
    const e = g.ranged.target(g.state.weapon.projectile ? ATTACK_RANGE.solar : ATTACK_RANGE.mountedPusaka);
    if (!e) {
      g.ui.toast("Klik musuh dalam jangkauan pusaka dari Kuda Sembrani.");
      return true;
    }
    if (special && this.d.stamina < 18) return true;
    const damage =
      (g.state.weapon.damage + this.d.upgrades.strength * 6) *
      (special ? 2.4 : 1);
    g.ranged.launch(e, damage, false, 1, ELEMENTS[g.state.weapon.element], g.state.weapon.projectile ? ATTACK_RANGE.solar : ATTACK_RANGE.mountedPusaka);
    g.cooldowns[special ? "special" : "attack"] = special ? 8 : 0.65;
    if (special) this.d.stamina -= 18;
    g.swing = 0.001;
    g.facing = Math.atan2(e.pos.x - this.d.x, e.pos.z - this.d.z);
    g.audio.play("skill");
    return true;
  }
  wildDefeated(e) {
    e.active = e.model.visible = false;
    e.respawn = 90;
    this.g.ui.toast(e.name + " berlindung. Ia akan kembali ke wilayahnya.");
  }
  update(dt, t) {
    const g = this.g;
    if (this.celebration > 0) {
      this.celebration -= dt;
      if (
        this.celebration <= 0 ||
        this.d.riding ||
        g.deathTimer > 0 ||
        g.swing > 0 ||
        g.expeditions?.active
      )
        this.endCelebration();
      else {
        const lift = Math.min(1, (4.5 - this.celebration) / 0.32);
        g.player.userData.arms.forEach(
          (a) => (a.rotation.x = -0.5 - lift * 2.3),
        );
        this.catchModel.position.y =
          1.6 + lift * (1.03 + this.catchModel.userData.length * 0.225);
        this.catchModel.rotation.y = Math.sin(t * 5) * 0.12;
      }
    }
    if (this.fishing) {
      const f = this.fishing;
      f.elapsed += dt;
      if (distance(this.d, f) > 2 || this.d.riding) {
        this.cancelFishing();
      } else if (f.elapsed > f.wait + (this.data.rod >= 2 ? 3.5 : 2)) {
        g.ui.toast("Ikan lolos. Coba lempar lagi.");
        this.cancelFishing();
      } else {
        f.bite = f.elapsed >= f.wait;
        this.bobber.position.y =
          (g.weather?.waterY || 0.32) +
          Math.sin(t * (f.bite ? 22 : 3)) * (f.bite ? 0.16 : 0.04);
        this.line.geometry.setFromPoints([
          new THREE.Vector3(this.d.x + 0.4, g.altitude + 3, this.d.z + 0.6),
          this.bobber.position,
        ]);
        this.hud.classList.remove("hidden");
        if (f.shownBite !== f.bite) {
          f.shownBite = f.bite;
          this.hud.innerHTML = `<small>${f.spot.name}</small><strong>${f.bite ? "Ikan menyambar!" : "Menunggu sambaran…"}</strong><span>${f.bite ? "E · Tarik sekarang" : "Jangan bergerak · tunggu pelampung"}</span>${frontierButton("fish-reel", "Tarik · E")}${frontierButton("fish-cancel", "Simpan joran")}<small>${trophyEligible({ rod: this.data.rod, night: g.state.isNight, posts: this.d.posts }) ? "✦ Peluang ikan raksasa & legendaris terbuka" : "Ikan besar: Joran Tirta · malam · 5 tiang"}</small>`;
        }
      }
    }
    for (let i = this.capsules.length - 1; i >= 0; i--) {
      const p = this.capsules[i];
      p.age += dt;
      const u = Math.min(1, p.age / 0.75),
        end = g.ranged.aim(p.e);
      p.model.position.lerpVectors(p.start, end, u);
      p.model.position.y += Math.sin(u * Math.PI) * 3;
      if (u === 1) {
        this.finishCapture(p.e);
        p.model.removeFromParent();
        p.model.geometry.dispose();
        this.capsules.splice(i, 1);
      }
    }
    for (const e of this.dinos) {
      scaleEnemy(e, this.d.level);
      const owned = this.data.dinos.includes(e.def.id);
      e.respawn = Math.max(0, (e.respawn || 0) - dt);
      e.active = this.data.dinoSeen && !owned && !e.respawn;
      e.model.visible = e.active;
      if (!e.active || e.heldByPlayer) continue;
      if (e.hp <= 0) e.hp = e.maxHp;
      const a =
          t * 0.035 +
          DINOSAURS.indexOf(DINOSAURS.find((d) => d.id === e.def.id)),
        tx = e.home.x + Math.sin(a) * e.def.radius * 0.4,
        tz = e.home.z + Math.cos(a) * e.def.radius * 0.4;
      if (!e.def.air) {
        const dx = tx - e.pos.x,
          dz = tz - e.pos.z,
          len = Math.hypot(dx, dz),
          step = Math.min(
            len,
            dt * e.def.speed * 0.35 * (g.weather?.movementFactor(e.pos) ?? 1),
          ),
          nx = e.pos.x + (dx / (len || 1)) * step,
          nz = e.pos.z + (dz / (len || 1)) * step;
        if (g.world.canMove(nx, nz, 0.8)) {
          e.pos.x = nx;
          e.pos.z = nz;
        }
        e.model.rotation.y = Math.atan2(dx, dz);
      } else {
        e.pos.set(e.home.x, 13, e.home.z);
        e.model.rotation.y = 0.4;
      }
      animateDinosaur(e.model, t, !e.def.air);
      if (e.def.air)
        e.model.userData.wings.forEach(
          (w, i) => (w.rotation.z = (i ? 1 : -1) * (0.4 + Math.sin(t) * 0.04)),
        );
    }
    for (const f of this.fishers) {
      f.rod.visible = !f.n.kappaCaptive && !f.n.incidentUnavailable && !f.n.witchCursed;
      f.line.visible = f.bobber.visible =
        f.n.active && !f.n.kappaCaptive && !f.n.incidentUnavailable;
      if (!f.line.visible) continue;
      f.bobber.position.y =
        (g.weather?.waterY || 0.35) + Math.sin(t * 2.5) * 0.05;
      f.line.geometry.setFromPoints([modelPoint(f.n.model), f.bobber.position]);
      const cycle = Math.floor((t + this.fishers.indexOf(f) * 5) / 24);
      if (cycle > f.lastCatch) {
        f.lastCatch = cycle;
        f.catches++;
        g.effects.burst(f.spot.waterX, 0.4, f.spot.waterZ, "#addef2", 6, 1.6);
      }
      f.n.model.userData.arms[0].rotation.x = t % 24 > 21 ? -1.7 : -0.8;
      f.n.model.rotation.y = Math.atan2(
        f.spot.waterX - f.n.model.position.x,
        f.spot.waterZ - f.n.model.position.z,
      );
      f.rod.rotation.x = 0.6 + Math.sin(t * 0.8) * 0.08;
    }
    this.helperTime -= dt;
    const ready = this.helperTime <= 0;
    if (ready) this.helperTime = 0.85;
    for (const n of this.agents) {
      const e = g.incidents.actors
        .filter((e) => e.active && e.incident.kind === "alien")
        .sort(
          (a, b) =>
            distance(a.pos, n.model.position) -
            distance(b.pos, n.model.position),
        )[0];
      if (!e) continue;
      const dist = distance(e.pos, n.model.position);
      if (dist > 12) {
        const actor = (n.navigationAgent ||= {
          pos: n.model.position,
          model: n.model,
        });
        for (let left = dt; left > 0; left -= 0.05)
          g.incidents.navigation.move(
            actor,
            e.pos.x,
            e.pos.z,
            6,
            Math.min(0.05, left),
          );
        animateHuman(n.model, t, true, false);
      } else if (ready) {
        if (e.hp / e.maxHp <= 0.25) {
          g.incidents.defeated(e, "division-z");
          this.data.zCaptives++;
          g.state.save();
        } else {
          g.damageEnemy(
            e,
            Math.min(12, e.hp - e.maxHp * 0.2),
            "division-z",
            "energy",
          );
          g.effects.burst(e.pos.x, 1.5, e.pos.z, "#8dc8f3", 8, 2);
        }
      }
      n.def.x = n.model.position.x;
      n.def.z = n.model.position.z;
      n.route = [{ x: n.def.x, z: n.def.z }];
    }
    g.world.frontier.captive.visible = this.data.zCaptives > 0;
    g.world.frontier.crater.visible = this.data.dinoSeen;
  }
}
