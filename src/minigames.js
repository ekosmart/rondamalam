import * as THREE from "three";
import { makeHuman, makeBicycle, animateHuman, mesh, box } from "./models.js";
import { RaceProgress, CupMatch } from "./sports-rules.js";
import { RACE_TRACK, SPORTS, segmentDistance } from "./layout.js";
import { distance, clamp } from "./state.js";
import { makeFootballer } from "./sports-models.js";

export class Minigames {
  constructor(game) {
    this.game = game;
    this.active = null;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.group.visible = false;
    this.ball = null;
    this.players = [];
    this.racers = [];
    this.previous = { x: 0, z: 0 };
    this.countdown = 0;
    this.kickTimer = 0;
    const hud = document.createElement("div");
    hud.id = "activity-hud";
    hud.className = "hidden";
    hud.innerHTML =
      '<div class="activity-score"></div><div class="activity-meta"><small class="activity-detail"></small><small class="activity-status" role="status"></small></div><div id="activity-controls"><div class="activity-legend"><span class="you-color">▼ Kamu</span><span class="home-color">● Kawan</span><span class="away-color">◆ Lawan</span></div><small class="race-hint">WASD · Ikuti gerbang emas</small><div class="sport-buttons"><button data-action="attack"><kbd>Spasi</kbd> Tembak</button><button data-action="special"><kbd>Q</kbd> Oper</button></div><button data-action="settings" class="sport-pause">Jeda</button><button data-action="quit-activity">Keluar</button></div>';
    document.querySelector("#hud").appendChild(hud);
    this.hud = hud;
  }
  clear() {
    this.group.clear();
    this.players = [];
    this.racers = [];
    this.gates = [];
    this.ball = null;
  }
  prepare(type) {
    const g = this.game;
    if (this.active) return false;
    if (distance(g.state.data, SPORTS[type]) > 9) {
      g.ui.toast("Datangi panitia di lokasi kegiatan.");
      return false;
    }
    this.returnPoint = {
      x: g.state.data.x,
      z: g.state.data.z,
      mount: g.state.data.mount,
      riding: g.state.data.riding,
      cameraYaw: g.cameraYaw,
      cameraPitch: g.cameraPitch,
      cameraDistance: g.cameraDistance,
      flashOn: g.flashOn,
    };
    g.ui.close();
    g.tractor.reset();
    this.clear();
    this.active = type;
    this.offTrack = false;
    this.group.visible = true;
    this.countdown = 3;
    g.keys.clear();
    g.ui.joystick?.reset();
    g.lockedTarget = null;
    g.target = null;
    g.cameraYaw = 0;
    document.body.classList.add("activity-running");
    document.body.classList.add(`activity-${type}`);
    if (g.companionModel) g.companionModel.visible = false;
    this.hud.classList.remove("hidden");
    return true;
  }
  startFootball() {
    if (!this.prepare("football")) return;
    const g = this.game;
    this.match = new CupMatch();
    this.originalPlayer = g.player;
    this.originalPlayer.visible = false;
    g.player = makeFootballer(0, 10, true);
    this.group.add(g.player);
    g.state.data.riding = false;
    g.bike.visible = false;
    g.altitude = 0;
    g.player.visible = true;
    g.player.userData.holder.visible = false;
    g.flashOn = false;
    g.cameraDistance = 52;
    g.cameraPitch = 0.95;
    this.ball = mesh(
      this.group,
      new THREE.IcosahedronGeometry(0.58, 1),
      "#eee9d5",
      -18,
      0.58,
      143,
    );
    for (let i = 0; i < 7; i++) {
      const patch = mesh(
        this.ball,
        new THREE.CircleGeometry(0.19, 5),
        "#31463d",
      );
      const a = (i / 7) * Math.PI * 2;
      patch.position.set(Math.sin(a) * 0.54, 0.16, Math.cos(a) * 0.54);
      patch.lookAt(patch.position.clone().multiplyScalar(3));
    }
    this.velocity = new THREE.Vector2();
    for (const [team, x, z] of [
      [0, -33, 143],
      [0, -3, 138],
      [1, -31, 127],
      [1, -5, 127],
      [1, -18, 110],
    ]) {
      const m = makeFootballer(team, this.players.length + 2);
      this.group.add(m);
      m.position.set(x, 0, z);
      this.players.push({ model: m, team, home: { x, z } });
    }
    this.resetBall();
    g.player.position.set(g.state.data.x, 0, g.state.data.z);
    g.ui.toast("Semifinal Tarkam! Spasi menembak, Q mengoper.");
    this.renderHUD();
  }
  resetBall() {
    const g = this.game;
    this.ball.position.set(-18, 0.58, 143);
    this.velocity.set(0, 0);
    g.state.data.x = -18;
    g.state.data.z = 151;
    g.facing = Math.PI;
    g.player.position.set(-18, 0, 151);
    g.player.rotation.y = Math.PI;
    this.players.forEach((p) => p.model.position.set(p.home.x, 0, p.home.z));
    this.countdown = 3;
  }
  startRace() {
    if (!this.prepare("race")) return;
    const g = this.game;
    this.race = new RaceProgress(2);
    g.state.data.mount = g.state.data.mount === "bmx" ? "bmx" : "onthel";
    g.state.data.riding = true;
    g.equipMount();
    g.state.data.x = 0;
    g.state.data.z = 19;
    g.altitude = 0;
    g.player.visible = true;
    g.facing = -Math.PI / 2;
    g.cameraPitch = 0.58;
    g.cameraDistance = 25;
    this.previous = { x: 0, z: 19 };
    g.updatePlayer(0);
    for (let i = 0; i < 3; i++) {
      const model = new THREE.Group(),
        rider = makeHuman(["#d69a50", "#79a7ba", "#bd7889"][i]),
        bike = makeBicycle("bmx", ["#d69a50", "#79a7ba", "#bd7889"][i]);
      rider.scale.setScalar(0.78);
      rider.position.y = 0.75;
      model.add(bike, rider);
      model.position.set(0, 0, 17 + i * 2);
      this.group.add(model);
      this.racers.push({
        model,
        rider,
        bike,
        progress: new RaceProgress(2),
        speed: 16.2 + i * 0.8,
        name: ["Dimas", "Bimo", "Rara"][i],
      });
    }
    for (let i = 0; i < RACE_TRACK.length; i++) {
      const p = RACE_TRACK[i],
        gate = new THREE.Group();
      gate.position.set(p.x, 0, p.z);
      const ring = mesh(
        gate,
        new THREE.TorusGeometry(3.1, 0.09, 6, 36),
        new THREE.MeshBasicMaterial({
          color: "#e2c077",
          transparent: true,
          opacity: 0.8,
        }),
        0,
        3,
        0,
      );
      const previous =
        RACE_TRACK[(i + RACE_TRACK.length - 1) % RACE_TRACK.length];
      gate.rotation.y = Math.atan2(p.x - previous.x, p.z - previous.z);
      this.group.add(gate);
      this.gates.push(gate);
    }
    g.ui.toast(
      "Balap Bocil Gowes: 2 lap. Ikuti gerbang emas secara berurutan.",
    );
    this.renderHUD();
  }
  action(action) {
    if (!this.active) return false;
    if (action === "quit-activity") {
      this.finish("Kegiatan dibatalkan. Tidak ada biaya atau penalti.", 0);
      return true;
    }
    if (["attack", "special"].includes(action)) {
      if (this.active === "football") this.kick(action === "special");
      return true;
    }
    if (
      [
        "mount",
        "capture",
        "companion",
        "rest",
        "equip-mount",
        "buy-mount",
        "interact",
      ].includes(action)
    ) {
      this.game.ui.toast(
        "Selesaikan kegiatan atau tekan tombol Keluar kegiatan.",
      );
      return true;
    }
    return false;
  }
  kick(pass = false) {
    if (this.countdown > 0 || this.kickTimer > 0) return;
    const g = this.game,
      b = this.ball.position;
    if (distance(g.state.data, b) > 3.7) {
      g.ui.toast("Dekati bola untuk menendang.");
      return;
    }
    let aim = { x: -18, z: 99 };
    if (pass) {
      const teammate = this.players
        .filter((p) => p.team === 0)
        .sort(
          (a, c) =>
            distance(a.model.position, b) - distance(c.model.position, b),
        )[0];
      aim = teammate.model.position;
    } else if (this.aim) {
      aim = this.aim;
      this.aim = null;
    }
    const dir = new THREE.Vector2(aim.x - b.x, aim.z - b.z).normalize();
    this.velocity.copy(dir).multiplyScalar(pass ? 24 : 39);
    this.kickTimer = 0.45;
    g.audio.play("hit");
    g.effects.burst(b.x, 0.7, b.z, "#e4dcb2", 8, 2);
  }
  update(dt, t) {
    if (!this.active) return;
    const g = this.game;
    this.kickTimer = Math.max(0, this.kickTimer - dt);
    if (this.countdown > 0) {
      this.countdown -= dt;
      g.keys.clear();
    g.ui.joystick?.reset();
      this.renderHUD();
      return;
    }
    if (this.active === "race") this.updateRace(dt, t);
    else this.updateFootball(dt, t);
    if (this.active) this.renderHUD();
  }
  updateRace(dt, t) {
    const g = this.game,
      d = g.state.data;
    const changed = this.race.step(this.previous, d, dt);
    this.previous = { x: d.x, z: d.z };
    if (changed) g.audio.play("collect");
    for (const r of this.racers) {
      if (r.progress.done) continue;
      const p = RACE_TRACK[r.progress.next],
        before = { x: r.model.position.x, z: r.model.position.z },
        dx = p.x - before.x,
        dz = p.z - before.z,
        len = Math.hypot(dx, dz),
        step = Math.min(
          r.speed * dt * (g.weather?.movementFactor(r.model.position) ?? 1),
          len,
        );
      if (len) {
        r.model.position.x += (dx / len) * step;
        r.model.position.z += (dz / len) * step;
        r.model.rotation.y = Math.atan2(dx, dz);
      }
      r.progress.step(before, r.model.position, dt);
      animateHuman(r.rider, t, true, true);
      r.bike.userData.wheels.forEach((w) => (w.rotation.z -= dt * r.speed));
    }
    const onTrack = RACE_TRACK.some(
      (p, i) =>
        segmentDistance(d, p, RACE_TRACK[(i + 1) % RACE_TRACK.length]) < 12,
    );
    if (!onTrack) {
      d.stamina = Math.max(0, d.stamina - dt * 5);
      this.offTrack = true;
    } else this.offTrack = false;
    this.gates.forEach((gate, i) => {
      gate.visible =
        i === this.race.next || i === (this.race.next + 1) % RACE_TRACK.length;
      gate.children[0].material.color.set(
        i === this.race.next ? "#e6c878" : "#84b9a5",
      );
    });
    g.waypoint = RACE_TRACK[this.race.next];
    if (this.race.done) {
      const position =
        1 +
        this.racers.filter(
          (r) => r.progress.done && r.progress.time < this.race.time,
        ).length;
      const sport = d.sports;
      if (position === 1) {
        sport.raceWins++;
        sport.bestRace =
          sport.bestRace === null
            ? this.race.time
            : Math.min(sport.bestRace, this.race.time);
        const reward = sport.lastRaceReward !== d.night ? 180 : 0;
        sport.lastRaceReward = d.night;
        this.finish(
          `Juara balap! 2 lap selesai dalam ${this.race.time.toFixed(1)} detik.`,
          reward,
        );
      } else
        this.finish(
          `Finis posisi ${position}. Waktu ${this.race.time.toFixed(1)} detik. Coba jalur dan tikungan yang lebih rapi!`,
          0,
        );
    } else if (this.race.time >= 180)
      this.finish(
        "Waktu balap habis. Semua checkpoint harus dilewati secara berurutan.",
        0,
      );
  }
  updateFootball(dt, t) {
    const g = this.game,
      d = g.state.data,
      b = this.ball.position;
    b.y = g.weather?.flooded ? g.weather.waterY + 0.3 : 0.35;
    d.x = clamp(d.x, -50, 14);
    d.z = clamp(d.z, 102, 184);
    // Friction and dribbling retain physical possession instead of teleporting the ball to a goal.
    b.x += this.velocity.x * dt;
    b.z += this.velocity.y * dt;
    this.velocity.multiplyScalar(Math.exp(-dt * 0.42));
    this.ball.rotation.x += this.velocity.y * dt * 0.2;
    this.ball.rotation.z -= this.velocity.x * dt * 0.2;
    if (
      this.kickTimer <= 0 &&
      distance(d, b) < 1.75 &&
      this.velocity.length() < 13
    ) {
      const fx = Math.sin(g.facing),
        fz = Math.cos(g.facing);
      b.x = d.x + fx * 1.65;
      b.z = d.z + fz * 1.65;
      this.velocity.set(0, 0);
    }
    for (const p of this.players) {
      const pos = p.model.position,
        isKeeper = p.team === 1 && p.home.z === 110;
      const nearest =
        this.players
          .filter(
            (a) => a.team === p.team && !(a.team === 1 && a.home.z === 110),
          )
          .sort(
            (a, c) =>
              distance(a.model.position, b) - distance(c.model.position, b),
          )[0] === p;
      const target = isKeeper
        ? { x: clamp(b.x, -22, -14), z: 108 }
        : nearest
          ? b
          : { x: p.home.x, z: clamp((b.z + p.home.z) / 2, 113, 174) };
      const dx = target.x - pos.x,
        dz = target.z - pos.z,
        len = Math.hypot(dx, dz);
      if (len > 0.7) {
        const speed =
          (isKeeper ? 3.8 : p.team === 0 ? 5.2 : 4.5) *
          (g.weather?.movementFactor(pos) ?? 1);
        pos.x += (dx / len) * speed * dt;
        pos.z += (dz / len) * speed * dt;
        p.model.rotation.y = Math.atan2(dx, dz);
      }
      animateHuman(p.model, t, len > 0.7, false);
      if (distance(pos, b) < 1.6 && this.kickTimer <= 0) {
        const aim = {
          x: -18 + Math.sin(t * 2 + p.home.x) * 4,
          z: p.team === 0 ? 99 : 187,
        };
        this.velocity
          .set(aim.x - b.x, aim.z - b.z)
          .normalize()
          .multiplyScalar(isKeeper ? 28 : 23);
        this.kickTimer = 0.55;
        g.audio.play("hit");
      }
    }
    if (b.x < -50 || b.x > 14) {
      b.x = clamp(b.x, -50, 14);
      this.velocity.x *= -0.65;
    }
    if (b.z < 101 || b.z > 185) {
      if (b.x > -23 && b.x < -13) {
        const team = b.z < 101 ? 0 : 1;
        this.match.goal(team);
        g.audio.play("capture");
        g.ui.toast(
          team === 0
            ? "GOOOL! Sukarame menambah skor!"
            : "Gol untuk lawan. Bangkit lagi!",
        );
        this.resetBall();
      } else {
        b.z = clamp(b.z, 101, 185);
        this.velocity.y *= -0.55;
      }
    }
    const result = this.match.tick(dt);
    if (result === "final") {
      g.ui.toast(
        "Menang semifinal! Final melawan Kampung Wetan dimulai.",
        "success",
      );
      this.resetBall();
    } else if (result === "champion") {
      d.sports.footballTitles++;
      const reward = d.sports.lastFootballReward !== d.night ? 350 : 0;
      d.sports.lastFootballReward = d.night;
      this.finish(
        "SUKARAME JUARA! Dua pertandingan dimenangkan. Piala Tarkam ditambahkan ke catatanmu.",
        reward,
      );
    } else if (result)
      this.finish(
        result === "draw"
          ? "Pertandingan seri. Daftar lagi untuk mengulang turnamen."
          : "Sukarame belum juara. Latih operan dan serangan lalu coba lagi.",
        0,
      );
  }
  renderHUD() {
    if (!this.active) return;
    let line, detail;
    if (this.active === "football") {
      line = `<span class="home-color">● SUKARAME</span><b>${this.match.score[0]} : ${this.match.score[1]}</b><span class="away-color">◆ ${this.match.round ? "WETAN" : "KULON"}</span>`;
      const remaining = Math.ceil(this.match.seconds);
      detail = `${this.match.round ? "FINAL" : "SEMIFINAL"} · ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
    } else {
      const rank =
        1 +
        this.racers.filter((r) => r.progress.passed > this.race.passed).length;
      line = `<span>LAP <b>${Math.min(2, this.race.lap + 1)}<small>/ 2</small></b></span><span>POSISI <b>${rank}<small>/ 4</small></b></span>`;
      detail = `${this.race.time.toFixed(1)} dtk · CP ${this.race.next + 1}/10`;
    }
    const score = this.hud.querySelector(".activity-score");
    if (score.innerHTML !== line) score.innerHTML = line;
    this.hud.querySelector(".activity-detail").textContent = detail;
    this.hud.querySelector(".activity-status").textContent =
      this.countdown > 0
        ? `Mulai ${Math.ceil(this.countdown)}…`
        : this.active === "race" && this.offTrack
          ? "Kembali ke jalur"
          : "";
    this.hud
      .querySelector(".sport-buttons")
      .classList.toggle("hidden", this.active !== "football");
    this.hud
      .querySelector(".activity-legend")
      .classList.toggle("hidden", this.active !== "football");
    this.hud
      .querySelector(".race-hint")
      .classList.toggle("hidden", this.active !== "race");
  }
  finish(message, reward) {
    const g = this.game,
      d = g.state.data;
    this.active = null;
    this.offTrack = false;
    this.group.visible = false;
    this.hud.classList.add("hidden");
    document.body.classList.remove(
      "activity-running",
      "activity-football",
      "activity-race",
    );
    g.keys.clear();
    g.ui.joystick?.reset();
    g.waypoint = null;
    d.coins += reward;
    Object.assign(d, {
      x: this.returnPoint.x,
      z: this.returnPoint.z,
      mount: this.returnPoint.mount,
      riding: this.returnPoint.riding,
    });
    g.cameraYaw = this.returnPoint.cameraYaw;
    g.cameraPitch = this.returnPoint.cameraPitch;
    g.cameraDistance = this.returnPoint.cameraDistance;
    g.equipMount();
    if (this.originalPlayer) {
      g.player = this.originalPlayer;
      this.originalPlayer = null;
      g.equipWeapon();
    }
    g.player.visible = !(d.riding && d.mount === "mecha");
    g.player.position.set(d.x, 0, d.z);
    if (g.companionModel) g.companionModel.visible = true;
    g.flashOn = this.returnPoint.flashOn;
    g.player.userData.holder.visible = true;
    g.state.save();
    g.ui.open("activity");
    document.querySelector(".panel-header h2").textContent =
      "Catatan kejuaraan";
    document.querySelector("#panel-content").innerHTML =
      `<div class="rest-card"><h3>${message}</h3><p>${reward ? `+${reward} koin hadiah kejuaraan.` : "Hadiah kemenangan tersedia satu kali per jenis kegiatan per malam."}</p><p>Piala Tarkam: ${d.sports.footballTitles} · Juara balap: ${d.sports.raceWins}<br/>Rekor balap: ${d.sports.bestRace === null ? "Belum ada" : d.sports.bestRace.toFixed(1) + " detik"}</p><button class="primary" data-action="close">Kembali ke kampung</button></div>`;
  }
}
