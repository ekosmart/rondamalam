import { purchaseAtKopdes } from "./kopdes-helper.mjs";
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
  const result = await p.evaluate(fn);
  assert.ok(result, name);
  checks.push(name);
  console.log("PASS", name);
};
async function move(x, z, time = 720) {
  await p.evaluate(
    ({ x, z, time }) => {
      const g = __ronda;
      g.ui.close();
      Object.assign(g.state.data, { x, z, time, riding: false });
      g.altitude = 0;
      g.cameraYaw = 0;
      g.cameraPitch = 0.58;
      g.cameraDistance = 30;
      g.lockedTarget = null;
      g.updatePlayer(0);
      g.updateEnemies(0);
      g.life.update(0, g.elapsed);
      g.frontier.update(0, g.elapsed);
      g.findInteraction();
      g.ui.update(0.2);
    },
    { x, z, time },
  );
}
async function shot(name) {
  await p.evaluate(() => {
    const g = __ronda;
    if (g.expeditions.active) g.expeditions.frame(0, g.elapsed);
    else {
      g.world.update(0, g.elapsed, g.state, g.state.data);
      g.updateLight();
      g.updateCamera(1);
      g.renderer.render(g.scene, g.camera);
      g.ui.update(0.2);
    }
  });
  await p.screenshot({ path: `tmp/screenshots/frontier-${name}.png` });
}
try {
  await p.goto("http://127.0.0.1:5173/?test=1");
  await p.waitForFunction(() => window.__ronda);
  await p.locator("[data-action=start]").click();
  await p.evaluate(() => {
    __ronda.renderer.setAnimationLoop(null);
    __ronda.audio.enabled = false;
  });
  await check("new buildings and dense fields do not block roads", () => {
    const w = __ronda.world,
      overlap = (a, b) =>
        Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
        Math.abs(a.z - b.z) < (a.d + b.d) / 2;
    return (
      [
        ...w.buildingFootprints,
        ...w.frontier.fields.map((f) => f.def),
        ...w.colliders.map((c) => ({ ...c, w: c.w * 2, d: c.d * 2 })),
      ].every((b) => !w.roads.some((r) => overlap(b, r))) &&
      w.frontier.fields.every((f) => f.count > 1900)
    );
  });
  await check("new NPCs, house doorway and launch access are walkable", () => {
    const g = __ronda;
    return (
      [
        "elon",
        "john",
        "kopdes-shop",
        ...g.frontier.fishers.map((f) => f.n.def.id),
      ].every((id) => {
        const n = g.npcs.find((n) => n.def.id === id);
        return g.world.canMove(n.def.x, n.def.z, 0.5);
      }) &&
      g.world.canMove(15, -2, 0.55) &&
      g.world.canMove(78, 215, 0.55)
    );
  });
  await check("all four water meshes animate their texture and ripples", () => {
    const water = __ronda.world.livingWater;
    water.update(0, 1);
    const old = water.water.map((w) => w.geometry.attributes.position.getZ(2));
    water.update(3, 1);
    return (
      water.water.length === 4 &&
      water.water.every(
        (w, i) =>
          w.material.map.offset.x > 0 &&
          Math.abs(w.geometry.attributes.position.getZ(2) - old[i]) > 0.00001 &&
          w.material.color.b > w.material.color.r,
      )
    );
  });
  await move(74, -16);
  await purchaseAtKopdes(p,"item","rod");
  await purchaseAtKopdes(p,"item","bait");
  await check(
    "Kopdes UI sells actual fishing gear and charges exact money",
    () =>
      __ronda.state.data.frontier.rod === 1 &&
      __ronda.state.data.frontier.bag.bait === 1 &&
      __ronda.state.data.coins === 92,
  );
  await move(140, -84);
  await check("any river bank supports fishing via E", () => {
    const g = __ronda;
    g.findInteraction();
    g.interact();
    return !!g.frontier.fishing && g.state.data.frontier.bag.bait === 0;
  });
  await check("bite window catches fish and consumes one bait", () => {
    const g = __ronda;
    g.frontier.update(g.frontier.fishing.wait + 0.1, 6);
    if (!g.frontier.fishing.bite) return false;
    g.interact();
    return (
      !g.frontier.fishing &&
      g.state.data.stats.fished === 1 &&
      g.state.data.frontier.fishLog.length === 1 &&
      g.state.data.frontier.bag[g.state.data.frontier.fishLog[0].id] === 1
    );
  });
  await shot("water");
  await move(-126, 231);
  await check(
    "corn harvest can be sold but cannot repeat in same shift",
    () => {
      const g = __ronda;
      g.findInteraction();
      g.interact();
      const n = g.state.data.frontier.bag.corn;
      g.interact();
      return n === 5 && g.state.data.frontier.bag.corn === 5;
    },
  );
  await shot("corn");
  await move(74, -16);
  await p.keyboard.press("e");
  await p
    .locator('[data-action=frontier-sell][data-id=corn][data-qty="5"]')
    .click();
  await check(
    "selling harvest returns exact coin value",
    () =>
      __ronda.state.data.coins === 117 &&
      __ronda.state.data.frontier.bag.corn === 0,
  );
  await move(15, -2);
  await p.keyboard.press("e");
  await check(
    "house opens a separate 3D scene with three family members",
    () =>
      __ronda.expeditions.active === "home" &&
      __ronda.expeditions.family.length === 3 &&
      __ronda.expeditions.home !== __ronda.scene,
  );
  await shot("home");
  await check(
    "house movement uses keyboard and keeps village time paused",
    () => {
      const g = __ronda,
        t = g.state.data.time,
        z = g.expeditions.position.z;
      g.keys.add("KeyW");
      g.expeditions.frame(0.5, 10);
      g.keys.clear();
      return g.expeditions.position.z < z && g.state.data.time === t;
    },
  );
  for (const id of ["yuli", "aqila", "azkia"]) {
    await p.evaluate((id) => {
      const g = __ronda,
        n = g.expeditions.family.find((n) => n.def.id === id);
      g.ui.close();
      g.expeditions.position.set(n.def.x, 0, n.def.z + 1);
      g.expeditions.interact();
    }, id);
    assert.match(
      await p.locator("#panel-content").innerText(),
      new RegExp(id, "i"),
    );
  }
  console.log("PASS unique family dialogues");
  checks.push("unique family dialogues");
  await p.evaluate(() => {
    const g = __ronda;
    g.ui.close();
    g.expeditions.position.set(-6.2, 0, -2.5);
    g.expeditions.interact();
  });
  await p
    .locator('[data-action=storage-deposit][data-id=coins][data-qty="10"]')
    .first()
    .click();
  await check(
    "home storage UI transfers coins and rejects offsite access",
    () => {
      const g = __ronda,
        n = g.state.data.coins;
      g.expeditions.position.set(0, 0, 5);
      g.action("storage-withdraw", { id: "coins", qty: "10" });
      return (
        g.state.data.frontier.storage.coins === 10 && g.state.data.coins === n
      );
    },
  );
  await p.evaluate(() => __ronda.expeditions.exit());
  await move(78, 215);
  await check(
    "rocket remains locked before Elon quest",
    () => !__ronda.expeditions.enter("space"),
  );
  await move(66, 207);
  await check("Elon quest grants capsule kit only once", () => {
    const g = __ronda;
    g.action("accept-quest", { id: "elon-orbit" });
    const n = g.state.data.frontier.bag.capsules;
    g.frontier.accept("elon-orbit");
    return n === 5 && g.state.data.frontier.bag.capsules === n;
  });
  await p.evaluate(() => {
    const g = __ronda;
    g.state.data.time = 1200;
    g.state.data.incidents.labBuilt = true;
    g.state.data.incidents.event = null;
    g.incidents.start("alien");
    g.incidents.event.phase = "active";
    g.incidents.event.wave = 1;
    g.frontier.helperTime = 999;
  });
  await check(
    "capsules capture weakened ground aliens and credit personal quest",
    () => {
      const g = __ronda;
      for (let i = 0; i < 2; i++) {
        const e = g.incidents.spawn("alien", 68, 208);
        e.hp = e.maxHp * 0.2;
        g.lockedTarget = e;
        g.cooldowns.bottle = 0;
        g.capture();
        for (let j = 0; j < 20; j++) g.frontier.update(0.05, j * 0.05);
        if (e.active) return false;
      }
      return (
        g.state.data.stats.aliensCaptured === 2 &&
        g.state.data.frontier.bag.capsules === 3 &&
        g.state.data.frontier.zCaptives === 2
      );
    },
  );
  await check("quest unlocks actual space flight and sample collection", () => {
    const g = __ronda;
    g.action("claim-quest", { id: "elon-orbit" });
    if (!g.state.data.frontier.spaceUnlocked || !g.expeditions.enter("space"))
      return false;
    g.expeditions.launch = 0;
    const z = g.expeditions.position.z;
    g.keys.add("KeyW");
    g.keys.add("KeyT");
    g.expeditions.frame(0.5, 12);
    g.keys.clear();
    if (!(g.expeditions.position.z < z && g.expeditions.position.y > 8))
      return false;
    const planet = g.expeditions.planets[0].def;
    g.expeditions.position.set(planet.x, planet.y, planet.z + planet.r + 8);
    g.expeditions.interact();
    g.expeditions.interact();
    return (
      g.state.data.frontier.bag.crystal === 3 &&
      g.state.data.frontier.spaceCollected.length === 1
    );
  });
  await shot("space");
  await p.evaluate(() => __ronda.expeditions.exit());
  await check(
    "space returns safely to launch access",
    () =>
      __ronda.state.data.x === 78 &&
      __ronda.state.data.z === 215 &&
      !__ronda.expeditions.active,
  );
  await move(66, 207);
  await shot("space-z");
  await move(-229, 156, 1200);
  await check(
    "meteor event spawns six raptors and unlocks five distinct wildlife species",
    () => {
      const g = __ronda;
      g.incidents.clearActors();
      g.state.data.incidents.event = null;
      g.incidents.start("dino");
      g.incidents.update(7.1, 20);
      g.frontier.update(0, 20);
      return (
        g.state.data.frontier.dinoSeen &&
        g.incidents.actors.filter((e) => e.def.dinoSpecies === "velociraptor")
          .length === 6 &&
        g.frontier.dinos.every((e) => e.active) &&
        g.world.frontier.crater.visible
      );
    },
  );
  await check("raptors take victims to nest and E frees them", async () => {
    const g = __ronda,
      { updateDinoIncident } = await import("/src/dino-incident.js");
    const e = g.incidents.actors[0],
      v = g.incidents.availableVictims().find((v) => v.animal);
    e.pos.copy(v.model.position);
    Object.assign(g.state.data, { x: -230, z: 150 });
    updateDinoIncident(g.incidents, e, 0.01, 21);
    if (!e.incident.captive) return false;
    const id = e.incident.captive;
    e.pos.set(-244, 0, 168);
    updateDinoIncident(g.incidents, e, 0.01, 21);
    if (g.incidents.data.residents[id]?.condition !== "nest") return false;
    Object.assign(g.state.data, { x: -229, z: 168 });
    g.findInteraction();
    g.interact();
    return !g.incidents.data.residents[id] && !v.animal.incidentUnavailable;
  });
  await check(
    "final dino wave contains a giant T-Rex and victory rescues captives",
    () => {
      const g = __ronda;
      g.incidents.event.wave = 3;
      g.incidents.spawnWave();
      const boss = g.incidents.actors.find((e) => e.def.boss);
      if (!boss || boss.def.dinoSpecies !== "trex") return false;
      g.damageEnemy(boss, 999999);
      return (
        g.incidents.event.phase === "won" && g.state.data.stats.dinoWaves === 1
      );
    },
  );
  await move(-230, 212, 720);
  await p.evaluate(() => {
    const g = __ronda;
    g.action("accept-quest", { id: "john-survey" });
  });
  await check(
    "feeding two different species and throwing capsules unlocks GyroBall",
    () => {
      const g = __ronda;
      for (const e of g.frontier.dinos.filter((e) =>
        ["velociraptor", "stegosaurus"].includes(e.def.id),
      )) {
        g.state.data.x = e.pos.x + 2;
        g.state.data.z = e.pos.z;
        g.lockedTarget = e;
        for (let i = 0; i < 3; i++)
          g.frontier.interact({ type: "dino-feed", obj: { enemy: e } });
        g.cooldowns.bottle = 0;
        g.capture();
        for (let i = 0; i < 20; i++) g.frontier.update(0.05, 30 + i * 0.05);
      }
      if (g.state.data.stats.dinoTagged !== 2) return false;
      g.action("claim-quest", { id: "john-survey" });
      return (
        g.state.data.mounts.includes("gyroball") && !!g.bike.userData.shell
      );
    },
  );
  await check(
    "friendly dinosaurs never become automatic weapon targets",
    () => {
      const g = __ronda,
        e = g.frontier.dinos.find((e) => e.def.id === "trex");
      g.lockedTarget = null;
      Object.assign(g.state.data, { x: e.pos.x, z: e.pos.z });
      return !g.nearby(50).includes(e);
    },
  );
  await move(-185, 238);
  await shot("bronto");
  await move(-230, 211);
  await p.evaluate(() => {
    __ronda.state.data.riding = true;
    __ronda.updatePlayer(0);
  });
  await shot("gyroball");
  await check(
    "Sembrani keeps player mounted while pusaka damages an aerially targeted enemy",
    () => {
      const g = __ronda;
      g.state.data.mount = "sembrani";
      g.state.data.riding = true;
      g.equipMount();
      g.altitude = 14;
      g.incidents.event.phase = "active";
      const e = g.incidents.spawn("zombie", g.state.data.x + 6, g.state.data.z);
      e.hp = e.maxHp;
      g.lockedTarget = e;
      g.cooldowns.attack = 0;
      g.attack();
      for (let i = 0; i < 50; i++) g.ranged.update(0.04);
      return e.hp < e.maxHp && g.state.data.riding && g.altitude === 14;
    },
  );
  await check("dino dawn retreats along ground and restores residents", () => {
    const g = __ronda;
    g.state.data.incidents.event = null;
    g.incidents.clearActors();
    g.state.data.time = 1200;
    g.incidents.start("dino");
    g.incidents.spawnWave();
    g.incidents.event.phase = "active";
    g.state.data.time = 360;
    g.incidents.update(0.1, 40);
    return (
      g.incidents.event.phase === "dawn" &&
      g.incidents.departures.every((d) => d.ground) &&
      g.incidents.actors.every((e) => !e.active && e.pos.y === 0)
    );
  });
  await p.evaluate(() => {
    __ronda.state.save();
  });
  await p.reload();
  await p.waitForFunction(() => window.__ronda);
  await p.evaluate(() => __ronda.renderer.setAnimationLoop(null));
  await check(
    "new items, money, species and space discoveries survive reload",
    () => {
      const d = __ronda.state.data;
      return (
        d.frontier.storage.coins === 10 &&
        d.frontier.rod === 1 &&
        d.frontier.dinos.length === 2 &&
        d.frontier.spaceCollected.includes("moon") &&
        d.frontier.spaceUnlocked &&
        d.mounts.includes("gyroball")
      );
    },
  );
  assert.deepEqual(errors, []);
  checks.push("no browser or WebGL errors");
  await fs.writeFile(
    "tmp/frontier-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(`${checks.length} checks passed`);
} finally {
  await browser.close();
}
