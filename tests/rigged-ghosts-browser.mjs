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
    g.renderer.setPixelRatio(0.5);
    g.renderer.shadowMap.enabled = false;
    g.audio.setEnabled(false);
    g.state.data.night = 2;
    g.state.data.time = 1200;
    g.weather.set("clear", false);
    await Promise.all(g.enemies.map((e) => e.model.userData.ready));
    g.updateEnemies(0);
  });
  await check(
    "24 imported assets have four playable clips and independent skeletons",
    async () => {
      const { GHOST_ASSETS, animateImportedGhost, disposeImportedGhost } =
        await import("/src/ghost-assets.js");
      const { makeGhost } = await import("/src/models.js");
      const { GHOSTS } = await import("/src/data.js");
      for (const id of Object.keys(GHOST_ASSETS)) {
        const def = GHOSTS.find((d) => d.id === id),
          a = makeGhost(def),
          b = makeGhost(def);
        await Promise.all([a.userData.ready, b.userData.ready]);
        for (const m of [a, b]) {
          if (
            m.userData.assetError ||
            !["idle", "walk", "attack", "death"].every(
              (k) => m.userData.actions[k],
            )
          )
            throw Error(id + " clips");
        }
        const pose = (m) => {
          const p = [];
          m.userData.rigModel.traverse((n) =>
            p.push(...n.position.toArray(), ...n.quaternion.toArray()),
          );
          return p.join();
        };
        const original = pose(a),
          other = pose(b);
        for (let i = 0; i < 10; i++)
          animateImportedGhost(a, i * 0.05, { moving: true, dt: 0.05 });
        if (
          pose(a) === original ||
          pose(b) !== other ||
          a.position.length() !== 0
        )
          throw Error(id + " walk isolation");
        animateImportedGhost(a, 1, { attack: 1, dt: 0.05 });
        if (a.userData.animation !== "attack") throw Error(id + " attack");
        for (let i = 0; i < 25; i++)
          animateImportedGhost(a, 2 + i * 0.05, { dt: 0.05 });
        if (a.userData.animation !== "idle") throw Error(id + " idle return");
        animateImportedGhost(a, 4, { dead: true, dt: 0.05 });
        if (a.userData.animation !== "death" || a.userData.deathDuration < 1)
          throw Error(id + " death");
        let skinA, skinB;
        a.traverse((n) => {
          if (n.isSkinnedMesh) skinA = n;
        });
        b.traverse((n) => {
          if (n.isSkinnedMesh) skinB = n;
        });
        if (
          skinA &&
          (skinA.skeleton === skinB.skeleton ||
            skinA.skeleton.bones[0] === skinB.skeleton.bones[0])
        )
          throw Error(id + " shared bones");
        disposeImportedGhost(a);
        animateImportedGhost(b, 1, { moving: true, dt: 0.1 });
        disposeImportedGhost(b);
      }
      return Object.keys(GHOST_ASSETS).length === 24;
    },
  );
  await check(
    "ordinary nights show locals, Kliwon replaces them and spreads guests",
    () => {
      const g = __ronda;
      const regular = (e) =>
        !e.human && !e.raid && !e.incident && !e.dino && !e.witch;
      if (
        g.enemies
          .filter((e) => regular(e) && e.def.global)
          .some((e) => e.active)
      )
        return false;
      g.life.dispatch(0);
      g.state.data.night = 4;
      g.updateEnemies(0);
      g.life.update(0, 1);
      if (
        g.enemies.some(
          (e) =>
            !e.human &&
            !e.def.global &&
            !e.incident &&
            !e.dino &&
            !e.witch &&
            e.active,
        )
      )
        return false;
      const guests = g.enemies.filter((e) => regular(e) && e.def.global);
      if (
        guests.some(
          (e) =>
            !e.active ||
            !e.model.visible ||
            (!e.def.amphibious && !g.world.canMove(e.home.x, e.home.z, 0.8)),
        )
      )
        return false;
      console.log(
        "coverage",
        guests.map((e) => [e.def.id, e.home.x, e.home.z]),
      );
      return (
        Math.min(...guests.map((e) => e.home.x)) < -150 &&
        Math.max(...guests.map((e) => e.home.x)) > 200 &&
        Math.min(...guests.map((e) => e.home.z)) < -180 &&
        Math.max(...guests.map((e) => e.home.z)) > 350
      );
    },
  );
  await check(
    "Kappa reaches a fisher on land, carries them and releases on defeat",
    () => {
      const g = __ronda,
        e = g.enemies.find((e) => e.def.id === "kappa");
      g.life.update(0, 2);
      const f = g.frontier.fishers[0];
      if (!f.n.active) return false;
      for (let i = 0; i < 300 && !e.kappaCaptive; i++) {
        g.elapsed += 0.05;
        g.updateEnemies(0.05);
      }
      if (!e.kappaCaptive)
        throw Error("Kappa did not reach fisher at " + JSON.stringify(f.n.def));
      if (e.pos.x > 143 && e.pos.x < 167)
        throw Error("Kappa did not leave river");
      const n = e.kappaCaptive.n,
        position = e.kappaCaptive.position.clone();
      for (let i = 0; i < 100; i++) {
        g.elapsed += 0.05;
        g.updateEnemies(0.05);
      }
      g.frontier.update(0, g.elapsed);
      const f2 = g.frontier.fishers.find((f) => f.n === n);
      if (!n.kappaCaptive || !n.model.visible || f2.line.visible) return false;
      g.defeat(e, false);
      if (n.kappaCaptive || !n.model.position.equals(position) || !n.active)
        return false;
      const echo = g.ghostDepartures.at(-1);
      return echo.duration > 1.5 && echo.model.userData.animation === "death";
    },
  );
  await check("capturing Kappa frees its fisher and adds it to the almanac", async () => {
    const g = __ronda;
    const { updateKappa } = await import("/src/ghost-encounters.js");
    const e = g.enemies.find(e => e.def.id === "kappa" && e.hp > 0);
    const f = g.frontier.fishers.find(f => Math.abs(f.n.def.z - e.home.z) < 55);
    e.pos.copy(f.n.model.position);
    updateKappa(g,e,.1);
    if (!e.kappaCaptive) return false;
    const n = e.kappaCaptive.n;
    Object.assign(g.state.data,{x:e.pos.x,z:e.pos.z+4,riding:false});
    g.altitude=0; g.lockedTarget=e; g.cooldowns.bottle=0; e.hp=e.maxHp*.2;
    const random=Math.random;
    try { Math.random=()=>0; g.capture(); for(let i=0;i<80;i++)g.updateProjectiles(.02); }
    finally { Math.random=random; }
    Object.assign(g.state.data,{x:0,z:0});
    return !n.kappaCaptive && g.state.data.collection.some(c=>c.id==='kappa');
  });
  await check(
    "dawn releases captive NPCs and next regular night restores locals",
    async () => {
      const g = __ronda,
        e = g.enemies.find((e) => e.def.id === "kappa" && e.hp > 0);
      const { updateKappa } = await import("/src/ghost-encounters.js");
      const f = g.frontier.fishers.find(
        (f) => Math.abs(f.n.def.z - e.home.z) < 55,
      );
      if (!f) throw Error("no river fisher");
      e.pos.copy(f.n.model.position);
      updateKappa(g, e, 0.1);
      if (!e.kappaCaptive) throw Error("not captured");
      g.state.data.time = 400;
      g.updateEnemies(0.1);
      if (f.n.kappaCaptive) return false;
      g.state.data.night = 5;
      g.state.data.time = 1200;
      g.updateEnemies(0);
      return (
        g.enemies.some((e) => e.def.id === "suster-ngesot" && e.active) &&
        g.enemies.filter((e) => e.def.global).every((e) => !e.active)
      );
    },
  );
  await check(
    "new local spawn is walkable and almanac includes all new voices and portraits",
    async () => {
      const g = __ronda;
      const e = g.enemies.find((e) => e.def.id === "suster-ngesot");
      if (!g.world.canMove(e.home.x, e.home.z, 0.8))
        throw Error("Suster spawn blocked " + JSON.stringify(e.home));
      const { GHOSTS } = await import("/src/data.js");
      const { GHOST_VOICES } = await import("/src/ghost-audio.js");
      for (const id of [
        "kappa",
        "skeleton",
        "slender-man",
        "biarawati-iblis",
        "suster-ngesot",
      ]) {
        if (!GHOST_VOICES.has(id) || !GHOSTS.find((g) => g.id === id))
          return false;
        const img = new Image();
        img.src = "/portraits/" + id + ".png";
        await img.decode();
        if (img.naturalWidth !== 384) return false;
      }
      return true;
    },
  );
  await page.evaluate(() => {
    const g = __ronda,
      e = g.enemies.find((e) => e.def.id === "suster-ngesot");
    Object.assign(g.state.data, { x: e.pos.x, z: e.pos.z + 7 });
    g.world.update(0.016, 20, g.state, g.state.data);
    g.camera.position.set(e.pos.x + 4, 3, e.pos.z + 6);
    g.camera.lookAt(e.pos.x, 0.8, e.pos.z);
    g.ui.update(0.2);
    g.renderer.render(g.scene, g.camera);
  });
  await page.screenshot({ path: "artifacts/rigged-suster.png" });
  assert.deepEqual(errors, []);
  console.log("PASS no browser or WebGL errors");
} finally {
  await browser.close();
}
