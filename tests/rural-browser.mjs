import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const p = await browser.newPage({ viewport: { width: 1440, height: 960 } }),
  errors = [],
  checks = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (e) => {
  if (e.type() === "error") errors.push(e.text());
});
async function check(name, fn) {
  assert.ok(await p.evaluate(fn), name);
  checks.push(name);
  console.log("PASS", name);
}
async function update() {
  await p.evaluate(() => {
    const g = __ronda;
    g.updatePlayer(0);
    g.updateEnemies(0);
    g.life.update(0, g.elapsed);
    g.incidents.update(0, g.elapsed);
    g.findInteraction();
    g.ui.update(0.2);
  });
}
try {
  await p.goto("http://127.0.0.1:5173/?test=1");
  await p.waitForFunction(() => window.__ronda);
  await p.locator("[data-action=start]").click();
  await p.evaluate(() => {
    __ronda.renderer.setAnimationLoop(null);
    __ronda.audio.enabled = false;
  });
  await check(
    "farm has all five requested species and ten extra night residents",
    () =>
      new Set(__ronda.life.animals.filter((a) => a.kind).map((a) => a.kind))
        .size === 5 &&
      __ronda.npcs.filter(
        (n) => n.def.id.startsWith("tetangga-") && n.def.night,
      ).length === 10,
  );
  await check(
    "church beside mosque has pastor and three nuns; new spawns are walkable",
    () => {
      const g = __ronda;
      const n = g.npcs.filter(
        (n) =>
          ["pastor", "mulyono"].includes(n.def.id) ||
          n.def.id.startsWith("suster-") ||
          n.def.id.startsWith("tetangga-"),
      );
      return (
        n.length === 15 &&
        g.world.ruralWorld.church.position.x === 29 &&
        n.every((n) => g.world.canMove(n.def.x, n.def.z, 0.35)) &&
        g.life.animals
          .filter((a) => a.kind)
          .every((a) => g.world.canMove(a.x, a.z, 0.35))
      );
    },
  );
  await p.evaluate(() => {
    const g = __ronda;
    Object.assign(g.state.data, { x: -112, z: 207, time: 600 });
    g.ui.dialogue(g.npcs.find((n) => n.def.id === "mulyono").def);
  });
  await p.locator("[data-action=accept-quest]").click();
  for (let i = 2; i < 7; i++) {
    await p.evaluate((i) => {
      const g = __ronda,
        a = g.life.animals[i];
      Object.assign(g.state.data, {
        x: a.model.position.x,
        z: a.model.position.z,
      });
      g.findInteraction();
    }, i);
    await p.keyboard.press("KeyE");
  }
  await check(
    "feeding five different animals advances Mulyono quest without charging coins",
    () =>
      __ronda.state.data.stats.farmCare === 5 &&
      new Set(__ronda.state.data.rural.cared).size === 5 &&
      __ronda.state.data.coins === 160,
  );
  await p.evaluate(() =>
    __ronda.ui.dialogue(__ronda.npcs.find((n) => n.def.id === "mulyono").def),
  );
  await p.locator("[data-action=claim-quest]").click();
  await p.keyboard.press("KeyB");
  await check(
    "quest equips white winged Sembrani and flies clear of farm buildings",
    () => {
      const g = __ronda;
      g.state.data.x = -126;
      g.state.data.z = 194;
      g.updatePlayer(0.1);
      g.ui.update(0.2);
      return (
        g.state.data.mount === "sembrani" &&
        g.isFlying &&
        g.altitude >= g.world.flightClearance(-126, 194) &&
        g.bike.userData.wings.length === 2 &&
        !document.querySelector("#mount-status").classList.contains("hidden")
      );
    },
  );
  await p.keyboard.press("KeyB");
  await check(
    "Sembrani dismount finds clear ground",
    () =>
      !__ronda.state.data.riding &&
      __ronda.altitude === 0 &&
      __ronda.world.canMove(__ronda.state.data.x, __ronda.state.data.z),
  );
  await p.evaluate(() => {
    const g = __ronda,
      d = g.state.data;
    d.quests["et-home"] = "done";
    d.mounts.push("ufo");
    d.incidents.tech.etDeparted = true;
    d.stats.ufoDown = 3;
    g.ui.dialogue(
      g.incidents.npcDialogue(g.npcs.find((n) => n.def.id === "et").def),
    );
  });
  await p.locator("[data-action=accept-quest]").click();
  await p.evaluate(() =>
    __ronda.ui.dialogue(
      __ronda.incidents.npcDialogue(
        __ronda.npcs.find((n) => n.def.id === "et").def,
      ),
    ),
  );
  await p.locator("[data-action=claim-quest]").click();
  await check(
    "ET follow-up installs tractor technology",
    () =>
      __ronda.state.data.incidents.tech.ufoTractor &&
      __ronda.state.data.quests["et-tractor"] === "done",
  );
  await p.evaluate(() => {
    const g = __ronda,
      d = g.state.data;
    Object.assign(d, {
      time: 1200,
      x: -118,
      z: 175,
      mount: "ufo",
      riding: true,
    });
    g.altitude = 28;
    g.equipMount();
    g.updateEnemies(0);
    const e = g.enemies.find((e) => e.def.id === "pocong");
    e.pos.set(-116, 0, 175);
    g.lockedTarget = e;
  });
  await p.keyboard.press("KeyU");
  await check("first U lifts a ghost and stops its AI while held", () => {
    const g = __ronda;
    for (let i = 0; i < 30; i++) {
      g.tractor.update(0.1);
      g.updateEnemies(0.1);
    }
    const e = g.tractor.held?.e;
    return e && e.heldByPlayer && e.pos.y > 20 && e.pos.x === g.state.data.x;
  });
  await check("second U drops a ghost without physical damage", () => {
    const g = __ronda,
      e = g.tractor.held.e,
      hp = e.hp;
    g.action("tractor");
    for (let i = 0; i < 50; i++) g.tractor.update(0.1);
    return !g.tractor.held && !e.heldByPlayer && e.hp === hp && e.pos.y === 0;
  });
  await check(
    "missile volley is harmless to ghost while plasma still damages it",
    () => {
      const g = __ronda,
        d = g.state.data,
        e = g.lockedTarget;
      d.mount = "mecha";
      d.incidents.tech.mechaFlight = true;
      g.mechaAirborne = true;
      g.equipMount();
      const hp = e.hp;
      g.action("missiles");
      const count = g.ranged.shots.length;
      for (let i = 0; i < 100; i++) g.ranged.update(0.05);
      const immune = e.hp === hp;
      g.mountCombat.timer = 0;
      g.mountCombat.fire();
      return count === 3 && immune && e.hp < hp;
    },
  );
  await check("lift and fall damage works on physical invaders", () => {
    const g = __ronda,
      d = g.state.data;
    d.night++;
    g.incidents.sync();
    g.incidents.start("zombie");
    const e = g.incidents.spawn("titan", -117, 175, { house: 0, route: 4 });
    d.mount = "ufo";
    g.equipMount();
    g.altitude = 28;
    g.lockedTarget = e;
    const hp = e.hp;
    g.action("tractor");
    for (let i = 0; i < 40; i++) g.tractor.update(0.1);
    g.action("tractor");
    for (let i = 0; i < 50; i++) g.tractor.update(0.1);
    return (
      e.hp < hp - 100 &&
      !e.heldByPlayer &&
      g.world.canMove(e.pos.x, e.pos.z, 0.35)
    );
  });
  await check(
    "all enemy types and boss match level while preserving their HP percentage",
    () => {
      const g = __ronda;
      g.life.dispatch(0);
      const before = g.enemies.map((e) => e.hp / e.maxHp);
      g.state.data.level = 9;
      g.updateEnemies(0);
      return (
        g.enemies.every(
          (e, i) =>
            e.level === 9 &&
            e.maxHp > e.def.hp &&
            Math.abs(e.hp / e.maxHp - before[i]) < 1e-8,
        ) && g.incidents.actors.some((e) => e.def.boss && e.level === 9)
      );
    },
  );
  await check(
    "zombies infect livestock using an animated infected animal model",
    () => {
      const g = __ronda,
        v = g.incidents.victim("animal-2");
      g.incidents.infect(v);
      const e = g.incidents.actors.find(
        (e) => e.incident.residentId === "animal-2",
      );
      g.incidents.updateZombie(e, 0.1, 0);
      return (
        e.model.userData.kind === "cow" &&
        v.animal.incidentUnavailable &&
        g.state.data.incidents.residents[v.id].condition === "infected"
      );
    },
  );
  await check("UFO can abduct a farm horse", () => {
    const g = __ronda,
      v = g.incidents.victim("animal-4"),
      e = g.incidents.spawn("saucer", v.model.position.x, v.model.position.z, {
        house: 0,
      });
    e.pos.y = 14;
    e.incident.victim = v.id;
    for (let i = 0; i < 42; i++) g.incidents.updateAlien(e, 0.1, 0);
    return (
      v.animal.incidentUnavailable &&
      ["abducted", "aboard"].includes(
        g.state.data.incidents.residents[v.id]?.condition,
      )
    );
  });
  await check(
    "dawn fully rebuilds houses and restores infected/abducted citizens and animals for free",
    () => {
      const g = __ronda,
        d = g.state.data,
        h = g.world.houses[0];
      g.incidents.damageHouse(h, 200);
      g.incidents.infect(g.incidents.victim("tetangga-0-0"));
      g.incidents.restrain(
        g.incidents.victim("tetangga-0-1"),
        "aboard",
        "mothership",
      );
      d.incidents.lostCaptives.push("tetangga-0-1");
      g.incidents.event.phase = "active";
      const coins = d.coins,
        rescued = d.stats.rescued;
      d.time = 360;
      g.incidents.update(0.1, g.elapsed);
      return (
        d.coins === coins &&
        d.stats.rescued === rescued &&
        d.incidents.houses[h.id] === 100 &&
        h.group.visible &&
        !h.rubble.visible &&
        !h.collider.disabled &&
        Object.keys(d.incidents.residents).length === 0 &&
        d.incidents.lostCaptives.length === 0 &&
        g.rural.workers.length >= 2 &&
        g.npcs
          .filter((n) => n.def.id.startsWith("tetangga"))
          .every((n) => !n.incidentUnavailable) &&
        g.life.animals.every((a) => !a.incidentUnavailable)
      );
    },
  );
  await check(
    "morning recovery runs once and builder animations finish",
    () => {
      const g = __ronda,
        c = g.rural.workers.length;
      g.rural.restoreMorning();
      const once = g.rural.workers.length === c;
      g.rural.update(13, 3);
      return once && g.rural.workers.length === 0;
    },
  );
  await p.evaluate(() => {
    const g = __ronda;
    g.tractor.reset();
    Object.assign(g.state.data, {
      x: -121,
      z: 177,
      time: 600,
      mount: "sembrani",
      riding: true,
    });
    g.equipMount();
    g.altitude = 12;
    g.elapsed = 10;
    g.updatePlayer(0);
    g.life.update(0, 10);
    g.rural.update(0, 10);
    g.lockedTarget = null;
    g.target = null;
    g.findInteraction();
    g.camera.position.set(-92, 24, 195);
    g.camera.lookAt(-131, 3, 171);
    g.world.update(0, 10, g.state, g.state.data);
    g.updateLight();
    g.ui.tipTimer = 0;
    g.ui.update(10);
    document.querySelector("#toast").classList.remove("show");
    document.querySelector("#area-banner").classList.remove("visible");
    g.renderer.render(g.scene, g.camera);
  });
  await fs.mkdir("tmp/screenshots", { recursive: true });
  await p.screenshot({ path: "tmp/screenshots/rural-farm.png" });
  await p.evaluate(() => {
    const g = __ronda;
    Object.assign(g.state.data, { x: 29, z: -147, time: 600, riding: false });
    g.altitude = 0;
    g.updatePlayer(0);
    g.life.update(0, 10);
    g.updateEnemies(0);
    g.findInteraction();
    g.world.update(0, 10, g.state, g.state.data);
    g.updateLight();
    g.camera.position.set(-3, 25, -113);
    g.camera.lookAt(43, 7, -179);
    g.ui.update(0.2);
    g.renderer.render(g.scene, g.camera);
  });
  await p.screenshot({ path: "tmp/screenshots/rural-church.png" });
  await p.evaluate(() => __ronda.state.save());
  await p.reload();
  await p.waitForFunction(() => window.__ronda);
  await check(
    "new quests, mounts, technology, level and morning recovery survive reload",
    () => {
      const d = __ronda.state.data;
      return (
        d.mounts.includes("sembrani") &&
        d.incidents.tech.ufoTractor &&
        d.level === 9 &&
        d.quests["farm-care"] === "done" &&
        d.incidents.recoveredNight === d.night
      );
    },
  );
  assert.deepEqual(errors, []);
  const touchContext = await browser.newContext({
      viewport: { width: 844, height: 390 },
      isMobile: true,
      hasTouch: true,
    }),
    m = await touchContext.newPage();
  m.on("pageerror", (e) => errors.push(e.message));
  await m.goto("http://127.0.0.1:5173/?test=1");
  await m.waitForFunction(() => window.__ronda);
  await m.locator("[data-action=start]").click();
  await m.evaluate(() => {
    const g = __ronda;
    g.renderer.setAnimationLoop(null);
    g.audio.enabled = false;
    Object.assign(g.state.data, {
      x: -118,
      z: 175,
      time: 1200,
      mount: "ufo",
      riding: true,
    });
    g.state.data.incidents.tech.ufoTractor = true;
    g.altitude = 28;
    g.equipMount();
    g.updateEnemies(0);
    const e = g.enemies.find((e) => e.def.id === "pocong");
    e.pos.set(-116, 0, 175);
    g.lockedTarget = e;
    g.ui.update(0.2);
  });
  await m.locator("[data-action=tractor]").tap();
  assert.ok(await m.evaluate(() => !!__ronda.tractor.held));
  await m.evaluate(() => {
    for (let i = 0; i < 30; i++) __ronda.tractor.update(0.1);
  });
  await m.locator("[data-action=tractor]").tap();
  assert.ok(
    await m.evaluate(
      () => !__ronda.tractor.held && __ronda.tractor.falling.length === 1,
    ),
  );
  checks.push(
    "UFO tractor control lifts and releases through touch in landscape",
  );
  console.log("PASS", checks.at(-1));
  await m.evaluate(() => {
    const g = __ronda;
    g.tractor.reset();
    g.lockedTarget.pos.set(-116, 0, 175);
    g.action("tractor");
    g.tractor.update(0.5);
    g.state.data.x = 0;
    g.state.data.z = 12;
    g.tractor.update(0.1);
    for (let i = 0; i < 50; i++) g.tractor.update(0.1);
  });
  assert.ok(
    await m.evaluate(
      () =>
        !__ronda.tractor.held &&
        !__ronda.lockedTarget.heldByPlayer &&
        Math.hypot(__ronda.lockedTarget.pos.x, __ronda.lockedTarget.pos.z) > 24,
    ),
  );
  checks.push(
    "entering pos ronda releases the held enemy outside its protected boundary",
  );
  console.log("PASS", checks.at(-1));
  await touchContext.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: checks.length, errors }));
} finally {
  if (errors.length) console.log(errors);
  await browser.close();
}
