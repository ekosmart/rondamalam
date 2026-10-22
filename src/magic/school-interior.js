import * as THREE from "three";
import { buildSchool } from "./school-model.js";
import { frontierButton as btn, frontierPanel } from "../frontier.js";

const radius = 0.38;
const menus = new Set([
  "close",
  "journal",
  "settings",
  "help",
  "sound",
  "quality",
  "save",
  "reset-prompt",
  "reset-confirm",
]);

// The source asset uses metres. Keep movement and collision separate from the
// much larger village map, whose position remains the safe station save point.
export class SchoolInterior {
  constructor(magic) {
    this.magic = magic;
    this.g = magic.g;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e0a16);
    this.scene.fog = new THREE.FogExp2(0x0e0a16, 0.016);
    this.model = buildSchool(this.scene);
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.08, 220);
    this.position = new THREE.Vector3();
    this.lights = [];
    this.scene.traverse((o) => {
      if (o.isHemisphereLight) {
        o.intensity = 1.1;
        o.groundColor.setHex(0x605774);
      }
      if (o.isPointLight) {
        // Adapt r128's artistic lighting to modern Three's physical falloff.
        o.intensity *= 40;
        this.lights.push(o);
      }
      for (const mat of o.material ? [o.material].flat() : []) {
        if (mat.map && !o.isSprite) mat.map.colorSpace = THREE.SRGBColorSpace;
      }
    });
    this.model.ITEMS.well.wg.material.opacity = 0.2;
    this.wellPulse = 0;
  }

  enter() {
    const g = this.g;
    this.courtyardCamera = {
      yaw: g.cameraYaw,
      pitch: g.cameraPitch,
      distance: g.cameraDistance,
    };
    this.position.set(this.model.spawn.x, 0, this.model.spawn.z);
    g.cameraYaw = this.model.spawn.yaw;
    g.cameraPitch = 0;
    g.ui.close();
    g.keys.clear();
    g.ui.joystick?.reset();
    g.flightInput = 0;
    this.magic.insideSchool = true;
    document.body.classList.add("inside-school");
    this.updateHud();
    this.magic.sound("portal");
    g.ui.toast(
      "Sekolah Kala Wengi · Seret untuk melihat, WASD / joystick untuk berjalan.",
    );
  }

  leave() {
    const g = this.g;
    this.magic.insideSchool = false;
    document.body.classList.remove("inside-school");
    g.cameraYaw = this.courtyardCamera.yaw;
    g.cameraPitch = this.courtyardCamera.pitch;
    g.cameraDistance = this.courtyardCamera.distance;
    this.magic.position.set(0, 0, -13);
    g.ui.close();
    g.keys.clear();
    g.ui.joystick?.reset();
    g.flightInput = 0;
    this.magic.hud.innerHTML = `${btn("magic-interact", "Bicara / Keluar · E")}${btn("magic-cast", "Mantra · Spasi")}${btn("journal", "Jurnal")}${btn("magic-exit", "Pulang ke stasiun")}`;
  }

  canWalk(x, z) {
    if (
      !this.model.ROOMS.some(
        (r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1,
      )
    )
      return false;
    return !this.model.COL.some(
      ([x0, z0, x1, z1]) =>
        x > x0 - radius &&
        x < x1 + radius &&
        z > z0 - radius &&
        z < z1 + radius,
    );
  }

  move(x, z, dt, speed = 3.2) {
    const length = Math.max(1, Math.hypot(x, z));
    const dx = (x / length) * dt * speed,
      dz = (z / length) * dt * speed;
    // Substeps prevent crossing thin walls when a frame stalls.
    const steps = Math.max(
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
    const p = this.position;
    return this.model.INT.filter((item) => {
      const dx = item.p.x - p.x,
        dz = item.p.z - p.z;
      if (Math.hypot(dx, dz) > item.r) return false;
      // Furniture holding the exhibit is allowed; intervening walls are not.
      const blockers = this.model.COL.filter(
        ([x0, z0, x1, z1]) =>
          !(
            item.p.x >= x0 - 0.2 &&
            item.p.x <= x1 + 0.2 &&
            item.p.z >= z0 - 0.2 &&
            item.p.z <= z1 + 0.2
          ),
      );
      const n = Math.ceil(Math.hypot(dx, dz) / 0.15);
      for (let i = 1; i < n; i++) {
        const x = p.x + (dx * i) / n,
          z = p.z + (dz * i) / n;
        if (
          blockers.some(
            ([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1,
          )
        )
          return false;
      }
      return true;
    }).sort((a, b) => a.p.distanceToSquared(p) - b.p.distanceToSquared(p))[0];
  }

  inspect() {
    const item = this.nearby();
    if (!item) {
      this.g.ui.toast(
        "Dekati buku, ramuan, potret, atau sumur untuk memeriksanya.",
      );
      return;
    }
    if (item.label === "Pintu depan") {
      this.leave();
      return;
    }
    if (item.type === "well") {
      this.wellPulse = 4;
      this.magic.sound("rescue");
    } else
      this.magic.sound(
        item.label.toLowerCase().includes("hantu") ? "owl" : "spell",
      );
    const note =
      item.type === "item"
        ? "<p class=muted>Koleksi pelajaran akademi. Hadiah perlengkapan diperoleh dari tugas Prof. Arun di halaman depan.</p>"
        : "";
    frontierPanel(
      this.g,
      item.label,
      `<p>${item.text}</p>${note}${btn("close", "Selesai memeriksa")}`,
    );
  }

  action(action) {
    if (menus.has(action)) return false;
    if (action === "school-exit") {
      this.leave();
      return true;
    }
    if (
      !this.g.ui.panel &&
      (action === "interact" || action === "magic-interact")
    )
      this.inspect();
    return true;
  }

  updateHud() {
    const room = this.model.ROOMS.find(
      (r) =>
        this.position.x >= r.x0 &&
        this.position.x <= r.x1 &&
        this.position.z >= r.z0 &&
        this.position.z <= r.z1,
    );
    const item = this.nearby();
    const label =
      item?.label === "Pintu depan"
        ? "Keluar ke halaman"
        : item
          ? `Periksa ${item.label}`
          : "Periksa sekitar";
    const html = `<div class="school-room"><span>SEKOLAH KALA WENGI</span><strong>${room?.n || "Akademi Sihir"}</strong></div>${btn("magic-interact", `${label} · E`)}${btn("school-exit", "Ke halaman")}${btn("journal", "Jurnal")}${btn("magic-exit", "Ke stasiun")}`;
    if (this.magic.hud.innerHTML !== html) this.magic.hud.innerHTML = html;
  }

  frame(dt, t) {
    const g = this.g;
    g.audio.ghostVoices.pause(true);
    g.audio.setWeather({}, true);
    if (!g.ui.panel) {
      const { x, z } = g.movementInput();
      this.move(
        x * Math.cos(g.cameraYaw) + z * Math.sin(g.cameraYaw),
        -x * Math.sin(g.cameraYaw) + z * Math.cos(g.cameraYaw),
        Math.min(dt, 0.1),
        g.keys.has("ShiftLeft") || g.keys.has("ShiftRight") ? 5.4 : 3.2,
      );
    }
    this.model.update(t, dt, this.position.x, this.position.z);
    this.wellPulse = Math.max(0, this.wellPulse - dt);
    this.model.ITEMS.well.beam.material.opacity = (this.wellPulse / 4) * 0.3;
    this.model.ITEMS.well.wg.material.opacity =
      0.2 + (this.wellPulse / 4) * 0.6;
    // A fixed count of nearby lights keeps the mobile shader small and stable.
    this.lights.sort(
      (a, b) =>
        a.position.distanceToSquared(this.position) -
        b.position.distanceToSquared(this.position),
    );
    this.lights.forEach((light, i) => {
      light.visible = i < 4;
    });
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(this.position.x, 1.68, this.position.z);
    this.camera.lookAt(
      this.position.x - Math.sin(g.cameraYaw) * Math.cos(g.cameraPitch),
      1.68 - Math.sin(g.cameraPitch),
      this.position.z - Math.cos(g.cameraYaw) * Math.cos(g.cameraPitch),
    );
    this.updateHud();
    if (g.ui.toastTimer > 0) {
      g.ui.toastTimer -= dt;
      if (g.ui.toastTimer <= 0)
        document.querySelector("#toast")?.classList.remove("show");
    }
    g.renderer.render(this.scene, this.camera);
  }
}
