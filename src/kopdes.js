import * as THREE from "three";
import { MOUNTS, WEAPONS, RESOURCE_NAMES } from "./data.js";
import { SHOP_ITEMS, FRONTIER_NPCS } from "./frontier-data.js";
import { trade, itemBag } from "./frontier-rules.js";
import { frontierPanel, frontierButton as btn } from "./frontier.js";
import {
  box,
  orb,
  cylinder,
  sign,
  makeWeapon,
  makeHuman,
  animateHuman,
} from "./models.js";
import { makeMount } from "./expansion-models.js";
import { animateFarmAsset } from "./farm-assets.js";
import { distance } from "./state.js";
import { FISH } from "./fishing-data.js";
import { makeFish } from "./fishing-models.js";
import "./kopdes.css";

export const KOPDES_DOOR = { x: 74, z: -16 };
const transactions = new Set([
  "buy-mount",
  "frontier-buy",
  "frontier-sell",
  "craft",
  "upgrade",
]);
const menus = new Set([
  "close",
  "inventory",
  "bestiary",
  "journal",
  "map",
  "camp",
  "camp-tab",
  "settings",
  "help",
  "sound",
  "quality",
  "save",
  "reset-prompt",
  "reset-confirm",
  "equip-mount",
  "equip-weapon",
  "equip-ghost",
  "frontier-waypoint",
]);
export const resourcePrice = (cost) =>
  Object.entries(cost || {})
    .map(([id, n]) => `${n} ${RESOURCE_NAMES[id] || id}`)
    .join(" · ");
export function storeCatalog() {
  return [
    ...MOUNTS.map((def) => ({ key: `mount:${def.id}`, type: "mount", def })),
    ...SHOP_ITEMS.map((def) => ({ key: `item:${def.id}`, type: "item", def })),
    ...WEAPONS.map((def) => ({ key: `weapon:${def.id}`, type: "weapon", def })),
    {
      key: "bottle",
      type: "craft",
      def: {
        id: "bottle",
        name: "Racik 3 Botol Segel",
        cost: { glass: 2, herb: 1, coins: 15 },
        desc: "Racikan Bu Ratih memakai bahan di dalam tas.",
      },
    },
  ].filter((entry) => !entry.def.questOnly);
}
export const displayPrice = (entry) =>
  entry.def.questOnly
    ? "HADIAH QUEST"
    : entry.type === "mount"
      ? `${entry.def.cost} KOIN`
      : entry.type === "item"
        ? entry.def.buy
          ? `${entry.def.buy} KOIN`
          : `JUAL ${entry.def.sell} KOIN`
        : resourcePrice(entry.def.cost) || "PERLENGKAPAN AWAL";

export class Kopdes {
  constructor(g) {
    this.g = g;
    this.active = false;
    this.entries = [];
    this.colliders = [];
    this.people = [];
    this.selected = null;
  }
  build() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#272d28");
    this.camera = new THREE.PerspectiveCamera(65, 1, 0.08, 120);
    this.position = new THREE.Vector3(0, 0, 23);
    this.scene.add(new THREE.HemisphereLight("#fff2db", "#708078", 2.5));
    const sun = new THREE.DirectionalLight("#fff3d5", 3);
    sun.position.set(5, 14, 10);
    this.scene.add(sun);
    const room = this.scene;
    box(room, 48, 0.3, 54, "#a59b7f", 0, -0.15, 0);
    box(room, 48, 8, 0.35, "#63755f", 0, 4, -27);
    box(room, 0.35, 8, 54, "#89967e", -24, 4, 0);
    box(room, 0.35, 8, 54, "#89967e", 24, 4, 0);
    for (const side of [-1, 1])
      box(room, 20, 8, 0.35, "#d2c8a8", side * 14, 4, 27);
    for (let z = -24; z <= 24; z += 6)
      box(room, 48, 0.02, 0.045, "#7f7d68", 0, 0.012, z);
    for (let x = -24; x <= 24; x += 6)
      box(room, 0.045, 0.02, 54, "#7f7d68", x, 0.012, 0);
    for (let z = -20; z <= 20; z += 10) {
      box(room, 48, 0.35, 0.3, "#4b5545", 0, 7, z);
      for (const x of [-15, 0, 15])
        box(room, 3, 0.08, 0.7, "#fff0c4", x, 6.7, z, {
          emissive: "#ffe8b1",
          emissiveIntensity: 0.8,
        });
    }
    sign(room, "KOPDES MERAH PUTIH", 17, 1.2).position.set(0, 5.2, -26.7);
    sign(room, "TUNGGANGAN  |  BEKAL  |  PUSAKA", 18, 0.7).position.set(
      0,
      4,
      -26.6,
    );
    sign(room, "KELUAR KE DESA", 6, 0.7).position.set(0, 3, 26.7);
    this.entries = storeCatalog();
    const mounts = this.entries.filter((e) => e.type === "mount");
    mounts.forEach((e, i) => {
      const x = i % 2 ? 18 : -18,
        z = 19 - Math.floor(i / 2) * 8;
      e.x = x;
      e.z = z;
      e.radius = 4.5;
      box(room, 7, 0.28, 5.5, "#536c60", x, 0.14, z);
      this.colliders.push({ x, z, w: 3.6, d: 2.8 });
      const holder = new THREE.Group();
      holder.position.set(x, 0.3, z);
      room.add(holder);
      e.model = makeMount(e.def, {});
      holder.add(e.model);
      const fit = () => {
        e.model.scale.setScalar(1);
        e.model.position.y = 0;
        e.model.updateWorldMatrix(true, true);
        const b = new THREE.Box3().setFromObject(e.model),
          s = b.getSize(new THREE.Vector3());
        const scale = Math.min(
          1,
          5 / Math.max(0.1, s.x),
          4.5 / Math.max(0.1, s.y),
          4 / Math.max(0.1, s.z),
        );
        e.model.scale.setScalar(scale);
        e.model.position.y = -(b.min.y - holder.position.y) * scale;
      };
      fit();
      if (e.model.userData.ready) e.model.userData.ready.then(fit);
      const label = sign(room, e.def.name.toUpperCase(), 6, 0.65);
      label.position.set(x, 1.2, z + 3.1);
      const price = sign(room, displayPrice(e), 5, 0.55, "#f0dfad", "#24392e");
      price.position.set(x, 0.6, z + 3.15);
      e.priceTag = price;
    });
    const goods = this.entries.filter((e) => e.type !== "mount");
    goods.forEach((e, i) => {
      const x = [-9, -3, 3, 9][i % 4],
        z = 17 - Math.floor(i / 4) * 5;
      e.x = x;
      e.z = z;
      e.radius = 2.9;
      box(room, 3.6, 1, 1.7, "#796a51", x, 0.5, z);
      box(room, 3.8, 0.12, 1.9, "#d3bc8c", x, 1.05, z);
      this.colliders.push({ x, z, w: 1.9, d: 1 });
      const model = new THREE.Group();
      model.position.set(x, 1.15, z);
      room.add(model);
      e.model = model;
      if (e.type === "weapon") {
        const w = makeWeapon(e.def.id);
        w.scale.setScalar(0.9);
        w.rotation.z = -0.55;
        model.add(w);
      } else if (e.def.id.includes("rod")) {
        cylinder(model, 0.035, 0.05, 1.7, "#ad9463", 0, 0.9, 0);
        orb(model, 0.13, "#525d56", 0, 0.3, 0.1);
      } else if (["bottles", "essence", "bottle"].includes(e.def.id)) {
        cylinder(
          model,
          0.2,
          0.2,
          0.55,
          e.def.id === "essence" ? "#a992cb" : "#97c5b4",
          0,
          0.3,
          0,
        );
        cylinder(model, 0.08, 0.08, 0.2, "#d9cc97", 0, 0.65, 0);
      } else if (e.def.id === "capsules") {
        orb(model, 0.3, "#d9dfce", 0, 0.35, 0);
        box(model, 0.5, 0.1, 0.5, "#598da1", 0, 0.35, 0);
      } else if (FISH.some((f) => f.id === e.def.id)) {
        const fish = makeFish(
          FISH.find((f) => f.id === e.def.id),
          60,
        );
        fish.position.y = 0.35;
        model.add(fish);
        box(model, 1.7, 0.08, 0.8, "#8da6a6", 0, 0.02, 0);
      } else if (["corn", "wheat", "herb"].includes(e.def.id)) {
        for (let j = 0; j < 5; j++) {
          const x = (j - 2) * 0.19;
          const stem = cylinder(
            model,
            0.025,
            0.035,
            0.65,
            "#8e9a5b",
            x,
            0.33,
            0,
          );
          stem.rotation.z = (j - 2) * 0.12;
          const top = orb(
            model,
            e.def.id === "herb" ? 0.16 : 0.12,
            e.def.id === "herb" ? "#7c9b5b" : "#d9b65c",
            x,
            0.65,
            0,
          );
          top.scale.y = e.def.id === "corn" ? 2.3 : 1.2;
        }
      } else if (["glass", "crystal"].includes(e.def.id)) {
        for (let j = 0; j < 3; j++) {
          const gem = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.22),
            new THREE.MeshStandardMaterial({
              color: e.def.id === "crystal" ? "#94b1de" : "#aad8ce",
              metalness: 0.25,
              roughness: 0.2,
            }),
          );
          gem.position.set((j - 1) * 0.4, 0.25, 0);
          gem.scale.y = 1.6;
          model.add(gem);
        }
      } else if (e.def.id === "iron") {
        for (let j = 0; j < 3; j++)
          box(model, 0.6, 0.2, 0.3, "#899394", (j - 1) * 0.5, 0.13, 0, {
            metalness: 0.6,
            roughness: 0.3,
          });
      } else {
        for (let j = 0; j < 3; j++) {
          const p = box(
            model,
            0.45,
            0.4,
            0.55,
            ["#cfb477", "#8ea768", "#a9b6a7"][j],
            (j - 1) * 0.5,
            0.25,
            0,
          );
          p.rotation.y = j * 0.15;
        }
      }
      sign(room, e.def.name.toUpperCase(), 3.8, 0.4).position.set(
        x,
        0.82,
        z + 1.01,
      );
      e.priceTag = sign(room, displayPrice(e), 3.8, 0.35, "#f0dfad", "#24392e");
      e.priceTag.position.set(x, 0.36, z + 1.02);
    });
    const counter = {
      key: "counter",
      type: "counter",
      def: { name: "Bu Ratih · Kasir & Bengkel" },
      x: 0,
      z: -24,
      radius: 4,
    };
    this.entries.push(counter);
    box(room, 10, 1.2, 2, "#6c725b", 0, 0.6, -24);
    this.colliders.push({ x: 0, z: -24, w: 5, d: 1 });
    sign(room, "BU RATIH · JUAL HASIL ALAM & UPGRADE", 10, 0.65).position.set(
      0,
      2.6,
      -25.8,
    );
    this.cashier = makeHuman("#bd906c");
    this.cashier.position.set(0, 0, -25.7);
    room.add(this.cashier);
    for (let i = 0; i < 3; i++) {
      const m = makeHuman(["#89986d", "#6f939b", "#bdab76"][i]);
      room.add(m);
      this.people.push({
        model: m,
        lane: i === 0 ? 0 : i === 1 ? -12 : 12,
        phase: i * 2.3,
      });
    }
    this.hud = document.createElement("div");
    this.hud.id = "kopdes-hud";
    document.querySelector("#hud").append(this.hud);
  }
  enter() {
    const g = this.g;
    if (
      !g.started ||
      distance(g.state.data, KOPDES_DOOR) > 6 ||
      g.altitude > 3 ||
      g.spirit.active ||
      g.magic.active ||
      g.expeditions.active ||
      g.sports.active
    )
      return false;
    if (!this.scene) this.build();
    this.returnCamera = {
      yaw: g.cameraYaw,
      pitch: g.cameraPitch,
      distance: g.cameraDistance,
    };
    g.tractor?.release?.();
    g.frontier.cancelFishing();
    g.state.data.riding = false;
    g.altitude = 0;
    g.flightInput = 0;
    g.state.data.x = KOPDES_DOOR.x;
    g.state.data.z = KOPDES_DOOR.z;
    g.state.save();
    this.position.set(0, 0, 23);
    g.cameraYaw = 0;
    g.cameraPitch = 0;
    g.ui.close();
    g.keys.clear();
    g.ui.joystick?.reset();
    g.lockedTarget = null;
    g.audio.farm.stop();
    this.active = true;
    document.body.classList.add("inside-kopdes");
    this.hud.hidden = false;
    this.updateHud();
    g.audio.play("collect");
    g.ui.toast(
      "Selamat datang! Dekati pajangan lalu E untuk melihat harga dan membeli. Bu Ratih menerima hasil alam di kasir.",
    );
    return true;
  }
  leave() {
    if (!this.active) return;
    const g = this.g;
    this.active = false;
    this.selected = null;
    g.ui.close();
    g.keys.clear();
    g.ui.joystick?.reset();
    g.cameraYaw = this.returnCamera.yaw;
    g.cameraPitch = this.returnCamera.pitch;
    g.cameraDistance = this.returnCamera.distance;
    document.body.classList.remove("inside-kopdes");
    this.hud.hidden = true;
    g.state.data.riding = false;
    g.state.data.x = 74;
    g.state.data.z = -14;
    g.player.position.set(74, 0, -14);
    g.state.save();
    g.ui.update(0.2);
  }
  canWalk(x, z) {
    return (
      Math.abs(x) < 23.4 &&
      z > -26 &&
      z < 26.5 &&
      !this.colliders.some(
        (c) => Math.abs(x - c.x) < c.w + 0.35 && Math.abs(z - c.z) < c.d + 0.35,
      )
    );
  }
  move(x, z, dt) {
    const len = Math.max(1, Math.hypot(x, z)),
      dx = (x / len) * dt * 4.6,
      dz = (z / len) * dt * 4.6,
      steps = Math.max(
        1,
        Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.15),
      );
    for (let i = 0; i < steps; i++) {
      if (this.canWalk(this.position.x + dx / steps, this.position.z))
        this.position.x += dx / steps;
      if (this.canWalk(this.position.x, this.position.z + dz / steps))
        this.position.z += dz / steps;
    }
  }
  nearby() {
    const yaw = this.g.cameraYaw;
    return this.entries
      .filter((e) => {
        const dx = e.x - this.position.x,
          dz = e.z - this.position.z,
          dist = Math.hypot(dx, dz);
        return (
          dist < e.radius &&
          (-dx * Math.sin(yaw) - dz * Math.cos(yaw)) / Math.max(0.01, dist) >
            0.35
        );
      })
      .sort(
        (a, b) => distance(this.position, a) - distance(this.position, b),
      )[0];
  }
  inspect() {
    if (this.g.ui.panel) return;
    if (this.position.z > 24 && Math.abs(this.position.x) < 4) {
      this.leave();
      return;
    }
    const e = this.nearby();
    if (!e) {
      this.g.ui.toast("Dekati label harga pada pajangan atau meja kasir.");
      return;
    }
    this.selected = e;
    this.show(e);
  }
  show(e) {
    const g = this.g,
      d = g.state.data,
      def = e.def;
    let html = `<p>${def.desc || "Bu Ratih siap melayani."}</p><p><b>${displayPrice(e)}</b> · Dompet: ${d.coins} koin</p>`;
    if (e.type === "counter") {
      html = `<p>Bu Ratih: “Hasil kebun dan ikanmu kami tampung. Silakan pilih barang dari tas untuk dijual.”</p><b>Dompet: ${d.coins} koin</b><div class="frontier-shop">${SHOP_ITEMS.filter(
        (i) => i.sell,
      )
        .map(
          (i) =>
            `<article><div><h3>${i.name}</h3><small>Tas: ${itemBag(d, i)[i.id] || 0}</small></div><div>${btn("frontier-sell", `Jual · ${i.sell} koin`, `data-id="${i.id}" ${(itemBag(d, i)[i.id] || 0) < 1 ? "disabled" : ""}`)}${btn("frontier-sell", "Jual 5", `data-id="${i.id}" data-qty="5" ${(itemBag(d, i)[i.id] || 0) < 5 ? "disabled" : ""}`)}</div></article>`,
        )
        .join(
          "",
        )}</div><h3>Pelatihan & perlindungan</h3>${["health", "strength", "stamina", "ward"].map((key, i) => btn("upgrade", `${["Raga", "Serangan", "Stamina", "Pagar batin"][i]} Lv.${d.upgrades[key]} · ${90 + d.upgrades[key] * 70} koin`, `data-id="${key}" ${d.upgrades[key] >= 5 ? "disabled" : ""}`)).join(" ")}`;
    } else if (e.type === "mount")
      html += d.mounts.includes(def.id)
        ? btn("equip-mount", "Gunakan", `data-id="${def.id}"`)
        : def.questOnly
          ? `<p>Hadiah quest ${def.questNpc || "warga"}. Pajangan ini tidak dijual.</p>`
          : btn(
              "buy-mount",
              `Beli · ${def.cost} koin`,
              `data-id="${def.id}" ${d.coins < def.cost ? "disabled" : ""}`,
            );
    else if (e.type === "item")
      html += `${def.buy ? btn("frontier-buy", `Beli · ${def.buy} koin`, `data-id="${def.id}" ${d.coins < def.buy ? "disabled" : ""}`) : ""}${def.sell ? btn("frontier-sell", `Jual · ${def.sell} koin`, `data-id="${def.id}" ${(itemBag(d, def)[def.id] || 0) < 1 ? "disabled" : ""}`) : ""}`;
    else
      html += d.weapons.includes(def.id)
        ? btn("equip-weapon", "Gunakan", `data-id="${def.id}"`)
        : def.questOnly
          ? `<p>Hadiah quest ${def.questNpc || "warga"}.</p>`
          : btn(
              "craft",
              "Pesan racikan / tempa",
              `data-id="${def.id}" ${g.state.afford(def.cost) ? "" : "disabled"}`,
            );
    frontierPanel(
      g,
      def.name,
      html +
        `<div style="margin-top:18px">${btn("close", "Lanjut melihat toko")}</div>`,
    );
  }
  transact(action, args) {
    const e = this.selected,
      g = this.g;
    if (
      !this.active ||
      g.ui.panel !== "dialogue" ||
      !e ||
      distance(this.position, e) >= e.radius
    )
      return false;
    let ok = false;
    if (
      action === "buy-mount" &&
      e.type === "mount" &&
      e.def.id === args.id &&
      !g.state.data.mounts.includes(args.id)
    ) {
      ok = g.state.buyMount(args.id);
      if (ok) g.equipMount();
    }
    if (
      action === "craft" &&
      ["weapon", "craft"].includes(e.type) &&
      e.def.id === args.id
    ) {
      ok = g.state.craft(args.id);
      if (ok) g.equipWeapon();
    }
    if (action === "upgrade" && e.type === "counter")
      ok = g.state.upgrade(args.id);
    if (
      action.startsWith("frontier-") &&
      ((e.type === "item" && e.def.id === args.id) ||
        (e.type === "counter" && action === "frontier-sell"))
    )
      ok = trade(
        g.state.data,
        args.id,
        action === "frontier-buy" ? "buy" : "sell",
        Number(args.qty || 1),
      );
    if (ok) {
      g.state.save();
      g.audio.play("collect");
      g.ui.toast("Terima kasih! Transaksi selesai.", "success");
    } else
      g.ui.toast(
        "Transaksi belum bisa dilakukan. Periksa koin, barang, atau syaratnya.",
        "error",
      );
    this.show(e);
    this.updateHud();
    return ok;
  }
  action(action, args = {}) {
    if (transactions.has(action)) {
      if (this.active) this.transact(action, args);
      else
        this.g.ui.toast(
          "Pembelian dan pemesanan tersedia di dalam Kopdes. Dekati pintu toko lalu tekan E.",
        );
      return true;
    }
    if (action === "kopdes-exit") {
      this.leave();
      return true;
    }
    if (!this.active) return false;
    if (action === "interact" || action === "kopdes-interact") {
      this.inspect();
      return true;
    }
    if (menus.has(action)) return false;
    return true;
  }
  updateHud() {
    const e = this.nearby(),
      exit = this.position.z > 24 && Math.abs(this.position.x) < 4;
    const html = `<div><strong>KOPDES MERAH PUTIH</strong><small>${this.g.state.data.coins} koin · Seret untuk melihat</small></div>${btn("kopdes-interact", exit ? "Keluar · E" : e ? `${e.def.name} · E` : "Periksa · E")}${btn("kopdes-exit", "Keluar")}`;
    if (this.hud.innerHTML !== html) this.hud.innerHTML = html;
  }
  frame(dt, t) {
    const g = this.g;
    g.audio.ghostVoices.pause(true);
    g.audio.setWeather({}, true);
    g.audio.farm.stop();
    if (!g.ui.panel) {
      const { x, z } = g.movementInput();
      this.move(
        x * Math.cos(g.cameraYaw) + z * Math.sin(g.cameraYaw),
        -x * Math.sin(g.cameraYaw) + z * Math.cos(g.cameraYaw),
        dt,
      );
    }
    this.people.forEach((p) => {
      p.model.position.set(p.lane, 0, Math.sin(t * 0.12 + p.phase) * 18);
      p.model.rotation.y = Math.cos(t * 0.12 + p.phase) > 0 ? 0 : Math.PI;
      animateHuman(p.model, t + p.phase, !g.ui.panel, false);
    });
    animateHuman(this.cashier, t, false, false);
    for (const e of this.entries)
      if (e.model?.userData.farmLoaded)
        animateFarmAsset(e.model, t, false, false);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(this.position.x, 1.9, this.position.z);
    this.camera.lookAt(
      this.position.x - Math.sin(g.cameraYaw) * Math.cos(g.cameraPitch),
      1.9 - Math.sin(g.cameraPitch),
      this.position.z - Math.cos(g.cameraYaw) * Math.cos(g.cameraPitch),
    );
    this.updateHud();
    if (g.ui.toastTimer > 0) {
      g.ui.toastTimer -= dt;
      if (g.ui.toastTimer <= 0)
        document.querySelector("#toast").classList.remove("show");
    }
    g.renderer.render(this.scene, this.camera);
  }
}
