import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const check = async (name, fn) => {
  assert.ok(await page.evaluate(fn), name);
  console.log("PASS", name);
};
const close = async () => page.evaluate(() => __ronda.ui.close());
const pos = async (x, z) =>
  page.evaluate(
    ([x, z]) => {
      __ronda.spirit.position.set(x, 0, z);
      __ronda.spirit.updateHUD();
    },
    [x, z],
  );
const interact = async () => page.evaluate(() => __ronda.action("interact"));
try {
  await page.goto(
    process.env.SPIRIT_TEST_URL || "http://127.0.0.1:5175/?test=1",
  );
  await page.waitForFunction(() => !!window.__ronda, { timeout: 60000 });
  await page.locator('[data-action="start"]').click();
  await page.evaluate(() => {
    const g = __ronda,
      d = g.state.data;
    d.mounts.push("sembrani");
    d.mount = "sembrani";
    d.riding = true;
    d.night = 1;
    d.time = 1200;
    d.weapons.push("keris-mpu-gandring");
    d.weapon = "keris-mpu-gandring";
    g.equipMount();
    g.equipWeapon();
    d.x = 101;
    d.z = 258;
    g.altitude = 8;
    g.cruiseAltitude = 8;
    g.findInteraction();
    g.action("interact");
  });
  await check(
    "keeper starts the quest while Sembrani hovers low",
    () => __ronda.state.data.spirit.started,
  );
  await close();
  for (const [x, z] of [
    [91, 255],
    [119, 249],
    [128, 269],
  ])
    await page.evaluate(
      ([x, z]) => {
        const g = __ronda;
        Object.assign(g.state.data, { x, z });
        g.altitude = 8;
        g.findInteraction();
        g.action("interact");
      },
      [x, z],
    );
  await check(
    "three sparks awaken the horse",
    () =>
      __ronda.state.data.spirit.sparks.length === 3 &&
      __ronda.bike.userData.sukmaSparks.length === 8,
  );
  await page.evaluate(() => {
    const g = __ronda;
    Object.assign(g.state.data, { x: 108, z: 262 });
    g.altitude = 8;
    g.findInteraction();
    g.action("interact");
  });
  await check(
    "Kliwon gateway enters a controllable crossing",
    () => __ronda.spirit.active && __ronda.spirit.crossing,
  );
  const time = await page.evaluate(() => __ronda.state.data.time);
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => !__ronda.spirit.crossing, {
    timeout: 15000,
  });
  await page.keyboard.up("KeyW");
  assert.equal(await page.evaluate(() => __ronda.state.data.time), time);
  await check(
    "crossing checkpoint saves and village clock pauses",
    () => __ronda.state.data.spirit.crossed,
  );
  await pos(0, 27);
  await interact();
  await check(
    "guest must dismount before requesting entry",
    () => !__ronda.state.data.spirit.welcomed,
  );
  await page.keyboard.press("KeyB");
  await interact();
  await close();
  await check(
    "juru keraton grants audience",
    () => __ronda.state.data.spirit.welcomed,
  );
  for (const p of [
    [-22, 12],
    [22, 0],
    [-24, -17],
  ]) {
    await pos(...p);
    await interact();
  }
  await check(
    "all three relics are collected",
    () => __ronda.state.data.spirit.relics.length === 3,
  );
  await pos(18, -17);
  await interact();
  await page.locator('[data-action="spirit-note"][data-note="0"]').click();
  await page.locator('[data-action="spirit-note"][data-note="1"]').click();
  await check(
    "wrong gamelan order resets the sequence",
    () =>
      __ronda.spirit.melody === 0 && !__ronda.state.data.spirit.melodySolved,
  );
  for (const n of [0, 2, 1, 3])
    await page
      .locator('[data-action="spirit-note"][data-note="' + n + '"]')
      .click();
  await check(
    "correct melody opens boss encounter",
    () => __ronda.state.data.spirit.melodySolved && __ronda.spirit.boss.visible,
  );
  await mkdir("tmp/screenshots", { recursive: true });
  await pos(0, 4);
  await page.waitForTimeout(250);
  await page.screenshot({ path: "tmp/screenshots/spirit-boss.png" });
  // Use real telegraph resolution, both dodge and hit, without waiting on frame rate.
  await page.evaluate(() => {
    const r = __ronda.spirit;
    r.bossPhase = "chase";
    r.bossTime = 0;
    r.position.set(0, 0, -8);
    r.updateBoss(0.05);
    r.position.x = 10;
    r.updateBoss(2);
  });
  await check(
    "leaving the telegraph avoids damage",
    () => __ronda.state.data.hp === __ronda.state.maxHp,
  );
  await page.evaluate(() => {
    const r = __ronda.spirit;
    r.position.set(0, 0, -8);
    r.bossPhase = "chase";
    r.bossTime = 0;
    r.updateBoss(0.05);
    r.updateBoss(2);
  });
  await check(
    "remaining inside the telegraph deals damage",
    () => __ronda.state.data.hp === __ronda.state.maxHp - 22,
  );
  await page.evaluate(() => {
    const g = __ronda,
      r = g.spirit;
    g.state.data.hp = 1;
    r.bossPhase = "chase";
    r.bossTime = 0;
    r.updateBoss(0.05);
    r.updateBoss(2);
  });
  await check(
    "defeat returns with horse and preserves quest checkpoints",
    () =>
      !__ronda.spirit.active &&
      __ronda.state.data.riding &&
      __ronda.state.data.spirit.melodySolved &&
      !__ronda.state.data.spirit.bossDefeated,
  );
  await page.evaluate(() => {
    const g = __ronda;
    Object.assign(g.state.data, { x: 108, z: 262, time: 800, night: 2 });
    g.spirit.enter();
  });
  await check(
    "opened portal works outside Kliwon",
    () => __ronda.spirit.active,
  );
  await page.evaluate(() => {
    const r = __ronda.spirit;
    r.position.set(0, 0, 31);
    r.frame(0.01, 0);
    r.mounted = false;
    r.position.set(0, 0, -8);
  });
  // Exercise the actual attack action/cooldown, retaining normal damage.
  await page.evaluate(() => {
    const g = __ronda,
      r = g.spirit;
    for (let i = 0; i < 20 && !g.state.data.spirit.bossDefeated; i++) {
      r.attackTimer = 0;
      g.action("attack");
    }
  });
  await check(
    "weapon attacks defeat Penjaga Palung",
    () =>
      __ronda.state.data.spirit.bossDefeated && !__ronda.spirit.boss.visible,
  );
  await pos(0, -36);
  await interact();
  await check(
    "queen awards the upgrade",
    () => __ronda.state.data.spirit.blessed,
  );
  const coins = await page.evaluate(() => __ronda.state.data.coins);
  await close();
  await interact();
  await close();
  assert.equal(await page.evaluate(() => __ronda.state.data.coins), coins);
  await pos(24, 20);
  await page.keyboard.press("KeyB");
  await page.keyboard.press("KeyR");
  await check(
    "Mata Sukma reveals hidden chests",
    () => __ronda.spirit.sightTimer > 0,
  );
  await pos(29, 20);
  await interact();
  await check("hidden chest gives one-time treasure", () =>
    __ronda.state.data.spirit.chests.includes("lotus"),
  );
  await page.keyboard.press("KeyV");
  await check(
    "Tapak Samudra enables temporary water traversal",
    () =>
      __ronda.spirit.waterTimer > 0 && __ronda.spirit.canMove({ x: 35, z: 20 }),
  );
  await page.evaluate(() => {
    const r = __ronda.spirit;
    r.position.set(35, 0, 20);
    r.waterTimer = 0.01;
    r.frame(0.02, 0);
  });
  await check("expired water ability returns safely to land", () =>
    __ronda.spirit.onLand(__ronda.spirit.position),
  );
  await pos(0, -22);
  await page.waitForTimeout(250);
  await page.screenshot({ path: "tmp/screenshots/spirit-palace.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: "tmp/screenshots/spirit-mobile.png" });
  await check(
    "mobile layout has no horizontal overflow",
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await page.evaluate(() => __ronda.state.save());
  await page.reload();
  await page.waitForFunction(() => !!window.__ronda, { timeout: 60000 });
  await check(
    "reload safely restores village and completed quest",
    () =>
      !__ronda.spirit.active &&
      __ronda.state.data.spirit.blessed &&
      __ronda.state.data.spirit.chests.includes("lotus"),
  );
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
