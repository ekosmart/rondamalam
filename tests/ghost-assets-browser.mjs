import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
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
    // Keep the full-world screenshot practical on headless software WebGL.
    g.renderer.setPixelRatio(.5);
    g.renderer.shadowMap.enabled = false;
    g.audio.setEnabled(false);
    g.state.data.time = 1200;
    g.state.data.night = 2;
    g.weather.set("clear", false);
    await Promise.all(g.enemies.map((e) => e.model.userData.ready));
    g.updateEnemies(0);
  });
  await check(
    "24 imported ghosts load, animate locally and retain individual materials",
    async () => {
      const { GHOST_ASSETS } = await import("/src/ghost-assets.js");
      const { animateFolkloreGhost } = await import("/src/folklore-models.js");
      for (const id of Object.keys(GHOST_ASSETS)) {
        const copies = __ronda.enemies.filter(
          (e) => e.def.id === id && !e.raid,
        );
        if (copies.length < 2) throw Error(`${id}: missing copies`);
        __ronda.state.data.night = copies[0].def.global ? 4 : 2;
        __ronda.updateEnemies(0);
        const m = copies[0].model,
          r = m.userData;
        if (
          !r.loaded ||
          r.assetError ||
          r.importedGhost !== id ||
          !copies[0].active
        )
          throw Error(`${id}: not loaded/active`);
        if (r.own === copies[1].model.userData.own)
          throw Error(`${id}: shared material`);
        const position = m.position.clone(),
          rotation = m.quaternion.clone(),
          scale = m.scale.clone();
        animateFolkloreGhost(m, 1, { moving: true });
        const before = r.mixer.time;
        animateFolkloreGhost(m, 2, { moving: true, attack: 0.5, hit: 0.1 });
        if (
          before === r.mixer.time ||
          !m.position.equals(position) ||
          !m.quaternion.equals(rotation) ||
          !m.scale.equals(scale)
        )
          throw Error(`${id}: transforms`);
      }
      return true;
    },
  );
  console.log(
    "Wewe homes",
    await page.evaluate(() =>
      __ronda.enemies
        .filter((e) => e.def.id === "wewe-gombel")
        .map((e) => ({
          x: e.home.x,
          z: e.home.z,
          walkable: __ronda.world.canMove(e.home.x, e.home.z, 0.8),
        })),
    ),
  );
  await check("Wewe Gombel spawns at accessible homes", () =>
    __ronda.enemies
      .filter((e) => e.def.id === "wewe-gombel")
      .every((e) => __ronda.world.canMove(e.home.x, e.home.z, 0.8)),
  );
  await mkdir("artifacts", { recursive: true });
  await page.evaluate(() => {
    const g = __ronda,
      e = g.enemies.find((e) => e.def.id === "wewe-gombel");
    Object.assign(g.state.data, { x: e.pos.x, z: e.pos.z + 9 });
    g.world.update(0.016, 20, g.state, g.state.data);
    g.weather.render(0);
    g.ui.update(0.2);
    g.camera.position.set(e.pos.x + 4, 4, e.pos.z + 5);
    g.camera.lookAt(e.pos.x, 2, e.pos.z);
    g.renderer.render(g.scene, g.camera);
  });
  await page.screenshot({ path: "artifacts/ghost-wewe-night.png" });
  await page.evaluate(() => {
    const g = __ronda,
      e = g.enemies.find((e) => e.def.id === "wewe-gombel");
    Object.assign(g.state.data, { x: e.pos.x, z: e.pos.z - 6 });
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
    "Wewe can be captured and has the correct departure model",
    () =>
      __ronda.state.data.collection.some((g) => g.id === "wewe-gombel") &&
      __ronda.ghostDepartures.some(
        (e) => e.caught && e.model.userData.importedGhost === "wewe-gombel",
      ),
  );
  await check(
    "disposing an echo cannot dispose the surviving actor geometry",
    async () => {
      const { disposeImportedGhost } = await import("/src/ghost-assets.js");
      const g = __ronda,
        echo = g.ghostDepartures[0].model;
      const survivor = g.enemies.find(
        (e) => e.def.id === "wewe-gombel" && e.active,
      ).model;
      let echoGeometry, liveGeometry;
      echo.traverse((m) => {
        if (m.isMesh) echoGeometry = m.geometry;
      });
      survivor.traverse((m) => {
        if (m.isMesh) liveGeometry = m.geometry;
      });
      let disposed = false;
      liveGeometry.addEventListener("dispose", () => (disposed = true));
      disposeImportedGhost(echo);
      echo.removeFromParent();
      g.ghostDepartures = [];
      return echoGeometry !== liveGeometry && !disposed;
    },
  );
  await check(
    "imported companion, awakened crown and save remain compatible",
    async () => {
      const g = __ronda;
      g.state.data.companion = "wewe-gombel";
      g.state.data.collection.find((c) => c.id === "wewe-gombel").awakened =
        true;
      g.updateCompanion();
      await g.companionModel.userData.ready;
      g.state.save();
      return (
        g.companionModel.userData.loaded &&
        g.companionModel.userData.crown?.parent === g.companionModel
      );
    },
  );
  await check("raid spirits use imported models and animations", async () => {
    const g = __ronda;
    g.life.syncRaids();
    g.life.dispatch(0);
    const e = g.enemies.find((e) => e.raid);
    await e.model.userData.ready;
    g.life.update(0.016, 2);
    const before = e.model.userData.mixer.time;
    g.life.update(0.016, 3);
    return (
      e.model.userData.loaded && before !== e.model.userData.mixer.time
    );
  });
  await page.evaluate(() => {
    __ronda.ui.selectedGhost = "wewe-gombel";
    __ronda.ui.open("bestiary");
    document
      .querySelectorAll(".ghost-portrait")
      .forEach((i) => (i.loading = "eager"));
  });
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".ghost-portrait")].every(
      (i) => i.complete && i.naturalWidth === 384,
    ),
  );
  await check(
    "28 portraits retain collected glow and uncollected dim state",
    () =>
      document.querySelectorAll(".ghost-card").length === 28 &&
      getComputedStyle(
        document.querySelector(".ghost-card.owned .ghost-portrait"),
      ).filter.includes("drop-shadow") &&
      getComputedStyle(
        document.querySelector(".ghost-card:not(.owned) .ghost-portrait"),
      ).filter.includes("brightness(0.34)"),
  );
  await page.evaluate(async () => {
    __ronda.audio.setEnabled(true);
    await __ronda.audio.ctx.resume();
  });
  await page.locator('[data-action="ghost-voice"]').click();
  await check("Wewe voice preview plays, and mute immediately stops it", () => {
    const a = __ronda.audio,
      played = a.ghostVoices.voices.size === 1;
    a.setEnabled(false);
    return played && a.ghostVoices.voices.size === 0;
  });
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/ghost-almanac.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await check(
    "mobile almanac has no horizontal overflow",
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await page.screenshot({ path: "artifacts/ghost-mobile.png" });
  await page.reload();
  await page.waitForFunction(() => window.__ronda);
  await check(
    "new collection and companion survive reload",
    () =>
      __ronda.state.data.collection.some((g) => g.id === "wewe-gombel") &&
      __ronda.state.data.companion === "wewe-gombel",
  );
  const sheet = await browser.newPage({
    viewport: { width: 1200, height: 1040 },
  });
  const cards = await page.evaluate(async () => {
    const { GHOST_ASSETS } = await import("/src/ghost-assets.js");
    return Object.keys(GHOST_ASSETS);
  });
  await sheet.setContent(
    `<style>body{margin:0;background:#263832;color:#eee;font:18px sans-serif;display:grid;grid-template-columns:repeat(4,1fr)}figure{margin:10px;text-align:center}img{width:220px;height:280px;object-fit:contain}</style>${cards.map((id) => `<figure><img src="http://127.0.0.1:5176/portraits/${id}.png"><figcaption>${id}</figcaption></figure>`).join("")}`,
  );
  await sheet
    .locator("img")
    .evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
  await sheet.screenshot({ path: "artifacts/ghost-contact-sheet.png" });
  assert.deepEqual(errors, []);
  console.log("PASS no browser/WebGL errors");
} finally {
  await browser.close();
}
