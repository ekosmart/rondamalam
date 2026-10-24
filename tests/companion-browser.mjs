import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
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
try {
  await page.goto("http://127.0.0.1:5176/?test=1");
  await page.waitForFunction(() => window.__ronda, { timeout: 60000 });
  await page.locator('[data-action="start"]').click();
  await page.evaluate(async () => {
    const g = __ronda;
    g.renderer.setAnimationLoop(null);
    g.renderer.setPixelRatio(0.65);
    g.renderer.shadowMap.enabled = false;
    g.audio.setEnabled(false);
    Object.assign(g.state.data, { night: 2, time: 1200 });
    g.weather.set("clear", false);
    await Promise.all(g.enemies.map((e) => e.model.userData.ready));
    g.updateEnemies(0);
    g.state.data.collection.push(
      { id: "tuyul", level: 5, xp: 0, awakened: false },
      { id: "begu", level: 5, xp: 0, awakened: true },
    );
  });
  await check(
    "small and tall companions match wild model size, including awakening",
    async () => {
      const g = __ronda;
      const THREE = await import("/node_modules/three/build/three.module.js");
      for (const id of ["tuyul", "begu"]) {
        g.state.data.companion = id;
        g.updateCompanion();
        await g.companionModel.userData.ready;
        const wild = g.enemies.find((e) => e.def.id === id).model;
        const a = new THREE.Box3()
          .setFromObject(g.companionModel.userData.body)
          .getSize(new THREE.Vector3());
        const b = new THREE.Box3()
          .setFromObject(wild.userData.body)
          .getSize(new THREE.Vector3());
        if (Math.abs(a.y - b.y) > 0.03 || g.companionModel.scale.x !== 1)
          throw Error(id + " size");
      }
      return true;
    },
  );
  await page.evaluate(async () => {
    const g = __ronda;
    g.state.data.companion = "tuyul";
    g.updateCompanion();
    await g.companionModel.userData.ready;
    let site;
    for (let z = -240; z < 200 && !site; z += 15)
      for (let x = -260; x < 100 && !site; x += 15) {
        if (
          Array.from(
            { length: 38 },
            (_, i) =>
              g.world.canMove(x + i, z, 1.2) &&
              g.world.canMove(x + i, z + 7, 1.2),
          ).every(Boolean)
        )
          site = { x: x + 12, z };
      }
    if (!site) throw Error("no open lane");
    window.companionTestSite = site;
    Object.assign(g.state.data, { x: site.x, z: site.z + 7 });
    g.companionModel.position.set(site.x - 10, 0, site.z);
    const e = g.enemies.find((e) => e.def.id === "pocong");
    e.pos.set(site.x + 15, 0, site.z);
    e.hp = e.maxHp;
    e.active = true;
    e.model.visible = true;
    g.lockedTarget = null;
    window.companionTestEnemy = e;
  });
  await check(
    "no selected target means following without damaging nearby enemies",
    () => {
      const g = __ronda,
        e = companionTestEnemy,
        hp = e.hp,
        p = g.companionModel.position.clone();
      for (let i = 0; i < 30; i++) {
        g.elapsed += 0.05;
        g.companionAI.update(0.05);
      }
      return (
        e.hp === hp &&
        g.companionAI.mode === "follow" &&
        p.distanceTo(g.companionModel.position) > 1 &&
        g.companionModel.userData.animation === "walk"
      );
    },
  );
  await check(
    "selected target is approached with walk animation and attacked only in reach",
    () => {
      const g = __ronda,
        e = companionTestEnemy;
      g.lockedTarget = e;
      const hp = e.hp;
      g.elapsed += 0.05;
      g.companionAI.update(0.05);
      if (e.hp !== hp || g.companionAI.mode !== "chase") return false;
      let walked = false,
        attacked = false;
      for (let i = 0; i < 500; i++) {
        g.elapsed += 0.05;
        g.companionAI.update(0.05);
        walked ||= g.companionModel.userData.animation === "walk";
        attacked ||= g.companionModel.userData.animation === "attack";
      }
      return walked && attacked && e.hp > 0 && e.hp / e.maxHp <= 0.25;
    },
  );
  await check(
    "weakened enemy is protected from auto attacks and G skill",
    () => {
      const g = __ronda,
        e = companionTestEnemy,
        hp = e.hp;
      for (let i = 0; i < 150; i++) {
        g.elapsed += 0.05;
        g.companionAI.update(0.05);
      }
      g.cooldowns.companion = 0;
      g.companionSkill();
      g.damageEnemy(e, 10000, "companion");
      return e.hp === hp && e.hp > 0 && g.cooldowns.companion === 0;
    },
  );
  await check(
    "target cancellation and player damage during wind-up cancel the pending hit",
    () => {
      const g = __ronda,
        e = companionTestEnemy;
      e.hp = e.maxHp;
      g.companionModel.position.copy(e.pos);
      g.companionModel.position.z += 2;
      g.companionAI.cooldown = 0;
      g.lockedTarget = e;
      g.companionAI.update(0.05);
      if (!g.companionAI.windup) return false;
      g.lockedTarget = null;
      for (let i = 0; i < 20; i++) {
        g.elapsed += 0.05;
        g.companionAI.update(0.05);
      }
      if (e.hp !== e.maxHp) return false;
      g.companionModel.position.copy(e.pos);
      g.companionModel.position.z += 2;
      g.companionAI.cooldown = 0;
      g.lockedTarget = e;
      g.companionAI.update(0.05);
      e.hp = e.maxHp * 0.2;
      for (let i = 0; i < 20; i++) {
        g.elapsed += 0.05;
        g.companionAI.update(0.05);
      }
      return e.hp === e.maxHp * 0.2;
    },
  );
  await check(
    "walking companion remains grounded when player flies and idles after arriving",
    () => {
      const g = __ronda;
      g.lockedTarget = null;
      g.altitude = 12;
      for (let i = 0; i < 260; i++) {
        g.elapsed += 0.05;
        g.companionAI.update(0.05);
      }
      const p = g.companionModel.position;
      return (
        Math.abs(p.y - g.world.groundHeight(p.x, p.z)) < 0.05 &&
        g.companionModel.userData.animation === "idle"
      );
    },
  );
  await check(
    "path navigation routes around a building without crossing its collider",
    () => {
      const g = __ronda,
        a = g.companionAI,
        p = companionTestSite;
      g.altitude = 0;
      g.companionModel.position.set(p.x - 8, 0, p.z);
      const c = { x: p.x, z: p.z, w: 2, d: 3 };
      g.world.colliders.push(c);
      a.nav.cache.clear();
      a.actor.navigation = null;
      let valid = true;
      for (let i = 0; i < 200; i++) {
        a.nav.move(a.actor, p.x + 8, p.z, 6, 0.05);
        valid &&= g.world.canMove(
          a.model.position.x,
          a.model.position.z,
          a.radius,
        );
      }
      g.world.colliders.splice(g.world.colliders.indexOf(c), 1);
      a.nav.cache.clear();
      return (
        valid &&
        Math.hypot(a.model.position.x - (p.x + 8), a.model.position.z - p.z) < 1
      );
    },
  );
  await check(
    "awakened area skill also respects the capture limit on all victims",
    () => {
      const g = __ronda,
        e = companionTestEnemy,
        p = companionTestSite;
      Object.assign(g.state.data, { x: p.x, z: p.z + 7 });
      e.pos.set(p.x + 2, 0, p.z + 7);
      e.hp = e.maxHp;
      e.active = true;
      g.lockedTarget = e;
      g.state.companion.awakened = true;
      g.cooldowns.companion = 0;
      g.companionSkill();
      return e.hp > 0 && e.hp / e.maxHp <= 0.25;
    },
  );
  await page.evaluate(() => {
    const g = __ronda;
    g.lockedTarget = null;
    g.companionAI.recall();
    g.world.update(0.016, 20, g.state, g.state.data);
    g.ui.update(0.2);
    const p = g.companionModel.position;
    g.camera.position.set(p.x + 5, 4, p.z + 6);
    g.camera.lookAt(p.x, 1, p.z);
    g.renderer.render(g.scene, g.camera);
  });
  await page.screenshot({ path: "artifacts/companion-walking.png" });
  assert.deepEqual(errors, []);
  console.log("PASS no browser/WebGL errors");
} finally {
  await browser.close();
}
