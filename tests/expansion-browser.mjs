import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir("tmp/screenshots", { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } }),
  errors = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (e) => {
  if (e.type() === "error") errors.push(e.text());
});
const check = (name, result) => {
  assert.ok(result, name);
  checks.push(name);
  console.log("PASS", name);
};
const move = async (x, z, time = 600) => {
  await page.evaluate(
    ({ x, z, time }) => {
      const g = __ronda;
      g.ui.close();
      Object.assign(g.state.data, { x, z, time, riding: false });
      g.altitude = 0;
      g.lockedTarget = null;
      g.cameraYaw = 0;
      g.cameraPitch = 0.58;
      g.cameraDistance = 28;
      g.updateEnemies(0);
      g.life.update(0, g.elapsed);
      g.findInteraction();
    },
    { x, z, time },
  );
  await page.waitForTimeout(250);
};
try {
  await page.goto("http://127.0.0.1:5173/?test=1");
  await page.waitForFunction(() => window.__ronda, { timeout: 60000 });
  await page.locator('[data-action="start"]').click();
  check(
    "roads are clear of buildings, rice plots and all solid colliders",
    await page.evaluate(() => {
      const w = __ronda.world,
        overlap = (a, b) =>
          Math.abs(a.x - b.x) < a.w / 2 + b.w / 2 &&
          Math.abs(a.z - b.z) < a.d / 2 + b.d / 2;
      return [
        ...w.buildingFootprints,
        ...w.ricePlots,
        ...w.colliders.map((c) => ({ ...c, w: c.w * 2, d: c.d * 2 })),
      ].every((b) => !w.roads.some((r) => overlap(b, r)));
    }),
  );
  check(
    "all 15 physical patrol poles lie outside road surface",
    await page.evaluate(
      () =>
        __ronda.world.postObjects.length === 15 &&
        __ronda.world.postObjects.every(
          (p) =>
            !__ronda.world.roads.some(
              (r) =>
                Math.abs(p.def.x - r.x) < r.w / 2 + 1 &&
                Math.abs(p.def.z - r.z) < r.d / 2 + 1,
            ),
        ),
    ),
  );
  check(
    "school is named Sekolah Rakyat",
    await page.evaluate(
      () => __ronda.world.zone(-89, 73).name === "Sekolah Rakyat",
    ),
  );
  const nightOne = await page.evaluate(() =>
    __ronda.state.patrolPosts.map((p) => p.id),
  );
  await move(0, 12, 1079.99);
  await page.waitForTimeout(350);
  check(
    "sunset selects five different poles in the live world",
    await page.evaluate(
      (old) => __ronda.state.patrolPosts.every((p, i) => p.id !== old[i]),
      nightOne,
    ),
  );
  const active = await page.evaluate(() =>
    __ronda.state.patrolPosts.map((p) => p.id),
  );
  await page.evaluate(() => __ronda.state.save());
  await page.reload();
  await page.waitForFunction(() => window.__ronda);
  await page.locator('[data-action="start"]').click();
  check(
    "nightly selection survives browser reload",
    await page.evaluate(
      (ids) =>
        JSON.stringify(ids) ===
        JSON.stringify(__ronda.state.patrolPosts.map((p) => p.id)),
      active,
    ),
  );
  await move(-118, 2);
  await page.waitForTimeout(200);
  check(
    "market has active traders, shoppers and daytime pickpocket",
    await page.evaluate(() => {
      const g = __ronda;
      return (
        g.npcs.filter(
          (n) => n.ambient && n.def.id.startsWith("pedagang") && n.active,
        ).length === 7 &&
        g.npcs.filter((n) => n.def.id.startsWith("pembeli") && n.active)
          .length === 9 &&
        g.enemies.some((e) => e.def.pickpocket && e.active)
      );
    }),
  );
  const shopper = await page.evaluate(
    () => __ronda.npcs.find((n) => n.def.id === "pembeli-2").model.position.x,
  );
  await page.waitForTimeout(600);
  check(
    "market shoppers actually move between stalls",
    await page.evaluate(
      (x) =>
        Math.abs(
          __ronda.npcs.find((n) => n.def.id === "pembeli-2").model.position.x -
            x,
        ) > 0.05,
      shopper,
    ),
  );
  check(
    "farm workers, harvesters and buffalo exist",
    await page.evaluate(
      () =>
        __ronda.npcs.filter(
          (n) => ["farmer", "harvester"].includes(n.def.outfit) && n.active,
        ).length === 8 && __ronda.life.animals.filter(a => !a.kind).length === 2,
    ),
  );
  await move(76, -162);
  await page.keyboard.press("KeyE");
  check(
    "kiai dialogue offers the ritual quest",
    await page
      .locator('[data-action="accept-quest"][data-id="ward"]')
      .isVisible(),
  );
  await page.locator('[data-action="accept-quest"][data-id="ward"]').click();
  await move(-120, -182, 1200);
  const click = await page.evaluate(() => {
    const g = __ronda,
      e = g.enemies.find((e) => e.def.id === "pocong");
    e.pos.set(-120, 0, -190);
    e.home = { x: -120, z: -190 };
    e.active = true;
    e.model.visible = true;
    e.hp = e.maxHp;
    g.cameraYaw = 0;
    g.updateCamera(1);
    g.scene.updateMatrixWorld(true);
    const p = e.pos.clone();
    p.y = 1.7;
    p.project(g.camera);
    return {
      x: ((p.x + 1) * innerWidth) / 2,
      y: ((1 - p.y) * innerHeight) / 2,
    };
  });
  await page.mouse.click(click.x, click.y);
  check(
    "clicking a ghost mesh locks that specific ghost",
    await page.evaluate(() => __ronda.lockedTarget?.def.id === "pocong"),
  );
  const hp = await page.evaluate(() => __ronda.lockedTarget.hp);
  await page.waitForTimeout(300);
  check(
    "selecting a target does not accidentally deal weapon damage",
    await page.evaluate((h) => __ronda.lockedTarget.hp === h, hp),
  );
  await page.keyboard.press("KeyX");
  check(
    "X releases the target",
    await page.evaluate(() => !__ronda.lockedTarget),
  );
  await move(0, 12);
  await page.evaluate(() => (__ronda.state.data.coins = 2500));
  await page.keyboard.press("KeyP");
  await page.locator('[data-action="camp-tab"][data-tab="mounts"]').click();
  await page.locator('[data-action="buy-mount"][data-id="naga"]').click();
  await page.locator('[data-action="buy-mount"][data-id="mecha"]').click();
  check(
    "both new mounts can be purchased and collected at pos ronda",
    await page.evaluate(
      () =>
        __ronda.state.data.mounts.includes("naga") &&
        __ronda.state.data.mounts.includes("mecha") &&
        __ronda.state.data.coins === 850,
    ),
  );
  await page.locator('[data-action="buy-mount"][data-id="naga"]').click();
  await page.keyboard.press("Escape");
  await move(75, -156);
  await page.keyboard.press("KeyB");
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(800);
  await page.keyboard.up("KeyW");
  check(
    "dragon crosses solid mosque footprint while flying above the roof",
    await page.evaluate(() => {
      const g = __ronda;
      return g.state.data.z < -169 && g.altitude >= 25 && g.state.data.riding;
    }),
  );
  const altitude = await page.evaluate(() => __ronda.cruiseAltitude);
  await page.keyboard.down("KeyT");
  await page.waitForTimeout(500);
  await page.keyboard.up("KeyT");
  check(
    "T raises dragon cruising altitude",
    await page.evaluate((h) => __ronda.cruiseAltitude > h + 2, altitude),
  );
  await page.locator('[data-action="descend"]').click();
  check(
    "flight HUD buttons remain clickable during animation",
    await page.evaluate((h) => __ronda.cruiseAltitude < h + 3, altitude),
  );
  await page.keyboard.press("KeyB");
  check(
    "dragon dismount lands outside all solid obstacles",
    await page.evaluate(
      () =>
        !__ronda.state.data.riding &&
        __ronda.altitude === 0 &&
        __ronda.world.canMove(__ronda.state.data.x, __ronda.state.data.z, 1),
    ),
  );
  // Deterministic simulations use the real game objects and rules, while preventing real frames from racing the assertions.
  await page.evaluate(() => __ronda.renderer.setAnimationLoop(null));
  check(
    "dragon automatically breathes fire at a locked target",
    await page.evaluate(() => {
      const g = __ronda,
        d = g.state.data;
      d.mount = "naga";
      d.riding = true;
      g.equipMount();
      d.x = -100;
      d.z = -150;
      g.altitude = 15;
      const e = g.enemies.find((e) => e.def.id === "pocong");
      e.pos.set(-100, 0, -170);
      e.active = true;
      e.hp = e.maxHp;
      g.lockedTarget = e;
      const before = e.hp;
      g.mountCombat.timer = 0;
      g.mountCombat.update(0.1);
      return e.hp < before && g.effects.particles.length > 30;
    }),
  );
  check(
    "mecha blocks ghost magic but still takes human physical damage",
    await page.evaluate(() => {
      const g = __ronda,
        d = g.state.data;
      d.mount = "mecha";
      d.riding = true;
      g.equipMount();
      d.x = 30;
      d.z = -140;
      d.hp = 100;
      g.cooldowns.hurt = 0;
      g.hurt(20, "magic");
      if (d.hp !== 100) return false;
      g.hurt(10, "physical");
      return d.hp === 90;
    }),
  );
  check(
    "mecha plasma damages selected targets without dismounting",
    await page.evaluate(() => {
      const g = __ronda,
        d = g.state.data,
        e = g.enemies.find((e) => e.def.id === "pocong");
      e.pos.set(d.x, 0, d.z - 15);
      e.active = true;
      e.hp = e.maxHp;
      g.lockedTarget = e;
      g.mountCombat.timer = 0;
      g.attack();
      return e.hp === e.maxHp - 40 && d.riding;
    }),
  );
  check(
    "pickpocket steals coins and arrest restores the stolen money",
    await page.evaluate(() => {
      const g = __ronda,
        d = g.state.data;
      d.time = 600;
      d.riding = false;
      d.x = -96;
      d.z = 5;
      d.coins = 100;
      const e = g.enemies.find((e) => e.def.pickpocket);
      e.pos.set(-96, 0, 5);
      e.attackTimer = 0;
      g.updateEnemies(0.01);
      if (d.coins !== 82) return false;
      g.damageEnemy(e, 200);
      return d.coins === 125;
    }),
  );
  const raid = await page.evaluate(() => {
    const g = __ronda,
      d = g.state.data;
    d.night++;
    d.time = 1300;
    d.x = 80;
    d.z = 40;
    g.altitude = 0;
    g.life.syncRaids();
    for (let i = 0; i < 4; i++) g.life.dispatch(i);
    for (let t = 0; t < 130; t += 0.05) g.life.update(0.05, t);
    return {
      routes: g.enemies
        .filter((e) => e.raid)
        .map((e) => ({
          name: e.name,
          route: e.raid.route,
          x: e.pos.x,
          z: e.pos.z,
        })),
      treasury: d.village.treasury,
      fires: d.raid.fires.length,
      damage: d.village.damage,
    };
  });
  console.log("raid simulation", raid);
  check(
    "all four shaman raids reach their own homes without getting stuck",
    raid.routes.every((r) => r.route === 5),
  );
  check(
    "raids steal village funds, endanger residents and ignite houses",
    raid.treasury < 800 && raid.fires > 0 && raid.damage > 0,
  );
  check(
    "player can extinguish a burning house",
    await page.evaluate(() => {
      const g = __ronda,
        f = g.state.data.raid.fires[0];
      g.state.data.stamina = 100;
      g.life.extinguish(f);
      g.life.extinguish(f);
      return f.heat === 0 && g.state.data.stats.firesOut === 1;
    }),
  );
  check(
    "defeating a raid counts toward village defense quest",
    await page.evaluate(() => {
      const g = __ronda,
        e = g.enemies.find((e) => e.raid && e.active);
      g.damageEnemy(e, 500);
      return (
        g.state.data.stats.raidsStopped === 1 && e.raid.status === "defeated"
      );
    }),
  );
  check(
    "breaking the altar cancels the remaining raids and prevents more that night",
    await page.evaluate(() => {
      const g = __ronda,
        d = g.state.data;
      d.essence = 5;
      g.life.suppress();
      const count = d.raid.entries.length;
      g.life.update(0.1, 0);
      return (
        d.stats.wards === 1 &&
        d.raid.suppressed &&
        g.enemies.filter((e) => e.raid).every((e) => !e.active) &&
        d.raid.entries.length === count &&
        d.essence === 3
      );
    }),
  );
  check(
    "new night reopens the shaman threat without carrying old fires",
    await page.evaluate(() => {
      const g = __ronda;
      g.state.data.night++;
      g.life.syncRaids();
      return (
        !g.state.data.raid.suppressed &&
        !g.state.data.raid.fires.length &&
        !g.state.data.raid.entries.length
      );
    }),
  );
  await move(-54, 112);
  await page.keyboard.press("KeyE");
  await page.locator('[data-action="start-football"]').click();
  check(
    "football organizer starts semifinal with five AI players and a physical ball",
    await page.evaluate(
      () =>
        __ronda.sports.active === "football" &&
        __ronda.sports.players.length === 5 &&
        !!__ronda.sports.ball,
    ),
  );
  check(
    "football kicks and passes change the physical ball velocity",
    await page.evaluate(() => {
      const g = __ronda,
        s = g.sports;
      s.countdown = 0;
      g.state.data.x = -18;
      g.state.data.z = 144;
      s.kick();
      const shot = s.velocity.length();
      s.kickTimer = 0;
      s.kick(true);
      return shot > 38 && s.velocity.length() > 23 && s.velocity.length() < 25;
    }),
  );
  check(
    "a goal and match win advance semifinal to final",
    await page.evaluate(() => {
      const g = __ronda,
        s = g.sports;
      s.ball.position.set(-18, 0.58, 100.8);
      s.velocity.set(0, -10);
      s.match.seconds = 0.01;
      s.updateFootball(0.02, 0);
      return (
        s.match.round === 1 && s.match.score[0] === 0 && s.match.seconds === 90
      );
    }),
  );
  check(
    "winning final awards a trophy and exactly 350 coins",
    await page.evaluate(() => {
      const g = __ronda,
        s = g.sports,
        c = g.state.data.coins;
      s.countdown = 0;
      s.ball.position.set(-18, 0.58, 100.8);
      s.velocity.set(0, -10);
      s.match.seconds = 0.01;
      s.updateFootball(0.02, 0);
      return (
        !s.active &&
        g.state.data.sports.footballTitles === 1 &&
        g.state.data.coins === c + 350
      );
    }),
  );
  await move(7, 26);
  await page.keyboard.press("KeyE");
  await page.locator('[data-action="start-race"]').click();
  check(
    "race organizer starts two laps with three cycling rivals",
    await page.evaluate(
      () =>
        __ronda.sports.active === "race" &&
        __ronda.sports.racers.length === 3 &&
        __ronda.sports.race.laps === 2 &&
        __ronda.state.data.riding,
    ),
  );
  const race = await page.evaluate(async () => {
    const { RACE_TRACK } = await import("/src/layout.js"),
      g = __ronda,
      s = g.sports,
      d = g.state.data,
      coins = d.coins;
    s.countdown = 0;
    let t = 0;
    while (s.active && t < 160) {
      const target = RACE_TRACK[s.race.next],
        dx = target.x - d.x,
        dz = target.z - d.z,
        len = Math.hypot(dx, dz);
      g.keys.clear();
      g.keys.add("KeyW");
      g.cameraYaw = Math.atan2(-dx, -dz);
      g.updatePlayer(0.04);
      s.update(0.04, t);
      t += 0.04;
    }
    g.keys.clear();
    return {
      wins: d.sports.raceWins,
      best: d.sports.bestRace,
      coins: d.coins - coins,
      active: s.active,
      elapsed: t,
    };
  });
  console.log("race simulation", race);
  check(
    "rideable checkpoint circuit can be completed twice and won for 180 coins",
    race.wins === 1 &&
      race.coins === 180 &&
      race.active === null &&
      race.best > 0,
  );
  await move(-54, 112);
  await page.keyboard.press("KeyE");
  await page.locator('[data-action="start-football"]').click();
  await page.evaluate(() => __ronda.sports.renderHUD());
  await page.locator('[data-action="quit-activity"]').click();
  check(
    "minigame quit button exits and restores the previous mount",
    await page.evaluate(
      () => !__ronda.sports.active && __ronda.state.data.mount === "mecha",
    ),
  );
  await page.evaluate(() => {
    __ronda.ui.close();
    __ronda.state.save();
  });
  await page.reload();
  await page.waitForFunction(() => window.__ronda);
  check(
    "mount collection, quest and championship progress survive reload",
    await page.evaluate(() => {
      const d = __ronda.state.data;
      return (
        d.mounts.includes("naga") &&
        d.mounts.includes("mecha") &&
        d.sports.raceWins === 1 &&
        d.sports.footballTitles === 1 &&
        d.quests.ward === "active"
      );
    }),
  );
  check(
    "expansion runs without browser exceptions or failed resources",
    errors.length === 0,
  );
  console.log(JSON.stringify({ passed: checks.length, errors }, null, 2));
} finally {
  await browser.close();
}
