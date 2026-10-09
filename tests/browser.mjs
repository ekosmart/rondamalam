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
const check = (name, ok) => {
  assert.ok(ok, name);
  checks.push(name);
  console.log("PASS", name);
};
const data = () => page.evaluate(() => structuredClone(__ronda.state.data));
const move = async (x, z) => {
  await page.evaluate(
    ([x, z]) => {
      __ronda.state.data.x = x;
      __ronda.state.data.z = z;
      __ronda.state.data.riding = false;
      __ronda.findInteraction();
    },
    [x, z],
  );
  await page.waitForTimeout(150);
};
try {
  await page.goto("http://127.0.0.1:5173/?test=1");
  await page.waitForFunction(() => !!window.__ronda, { timeout: 60000 });
  await page.waitForTimeout(1200);
  check(
    "all ground enemies and NPC spawns are outside solid obstacles",
    await page.evaluate(
      () =>
        __ronda.enemies.every(
          (e) => e.def.air || __ronda.world.canMove(e.home.x, e.home.z),
        ) && __ronda.npcs.every((n) => __ronda.world.canMove(n.def.x, n.def.z)),
    ),
  );
  await page.screenshot({ path: "tmp/screenshots/01-title.png" });
  await page.locator('[data-action="start"]').click();
  check("start menu enters game", await page.locator("#hud").isVisible());
  let start = (await data()).z;
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(650);
  await page.keyboard.up("KeyW");
  check("W moves the player", (await data()).z < start - 1);
  await page.keyboard.press("KeyB");
  check("B mounts the bicycle", (await data()).riding);
  start = (await data()).z;
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(550);
  await page.keyboard.up("KeyW");
  check("bicycle advances through the village", (await data()).z < start - 3);
  await page.keyboard.press("KeyB");
  await page.keyboard.press("KeyM");
  check("M opens world map", await page.locator("#worldmap").isVisible());
  check(
    "world map remains square for accurate click coordinates",
    await page
      .locator("#worldmap")
      .evaluate((c) => Math.abs(c.clientWidth - c.clientHeight) < 2),
  );
  await page.locator("#worldmap").click({ position: { x: 200, y: 180 } });
  check(
    "map click sets a waypoint",
    await page.evaluate(() => !!__ronda.waypoint),
  );
  await page.keyboard.press("Escape");
  await move(-7, 6.2);
  await page.keyboard.press("KeyE");
  check(
    "nearby citizen opens unique dialogue",
    (await page.locator(".dialogue-content h2").textContent()) === "Pak Wiryo",
  );
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyP");
  check(
    "safe zone opens workshop",
    await page.locator(".bottle-craft").isVisible(),
  );
  await page.locator('[data-action="craft"][data-id="keris"]').click();
  check(
    "UI crafting spends materials and equips keris",
    (await data()).weapon === "keris" && (await data()).coins === 30,
  );
  await page.screenshot({ path: "tmp/screenshots/02-workshop.png" });
  await page.keyboard.press("Escape");
  const posts = await page.evaluate(() => __ronda.state.patrolPosts);
  for (const p of posts) {
    await move(p.x + 1.3, p.z + 1.3);
    await page.keyboard.press("KeyE");
  }
  check(
    "all five actual world posts can be interacted with",
    (await data()).posts.length === 5,
  );
  await move(-7, 6);
  await page.keyboard.press("KeyE");
  await page.locator('[data-action="claim-quest"]').click();
  check(
    "patrol quest pays reward once",
    (await data()).quests.patrol === "done",
  );
  await page.evaluate(() => {
    const g = __ronda;
    g.state.data.weapon = "kentongan";
    g.equipWeapon();
    const e = g.enemies.find((e) => e.def.id === "pocong");
    e.pos.set(-114, 0, -209);
    e.hp = e.maxHp;
    e.respawn = 0;
    g.state.data.x = -114;
    g.state.data.z = -206.2;
    g.updateEnemies(0);
  });
  await page.keyboard.press("Space");
  await page.waitForFunction(() => __ronda.cooldowns.attack === 0);
  await page.keyboard.press("Space");
  await page.waitForFunction(() => __ronda.cooldowns.attack === 0);
  await page.keyboard.press("Space");
  check(
    "three kentongan strikes weaken a pocong",
    await page.evaluate(() => {
      const e = __ronda.enemies.find((e) => e.def.id === "pocong");
      return e.hp > 0 && e.hp / e.maxHp <= 0.25;
    }),
  );
  await page.screenshot({ path: "tmp/screenshots/03-cemetery.png" });
  const before = (await data()).bottles;
  await page.evaluate(() => {
    window.originalRandom = Math.random;
    Math.random = () => 0.05;
  });
  await page.keyboard.press("KeyR");
  await page.waitForFunction(() => __ronda.projectiles.length === 0, {
    timeout: 10000,
  });
  await page.evaluate(() => (Math.random = window.originalRandom));
  check(
    "bottle projectile captures a weakened ghost",
    (await data()).collection.some((g) => g.id === "pocong") &&
      (await data()).bottles === before - 1,
  );
  check(
    "first captured ghost becomes companion",
    (await data()).companion === "pocong",
  );
  await page.evaluate(() => {
    const g = __ronda,
      e = g.enemies.find((e) => e.def.id === "sundel");
    g.state.data.x = e.home.x;
    g.state.data.z = e.home.z + 4;
    e.pos.set(e.home.x, 0, e.home.z);
    g.updateEnemies(0);
  });
  const enemyBefore = await page.evaluate(
    () => __ronda.enemies.find((e) => e.def.id === "sundel").hp,
  );
  await page.keyboard.press("KeyG");
  check(
    "companion skill damages a nearby enemy",
    await page.evaluate(
      (h) => __ronda.enemies.find((e) => e.def.id === "sundel").hp < h,
      enemyBefore,
    ),
  );
  await page.keyboard.press("KeyQ");
  check(
    "pusaka skill uses cooldown and stamina",
    await page.evaluate(
      () => __ronda.cooldowns.special > 0 && __ronda.state.data.stamina < 100,
    ),
  );
  await page.evaluate(() => {
    const g = __ronda;
    g.state.data.hp = 1;
    g.state.data.coins = 200;
    g.cooldowns.hurt = 0;
    g.hurt(50);
  });
  check(
    "zero health respawns at pos with 15% coin penalty",
    (await data()).x === 0 &&
      (await data()).z === 12 &&
      (await data()).coins === 170 &&
      (await data()).hp === 100,
  );
  await page.waitForFunction(() => __ronda.deathTimer <= 0, { timeout: 10000 });
  const safeTest = await page.evaluate(() => {
    const g = __ronda,
      e = g.enemies.find((e) => e.human);
    e.pos.set(24.1, 0, 0);
    g.steer(e, 0, 0, 20, 1);
    return Math.hypot(e.pos.x, e.pos.z) >= 24;
  });
  check("enemy steering respects safe zone boundary", safeTest);
  check(
    "river blocks walking except at bridges",
    await page.evaluate(
      () =>
        !__ronda.world.canMove(155, -60) && __ronda.world.canMove(155, -130),
    ),
  );
  await page.keyboard.press("KeyP");
  await page.locator('[data-action="camp-tab"][data-tab="rest"]').click();
  await page.locator('[data-action="rest"]').click();
  check(
    "rest advances to day",
    await page.evaluate(() => !__ronda.state.isNight),
  );
  await page.waitForTimeout(250);
  check(
    "daytime hides ghosts and reveals civic NPCs",
    await page.evaluate(
      () =>
        !__ronda.enemies.filter((e) => !e.human).some((e) => e.active) &&
        __ronda.npcs.find((n) => n.def.id === "lurah").active,
    ),
  );
  await move(73, -60);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "tmp/screenshots/04-daytime.png" });
  await page.keyboard.press("KeyI");
  await page.locator('[data-action="bestiary"]').click();
  await page.locator('[data-action="ghost-detail"][data-id="pocong"]').click();
  check(
    "bestiary shows the captured ghost",
    await page.locator(".ghost-detail").isVisible(),
  );
  await page.screenshot({ path: "tmp/screenshots/05-bestiary.png" });
  await page.keyboard.press("Escape");
  await page.evaluate(() => __ronda.state.save());
  const saved = await data();
  await page.reload();
  await page.waitForFunction(() => !!window.__ronda);
  check(
    "reload restores captured ghost, coins, and quest completion",
    (await data()).coins === saved.coins &&
      (await data()).collection.some((g) => g.id === "pocong") &&
      (await data()).quests.patrol === "done",
  );
  await page.locator('[data-action="start"]').click();
  await page.keyboard.press("KeyM");
  await page.screenshot({ path: "tmp/screenshots/06-map.png" });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "tmp/screenshots/07-mobile.png" });
  await page.locator('.top-actions [data-action="inventory"]').click();
  check(
    "mobile inventory fits viewport",
    await page.evaluate(() => {
      const p = document.querySelector(".panel").getBoundingClientRect();
      return p.left >= 0 && p.right <= innerWidth && p.bottom <= innerHeight;
    }),
  );
  await page.screenshot({ path: "tmp/screenshots/08-mobile-inventory.png" });
  check("no runtime or resource errors", errors.length === 0);
  console.log(JSON.stringify({ passed: checks.length, errors }, null, 2));
} catch (e) {
  await page.screenshot({ path: "tmp/screenshots/failure.png" });
  console.error("BROWSER TEST FAILURE", e, errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
