import * as THREE from "three";
import {
  box,
  orb,
  cylinder,
  mesh,
  sign,
  makeHuman,
  animateHuman,
} from "./models.js";
import { makeResident } from "./expansion-models.js";
import { makeRocket } from "./frontier-models.js";
import { STORAGE_ITEMS } from "./frontier-data.js";
import { transferStorage, itemBag } from "./frontier-rules.js";
import { frontierButton, frontierPanel } from "./frontier.js";
export const SPACE_DESTINATIONS = [
  {
    id: "moon",
    name: "Bulan Sukarame",
    x: -95,
    y: 0,
    z: -95,
    r: 19,
    color: "#a2b6bc",
    reward: 3,
  },
  {
    id: "ares",
    name: "Ares Merah",
    x: 110,
    y: 25,
    z: -125,
    r: 24,
    color: "#c27958",
    reward: 4,
  },
  {
    id: "nebula",
    name: "Nebula Kliwon",
    x: 5,
    y: -20,
    z: -255,
    r: 28,
    color: "#8d85b6",
    reward: 6,
  },
];
const FAMILY = [
  {
    id: "yuli",
    name: "Yuli",
    role: "Istri Pak Hansip",
    x: -2,
    z: -1,
    color: "#b59098",
    lines: [
      "Sudah pulang, Mas? Ikan hasil pancing bisa disimpan di peti. Uang tabungan di sana aman saat kamu jatuh dalam ronda.",
      "Aqila tadi menggambar roket, Azkia menggambar kuda putih. Ceritakan perjalananmu setelah istirahat, ya.",
      "Desa berubah begitu cepat. Aku bangga kamu masih meluangkan waktu untuk keluarga.",
    ],
  },
  {
    id: "aqila",
    name: "Aqila",
    role: "Anak Pak Hansip",
    x: 3,
    z: 1,
    color: "#91b9c4",
    outfit: "child",
    lines: [
      "Ayah! Kalau naik roket, apa Bulan juga punya pos ronda? Aku ingin dengar ceritanya!",
      "Aku gambar Brontosaurus tinggi sekali. Ayah sudah melihatnya di dekat ladang?",
      "Aku bantu Ibu merapikan meja. Pulangnya jangan terlalu malam, ya!",
    ],
  },
  {
    id: "azkia",
    name: "Azkia",
    role: "Anak Pak Hansip",
    x: 5,
    z: -1,
    color: "#c3af81",
    outfit: "child",
    lines: [
      "Ayah, kuda Sembrani sayapnya empuk tidak? Aku ingin memberinya nama Awan!",
      "Aku mau lihat ikan warna emas dari sungai. Bawa pulang satu, ya!",
      "Kalau ada suara dari luar, aku sudah tahu harus tetap bersama Ibu.",
    ],
  },
];
export class Expeditions {
  constructor(g) {
    this.g = g;
    this.active = null;
    this.talks = {};
    this.hud = document.createElement("section");
    this.hud.id = "expedition-hud";
    this.hud.className = "hidden";
    document.querySelector("#hud").append(this.hud);
    this.buildHome();
    this.buildSpace();
  }
  litScene(color) {
    const s = new THREE.Scene();
    s.background = new THREE.Color(color);
    s.add(new THREE.HemisphereLight("#dceaf2", "#6c594c", 1.8));
    const sun = new THREE.DirectionalLight("#fff0d2", 1.7);
    sun.position.set(8, 20, 12);
    s.add(sun);
    return s;
  }
  buildHome() {
    const s = (this.home = this.litScene("#293c3f"));
    this.furniture = [];
    const solid = (w, h, d, c, x, y, z) => {
      box(s, w, h, d, c, x, y, z);
      this.furniture.push({ x, z, w: w / 2 + 0.35, d: d / 2 + 0.35 });
    };
    box(s, 18, 0.3, 14, "#bea98b", 0, -0.15, 0);
    for (let x = -8; x <= 8; x += 2)
      for (let z = -6; z <= 6; z += 2)
        box(
          s,
          1.93,
          0.02,
          1.93,
          (x + z) % 4 ? "#c1b294" : "#d6c6a6",
          x,
          0.015,
          z,
        );
    box(s, 18, 4, 0.25, "#d2c8ae", 0, 2, -7);
    box(s, 0.25, 4, 14, "#afbfae", -9, 2, 0);
    box(s, 0.25, 1, 14, "#a8b7a3", 9, 0.5, 0);
    for (const x of [-4, 3]) {
      box(s, 2.8, 1.7, 0.12, "#658d9e", x, 2.5, -6.8);
      box(s, 0.1, 1.8, 0.15, "#e3d8bb", x, 2.5, -6.69);
      box(s, 2.9, 0.1, 0.15, "#e3d8bb", x, 2.5, -6.68);
    }
    solid(3.7, 0.65, 2.1, "#687f75", -4, 0.45, 1);
    box(s, 3.7, 0.8, 0.4, "#7c9185", -4, 1, 0);
    for (const x of [-5.3, -2.7]) box(s, 0.45, 0.8, 2.1, "#829789", x, 0.9, 1);
    solid(2.4, 0.6, 1.1, "#8d7253", -3, 0.4, 3.5);
    cylinder(s, 0.35, 0.35, 0.08, "#d8d6bd", -3, 0.78, 3.5, 16);
    orb(s, 0.13, "#b59257", -3, 0.94, 3.5, 1);
    solid(2.7, 0.9, 0.6, "#786b56", -7, 0.5, 3.5);
    box(s, 2.1, 1.4, 0.16, "#273f47", -7, 1.9, 3.5);
    box(s, 1.9, 1.15, 0.18, "#598a9f", -7, 1.92, 3.59, {
      emissive: "#467996",
      emissiveIntensity: 0.3,
    });
    solid(3.2, 0.65, 3.8, "#82735b", 5, 0.4, -4.5);
    box(s, 3.05, 0.3, 3.65, "#e3daca", 5, 0.88, -4.5);
    box(s, 3, 0.13, 2.6, "#809fa0", 5, 1.07, -3.9);
    for (const x of [4.25, 5.75])
      box(s, 1.2, 0.28, 0.7, "#f0e9d6", x, 1.15, -5.8);
    solid(1.5, 3, 1, "#8e8065", 8, 1.5, -5.6);
    box(s, 0.8, 1.8, 0.05, "#a6c1c3", 8, 1.6, -5.05);
    solid(4, 1.25, 0.9, "#9b9e86", -5, 0.65, -6.15);
    box(s, 4.2, 0.1, 1, "#c9c6ae", -5, 1.31, -6.15);
    for (const x of [-5.7, -4.5])
      cylinder(s, 0.26, 0.26, 0.04, "#455650", x, 1.4, -6.15, 16);
    solid(1.35, 2.6, 1.2, "#c4d3c8", -7.5, 1.3, -6);
    solid(1.8, 1.3, 1.1, "#9d8056", -7.5, 0.7, -2.5);
    box(s, 1.95, 0.16, 1.2, "#bca26c", -7.5, 1.42, -2.5);
    sign(s, "PENYIMPANAN", 2.8, 0.45).position.set(-7.5, 2.3, -2.5);
    sign(s, "RUMAH ADALAH TEMPAT PULANG", 7, 0.8).position.set(0, 3.8, -6.76);
    box(s, 2.4, 0.02, 1.2, "#747c61", 0, 0.04, 6.1);
    const lamp = new THREE.PointLight("#ffc988", 20, 16, 1);
    lamp.position.set(0, 3.8, 0);
    s.add(lamp);
    orb(s, 0.32, "#fff2b2", 0, 4, 0, 1, {
      emissive: "#ffc77d",
      emissiveIntensity: 1,
    });
    this.family = FAMILY.map((def) => {
      const model = makeResident(def),
        torso = model.userData.torso;
      torso.children
        .find((o) => o.isMesh && Math.abs(o.position.y - 2.64) < 0.01)
        ?.removeFromParent();
      orb(
        torso,
        0.34,
        def.id === "yuli" ? "#433931" : "#514338",
        0,
        2.49,
        -0.07,
        1,
      ).scale.set(1, 0.75, 1);
      if (def.id === "yuli") {
        cylinder(model, 0.4, 0.58, 1.35, "#b48e96", 0, 0.85, 0, 12);
        orb(torso, 0.23, "#433931", 0, 2.32, -0.36, 1);
      } else
        for (const side of [-1, 1])
          orb(torso, 0.14, "#514338", side * 0.32, 2.35, -0.1, 1);
      const label = sign(
        s,
        def.name.toUpperCase(),
        1.8,
        0.35,
        "#375052",
        "#eee5c7",
      );
      label.position.set(def.x, def.outfit === "child" ? 2.25 : 3.2, def.z);
      model.position.set(def.x, 0, def.z);
      s.add(model);
      return { def, model };
    });
    this.avatar = makeHuman("#647b5a");
    s.add(this.avatar);
  }
  buildSpace() {
    const s = (this.space = new THREE.Scene());
    s.background = new THREE.Color("#030915");
    s.add(new THREE.AmbientLight("#adcfff", 2.2));
    const light = new THREE.DirectionalLight("#d5e5ff", 4);
    light.position.set(-70, 100, 80);
    s.add(light);
    const positions = [];
    for (let i = 0; i < 1600; i++) {
      const u = Math.sin(i * 127.1) * 43758.54,
        v = Math.sin(i * 311.7) * 17328.8,
        a = (u - Math.floor(u)) * Math.PI * 2,
        y = (v - Math.floor(v)) * 2 - 1,
        r = 460;
      positions.push(
        Math.cos(a) * Math.sqrt(1 - y * y) * r,
        y * r,
        Math.sin(a) * Math.sqrt(1 - y * y) * r,
      );
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    s.add(
      new THREE.Points(
        geom,
        new THREE.PointsMaterial({
          color: "#d5e8fc",
          size: 1.3,
          sizeAttenuation: true,
        }),
      ),
    );
    this.planets = [];
    for (const d of SPACE_DESTINATIONS) {
      const planet = orb(s, d.r, d.color, d.x, d.y, d.z, 3, {
        roughness: 0.85,
      });
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4;
        orb(
          planet,
          d.r * 0.1,
          "#697586",
          Math.cos(a) * d.r * 0.88,
          Math.sin(a) * d.r * 0.45,
          Math.sin(a * 0.7) * d.r * 0.8,
          1,
        );
      }
      const ring = mesh(
        s,
        new THREE.TorusGeometry(d.r + 3, 0.08, 6, 90),
        new THREE.MeshBasicMaterial({ color: d.color }),
        d.x,
        d.y,
        d.z,
      );
      ring.rotation.x = 0.7;
      this.planets.push({ def: d, planet, ring });
    }
    for (let i = 0; i < 45; i++) {
      const a = i * 2.4;
      orb(
        s,
        1.2 + (i % 4) * 0.5,
        "#626b7c",
        Math.sin(a) * 180,
        Math.cos(i) * 36,
        Math.cos(a) * 130 - 80,
        0,
      );
    }
    const earth = orb(s, 60, "#1e759b", 0, -120, 90, 4);
    for (let i = 0; i < 14; i++)
      orb(
        earth,
        14,
        "#668970",
        Math.sin(i) * 44,
        Math.cos(i * 2) * 45,
        Math.cos(i) * 36,
        1,
      );
    this.ship = makeRocket();
    this.ship.scale.setScalar(0.24);
    this.ship.rotation.x = -Math.PI / 2;
    s.add(this.ship);
    sign(s, "GERBANG SUKARAME", 22, 3).position.set(0, 0, 40);
  }
  enter(kind) {
    const g = this.g;
    if (this.active || g.sports.active) return false;
    if (kind === "space" && !g.state.data.frontier.spaceUnlocked) {
      g.ui.toast("Selesaikan misi Mas Elon untuk mendapatkan izin roket.");
      return false;
    }
    g.frontier.cancelFishing();
    g.frontier.endCelebration();
    g.tractor.reset();
    g.land();
    g.state.data.riding = false;
    g.state.save();
    g.ui.close();
    this.active = kind;
    this.position = new THREE.Vector3(
      0,
      kind === "space" ? 8 : 0,
      kind === "space" ? 20 : 5.3,
    );
    this.yaw = 0;
    this.launch = kind === "space" ? 2.4 : 0;
    if (kind === "space") g.audio.play("rocket");
    this.target = SPACE_DESTINATIONS[0].id;
    this.camera = new THREE.PerspectiveCamera(
      50,
      innerWidth / innerHeight,
      0.1,
      1800,
    );
    g.keys.clear();
    g.ui.joystick?.reset();
    document.body.classList.add("inside-scene");
    this.hud.classList.remove("hidden");
    this.updateHUD();
    g.ui.toast(
      kind === "home"
        ? "Selamat pulang. Dekati keluarga atau peti, lalu tekan E."
        : "Peluncuran Space Z. WASD bergerak, T/C naik-turun, Shift melaju.",
    );
    return true;
  }
  exit() {
    if (!this.active) return;
    const g = this.g,
      space = this.active === "space";
    this.active = null;
    g.ui.close();
    g.keys.clear();
    g.ui.joystick?.reset();
    Object.assign(g.state.data, {
      x: space ? 78 : 15,
      z: space ? 215 : -2,
      riding: false,
    });
    g.altitude = 0;
    g.updatePlayer(0);
    g.ui.lastZone = "";
    document.body.classList.remove("inside-scene");
    this.hud.classList.add("hidden");
    g.state.save();
  }
  nearest() {
    const p = this.position;
    if (this.active === "home") {
      const choices = [
        ...FAMILY.map((def) => ({
          type: "family",
          def,
          x: def.x,
          z: def.z,
          label: "Bicara · " + def.name,
        })),
        {
          type: "storage",
          x: -6.2,
          z: -2.5,
          label: "Peti · Simpan barang & koin",
        },
        { type: "bed", x: 5, z: -1.5, label: "Istirahat · Pulihkan darah" },
        { type: "exit", x: 0, z: 6.3, label: "Kembali ke desa" },
      ];
      return choices
        .map((c) => ({ ...c, dist: Math.hypot(p.x - c.x, p.z - c.z) }))
        .filter((c) => c.dist < 2.4)
        .sort((a, b) => a.dist - b.dist)[0];
    }
    return this.planets
      .map(({ def }) => ({
        type: "scan",
        def,
        dist: p.distanceTo(new THREE.Vector3(def.x, def.y, def.z)) - def.r,
        label: "Ambil sampel · " + def.name,
      }))
      .filter((p) => p.dist < 16)
      .sort((a, b) => a.dist - b.dist)[0];
  }
  interact() {
    const n = this.nearest(),
      g = this.g;
    if (!n) return;
    if (n.type === "exit") this.exit();
    else if (n.type === "storage") this.storage();
    else if (n.type === "bed") {
      g.state.data.hp = g.state.maxHp;
      g.state.data.stamina = g.state.maxStamina;
      g.state.save();
      g.ui.toast("Istirahat sejenak. Darah dan stamina pulih.", "success");
    } else if (n.type === "family") {
      const i = this.talks[n.def.id] || 0;
      this.talks[n.def.id] = i + 1;
      g.ui.dialogue({ ...n.def, line: n.def.lines[i % n.def.lines.length] });
    } else if (n.type === "scan") {
      const f = g.state.data.frontier;
      if (f.spaceCollected.includes(n.def.id)) {
        g.ui.toast("Sampel lokasi ini sudah tersimpan di atlas.");
        return;
      }
      f.spaceCollected.push(n.def.id);
      f.bag.crystal += n.def.reward;
      g.state.data.stats.spaceDiscoveries = f.spaceCollected.length;
      g.state.addXp(60);
      g.state.save();
      g.audio.play("collect");
      g.ui.toast(
        `${n.def.name} dipetakan. +${n.def.reward} kristal antariksa. Jual di Kopdes.`,
        "success",
      );
    }
  }
  storage() {
    const g = this.g,
      d = g.state.data;
    frontierPanel(
      g,
      "Peti keluarga",
      `<p class="frontier-lead">Tabungan aman di rumah. Pilih barang yang hendak dititipkan atau dibawa kembali.</p><div class="frontier-shop">${STORAGE_ITEMS.map(
        (i) => {
          const bag = itemBag(d, i)[i.id] || 0,
            stored = d.frontier.storage[i.id] || 0;
          return `<article><div><h3>${i.name}</h3><small>Dibawa ${bag} · Disimpan ${stored}</small></div><div>${[1, 10].map((q) => frontierButton("storage-deposit", "Simpan " + q, `data-id="${i.id}" data-qty="${q}" ${bag < q ? "disabled" : ""}`) + frontierButton("storage-withdraw", "Ambil " + q, `data-id="${i.id}" data-qty="${q}" ${stored < q ? "disabled" : ""}`)).join("")}${frontierButton("storage-deposit", "Simpan semua", `data-id="${i.id}" data-qty="${bag}" ${bag < 1 ? "disabled" : ""}`)}${frontierButton("storage-withdraw", "Ambil semua", `data-id="${i.id}" data-qty="${stored}" ${stored < 1 ? "disabled" : ""}`)}</div></article>`;
        },
      ).join("")}</div>`,
    );
  }
  action(action, args) {
    const g = this.g;
    if (action === "space-launch") {
      if (
        !this.active &&
        Math.hypot(g.state.data.x - 66, g.state.data.z - 207) < 8
      )
        this.enter("space");
      return true;
    }
    if (!this.active) return false;
    if (action === "scene-exit") {
      this.exit();
      return true;
    }
    if (["ascend", "descend"].includes(action)) {
      if (this.active === "space" && !g.ui.panel) {
        const next = this.position.clone();
        next.y += action === "ascend" ? 4 : -4;
        if (
          this.planets.every(
            ({ def: d }) =>
              next.distanceTo(new THREE.Vector3(d.x, d.y, d.z)) > d.r + 4,
          ) &&
          next.length() < 420
        )
          this.position.copy(next);
      }
      return true;
    }
    if (action === "space-target") {
      if (SPACE_DESTINATIONS.some((d) => d.id === args.id))
        this.target = args.id;
      return true;
    }
    if (["storage-deposit", "storage-withdraw"].includes(action)) {
      if (this.active === "home" && this.nearest()?.type === "storage") {
        transferStorage(
          g.state.data,
          args.id,
          action === "storage-deposit" ? "deposit" : "withdraw",
          Number(args.qty),
        );
        g.state.save();
        this.storage();
      }
      return true;
    }
    if (action === "interact" || action === "scene-interact") {
      if (!g.ui.panel && this.launch <= 0) this.interact();
      return true;
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
        "start-football",
        "start-race",
        "rest",
        "meal",
        "frontier-shop",
      ].includes(action)
    )
      return true;
    return false;
  }
  updateHUD() {
    if (!this.active) return;
    const n = this.nearest(),
      space = this.active === "space",
      f = this.g.state.data.frontier;
    const target = SPACE_DESTINATIONS.find((d) => d.id === this.target);
    const dist = space
      ? Math.round(
          this.position.distanceTo(
            new THREE.Vector3(target.x, target.y, target.z),
          ) - target.r,
        )
      : 0;
    this.hud.innerHTML = `<div><small>${space ? "EKSPEDISI SPACE Z" : "RUMAH KELUARGA"}</small><strong>${space ? (this.launch > 0 ? "Lepas landas…" : target.name + " · " + Math.max(0, dist) + " m") : "Selamat pulang, Pak Hansip"}</strong><span>${space ? `WASD · ${target.x < this.position.x ? "←" : "→"} ${Math.round(Math.abs(target.x - this.position.x))} m · ${target.z < this.position.z ? "↑" : "↓"} ${Math.round(Math.abs(target.z - this.position.z))} m · ${target.y < this.position.y ? "C turun" : "T naik"} ${Math.round(Math.abs(target.y - this.position.y))} m` : "WASD bergerak · E bicara / simpan"}</span></div>${space ? `<nav>${SPACE_DESTINATIONS.map((d) => frontierButton("space-target", (f.spaceCollected.includes(d.id) ? "✓ " : "") + d.name, `data-id="${d.id}"`)).join("")}</nav>` : ""}<div>${space ? frontierButton("ascend", "↑ Naik") + frontierButton("descend", "↓ Turun") : ""}${n ? frontierButton("scene-interact", n.label + " · E") : ""}${frontierButton("scene-exit", space ? "Pulang ke Sukarame" : "Keluar rumah")}</div>`;
  }
  frame(dt, t) {
    this.g.ui.toastTimer = Math.max(0, this.g.ui.toastTimer - dt);
    if (this.g.ui.toastTimer === 0)
      document.querySelector("#toast").classList.remove("show");
    const g = this.g,
      p = this.position,
      space = this.active === "space";
    if (!g.ui.panel) {
      if (space && this.launch > 0) p.y += dt * 3;
      this.launch = Math.max(0, this.launch - dt);
      const { x, z } = g.movementInput(),
        y = space ? Number(g.keys.has("KeyT")) - Number(g.keys.has("KeyC")) : 0;
      const v = new THREE.Vector3(x, y, z);
      if (v.length() > 0 && this.launch <= 0) {
        v.clampLength(0, 1).multiplyScalar(
          dt * (space ? (g.keys.has("ShiftLeft") ? 60 : 32) : 4),
        );
        const next = p.clone().add(v);
        if (space) {
          if (
            this.planets.every(
              ({ def: d }) =>
                next.distanceTo(new THREE.Vector3(d.x, d.y, d.z)) > d.r + 4,
            ) &&
            next.length() < 420
          )
            p.copy(next);
        } else {
          next.x = THREE.MathUtils.clamp(next.x, -8.4, 8.4);
          next.z = THREE.MathUtils.clamp(next.z, -6.4, 6.5);
          if (
            !this.furniture.some(
              (o) =>
                Math.abs(next.x - o.x) < o.w && Math.abs(next.z - o.z) < o.d,
            )
          )
            p.copy(next);
        }
        this.yaw = Math.atan2(x, z);
      }
      if (space) {
        this.ship.position.copy(p);
        this.ship.rotation.set(-Math.PI / 2, 0, Math.PI - this.yaw);
        this.ship.userData.exhaust.visible = v.length() > 0 || this.launch > 0;
        this.ship.userData.exhaust.scale.y = 0.8 + Math.sin(t * 35) * 0.2;
        this.planets.forEach(({ planet, ring }) => {
          planet.rotation.y += dt * 0.015;
          ring.rotation.z += dt * 0.02;
        });
      } else {
        this.avatar.position.copy(p);
        this.avatar.rotation.y = this.yaw;
        animateHuman(this.avatar, t, v.length() > 0, false);
        for (const n of this.family) animateHuman(n.model, t, false, false);
      }
    }
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    const desired = space
      ? p.clone().add(new THREE.Vector3(0, 9, 21))
      : new THREE.Vector3(0, 18, 21);
    this.camera.position.copy(desired);
    this.camera.lookAt(
      space
        ? p
        : p
            .clone()
            .multiplyScalar(0.12)
            .add(new THREE.Vector3(0, 0, -1)),
    );
    g.renderer.render(space ? this.space : this.home, this.camera);
    this.hudTimer = (this.hudTimer || 0) + dt;
    if (this.hudTimer > 0.15) {
      this.hudTimer = 0;
      this.updateHUD();
    }
  }
}
