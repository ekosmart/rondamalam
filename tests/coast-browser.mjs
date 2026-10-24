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
const move = async (x, z) =>
  page.evaluate(
    ([x, z]) => {
      const g = __ronda;
      Object.assign(g.state.data, { x, z, riding: false });
      g.altitude = 0;
      g.updatePlayer(0);
      g.findInteraction();
    },
    [x, z],
  );
const interact = async () =>
  page.evaluate(() => {
    __ronda.findInteraction();
    __ronda.action("interact");
  });
try {
  await page.goto(
    process.env.COAST_TEST_URL || "http://127.0.0.1:5176/?test=1",
  );
  await page.waitForFunction(() => !!window.__ronda, { timeout: 60000 });
  await page.locator('[data-action="start"]').click();
  await page.evaluate(() => {
    __ronda.state.data.time = 9 * 60;
    __ronda.weather.set("clear", false);
    __ronda.cameraYaw = 0;
  });
  await move(20, 280);
  await page.keyboard.down("KeyS");
  await page.evaluate(() => {
    for (let i = 0; i < 100; i++) __ronda.updatePlayer(0.02);
  });
  await page.keyboard.up("KeyS");
  await check(
    "walk seamlessly across the old southern boundary",
    () => __ronda.state.data.z > 285,
  );
  await check("one Buto Ijo and reachable quest interaction points", () => {
    const g = __ronda;
    return (
      g.enemies.filter((e) => e.def.id === "buto-ijo").length === 1 &&
      [
        [-6, 335],
        [-8, 355],
        [-24, 396],
        [-24, 315],
        [30, 446],
        [84, 330],
        [161, 420],
        [195, 440],
      ].every(([x, z]) => g.world.canMove(x, z))
    );
  });
  await move(-6, 335);
  await interact();
  await check(
    "talking to Bu Sari only offers the quest",
    () => !__ronda.state.data.coast.started,
  );
  await page.locator('[data-action="close"]').last().click();
  await check(
    "declining preserves unaccepted quest",
    () => !__ronda.state.data.coast.started,
  );
  await interact();
  await page.locator('[data-action="coast-accept"]').click();
  await check(
    "captain starts lighthouse quest",
    () => __ronda.state.data.coast.started,
  );
  await page.evaluate(() => __ronda.ui.close());
  await move(84, 330);
  await interact();
  await check(
    "boat is gated until lighthouse repaired",
    () => !__ronda.coast.boating,
  );
  for (const p of [
    [-8, 355],
    [-24, 396],
    [-24, 315],
  ]) {
    await move(...p);
    await interact();
  }
  await move(30, 446);
  await interact();
  await check(
    "three components repair the lighthouse",
    () => __ronda.state.data.coast.lighthouse,
  );
  await move(84, 330);
  await interact();
  await check(
    "rescue mission must be requested from NPC",
    () => !__ronda.coast.boating && !__ronda.state.data.coast.rescueAccepted,
  );
  await move(-6, 335);
  await interact();
  await page.locator('[data-action="coast-accept"][data-id="rescue"]').click();
  await move(84, 330);
  await interact();
  await check("loan motorboat can be boarded", () => __ronda.coast.boating);
  const z = await page.evaluate(() => __ronda.state.data.z);
  await page.keyboard.down("KeyS");
  await page.evaluate(() => {
    for (let i = 0; i < 40; i++) __ronda.updatePlayer(0.02);
  });
  await page.keyboard.up("KeyS");
  assert.ok((await page.evaluate(() => __ronda.state.data.z)) > z + 3);
  await page.evaluate(() => {
    const g = __ronda;
    g.state.data.x = 62;
    g.state.data.z = 350;
    g.cameraYaw = 0;
  });
  await page.keyboard.down("KeyA");
  await page.waitForTimeout(400);
  await page.keyboard.up("KeyA");
  await check(
    "boat cannot drive onto the beach",
    () => __ronda.state.data.x > 60,
  );
  for (const p of [
    [133, 373],
    [244, 475],
  ]) {
    await page.evaluate(([x, z]) => {
      const g = __ronda;
      g.state.data.x = x;
      g.state.data.z = z;
      g.findInteraction();
      g.action("interact");
    }, p);
  }
  await check(
    "two passengers board their rescue boat",
    () =>
      __ronda.coast.aboard.length === 2 &&
      __ronda.state.data.coast.rescued.length === 0,
  );
  await page.evaluate(() => {
    const g = __ronda;
    g.state.data.x = 93;
    g.state.data.z = 330;
    g.findInteraction();
    g.action("interact");
  });
  await check(
    "returning fishermen unlocks permanent boat ownership",
    () =>
      !__ronda.coast.boating &&
      __ronda.state.data.coast.boatOwned &&
      __ronda.state.data.coast.rescued.length === 2,
  );
  await check(
    "wreck mission does not auto-start",
    () => !__ronda.state.data.coast.wreckAccepted,
  );
  await move(-6, 335);
  await interact();
  await page.locator('[data-action="coast-accept"][data-id="wreck"]').click();
  await move(84, 330);
  await interact();
  await page.evaluate(() => {
    const g = __ronda;
    g.state.data.x = 153;
    g.state.data.z = 420;
    g.findInteraction();
    g.action("interact");
  });
  await check(
    "island pier allows safe disembarkation",
    () => !__ronda.coast.boating && __ronda.state.data.x === 161,
  );
  await move(195, 440);
  await interact();
  await page.evaluate(() => __ronda.ui.close());
  await check(
    "wreck reveals the spirit realm relic",
    () => __ronda.state.data.coast.relic,
  );
  await page.evaluate(() => {
    __ronda.state.data.time = 1200;
    __ronda.state.data.night = 2;
    __ronda.weather.set("clear", false);
    __ronda.updateEnemies(0);
  });
  await move(185, 410);
  await check(
    "Buto Ijo appears at night",
    () => __ronda.enemies.find((e) => e.def.id === "buto-ijo").active,
  );
  await mkdir("tmp/screenshots", { recursive: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "tmp/screenshots/coast-buto.png" });
  await page.evaluate(() => {
    const g = __ronda,
      e = g.enemies.find((e) => e.def.id === "buto-ijo");
    e.pos.set(190, 0, 420);
    Object.assign(g.state.data, { x: 190, z: 414 });
    g.lockedTarget = e;
    g.damageEnemy(e, e.maxHp * 0.8, "player");
    g.cooldowns.bottle = 0;
    const random = Math.random;
    try {
      Math.random = () => 0;
      g.capture();
      for (let i = 0; i < 80; i++) g.updateProjectiles(0.02);
    } finally {
      Math.random = random;
    }
  });
  await check(
    "giant can be captured and advances the coastal quest",
    () =>
      __ronda.state.data.coast.butoDefeated &&
      __ronda.state.data.collection.some((x) => x.id === "buto-ijo"),
  );
  await page.evaluate(() => {
    __ronda.state.data.companion = "buto-ijo";
    __ronda.updateCompanion();
  });
  await check(
    "Buto Ijo works as an almanac companion",
    () => !!__ronda.companionModel.userData.body,
  );
  await move(-6, 335);
  await interact();
  await page.locator('[data-action="coast-claim"]').click();
  await check(
    "final quest is completed",
    () => __ronda.state.data.coast.completed,
  );
  const coins = await page.evaluate(() => __ronda.state.data.coins);
  await page.evaluate(() => __ronda.action("coast-claim"));
  assert.equal(await page.evaluate(() => __ronda.state.data.coins), coins);
  await page.evaluate(() => {
    __ronda.state.data.frontier.bag.wader = 2;
    __ronda.action("coast-sell");
  });
  assert.equal(await page.evaluate(() => __ronda.state.data.coins), coins + 14);
  await page.evaluate(() => __ronda.ui.close());
  await page.evaluate(() => {
    __ronda.state.data.time = 9 * 60;
    __ronda.weather.set("clear", false);
    __ronda.cameraDistance = 48;
    __ronda.cameraYaw = 0.8;
    __ronda.ui.toastTimer = 0;
    document.querySelector("#toast").classList.remove("show");
  });
  await move(27, 358);
  await page.waitForTimeout(1200);
  await check(
    "coastal quest panel never covers walking view",
    () =>
      getComputedStyle(document.querySelector("#coast-hud")).display === "none",
  );
  await page.evaluate(() => __ronda.ui.open("journal"));
  await check("coastal tasks live in journal", () =>
    document
      .querySelector("#panel-content")
      .textContent.includes("Kapal Tanpa Awak"),
  );
  await page.screenshot({ path: "tmp/screenshots/regional-journal.png" });
  await page.evaluate(() => __ronda.ui.close());
  await page.screenshot({ path: "tmp/screenshots/karang-tirta.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "tmp/screenshots/coast-mobile.png" });
  await check(
    "mobile layout has no horizontal overflow",
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await move(84, 330);
  await interact();
  await page.evaluate(() => {
    __ronda.state.data.x = 130;
    __ronda.state.data.z = 380;
    __ronda.state.save();
  });
  await page.reload();
  await page.waitForFunction(() => !!window.__ronda, { timeout: 60000 });
  await check(
    "sea save reloads safely at dock with rewards preserved",
    () =>
      !__ronda.coast.boating &&
      __ronda.state.data.x === 84 &&
      __ronda.state.data.z === 330 &&
      __ronda.state.data.coast.completed,
  );
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
