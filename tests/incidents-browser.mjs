import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const b = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const p = await b.newPage({ viewport: { width: 1440, height: 960 } }),
  errors = [],
  checks = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (e) => {
  if (e.type() === "error") errors.push(e.text());
});
const check = (name, value) => {
  assert.ok(value, name);
  checks.push(name);
  console.log("PASS", name);
};
const evalCheck = async (name, fn) => check(name, await p.evaluate(fn));
const move = async (x, z, time = 600) =>
  p.evaluate(
    ({ x, z, time }) => {
      const g = __ronda;
      g.ui.close();
      Object.assign(g.state.data, { x, z, time, riding: false });
      g.altitude = 0;
      g.updateEnemies(0);
      g.life.update(0, g.elapsed);
      g.incidents.update(0, g.elapsed);
      g.updatePlayer(0);
      g.findInteraction();
    },
    { x, z, time },
  );
const npc = async (id) => {
  await p.evaluate((id) => {
    const g = __ronda,
      n = g.npcs.find((n) => n.def.id === id);
    g.ui.dialogue(g.incidents.npcDialogue(n.def));
  }, id);
};
try {
  await p.goto("http://127.0.0.1:5173/?test=1");
  await p.waitForFunction(() => window.__ronda);
  await p.locator('[data-action="start"]').click();
  await p.evaluate(() => {
    __ronda.renderer.setAnimationLoop(null);
    __ronda.audio.enabled = false;
  });
  await evalCheck(
    "new village starts with construction site",
    () =>
      !__ronda.state.data.incidents.labBuilt &&
      __ronda.world.incidentWorld.construction.visible,
  );
  await move(227, -212);
  await evalCheck(
    "first dawn opens the factory and all six quest pickups are accessible",
    () =>
      __ronda.state.data.incidents.labBuilt &&
      __ronda.world.incidentWorld.factory.visible &&
      __ronda.world.incidentWorld.pickups.every((p) =>
        __ronda.world.canMove(p.x, p.z),
      ),
  );
  await npc("william");
  await p.locator('[data-action="accept-quest"]').click();
  for (const [x, z] of [
    [213, -211],
    [251, -211],
    [258, -249],
  ]) {
    await move(x, z);
    await p.keyboard.press("KeyE");
  }
  await move(227, -212);
  await npc("william");
  await p.locator('[data-action="claim-quest"]').click();
  await evalCheck(
    "collecting and delivering data awards equipped Laras Surya and three serum",
    () =>
      __ronda.state.data.weapon === "laras-surya" &&
      __ronda.state.data.incidents.tech.serum === 3,
  );
  await npc("william");
  await p.locator('[data-action="mix-serum"]').click();
  await evalCheck(
    "serum crafting charges materials and preserves William dialogue",
    () =>
      __ronda.state.data.incidents.tech.serum === 4 &&
      __ronda.state.data.herb === 3 &&
      document.querySelector(".dialogue-content h2").textContent ===
        "Prof William",
  );
  await p.locator('[data-action="accept-quest"]').click();
  await evalCheck(
    "a random eligible night starts automatically and spawns first zombie wave",
    () => {
      const g = __ronda;
      g.state.data.time = 1200;
      g.state.data.incidents.plan = {
        night: g.state.data.night,
        kind: "zombie",
        start: 1170,
      };
      g.incidents.update(7.1, 0);
      return (
        g.incidents.event.type === "zombie" &&
        g.incidents.event.wave === 1 &&
        g.incidents.actors.length === 6
      );
    },
  );
  await evalCheck(
    "ranged projectile hits a zombie at distance and deals bonus solar damage",
    () => {
      const g = __ronda,
        e = g.incidents.actors[0];
      Object.assign(g.state.data, { x: 190, z: -170 });
      e.pos.set(190, 0, -190);
      g.lockedTarget = e;
      g.cooldowns.attack = 0;
      const before = e.hp;
      g.attack();
      for (let i = 0; i < 30; i++) g.ranged.update(0.05);
      return before - e.hp === 54 && g.ranged.shots.length === 0;
    },
  );
  await evalCheck(
    "infected citizens become enemies, then sick survivors who can be cured",
    () => {
      const g = __ronda,
        v = g.incidents.victim("warga-malam-0");
      g.incidents.infect(v);
      g.incidents.applyResidents();
      const infected = g.incidents.actors.find(
        (e) => e.incident.residentId === v.id,
      );
      if (!infected || v.model.visible) return false;
      g.damageEnemy(infected, 1000);
      g.incidents.applyResidents();
      const sick = g.state.data.incidents.residents[v.id]?.condition === "sick";
      g.incidents.interact({ type: "cure", obj: v.id });
      return (
        sick &&
        !g.state.data.incidents.residents[v.id] &&
        g.state.data.incidents.tech.serum === 3 &&
        v.model.visible
      );
    },
  );
  await evalCheck("santri defenders attack zombies near mosque", () => {
    const g = __ronda,
      n = g.npcs.find((n) => n.def.outfit === "santri"),
      e = g.incidents.spawn(
        "zombie",
        n.model.position.x + 5,
        n.model.position.z,
        { house: 0 },
      );
    const hp = e.hp;
    g.incidents.defenders(1.3, 0);
    return e.hp < hp;
  });
  await evalCheck(
    "uncleared waves progress to the giant boss and invaders reach civilian homes",
    () => {
      const g = __ronda;
      Object.assign(g.state.data, { x: 0, z: 12 });
      for (let i = 0; i < 2400; i++) {
        g.elapsed += 0.1;
        g.life.update(0.1, g.elapsed);
        g.incidents.update(0.1, g.elapsed);
        g.effects.update(0.1);
      }
      return (
        g.incidents.event.wave === 4 &&
        g.incidents.actors.some((e) => e.def.kind === "titan") &&
        Object.values(g.state.data.incidents.houses).some((hp) => hp < 100) &&
        g.incidents.actors.every(
          (e) => !e.active || Math.hypot(e.pos.x, e.pos.z) > 23,
        )
      );
    },
  );
  await evalCheck(
    "giant boss physically collapses a house and removes its solid obstacle",
    () => {
      const g = __ronda,
        e = g.incidents.actors.find((e) => e.def.kind === "titan"),
        h = g.world.houses[0];
      Object.assign(e.incident, { house: 0, guard: false, route: 4 });
      e.pos.set(h.x, 0, h.z + h.d / 2 + 3);
      for (let i = 0; i < 3; i++) {
        e.attackTimer = 0;
        g.incidents.updateZombie(e, 0.1, i);
      }
      g.incidents.updateHouses();
      return (
        g.state.data.incidents.houses[h.id] === 0 &&
        !h.group.visible &&
        h.rubble.visible &&
        h.collider.disabled
      );
    },
  );
  await evalCheck(
    "boss victory completes outbreak and awards victory once",
    () => {
      const g = __ronda,
        e = g.incidents.actors.find((e) => e.def.kind === "titan");
      g.damageEnemy(e, 9999);
      const coins = g.state.data.coins;
      g.incidents.win();
      return (
        g.incidents.event.phase === "won" &&
        g.state.data.stats.outbreaks === 1 &&
        g.state.data.coins === coins
      );
    },
  );
  await move(227, -212);
  await p.evaluate(() => {
    const g = __ronda;
    g.state.data.coins = 3000;
    g.state.data.x = 0;
    g.state.data.z = 12;
    g.action("buy-mount", { id: "mecha" });
  });
  await move(227, -212);
  await npc("william");
  // Defenders share outbreak kill credit; exercise the remaining player kills if needed.
  await p.evaluate(() => {
    const g = __ronda;
    if (g.state.data.stats.zombies < 12) {
      g.ui.close();
      g.state.data.time = 1200;
      g.state.data.night++;
      g.incidents.sync();
      g.incidents.start("zombie");
      for (let i = g.state.data.stats.zombies; i < 12; i++) {
        const e = g.incidents.spawn("zombie", 190, -130, { house: 0 });
        g.damageEnemy(e, 1000);
      }
    }
  });
  await npc("william");
  await p.locator('[data-action="claim-quest"]').click();
  await evalCheck(
    "William upgrades owned mecha after zombie mission",
    () =>
      __ronda.state.data.incidents.tech.mechaFlight &&
      __ronda.bike.userData.flightJets.length === 2,
  );
  await move(75, -77, 1200);
  await p.keyboard.press("KeyB");
  await p.keyboard.press("KeyV");
  await p.evaluate(() => __ronda.updatePlayer(0.1));
  await evalCheck(
    "V puts upgraded mecha above a building with active flight jets",
    () =>
      __ronda.isFlying &&
      __ronda.altitude >= __ronda.world.flightClearance(75, -77) &&
      __ronda.bike.userData.flightJets.every((j) => j.visible),
  );
  await evalCheck(
    "H launches three backpack missiles that damage an airborne ship",
    () => {
      const g = __ronda;
      g.incidents.event.type = "alien";
      const e = g.incidents.spawn("saucer", 90, -95, { house: 0 });
      g.lockedTarget = e;
      g.action("missiles");
      const launched = g.ranged.shots.filter((s) => s.missile).length;
      for (let i = 0; i < 80; i++) g.ranged.update(0.05);
      return launched === 3 && Math.abs(e.hp - (e.maxHp - 186)) < 0.001;
    },
  );
  await p.keyboard.press("KeyV");
  await evalCheck(
    "V returns mecha to walkable ground without dismounting",
    () =>
      !__ronda.isFlying &&
      __ronda.altitude === 0 &&
      __ronda.state.data.riding &&
      __ronda.world.canMove(__ronda.state.data.x, __ronda.state.data.z),
  );
  await p.keyboard.press("KeyB");
  await evalCheck(
    "dawn burns every living zombie and returns citizens healthy",
    () => {
      const g = __ronda;
      g.incidents.event.type = "zombie";
      g.incidents.event.phase = "active";
      const v = g.incidents.victim("warga-malam-1");
      g.incidents.infect(v);
      g.state.data.time = 360;
      g.incidents.update(0.1, g.elapsed);
      return (
        g.incidents.event.phase === "dawn" &&
        g.incidents.actors.every((e) => !e.active) &&
        !g.state.data.incidents.residents[v.id] && !v.npc.incidentUnavailable
      );
    },
  );
  await evalCheck(
    "morning recovery restores houses and never charges materials",
    () => {
      const g = __ronda,
        h = g.world.houses[0];
      g.state.data.coins = 1000;
      g.state.data.iron = 5;
      g.rural.restoreMorning();
      return (
        h.group.visible &&
        !h.rubble.visible &&
        !h.collider.disabled &&
        g.state.data.incidents.houses[h.id] === 100 &&
        g.state.data.iron === 5 && g.state.data.coins === 1000
      );
    },
  );
  await move(259, 224);
  await npc("et");
  await p.locator('[data-action="accept-quest"]').click();
  for (const [x, z] of [
    [238, 233],
    [274, 192],
    [235, 183],
  ]) {
    await move(x, z);
    await p.keyboard.press("KeyE");
  }
  await move(259, 224);
  await npc("et");
  await p.locator('[data-action="claim-quest"]').click();
  await npc("et");
  await p.locator('[data-action="accept-quest"]').click();
  await move(254, 219);
  await p.keyboard.press("KeyE");
  await move(259, 224);
  await npc("et");
  await p.locator('[data-action="claim-quest"]').click();
  await evalCheck(
    "E.T. quest chain activates beacon and awards exclusive UFO mount",
    () =>
      __ronda.state.data.mounts.includes("ufo") &&
      __ronda.state.data.stats.signalReady === 1 &&
      __ronda.state.data.incidents.tech.etDeparted,
  );
  await p.keyboard.press("KeyB");
  await p.evaluate(() => __ronda.updatePlayer(0.1));
  await evalCheck(
    "reward UFO flies with player hidden inside its cockpit",
    () => __ronda.isFlying && __ronda.altitude >= 10 && !__ronda.player.visible,
  );
  await p.keyboard.press("KeyB");
  await evalCheck(
    "alien night opens sky portal after shooting-star warning",
    () => {
      const g = __ronda;
      g.state.data.night++;
      g.state.data.time = 1200;
      g.incidents.sync();
      g.incidents.start("alien");
      g.incidents.update(1, g.elapsed);
      return (
        g.incidents.meteor.visible &&
        g.incidents.portal.visible &&
        g.incidents.event.phase === "warning"
      );
    },
  );
  await evalCheck(
    "UFO tractor beam abducts santri and downing its carrier rescues them",
    () => {
      const g = __ronda;
      g.incidents.event.elapsed = 7;
      g.incidents.update(0.05, g.elapsed);
      const n = g.npcs.find(
          (n) => n.def.outfit === "santri" && !n.incidentUnavailable,
        ),
        e = g.incidents.spawn(
          "saucer",
          n.model.position.x,
          n.model.position.z,
          { house: 0 },
        );
      e.pos.set(n.model.position.x, 14, n.model.position.z);
      e.incident.victim = n.def.id;
      for (let i = 0; i < 41; i++) g.incidents.updateAlien(e, 0.1, g.elapsed);
      const captured =
        g.state.data.incidents.residents[n.def.id]?.condition === "abducted";
      g.damageEnemy(e, 9999);
      return (
        captured &&
        !g.state.data.incidents.residents[n.def.id] &&
        n.model.visible
      );
    },
  );
  await evalCheck(
    "UFO carries livestock to the mothership and persistent prisoner record",
    () => {
      const g = __ronda,
        v = g.incidents.victim("animal-0"),
        e = g.incidents.spawn(
          "saucer",
          v.model.position.x,
          v.model.position.z,
          { house: 0 },
        );
      e.pos.set(v.model.position.x, 14, v.model.position.z);
      e.incident.victim = v.id;
      for (let i = 0; i < 41; i++) g.incidents.updateAlien(e, 0.1, g.elapsed);
      for (let i = 0; i < 500; i++) g.incidents.updateAlien(e, 0.1, g.elapsed);
      return (
        g.state.data.incidents.residents[v.id]?.condition === "aboard" &&
        g.state.data.incidents.lostCaptives.includes(v.id)
      );
    },
  );
  await evalCheck(
    "mothership final wave frees all abductees including earlier transfers",
    () => {
      const g = __ronda;
      while (g.incidents.event.wave < 4) g.incidents.spawnWave();
      const boss = g.incidents.actors.find((e) => e.def.kind === "mothership");
      g.damageEnemy(boss, 9999);
      return (
        g.incidents.event.phase === "won" &&
        g.state.data.stats.alienWaves === 1 &&
        g.state.data.incidents.lostCaptives.length === 0 &&
        !g.state.data.incidents.residents["animal-0"]
      );
    },
  );
  await evalCheck(
    "alien dawn retreats sky ships without leaving live enemies",
    () => {
      const g = __ronda;
      g.state.data.night++;
      g.incidents.sync();
      g.incidents.start("alien");
      g.incidents.update(8, g.elapsed);
      g.state.data.time = 360;
      g.incidents.update(0.1, g.elapsed);
      const left = g.incidents.actors.every((e) => !e.active);
      for (let i = 0; i < 40; i++) g.incidents.update(0.1, g.elapsed);
      return (
        left &&
        g.incidents.departures.length === 0 &&
        g.incidents.actors.every((e) => !e.model.visible)
      );
    },
  );
  await evalCheck(
    "incident HUD stays at left edge and clears center gameplay",
    () => {
      const g = __ronda;
      g.state.data.night++;
      g.state.data.time = 1200;
      g.incidents.sync();
      g.incidents.start("alien");
      g.incidents.update(8, g.elapsed);
      const r = g.incidents.hud.getBoundingClientRect();
      return r.width < 300 && r.right < innerWidth * 0.35;
    },
  );
  await p.evaluate(() => {
    const g = __ronda;
    g.incidents.actors[0].hp = 31;
    g.incidents.update(0, g.elapsed);
    g.state.save();
  });
  await p.reload();
  await p.waitForFunction(() => window.__ronda);
  await evalCheck(
    "reload restores active wave health, new equipment and quest progress",
    () => {
      const g = __ronda;
      return (
        g.incidents.actors.some((e) => Math.abs(e.hp - 31) < 0.001) &&
        g.state.data.incidents.tech.mechaFlight &&
        g.state.data.mounts.includes("ufo") &&
        g.state.data.quests["et-home"] === "done"
      );
    },
  );
  check("no browser exceptions or failed resources", errors.length === 0);
  console.log(JSON.stringify({ passed: checks.length, errors }, null, 2));
} finally {
  if (errors.length) console.log("BROWSER ERRORS", errors);
  await b.close();
}
