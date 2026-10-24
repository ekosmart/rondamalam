import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function check(name, fn) {
  assert.ok(await page.evaluate(fn), name);
  console.log("PASS", name);
}
try {
  await page.goto(
    process.env.FOLKLORE_TEST_URL || "http://127.0.0.1:5175/?test=1",
  );
  await page.waitForFunction(() => !!window.__ronda, { timeout: 60000 });
  await page.locator('[data-action="start"]').click();
  await page.evaluate(() => {
    const g = __ronda;
    g.state.data.time = 1200;
    g.weather.set("clear", false);
    g.ui.panel = "testing";
    g.updateEnemies(0);
  });
  await check("new articulated models spawn at night", () =>
    ["pocong", "kuntilanak", "genderuwo"].every((id) =>
      __ronda.enemies.some(
        (e) => e.def.id === id && e.active && e.model.userData.folklore === id,
      ),
    ),
  );
  await page.evaluate(() => {
    const g = __ronda,
      e = g.enemies.find((e) => e.def.id === "pocong");
    e.pos.copy(e.home);
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
    "Pocong capture keeps collection and departure effect",
    () =>
      __ronda.state.data.collection.some((g) => g.id === "pocong") &&
      __ronda.ghostDepartures.some((e) => e.caught),
  );
  await page.evaluate(() => {
    const g = __ronda;
    g.state.data.companion = "pocong";
    g.updateCompanion();
    g.state.save();
    g.ui.selectedGhost = "pocong";
    g.ui.open("bestiary");
    document
      .querySelectorAll(".ghost-portrait")
      .forEach((i) => (i.loading = "eager"));
  });
  await check(
    "new model works as equipped companion",
    () => __ronda.companionModel.userData.folklore === "pocong",
  );
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".ghost-portrait")].every(
      (i) => i.complete && i.naturalWidth > 0,
    ),
  );
  await check("23 real portraits, owned glow and unowned dim", () => {
    const cards = [...document.querySelectorAll(".ghost-card")];
    const owned = document.querySelector(".ghost-card.owned .ghost-portrait");
    const unowned = document.querySelector(
      ".ghost-card:not(.owned) .ghost-portrait",
    );
    return (
      cards.length === 23 &&
      getComputedStyle(owned).filter.includes("drop-shadow") &&
      getComputedStyle(unowned).filter.includes("brightness(0.34)")
    );
  });
  await page.locator('[data-action="ghost-voice"]').click();
  await check(
    "audio preview plays while almanac pauses gameplay",
    () => __ronda.audio.ghostVoices.voices.size === 1,
  );
  await check("mute stops preview immediately", () => {
    __ronda.audio.setEnabled(false);
    return __ronda.audio.ghostVoices.voices.size === 0;
  });
  await check("distance, cooldown and pause gate world sounds", () => {
    const a = __ronda.audio,
      v = a.ghostVoices;
    a.setEnabled(true);
    v.pause(false);
    v.last = -20;
    v.cooldowns.clear();
    const far = v.play("genderuwo", { distance: 40 });
    const near = v.play("genderuwo", { distance: 4, pan: -0.8 });
    const repeat = v.play("genderuwo", { distance: 4 });
    v.pause(true);
    return !far && near && !repeat && v.voices.size === 0;
  });
  await check(
    "Web Audio renders audible stereo with distance attenuation",
    async () => {
      const { synthesizeGhostVoice } = await import("/src/ghost-audio.js");
      async function render(distance, pan) {
        const ctx = new OfflineAudioContext(2, 22050, 22050),
          b = ctx.createBuffer(1, 22050, 22050),
          s = ctx.createBufferSource(),
          g = ctx.createGain(),
          p = ctx.createStereoPanner();
        b.copyToChannel(synthesizeGhostVoice("genderuwo").slice(0, 22050), 0);
        s.buffer = b;
        g.gain.value = Math.pow(1 - distance / 32, 1.5);
        p.pan.value = pan;
        s.connect(g).connect(p).connect(ctx.destination);
        s.start();
        const result = await ctx.startRendering();
        return [0, 1].map((c) =>
          result.getChannelData(c).reduce((sum, x) => sum + x * x, 0),
        );
      }
      const near = await render(2, -0.8),
        far = await render(25, -0.8);
      return near[0] > near[1] * 10 && near[0] > far[0] * 10 && far[0] > 0;
    },
  );
  await mkdir("tmp/screenshots", { recursive: true });
  await page.screenshot({ path: "tmp/screenshots/folklore-almanac.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "tmp/screenshots/folklore-mobile.png" });
  await check(
    "mobile almanac fits viewport",
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await page.reload();
  await page.waitForFunction(() => !!window.__ronda, { timeout: 60000 });
  await check(
    "capture and companion persist after reload",
    () =>
      __ronda.state.data.collection.some((g) => g.id === "pocong") &&
      __ronda.state.data.companion === "pocong",
  );
  assert.deepEqual(errors, []);
  console.log("PASS no browser errors");
} finally {
  await browser.close();
}
