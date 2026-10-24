import * as THREE from "three";
import {
  VEHICLE_QUESTS,
  VEHICLE_MOUNTS,
  OJOL_STAND,
  OJOL_STOPS,
} from "./vehicle-data.js";
import {
  acceptVehicleQuest,
  collectVehiclePoint,
  claimVehicleQuest,
  passengerVehicle,
  startOjol,
  finishOjol,
  ojolFare,
  vehicleCanMove,
  vehicleWater,
} from "./vehicle-rules.js";
import { vehicleSeatWorld } from "./vehicle-assets.js";
import { makeHuman, animateHuman, sign, orb, cylinder, box } from "./models.js";
import { frontierPanel, frontierButton as button } from "./frontier.js";
import { distance } from "./state.js";

export class VehicleActivities {
  constructor(g) {
    this.g = g;
    this.selected = null;
    this.people = [];
    this.points = [];
    this.lastPosition = null;
    for (const q of [
      ...VEHICLE_QUESTS,
      { id: "ojol", npc: "Pak Jali", ...OJOL_STAND },
    ]) {
      const p = g.world.nearestLanding(q.x, q.z),
        model = makeHuman(q.id === "santa" ? "#b84e48" : "#6b9b88");
      model.position.set(p.x, 0, p.z);
      g.scene.add(model);
      const label = sign(
        g.scene,
        q.npc + (q.id === "ojol" ? " · NARIK OJOL" : ""),
        5,
        0.65,
      );
      label.position.set(p.x, 3.3, p.z);
      this.people.push({ id: q.id, def: q, model, ...p });
    }
    for (const q of VEHICLE_QUESTS)
      q.points.forEach(([x, z], index) => {
        const p = q.kind === "ward" ? { x, z } : g.world.nearestLanding(x, z),
          model = new THREE.Group();
        model.position.set(p.x, 0, p.z);
        g.scene.add(model);
        if (q.kind === "bamboo")
          for (let i = 0; i < 4; i++) {
            const stem = cylinder(
              model,
              0.09,
              0.1,
              1.8,
              "#afb979",
              i * 0.14 - 0.2,
              0.8,
              0,
              6,
            );
            stem.rotation.z = 0.3;
          }
        else if (q.kind === "gift") {
          box(model, 0.8, 0.7, 0.7, "#b44e45", 0, 0.6, 0);
          box(model, 0.12, 0.73, 0.73, "#e8c566", 0, 0.6, 0);
        } else {
          orb(
            model,
            q.kind === "ball" ? 0.42 : 0.3,
            q.kind === "ball" ? "#f1b543" : "#80dbc9",
            0,
            1.1,
            0,
            1,
            {
              emissive: q.kind === "ball" ? "#db872c" : "#66bca4",
              emissiveIntensity: 0.6,
            },
          );
          cylinder(model, 0.55, 0.65, 0.16, "#b3aa81", 0, 0.08, 0, 8);
        }
        const name =
          q.kind === "ball"
            ? `BOLA NAGA ${index + 1}`
            : q.kind === "trail"
              ? `LANGKAH ${index + 1}`
              : q.kind === "gift"
                ? `TITIPAN ${index + 1}`
                : q.kind === "bamboo"
                  ? `IKAT BAMBU ${index + 1}`
                  : `PENANDA AIR ${index + 1}`;
        sign(model, name, 3.8, 0.5).position.set(0, 2.3, 0);
        this.points.push({ q, index, model, name, ...p });
      });
    this.passenger = makeHuman("#bca276");
    this.passenger.visible = false;
    g.scene.add(this.passenger);
    this.destination = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.6, 32),
      new THREE.MeshBasicMaterial({
        color: "#d9c179",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.14;
    this.destination.add(ring);
    g.scene.add(this.destination);
    this.update(0, 0);
  }
  get s() {
    return this.g.state.data.vehicles;
  }
  available() {
    return (
      !this.g.kopdes.active &&
      !this.g.magic.active &&
      !this.g.spirit.active &&
      !this.g.expeditions.active &&
      !this.g.sports.active &&
      this.g.altitude < 5
    );
  }
  near(person) {
    return this.available() && distance(this.g.state.data, person) < 5;
  }
  objective(id) {
    const q = VEHICLE_QUESTS.find((q) => q.id === id);
    if (!q) return this.people.find((n) => n.id === "ojol");
    const next = this.points.find(
      (p) => p.q.id === id && !this.s.collected[id]?.includes(p.index),
    );
    return this.s.quests[id] && next
      ? next
      : this.people.find((n) => n.id === id);
  }
  pin(p, name) {
    this.g.waypoint = { x: p.x, z: p.z, name: name || p.name || p.def?.npc };
    this.g.ui.close();
  }
  journal() {
    const s = this.s;
    const job = s.job;
    return `<h3 class="section-label">PERJALANAN SUKARAME</h3><div class="quest-list">${VEHICLE_QUESTS.map((q) => `<div class="journal-quest ${s.claimed.includes(q.id) ? "complete" : ""}"><div><span class="eyebrow">${s.claimed.includes(q.id) ? "SELESAI" : s.quests[q.id] ? "DITERIMA" : "TEMUI " + q.npc.toUpperCase()}</span><h3>${q.title}</h3><p>${q.story}</p><small>Hadiah: ${VEHICLE_MOUNTS.find((m) => m.id === q.mount).name} · ${s.collected[q.id]?.length || 0}/${q.points.length}</small><p>${button("vehicle-waypoint", "Tandai tujuan", `data-id="${q.id}"`)}</p></div></div>`).join("")}</div><h3>Narik Ojol</h3><p>${job ? `${job.phase === "pickup" ? "Jemput" : "Antar"} penumpang di ${this.jobPoint().name} · ${ojolFare(job)} koin` : "Temui Pak Jali di pangkalan dekat Pasar Sore. Gunakan becak, bajaj, bemo, atau oplet."}</p><small>${s.trips} perjalanan · ${s.earnings} koin pendapatan</small><p>${button("vehicle-waypoint", job ? "Tandai order" : "Tandai pangkalan", 'data-id="ojol"')}${job ? button("ojol-cancel", "Batalkan order") : ""}</p>`;
  }
  jobPoint() {
    const j = this.s.job;
    return j
      ? OJOL_STOPS.find((p) => p.id === (j.phase === "pickup" ? j.from : j.to))
      : null;
  }
  showNpc(id) {
    const n = this.people.find((n) => n.id === id);
    if (!n || !this.near(n)) return;
    this.selected = id;
    const q = VEHICLE_QUESTS.find((q) => q.id === id),
      s = this.s;
    if (id === "ojol") {
      frontierPanel(
        this.g,
        "Pak Jali · Narik Ojol",
        `<div class="dialogue-content"><h2>Pangkalan Sukarame</h2><p>Warga perlu tumpangan. Ambil order, jemput dengan becak, bajaj, bemo atau oplet, lalu tekan E di tujuan untuk menerima ongkos. Order tetap tersimpan saat kamu rehat.</p><p>${s.job ? `Order aktif: ${this.jobPoint().name} · ${ojolFare(s.job)} koin` : "Satu order dapat dikerjakan pada satu waktu."}</p>${button(s.job ? "vehicle-waypoint" : "ojol-start", s.job ? "Tandai order" : "Ambil order", 'data-id="ojol"')}${s.job ? button("ojol-cancel", "Batalkan order") : ""}${button("close", "Nanti dulu")}</div>`,
      );
      return;
    }
    const done = s.claimed.includes(id),
      ready = s.collected[id]?.length === q.points.length,
      can = !q.requires || this.g.state.data.mounts.includes(q.requires);
    frontierPanel(
      this.g,
      q.npc,
      `<div class="dialogue-content"><span class="eyebrow">${q.title}</span><h2>${q.npc}</h2><p>${done ? "Terima kasih sudah membantu. Rawat tungganganmu baik-baik." : q.story}</p><p>Hadiah: ${VEHICLE_MOUNTS.find((m) => m.id === q.mount).name}</p><p>${s.collected[id]?.length || 0}/${q.points.length} tujuan selesai.</p>${!can ? "<p>Dapatkan Getek Bambu dari Pak Rakit dahulu.</p>" : ""}${!done && can ? button(!s.quests[id] ? "vehicle-accept" : ready ? "vehicle-claim" : "vehicle-waypoint", !s.quests[id] ? "Saya akan membantu" : ready ? "Serahkan & terima tunggangan" : "Tandai tujuan", `data-id="${id}"`) : ""}${button("close", "Sampai jumpa")}</div>`,
    );
  }
  interactions() {
    if (!this.available()) return [];
    const d = this.g.state.data,
      a = [];
    for (const n of this.people)
      if (distance(d, n) < 4.5)
        a.push({
          type: "vehicle-npc",
          id: n.id,
          dist: distance(d, n),
          label: "Bicara · " + n.def.npc,
        });
    for (const p of this.points)
      if (
        this.s.quests[p.q.id] &&
        !this.s.claimed.includes(p.q.id) &&
        !this.s.collected[p.q.id]?.includes(p.index) &&
        distance(d, p) < 3.4
      )
        a.push({
          type: "vehicle-point",
          id: p.q.id,
          index: p.index,
          dist: distance(d, p) - 0.2,
          label:
            (p.q.kind === "gift"
              ? "Antar "
              : p.q.kind === "ward"
                ? "Pulihkan "
                : p.q.kind === "trail"
                  ? "Lewati "
                  : "Ambil ") + p.name,
        });
    const p = this.jobPoint();
    if (p && distance(d, p) < 5)
      a.push({
        type: "vehicle-job",
        dist: distance(d, p) - 0.4,
        label:
          this.s.job.phase === "pickup"
            ? "Jemput penumpang · Narik Ojol"
            : "Turunkan penumpang · Terima ongkos",
      });
    return a;
  }
  interact(it) {
    if (!it?.type.startsWith("vehicle-")) return false;
    if (!this.available()) return true;
    const g = this.g,
      d = g.state.data;
    if (it.type === "vehicle-npc") {
      this.showNpc(it.id);
      return true;
    }
    if (it.type === "vehicle-point") {
      const p = this.points.find(
        (p) => p.q.id === it.id && p.index === it.index,
      );
      if (!p || distance(d, p) > 3.4) return true;
      if (p.q.kind === "trail" && d.riding) {
        g.ui.toast("Latihan ini harus dilalui dengan berjalan kaki.");
        return true;
      }
      if (p.q.kind === "ward" && (!d.riding || d.mount !== "getek-bambu")) {
        g.ui.toast("Pulihkan penanda sambil menaiki Getek Bambu.");
        return true;
      }
      if (collectVehiclePoint(d, it.id, it.index)) {
        g.audio.play("collect");
        g.ui.toast(
          `${p.name} selesai. ${this.s.collected[it.id].length}/${p.q.points.length}.`,
          "success",
        );
        g.state.save();
        this.pin(this.objective(it.id), p.q.title);
      } else g.ui.toast("Ikuti urutan tanda latihan dari awal.");
      return true;
    }
    if (it.type === "vehicle-job") {
      const p = this.jobPoint();
      if (!p || distance(d, p) > 5) return true;
      if (
        !d.riding ||
        !passengerVehicle(d.mount) ||
        !g.bike.userData.passengerSeat
      ) {
        g.ui.toast(
          "Gunakan becak, bajaj, bemo, atau oplet untuk menjemput dan mengantar.",
        );
        return true;
      }
      g.bike.userData.doorUntil = g.elapsed + 2;
      if (this.s.job.phase === "pickup") {
        this.s.job.phase = "dropoff";
        g.ui.toast(`Penumpang naik. Antar ke ${this.jobPoint().name}.`);
        this.pin(this.jobPoint());
      } else {
        const pay = finishOjol(d);
        g.ui.toast(
          `Penumpang tiba! +${pay} koin. Kembali ke Pak Jali untuk order berikutnya.`,
          "success",
        );
        g.audio.play("collect");
        g.waypoint = null;
      }
      g.state.save();
      this.update(0, g.elapsed);
      return true;
    }
    return true;
  }
  action(action, args = {}) {
    if (
      ![
        "vehicle-waypoint",
        "vehicle-accept",
        "vehicle-claim",
        "ojol-start",
        "ojol-cancel",
      ].includes(action)
    )
      return false;
    const g = this.g,
      d = g.state.data;
    if (action === "vehicle-waypoint") {
      const p =
        args.id === "ojol" && this.s.job
          ? this.jobPoint()
          : this.objective(args.id);
      if (p) this.pin(p);
      return true;
    }
    if (action === "ojol-cancel") {
      this.s.job = null;
      g.waypoint = null;
      g.ui.close();
      g.state.save();
      this.update(0, g.elapsed);
      return true;
    }
    const id = action === "ojol-start" ? "ojol" : args.id,
      n = this.people.find((n) => n.id === id);
    if (
      !n ||
      !this.near(n) ||
      this.selected !== id ||
      g.ui.panel !== "dialogue"
    )
      return true;
    let ok = false;
    if (action === "ojol-start") {
      if (!d.mounts.some(passengerVehicle)) {
        g.ui.toast("Beli becak, bajaj, bemo, atau oplet di Kopdes dahulu.");
        return true;
      }
      ok = startOjol(this.s);
      if (ok) this.pin(this.jobPoint());
    }
    if (action === "vehicle-accept") {
      ok = acceptVehicleQuest(d, id);
      if (ok) this.pin(this.objective(id));
    }
    if (action === "vehicle-claim") {
      ok = claimVehicleQuest(d, id);
      if (ok) {
        g.audio.play("capture");
        g.ui.toast(
          `${VEHICLE_MOUNTS.find((m) => m.id === n.def.mount).name} diperoleh! Pilih di koleksi tunggangan.`,
          "success",
        );
        g.ui.close();
      }
    }
    if (ok) g.state.save();
    return true;
  }
  launchGetek() {
    const g = this.g,
      d = g.state.data;
    if (vehicleWater(d.x, d.z)) return true;
    const options = [];
    if (d.x > 132 && d.x < 178 && d.z > -278 && d.z < 285)
      options.push({ x: 155, z: d.z });
    if (distance(d, { x: 84, z: 330 }) < 12) options.push({ x: 94, z: 336 });
    if (distance(d, { x: 163, z: 420 }) < 12) options.push({ x: 151, z: 427 });
    const p = options.find((p) =>
      vehicleCanMove(g.world, "getek-bambu", p.x, p.z),
    );
    if (!p) {
      g.ui.toast(
        "Bawa getek ke tepi sungai atau ujung dermaga Karang Tirta dahulu.",
      );
      return false;
    }
    Object.assign(d, p);
    return true;
  }
  update(dt, t) {
    const g = this.g,
      d = g.state.data;
    for (const n of this.people) {
      n.model.visible = true;
      animateHuman(n.model, t, false, false);
    }
    for (const p of this.points)
      p.model.visible =
        !!this.s.quests[p.q.id] &&
        !this.s.claimed.includes(p.q.id) &&
        !this.s.collected[p.q.id]?.includes(p.index);
    const job = this.s.job,
      p = this.jobPoint();
    this.destination.visible = !!job;
    this.passenger.visible = !!job;
    if (!job) return;
    this.destination.position.set(p.x, g.world.groundHeight(p.x, p.z), p.z);
    if (job.phase === "pickup") {
      this.passenger.position.set(p.x + 2, 0, p.z);
      animateHuman(this.passenger, t, false, false);
    } else if (
      d.riding &&
      passengerVehicle(d.mount) &&
      g.bike.userData.passengerSeat
    ) {
      const seat = vehicleSeatWorld(g.bike, true);
      if (seat) {
        this.passenger.position.copy(seat);
        g.bike.userData.passengerSeat.getWorldQuaternion(
          this.passenger.quaternion,
        );
      }
      animateHuman(this.passenger, t, false, true);
    } else {
      const spot = g.world.nearestLanding(d.x + 2, d.z + 2);
      this.passenger.position.set(spot.x, 0, spot.z);
      animateHuman(this.passenger, t, false, false);
    }
  }
}
