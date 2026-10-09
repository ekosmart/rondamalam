import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const b = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const checks = [];
async function check(n, f) {
  assert.ok(await p.evaluate(f), n);
  console.log("PASS", n);
  checks.push(n);
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
    "all friendly dinosaurs and meteor spawns have clear ground",
    () => {
      const g = __ronda;
      g.state.data.incidents.labBuilt = true;
      g.state.data.incidents.event = null;
      g.incidents.start("dino");
      g.incidents.spawnWave();
      return (
        g.frontier.dinos
          .filter((e) => !e.def.air)
          .every((e) => g.world.canMove(e.pos.x, e.pos.z)) &&
        g.incidents.actors.every((e) => g.world.canMove(e.pos.x, e.pos.z))
      );
    },
  );
  await check(
    "wild species have distinct full-scale bounds and a palm nest",
    async () => {
      const { Box3, Vector3 } =
        await import("/node_modules/.vite/deps/three.js");
      const g = __ronda;
      return (
        g.frontier.dinos.every((e) => {
          const size = new Box3().setFromObject(e.model).getSize(new Vector3());
          return e.def.air
            ? Math.abs(size.x - 7) < 0.5
            : Math.abs(size.z - e.def.length) < 0.1;
        }) && g.frontier.dinos.find((e) => e.def.air).pos.y === 13
      );
    },
  );
  await check(
    "Division Z crosses village to intercept aliens and captures weakened ones",
    () => {
      const g = __ronda;
      g.incidents.clearActors();
      g.state.data.incidents.event = null;
      g.incidents.start("alien");
      const e = g.incidents.spawn("alien", 65, -130);
      const n = g.frontier.agents[0],
        before = n.model.position.distanceTo(e.pos);
      for (let i = 0; i < 100; i++) g.frontier.update(0.05, 1 + i * 0.05);
      if (!(n.model.position.distanceTo(e.pos) < before - 10)) return false;
      e.pos.copy(n.model.position).addScalar(1);
      e.hp = e.maxHp * 0.2;
      g.frontier.helperTime = 0;
      g.frontier.update(0.85, 2);
      return (
        !e.active &&
        g.state.data.frontier.zCaptives >= 1 &&
        g.state.data.stats.aliensCaptured === 0
      );
    },
  );
  await check(
    "NPC anglers have active lines, bobbers and repeating catch animations",
    () => {
      const g = __ronda;
      g.state.data.time = 720;
      g.life.update(0, 3);
      g.frontier.update(0, 48);
      return g.frontier.fishers.every(
        (f) => f.line.visible && f.bobber.visible && f.catches > 0,
      );
    },
  );
  await check("spring, telaga and rice channel accept player fishing", () => {
    const g = __ronda;
    return [
      [209, -123],
      [-47, 224],
      [-145, -67],
    ].every(([x, z]) => {
      Object.assign(g.state.data, { x, z });
      return !!g.frontier.fishingSpot();
    });
  });
  await check(
    "dino invasion paths actually carry raptors toward residents",
    () => {
      const g = __ronda;
      g.incidents.clearActors();
      g.state.data.time = 1200;
      g.state.data.incidents.event = null;
      g.incidents.start("dino");
      g.incidents.update(7.1, 5);
      Object.assign(g.state.data, { x: 0, z: 12 });
      const initial = g.incidents.actors.map((e) => e.pos.clone());
      for (let i = 0; i < 250; i++) g.incidents.update(0.1, 5 + i * 0.1);
      return (
        g.incidents.actors.some((e, i) => e.pos.distanceTo(initial[i]) > 25) &&
        g.incidents.actors.every((e) => Math.hypot(e.pos.x, e.pos.z) > 24)
      );
    },
  );
  await check(
    "all three space destinations provide one-time rewards and flight collision blocks planets",
    () => {
      const g = __ronda;
      g.state.data.frontier.spaceUnlocked = true;
      g.expeditions.enter("space");
      g.expeditions.launch = 0;
      for (const { def: d } of g.expeditions.planets) {
        g.expeditions.position.set(d.x, d.y, d.z + d.r + 4.1);
        g.expeditions.interact();
        g.expeditions.interact();
        const before = g.expeditions.position.clone();
        g.keys.add("KeyW");
        g.expeditions.frame(0.05, 20);
        g.keys.clear();
        if (g.expeditions.position.distanceTo(before) > 0.01) return false;
      }
      g.expeditions.exit();
      return (
        g.state.data.frontier.bag.crystal === 13 &&
        g.state.data.frontier.spaceCollected.length === 3
      );
    },
  );
  await check("menu safely exits interior and can resume village", () => {
    const g = __ronda;
    g.expeditions.enter("home");
    g.action("menu");
    const ok =
      !g.expeditions.active &&
      !g.started &&
      !document.body.classList.contains("inside-scene");
    g.ui.handle("start");
    return ok;
  });
  // Capture wide, unobstructed views rather than cropping the large creatures.
  for (const [name, x, z, yaw, dist] of [
    ["park", -230, 214, 0, 43],
    ["corn", -126, 222, Math.PI, 48],
    ["brontosaurus", -185, 267, 0, 60],
    ["tyrannosaurus", 238, 96, 0, 45],
  ]) {
    await p.evaluate(
      ({ x, z, yaw, dist }) => {
        const g = __ronda;
        g.ui.close();
        g.state.data.frontier.dinoSeen = true;
        Object.assign(g.state.data, { x, z, time: 750, riding: false });
        g.incidents.event.phase = "won";
        g.incidents.updateHUD();
        g.state.data.mount = "gyroball";
        g.equipMount();
        g.state.data.riding = true;
        g.cameraYaw = yaw;
        g.cameraDistance = dist;
        g.cameraPitch = 0.52;
        g.frontier.update(0, 0);
        g.updatePlayer(0);
        g.world.update(0, 0, g.state, g.state.data);
        g.updateLight();
        g.updateCamera(1);
        g.ui.update(0.2);
        g.renderer.render(g.scene, g.camera);
      },
      { x, z, yaw, dist },
    );
    await p.screenshot({ path: `tmp/screenshots/frontier-wide-${name}.png` });
  }
  await p.evaluate(() => {
    __ronda.expeditions.enter("home");
    __ronda.expeditions.frame(0.2, 10);
  });
  await p.screenshot({ path: "tmp/screenshots/frontier-home.png" });
  const phone = await b.newPage({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto("http://127.0.0.1:5173/?test=1");
  await phone.waitForFunction(() => window.__ronda);
  await phone.locator("[data-action=start]").tap();
  await phone.evaluate(() => {
    const g = __ronda;
    g.renderer.setAnimationLoop(null);
    g.audio.enabled = false;
    g.expeditions.enter("home");
    g.expeditions.frame(0.2, 10);
  });
  assert.ok(await phone.locator("#move-joystick").isVisible());
  const rect = await phone.locator("[data-action=scene-exit]").boundingBox();
  assert.ok(
    rect.x >= 0 && rect.x + rect.width <= 844 && rect.y + rect.height < 155,
  );
  await phone.locator("[data-action=scene-exit]").tap();
  assert.ok(await phone.evaluate(() => !__ronda.expeditions.active));
  console.log("PASS house touch controls and exit fit landscape phone");
  checks.push("house touch controls and exit fit landscape phone");
  await phone.evaluate(() => {
    __ronda.state.data.frontier.spaceUnlocked = true;
    __ronda.expeditions.enter("space");
    __ronda.expeditions.launch = 0;
    __ronda.expeditions.frame(0.2, 11);
  });
  const y = await phone.evaluate(() => __ronda.expeditions.position.y);
  await phone.locator("#expedition-hud [data-action=ascend]").tap();
  assert.equal(
    await phone.evaluate(() => __ronda.expeditions.position.y),
    y + 4,
  );
  await phone.locator("[data-action=space-target][data-id=ares]").tap();
  assert.equal(await phone.evaluate(() => __ronda.expeditions.target), "ares");
  await phone.evaluate(() => __ronda.expeditions.frame(0.2, 12));
  await phone.screenshot({ path: "tmp/screenshots/frontier-mobile-space.png" });
  console.log("PASS space destinations and vertical controls work by touch");
  checks.push("space destinations and vertical controls work by touch");
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "tmp/frontier-extra-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(checks.length + " extra checks passed");
} finally {
  await b.close();
}
