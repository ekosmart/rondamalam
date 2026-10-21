import * as THREE from "three";
import { makeHuman, animateHuman, box, orb, sign, beam } from "./models.js";
import { makeCoastAsset } from "./coast-models.js";
import { CAPTAIN, WARUNG } from "./coast-layout.js";
import { FISH } from "./fishing-data.js";
import { frontierPanel, frontierButton as button } from "./frontier.js";
import {
  COAST,
  LIGHTHOUSE,
  DOCKS,
  COAST_PARTS,
  FISHERMEN,
  COAST_STAGES,
  coastStage,
  coastWater,
  collectCoastPart,
  repairLighthouse,
  deliverFishermen,
  claimCoastReward,
} from "./coast-rules.js";
import "./coast.css";
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const WRECK = { x: 195, z: 440 };
export class Coast {
  constructor(g) {
    this.g = g;
    this.boating = false;
    this.aboard = [];
    this.hudTimer = 0;
    this.hud = document.createElement("section");
    this.hud.id = "coast-hud";
    this.hud.className = "hidden";
    document.querySelector("#hud").append(this.hud);
    this.boat = makeCoastAsset("boat");
    g.scene.add(this.boat);
    this.boat.position.set(DOCKS[0].boatX, 0.15, DOCKS[0].boatZ);
    this.boatLantern = orb(this.boat, 0.16, "#a0f5d2", 0, 2.7, 1.6, 0, {
      emissive: "#70ebba",
      emissiveIntensity: 1,
    });
    this.boatLight = new THREE.PointLight("#8decc1", 0, 24, 1.5);
    this.boatLight.position.set(0, 2.7, 1.6);
    this.boat.add(this.boatLight);
    this.passengers = FISHERMEN.map((p, i) => {
      const model = makeHuman(i ? "#9c724c" : "#72838f");
      model.scale.setScalar(0.7);
      model.position.set(i ? 0.55 : -0.55, 0.45, -1.5);
      this.boat.add(model);
      return model;
    });
    this.rescueModels = FISHERMEN.map((def, i) => {
      const group = new THREE.Group();
      group.position.set(def.x, 0.42, def.z);
      g.scene.add(group);
      box(group, 3, 0.2, 3, "#9b7c50", 0, 0, 0);
      const person = makeHuman(i ? "#9c724c" : "#72838f");
      group.add(person);
      sign(group, def.name + " • TOLONG!", 6, 0.65).position.set(0, 3.4, 0);
      return { def, group, person };
    });
    this.partModels = COAST_PARTS.map((def) => {
      const gem = orb(g.scene, 0.45, "#e4c477", def.x, 1.1, def.z, 0, {
        emissive: "#c1a05d",
        emissiveIntensity: 0.35,
      });
      sign(g.scene, def.name, 5, 0.55).position.set(def.x, 2.4, def.z);
      return { def, gem };
    });
    this.relic = orb(g.scene, 0.4, "#8fe6ca", WRECK.x, 1.5, WRECK.z, 0, {
      emissive: "#70d5ae",
      emissiveIntensity: 1,
    });
    this.npcs = [];
    for (const [name, x, z, color] of [
      ["Bu Sari", CAPTAIN.x, CAPTAIN.z, "#b68b64"],
      ["Bu Ningsih", WARUNG.x, WARUNG.z, "#8e9b75"],
      ["Pak Jaya", -24, 394, "#748c9b"],
      ["Nelayan Bima", 40, 342, "#aa8255"],
      ["Nelayan Tono", 38, 353, "#6d8a84"],
      ["Ayu", 9, 341, "#c0a77d"],
      ["Raka", 12, 343, "#8fa5ba"],
    ]) {
      const model = makeHuman(color);
      model.position.set(x, 0, z);
      if (name === "Ayu" || name === "Raka") model.scale.setScalar(0.65);
      if (name.startsWith("Bu ")) {
        model.userData.torso.children
          .find((m) => m.isMesh && Math.abs(m.position.y - 2.64) < 0.01)
          ?.removeFromParent();
        orb(model.userData.torso, 0.32, "#34372d", 0, 2.43, -0.12, 1);
      }
      g.scene.add(model);
      this.npcs.push({ name, x, z, model });
    }
    sign(g.scene, "BU SARI • KABAR PELABUHAN", 8, 0.65).position.set(
      CAPTAIN.x,
      3.5,
      CAPTAIN.z,
    );
    this.lightPivot = new THREE.Group();
    this.lightPivot.position.set(30, 16.8, 440);
    g.scene.add(this.lightPivot);
    const beamMesh = new THREE.Mesh(
      new THREE.ConeGeometry(7, 70, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: "#ffe6a5",
        transparent: true,
        opacity: 0.09,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    beamMesh.rotation.x = -Math.PI / 2;
    beamMesh.position.z = 35;
    this.lightPivot.add(beamMesh);
    this.lamp = new THREE.PointLight("#ffe1a1", 0, 85, 1.4);
    this.lamp.position.copy(this.lightPivot.position);
    g.scene.add(this.lamp);
    this.wake = new THREE.Mesh(
      new THREE.RingGeometry(1.3, 1.48, 28),
      new THREE.MeshBasicMaterial({
        color: "#d4e7dc",
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.wake.rotation.x = -Math.PI / 2;
    g.scene.add(this.wake);
    this.update(0, 0);
  }
  get s() {
    return this.g.state.data.coast;
  }
  journal() {
    const stage = coastStage(this.s),
      [title, desc] = COAST_STAGES[stage];
    return `<div class="note-box"><span class="eyebrow">EKSPANSI PESISIR · KARANG TIRTA</span><h3>${title}</h3><p>${desc}</p><p>Komponen ${this.s.parts.length}/3 · Nelayan pulang ${this.s.rescued.length}/2 · Perahu ${this.s.boatOwned ? "milikmu" : "belum dimiliki"}</p>${button("coast-waypoint", "Tandai Karang Tirta")}</div>`;
  }
  interactions() {
    const g = this.g,
      d = g.state.data;
    if (g.spirit.active || g.expeditions.active || g.altitude > 5) return [];
    const choices = [];
    if (this.boating) {
      for (const dock of DOCKS)
        if (distance(d, { x: dock.boatX, z: dock.boatZ }) < 12)
          choices.push({
            type: "coast-dock",
            id: dock.id,
            x: dock.boatX,
            z: dock.boatZ,
            label: "Sandar · " + dock.name,
          });
      for (const f of FISHERMEN)
        if (!this.s.rescued.includes(f.id) && !this.aboard.includes(f.id))
          choices.push({
            type: "coast-rescue",
            ...f,
            label: "Selamatkan " + f.name,
          });
    } else {
      choices.push({
        type: "coast-captain",
        ...CAPTAIN,
        label: "Bu Sari · Quest & pelelangan",
      });
      choices.push({
        type: "coast-warung",
        ...WARUNG,
        label: "Warung Bu Ningsih · Makan 20 koin",
      });
      choices.push({
        type: "coast-lighthouse",
        x: 30,
        z: 446,
        label: this.s.lighthouse ? "Periksa mercusuar" : "Perbaiki mercusuar",
      });
      for (const dock of DOCKS)
        choices.push({
          type: "coast-board",
          ...dock,
          label: this.s.boatOwned
            ? "Naik perahu motor"
            : "Pinjam perahu penyelamat",
        });
      if (this.s.started && !this.s.lighthouse)
        for (const p of COAST_PARTS)
          if (!this.s.parts.includes(p.id))
            choices.push({
              type: "coast-part",
              ...p,
              label: "Ambil " + p.name,
            });
      if (this.s.boatOwned && !this.s.relic)
        choices.push({
          type: "coast-wreck",
          ...WRECK,
          label: "Periksa kapal tanpa awak",
        });
    }
    return choices
      .map((p) => ({ ...p, dist: distance(d, p) }))
      .filter(
        (p) =>
          p.dist <
          (p.type === "coast-dock" ? 12 : p.type === "coast-rescue" ? 7 : 4.5),
      );
  }
  interact(it) {
    if (!it.type.startsWith("coast-")) return false;
    const g = this.g,
      d = g.state.data;
    if (it.type === "coast-captain") {
      if (!this.s.started) {
        this.s.started = true;
        g.state.save();
      }
      this.captain();
    } else if (it.type === "coast-part") {
      if (collectCoastPart(this.s, it.id)) {
        g.state.save();
        g.audio.play("collect");
        g.ui.toast(
          "Komponen mercusuar " + this.s.parts.length + "/3.",
          "success",
        );
      }
    } else if (it.type === "coast-lighthouse") {
      if (repairLighthouse(d)) {
        g.state.addXp(50);
        g.state.save();
        g.ui.toast(
          "Mercusuar menyala! +100 koin. Pinjam perahu di dermaga untuk menolong dua nelayan.",
          "success",
        );
      } else
        g.ui.toast(
          this.s.lighthouse
            ? "Lensa berputar dan cahaya menuntun perahu pulang."
            : "Mulai quest dari Bu Sari, lalu kumpulkan lensa, dinamo, dan kabel.",
        );
    } else if (it.type === "coast-board") this.board(it.id);
    else if (it.type === "coast-dock") this.dock(it.id);
    else if (it.type === "coast-rescue") {
      if (
        this.boating &&
        this.s.lighthouse &&
        !this.s.rescued.includes(it.id) &&
        !this.aboard.includes(it.id)
      ) {
        this.aboard.push(it.id);
        g.audio.play("collect");
        g.ui.toast(
          it.name + " naik ke perahu. Antar ke dermaga utama.",
          "success",
        );
      }
    } else if (it.type === "coast-wreck") {
      if (this.s.boatOwned) {
        this.s.relic = true;
        g.state.save();
        g.ui.dialogue({
          name: "Segel Samudra",
          role: "Kapal Tanpa Awak",
          line: "Di lambung kapal tersimpan segel dari keraton alam gaib. Bu Sari pernah mendengar tentang Ratu Selatan. Buto Ijo menjaga pulau setiap malam; usir atau tangkap dia, lalu bawa segel ini kepada Bu Sari.",
        });
      }
    } else if (it.type === "coast-warung") {
      if (d.hp >= g.state.maxHp) g.ui.toast("Daya tahanmu masih penuh.");
      else if (g.state.spend({ coins: 20 })) {
        d.hp = g.state.maxHp;
        g.state.save();
        g.ui.toast("Sup ikan hangat. Daya tahan pulih.", "success");
      } else g.ui.toast("Sup ikan memerlukan 20 koin.");
    }
    return true;
  }
  captain() {
    const g = this.g,
      [title, desc] = COAST_STAGES[coastStage(this.s)];
    frontierPanel(
      g,
      "Bu Sari · Karang Tirta",
      `<p class="frontier-lead">${desc}</p><h3>${title}</h3><p>${this.s.lighthouse ? "Mercusuar sudah menyala." : "Ambil lensa di gudang (−8, 355), dinamo di bengkel (−24, 396), dan kabel pelelangan (−24, 315)."} Nelayan selamat: ${this.s.rescued.length}/2.</p>${this.s.boatOwned && this.s.relic && this.s.butoDefeated && !this.s.completed ? button("coast-claim", "Serahkan segel & selesaikan quest") : ""}<p>${this.s.completed ? "Segel akan dikembalikan kepada Ratu Selatan. Terima kasih telah memulihkan pelabuhan." : ""}</p><h3>Pelelangan ikan</h3><p>Jual hasil pancing dari seluruh Sukarame. Catatan dan rekor ikan tetap tersimpan.</p>${button("coast-sell", "Jual seluruh ikan")}<p>${button("coast-next", "Tandai tujuan quest berikutnya")}</p>`,
    );
  }
  board(id) {
    const dock = DOCKS.find((x) => x.id === id),
      g = this.g,
      d = g.state.data;
    if (!dock || this.boating || distance(d, dock) > 5 || g.altitude > 5)
      return false;
    if (!this.s.lighthouse) {
      g.ui.toast("Perbaiki mercusuar agar perahu boleh berlayar.");
      return false;
    }
    g.frontier.cancelFishing();
    g.frontier.endCelebration();
    g.tractor.reset();
    d.riding = false;
    this.boating = true;
    this.aboard = [];
    g.altitude = 0;
    g.bike.visible = false;
    d.x = dock.boatX;
    d.z = dock.boatZ;
    g.keys.clear();
    g.ui.joystick?.reset();
    g.state.save();
    this.boat.rotation.y = id === "harbor" ? Math.PI / 2 : 0;
    g.ui.toast(
      "WASD / joystick mengemudikan perahu · E menolong / sandar. Perahu tidak bisa naik ke daratan.",
    );
    return true;
  }
  dock(id) {
    const dock = DOCKS.find((x) => x.id === id),
      g = this.g,
      d = g.state.data;
    if (
      !this.boating ||
      !dock ||
      distance(d, { x: dock.boatX, z: dock.boatZ }) > 12
    )
      return false;
    if (id === "harbor") {
      const wasOwned = this.s.boatOwned;
      if (deliverFishermen(d, this.aboard)) {
        if (!wasOwned && this.s.boatOwned) {
          g.state.addXp(80);
          g.ui.toast(
            "Dua nelayan pulang! +150 koin. Perahu motor menjadi milikmu; selidiki kapal di Pulau Karang.",
            "success",
          );
        } else
          g.ui.toast(
            "Nelayan kembali ke keluarga. Satu lagi menunggu di teluk.",
            "success",
          );
      }
      this.aboard = [];
    } else if (this.aboard.length) {
      g.ui.toast("Antar penumpang ke dermaga utama dahulu.");
      return false;
    }
    this.boating = false;
    Object.assign(d, { x: dock.x, z: dock.z, riding: false });
    g.altitude = 0;
    this.boat.position.set(dock.boatX, 0.15, dock.boatZ);
    g.keys.clear();
    g.ui.joystick?.reset();
    g.updatePlayer(0);
    g.state.save();
    return true;
  }
  cancelBoat() {
    this.boating = false;
    this.aboard = [];
    this.boat.position.set(93, 0.15, 330);
    this.wake.visible = false;
  }
  action(action, args = {}) {
    const g = this.g,
      d = g.state.data;
    if (action === "coast-waypoint" || action === "coast-next") {
      if (g.spirit.active || g.expeditions.active) return true;
      let target = COAST;
      if (action === "coast-next") {
        const st = coastStage(this.s);
        target =
          st === 1
            ? COAST_PARTS.find((p) => !this.s.parts.includes(p.id)) || {
                x: 30,
                z: 446,
              }
            : st === 2
              ? DOCKS[0]
              : st === 3
                ? DOCKS[1]
                : CAPTAIN;
      }
      g.waypoint = { x: target.x, z: target.z };
      g.ui.close();
      g.ui.toast("Tujuan pesisir ditandai di peta.");
      return true;
    }
    if (action === "coast-sell" || action === "coast-claim") {
      if (this.boating || distance(d, CAPTAIN) > 5) return true;
      if (action === "coast-claim") {
        if (claimCoastReward(d)) {
          g.state.addXp(100);
          g.state.save();
          g.ui.toast(
            "Karang Tirta pulih! +250 koin, +6 sari gaib. Lampu perahu memperoleh restu samudra.",
            "success",
          );
        }
      } else {
        let coins = 0;
        for (const f of FISH) {
          const n = d.frontier.bag[f.id] || 0;
          coins += n * f.sell;
          d.frontier.bag[f.id] = 0;
        }
        d.coins += coins;
        g.state.save();
        g.ui.toast(
          coins
            ? "Hasil pelelangan: " + coins + " koin."
            : "Belum ada ikan untuk dijual.",
        );
      }
      this.captain();
      return true;
    }
    if (!this.boating) return false;
    if (action === "coast-return") {
      this.cancelBoat();
      d.x = 84;
      d.z = 330;
      d.riding = false;
      g.updatePlayer(0);
      g.state.save();
      g.ui.toast(
        "Kembali ke dermaga. Penumpang yang belum diantar menunggu lagi di rakit.",
      );
      return true;
    }
    if (action === "mount") {
      const dock = DOCKS.find(
        (p) => distance(d, { x: p.boatX, z: p.boatZ }) < 12,
      );
      if (dock) this.dock(dock.id);
      else g.ui.toast("Dekati dermaga untuk turun dari perahu.");
      return true;
    }
    if (
      [
        "attack",
        "special",
        "capture",
        "companion",
        "ascend",
        "descend",
        "mecha-flight",
        "missiles",
        "tractor",
      ].includes(action)
    ) {
      g.ui.toast("Sandarkan perahu untuk menggunakan perlengkapan.");
      return true;
    }
    if (action === "menu") {
      this.cancelBoat();
      d.x = 84;
      d.z = 330;
      return false;
    }
    return false;
  }
  moveBoat(dt) {
    if (!this.boating) return false;
    const g = this.g,
      d = g.state.data,
      { x, z } = g.movementInput();
    const xx = x * Math.cos(g.cameraYaw) + z * Math.sin(g.cameraYaw),
      zz = -x * Math.sin(g.cameraYaw) + z * Math.cos(g.cameraYaw);
    const speed = g.keys.has("ShiftLeft") ? 24 : 16;
    if (coastWater(d.x + xx * dt * speed, d.z, 1.5)) d.x += xx * dt * speed;
    if (coastWater(d.x, d.z + zz * dt * speed, 1.5)) d.z += zz * dt * speed;
    if (Math.hypot(x, z) > 0.05) {
      g.facing = Math.atan2(xx, zz);
      this.boat.rotation.y = g.facing;
    }
    g.altitude = 0;
    g.bike.visible = false;
    g.player.visible = true;
    this.boat.position.set(d.x, 0.18 + Math.sin(g.elapsed * 2) * 0.04, d.z);
    g.player.position.set(d.x, 0.5, d.z);
    g.player.rotation.y = this.boat.rotation.y;
    animateHuman(g.player, g.elapsed, false, true);
    if (g.companionModel) g.companionModel.position.set(d.x + 2, 1, d.z - 2);
    this.wake.position.set(d.x, 0.3, d.z);
    this.wake.scale.set(1.5, 2.2, 1);
    return true;
  }
  defeated(e) {
    if (e.def.id !== "buto-ijo") return;
    this.s.butoDefeated = true;
    this.g.state.save();
  }
  update(dt, t) {
    const g = this.g,
      d = g.state.data;
    this.boat.visible = this.s.lighthouse;
    this.boatLantern.visible = this.s.completed;
    this.boatLight.intensity = this.s.completed && g.state.isNight ? 15 : 0;
    this.wake.visible = this.boating;
    this.passengers.forEach((m, i) => {
      m.visible = !!this.aboard[i];
      if (m.visible) animateHuman(m, t, false, true);
    });
    for (const { def, group, person } of this.rescueModels) {
      group.visible =
        this.s.lighthouse &&
        !this.s.rescued.includes(def.id) &&
        !this.aboard.includes(def.id);
      group.position.y = 0.42 + Math.sin(t * 1.4) * 0.05;
      animateHuman(person, t, false, false);
    }
    for (const { def, gem } of this.partModels) {
      gem.visible = this.s.started && !this.s.parts.includes(def.id);
      gem.rotation.y = t;
      gem.position.y = 1.1 + Math.sin(t * 2) * 0.12;
    }
    this.relic.visible = this.s.boatOwned && !this.s.relic;
    this.relic.rotation.y = t;
    this.lightPivot.visible = this.s.lighthouse && g.state.isNight;
    this.lightPivot.rotation.y = t * 0.25;
    this.lamp.intensity = this.lightPivot.visible ? 80 : 0;
    for (let i = 0; i < this.npcs.length; i++) {
      const n = this.npcs[i],
        ambient = i >= 3;
      n.model.visible = !ambient || !g.state.isNight;
      if (ambient) {
        const afternoon = d.time >= 900;
        n.model.position.set(
          n.x + (afternoon ? 12 : 0) + Math.sin(t * 0.2 + i) * 2,
          0,
          n.z + Math.cos(t * 0.2 + i) * 2,
        );
        n.model.rotation.y = t * 0.2 + i;
      }
      animateHuman(n.model, t, ambient, false);
    }
    this.hudTimer += dt;
    if (this.hudTimer < 0.2) return;
    this.hudTimer = 0;
    this.hud.classList.toggle(
      "hidden",
      d.z < 285 || g.spirit.active || g.expeditions.active || !g.started,
    );
    if (d.z < 285) return;
    const [title] = COAST_STAGES[coastStage(this.s)];
    const target = this.boating
      ? FISHERMEN.find(
          (p) => !this.s.rescued.includes(p.id) && !this.aboard.includes(p.id),
        ) || DOCKS[0]
      : null;
    this.hud.innerHTML = `<small>KARANG TIRTA · ${g.state.isNight ? "RONDA PESISIR" : d.time < 900 ? "PELELANGAN PAGI" : "SORE DI DERMAGA"}</small><strong>${title}</strong><span>${this.boating ? `${this.s.boatOwned ? "Perahu milikmu" : "Perahu pinjaman"} · Penumpang ${this.aboard.length}/2 · WASD / joystick · E sandar / tolong` : `Mercusuar ${this.s.lighthouse ? "menyala" : this.s.parts.length + "/3"} · Nelayan ${this.s.rescued.length}/2 · Buto Ijo ${this.s.butoDefeated ? "teratasi" : "muncul malam"}`}</span>${target ? `<span>Tujuan: ${target.name} (${target.x}, ${target.z}) · ${Math.round(distance(d, target))} m</span>` : ""}<nav>${this.boating ? button("interact", "Tolong / Sandar · E") + button("coast-return", "Kembali darurat") : button("coast-next", "Tandai tujuan quest")}</nav>`;
  }
}
