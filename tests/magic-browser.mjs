import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
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
const tick = async (seconds) =>
  page.evaluate((seconds) => {
    const g = __ronda;
    for (let i = 0; i < seconds * 20; i++) {
      g.elapsed += 0.05;
      g.magic.update(0.05, g.elapsed);
    }
  }, seconds);
const render = async () =>
  page.evaluate(() => {
    const g = __ronda;
    g.world.update(0, g.elapsed, g.state, g.state.data);
    g.weather.render(0);
    g.updatePlayer(0);
    g.updateLight();
    g.updateCamera(3);
    g.ui.update(0.2);
    g.renderer.render(g.scene, g.camera);
  });
try {
  await page.goto(
    process.env.MAGIC_TEST_URL || "http://127.0.0.1:5176/?test=1",
  );
  await page.waitForFunction(
    () => window.__ronda?.magic?.ready || window.__ronda?.magic?.error,
    { timeout: 60000 },
  );
  await check(
    "all supplied models loaded",
    () => __ronda.magic.ready && !__ronda.magic.error,
  );
  await page.locator('[data-action="start"]').click();
  await page.evaluate(() => {
    const g = __ronda;
    g.renderer.setAnimationLoop(null);
    g.weather.set("clear", false);
    g.state.data.time = 1320;
    g.magic.s.checkedNight = g.state.data.night;
    g.ui.tipTimer = 0;
    g.life.update(0.01, g.elapsed);
    g.state.data.hp = g.state.maxHp;
  });
  await check(
    "new quests require NPC acceptance",
    () =>
      !__ronda.magic.s.accepted &&
      !__ronda.magic.s.stationAccepted &&
      !__ronda.magic.s.trialAccepted,
  );
  await move(12, 28);
  await interact();
  await check(
    "Laras dialogue does not auto accept",
    () => __ronda.ui.panel === "dialogue" && !__ronda.magic.s.accepted,
  );
  await page.locator('[data-action="magic-accept"]').click();
  await check(
    "accepted quest grants two antidotes once",
    () => __ronda.magic.s.accepted && __ronda.magic.s.potions === 2,
  );
  await page.evaluate(() => {
    __ronda.action("magic-accept");
    __ronda.ui.close();
  });
  await check(
    "accept cannot duplicate supply",
    () => __ronda.magic.s.potions === 2,
  );
  for (const type of ["frog", "stone"]) {
    await page.evaluate((type) => __ronda.magic.startRaid(type), type);
    await tick(5);
    await check(
      type + " projectile transforms a real resident",
      () =>
        __ronda.magic.s.cursed.some(
          (c) => c.type === __ronda.magic.enemy.type,
        ) &&
        [...__ronda.magic.curses.values()].some(
          (c) => !c.n.model.visible && c.n.witchCursed,
        ),
    );
    console.log(
      "model bounds",
      await page.evaluate(async () => {
        const T = await import("/node_modules/.vite/deps/three.js");
        const e = __ronda.magic.enemy;
        return new T.Box3()
          .setFromObject(e.model)
          .getSize(new T.Vector3())
          .toArray();
      }),
    );
    await page.evaluate(() => {
      const g = __ronda,
        e = g.magic.enemy;
      Object.assign(g.state.data, { x: e.pos.x, z: e.pos.z + 3 });
      g.altitude = 0;
      g.updatePlayer(0);
      g.cameraYaw = 0.4;
      g.cameraDistance = 24;
      g.lockedTarget = e;
    });
    await render();
    await page.screenshot({ path: `artifacts/magic-${type}-raid.png` });
    await page.evaluate(() => {
      const g = __ronda;
      for (let i = 0; i < 30 && g.magic.enemy; i++) {
        g.cooldowns.attack = 0;
        g.attack();
      }
    });
    await check(
      type + " witch defeated through normal combat",
      () => !__ronda.magic.enemy && __ronda.magic.s.defeated.length > 0,
    );
  }
  await page.evaluate(() => __ronda.state.save());
  await page.reload();
  await page.waitForFunction(() => window.__ronda?.magic?.ready, {
    timeout: 60000,
  });
  await page.locator('[data-action="start"]').click();
  await page.evaluate(() => {
    __ronda.renderer.setAnimationLoop(null);
    __ronda.weather.set("clear", false);
  });
  await check(
    "frog and statue victims survive save/reload",
    () =>
      __ronda.magic.s.cursed.length === 2 &&
      __ronda.magic.curses.size === 2 &&
      [...__ronda.magic.curses.values()].every(
        (c) => c.n.witchCursed && !c.n.model.visible,
      ),
  );
  const victim = await page.evaluate(() => __ronda.magic.s.cursed[0]);
  await move(victim.x, victim.z);
  await interact();
  await check(
    "antidote restores resident and consumes one potion",
    () => __ronda.magic.s.rescued === 1 && __ronda.magic.s.potions === 1,
  );
  await page.evaluate(() => __ronda.action("magic-potion"));
  await check(
    "potion protection starts",
    () => __ronda.magic.protection === 25 && __ronda.magic.s.potions === 0,
  );
  await move(12, 28);
  await interact();
  await page.locator('[data-action="magic-supply"]').click();
  await check(
    "Laras provides recovery supply when empty",
    () => __ronda.magic.s.potions === 2,
  );
  await page.locator('[data-action="magic-ticket"]').click();
  await check("ticket earned and permanent", () => __ronda.magic.s.ticket);
  await page.evaluate(() => __ronda.ui.close());
  await check(
    "station approach and all interaction points are walkable",
    () => {
      const w = __ronda.world;
      for (let x = -207; x <= -78; x++) if (!w.canMove(x, 216)) return false;
      for (let z = 216; z <= 263; z++) if (!w.canMove(-207, z)) return false;
      return [
        [-197, 259],
        [-179, 258],
        [-173, 259],
        [-167, 252],
        [-185, 263],
      ].every(([x, z]) => w.canMove(x, z));
    },
  );
  await move(-197, 259);
  await interact();
  await page.locator('[data-action="magic-station"]').click();
  await check(
    "station quest accepted at the ticket booth",
    () => __ronda.magic.s.stationAccepted,
  );
  await move(-179, 258);
  await interact();
  await page.locator('[data-action="magic-note"][data-note="1"]').click();
  await check(
    "wrong book order resets puzzle",
    () => __ronda.magic.progress === 0 && !__ronda.magic.s.bookSolved,
  );
  for (const n of [0, 2, 1])
    await page.locator(`[data-action="magic-note"][data-note="${n}"]`).click();
  await check(
    "book solved only after correct sequence",
    () => __ronda.magic.s.bookSolved && !__ronda.ui.panel,
  );
  await move(-173, 259);
  await interact();
  await check("E grabs the trolley", () => __ronda.magic.pushing);
  await page.evaluate(() => {
    __ronda.state.data.time = 720;
    __ronda.magic.trainTime = 4;
  });
  await move(-167, 252);
  await tick(3);
  await check(
    "daylight denies portal even with ticket and trolley",
    () => !__ronda.magic.active && __ronda.magic.trainTime === 0,
  );
  await page.evaluate(() => {
    __ronda.state.data.time = 1320;
    __ronda.facing = Math.PI;
    __ronda.magic.protection = 0;
  });
  await move(-173, 259);
  await tick(4.1);
  await check(
    "Crimson Express arrives on the rails",
    () =>
      __ronda.magic.trainTime === 4 &&
      __ronda.magic.world.train.g.visible &&
      __ronda.magic.world.carriage.visible,
  );
  await render();
  await page.screenshot({ path: "artifacts/magic-station.png" });
  // Drive the real movement/collision code along the platform and into the portal trigger.
  await page.evaluate(() => {
    const g = __ronda;
    g.cameraYaw = 0;
    g.keys.add("KeyD");
    for (let i = 0; i < 24; i++) g.updatePlayer(0.05);
    g.keys.clear();
    g.state.data.x = -167;
    g.keys.add("KeyW");
    for (let i = 0; i < 27; i++) {
      g.updatePlayer(0.05);
      g.magic.update(0.05, g.elapsed + i * 0.05);
    }
    g.keys.clear();
  });
  await tick(1);
  console.log(
    "portal approach",
    await page.evaluate(() => ({
      x: __ronda.state.data.x,
      z: __ronda.state.data.z,
      prox: __ronda.magic.world.portal.mat.uniforms.uProx.value,
      transit: __ronda.magic.transit,
      active: __ronda.magic.active,
    })),
  );
  await render();
  await page.screenshot({ path: "artifacts/magic-portal.png" });
  await tick(3);
  await check(
    "pushing the trolley activates portal and routes to academy",
    () => __ronda.magic.active && __ronda.magic.s.academyVisited,
  );
  await page.evaluate(() => __ronda.magic.frame(0.05, __ronda.elapsed));
  await page.screenshot({ path: "artifacts/magic-academy.png" });
  await check(
    "academy offers a visible return button",
    () =>
      !!document.querySelector('#magic-controls [data-action="magic-exit"]'),
  );
  await page.evaluate(() => {
    const m = __ronda.magic;
    m.position.set(4, 0, 23);
    __ronda.action("interact");
  });
  await check(
    "professor does not auto grant equipment",
    () =>
      !__ronda.magic.s.trialAccepted &&
      !__ronda.state.data.mounts.includes("sapu"),
  );
  await page.locator('[data-action="magic-trial"]').click();
  await page.evaluate(() => __ronda.ui.close());
  await page.evaluate(() => {
    const m = __ronda.magic;
    m.position.copy(m.academy.targets[1].position);
    m.cast();
  });
  await check(
    "academy seals require the book sequence",
    () => __ronda.magic.s.seals.length === 0,
  );
  for (let i = 0; i < 3; i++)
    await page.evaluate((i) => {
      const m = __ronda.magic;
      m.attackCooldown = 0;
      m.position.copy(m.academy.targets[i].position);
      m.cast();
      m.frame(0.05, __ronda.elapsed);
    }, i);
  await check(
    "three seals release the curse source",
    () =>
      __ronda.magic.s.seals.length === 3 &&
      !__ronda.magic.academy.source.visible,
  );
  await page.evaluate(() => {
    __ronda.magic.position.set(4, 0, 23);
    __ronda.action("interact");
  });
  await page.locator('[data-action="magic-reward"]').click();
  await check(
    "one-time rewards and all villagers freed",
    () =>
      __ronda.magic.s.completed &&
      !__ronda.magic.s.cursed.length &&
      __ronda.state.data.mounts.filter((x) => x === "sapu").length === 1 &&
      __ronda.state.data.weapons.filter((x) => x === "tongkat-sihir").length ===
        1,
  );
  await page.evaluate(() => __ronda.ui.close());
  await page.locator('[data-action="magic-exit"]').click();
  await check(
    "return always reaches safe station floor",
    () =>
      !__ronda.magic.active &&
      __ronda.world.canMove(__ronda.state.data.x, __ronda.state.data.z),
  );
  await page.evaluate(() => {
    const g = __ronda;
    g.action("buy-mount", { id: "sapu" });
    g.action("equip-weapon", { id: "tongkat-sihir" });
    g.action("mount");
    g.action("ascend");
    g.updatePlayer(0.1);
    g.ui.update(0.2);
  });
  await check(
    "earned broom flies and exposes compact altitude controls",
    () =>
      __ronda.isFlying &&
      __ronda.state.data.mount === "sapu" &&
      !document.querySelector("#flight-controls").classList.contains("hidden"),
  );
  await page.evaluate(() => {
    const g = __ronda;
    g.magic.startRaid("frog");
    const e = g.magic.enemy;
    e.pos.set(g.state.data.x + 12, g.altitude + 1, g.state.data.z);
    g.lockedTarget = e;
    g.cooldowns.attack = 0;
    g.attack();
    for (let i = 0; i < 30; i++) g.ranged.update(0.05);
  });
  await check(
    "wand damages enemies without dismounting the broom",
    () => __ronda.state.data.riding && __ronda.magic.enemy.hp < 180,
  );
  await page.evaluate(() => {
    __ronda.magic.stopRaid();
    __ronda.state.save();
  });
  await page.reload();
  await page.waitForFunction(() => window.__ronda?.magic?.ready, {
    timeout: 60000,
  });
  await check(
    "reload preserves quest rewards and recovers a safe village state",
    () =>
      __ronda.magic.s.completed &&
      __ronda.state.data.mounts.includes("sapu") &&
      __ronda.state.data.weapons.includes("tongkat-sihir") &&
      !__ronda.magic.active &&
      __ronda.world.canMove(__ronda.state.data.x, __ronda.state.data.z),
  );
  await check(
    "all synthesized Web Audio cues produce bounded sound and fade out",
    async () => {
      const { magicSound } = await import("/src/magic/audio.js");
      for (const kind of [
        "curse",
        "portal",
        "train",
        "rescue",
        "spell",
        "owl",
      ]) {
        const c = new OfflineAudioContext(1, 48000, 48000),
          master = c.createGain();
        master.gain.value = 0.3;
        master.connect(c.destination);
        magicSound(
          {
            enabled: true,
            master,
            ctx: {
              state: "running",
              currentTime: 0,
              createOscillator: () => c.createOscillator(),
              createGain: () => c.createGain(),
            },
          },
          kind,
        );
        const samples = (await c.startRendering()).getChannelData(0);
        let peak = 0,
          energy = 0;
        for (const v of samples) {
          peak = Math.max(peak, Math.abs(v));
          energy += v * v;
        }
        if (
          peak >= 1 ||
          energy < 0.01 ||
          samples.slice(47000).some((v) => Math.abs(v) > 0.001)
        )
          return false;
      }
      return true;
    },
  );
  assert.deepEqual(errors, []);
  console.log("PASS no browser/WebGL errors");
} finally {
  await browser.close();
}
