import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
  errors = [],
  checks = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (e) => {
  if (e.type() === "error") errors.push(e.text());
});
const check = async (name, fn) => {
  const value = await p.evaluate(fn);
  if (!value) console.log(await p.evaluate(() => window.weatherDebug));
  assert.ok(value, name + ": " + JSON.stringify(value));
  checks.push(name);
  console.log("PASS", name);
};
async function shot(name) {
  await p.evaluate(() => {
    const g = __ronda;
    g.ui.update(0.2);
    g.world.update(0, g.elapsed, g.state, g.state.data);
    g.weather.render(0);
    g.updateLight();
    g.updateCamera(1);
    g.renderer.render(g.scene, g.camera);
  });
  await p.screenshot({ path: "tmp/screenshots/weather-" + name + ".png" });
}
try {
  await p.goto("http://127.0.0.1:5173/?test=1");
  await p.waitForFunction(() => window.__ronda);
  await p.locator("[data-action=start]").click();
  await p.evaluate(() => {
    const g = __ronda;
    g.renderer.setAnimationLoop(null);
    g.audio.setEnabled(false);
    g.state.data.time = 720;
    g.life.update(0, 0);
    g.updateEnemies(0);
  });
  await check(
    "all eleven weather types render and preserve the invasion plan",
    () => {
      const g = __ronda,
        plan = JSON.stringify(g.state.data.incidents.plan);
      for (const type of [
        "clear",
        "cloudy",
        "rain",
        "storm",
        "haze",
        "tornado",
        "snow",
        "blizzard",
        "flood",
        "snowroad",
        "thunder",
      ]) {
        if (!g.weather.set(type, false)) return false;
        g.world.update(0, 0, g.state, g.state.data);
        g.weather.render(0.016);
        g.renderer.render(g.scene, g.camera);
      }
      return (
        plan === JSON.stringify(g.state.data.incidents.plan) &&
        g.world.trees.length > 100
      );
    },
  );
  await check(
    "ground player, enemies, NPCs and livestock slow down in flood; flight does not",
    () => {
      const g = __ronda,
        d = g.state.data;
      function player(type) {
        g.weather.set(type, false);
        Object.assign(d, { x: -65, z: -100, riding: false });
        g.cameraYaw = 0;
        g.keys.add("KeyW");
        g.updatePlayer(0.5);
        g.keys.clear();
        return -100 - d.z;
      }
      const a = player("clear"),
        b = player("flood");
      const e = g.enemies.find((e) => !e.incident && !e.dino && !e.def.air);
      function enemy(type) {
        g.weather.set(type, false);
        e.pos.set(-65, 0, -100);
        g.steer(e, -65, -120, 4, 0.5);
        return -100 - e.pos.z;
      }
      const c = enemy("clear"),
        dd = enemy("flood");
      Object.assign(d, { x: -65, z: -70 });
      const n = g.life.actors.find((n) => n.route.length > 1),
        oldRoute = n.route,
        oldPos = n.model.position.clone();
      function npc(type) {
        g.weather.set(type, false);
        n.incidentUnavailable = false;
        n.model.position.set(-65, 0, -100);
        n.route = [
          { x: -65, z: -120 },
          { x: -65, z: -100 },
        ];
        n.index = 0;
        g.life.update(0.5, 10);
        return -100 - n.model.position.z;
      }
      const nc = npc("clear"),
        nf = npc("flood");
      n.route = oldRoute;
      n.model.position.copy(oldPos);
      const animal = g.life.animals[0];
      function animalStep(type) {
        g.weather.set(type, false);
        animal.weatherClock = 5;
        animal.phase = 0;
        animal.model.position.x = animal.x + Math.sin(5 * 0.14) * 2;
        const before = animal.model.position.x;
        g.life.update(0.1, 5.1);
        return Math.abs(animal.model.position.x - before);
      }
      const ac = animalStep("clear"),
        af = animalStep("flood");
      window.weatherDebug = {
        a,
        b,
        c,
        dd,
        nc,
        nf,
        ac,
        af,
        air: g.weather.movementFactor(d, true),
      };
      return (
        Math.abs(b / a - 0.52) < 0.001 &&
        Math.abs(dd / c - 0.52) < 0.001 &&
        Math.abs(nf / nc - 0.52) < 0.001 &&
        af / ac > 0.5 &&
        af / ac < 0.54 &&
        g.weather.movementFactor(d, true) === 1
      );
    },
  );
  await check(
    "flood covers roads, animates blue water and allows fishing everywhere without blocking NPC talk",
    () => {
      const g = __ronda,
        d = g.state.data;
      g.weather.set("flood", false);
      Object.assign(d, { x: 0, z: 12 });
      g.updatePlayer(0);
      g.weather.render(0);
      const everywhere = [
        [0, 12],
        [-100, 100],
        [260, -230],
      ].every(([x, z]) => {
        Object.assign(d, { x, z });
        return g.frontier.fishingSpot()?.name === "Banjir Sukarame";
      });
      Object.assign(d, { x: 140, z: -77 });
      g.updateEnemies(0);
      g.life.update(0, 0);
      g.findInteraction();
      return (
        everywhere &&
        g.weather.floodPlane.visible &&
        g.weather.waterY > 0.8 &&
        g.interactable?.type === "npc" &&
        g.interactable.obj.def.id === "pemancing-0"
      );
    },
  );
  await p.evaluate(() => {
    const g = __ronda;
    Object.assign(g.state.data, { x: 38, z: 30 });
    g.cameraDistance = 37;
    g.cameraPitch = 0.58;
    g.cameraYaw = 0.3;
    g.updatePlayer(0);
    g.weather.time = 16;
    g.weather.render(0);
  });
  await shot("flood");
  await check(
    "snow leaves bounded footprints and reduces walking speed",
    () => {
      const g = __ronda,
        d = g.state.data;
      g.weather.set("snowroad", false);
      Object.assign(d, { x: -65, z: -100 });
      for (let i = 0; i < 25; i++) {
        d.z -= 1;
        g.weather.update(0.05);
      }
      g.weather.render(0);
      return (
        g.weather.footprints.length >= 20 &&
        g.weather.tracks.count <= 420 &&
        g.weather.snowGround.visible &&
        g.weather.movementFactor(d) === 0.7
      );
    },
  );
  await p.evaluate(() => {
    const g = __ronda;
    Object.assign(g.state.data, { x: 38, z: 30 });
    g.updatePlayer(0);
    g.weather.set("snow", false);
    for (let i = 0; i < 15; i++) {
      g.state.data.z += 1;
      g.updatePlayer(0);
      g.weather.update(0.05);
    }
    g.weather.render(0);
  });
  await shot("snow");
  await check(
    "lightning damages ghost, zombie, alien, UFO and dinosaur during an ongoing invasion",
    () => {
      const g = __ronda,
        d = g.state.data;
      Object.assign(d, { time: 1200, x: 65, z: -100 });
      d.incidents.labBuilt = true;
      g.incidents.start("alien");
      const ghost = g.enemies.find(
        (e) => !e.human && !e.incident && !e.dino && !e.raid,
      );
      ghost.active = true;
      ghost.hp = ghost.maxHp;
      ghost.pos.set(60, 0, -100);
      const actors = [
        ghost,
        ...["zombie", "alien", "saucer", "raptor", "rex", "mothership"].map(
          (id, i) => g.incidents.spawn(id, 75 + i * 6, -100),
        ),
      ];
      g.weather.set("thunder", false);
      const before = actors.map((e) => e.hp),
        event = g.incidents.event;
      actors.forEach((e) =>
        g.weather.strike(g.weather.targets().find((t) => t.ref === e)),
      );
      return (
        actors.every((e, i) => e.hp < before[i]) &&
        g.incidents.event === event &&
        event.type === "alien" &&
        g.weather.data.fires.length >= actors.length
      );
    },
  );
  await check(
    "petir ignites houses, buildings and trees; fires continue damaging houses and can be extinguished",
    () => {
      const g = __ronda,
        w = g.weather;
      for (const kind of ["house", "building", "tree"]) {
        const t = w.staticTargets.find(
          (t) => t.kind === kind && Math.hypot(t.pos.x, t.pos.z) > 25,
        );
        w.strike(t);
        if (!w.data.fires.some((f) => f.key === t.key)) return false;
      }
      const h = w.staticTargets.find(
          (t) => t.kind === "house" && Math.hypot(t.pos.x, t.pos.z) > 25,
        ),
        before = g.state.data.incidents.houses[h.ref.id];
      w.update(1.1);
      const after = g.state.data.incidents.houses[h.ref.id];
      Object.assign(g.state.data, { x: h.pos.x + 2, z: h.pos.z });
      const it = w.interactions().find((it) => it.obj === h.key);
      if (!it) return false;
      w.interact(it);
      return after < before && !w.data.fires.some((f) => f.key === h.key);
    },
  );
  await check(
    "lightning burns citizens and livestock; injured victims can be rescued with E",
    () => {
      const g = __ronda,
        w = g.weather;
      const victims = [
        g.incidents.victim("warga-malam-0"),
        g.incidents.victim("animal-3"),
      ];
      for (const v of victims) {
        if (!v) return false;
        g.incidents.rescue(v.id, false);
        v.model.position.set(-70, 0, -110);
        const target = {
          key: "resident:" + v.id,
          kind: "resident",
          ref: v,
          pos: v.model.position,
        };
        w.strike(target);
        w.strike(target);
        w.strike(target);
        if (g.state.data.incidents.residents[v.id]?.condition !== "injured")
          return false;
        Object.assign(g.state.data, { x: -69, z: -110 });
        const it = w
          .interactions()
          .find((i) => i.type === "weather-rescue" && i.obj === v.id);
        if (!it) return false;
        w.interact(it);
        if (g.state.data.incidents.residents[v.id]) return false;
      }
      return true;
    },
  );
  await check(
    "player takes electrical damage even on magic-proof mecha; pos ronda stays safe",
    () => {
      const g = __ronda,
        d = g.state.data;
      Object.assign(d, {
        x: 65,
        z: -100,
        mount: "mecha",
        riding: true,
        hp: 100,
      });
      g.cooldowns.hurt = 0;
      g.weather.strike(g.weather.targets().find((t) => t.kind === "player"));
      const damaged = d.hp < 100;
      Object.assign(d, {
        x: 0,
        z: 12,
        hp: 100,
        riding: false,
        mount: "onthel",
      });
      g.cooldowns.hurt = 0;
      g.weather.strike(g.weather.targets().find((t) => t.kind === "player"));
      return damaged && d.hp === 100;
    },
  );
  await check(
    "tornado pursues residents and houses, pulls victims and destroys houses without replacing an invasion",
    () => {
      const g = __ronda,
        w = g.weather,
        event = g.incidents.event;
      w.set("tornado", false);
      const h = w.staticTargets.find(
        (t) => t.kind === "house" && Math.hypot(t.pos.x, t.pos.z) > 35,
      );
      g.state.data.incidents.houses[h.ref.id] = 100;
      w.tornado.position.set(h.pos.x, 0, h.pos.z + 1);
      w.tornadoTarget = h;
      w.targetTimer = 100;
      const a = g.incidents.victim("animal-0");
      g.incidents.rescue(a.id, false);
      a.model.position.set(h.pos.x + 8, 0, h.pos.z + 8);
      for (let i = 0; i < 150; i++) w.updateTornado(0.03, w.targets());
      g.incidents.updateHouses();
      return (
        g.state.data.incidents.houses[h.ref.id] === 0 &&
        h.ref.rubble.visible &&
        !h.ref.group.visible &&
        w.data.health[a.id] < 100 &&
        event === g.incidents.event
      );
    },
  );
  await p.evaluate(() => {
    const g = __ronda,
      h = g.world.houses.find((h) => Math.hypot(h.x, h.z) > 35);
    Object.assign(g.state.data, {
      time: 900,
      x: h.x + 23,
      z: h.z + 25,
      riding: false,
    });
    g.weather.tornado.position.set(h.x, 0, h.z);
    g.cameraDistance = 58;
    g.cameraPitch = 0.5;
    g.cameraYaw = 0.25;
    g.updatePlayer(0);
    g.weather.time = 12;
  });
  await shot("tornado");
  await check(
    "dawn rebuilds weather-damaged houses and restores injured residents and animals",
    () => {
      const g = __ronda;
      g.state.data.time = 360;
      g.state.data.incidents.recoveredNight = -1;
      g.rural.restoreMorning();
      return (
        g.world.houses.every(
          (h) => (g.state.data.incidents.houses[h.id] ?? 100) === 100,
        ) &&
        Object.keys(g.state.data.incidents.residents).length === 0 &&
        g.weather.data.fires.length === 0
      );
    },
  );
  await p.evaluate(() => {
    const g = __ronda;
    g.weather.set("clear", false);
    Object.assign(g.state.data, { x: 140, z: -77, time: 720, riding: false });
    g.cameraDistance = 24;
    g.cameraPitch = 0.58;
    g.cameraYaw = 0;
    g.altitude = 0;
    g.life.update(0, 20);
    g.updateEnemies(0);
    g.findInteraction();
    g.interact();
  });
  await p.locator("[data-action=accept-quest][data-id=bowo-tirta]").click();
  await check(
    "angler NPC offers playable quest and one-time bait gift",
    () =>
      __ronda.state.data.quests["bowo-tirta"] === "active" &&
      __ronda.state.data.frontier.bag.bait === 12,
  );
  await check(
    "six real casts consume bait, store fish weights, and show held fish and raised arms",
    () => {
      const g = __ronda,
        d = g.state.data;
      d.frontier.rod = 1;
      Object.assign(d, { x: 140, z: -84 });
      g.swing = 0;
      g.updatePlayer(0);
      for (let i = 0; i < 6; i++) {
        g.frontier.cast(g.frontier.fishingSpot());
        g.frontier.update(g.frontier.fishing.wait + 0.01, 30 + i);
        g.frontier.reel();
      }
      g.frontier.update(0.4, 40);
      return (
        d.stats.anglerCatches === 6 &&
        d.frontier.bag.bait === 6 &&
        d.frontier.fishLog.length === 6 &&
        d.frontier.fishLog.every((c) => c.kg > 0 && c.cm > 0) &&
        g.frontier.catchModel?.parent === g.player &&
        g.player.userData.arms.every((a) => a.rotation.x < -2) &&
        !g.frontier.celebrationHud.classList.contains("hidden")
      );
    },
  );
  await shot("catch");
  await p.evaluate(() => {
    const g = __ronda;
    Object.assign(g.state.data, { x: 140, z: -77 });
    g.ui.dialogue(g.npcs.find((n) => n.def.id === "pemancing-0").def);
  });
  await p.locator("[data-action=claim-quest][data-id=bowo-tirta]").click();
  await check(
    "turning in quest equips Joran Tirta and prevents repeated rewards",
    () =>
      __ronda.state.data.frontier.rod === 3 &&
      __ronda.state.data.quests["bowo-tirta"] === "done" &&
      !__ronda.state.claimQuest("bowo-tirta"),
  );
  await check(
    "legendary catch works after all five night posts and is recorded in the journal",
    () => {
      const g = __ronda,
        d = g.state.data;
      Object.assign(d, { x: 140, z: -84, time: 1200 });
      d.posts = g.state.patrolPosts.map((p) => p.id);
      g.frontier.cast(g.frontier.fishingSpot());
      g.frontier.update(g.frontier.fishing.wait + 0.1, 42);
      const original = Math.random;
      try {
        Math.random = () => 0.999;
        g.frontier.reel();
      } finally {
        Math.random = original;
      }
      g.frontier.update(0.4, 43);
      return (
        d.frontier.fishLog.at(-1).id === "naga-sungai" &&
        d.frontier.bag["naga-sungai"] === 1 &&
        g.frontier.journal().includes("Raja Naga Sungai")
      );
    },
  );
  await shot("legendary");
  await check(
    "catch voice is real playable bundled Indonesian audio and obeys mute",
    async () => {
      const g = __ronda,
        b = await (await fetch("/audio/mancing-mania.wav")).arrayBuffer(),
        ctx = g.audio.ctx;
      const audio = await ctx.decodeAudioData(b);
      if (audio.duration < 1 || audio.duration > 8) return false;
      g.audio.setEnabled(true);
      g.audio.fishCheer();
      await new Promise((r) => setTimeout(r, 250));
      const playing = !g.audio.fishVoice.paused;
      g.audio.setEnabled(false);
      return playing && g.audio.fishVoice.paused;
    },
  );
  await check("catch presentation expires and restores equipped weapon", () => {
    const g = __ronda;
    g.frontier.update(5, 49);
    return (
      !g.frontier.catchModel &&
      g.player.userData.holder.visible &&
      g.frontier.celebrationHud.classList.contains("hidden")
    );
  });
  await check(
    "fish reel touch button remains the same DOM node during updates",
    () => {
      const g = __ronda;
      g.frontier.cast(g.frontier.fishingSpot());
      g.frontier.update(0.1, 50);
      const button = g.frontier.hud.querySelector("[data-action=fish-reel]");
      g.frontier.update(0.1, 51);
      const stable =
        button === g.frontier.hud.querySelector("[data-action=fish-reel]");
      g.frontier.cancelFishing();
      return stable;
    },
  );
  await p.setViewportSize({ width: 844, height: 390 });
  await p.waitForTimeout(150);
  await p.evaluate(() => {
    const g = __ronda;
    g.weather.set("thunder", false);
    Object.assign(g.state.data, { x: 40, z: 30 });
    g.updatePlayer(0);
    g.ui.update(0.2);
  });
  await shot("mobile");
  await check(
    "weather HUD stays above the central play area on mobile landscape",
    () => {
      const r = document.querySelector("#weather-hud").getBoundingClientRect();
      return r.top >= 0 && r.bottom < innerHeight * 0.35 && r.width < 220;
    },
  );
  await check(
    "save reload preserves weather cycle, fishing records and upgraded rod",
    () => {
      const g = __ronda,
        d = g.state.data;
      d.weather.elapsed = 42;
      d.weather.index = 15;
      g.state.save();
      g.state.load();
      return (
        g.state.data.weather.elapsed === 42 &&
        g.state.data.weather.index === 15 &&
        g.state.data.frontier.rod === 3 &&
        g.state.data.frontier.fishRecords["naga-sungai"].count === 1
      );
    },
  );
  await check(
    "main game loop runs every weather alongside a live zombie invasion",
    () => {
      const g = __ronda,
        d = g.state.data;
      g.incidents.clearActors();
      d.incidents.event = null;
      d.incidents.labBuilt = true;
      d.time = 1200;
      g.incidents.start("zombie");
      g.incidents.spawnWave();
      Object.assign(d, { x: 0, z: 12, hp: g.state.maxHp });
      g.deathTimer = 0;
      g.cooldowns.hurt = 0;
      for (const type of [
        "clear",
        "cloudy",
        "rain",
        "storm",
        "haze",
        "tornado",
        "snow",
        "blizzard",
        "flood",
        "snowroad",
        "thunder",
      ]) {
        g.weather.set(type, false);
        for (let i = 0; i < 8; i++) g.frame(g.lastTime + 50);
      }
      return (
        d.incidents.event.type === "zombie" &&
        g.incidents.actors.some((e) => e.active) &&
        g.weather.data.elapsed > 0 &&
        g.audio.weatherGain != null
      );
    },
  );
  const mobileContext = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const mobile = await mobileContext.newPage();
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto("http://127.0.0.1:5173/?test=1");
  await mobile.waitForFunction(() => window.__ronda);
  await mobile.locator("[data-action=start]").click();
  await mobile.evaluate(() => {
    const g = __ronda;
    g.audio.setEnabled(false);
    g.state.data.time = 720;
    g.weather.set("flood", false);
    g.state.data.frontier.rod = 1;
    g.state.data.frontier.bag.bait = 2;
    g.frontier.cast(g.frontier.fishingSpot());
    g.frontier.fishing.wait = 0.2;
  });
  await mobile
    .locator("#fishing-hud strong")
    .filter({ hasText: "Ikan menyambar!" })
    .waitFor();
  await mobile.locator("#fishing-hud [data-action=fish-reel]").tap();
  await mobile.locator("#fish-celebration").waitFor({ state: "visible" });
  assert.ok(await mobile.evaluate(() => __ronda.state.data.stats.fished === 1));
  console.log("PASS actual landscape touch reel catches fish during flood");
  checks.push("actual landscape touch reel catches fish during flood");
  await mobile.waitForTimeout(400);
  await mobile.screenshot({ path: "tmp/screenshots/weather-touch.png" });
  await mobileContext.close();
  assert.deepEqual(errors, []);
  console.log("PASS no browser errors");
  checks.push("no browser errors");
  await fs.writeFile(
    "tmp/weather-validation.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} finally {
  await browser.close();
}
