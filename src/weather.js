import * as THREE from "three";
import { WEATHER, weatherAt, groundFactor, weatherPhase } from "./weather-rules.js";
import { orb, mesh } from "./models.js";
import { distance } from "./state.js";

const sheltered = (p) => Math.hypot(p.x, p.z) < 25;
export class VillageWeather {
  constructor(g) {
    this.g = g;
    this.time = 0;
    this.strikeTimer = 9;
    this.tick = 0;
    this.flash = 0;
    this.fireModels = new Map();
    this.lastSteps = new Map();
    this.footprints = [];
    this.targetTimer = 0;
    this.staticTargets = [
      ...g.world.houses.map((h) => ({
        key: "house:" + h.id,
        kind: "house",
        ref: h,
        pos: { x: h.x, y: 5, z: h.z },
      })),
      ...g.world.buildingFootprints
        .filter((b) => !g.world.houses.some((h) => distance(h, b) < 1))
        .map((b, i) => ({
          key: "building:" + i,
          kind: "building",
          ref: b,
          pos: { x: b.x, y: 6, z: b.z },
        })),
      ...g.world.trees.map((b, i) => ({
        key: "tree:" + i,
        kind: "tree",
        ref: b,
        pos: { x: b.x, y: b.h * 0.6, z: b.z },
      })),
      ...g.world.ricePlots.map((b, i) => ({ key: "rice:" + i, kind: "crop", ref: b, pos: { x: b.x, y: 0.5, z: b.z } })),
      ...g.world.frontier.fields.map(f => ({ key: "field:" + f.def.id, kind: "field", ref: f, pos: { x: f.def.x, y: 1, z: f.def.z } })),
    ];
    this.data.phase ??= weatherPhase(g.state);
    this.root = new THREE.Group();
    g.scene.add(this.root);
    this.buildVisuals();
    this.hud = document.createElement("aside");
    this.hud.id = "weather-hud";
    this.hud.setAttribute("aria-live", "polite");
    document.querySelector("#hud").append(this.hud);
    this.hud.innerHTML = "<b></b><small></small>";
    this.set(this.data.type, false, false);
    for (const target of this.staticTargets) if ((this.data.health[target.key] ?? 100) <= 0) this.applyRuin(target);

  }
  get data() {
    return this.g.state.data.weather;
  }
  get def() {
    return WEATHER[this.data.type];
  }
  get flooded() {
    return this.data.flood > 0.2;
  }
  get waterY() {
    return this.flooded ? 0.95 * this.data.flood : 0.32;
  }
  movementFactor(pos, air = false) {
    return groundFactor(this.data, air);
  }
  set(type, announce = true, reset = true) {
    if (!WEATHER[type]) return false;
    this.data.type = type;
    if (reset) {
      this.data.elapsed = 0;
      this.data.phase = weatherPhase(this.g.state);
      this.data.tornadoPosition = null;
      this.data.flood = type === "flood" ? 1 : 0;
      this.data.snow = ["snow", "blizzard", "snowroad"].includes(type) ? 1 : 0;
      this.footprints.length = 0;
      this.lastSteps.clear();
    }
    if (type === "tornado") {
      const candidates = this.staticTargets.filter(
        (t) => t.kind === "house" && !sheltered(t.pos),
      );
      const h = candidates[(this.data.index * 7) % candidates.length];
      const saved = this.data.tornadoPosition;
      this.tornado.position.set(saved?.x ?? h?.pos.x ?? 55, 0, saved?.z ?? ((h?.pos.z ?? 55) + 36));
      this.tornadoTarget = null;
    }
    this.hud.querySelector("b").textContent =
      this.def.icon + " " + this.def.name;
    this.hud.querySelector("small").textContent = this.def.hint;
    this.hud.dataset.danger = ["tornado", "thunder"].includes(type);
    if (announce)
      this.g.ui.toast("Cuaca berubah: " + this.def.name + ". " + this.def.hint);
    return true;
  }
  buildVisuals() {
    const root = this.root;
    // Two draw calls for local precipitation, regardless of weather density.
    this.dropSeeds = Array.from({ length: 1000 }, () => [
      Math.random() * 110 - 55,
      Math.random() * 48,
      Math.random() * 110 - 55,
    ]);
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(1000 * 6), 3),
    );
    this.rain = new THREE.LineSegments(
      rainGeo,
      new THREE.LineBasicMaterial({
        color: "#beddf6",
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      }),
    );
    this.rain.frustumCulled = false;
    root.add(this.rain);
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(1000 * 3), 3),
    );
    this.snowflakes = new THREE.Points(
      snowGeo,
      new THREE.PointsMaterial({
        color: "#f2f9ff",
        size: 0.16,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    this.snowflakes.frustumCulled = false;
    root.add(this.snowflakes);
    this.clouds = new THREE.Group();
    root.add(this.clouds);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: "#6a7981",
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    for (let i = 0; i < 22; i++) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), cloudMat);
      c.position.set(
        Math.sin(i * 21) * 270,
        66 + (i % 4) * 6,
        Math.cos(i * 11) * 270,
      );
      c.scale.set(30 + (i % 4) * 7, 5, 17 + (i % 3) * 5);
      this.clouds.add(c);
    }
    this.floodPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(585, 585, 48, 48),
      this.g.world.water[0].material.clone(),
    );
    this.floodPlane.rotation.x = -Math.PI / 2;
    this.floodPlane.material.map = this.floodPlane.material.map.clone();
    this.floodPlane.material.map.repeat.set(52, 52);
    this.floodPlane.material.bumpMap = this.floodPlane.material.map;
    this.floodPlane.material.opacity = 0.68;
    root.add(this.floodPlane);
    const snowMat = new THREE.MeshStandardMaterial({
      color: "#dceaf0",
      roughness: 1,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    this.snowGround = new THREE.Mesh(
      new THREE.PlaneGeometry(582, 582),
      snowMat,
    );
    this.snowGround.rotation.x = -Math.PI / 2;
    this.snowGround.position.y = 0.065;
    root.add(this.snowGround);
    this.tracks = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.2, 0.43),
      new THREE.MeshBasicMaterial({
        color: "#6b899c",
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
      420,
    );
    this.tracks.count = 0;
    this.tracks.renderOrder = 3;
    this.snowGround.renderOrder = 1;
    this.tracks.frustumCulled = false;
    root.add(this.tracks);
    this.dummy = new THREE.Object3D();
    this.tornado = new THREE.Group();
    root.add(this.tornado);
    const funnel = mesh(
      this.tornado,
      new THREE.CylinderGeometry(15, 1.1, 47, 20, 12, true),
      new THREE.MeshStandardMaterial({
        color: "#6d7276",
        transparent: true,
        opacity: 0.47,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    funnel.position.y = 23.5;
    this.tornadoRings = [];
    for (let i = 0; i < 16; i++) {
      const ring = mesh(
        this.tornado,
        new THREE.TorusGeometry(1.6 + i * 0.79, 0.25 + i * 0.028, 5, 40),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? "#9b9c98" : "#5d686b",
          transparent: true,
          opacity: 0.55,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = i * 2.8 + 0.6;
      this.tornadoRings.push(ring);
    }
    this.debris = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.55, 0.23, 0.3),
      new THREE.MeshStandardMaterial({ color: "#b49a79" }),
      72,
    );
    this.debris.frustumCulled = false;
    this.tornado.add(this.debris);
    this.bolt = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: "#d5e9ff",
        transparent: true,
        opacity: 1,
        depthTest: false,
      }),
    );
    this.bolt.frustumCulled = false;
    this.bolt.renderOrder = 7;
    root.add(this.bolt);
    this.boltLight = new THREE.PointLight("#b7d7ff", 0, 70, 1.4);
    root.add(this.boltLight);
  }
  targets() {
    const g = this.g,
      d = g.state.data;
    const result = [
      ...this.staticTargets,
      {
        key: "player",
        kind: "player",
        ref: g.player,
        pos: { x: d.x, y: g.altitude + 1.5, z: d.z },
      },
      ...g.enemies
        .filter((e) => e.active && e.hp > 0)
        .map((e) => ({
          key:
            "enemy:" +
            (e.incident?.id || (e.raid ? "raid-" + e.raid.index : e.spawnId || e.def.id)),
          kind: "enemy",
          ref: e,
          pos: e.pos,
        })),
      ...g.npcs
        .filter(
          (n) =>
            n.active ||
            ["sick", "injured", "lifting", "hunted"].includes(
              d.incidents.residents[n.def.id]?.condition,
            ),
        )
        .map((n) => ({
          key: "resident:" + n.def.id,
          kind: "resident",
          ref: g.incidents.victim(n.def.id),
          pos: n.model.position,
        })),
      ...g.life.animals
        .filter(
          (a, i) =>
            !a.incidentUnavailable ||
            ["sick", "injured", "lifting", "hunted"].includes(
              d.incidents.residents["animal-" + i]?.condition,
            ),
        )
        .map((a) => {
          const id = "animal-" + g.life.animals.indexOf(a);
          return {
            key: "resident:" + id,
            kind: "resident",
            ref: g.incidents.victim(id),
            pos: a.model.position,
          };
        }),
    ];
    return result;
  }
  applyRuin(target) {
    if (target.ref.ruined) return;
    if (target.kind === "field") this.g.world.damage.setFieldRuined(target.ref, true);
    else if (["building", "tree", "crop"].includes(target.kind)) this.g.world.damage.setRuined(target.ref, true);
    this.g.incidents.navigation.cache?.clear();
  }
  damage(target, power) {
    const g = this.g;
    if (!target || sheltered(target.pos)) return;
    if (target.kind === "house") g.incidents.damageHouse(target.ref, power);
    if (["building", "tree", "crop", "field"].includes(target.kind)) {
      this.data.health[target.key] = Math.max(0, (this.data.health[target.key] ?? 100) - power);
      if (this.data.health[target.key] <= 0) this.applyRuin(target);
    }
    if (target.kind === "enemy" && target.ref.active && target.ref.hp > 0)
      g.damageEnemy(target.ref, power, "weather", "arcane");
    if (target.kind === "player") g.hurt(power, "electric");
    if (target.kind === "resident" && target.ref) {
      const v = target.ref;
      this.data.health[v.id] = Math.max(
        0,
        (this.data.health[v.id] ?? 100) - power,
      );
      if (
        this.data.health[v.id] <= 0 &&
        !g.state.data.incidents.residents[v.id]
      ) {
        g.incidents.restrain(v, "injured");
        g.incidents.applyResidents();
        g.ui.toast(
          v.name + " terluka oleh cuaca. Dekati dan E untuk menolong.",
          "error",
        );
      }
    }
  }
  ignite(target) {
    if (!target || sheltered(target.pos) || this.data.fires.length >= 40)
      return;
    const f = this.data.fires.find((f) => f.key === target.key);
    if (f) f.life = 18;
    else this.data.fires.push({ key: target.key, life: 18 });
  }
  strike(target) {
    const choices = this.targets().filter(
      (t) =>
        !sheltered(t.pos) &&
        (t.kind !== "house" ||
          (this.g.state.data.incidents.houses[t.ref.id] ?? 100) > 0),
    );
    if (!target) {
      // Pick a class first so the many trees cannot drown out ships, monsters and residents.
      const groups = [
        "enemy",
        "player",
        "resident",
        "house",
        "building",
        "tree",
      ]
        .map((kind) => choices.filter((t) => t.kind === kind))
        .filter((a) => a.length);
      const group = groups[Math.floor(Math.random() * groups.length)];
      target = group?.[Math.floor(Math.random() * group.length)];
    }
    if (!target) return;
    const p = target.pos,
      points = [];
    for (let i = 0; i <= 13; i++)
      points.push(
        new THREE.Vector3(
          p.x + (i === 13 ? 0 : (Math.random() - 0.5) * 8),
          p.y + 1 + (13 - i) * 5,
          p.z + (i === 13 ? 0 : (Math.random() - 0.5) * 8),
        ),
      );
    this.bolt.geometry.dispose();
    this.bolt.geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.boltLight.position.set(p.x, p.y + 4, p.z);
    this.flash = 0.42;
    this.damage(
      target,
      target.kind === "player"
        ? 30
        : target.kind === "house"
          ? 22
          : target.kind === "enemy"
            ? Math.max(35, target.ref.maxHp * 0.2)
            : 45,
    );
    this.ignite(target);
    this.g.effects.burst(p.x, p.y + 1, p.z, "#d6e8ff", 45, 9);
    this.g.audio.play("thunder");
    if (distance(p, this.g.state.data) < 65) this.g.cameraShake = 0.22;
    this.g.incidents.updateHouses();
    return target;
  }
  interactions() {
    const d = this.g.state.data,
      result = [];
    if (this.g.altitude > 5) return result;
    const targets = this.targets();
    for (const f of this.data.fires) {
      const target = targets.find((t) => t.key === f.key);
      if (
        target &&
        distance(d, target.pos) < Math.max(6, (target.ref?.w || 0) / 2 + 3)
      )
        result.push({
          type: "weather-fire",
          obj: f.key,
          dist: distance(d, target.pos) - 3,
          label: "Padamkan api · E",
        });
    }
    for (const [id, s] of Object.entries(d.incidents.residents))
      if (s.condition === "injured" && distance(d, s) < 5)
        result.push({
          type: "weather-rescue",
          obj: id,
          dist: distance(d, s) - 2,
          label: "Tolong korban cuaca · E",
        });
    return result;
  }
  interact(it) {
    if (it.type === "weather-fire") {
      this.data.fires = this.data.fires.filter((f) => f.key !== it.obj);
      this.g.state.data.stats.firesOut++;
      this.g.audio.play("splash");
      this.g.ui.toast("Api dipadamkan.", "success");
    } else if (it.type === "weather-rescue") {
      this.g.incidents.rescue(it.obj);
      this.data.health[it.obj] = 100;
      this.g.ui.toast("Korban ditolong dan kembali beraktivitas.", "success");
    } else return false;
    this.g.state.save();
    return true;
  }
  restoreMorning() {
    this.g.world.damage.restore();
    this.tornadoTarget = null;
    this.data.fires = [];
    this.data.health = {};
  }
  updateTornado(dt, targets) {
    if (this.data.type !== "tornado") return;
    const p = this.tornado.position;
    this.targetTimer -= dt;
    const alive = target => {
      if (!target || sheltered(target.pos)) return false;
      if (target.kind === "house") return (this.g.state.data.incidents.houses[target.ref.id] ?? 100) > 0;
      if (target.kind === "resident") return target.ref && !this.g.state.data.incidents.residents[target.ref.id] && (this.data.health[target.ref.id] ?? 100) > 0;
      if (["tree", "building", "crop", "field"].includes(target.kind)) return (this.data.health[target.key] ?? 100) > 0 && !target.ref.ruined;
      return false;
    };
    if (!alive(this.tornadoTarget) || this.targetTimer <= 0) {
      const previous = this.tornadoTarget?.key;
      const choices = targets.filter(alive).filter(t => t.key !== previous);
      const penalty = t => t.kind === "tree" ? 45 : t.kind === "resident" ? 12 : 0;
      choices.sort((a, b) => distance(a.pos, p) + penalty(a) - distance(b.pos, p) - penalty(b));
      this.tornadoTarget = choices[0]; this.targetTimer = 18;
    }
    if (this.tornadoTarget) {
      const q = this.tornadoTarget.pos,
        l = distance(p, q),
        step = Math.min(l, dt * 9);
      const nx = p.x + ((q.x - p.x) / (l || 1)) * step,
        nz = p.z + ((q.z - p.z) / (l || 1)) * step;
      if (!sheltered({ x: nx, z: nz })) {
        p.x = nx;
        p.z = nz;
      } else {
        // Follow the safe circle tangent instead of repeatedly aiming through its centre.
        const angle = Math.atan2(p.z, p.x) + dt * 9 / Math.max(27, Math.hypot(p.x, p.z));
        p.set(Math.cos(angle) * 27, 0, Math.sin(angle) * 27);
      }
    } else {
      p.x = Math.max(-280, Math.min(280, p.x + Math.sin(this.time * 0.13) * dt * 9));
      p.z = Math.max(-280, Math.min(280, p.z + Math.cos(this.time * 0.13) * dt * 9));
    }
    this.data.tornadoPosition = { x: p.x, z: p.z };
    for (const target of targets) {
      if (sheltered(target.pos) || distance(target.pos, p) > 12) continue;
      if (["house", "building", "tree", "crop", "field"].includes(target.kind)) this.damage(target, dt * (target.kind === "tree" ? 50 : 32));
      else if (["resident", "enemy", "player"].includes(target.kind)) {
        this.damage(target, target.kind === "player" ? 18 : dt * 22);
        if (target.kind === "enemy" && target.ref.def.air) continue;
        const q = target.pos,
          l = distance(p, q),
          nx = q.x + ((p.x - q.x) / (l || 1)) * dt * 2,
          nz = q.z + ((p.z - q.z) / (l || 1)) * dt * 2;
        if (this.g.world.canMove(nx, nz, 0.4)) {
          if (target.kind === "player")
            Object.assign(this.g.state.data, { x: nx, z: nz });
          else {
            q.x = nx;
            q.z = nz;
          }
          if (target.kind === "resident" && target.ref.npc)
            Object.assign(target.ref.npc.def, { x: nx, z: nz });
        }
      }
    }
    this.g.incidents.updateHouses();
  }
  update(dt) {
    if (!dt) return;
    this.time += dt;
    this.data.elapsed += dt;
    const phase = weatherPhase(this.g.state);
    if (phase !== this.data.phase) {
      let next;
      do { this.data.index++; next = weatherAt(this.data.seed, this.data.index); } while (next === this.data.type);
      this.set(next);
      this.g.state.save();
    }
    this.strikeTimer -= dt;
    if (this.data.type === "thunder" && this.strikeTimer <= 0) {
      this.strikeTimer = 5 + Math.random() * 6;
      this.strike();
    }
    const targets = this.targets();
    this.updateTornado(dt, targets);
    this.tick += dt;
    const doDamage = this.tick >= 1;
    if (doDamage) this.tick = 0;
    for (let i = this.data.fires.length - 1; i >= 0; i--) {
      const f = this.data.fires[i],
        target = targets.find((t) => t.key === f.key);
      // Flood extinguishes ground fires; treetops, roofs and flying ships can still burn.
      f.life -=
        dt * (this.flooded && (target?.pos.y || 0) < this.waterY ? 6 : 1);
      if (
        !target ||
        f.life <= 0 ||
        (target.kind === "enemy" && !target.ref.active)
      ) {
        this.data.fires.splice(i, 1);
        continue;
      }
      if (doDamage)
        this.damage(
          target,
          target.kind === "house" ? 4 : target.kind === "player" ? 3 : 5,
        );
      let m = this.fireModels.get(f.key);
      if (!m) {
        m = new THREE.Group();
        for (let j = 0; j < 5; j++) {
          const f = orb(
            m,
            0.27,
            "#ffb34f",
            Math.sin(j * 2) * 0.5,
            0.5,
            Math.cos(j * 2) * 0.5,
            0,
            { emissive: "#ff6a15", emissiveIntensity: 2.5 },
          );
          f.scale.y = 2.4;
        }
        this.root.add(m);
        this.fireModels.set(target.key, m);
      }
      const size = ["house", "building", "tree"].includes(target.kind) ? 3 : 1;
      m.scale.set(size, size * (1 + Math.sin(this.time * 15) * 0.16), size);
      m.position.set(target.pos.x, target.pos.y + 0.35, target.pos.z);
      if (doDamage && distance(target.pos, this.g.state.data) < 110)
        this.g.effects.burst(
          target.pos.x,
          target.pos.y + 2,
          target.pos.z,
          "#6f6a65",
          8,
          3,
        );
    }
    for (const [key, m] of this.fireModels)
      if (!this.data.fires.some((f) => f.key === key)) {
        m.removeFromParent();
        m.traverse((o) => o.geometry?.dispose());
        this.fireModels.delete(key);
      }
    if (doDamage) this.g.incidents.updateHouses();
    this.trackSteps(targets);
  }
  trackSteps(targets) {
    if (this.data.snow < 0.15 || this.flooded) {
      this.footprints.length = 0;
      this.lastSteps.clear();
      return;
    }
    for (const t of targets) {
      if (
        !["player", "enemy", "resident"].includes(t.kind) ||
        t.pos.y > 3 ||
        distance(t.pos, this.g.state.data) > 65 ||
        (t.kind === "player" && this.g.isFlying)
      )
        continue;
      const prev = this.lastSteps.get(t.key);
      if (!prev || distance(prev, t.pos) > 0.8) {
        const angle = prev ? Math.atan2(t.pos.x - prev.x, t.pos.z - prev.z) : 0;
        if (prev && distance(prev, t.pos) < 10)
          this.footprints.push({
            x:
              t.pos.x +
              Math.cos(angle) * 0.15 * (this.footprints.length % 2 ? 1 : -1),
            z: t.pos.z,
            angle,
            born: this.time,
          });
        this.lastSteps.set(t.key, { x: t.pos.x, z: t.pos.z });
      }
    }
    this.footprints = this.footprints
      .filter((p) => this.time - p.born < 35)
      .slice(-420);
    if (this.lastSteps.size > 400) this.lastSteps.clear();
  }
  render(dt) {
    const g = this.g,
      d = g.state.data,
      w = this.def,
      t = this.time;
    this.root.visible = !g.expeditions?.active;
    this.hud.classList.toggle(
      "hidden",
      !!g.sports.active || !!g.expeditions?.active,
    );
    g.scene.background.lerp(
      new THREE.Color(w.tint),
      w === WEATHER.clear ? 0.08 : 0.4,
    );
    g.scene.fog.color.copy(g.scene.background);
    g.scene.fog.density += w.fog;
    g.world.sun.intensity *= w.dim;
    this.clouds.visible = this.data.type !== "clear";
    this.clouds.rotation.y = t * 0.0015;
    this.clouds.children[0].material.opacity =
      this.data.type === "cloudy" ? 0.45 : 0.65;
    this.rain.visible = !!w.rain;
    this.snowflakes.visible = !!w.snow;
    const wind = (w.wind || 0) * 8 + (w.rain === 2 ? 5 : 0),
      rp = this.rain.geometry.attributes.position,
      sp = this.snowflakes.geometry.attributes.position;
    const count = w.rain === 2 || w.snow === 2 ? 1000 : 550;
    this.rain.geometry.setDrawRange(0, count * 2);
    this.snowflakes.geometry.setDrawRange(0, count);
    if (w.rain || w.snow)
      for (let i = 0; i < count; i++) {
        const s = this.dropSeeds[i],
          x = d.x + ((((s[0] + t * (wind || 1)) % 110) + 110) % 110) - 55,
          z = d.z + s[2];
        const y =
          g.altitude + ((((s[1] - t * (w.rain ? 26 : 3)) % 48) + 48) % 48);
        if (w.rain) {
          rp.setXYZ(i * 2, x, y, z);
          rp.setXYZ(i * 2 + 1, x - 0.15 - wind * 0.04, y + 1.3, z);
        }
        if (w.snow)
          sp.setXYZ(i, x + Math.sin(t + i) * 0.6, y, z + Math.sin(t * 0.6 + i));
      }
    rp.needsUpdate = sp.needsUpdate = true;
    this.floodPlane.visible = this.flooded;
    this.floodPlane.position.y = this.waterY;
    if (this.flooded) {
      this.floodPlane.material.map.offset.set(t * 0.013, t * 0.009);
      const pos = this.floodPlane.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++)
        pos.setZ(
          i,
          Math.sin(pos.getX(i) * 0.15 + t * 1.7) *
            Math.cos(pos.getY(i) * 0.18 + t) *
            0.07,
        );
      pos.needsUpdate = true;
    }
    this.snowGround.visible = this.data.snow > 0.15 && !this.flooded;
    this.tracks.visible = this.snowGround.visible;
    this.tracks.count = this.footprints.length;
    this.footprints.forEach((p, i) => {
      this.dummy.position.set(p.x, 0.073, p.z);
      this.dummy.rotation.set(-Math.PI / 2, 0, -p.angle);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.tracks.setMatrixAt(i, this.dummy.matrix);
    });
    this.tracks.instanceMatrix.needsUpdate = true;
    this.tornado.visible = this.data.type === "tornado";
    if (this.tornado.visible) {
      this.tornado.rotation.y = t * 1.8;
      this.tornadoRings.forEach((r, i) => {
        r.position.x = Math.sin(t * 2 + i * 0.25) * i * 0.08;
        r.position.z = Math.cos(t * 1.6 + i * 0.25) * i * 0.07;
        r.rotation.z = t * (i % 2 ? 2 : -3);
      });
      for (let i = 0; i < 72; i++) {
        const y = (i * 0.67 + t * 5) % 45,
          r = 2 + y * 0.3,
          a = t * 5 + i * 2;
        this.dummy.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
        this.dummy.rotation.set(t * 3, i + t, t * 2);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.debris.setMatrixAt(i, this.dummy.matrix);
      }
      this.debris.instanceMatrix.needsUpdate = true;
    }
    this.flash = Math.max(0, this.flash - dt);
    this.bolt.visible = this.flash > 0;
    this.bolt.material.opacity = Math.min(1, this.flash * 4);
    this.boltLight.intensity = this.flash * 850;
    if (this.flash > 0.12) g.world.sun.intensity += this.flash * 14;
  }
}
